#!/usr/bin/env bash
# Scoped KSH Fliskonkurrenten image/layout patch, preserving earlier versions.
set -euo pipefail
ROOT="${1:-/var/www/setai/ksh/fliskonkurrenten}"
RAW="https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-ux-v12"
ZUP_SOURCE="https://duri.no/media/catalog/product/cache/46ee0b8152f0e234e40d5971930c811e/d/u/duri-media-7072789020084-54589.jpg"
[[ -f "$ROOT/produkter/index.html" && -f "$ROOT/showroom/index.html" ]] || { echo "Missing expected Fliskonkurrenten KSH root";exit 2; }
for cmd in python3 curl node;do command -v "$cmd" >/dev/null || { echo "Missing $cmd";exit 2; };done
TMP="$(mktemp -d)";trap 'rm -rf "$TMP"' EXIT
for file in ux.css ux.js apply.py;do
 curl -fLsS --retry 3 --max-time 50 "$RAW/$file" -o "$TMP/$file"
 test -s "$TMP/$file"
done
curl -fLsS --retry 3 --max-time 70 "$ZUP_SOURCE" -o "$TMP/zup-eik-sort-600066.jpg"
node --check "$TMP/ux.js"
python3 - "$TMP" <<'PY'
from pathlib import Path
import ast,struct,sys
p=Path(sys.argv[1])
ast.parse((p/'apply.py').read_text())
css=(p/'ux.css').read_text()
js=(p/'ux.js').read_text()
photo=(p/'zup-eik-sort-600066.jpg').read_bytes()
assert photo[:3]==bytes.fromhex('ffd8ff') and len(photo)>40000
assert b'JFIF' in photo[:32] or b'Exif' in photo[:32]
assert 'zup-eik-sort-600066.jpg' in css and 'zup-eik-sort-600066.jpg' in js
assert 'sr10-compact.sense-composer .sr5-drawer' in css
assert 'story-stage' in css and 'hero-content' in css and '.ksh2-head' in css
assert 'footer.k6-footer' in js
print('PREFLIGHT OK: official Z-UP GTIN image',len(photo),'bytes, JS/CSS and 4 landing layouts')
PY
BACKUP="/var/backups/setaei/ksh-ux-v12-$(date +%Y%m%d-%H%M%S)-$$"
python3 "$TMP/apply.py" "$ROOT" "$TMP" "$BACKUP"
echo "LIVE https://setai.no/ksh/fliskonkurrenten/produkter/?v=12"
echo "LIVE https://setai.no/ksh/fliskonkurrenten/produkt/zup-spilepanel-eik-sort/?v=12"
echo "LIVE https://setai.no/ksh/fliskonkurrenten/showroom/?v=12"
