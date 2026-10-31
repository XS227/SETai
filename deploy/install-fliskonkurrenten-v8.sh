#!/usr/bin/env bash
# SETAEI KSH / Fliskonkurrenten v8 — targeted deployment. Only one file is changed.
set -Eeuo pipefail

ROOT='/var/www/setai/ksh/fliskonkurrenten'
TARGET="$ROOT/index.html"
SOURCE='https://raw.githubusercontent.com/XS227/SETai/ksh-fliskonkurrenten-v8-20261031/deploy/fliskonkurrenten-v8/index.html'
EXPECTED_SHA256='4d9b73843fff6d15b8fbb0095c47fc0e6b72585544331a4a07d16f1049523ec5'
URL='https://setai.no/ksh/fliskonkurrenten/'

if [[ "$(id -u)" -ne 0 ]]; then
  echo 'Use: sudo bash install-fliskonkurrenten-v8.sh' >&2
  exit 1
fi
if [[ ! -f "$TARGET" ]] || [[ -L "$TARGET" ]]; then
  echo "Target is missing or a symlink: $TARGET. Aborting." >&2
  exit 1
fi
if ! grep -qi 'fliskonkurrenten' "$TARGET"; then
  echo 'Existing page identity check failed. Aborting.' >&2
  exit 1
fi

TMP="$(mktemp "$ROOT/.index-v8.XXXXXXXX")"
trap 'rm -f -- "$TMP"' EXIT
echo '1/4 Downloading reviewed Fliskonkurrenten v8 page from SETAEI GitHub'
curl --fail --location --silent --show-error --retry 3 --max-time 45 "$SOURCE" -o "$TMP"
echo "$EXPECTED_SHA256  $TMP" | sha256sum --check --status || {
  echo 'Download checksum mismatch. Old page untouched.' >&2; exit 1;
}
for marker in 'id="outlet"' 'id="leverandorer"' 'id="sosialt"' 'FLISKONKURRENTEN' '</html>'; do
  grep -qF "$marker" "$TMP" || { echo "Missing marker: $marker" >&2; exit 1; }
done

if cmp -s "$TARGET" "$TMP"; then
  echo 'Already published: target matches GitHub source.'
  exit 0
fi
BACKUP="$ROOT/index.html.bak.$(date -u +%Y%m%dT%H%M%SZ)"
cp -a -- "$TARGET" "$BACKUP"
chmod --reference="$TARGET" "$TMP"
chown --reference="$TARGET" "$TMP"
echo "2/4 Backup created: $BACKUP"
mv -f -- "$TMP" "$TARGET"
trap - EXIT

echo '3/4 Verifying local file and public URL'
echo "$EXPECTED_SHA256  $TARGET" | sha256sum --check --status || {
  cp -a "$BACKUP" "$TARGET"
  echo 'Local verification failed; backup restored.' >&2
  exit 2
}
PASS=0
for attempt in 1 2 3; do
  CACHEBUST="$(date +%s)-$attempt"
  if curl --fail --location --silent --show-error --max-time 25 "$URL?check=$CACHEBUST" | grep -qF 'id="leverandorer"'; then
    PASS=1
    break
  fi
  sleep 2
done
if [[ "$PASS" -ne 1 ]]; then
  cp -a "$BACKUP" "$TARGET"
  echo 'Public verification failed; backup restored. Check cache/Nginx routing.' >&2
  exit 3
fi

echo '4/4 SUCCESS — Only Fliskonkurrenten homepage updated.'
echo "LIVE: $URL"
echo "BACKUP: $BACKUP"
echo "SHA256: $EXPECTED_SHA256"
