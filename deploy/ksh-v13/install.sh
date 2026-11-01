#!/usr/bin/env bash
# SETAEI KSH Fliskonkurrenten v13: correct live Vedum 3D and all-category banners.
set -euo pipefail
ROOT="${1:-/var/www/setai/ksh/fliskonkurrenten}"
RAW="https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-v13"
[[ -f "$ROOT/produkt/vedum-flow-takegronn/assets/model-turbine-v9.glb" && -f "$ROOT/produkter/index.html" ]] || {
 echo "Required KSH product assets not present; no changes made." >&2;exit 2;
}
for cmd in python3 node curl;do command -v "$cmd" >/dev/null || { echo "Missing $cmd" >&2;exit 2;};done
TMP="$(mktemp -d)";trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/categories/assets"
for file in build_vedum.py catalog.py apply.py entry.js entry.css;do
 curl -fLsS --max-time 45 --retry 3 "$RAW/$file" -o "$TMP/$file"
 test -s "$TMP/$file"
done
for file in index.html category.js category.css;do
 curl -fLsS --max-time 45 --retry 3 "$RAW/categories/$file" -o "$TMP/categories/$file"
 test -s "$TMP/categories/$file"
done
python3 - "$TMP" <<'PY'
from pathlib import Path
import ast,sys
p=Path(sys.argv[1])
for name in ('build_vedum.py','catalog.py','apply.py'):
 ast.parse((p/name).read_text())
assert 'image' in (p/'catalog.py').read_text()
assert 'k13-view' in (p/'categories/index.html').read_text()
print('PASS: category template and Python syntax')
PY
node --check "$TMP/entry.js"
node --check "$TMP/categories/category.js"
python3 "$TMP/catalog.py" "$TMP/categories/assets"
python3 "$TMP/build_vedum.py" "$ROOT/produkt/vedum-flow-takegronn/assets/model-turbine-v9.glb" "$TMP/model-turbine-v13.glb"
python3 - "$TMP" <<'PY'
from pathlib import Path
import json,struct,sys
p=Path(sys.argv[1])
j=json.loads((p/'categories/catalog.json').read_text())
assert len(j['groups'])==9
assert sum(len(x['categories'])for x in j['groups'])==42
assert len(list((p/'categories/assets').iterdir()))>=25
for group in j['groups']:
 for cat in group['categories']:assert (p/'categories'/cat['image']).is_file(),cat
data=(p/'model-turbine-v13.glb').read_bytes()
assert data[:4]==b'glTF' and struct.unpack_from('<I',data,8)[0]==len(data)
n=struct.unpack_from('<I',data,12)[0];g=json.loads(data[20:20+n])
materials={m['name']:m['pbrMetallicRoughness'] for m in g['materials']}
assert materials['front']['baseColorFactor'][0]<.2,materials['front']
assert 'baseColorTexture' in materials['stone']
print('PASS: 9 category groups, 42 subcategories, photo banners, calibrated textured 3D')
PY
BACKUP="/var/backups/setaei/ksh-vedum-categories-v13-$(date +%Y%m%d-%H%M%S)-$$"
sudo -n python3 "$TMP/apply.py" "$ROOT" "$TMP" "$BACKUP"
echo "CATEGORY HUB https://setai.no/ksh/fliskonkurrenten/kategorier/?v=13"
echo "VEDUM 3D https://setai.no/ksh/fliskonkurrenten/produkt/vedum-flow-takegronn/?v=13"
echo "HOME https://setai.no/ksh/fliskonkurrenten/?v=13"
