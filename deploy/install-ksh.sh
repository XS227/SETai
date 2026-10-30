#!/usr/bin/env bash
# SETAEI KSH: verified and reversible deployment, 30 October 2026
set -Eeuo pipefail
if [[ $(id -u) -ne 0 ]]; then echo "Run as root: sudo bash /tmp/install-setaei-ksh.sh" >&2; exit 1; fi

BASE="https://raw.githubusercontent.com/XS227/SETai/ksh-deploy-20261030/deploy"
EXPECTED_SHA="cf48752ccedfff3c38d25c8826ce2c0a5e7ce7dc2e665b732ac99b5c11bb5668"
DEST="/var/www/setai/ksh"
TMP="$(mktemp -d /tmp/setaei-ksh.XXXXXXXX)"
trap 'rm -rf "$TMP"' EXIT

echo "[1/5] Fetch archive from SETAEI GitHub"
curl --fail --location --silent --show-error --retry 2 --max-time 45 \
  "$BASE/ksh-site.tar.xz.base64" -o "$TMP/ksh-site.base64"
base64 --decode "$TMP/ksh-site.base64" > "$TMP/ksh-site.tar.xz"
ACTUAL_SHA="$(sha256sum "$TMP/ksh-site.tar.xz" | awk '{print $1}')"
if [[ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]]; then
  echo "SHA256 mismatch; refusing to deploy" >&2; exit 1
fi
echo "Verified SHA256: $ACTUAL_SHA"

echo "[2/5] Validate archive"
if tar -tf "$TMP/ksh-site.tar.xz" | grep -Ev '^ksh(/|$)' ; then
  echo "Unexpected path in archive, refusing to deploy" >&2; exit 1
fi
mkdir -p "$TMP/extract"
tar -xJf "$TMP/ksh-site.tar.xz" -C "$TMP/extract"
for file in ksh/index.html ksh/heimslig/index.html ksh/heimdal-naturstein/index.html ksh/assets/style.css ksh/assets/showroom.js; do
  test -s "$TMP/extract/$file" || { echo "Missing required file: $file" >&2; exit 1; }
done

echo "[3/5] Backup current deployment"
mkdir -p "$(dirname "$DEST")"
if [[ -d "$DEST" ]]; then
  BACKUP="/var/www/setai/ksh-backup-$(date -u +%Y%m%dT%H%M%SZ)"
  cp -a "$DEST" "$BACKUP"
  echo "Backup: $BACKUP"
fi

echo "[4/5] Deploy"
mkdir -p "$DEST"
cp -a "$TMP/extract/ksh/." "$DEST/"
chown -R www-data:www-data "$DEST"
find "$DEST" -type d -exec chmod 755 {} +
find "$DEST" -type f -exec chmod 644 {} +
for file in index.html heimslig/index.html heimdal-naturstein/index.html assets/style.css assets/showroom.js; do
  test -s "$DEST/$file" || { echo "Post-deploy missing file: $file" >&2; exit 1; }
done

echo "[5/5] Live HTTP status"
FAILED=0
for path in /ksh/ /ksh/heimslig/ /ksh/heimdal-naturstein/; do
  code="$(curl --silent --show-error --location --output /dev/null --write-out '%{http_code}' --max-time 15 "https://setai.no$path" || true)"
  echo "$code https://setai.no$path"
  [[ "$code" == "200" ]] || FAILED=1
done
if [[ "$FAILED" != 0 ]]; then
  echo "FILES INSTALLED, but at least one public URL is not HTTP 200. Review Nginx root/locations; don't share the pages yet." >&2
  exit 2
fi
echo "KSH DEPLOYMENT OK – all three pages HTTP 200"
