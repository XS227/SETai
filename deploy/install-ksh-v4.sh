#!/usr/bin/env bash
# SETAEI KSH v4: install full multi-page proposals with SHA256 verification and rollback.
# Only mutates /var/www/setai/ksh, never the rest of setai.no. Does not notify prospects.
set -Eeuo pipefail
if [[ $(id -u) -ne 0 ]]; then echo 'Run with sudo' >&2; exit 1; fi
REMOTE='https://raw.githubusercontent.com/XS227/SETai/ksh-fullsite-v4-20261030/deploy/ksh-fullsite-v4.tar.xz.base64'
HASH='640d53bd7d89acb9be758453a1b1ff0e5d0da7f6d3a08e8e6a81b2afe306cf7f'
PARENT='/var/www/setai'
DEST="$PARENT/ksh"
WORK="$(mktemp -d /tmp/setaei-ksh-full-XXXXXXXX)"
STAGING=''
trap 'rm -rf "$WORK"; if [[ -n "$STAGING" && -d "$STAGING" ]]; then rm -rf "$STAGING"; fi' EXIT
printf '1/5 Fetching full KSH site...\n'
curl --fail --location --silent --show-error --retry 3 --max-time 65 "$REMOTE" -o "$WORK/release.b64"
base64 --decode "$WORK/release.b64" > "$WORK/ksh.tar.xz"
echo "$HASH  $WORK/ksh.tar.xz" | sha256sum --check --status || { echo 'Archive hash mismatch. Stop.' >&2; exit 1; }
printf '2/5 Validating archive...\n'
tar -tJf "$WORK/ksh.tar.xz" > "$WORK/list"
if grep -E '(\.\./|^/|^\.|//)' "$WORK/list"; then echo 'Unsafe archive paths.' >&2; exit 1; fi
if grep -Ev '^ksh($|/)' "$WORK/list"; then echo 'Unexpected top-level files.' >&2; exit 1; fi
mkdir -p "$WORK/extracted"
tar -xJf "$WORK/ksh.tar.xz" -C "$WORK/extracted" --no-same-owner
for name in index.html arkitektur/index.html heimdal-naturstein/index.html heimslig/index.html heimdal-naturstein/produkter/index.html heimdal-naturstein/produkt/carrara-marmor-30/index.html heimslig/produkter/index.html heimslig/produkt/nord-ro-sofa/index.html heimdal-naturstein/3d-studio/index.html heimslig/3d-studio/index.html assets/showroom.js assets/fullsite.css assets/fullsite.js; do
 test -s "$WORK/extracted/ksh/$name" || { echo "Missing $name" >&2; exit 1; }
done
COUNT=$(find "$WORK/extracted/ksh" -name index.html -type f | wc -l)
if [[ "$COUNT" -lt 98 ]]; then echo "Only $COUNT pages in archive; stop." >&2; exit 1; fi
printf '3/5 Preparing KSH only...\n'
install -d -m 755 "$PARENT"
STAGING="$(mktemp -d "$PARENT/.ksh-v4-XXXXXXXX")"
cp -a "$WORK/extracted/ksh/." "$STAGING/"
chown -R www-data:www-data "$STAGING"
find "$STAGING" -type d -exec chmod 755 {} +
find "$STAGING" -type f -exec chmod 644 {} +
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="$PARENT/ksh-backup-v4-$STAMP"
OLD=0
printf '4/5 Activating with backup...\n'
if [[ -d "$DEST" ]]; then mv "$DEST" "$BACKUP"; OLD=1; fi
if ! mv "$STAGING" "$DEST"; then
 if [[ "$OLD" == 1 ]]; then mv "$BACKUP" "$DEST"; fi
 echo 'Deployment failed; old version restored.' >&2; exit 1
fi
STAGING=''
printf '5/5 Testing public page responses...\n'
FAIL=0
for p in /ksh/ /ksh/arkitektur/ /ksh/heimdal-naturstein/ /ksh/heimdal-naturstein/produkter/ /ksh/heimdal-naturstein/produkt/carrara-marmor-30/ /ksh/heimdal-naturstein/3d-studio/ /ksh/heimslig/ /ksh/heimslig/produkter/ /ksh/heimslig/3d-studio/; do
 status="$(curl -sSL --max-time 14 -o /dev/null -w '%{http_code}' "https://setai.no$p" || true)"
 printf '%s %s\n' "$status" "https://setai.no$p"
 if [[ "$status" != 200 ]]; then FAIL=1; fi
done
if [[ "$FAIL" != 0 ]]; then
 mv "$DEST" "$PARENT/ksh-v4-failed-$STAMP"
 if [[ "$OLD" == 1 ]]; then mv "$BACKUP" "$DEST"; fi
 echo 'Public checks failed; KSH rolled back to previous version.' >&2; exit 2
fi
printf 'Success: %s KSH pages installed. Still INTERNAL REVIEW ONLY. No customer messages sent.\n' "$COUNT"
