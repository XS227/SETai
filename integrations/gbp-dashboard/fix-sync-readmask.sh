#!/usr/bin/env bash
# Targeted repair of the already-installed SETAEI GBP dashboard sync worker.
# Do not run the original installer again: it intentionally blocks reinstall.
set -Eeuo pipefail
umask 077

if [ "$(id -u)" -ne 0 ]; then echo "STOP: run this with sudo"; exit 1; fi

PY=/opt/setai-gbp/.venv/bin/python
WORKER=/opt/setai-gbp/dashboard_sync.py
URL=https://raw.githubusercontent.com/XS227/SETai/8ecd60d6b475471a4f3fb8dd34adb246edc1dd3c/integrations/gbp-dashboard/dashboard_sync.py
TEST_URL=https://raw.githubusercontent.com/XS227/SETai/3985243dfb34a57c0d59c07873d4074f61366fff/integrations/gbp-dashboard/test_dashboard.py

if [ ! -x "$PY" ] || [ ! -f "$WORKER" ] || [ ! -f /opt/setai-gbp/gbp_dashboard.py ]; then
  echo 'STOP: dashboard is not installed at its expected path.'
  exit 1
fi
if ! systemctl list-unit-files setai-gbp-dashboard-sync.service --no-legend | grep -q 'setai-gbp-dashboard-sync.service'; then
  echo 'STOP: dashboard synchronization service is not installed.'
  exit 1
fi

WORK="$(mktemp -d /tmp/setai-gbp-syncfix.XXXXXXXX)"
trap 'rm -rf "$WORK"' EXIT
curl --fail --silent --show-error --location --retry 2 "$URL" -o "$WORK/dashboard_sync.py"
curl --fail --silent --show-error --location --retry 2 "$TEST_URL" -o "$WORK/test_dashboard.py"

"$PY" -m py_compile "$WORK/dashboard_sync.py"
"$PY" - "$WORK/dashboard_sync.py" <<'PY'
import ast,sys
from pathlib import Path
p=Path(sys.argv[1])
text=p.read_text()
ast.parse(text)
assert 'metadata,storefrontAddress,phoneNumbers,categories' in text, 'Fixed readMask missing'
assert "primaryCategory'" not in text, 'Legacy field still exists'
assert "dailyRange.%sDate." in text, 'Daily date param fix missing'
assert "monthlyRange.startMonth.year" in text, 'Monthly date param fix missing'
print("SOURCE_VALIDATION=OK")
PY

BACKUP="/root/setai-gbp-dashboard-sync-before-maskfix-$(date -u +%Y%m%dT%H%M%SZ).py"
cp -a "$WORKER" "$BACKUP"
install -o root -g root -m 0644 "$WORK/dashboard_sync.py" "$WORKER"

if ! (cd /opt/setai-gbp && PYTHONPATH=/opt/setai-gbp "$PY" "$WORK/test_dashboard.py"); then
  cp -a "$BACKUP" "$WORKER"
  echo 'STOP: local dashboard tests failed; original sync code restored.'
  exit 1
fi
echo "BACKUP_SAVED=$BACKUP"
echo 'DASHBOARD_SYNC_CODE_UPDATED=YES'
echo 'RUNNING_GOOGLE_SYNC...'
systemctl reset-failed setai-gbp-dashboard-sync.service || true
if systemctl start setai-gbp-dashboard-sync.service; then
  echo 'SYNC_SERVICE=SUCCESS'
else
  echo 'SYNC_SERVICE=ERROR_OR_PARTIAL'
  echo 'NOTE: This can indicate unenabled Google Performance or Reviews APIs.'
fi
echo '=== LAST SYNC LOG (no credentials) ==='
journalctl -u setai-gbp-dashboard-sync.service -n 35 --no-pager -o cat
echo '=== CURRENT TIMER ==='
systemctl list-timers setai-gbp-dashboard-sync.timer --no-pager
echo '=== END ==='
