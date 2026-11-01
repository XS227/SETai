#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-/var/www/setai/ksh}"
RAW="${KSH_VEDUM_FILM_SOURCE_URL:-https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-vedum-film-v7}"
PAGE="$ROOT/fliskonkurrenten/produkt/vedum-flow-takegronn/index.html"
[[ -s "$PAGE" ]] || { echo "Mangler Vedum-produktsiden: $PAGE" >&2; exit 2; }
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
for file in film.js film.css apply.py vedum.mp4 vedum.webm poster.jpg SHA256SUMS; do
 curl -fLsS --retry 2 --max-time 90 "$RAW/$file" -o "$TMP/$file"
done
(cd "$TMP" && sha256sum -c SHA256SUMS)
if command -v node >/dev/null; then node --check "$TMP/film.js"; fi
BACKUP="${KSH_BACKUP_ROOT:-/var/backups/setaei}/vedum-film-v7-$(date +%Y%m%d-%H%M%S)-$$"
python3 "$TMP/apply.py" "$ROOT" "$TMP" "$BACKUP"
printf '%s\n' 'https://setai.no/ksh/fliskonkurrenten/produkt/vedum-flow-takegronn/'
