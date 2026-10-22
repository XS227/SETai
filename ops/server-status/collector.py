#!/usr/bin/env python3
"""Small Linux collector. Publishes aggregate metrics only; no keys or process data."""
import collections
import datetime
import json
import os
import pathlib
import socket
import time

INTERVAL = 5
DIRECTORY = pathlib.Path(os.environ.get('STATUS_DIRECTORY', '/run/setai-server-status'))


def cpu_ticks():
    fields = pathlib.Path('/proc/stat').read_text().splitlines()[0].split()[1:9]
    values = list(map(int, fields))
    return sum(values), values[3] + values[4]


def memory():
    rows = {}
    for line in pathlib.Path('/proc/meminfo').read_text().splitlines():
        key, value = line.split(':', 1)
        rows[key] = int(value.split()[0]) * 1024
    total, available = rows['MemTotal'], rows['MemAvailable']
    swap_total, swap_free = rows['SwapTotal'], rows['SwapFree']
    return {'total': total, 'available': available, 'used': total - available,
            'percent': round(100 * (total - available) / total, 1)}, {
            'total': swap_total, 'used': swap_total - swap_free,
            'percent': round(100 * (swap_total - swap_free) / swap_total, 1) if swap_total else 0}


def network():
    rx = tx = 0
    for line in pathlib.Path('/proc/net/dev').read_text().splitlines()[2:]:
        name, fields = line.split(':', 1)
        # Physical/virtual uplinks only: avoid counting bridges, VPNs and loopback twice.
        if not name.strip().startswith(('eth', 'en', 'wl')):
            continue
        values = fields.split()
        rx += int(values[0])
        tx += int(values[8])
    return rx, tx


def service_state(address, unix=False):
    probe = socket.socket(socket.AF_UNIX if unix else socket.AF_INET, socket.SOCK_STREAM)
    probe.settimeout(1)
    try:
        probe.connect(address)
        return True
    except (ConnectionRefusedError, FileNotFoundError):
        return False
    except OSError:
        return None
    finally:
        probe.close()


def publish(name, payload):
    target = DIRECTORY / name
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps(payload, separators=(',', ':'), allow_nan=False))
    os.chmod(temporary, 0o644)
    temporary.replace(target)


def main():
    DIRECTORY.mkdir(parents=True, exist_ok=True)
    (DIRECTORY / 'speed.bin').write_bytes(os.urandom(524288))
    os.chmod(DIRECTORY / 'speed.bin', 0o644)
    history = collections.deque(maxlen=180)
    previous_cpu, previous_net, previous_time = cpu_ticks(), network(), time.monotonic()
    services, next_service_check = {}, 0
    next_sample = time.monotonic() + INTERVAL
    while True:
        time.sleep(max(0, next_sample - time.monotonic()))
        next_sample += INTERVAL
        try:
            now = time.monotonic()
            current_cpu, current_net = cpu_ticks(), network()
            elapsed = now - previous_time
            total_delta = current_cpu[0] - previous_cpu[0]
            idle_delta = current_cpu[1] - previous_cpu[1]
            cpu = round(max(0, min(100, 100 * (1 - idle_delta / total_delta))), 1) if total_delta > 0 else None
            rx = round(max(0, current_net[0] - previous_net[0]) / elapsed)
            tx = round(max(0, current_net[1] - previous_net[1]) / elapsed)
            previous_cpu, previous_net, previous_time = current_cpu, current_net, now
            ram, swap = memory()
            fs = os.statvfs('/')
            disk_total = fs.f_blocks * fs.f_frsize
            disk_used = (fs.f_blocks - fs.f_bfree) * fs.f_frsize
            disk_available = fs.f_bavail * fs.f_frsize
            disk = {'total': disk_total, 'used': disk_used, 'available': disk_available,
                    'percent': round(100 * disk_used / (disk_used + disk_available), 1)}
            if now >= next_service_check:
                services = {'web': service_state(('127.0.0.1', 80)),
                            'php': service_state('/run/php/php8.1-fpm.sock', unix=True)}
                next_service_check = now + 30
            stamp = int(time.time())
            record = {'timestamp': stamp, 'cpu': cpu, 'memory': ram['percent'],
                      'rx': rx, 'tx': tx}
            history.append(record)
            payload = {'schema': 1, 'name': 'SETAEI', 'timestamp': stamp,
                       'updated_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                       'interval_seconds': INTERVAL, 'cpu': {'percent': cpu, 'cores': os.cpu_count()},
                       'memory': ram, 'swap': swap, 'disk': disk,
                       'network': {'rx_bytes_per_second': rx, 'tx_bytes_per_second': tx},
                       'uptime_seconds': int(float(pathlib.Path('/proc/uptime').read_text().split()[0])),
                       'load_average': [round(value, 2) for value in os.getloadavg()],
                       'services': services, 'history_points': len(history)}
            publish('history.json', {'interval_seconds': INTERVAL, 'points': list(history)})
            publish('live.json', payload)
        except Exception as error:
            # Do not overwrite the last good sample: the UI marks stale measurements.
            print('Collection failed: ' + type(error).__name__, flush=True)
            next_sample = max(next_sample, time.monotonic() + 1)


if __name__ == '__main__':
    main()
