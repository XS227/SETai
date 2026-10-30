#!/usr/bin/env bash
# SETAEI unified Control Room — SAFE production deployment
# Existing /seo/ marketing, /seo-status.html, Google OAuth and customer services are preserved.
set -Eeuo pipefail
umask 077
[ "$(id -u)" -eq 0 ] || { echo "STOP: run with sudo"; exit 1; }
BASE=/opt/setai-gbp
PY="$BASE/.venv/bin/python"
SVC=setai-gbp-oauth.service
WSGI="$BASE/gbp_dashboard_wsgi.py"
SNIP=/etc/nginx/snippets/setai-gbp-oauth.conf
REV=db7fe8949341b3b681a225ef1ba2ee887daa33aa
RAW="https://raw.githubusercontent.com/XS227/SETai/$REV/integrations/control-room"
WORK="$(mktemp -d /tmp/setaei-control-room.XXXXXXXX)"
BACKUP="/root/setaei-control-room-before-$(date -u +%Y%m%dT%H%M%SZ)"
CHANGED=0
cleanup(){ rm -rf "$WORK"; }
trap cleanup EXIT

if [ ! -x "$PY" ] || [ ! -f "$WSGI" ] || [ ! -f "$SNIP" ]; then
  echo 'STOP: expected existing Google OAuth dashboard deployment not found. Nothing modified.'
  exit 1
fi
grep -q 'register_dashboard(app)' "$WSGI" || { echo 'STOP: unexpected WSGI layout'; exit 1; }
grep -q 'proxy_pass http://127.0.0.1:18767;' "$SNIP" || { echo 'STOP: unexpected Nginx OAuth proxy port'; exit 1; }
systemctl is-active --quiet "$SVC" || { echo 'STOP: OAuth service not running'; exit 1; }

for file in setai_control_room.py setai_control_room.html setai_control_room.css setai_control_room.js; do
  curl -fsSL --retry 2 --max-time 30 "$RAW/$file" -o "$WORK/$file"
  [ -s "$WORK/$file" ] || { echo "STOP: empty asset $file"; exit 1; }
done
"$PY" -m py_compile "$WORK/setai_control_room.py"
if command -v node >/dev/null 2>&1; then
  node --check "$WORK/setai_control_room.js"
  echo 'CONTROL_ROOM_JAVASCRIPT_SYNTAX=OK'
fi

# Basic pre-install checks: routes, local resource paths, private SEO report.
"$PY" - "$WORK" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
html=(p/'setai_control_room.html').read_text()
src=(p/'setai_control_room.py').read_text()
assert '<meta name="robots" content="noindex' in html
assert 'data-panel="overview"' in html and 'data-panel="google"' in html
assert '/seo/google/api/dashboard' in (p/'setai_control_room.js').read_text()
assert 'session.get("admin") is not True' in src
assert 'send_file(BASE / "setai_control_room.html"' in src
print('CONTROL_ROOM_ASSETS=OK')
PY

mkdir -p "$BACKUP"
cp -a "$WSGI" "$BACKUP/gbp_dashboard_wsgi.py"
cp -a "$SNIP" "$BACKUP/setai-gbp-oauth.conf"
for file in setai_control_room.py setai_control_room.html setai_control_room.css setai_control_room.js; do
  if [ -e "$BASE/$file" ]; then
    cp -a "$BASE/$file" "$BACKUP/$file"
  fi
done

rollback(){
  if [ "$CHANGED" = 1 ]; then
    cp -a "$BACKUP/gbp_dashboard_wsgi.py" "$WSGI"
    cp -a "$BACKUP/setai-gbp-oauth.conf" "$SNIP"
    for file in setai_control_room.py setai_control_room.html setai_control_room.css setai_control_room.js; do
      if [ -f "$BACKUP/$file" ]; then
        cp -a "$BACKUP/$file" "$BASE/$file"
      else
        rm -f "$BASE/$file"
      fi
    done
    systemctl restart "$SVC" || true
    nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
    echo "RESTORED_PREVIOUS_STATE=$BACKUP"
  fi
}
trap 'echo "DEPLOY_ERROR: rolling back"; rollback' ERR
CHANGED=1
for file in setai_control_room.py setai_control_room.html setai_control_room.css setai_control_room.js; do
  install -o root -g root -m 0644 "$WORK/$file" "$BASE/$file"
done
if ! grep -q '^register_control_room(app)$' "$WSGI"; then
  printf '\nfrom setai_control_room import register_control_room\nregister_control_room(app)\n' >> "$WSGI"
fi
"$PY" -m py_compile "$WSGI" "$BASE/setai_control_room.py"
systemctl restart "$SVC"
sleep 2

# Correct JSON rather than a false HTTP 200 HTML page.
"$PY" - <<'PY'
import json
from urllib.error import HTTPError
from urllib.request import urlopen
root='http://127.0.0.1:18767'
with urlopen(root+'/seo/google/health',timeout=8) as r:
    x=json.load(r)
    assert x.get('service')=='setaei-google-business-profile-oauth' and x.get('status')=='up'
for route in ('/seo/google/dashboard','/seo/google/control-room',
              '/seo/google/control-room.css','/seo/google/control-room.js',
              '/seo/google/api/dashboard?client=bilvaskexpress'):
    try:
        with urlopen(root+route,timeout=8) as r:
            raise AssertionError('Private route unexpectedly allows anonymous access: '+route)
    except HTTPError as e:
        assert e.code==403, (route,e.code)
print('OAUTH_HEALTH=OK')
print('OLD_GOOGLE_DASHBOARD=PROTECTED')
print('NEW_CONTROL_ROOM=PROTECTED')
PY

# Keep the original pages and add only a new, exact-match short URL.
# Both paths were 404 before the deployment; fail safely if the server
# configuration already contains an exact route.
if ! grep -qF 'SETAEI_CONTROL_ROOM_SHORTCUT_V1' "$SNIP"; then
  cat >> "$SNIP" <<'NGINX'

# SETAEI_CONTROL_ROOM_SHORTCUT_V1: only redirect, never expose private dashboard.
location = /control-room { return 308 /control-room/; }
location = /control-room/ { return 302 /seo/google/control-room; }
NGINX
fi
nginx -t
systemctl reload nginx
trap - ERR
CHANGED=0
echo "CONTROL_ROOM_DEPLOYED=YES"
echo "BACKUP_SAVED=$BACKUP"
echo 'PRIVATE_APP=https://setai.no/seo/google/control-room'
echo 'SHORTCUT=https://setai.no/control-room/'
echo 'OLD_SEO_AND_GBP_URLS=UNCHANGED'
echo 'NOTES: use existing OAuth admin login; Google data comes from existing read-only API.'
