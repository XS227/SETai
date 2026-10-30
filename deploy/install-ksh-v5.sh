#!/usr/bin/env bash
# SETAEI KSH v5 release: private presentation, no mail/SMS/contact/checkout.
set -Eeuo pipefail
if [[ $(id -u) -ne 0 ]]; then echo 'Use sudo bash install-ksh-v5.sh' >&2; exit 1; fi
SOURCE='https://raw.githubusercontent.com/XS227/SETai/ksh-fullsite-v5-20261030/deploy/ksh-fullsite-v5.tar.xz.base64'
HASH='08ad1f0c1c6c91b12276036441666a4278b2c6d7a877129ecbf3edfd6d5e1d76'
TARGET='/var/www/setai/ksh'
PARENT='/var/www/setai'
TMP="$(mktemp -d /tmp/ksh-v5-XXXXXXXX)"
STAGING=''
trap 'rm -rf "$TMP"; if [[ -n "$STAGING" && -d "$STAGING" ]]; then rm -rf "$STAGING"; fi' EXIT

echo 'KSH v5 [1/5]: Download archived files from SETAEI GitHub'
curl --fail --location --silent --show-error --retry 3 --max-time 75 "$SOURCE" -o "$TMP/archive.b64"
base64 --decode "$TMP/archive.b64" > "$TMP/ksh.tar.xz"
echo "$HASH  $TMP/ksh.tar.xz" | sha256sum -c -

echo 'KSH v5 [2/5]: Verify contents and path safety'
tar -tJf "$TMP/ksh.tar.xz" > "$TMP/paths"
if grep -Ev '^ksh(/|$)' "$TMP/paths"; then echo 'Untrusted path in archive. Aborted.' >&2; exit 1; fi
if grep -E '(^/|(^|/)\.\.?/|//)' "$TMP/paths"; then echo 'Potential unsafe tar path. Aborted.' >&2; exit 1; fi
mkdir -p "$TMP/extracted"
tar -xJf "$TMP/ksh.tar.xz" -C "$TMP/extracted" --no-same-owner
for entry in ksh/index.html ksh/heimdal-naturstein/index.html ksh/heimdal-naturstein/produkter/index.html ksh/heimslig/index.html ksh/heimslig/produkter/index.html ksh/arkitektur/index.html ksh/assets/fullsite.css ksh/assets/fullsite.js ksh/assets/site-data.json ksh/assets/PRODUCT_IMAGES_SOURCES.json; do
  [[ -s "$TMP/extracted/$entry" ]] || { echo "Missing $entry" >&2; exit 1; }
done
pages=$(find "$TMP/extracted/ksh" -name index.html -type f | wc -l)
[[ "$pages" -eq 98 ]] || { echo "Expected 98 pages, got $pages" >&2; exit 1; }

printf 'KSH v5 [3/5]: Preparing staged copy (%s pages)\n' "$pages"
install -d -m 755 "$PARENT"
STAGING="$(mktemp -d "$PARENT/.ksh-v5-stage-XXXXXXXX")"
cp -a "$TMP/extracted/ksh/." "$STAGING/"
chown -R www-data:www-data "$STAGING"
find "$STAGING" -type d -exec chmod 755 {} +
find "$STAGING" -type f -exec chmod 644 {} +

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="$PARENT/ksh-backup-before-v5-$STAMP"
OLD=0

echo 'KSH v5 [4/5]: Backup existing KSH and activate replacement'
if [[ -d "$TARGET" ]]; then mv "$TARGET" "$BACKUP"; OLD=1; echo "Backup: $BACKUP"; fi
if ! mv "$STAGING" "$TARGET"; then
  if [[ "$OLD" -eq 1 ]]; then mv "$BACKUP" "$TARGET"; fi
  echo 'Could not activate release; prior KSH restored.' >&2; exit 1
fi
STAGING=''

printf 'KSH v5 [5/5]: Test representative public pages\n'
FAIL=0
for route in /ksh/ /ksh/arkitektur/ /ksh/heimdal-naturstein/ /ksh/heimdal-naturstein/produkter/ /ksh/heimdal-naturstein/produkt/otta-bruddheller-sma/ /ksh/heimdal-naturstein/3d-studio/ /ksh/heimslig/ /ksh/heimslig/produkter/ /ksh/heimslig/3d-studio/ /ksh/fliskonkurrenten/; do
  CODE="$(curl -sSL --max-time 15 -o /dev/null -w '%{http_code}' "https://setai.no$route" || true)"
  printf '%s %s\n' "$CODE" "https://setai.no$route"
  [[ "$CODE" == 200 ]] || FAIL=1
done
if [[ "$FAIL" -ne 0 ]]; then
  mv "$TARGET" "$PARENT/ksh-v5-failed-$STAMP"
  if [[ "$OLD" -eq 1 ]]; then mv "$BACKUP" "$TARGET"; fi
  echo 'Public check failed. Restored previous KSH release; all other SETAEI sites untouched.' >&2
  exit 2
fi
printf 'SUCCESS: KSH v5 installed (%s pages). INTERNAL REVIEW ONLY — no messages sent.\n' "$pages"
