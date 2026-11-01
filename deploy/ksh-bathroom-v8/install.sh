#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-/var/www/setai/ksh/fliskonkurrenten}"
RAW="https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-bathroom-v8"
[[ -f "$ROOT/showroom/index.html" ]] || { echo "Mangler Fliskonkurrenten showroom: $ROOT"; exit 2; }
for exe in curl python3;do command -v "$exe" >/dev/null || { echo "Missing $exe";exit 2; };done
TMP=$(mktemp -d);trap 'rm -rf "$TMP"' EXIT
for file in room.js room.css layout.js film.js apply.py;do
 curl -fLsS --retry 3 --max-time 50 "$RAW/$file" -o "$TMP/$file"
 test -s "$TMP/$file"
done
python3 - "$TMP" <<'PY'
from pathlib import Path
import ast,sys
p=Path(sys.argv[1])
ast.parse((p/'apply.py').read_text())
room=(p/'room.js').read_text()
layout=(p/'layout.js').read_text()
film=(p/'film.js').read_text()
css=(p/'room.css').read_text()
assert "id=\"sr8-clear\"" in room
assert "enabled[key]&&this.models[key]" in room
assert "if(enabled?.sense)" in layout
assert "vedumPalette" in layout and "copy.color.set(entry[0])" in layout
assert "introSeconds=11" in film
assert ".sr8-clear" in css and "max-width:360px" in css
PY
if command -v node >/dev/null;then
 cp "$TMP/room.js" "$TMP/room.mjs"
 cp "$TMP/layout.js" "$TMP/layout.mjs"
 node --check "$TMP/room.mjs"
 node --check "$TMP/layout.mjs"
 node --check "$TMP/film.js"
fi
BACKUP="/var/backups/setaei/ksh-bathroom-v8-$(date +%Y%m%d-%H%M%S)-$$"
python3 "$TMP/apply.py" "$ROOT" "$TMP" "$BACKUP"
echo "LIVE: https://setai.no/ksh/fliskonkurrenten/showroom/"
echo "VEDUM: https://setai.no/ksh/fliskonkurrenten/produkt/vedum-flow-takegronn/"
echo "SENSE: https://setai.no/ksh/fliskonkurrenten/produkt/sanipro-sense/"
