#!/usr/bin/env bash
# SETAEI KSH v3 — verified, reversible deployment, 30 October 2026.
set -Eeuo pipefail
if [[ $(id -u) -ne 0 ]]; then
  echo "Run with sudo: sudo bash /tmp/install-setaei-ksh.sh" >&2
  exit 1
fi

BASE="https://raw.githubusercontent.com/XS227/SETai/ksh-deploy-20261030/deploy"
SHA="ee3ed026484fbabde6097062efcdf2d39bd8911569690b50b5e8c3d3baf24c35"
DEST="/var/www/setai/ksh"
PARENT="/var/www/setai"
WORK="$(mktemp -d /tmp/ksh-v3-XXXXXXXX)"
STAGING=""
trap 'rm -rf "$WORK"; if [[ -n "$STAGING" && -d "$STAGING" ]]; then rm -rf "$STAGING"; fi' EXIT

echo "[1/5] Fetching updated KSH site from authenticated SETAEI GitHub repo branch"
curl --fail --location --silent --show-error --retry 3 --max-time 50 \
  "$BASE/ksh-site-v3.tar.xz.base64" -o "$WORK/release.base64"
base64 --decode "$WORK/release.base64" > "$WORK/release.tar.xz"
echo "$SHA  $WORK/release.tar.xz" | sha256sum -c -

echo "[2/5] Validating archive and required site pages"
tar -tJf "$WORK/release.tar.xz" > "$WORK/paths"
if grep -Ev '^ksh(/|$)' "$WORK/paths"; then
  echo "Unexpected path in KSH archive; aborted." >&2
  exit 1
fi
mkdir -p "$WORK/unpack"
tar -xJf "$WORK/release.tar.xz" -C "$WORK/unpack"
for name in index.html heimslig/index.html heimdal-naturstein/index.html \
  fliskonkurrenten/index.html flyt-gulv/index.html steinbra/index.html golh-holding/index.html \
  assets/style.css assets/relaunch.css assets/showroom.js assets/relaunch.js; do
  if [[ ! -s "$WORK/unpack/ksh/$name" ]]; then
    echo "Missing file: $name" >&2
    exit 1
  fi
done

echo "[3/5] Preparing atomic replacement; other SETAEI pages untouched"
install -d -m 755 "$PARENT"
STAGING="$(mktemp -d "$PARENT/.ksh-stage-XXXXXX")"
cp -a "$WORK/unpack/ksh/." "$STAGING/"
chown -R www-data:www-data "$STAGING"
find "$STAGING" -type d -exec chmod 755 {} +
find "$STAGING" -type f -exec chmod 644 {} +

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="$PARENT/ksh-backup-$STAMP"
HAD_OLD=0
echo "[4/5] Activating update"
if [[ -d "$DEST" ]]; then
  mv "$DEST" "$BACKUP"
  HAD_OLD=1
  echo "Backup: $BACKUP"
fi
if ! mv "$STAGING" "$DEST"; then
  if [[ "$HAD_OLD" == 1 ]]; then mv "$BACKUP" "$DEST"; fi
  echo "Unable to activate KSH. Backup restored." >&2
  exit 1
fi
STAGING=""

echo "[5/5] Verifying live pages"
FAILED=0
for path in /ksh/ /ksh/heimslig/ /ksh/heimdal-naturstein/ \
  /ksh/fliskonkurrenten/ /ksh/flyt-gulv/ /ksh/steinbra/ /ksh/golh-holding/; do
  CODE="$(curl -sSL -o /dev/null -w '%{http_code}' --max-time 12 "https://setai.no$path" || true)"
  echo "$CODE https://setai.no$path"
  if [[ "$CODE" != 200 ]]; then FAILED=1; fi
done

if [[ "$FAILED" != 0 ]]; then
  echo "Public check failed; rolling back KSH only." >&2
  mv "$DEST" "$PARENT/ksh-failed-$STAMP"
  if [[ "$HAD_OLD" == 1 ]]; then mv "$BACKUP" "$DEST"; fi
  exit 2
fi

echo "KSH v3 deployment successful: 7 pages HTTP 200."
echo "Remember: WebGL room editing requires a real WebGL-capable browser."
