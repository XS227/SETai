#!/usr/bin/env bash
# SETAEI · read-only GBP performance dashboard installer
# Run after the original OAuth bridge works at https://setai.no/seo/google/
set -Eeuo pipefail
umask 077

if [ "$(id -u)" -ne 0 ]; then echo 'Kjør som sudo/root.'; exit 1; fi
BASE=/opt/setai-gbp
APP="$BASE/app.py"
VENV="$BASE/.venv/bin/python"
SERVICE=setai-gbp-oauth.service
PORT=18767
OVERRIDE_DIR=/etc/systemd/system/setai-gbp-oauth.service.d
OVERRIDE="$OVERRIDE_DIR/60-dashboard.conf"
SYNC_SERVICE=/etc/systemd/system/setai-gbp-dashboard-sync.service
TIMER=/etc/systemd/system/setai-gbp-dashboard-sync.timer
REPO='https://raw.githubusercontent.com/XS227/SETai'
REF="${SETAEI_GBP_DASHBOARD_REF:-feature/gbp-oauth-bootstrap-20261030}"
URL="$REPO/$REF/integrations/gbp-dashboard"
WORK=$(mktemp -d /tmp/gbp-dashboard.XXXXXXXX)
BACKUP="/root/setai-gbp-dashboard-backup-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP"
cleanup(){ rm -rf "$WORK"; }
trap cleanup EXIT

# Stop if the previous OAuth installation differs from the known working deployment.
[ -x "$VENV" ] && [ -f "$APP" ] && [ -f /etc/setai-gbp/service.env ] || { echo 'STOP: OAuth installasjon mangler.'; exit 1; }
id setai-gbp >/dev/null 2>&1 || { echo 'STOP: setai-gbp-bruker mangler'; exit 1; }
grep -q '^ExecStart=.*127\.0\.0\.1:18767' "$OVERRIDE_DIR/20-listen-port.conf" || {
  echo 'STOP: Eksisterende OAuth-tjeneste kjører ikke via forventet 18767-override.'; exit 1;
}
if [ -e "$OVERRIDE" ] || [ -e "$SYNC_SERVICE" ] || [ -e "$TIMER" ]; then
  echo 'STOP: Dashboard er allerede installert eller delvis installert. Ingen overskriving.'
  exit 1
fi

for file in gbp_dashboard.py gbp_dashboard_wsgi.py dashboard_sync.py; do
  curl -fsSL --retry 2 --max-time 35 "$URL/$file" -o "$WORK/$file"
done
"$VENV" -m py_compile "$WORK"/*.py

# Atomic, recoverable deployment with a dedicated WSGI entrypoint.
for file in gbp_dashboard.py gbp_dashboard_wsgi.py dashboard_sync.py; do
  [ ! -f "$BASE/$file" ] || cp -a "$BASE/$file" "$BACKUP/$file"
  install -o root -g root -m 0644 "$WORK/$file" "$BASE/$file"
done

mkdir -p "$OVERRIDE_DIR"
cat > "$OVERRIDE" <<'EOF'
[Service]
ExecStart=
ExecStart=/opt/setai-gbp/.venv/bin/gunicorn --workers 1 --threads 2 --bind 127.0.0.1:18767 --access-logfile /dev/null --error-logfile - gbp_dashboard_wsgi:app
EOF
chmod 0644 "$OVERRIDE"

cat > "$SYNC_SERVICE" <<'EOF'
[Unit]
Description=SETAEI GBP read-only performance sync
After=network-online.target
Wants=network-online.target
[Service]
Type=oneshot
User=setai-gbp
Group=setai-gbp
WorkingDirectory=/opt/setai-gbp
EnvironmentFile=/etc/setai-gbp/service.env
ExecStart=/opt/setai-gbp/.venv/bin/python /opt/setai-gbp/dashboard_sync.py
UMask=0077
TimeoutStartSec=300
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/setai-gbp
EOF
chmod 0644 "$SYNC_SERVICE"

cat > "$TIMER" <<'EOF'
[Unit]
Description=Refresh SETAEI Google Business Profile dashboard twice daily
[Timer]
OnCalendar=*-*-* 06:30:00 UTC
OnCalendar=*-*-* 18:30:00 UTC
Persistent=true
RandomizedDelaySec=90s
Unit=setai-gbp-dashboard-sync.service
[Install]
WantedBy=timers.target
EOF
chmod 0644 "$TIMER"

systemctl daemon-reload
systemctl restart "$SERVICE"
sleep 2
if ! systemctl is-active --quiet "$SERVICE"; then
  echo 'ERROR: dashboard WSGI service did not start. Restoring original service override.'
  journalctl -u "$SERVICE" -n 12 --no-pager || true
  rm -f "$OVERRIDE"
  systemctl daemon-reload
  systemctl restart "$SERVICE" || true
  exit 1
fi

# Confirm BOTH original OAuth API AND new private dashboard API are mounted.
if ! "$VENV" - <<'PY'
from urllib.error import HTTPError
from urllib.request import urlopen
import json
base='http://127.0.0.1:18767'
with urlopen(base+'/seo/google/health',timeout=7) as resp:
    obj=json.load(resp)
    assert resp.status==200 and obj.get('service')=='setaei-google-business-profile-oauth'
for path in ('/seo/google/dashboard','/seo/google/api/dashboard'):
    try:
        with urlopen(base+path,timeout=7) as resp:
            raise AssertionError('The dashboard unexpectedly allows anonymous access')
    except HTTPError as exc:
        assert exc.code==403, (path,exc.code)
print('PRIVATE_DASHBOARD_ROUTES=OK')
PY
then
  echo 'ERROR: health or access-control test failed. Restoring OAuth service.'
  rm -f "$OVERRIDE"
  systemctl daemon-reload
  systemctl restart "$SERVICE" || true
  exit 1
fi

systemctl enable --now setai-gbp-dashboard-sync.timer
printf '\nDASHBOARD_DEPLOYED=YES\n'
printf 'URL=https://setai.no/seo/google/dashboard\n'
printf 'SYNC_TIMER=ACTIVE\n'
echo 'Existing OAuth login and Nginx on port 18767 were preserved.'
echo 'Performing first Google API sync (errors logged per source; unavailable data stays blank).'
if systemctl start setai-gbp-dashboard-sync.service; then
  echo 'FIRST_SYNC=COMPLETED'
else
  echo 'FIRST_SYNC=PARTIAL_OR_FAILED; check journal and enable Google Performance API if needed.'
fi
systemctl show setai-gbp-dashboard-sync.service -p Result --no-pager
systemctl list-timers setai-gbp-dashboard-sync.timer --no-pager
printf '\nLast 25 sync log lines (no secrets):\n'
journalctl -u setai-gbp-dashboard-sync.service -n 25 --no-pager -o cat