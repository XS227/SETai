#!/usr/bin/env bash
# SETAEI GBP client onboarding: add private Bilvaskexpress reporting.
# Existing SETAEI OAuth credentials, nginx and tokens are never touched.
set -Eeuo pipefail
umask 077

[ "$(id -u)" -eq 0 ] || { echo 'STOP: run with sudo'; exit 1; }
BASE=/opt/setai-gbp
PY="$BASE/.venv/bin/python"
APP_UNIT=setai-gbp-oauth.service
SYNC_UNIT=setai-gbp-dashboard-sync.service
REV=02612246593df5b54c0bef52462ea3be7b2cf9b3
RAW="https://raw.githubusercontent.com/XS227/SETai/$REV/integrations/gbp-dashboard"
WORK="$(mktemp -d /tmp/gbp-bilvaskexpress.XXXXXXXX)"
BACKUP="/root/gbp-before-bilvaskexpress-$(date -u +%Y%m%dT%H%M%SZ)"
trap 'rm -rf "$WORK"' EXIT

for f in gbp_dashboard.py dashboard_sync.py; do
    [ -f "$BASE/$f" ] || { echo "STOP: missing existing $f"; exit 1; }
done
[ -x "$PY" ] || { echo 'STOP: OAuth Python environment missing'; exit 1; }
[ -f /etc/setai-gbp/service.env ] || { echo 'STOP: OAuth environment missing'; exit 1; }
systemctl is-active --quiet "$APP_UNIT" || { echo 'STOP: Existing OAuth service is not active'; exit 1; }
systemctl list-unit-files "$SYNC_UNIT" --no-legend | grep -q "$SYNC_UNIT" || { echo 'STOP: sync service missing'; exit 1; }
if systemctl is-active --quiet "$SYNC_UNIT"; then
    echo 'STOP: a sync is running; do not replace active code.'
    exit 1
fi

for f in gbp_dashboard.py dashboard_sync.py test_dashboard.py; do
    curl --fail --silent --show-error --location --retry 2 --max-time 35 "$RAW/$f" -o "$WORK/$f"
done
"$PY" -m py_compile "$WORK"/gbp_dashboard.py "$WORK"/dashboard_sync.py "$WORK"/test_dashboard.py

# Run entirely mocked Google API tests before touching production files.
(cd "$WORK" && "$PY" test_dashboard.py)
mkdir -p "$BACKUP"
for f in gbp_dashboard.py dashboard_sync.py; do
    cp -a "$BASE/$f" "$BACKUP/$f"
done

restore(){
    cp -a "$BACKUP/gbp_dashboard.py" "$BASE/gbp_dashboard.py"
    cp -a "$BACKUP/dashboard_sync.py" "$BASE/dashboard_sync.py"
    systemctl restart "$APP_UNIT" || true
    echo "ROLLED_BACK_TO=$BACKUP"
}
for f in gbp_dashboard.py dashboard_sync.py; do
    install -o root -g root -m 0644 "$WORK/$f" "$BASE/$f"
done
if ! systemctl restart "$APP_UNIT"; then
    restore
    exit 1
fi
sleep 2

if ! "$PY" - <<'PY'
from urllib.error import HTTPError
from urllib.request import urlopen
import json
root="http://127.0.0.1:18767"
with urlopen(root+"/seo/google/health",timeout=7) as r:
    data=json.load(r)
    assert r.status==200 and data.get("service")=="setaei-google-business-profile-oauth"
for path in ("/seo/google/dashboard?client=bilvaskexpress",
             "/seo/google/api/dashboard?client=bilvaskexpress"):
    try:
        with urlopen(root+path,timeout=7):
            raise AssertionError("Private dashboard unexpectedly accessible without login")
    except HTTPError as e:
        assert e.code==403,(path,e.code)
print("OAUTH_HEALTH_AND_CLIENT_PRIVACY=OK")
PY
then
    restore
    echo 'STOP: live health or privacy test failed'
    exit 1
fi

echo "DEPLOYED=YES"
echo "BACKUP_SAVED=$BACKUP"
echo 'RUNNING_FIRST_MULTI_CLIENT_GOOGLE_SYNC'
systemctl reset-failed "$SYNC_UNIT" || true
if systemctl start "$SYNC_UNIT"; then
    echo 'SYNC_RESULT=SUCCESS'
else
    echo 'SYNC_RESULT=PARTIAL_OR_FAILED (inspect log below)'
fi
journalctl -u "$SYNC_UNIT" -n 38 --no-pager -o cat

"$PY" - <<'PY'
import sqlite3
from pathlib import Path
db=Path('/var/lib/setai-gbp/dashboard.sqlite3')
if not db.is_file():
    print("DATABASE=NOT_YET_CREATED")
    raise SystemExit(0)
with sqlite3.connect(f"file:{db}?mode=ro",uri=True) as conn:
    for client in ('setaei','bilvaskexpress'):
        count=conn.execute("SELECT COUNT(*) FROM locations WHERE client=?",(client,)).fetchone()[0]
        print(client.upper()+"_SAVED_PROFILES="+str(count))
        if client=='bilvaskexpress' and not count:
            print("ACTION=Confirm Google manager invitation was accepted by the OAuth-linked account, and confirm GBP website is bilvaskexpress.no.")
print("PRIVATE_BILVASKEXPRESS_DASHBOARD=https://setai.no/seo/google/dashboard?client=bilvaskexpress")
PY
