#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-/var/www/setai/ksh}"
RAW="${KSH_BATHROOM_SOURCE_URL:-https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-bathroom-v6}"
for file in "$ROOT/assets/ksh-v6/room-data.js" "$ROOT/fliskonkurrenten/produkt/vedum-flow-takegronn/index.html" "$ROOT/fliskonkurrenten/assets/sense-film-v4/landing.js"; do
 [[ -s "$file" ]] || { echo "Mangler eksisterende KSH/Sense-installasjon: $file" >&2; exit 2; }
done
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
curl -fLsS --retry 2 --max-time 60 "$RAW/SHA256SUMS" -o "$TMP/SHA256SUMS"
while read -r hash file; do
 [[ "$file" =~ ^[a-zA-Z0-9._-]+$ ]] || exit 2
 curl -fLsS --retry 2 --max-time 120 "$RAW/$file" -o "$TMP/$file"
done < "$TMP/SHA256SUMS"
(cd "$TMP" && sha256sum -c SHA256SUMS)
if command -v node >/dev/null; then
 for file in room.js layout.js room-renderer.js shared.js film.js; do node --input-type=module --check < "$TMP/$file"; done
fi
BACKUP="${KSH_BACKUP_ROOT:-/var/backups/setaei}/bathroom-v6-$(date +%Y%m%d-%H%M%S)-$$"
python3 "$TMP/apply.py" "$ROOT" "$TMP" "$BACKUP"
printf '%s\n' 'https://setai.no/ksh/fliskonkurrenten/showroom/'
