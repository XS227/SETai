#!/usr/bin/env python3
"""Install an unprivileged monitoring agent without changing application services."""
import os
import pathlib
import shutil
import socket
import subprocess
import sys


def main():
    role = sys.argv[1] if len(sys.argv) == 2 else ''
    hosts = {'realgram': 'vps-5348441', 'biab': 'vps-5359843'}
    if role not in hosts or socket.gethostname().split('.')[0] != hosts[role]:
        raise SystemExit('Server identity does not match role')
    source = pathlib.Path(__file__).resolve().parent
    home = pathlib.Path.home()
    target = home / '.local/share/setai-server-status'
    config = home / '.config/setai-server-status'
    runtime = home / '.cache/setai-server-status'
    for directory in (target, config, runtime):
        directory.mkdir(parents=True, mode=0o700, exist_ok=True)
    token_file = config / 'push-token'
    token = token_file.read_text().strip()
    if len(token) != 64 or any(c not in '0123456789abcdef' for c in token):
        raise SystemExit('Missing per-server token')
    token_file.chmod(0o600)
    for filename in ('collector.py', 'relay.py', 'projects.py'):
        shutil.copy2(source / filename, target / filename)
    shutil.copy2(source / ('projects-' + role + '.json'), config / 'projects.json')
    environment = 'STATUS_SERVER_ID=' + role + '\nSTATUS_PUSH_TOKEN_FILE=' + str(token_file) + '\nSTATUS_DIRECTORY=' + str(runtime) + '\n'
    environment += 'STATUS_PROJECTS_FILE=' + str(config / 'projects.json') + '\n'
    sockets = sorted(pathlib.Path('/run/php').glob('php*-fpm.sock'))
    if sockets:
        environment += 'STATUS_PHP_SOCKET=' + str(sockets[-1]) + '\n'
    (config / 'agent.conf').write_text(environment)
    launcher = target / 'start.sh'
    launcher.write_text('#!/bin/sh\nset -a\n. ' + str(config / 'agent.conf') + '\nset +a\ncd ' + str(target) + '\n'
                        'nohup /usr/bin/flock -n ' + str(runtime / 'agent.lock') +
                        ' /usr/bin/nice -n 10 /usr/bin/python3 ' + str(target / 'collector.py') +
                        ' >/dev/null 2>&1 </dev/null &\n')
    launcher.chmod(0o700)
    current = subprocess.run(['crontab', '-l'], capture_output=True, text=True)
    if current.returncode not in (0, 1):
        raise SystemExit('Could not read existing crontab')
    lines = [line for line in current.stdout.splitlines() if '# setai-server-status-agent' not in line]
    lines += ['@reboot ' + str(launcher) + ' # setai-server-status-agent',
              '* * * * * ' + str(launcher) + ' # setai-server-status-agent']
    subprocess.run(['crontab', '-'], input='\n'.join(lines) + '\n', text=True, check=True)
    subprocess.run([str(launcher)], check=True)
    print('Unprivileged monitoring agent installed for ' + role)


if __name__ == '__main__':
    main()
