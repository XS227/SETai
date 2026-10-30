#!/usr/bin/env bash
# SETAEI KSH Heimdal Naturstein "Om oss" motion scroller v6
# Scope: one HTML page and three new asset files. No messages, no backend changes.
set -Eeuo pipefail
[[ $(id -u) == 0 ]] || { echo 'Use sudo bash install-heimdal-about-v6.sh' >&2; exit 1; }
BASE='https://raw.githubusercontent.com/XS227/SETai/ksh-heimdal-omoss-motion-v6-20261030/deploy/ksh-heimdal-about-v6'
SHA='ea6a9b7e558ef761ad5f21e54495cb80672846897e3440f6fcd4aad5ebd0040b'
ROOT='/var/www/setai/ksh'
TMP="$(mktemp -d /tmp/ksh-heimdal-omoss-XXXXXXXX)"
trap 'rm -rf "$TMP"' EXIT
[[ -d "$ROOT/heimdal-naturstein/om-oss" && -d "$ROOT/assets" ]] || { echo "Missing KSH site: $ROOT" >&2; exit 1; }
echo '[1/5] Fetching release from SETAEI GitHub'
for i in 0 1 2; do
  curl -fsSL --retry 3 --max-time 45 "$BASE/part-$i.b64" -o "$TMP/part-$i.b64"
done
cat "$TMP"/part-{0,1,2}.b64 | base64 --decode > "$TMP/release.tar.xz"
echo "$SHA  $TMP/release.tar.xz" | sha256sum -c -
echo '[2/5] Validating release'
mkdir -p "$TMP/unpacked"
tar -tJf "$TMP/release.tar.xz" > "$TMP/list"
if grep -E '(^/|(^|/)\.\.?/|//)' "$TMP/list"; then echo 'Unsafe archive path' >&2; exit 1; fi
tar -xJf "$TMP/release.tar.xz" -C "$TMP/unpacked" --no-same-owner
FILES=(index.html assets/heimdal-about-motion-v6.css assets/heimdal-about-motion-v6.js assets/stein-hytte-original.webp)
for item in "${FILES[@]}"; do
  [[ -s "$TMP/unpacked/$item" ]] || { echo "Missing release file $item" >&2; exit 1; }
done
grep -q 'Stein, flis og' "$TMP/unpacked/index.html"
echo '[3/5] Backing up previous page'
BACKUP="/var/backups/setai-ksh/heimdal-about-$(date -u +%Y%m%dT%H%M%SZ)"
install -d -m 700 "$BACKUP"
DEST=("$ROOT/heimdal-naturstein/om-oss/index.html" "$ROOT/assets/heimdal-about-motion-v6.css" "$ROOT/assets/heimdal-about-motion-v6.js" "$ROOT/assets/stein-hytte-original.webp")
for i in "${!FILES[@]}"; do
  if [[ -e "${DEST[$i]}" ]]; then cp -p "${DEST[$i]}" "$BACKUP/$(basename "${DEST[$i]}")"; fi
done
echo '[4/5] Installing only the Om oss page and its new assets'
for i in "${!FILES[@]}"; do
  install -o www-data -g www-data -m 644 "$TMP/unpacked/${FILES[$i]}" "${DEST[$i]}"
done
echo '[5/5] Checking public page'
URL='https://setai.no/ksh/heimdal-naturstein/om-oss/'
HTTP="$(curl -LsS --max-time 20 -o "$TMP/live.html" -w '%{http_code}' "$URL?release=ksh-omoss-v6-20261030" || true)"
echo "$HTTP $URL"
[[ "$HTTP" == 200 ]] || { echo 'Public response is not HTTP 200' >&2; exit 2; }
if grep -q 'Stein, flis og' "$TMP/live.html"; then
  echo 'SUCCESS: Motion-scroller v6 is live.'
else
  echo 'Page file installed, but public page appears cached or older. Check Nginx/CDN. No other page changed.' >&2
  exit 3
fi
echo "Page backup: $BACKUP"
echo 'INTERNAL PREVIEW ONLY. No outreach sent.'