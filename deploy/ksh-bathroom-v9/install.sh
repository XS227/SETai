#!/usr/bin/env bash
set -euo pipefail
ROOT="/var/www/setai/ksh/fliskonkurrenten"
if [ "$#" -gt 0 ];then ROOT="$1";fi
RAW="https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-bathroom-v9"
VEDUM="https://www.vedum.no/globalassets/kok/bankskivor/kompositsten/11/vedum_kok_bankskiva_turbine_grey.jpg"
test -f "$ROOT/showroom/index.html" || { echo "Missing KSH showroom";exit 2; }
test -f "$ROOT/produkt/vedum-flow-takegronn/assets/model-yup-v6.glb" || { echo "Missing canonical Vedum GLB";exit 2; }
for command_name in curl python3;do command -v "$command_name" >/dev/null || exit 2;done
TMP=$(mktemp -d);trap 'rm -rf "$TMP"' EXIT
for f in room.js layout.js room.css build_turbine_glb.py apply.py;do
 curl -fsSL --retry 3 --max-time 45 "$RAW/$f" -o "$TMP/$f"
 test -s "$TMP/$f"
done
curl -fsSL --retry 3 --max-time 90 "$VEDUM" -o "$TMP/turbine-grey.jpg"
python3 - "$TMP" <<'PY'
from pathlib import Path
import ast,sys
p=Path(sys.argv[1])
for f in ('apply.py','build_turbine_glb.py'):ast.parse((p/f).read_text())
photo=(p/'turbine-grey.jpg').read_bytes()
assert len(photo)>10000 and photo[:3]==b'\xff\xd8\xff', 'Vedum image missing or not JPEG'
assert "materials.none" in (p/'room.js').read_text()
assert "model-turbine-v9.glb" in (p/'room.js').read_text()
assert "stone:['#ffffff'" in (p/'layout.js').read_text()
PY
if command -v node >/dev/null;then
 cp "$TMP/room.js" "$TMP/room.mjs";cp "$TMP/layout.js" "$TMP/layout.mjs"
 node --check "$TMP/room.mjs";node --check "$TMP/layout.mjs"
fi
python3 "$TMP/build_turbine_glb.py" "$ROOT/produkt/vedum-flow-takegronn/assets/model-yup-v6.glb" "$TMP/turbine-grey.jpg" "$TMP/model-turbine-v9.glb"
BACKUP="/var/backups/setaei/ksh-bathroom-v9-$(date +%Y%m%d-%H%M%S)-$$"
python3 "$TMP/apply.py" "$ROOT" "$TMP" "$BACKUP"
echo "READY https://setai.no/ksh/fliskonkurrenten/showroom/"
echo "READY https://setai.no/ksh/fliskonkurrenten/produkt/vedum-flow-takegronn/"
