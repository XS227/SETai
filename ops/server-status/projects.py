"""Read-only project accounting. Publish friendly labels and aggregates only."""
import json
import os
import pathlib
import subprocess
import threading
import time


class ProjectMonitor:
    def __init__(self, config_file):
        self.config = json.loads(pathlib.Path(config_file).read_text())
        if not isinstance(self.config, list) or len(self.config) > 60:
            raise ValueError('Invalid project configuration')
        self.ticks = os.sysconf('SC_CLK_TCK')
        self.page_size = os.sysconf('SC_PAGE_SIZE')
        self.cores = os.cpu_count() or 1
        self.previous = {}
        self.last_time = time.monotonic()
        self.disk = {}
        self.lock = threading.Lock()
        self.scanning = True
        for project in self.config:
            project['roots'] = list(dict.fromkeys(os.path.realpath(p) for p in project.get('roots', [])))
        owners = {}
        for project in self.config:
            for root in project['roots']:
                if root in owners and owners[root] != project['id']:
                    raise ValueError('Duplicate project root')
                owners[root] = project['id']
        self.roots = sorted(owners.items(), key=lambda item: len(item[0]), reverse=True)
        threading.Thread(target=self.disk_worker, daemon=True).start()

    def disk_worker(self):
        while True:
            self.scanning = True
            for project in self.config:
                total, complete, measured = 0, True, False
                for root in project['roots']:
                    if not os.path.lexists(root):
                        ancestor = pathlib.Path(root).parent
                        while not ancestor.exists() and ancestor != ancestor.parent:
                            ancestor = ancestor.parent
                        if not os.access(ancestor, os.X_OK):
                            complete = False
                        continue
                    nested = [other for other, owner in self.roots
                              if owner != project['id'] and other.startswith(root + '/')]
                    # Parent/child roots belonging to this same project are counted once.
                    if any(root.startswith(other + '/') for other in project['roots'] if other != root):
                        continue
                    try:
                        result = subprocess.run(['du', '-sx', '-B1',
                                                 *['--exclude=' + path for path in nested], root],
                                                capture_output=True, text=True, timeout=90)
                        fields = result.stdout.split()
                        if fields and fields[0].isdigit():
                            total += int(fields[0])
                            measured = True
                        complete = complete and result.returncode == 0
                    except (OSError, subprocess.TimeoutExpired):
                        complete = False
                with self.lock:
                    self.disk[project['id']] = {'bytes': total if measured else None,
                                                'complete': complete if measured else False,
                                                'timestamp': int(time.time())}
            self.scanning = False
            time.sleep(900)

    def snapshot(self):
        now = time.monotonic()
        elapsed = now - self.last_time
        processes, current = {}, {}
        by_id = {p['id']: p for p in self.config}
        try:
            manifest = json.loads(pathlib.Path(os.environ.get('STATUS_PROCESS_MAP', '/run/setai-server-status/project-process-map.json')).read_text())
        except (OSError, ValueError):
            manifest = {}
        for directory in pathlib.Path('/proc').iterdir():
            if not directory.name.isdigit():
                continue
            try:
                tail = (directory / 'stat').read_text().rsplit(')', 1)[1].split()
                cpu = int(tail[11]) + int(tail[12])
                identity = (int(directory.name), int(tail[19]))
                current[identity] = cpu
                rss = max(0, int(tail[21])) * self.page_size
                parent = int(tail[1])
            except (OSError, ValueError, IndexError):
                continue
            try:
                cwd = os.readlink(directory / 'cwd')
            except OSError:
                cwd = ''
            try:
                arguments = [part.decode(errors='replace') for part in (directory / 'cmdline').read_bytes().split(b'\0') if part]
            except OSError:
                arguments = []
            try:
                group = (directory / 'cgroup').read_text()
            except OSError:
                group = ''
            try:
                command = (directory / 'comm').read_text().strip()
            except OSError:
                command = ''
            owner = None
            if command != 'du':
                for root, project_id in self.roots:
                    if cwd == root or cwd.startswith(root + '/') or any(arg == root or arg.startswith(root + '/') for arg in arguments if arg.startswith('/')):
                        owner = project_id
                        break
            mapped = manifest.get(directory.name, {})
            if owner is None and mapped.get('start_ticks') == identity[1] and mapped.get('project') in by_id:
                owner = mapped['project']
            if owner is None:
                for project in self.config:
                    if any('/' + unit in group for unit in project.get('units', [])) or command in project.get('process_names', []) or any(any(needle in arg for needle in project.get('command_patterns', [])) for arg in arguments):
                        owner = project['id']
                        break
            previous = self.previous.get(identity)
            percentage = max(0, cpu - previous) / self.ticks / max(elapsed, .001) / self.cores * 100 if previous is not None else None
            processes[int(directory.name)] = {'owner': owner, 'parent': parent, 'rss': rss, 'cpu': percentage}
        # Match children whose working directory and arguments do not identify a project.
        for _ in range(8):
            changed = False
            for process in processes.values():
                parent = processes.get(process['parent'])
                if process['owner'] is None and parent and parent['owner'] is not None:
                    process['owner'] = parent['owner']
                    changed = True
            if not changed:
                break
        self.previous, self.last_time = current, now
        with self.lock:
            disks = dict(self.disk)
        rows = []
        for project_id, project in by_id.items():
            assigned = [p for p in processes.values() if p['owner'] == project_id]
            disk = disks.get(project_id, {})
            exists = any(os.path.lexists(root) for root in project['roots'])
            if not assigned and not exists and not disk.get('bytes'):
                continue
            status = 'running' if assigned else project.get('mode', 'files')
            cpu_values = [p['cpu'] for p in assigned if p['cpu'] is not None]
            rows.append({'id': project_id, 'name': project['name'],
                         'name_fa': project.get('name_fa', project['name']), 'status': status,
                         'cpu_percent': round(min(100, sum(cpu_values)), 2) if cpu_values else None,
                         'memory_bytes': sum(p['rss'] for p in assigned) if assigned else None,
                         'processes': len(assigned), 'disk_bytes': disk.get('bytes'),
                         'disk_complete': disk.get('complete', False),
                         'disk_timestamp': disk.get('timestamp'), 'timestamp': int(time.time())})
        return {'timestamp': int(time.time()), 'disk_scanning': self.scanning,
                'disk_interval_seconds': 900, 'rows': rows}
