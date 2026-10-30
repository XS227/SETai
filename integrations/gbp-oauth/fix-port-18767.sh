#!/usr/bin/env bash
set -Eeuo pipefail
[ "$(id -u)" = 0 ] || { echo "Use sudo"; exit 1; }
PORT=18767
SNIPPET=/etc/nginx/snippets/setai-gbp-oauth.conf
OVERRIDE=/etc/systemd/system/setai-gbp-oauth.service.d/20-listen-port.conf
[ -f "$SNIPPET" ] && [ -x /opt/setai-gbp/.venv/bin/gunicorn ] || { echo "Missing OAuth installation"; exit 1; }
grep -Fq 'proxy_pass http://127.0.0.1:8767;' "$SNIPPET" || { echo "Unexpected Nginx config"; exit 1; }
python3 - <<'PY'
import socket
s=socket.socket()
try: s.bind(('127.0.0.1',18767))
except OSError: raise SystemExit('Dedicated port 18767 is busy; nothing changed.')
finally: s.close()
PY
[ ! -e "$OVERRIDE" ] || { echo "Port override already exists; inspect before retrying"; exit 1; }
install -d /etc/systemd/system/setai-gbp-oauth.service.d
cat > "$OVERRIDE" <<'EOF'
[Service]
ExecStart=
ExecStart=/opt/setai-gbp/.venv/bin/gunicorn --workers 1 --threads 2 --bind 127.0.0.1:18767 --access-logfile /dev/null --error-logfile - app:app
EOF
systemctl daemon-reload
systemctl reset-failed setai-gbp-oauth.service || true
systemctl restart setai-gbp-oauth.service
python3 - <<'PY'
import json,time,urllib.request
for i in range(12):
    try:
        with urllib.request.urlopen('http://127.0.0.1:18767/seo/google/health',timeout=2) as r:
            data=json.load(r)
            if data.get('service') == 'setaei-google-business-profile-oauth' and data.get('status') == 'up':
                print('LOCAL_OAUTH_APP=YES')
                break
    except Exception: time.sleep(1)
else: raise SystemExit('LOCAL_OAUTH_APP=NO. Check journalctl -u setai-gbp-oauth.service -n 30')
PY
BACKUP="/root/setai-gbp-snippet-before-portfix-$(date -u +%Y%m%dT%H%M%SZ).conf"
cp -a "$SNIPPET" "$BACKUP"
sed -i 's#proxy_pass http://127.0.0.1:8767;#proxy_pass http://127.0.0.1:18767;#' "$SNIPPET"
if ! nginx -t; then cp -a "$BACKUP" "$SNIPPET"; echo 'Nginx syntax failed; restored snippet'; exit 1; fi
if ! systemctl reload nginx; then cp -a "$BACKUP" "$SNIPPET"; nginx -t && systemctl reload nginx || true; echo 'Nginx reload failed; restored snippet'; exit 1; fi
echo 'SUCCESS: OAuth on port 18767; original application on 8767 untouched.'
echo 'Open https://setai.no/seo/google/'
