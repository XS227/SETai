#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-/var/www/setai/ksh/fliskonkurrenten}"
RAW="https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-v13-1"
[[ -f "$ROOT/produkt/vedum-flow-takegronn/assets/model-turbine-v13.glb" && -f "$ROOT/kategorier/catalog.json" ]] || { echo "v13 must be deployed first";exit 2; }
TMP="$(mktemp -d)";trap 'rm -rf "$TMP"' EXIT
for f in studio.js studio.css apply.py;do curl -fLsS --max-time 40 --retry 3 "$RAW/$f" -o "$TMP/$f";test -s "$TMP/$f";done
node --check "$TMP/studio.js"
python3 - "$TMP" <<'PY'
from pathlib import Path
import sys,ast
p=Path(sys.argv[1])
ast.parse((p/'apply.py').read_text())
js=(p/'studio.js').read_text()
css=(p/'studio.css').read_text()
for x in ['embedded=1','k13-embedded-room','role','model-viewer','tablist','iframe']:
 assert x in js,x
for x in ['k13-embedded-room','100dvh','.k13-studio-modes','.k13-embedded-stage']:
 assert x in css,x
print('PREFLIGHT OK: real 3D iframe embed and product-view fallback')
PY
BACKUP="/var/backups/setaei/ksh-v13-1-$(date +%Y%m%d-%H%M%S)-$$"
sudo -n python3 "$TMP/apply.py" "$ROOT" "$TMP" "$BACKUP"
echo "https://setai.no/ksh/fliskonkurrenten/produkt/vedum-flow-takegronn/?v=13.1"
echo "https://setai.no/ksh/fliskonkurrenten/kategorier/?v=13.1"
