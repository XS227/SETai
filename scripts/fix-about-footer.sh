#!/usr/bin/env bash
set -euo pipefail
ROOT=/var/www/setai
TARGET="$ROOT/about/index.html"
URL="https://raw.githubusercontent.com/XS227/SETai/main/about/index.html"
[ "$(id -u)" -eq 0 ] || { echo "Please run using sudo"; exit 1; }
[ -f "$TARGET" ] || { echo "Target not found: $TARGET"; exit 1; }
[ ! -L "$TARGET" ] || { echo "Refusing to overwrite symlink"; exit 1; }
STAGE="$(mktemp "$ROOT/about/.about-footer-fix-XXXXXXXX")"
trap 'rm -f "$STAGE"' EXIT
curl -fsSL --retry 3 --max-time 30 "$URL" -o "$STAGE"
[ "$(wc -c < "$STAGE")" -ge 8000 ] || { echo "Downloaded content unexpectedly short"; exit 1; }
[ "$(grep -o '<footer\b' "$STAGE" | wc -l)" -eq 1 ] || { echo "Expected exactly one footer"; exit 1; }
grep -Fq 'class="home-footer"' "$STAGE" || { echo "Shared footer missing"; exit 1; }
grep -Fq 'class="setaei-logo"' "$STAGE" || { echo "Original logo missing"; exit 1; }
BACKUP="$TARGET.backup-$(date -u +%Y%m%dT%H%M%SZ)"
cp -a "$TARGET" "$BACKUP"
chmod --reference="$TARGET" "$STAGE"
chown --reference="$TARGET" "$STAGE"
mv -f "$STAGE" "$TARGET"
echo "PUBLISHED about footer correction. Backup: $BACKUP"
echo "Local footer count: $(grep -o '<footer\b' "$TARGET" | wc -l)"
echo "Online URL: https://setai.no/about/"
