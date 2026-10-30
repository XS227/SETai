#!/usr/bin/env bash
# SETAEI Google Business Profile OAuth bootstrap: no secrets in GitHub.
set -Eeuo pipefail
umask 077
if [ "$(id -u)" -ne 0 ]; then echo 'Kjør med sudo: sudo bash bootstrap.sh'; exit 1; fi
if [ ! -t 0 ]; then echo 'Kjør denne filen i en interaktiv SSH-terminal, ikke via curl | bash.'; exit 1; fi
REF="${SETAEI_GBP_REF:-feature/gbp-oauth-bootstrap-20261030}"
BASE="https://raw.githubusercontent.com/XS227/SETai/$REF/integrations/gbp-oauth"
WORK="$(mktemp -d /tmp/setai-gbp-bootstrap.XXXXXXXX)"
TEMP_JSON=''
restore_terminal() { stty echo < /dev/tty 2>/dev/null || true; }
cleanup() { restore_terminal; if [ -n "$TEMP_JSON" ]; then rm -f "$TEMP_JSON"; fi; rm -rf "$WORK"; }
trap cleanup EXIT
printf '\nHenter SETAEI OAuth-kode uten Google-hemmeligheter fra GitHub...\n'
for f in app.py install.sh setai-gbp-oauth.service nginx-snippet.conf requirements.txt; do
  curl --fail --location --silent --show-error --retry 2 --max-time 40 "$BASE/$f" -o "$WORK/$f"
done
python3 -m py_compile "$WORK/app.py"
bash -n "$WORK/install.sh"
JSON=''
for dir in /home/ubuntu /root /home /tmp; do
  for candidate in "$dir"/client_secret_*.json "$dir"/gbp-oauth-client.json; do
    if [ -f "$candidate" ]; then JSON="$candidate"; break 2; fi
  done
done
if [ -z "$JSON" ]; then
  echo
  echo 'Google OAuth-filen finnes ikke på serveren ennå.'
  echo 'Åpne den nedlastede Google JSON-filen på telefonen/PC-en og kopier HELE innholdet.'
  echo 'Lim inn JSON-teksten nedenfor. Avslutt med en egen linje: END_JSON'
  echo 'Innholdet vises ikke mens du limer inn.'
  TEMP_JSON="$(mktemp /tmp/setai-gbp-client.XXXXXXXX.json)"
  chmod 600 "$TEMP_JSON"
  stty -echo < /dev/tty
  while IFS= read -r line < /dev/tty; do
    if [ "$line" = 'END_JSON' ]; then break; fi
    printf '%s\n' "$line" >> "$TEMP_JSON"
  done
  restore_terminal
  printf '\nJSON mottatt; validerer uten å vise nøkler...\n'
  JSON="$TEMP_JSON"
fi
python3 - "$JSON" <<'PY'
import json,sys
with open(sys.argv[1],encoding='utf-8') as f: obj=json.load(f)['web']
assert obj.get('client_id','').startswith('790183814306-'), 'Feil Google OAuth-prosjekt'
assert 'https://setai.no/seo/google/callback' in obj.get('redirect_uris',[]), 'Manglende callback'
assert bool(obj.get('client_secret')), 'Mangler client_secret'
print('Google OAuth JSON er validert.')
PY
DEBIAN_FRONTEND=noninteractive apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3-venv python3-pip unzip >/dev/null
bash "$WORK/install.sh" "$JSON"
if [ -n "$TEMP_JSON" ]; then echo 'Midlertidig JSON fjernes fra /tmp.'; fi
printf '\nSETAEI OAuth-tjenesten er installert og kontrollert lokalt.\n'
echo 'Neste steg: aktiver Nginx-include i eksisterende HTTPS server-blokk for setai.no.'
echo 'OBS: Installatøren endrer ikke den aktive Nginx-konfigurasjonen automatisk.'
echo 'Hent relevant oversikt med:'
echo "  sudo nginx -T 2>/dev/null | grep -n -B 6 -A 18 'server_name.*setai.no' | head -100"