#!/usr/bin/env bash
# Fix Chrome blocking Google Business Profile OAuth authorization after a POST.
set -Eeuo pipefail
[ "$(id -u)" -eq 0 ] || { echo 'Run with sudo'; exit 1; }
APP=/opt/setai-gbp/app.py
SERVICE=setai-gbp-oauth.service
[ -f "$APP" ] || { echo 'STOP: OAuth application not found'; exit 1; }
[ "$(systemctl show "$SERVICE" -p LoadState --value)" = "loaded" ] || { echo 'STOP: OAuth service is not installed'; exit 1; }
BACKUP="/root/setai-gbp-app-before-csp-$(date -u +%Y%m%dT%H%M%SZ).py"
cp -a "$APP" "$BACKUP"
python3 - "$APP" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
s=p.read_text()
old="form-action 'self'; base-uri 'none';"
new="form-action 'self' https://accounts.google.com; base-uri 'none';"
if s.count(old)==1:
    p.write_text(s.replace(old,new))
    print('OAuth CSP updated to allow accounts.google.com')
elif s.count(new)==1:
    print('OAuth CSP already fixed; no changes needed')
else:
    print('STOP: unexpected CSP format; nothing modified')
    sys.exit(1)
PY
if ! python3 -m py_compile "$APP"; then cp -a "$BACKUP" "$APP"; echo 'STOP: syntax error; original restored'; exit 1; fi
if ! systemctl restart "$SERVICE"; then cp -a "$BACKUP" "$APP"; systemctl restart "$SERVICE" || true; echo 'STOP: restart failed, original restored'; exit 1; fi
sleep 2
if ! python3 - <<'PY'
import json,urllib.request
url='http://127.0.0.1:18767/seo/google/health'
with urllib.request.urlopen(url,timeout=6) as r:
    payload=json.load(r)
    assert r.status==200
    assert payload.get('service')=='setaei-google-business-profile-oauth'
    assert payload.get('status')=='up'
PY
then
  cp -a "$BACKUP" "$APP"
  systemctl restart "$SERVICE" || true
  echo 'STOP: expected OAuth health check failed; original restored'
  exit 1
fi
HEADER="$(curl -fsSI --max-time 7 http://127.0.0.1:18767/seo/google/ | tr -d '\r' | grep -i '^Content-Security-Policy:' || true)"
case "$HEADER" in
  *"form-action 'self' https://accounts.google.com;"*)
    echo 'SUCCESS: CSP fixed and OAuth app healthy'
    echo 'Open https://setai.no/seo/google/ and refresh the page before clicking Koble til Google.'
    echo "Backup: $BACKUP"
    ;;
  *)
    cp -a "$BACKUP" "$APP"
    systemctl restart "$SERVICE" || true
    echo 'STOP: CSP response check failed; original restored'
    exit 1
    ;;
esac
