#!/usr/bin/env bash
# Publish only /v2/ of the authorized SETAEI Nginx website.
# Does not modify /index.html, any other subfolder, nginx, or running services.
set -euo pipefail
ROOT=/var/www/setai
TARGET="$ROOT/v2"
SOURCE="https://raw.githubusercontent.com/XS227/SETai/main/v2/index.html"
[ "$(id -u)" -eq 0 ] || { echo "ERROR: run with sudo"; exit 1; }
[ -f "$ROOT/index.html" ] || { echo "ERROR: expected SETAEI webroot not found at $ROOT"; exit 1; }
[ ! -L "$TARGET" ] || { echo "ERROR: v2 target is a symlink. Refusing to overwrite"; exit 1; }
original="$(sha256sum "$ROOT/index.html" | cut -d' ' -f1)"
install -d -m 0755 "$TARGET"
tmp="$(mktemp "$TARGET/.v2-stage-XXXXXXXX")"
trap 'rm -f "$tmp"' EXIT
curl -fLsS --retry 3 --max-time 35 -H 'Cache-Control: no-cache' "$SOURCE" -o "$tmp"
[ "$(wc -c < "$tmp")" -ge 65000 ] || { echo "ERROR: downloaded file too small"; exit 1; }
grep -Fq 'class="setaei-logo"' "$tmp" || { echo "ERROR: original SVG logo missing"; exit 1; }
grep -Fq '/assets/brand/certs/ibm-light.svg' "$tmp" || { echo "ERROR: certification logos missing"; exit 1; }
grep -Fq '© 2026 SETAEI' "$tmp" || { echo "ERROR: copyright missing"; exit 1; }
grep -Fq 'menuToggle' "$tmp" || { echo "ERROR: burger menu missing"; exit 1; }
if [ -f "$TARGET/index.html" ]; then
  backup="$TARGET/index.html.backup-$(date -u +%Y%m%dT%H%M%SZ)"
  cp -a "$TARGET/index.html" "$backup"
  echo "Backup: $backup"
fi
chmod 0644 "$tmp"
mv -f "$tmp" "$TARGET/index.html"
after="$(sha256sum "$ROOT/index.html" | cut -d' ' -f1)"
[ "$original" = "$after" ] || { echo "ERROR: root index checksum changed"; exit 1; }
echo "Published $TARGET/index.html"
echo "Installed SHA256: $(sha256sum "$TARGET/index.html" | cut -d' ' -f1)"
if curl -fLsS --max-time 15 -H 'Cache-Control: no-cache' "https://setai.no/v2/?deploy=$(date +%s)" -o "$TARGET/.v2-http-check-$$"; then
 if cmp -s "$TARGET/index.html" "$TARGET/.v2-http-check-$$"; then
   echo "HTTPS_VERIFY_OK https://setai.no/v2/"
 else
   echo "HTTPS_RESPONSE_DIFFERENT — inspect Nginx routing/cache"
 fi
else
 echo "HTTPS_VERIFY_UNAVAILABLE — deployment exists on disk but online status not confirmed"
fi
rm -f "$TARGET/.v2-http-check-$$"
