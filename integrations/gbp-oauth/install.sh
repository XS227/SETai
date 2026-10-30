#!/usr/bin/env bash
# Requires Ubuntu/Debian Linux with Nginx and python3-venv.
set -euo pipefail
umask 077
if [ "$(id -u)" -ne 0 ]; then echo 'Run as root: sudo bash install.sh /path/to/client_secret.json'; exit 1; fi
if [ "$#" -ne 1 ] || [ ! -f "$1" ]; then echo 'Usage: sudo bash install.sh /path/to/your/google-client.json'; exit 1; fi
SOURCE_JSON="$(readlink -f "$1")"
SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
python3 - "$SOURCE_JSON" <<'PY'
import json,sys
j=json.load(open(sys.argv[1],encoding='utf-8'))['web']
assert j.get('client_id','').startswith('790183814306-'), 'Unexpected Google project number'
assert 'https://setai.no/seo/google/callback' in j.get('redirect_uris',[]), 'Redirect URI does not match'
assert j.get('client_secret'), 'Missing client_secret'
print('Google OAuth web client validated; secret not displayed.')
PY
if ! getent passwd setai-gbp >/dev/null; then
  useradd --system --home /opt/setai-gbp --shell /usr/sbin/nologin setai-gbp
fi
install -d -o setai-gbp -g setai-gbp -m 0700 /opt/setai-gbp /var/lib/setai-gbp
install -d -o root -g setai-gbp -m 0750 /etc/setai-gbp
install -m 0600 -o setai-gbp -g setai-gbp "$SOURCE_JSON" /etc/setai-gbp/credentials.json
install -m 0644 -o root -g root "$SELF_DIR/app.py" /opt/setai-gbp/app.py
install -m 0644 -o root -g root "$SELF_DIR/requirements.txt" /opt/setai-gbp/requirements.txt
if [ ! -x /opt/setai-gbp/.venv/bin/python ]; then
  python3 -m venv /opt/setai-gbp/.venv || { echo 'Install python3-venv first'; exit 1; }
fi
/opt/setai-gbp/.venv/bin/pip install --disable-pip-version-check -q -r /opt/setai-gbp/requirements.txt
if [ ! -f /etc/setai-gbp/service.env ]; then
  SECRETS_AND_PASSWORD="$(/opt/setai-gbp/.venv/bin/python - <<'PY'
import hashlib,secrets
from cryptography.fernet import Fernet
password=secrets.token_urlsafe(27)
salt=secrets.token_bytes(20)
h=hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 220000)
print('SETAEI_GBP_SESSION_SECRET='+secrets.token_hex(40))
print('SETAEI_GBP_FERNET_KEY='+Fernet.generate_key().decode('ascii'))
print('SETAEI_GBP_ADMIN_SALT='+salt.hex())
print('SETAEI_GBP_ADMIN_HASH='+h.hex())
print('###ADMIN_PASSWORD###='+password)
PY
)"
  printf '%s\n' "$SECRETS_AND_PASSWORD" | grep -v '^###ADMIN_PASSWORD###=' > /etc/setai-gbp/service.env
  chown root:setai-gbp /etc/setai-gbp/service.env
  chmod 0640 /etc/setai-gbp/service.env
  ADMIN_PASSWORD="$(printf '%s\n' "$SECRETS_AND_PASSWORD" | sed -n 's/^###ADMIN_PASSWORD###=//p')"
  echo
  echo '=== SAVE THIS ONCE IN A PASSWORD MANAGER ==='
  printf 'SETAEI OAuth admin password: %s\n' "$ADMIN_PASSWORD"
  echo '=========================================='
  echo
else
  echo 'Using existing secret keys and password hash (not resetting).'
fi
install -m 0644 "$SELF_DIR/setai-gbp-oauth.service" /etc/systemd/system/setai-gbp-oauth.service
install -d -m 0755 /etc/nginx/snippets
install -m 0644 "$SELF_DIR/nginx-snippet.conf" /etc/nginx/snippets/setai-gbp-oauth.conf
systemctl daemon-reload
systemctl enable --now setai-gbp-oauth.service
systemctl restart setai-gbp-oauth.service
curl --fail --silent --show-error http://127.0.0.1:8767/seo/google/health >/dev/null
printf '\nService is running on localhost:8767.\n'
echo 'NEXT: Add this include to the HTTPS server block for setai.no:'
echo '  include /etc/nginx/snippets/setai-gbp-oauth.conf;'
echo 'Then run: sudo nginx -t && sudo systemctl reload nginx'
echo 'Then visit: https://setai.no/seo/google/'