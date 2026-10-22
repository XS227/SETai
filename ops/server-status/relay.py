"""Authenticated, bounded in-memory telemetry relay; binds to loopback only."""
import hmac
import http.server
import json
import math
import pathlib
import re
import threading
import time
import urllib.error
import urllib.request

NAMES = {'realgram': 'Realgram', 'biab': 'BIAB'}
LIMIT = 65536


def numeric(value, low=0, high=10**18):
    if type(value) not in (int, float) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError('Invalid number')
    return value


def sanitize(data, server):
    """Whitelist aggregate fields; never relay arbitrary agent-provided content."""
    source = data['live']
    stamp = int(numeric(source['timestamp'], time.time() - 90, time.time() + 30))
    if source['schema'] != 1 or source.get('server_id') != server:
        raise ValueError('Invalid identity')
    cpu = source['cpu']['percent']
    live = {'schema': 1, 'server_id': server, 'name': NAMES[server], 'timestamp': stamp,
            'received_at': int(time.time()), 'interval_seconds': 5,
            'cpu': {'percent': None if cpu is None else numeric(cpu, 0, 100),
                    'cores': int(numeric(source['cpu']['cores'], 1, 4096))},
            'uptime_seconds': int(numeric(source['uptime_seconds'])),
            'load_average': [numeric(n) for n in source['load_average']],
            'network': {key: numeric(source['network'][key]) for key in
                        ('rx_bytes_per_second', 'tx_bytes_per_second')}, 'services': {}}
    if len(live['load_average']) != 3:
        raise ValueError('Invalid load')
    for section, keys in [('memory', ('total', 'used', 'available')),
                          ('swap', ('total', 'used')),
                          ('disk', ('total', 'used', 'available'))]:
        live[section] = {key: numeric(source[section][key]) for key in keys}
        live[section]['percent'] = numeric(source[section]['percent'], 0, 100)
        if live[section]['used'] > live[section]['total']:
            raise ValueError('Invalid capacity')
    for key in ('web', 'php'):
        value = source['services'].get(key)
        if value is not None and type(value) is not bool:
            raise ValueError('Invalid service')
        live['services'][key] = value
    points = []
    source_points = data['history']['points']
    if not isinstance(source_points, list) or len(source_points) > 180:
        raise ValueError('Invalid history')
    for point in source_points:
        timestamp = int(numeric(point['timestamp'], stamp - 905, stamp))
        if points and timestamp <= points[-1]['timestamp']:
            raise ValueError('Unordered history')
        points.append({'timestamp': timestamp,
                       'cpu': None if point['cpu'] is None else numeric(point['cpu'], 0, 100),
                       'memory': numeric(point['memory'], 0, 100),
                       'rx': numeric(point['rx']), 'tx': numeric(point['tx'])})
    live['history_points'] = len(points)
    return {'live': live, 'history': {'interval_seconds': 5, 'points': points}}


def start_receiver(token_file):
    tokens = json.loads(pathlib.Path(token_file).read_text())
    if set(tokens) != set(NAMES) or any(not isinstance(v, str) or len(v) < 48 for v in tokens.values()):
        raise ValueError('Invalid relay token configuration')
    records, lock = {}, threading.Lock()

    class Handler(http.server.BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(4)

        def log_message(self, *args):
            pass  # Never log authorization headers or payloads.

        def respond(self, status, data):
            body = json.dumps(data, separators=(',', ':'), allow_nan=False).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            match = re.fullmatch(r'/(realgram|biab)/(live|history)', self.path.split('?', 1)[0])
            if not match:
                return self.respond(404, {'error': 'unknown_server'})
            server, kind = match.groups()
            with lock:
                result = records.get(server, {}).get(kind)
            self.respond(200, result) if result else self.respond(503, {'error': 'no_measurements', 'server_id': server})

        def do_POST(self):
            server = self.path.strip('/')
            if server not in tokens:
                return self.respond(404, {'error': 'unknown_server'})
            authorization = self.headers.get('Authorization', '')
            if not hmac.compare_digest(authorization.encode(), ('Bearer ' + tokens[server]).encode()):
                return self.respond(401, {'error': 'unauthorized'})
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= LIMIT:
                    return self.respond(413, {'error': 'invalid_size'})
                data = json.loads(self.rfile.read(length))
                result = sanitize(data, server)
            except (KeyError, ValueError, TypeError, OverflowError):
                return self.respond(400, {'error': 'invalid_measurements'})
            with lock:
                if server in records and result['live']['timestamp'] <= records[server]['live']['timestamp']:
                    return self.respond(409, {'error': 'older_measurements'})
                records[server] = result
            self.respond(200, {'ok': True})

    receiver = http.server.ThreadingHTTPServer(('127.0.0.1', 9159), Handler)
    threading.Thread(target=receiver.serve_forever, daemon=True).start()
    return receiver


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def push(server, token, live, history):
    if server not in NAMES:
        raise ValueError('Invalid server')
    body = json.dumps({'live': live, 'history': history}, separators=(',', ':'), allow_nan=False).encode()
    request = urllib.request.Request('https://setai.no/server/remote/' + server, data=body,
                                    headers={'Authorization': 'Bearer ' + token,
                                             'Content-Type': 'application/json'}, method='POST')
    with urllib.request.build_opener(NoRedirect).open(request, timeout=3) as response:
        if response.status != 200:
            raise ValueError('Relay refused sample')
