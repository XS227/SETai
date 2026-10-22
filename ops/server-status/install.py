#!/usr/bin/env python3
"""Run on an explicitly identified host. Agent token is accepted through stdin only."""
import datetime
import grp
import json
import os
import pathlib
import secrets
import shutil
import socket
import subprocess
import sys

HOSTS = {'setaei': '1431514', 'realgram': 'vps-5348441', 'biab': 'vps-5359843'}


def main():
    role = sys.argv[1] if len(sys.argv) == 2 else ''
    if role not in HOSTS or socket.gethostname().split('.')[0] != HOSTS[role]:
        raise SystemExit('Refusing installation: server identity does not match requested role')
    if os.geteuid() != 0:
        raise SystemExit('Run with root privileges')
    source = pathlib.Path(__file__).resolve().parent
    root = source.parents[1]
    config = pathlib.Path('/etc/setai-server-status')
    config.mkdir(mode=0o750, exist_ok=True)
    config.chmod(0o750)
    www = grp.getgrnam('www-data').gr_gid
    os.chown(config, 0, www)
    token_file = config / ('remote-tokens.json' if role == 'setaei' else 'push-token')
    if role == 'setaei':
        if not token_file.exists():
            token_file.write_text(json.dumps({key: secrets.token_hex(32) for key in ('realgram', 'biab')}))
        tokens = json.loads(token_file.read_text())
        if set(tokens) != {'realgram', 'biab'} or any(not isinstance(v, str) or len(v) < 48 for v in tokens.values()):
            raise SystemExit('Invalid central token configuration')
        environment = 'STATUS_RECEIVER_TOKENS=' + str(token_file) + '\n'
    else:
        token = sys.stdin.read().strip()
        if len(token) != 64 or any(c not in '0123456789abcdef' for c in token):
            raise SystemExit('Supply the per-server token through stdin')
        token_file.write_text(token + '\n')
        environment = 'STATUS_SERVER_ID=' + role + '\nSTATUS_PUSH_TOKEN_FILE=' + str(token_file) + '\n'
    token_file.chmod(0o640)
    os.chown(token_file, 0, www)
    (config / 'agent.conf').write_text(environment)
    (config / 'agent.conf').chmod(0o644)
    target = pathlib.Path('/opt/setai-server-status')
    target.mkdir(exist_ok=True)
    for filename in ('collector.py', 'relay.py'):
        shutil.copy2(source / filename, target / filename)
    shutil.copy2(source / 'setai-server-status.service', '/etc/systemd/system/setai-server-status.service')
    if role == 'setaei':
        vhost = pathlib.Path('/etc/nginx/sites-enabled/setai').read_text()
        if 'include /etc/nginx/snippets/setai-server-status.conf;' not in vhost:
            raise SystemExit('Existing dashboard nginx include is missing; inspect the vhost before proceeding')
        snippet = pathlib.Path('/etc/nginx/snippets/setai-server-status.conf')
        old = snippet.read_bytes()
        snippet.write_bytes((source / 'nginx.conf').read_bytes())
        check = subprocess.run(['nginx', '-t'], capture_output=True)
        if check.returncode:
            snippet.write_bytes(old)
            raise SystemExit('nginx validation failed; previous snippet restored')
    subprocess.run(['systemctl', 'daemon-reload'], check=True)
    subprocess.run(['systemctl', 'enable', 'setai-server-status'], check=True)
    subprocess.run(['systemctl', 'restart', 'setai-server-status'], check=True)
    if role == 'setaei':
        public = pathlib.Path('/var/www/setai/server')
        backup = pathlib.Path('/var/backups/setai-server-status') / datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
        backup.mkdir(parents=True, mode=0o700)
        for filename in ('app.js', 'style.css', 'index.html'):
            if (public / filename).exists():
                shutil.copy2(public / filename, backup / filename)
            staging = public / (filename + '.new')
            staging.write_bytes((root / 'server' / filename).read_bytes())
            staging.chmod(0o644)
            staging.replace(public / filename)
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
    print('Installed monitoring for ' + role + '. Existing application services were not restarted.')


if __name__ == '__main__':
    main()
