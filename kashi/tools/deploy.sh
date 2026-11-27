#!/usr/bin/env bash
# Publish dist/ to https://kashi.is/v2/ with a backup. Run: sudo ./deploy.sh
# Rollback: sudo ./deploy.sh --rollback /var/backups/setaei/kashi-v2-<stamp>
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)/dist"
ROOT=/var/www/setai/kashi
STAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP="/var/backups/setaei/kashi-v2-$STAMP"
if [[ "${1:-}" == "--rollback" ]]; then SRC="${2:?backup directory}"; fi
[[ -s "$SRC/index.html" ]] || { echo "No index.html in $SRC" >&2; exit 2; }
[[ -d "$ROOT/v2" ]] || { echo "Missing $ROOT/v2" >&2; exit 2; }
install -d -m 0755 /var/backups/setaei
NEW="$ROOT/.v2-new-$STAMP"
cp -r "$SRC" "$NEW"
chown -R root:root "$NEW"
find "$NEW" -type d -exec chmod 755 {} +
find "$NEW" -type f -exec chmod 644 {} +
mv "$ROOT/v2" "$BACKUP"
mv "$NEW" "$ROOT/v2" || { mv "$BACKUP" "$ROOT/v2"; exit 1; }
echo "Published. Backup of previous version: $BACKUP"
