#!/usr/bin/env bash
# SETAEI KSH — Flyt-Gulv v7 (2026-10-31)
# Scope: only /ksh/flyt-gulv/index.html and the two new assets; no customer communications.
set -Eeuo pipefail
if [[ "$(id -u)" -ne 0 ]]; then echo 'Use sudo bash for installation.' >&2; exit 1; fi
SOURCE='https://raw.githubusercontent.com/XS227/SETai/ksh-flyt-gulv-motion-v7-20261031/deploy/flyt-gulv-motion-v7.tar.xz.base64'
SHA='a8716e46ff44460e9aac5402fb39036dd460b463a3a3f0ed1941b394731100cc'
TARGET='/var/www/setai/ksh/flyt-gulv'
WORK="$(mktemp -d /tmp/flyt-gulv-motion-XXXXXXXX)"
BACKUP='/var/www/setai/ksh/flyt-gulv-index-backup-v7-'$(date -u +%Y%m%dT%H%M%SZ)
trap 'rm -rf "$WORK"' EXIT

echo '[1/4] Download verified SETAEI motion package'
curl --fail --silent --show-error --location --retry 2 --max-time 60 "$SOURCE" -o "$WORK/release.b64"
base64 --decode "$WORK/release.b64" > "$WORK/release.tar.xz"
echo "$SHA  $WORK/release.tar.xz" | sha256sum --check --status || { echo 'SHA mismatch: refusing to install' >&2; exit 1; }

echo '[2/4] Extract and validate page/assets'
mkdir -p "$WORK/extract"
tar -xJf "$WORK/release.tar.xz" -C "$WORK/extract" --no-same-owner
for f in flyt-gulv/index.html flyt-gulv/assets/flyt-motion-v7.css flyt-gulv/assets/flyt-motion-v7.js; do
  [[ -s "$WORK/extract/$f" ]] || { echo "Missing $f" >&2; exit 1; }
done
mkdir -p "$TARGET/assets"
[[ -s "$TARGET/index.html" ]] && cp -a "$TARGET/index.html" "$BACKUP"
echo "Backup (page only): $BACKUP"

echo '[3/4] Install only Flyt-Gulv page and its two new assets'
install -o www-data -g www-data -m 644 "$WORK/extract/flyt-gulv/assets/flyt-motion-v7.css" "$TARGET/assets/flyt-motion-v7.css"
install -o www-data -g www-data -m 644 "$WORK/extract/flyt-gulv/assets/flyt-motion-v7.js" "$TARGET/assets/flyt-motion-v7.js"
install -o www-data -g www-data -m 644 "$WORK/extract/flyt-gulv/index.html" "$TARGET/index.html"

echo '[4/4] Verify page and both assets'
FAILED=0
for uri in '/ksh/flyt-gulv/' '/ksh/flyt-gulv/assets/flyt-motion-v7.css' '/ksh/flyt-gulv/assets/flyt-motion-v7.js'; do
  CODE="$(curl --silent --show-error --location --max-time 15 --output /dev/null --write-out '%{http_code}' "https://setai.no$uri?flyt-release=v7-20261031" || true)"
  printf '%s %s\n' "$CODE" "https://setai.no$uri"
  [[ "$CODE" == '200' ]] || FAILED=1
done
if [[ "$FAILED" != 0 ]]; then
  echo 'Public verification failed. Rolling back original index.' >&2
  if [[ -s "$BACKUP" ]]; then cp -a "$BACKUP" "$TARGET/index.html"; fi
  exit 2
fi
if ! curl -fsSL --max-time 15 'https://setai.no/ksh/flyt-gulv/?flyt-release=v7-content' -o "$WORK/live.html" || ! grep -q 'flyt-motion-v7.js' "$WORK/live.html"; then
  echo 'The server is still serving the old page. Rolling back.' >&2
  if [[ -s "$BACKUP" ]]; then cp -a "$BACKUP" "$TARGET/index.html"; fi
  exit 3
fi
echo 'PUBLISHED: Flyt-Gulv motion-scroller v7 on https://setai.no/ksh/flyt-gulv/'
echo 'No messages were sent; this remains an internal design concept.'
