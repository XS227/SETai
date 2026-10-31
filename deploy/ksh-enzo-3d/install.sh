#!/usr/bin/env bash
# Isolated Enzo interactive 3D landing deployment.
set -euo pipefail
ROOT="${1:-/var/www/setai/ksh/fliskonkurrenten}"
RAW="https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-enzo-3d"
TARGET="$ROOT/produkt/sanipro-enzo"
[[ -d "$ROOT" && -f "$ROOT/index.html" ]] || { echo "Fant ikke eksisterende Fliskonkurrenten KSH-rot $ROOT. Ingen endringer." >&2;exit 2; }
command -v python3 >/dev/null || { echo "Python3 mangler";exit 2; }
TEMP="$(mktemp -d)";trap 'rm -rf "$TEMP"' EXIT
for f in index.html build_enzo_glb.py;do
 curl --fail --location --silent --show-error --retry 3 --max-time 60 "$RAW/$f" -o "$TEMP/$f"
 test -s "$TEMP/$f" || { echo "Tom eller manglende fil: $f";exit 2; }
done
grep -q 'Sanipro Enzo' "$TEMP/index.html"
grep -q 'noindex,nofollow' "$TEMP/index.html"
grep -q 'enzo-concept.glb' "$TEMP/index.html"
python3 - "$TEMP/build_enzo_glb.py" <<'PY'
import ast,sys
with open(sys.argv[1],encoding='utf-8') as f:ast.parse(f.read())
PY
python3 "$TEMP/build_enzo_glb.py" --output "$TEMP/enzo-concept.glb"
python3 - "$TEMP/enzo-concept.glb" <<'PY'
import json,struct,sys
raw=open(sys.argv[1],'rb').read()
magic,version,size=struct.unpack_from('<4sII',raw,0)
assert magic==b'glTF' and version==2 and size==len(raw)
size0,tag=struct.unpack_from('<I4s',raw,12)
assert tag==b'JSON'
doc=json.loads(raw[20:20+size0])
assert len(doc['meshes'])>=2 and any(m.get('name')=='Enzo exterior' for m in doc['materials'])
print("Validert GLB med",len(doc['meshes']),"mesh-deler.")
PY
BACKUP="/var/backups/setaei/ksh-enzo-3d-$(date +%Y%m%d-%H%M%S)-$$"
if [[ -e "$TARGET" ]];then
 mkdir -p "$BACKUP"
 cp -a "$TARGET" "$BACKUP/sanipro-enzo"
 echo "Backup: $BACKUP/sanipro-enzo"
else
 mkdir -p "$BACKUP"
 echo "Ny separat side; ingen eksisterende filer ble erstattet."
fi
mkdir -p "$TARGET"
for f in index.html enzo-concept.glb;do
 cp "$TEMP/$f" "$TARGET/$f.tmp"
 chmod 0644 "$TARGET/$f.tmp"
 mv -f "$TARGET/$f.tmp" "$TARGET/$f"
done
echo "ENZO 3D DEMO PUBLISERT: https://setai.no/ksh/fliskonkurrenten/produkt/sanipro-enzo/"
echo "Demomodellen er IKKE fabrikk-CAD. Andre KSH-sider er urørt."
