#!/usr/bin/env bash
# SETAEI KSH: isolated cinematic Sanipro Sense 170x80 product demo.
set -euo pipefail
ROOT="${1:-/var/www/setai/ksh/fliskonkurrenten}"
TARGET="$ROOT/produkt/sanipro-sense"
RAW="https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-sense-cinematic-v1"
if [[ ! -f "$ROOT/index.html" ]]; then echo "Fant ikke KSH Fliskonkurrenten på $ROOT. Ingen endringer." >&2; exit 2; fi
for cmd in curl python3; do command -v "$cmd" >/dev/null || { echo "Mangler $cmd"; exit 2; }; done
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/assets"
for f in index.html build_sense_glb.py assets/sense-drawing.svg; do
  curl -fLsS --retry 3 --max-time 55 "$RAW/$f" -o "$TMP/$f"
  test -s "$TMP/$f" || { echo "Tom kildefil: $f"; exit 2; }
done
# Source photos published by Oslo VVS / Sanipro, cached locally by this demo.
declare -A IMG
IMG[sense-hero.webp]="https://oslovvs-i02.mycdn.no/mysimgprod/oslovvs_mystore_no/images/aIl1q_Sanipro_Sanipro_Sense_badekar_170x80_cm_Back_1.webp/w800h800.webp"
IMG[sense-angle.webp]="https://oslovvs-i05.mycdn.no/mysimgprod/oslovvs_mystore_no/images/QVMcJ_Sanipro_Sanipro_Sense_badekar_170x80_cm_Back_1.webp/w800h800.webp"
IMG[sense-front.webp]="https://oslovvs-i02.mycdn.no/mysimgprod/oslovvs_mystore_no/images/9TB2k_Sanipro_Sanipro_Sense_badekar_170x80_cm_Back_1.webp/w800h800.webp"
IMG[sense-product.webp]="https://oslovvs-i01.mycdn.no/mysimgprod/oslovvs_mystore_no/images/gwUq6_Sanipro_Sanipro_Sense_Back-To-Wall_Badekar_1_1.webp/w800h800.webp"
for name in "${!IMG[@]}"; do
  curl -fLsS --retry 3 --max-time 80 "${IMG[$name]}" -o "$TMP/assets/$name"
done
python3 - "$TMP" <<'PY'
import sys, pathlib, ast
root=pathlib.Path(sys.argv[1])
ast.parse((root/'build_sense_glb.py').read_text())
html=(root/'index.html').read_text()
assert '<model-viewer' in html and '21 400' in html and 'noindex,nofollow' in html
assert 'ksh/fliskonkurrenten' in html and 'oslovvssenter.no' in html
for f in root.glob('assets/*.webp'):
 raw=f.read_bytes()
 assert len(raw)>5000 and raw[:4]==b'RIFF' and raw[8:12]==b'WEBP', str(f)
assert len(list(root.glob('assets/*.webp')))==4
PY
python3 "$TMP/build_sense_glb.py" --output "$TMP/assets/sanipro-sense-170x80.glb"
python3 - "$TMP/assets/sanipro-sense-170x80.glb" <<'PY'
import sys,struct,json
raw=open(sys.argv[1],'rb').read()
magic,ver,n=struct.unpack_from('<4sII',raw,0)
assert magic==b'glTF' and ver==2 and n==len(raw)
l,kind=struct.unpack_from('<I4s',raw,12)
assert kind==b'JSON'
doc=json.loads(raw[20:20+l])
assert len(doc['meshes'])>=5 and doc['extras']['dimensions_m']==[1.7,.8,.6]
print('3D GLB validert:',len(doc['meshes']),'mesh-deler;',len(raw),'bytes')
PY
BACKUP="/var/backups/setaei/ksh-sense-cinematic-$(date +%Y%m%d-%H%M%S)-$$"
mkdir -p "$BACKUP"
if [[ -d "$TARGET" ]]; then
  cp -a "$TARGET" "$BACKUP/sanipro-sense"
  echo "Backup: $BACKUP/sanipro-sense"
fi
mkdir -p "$TARGET/assets"
cp "$TMP/index.html" "$TARGET/index.html.new"
chmod 0644 "$TARGET/index.html.new"
mv -f "$TARGET/index.html.new" "$TARGET/index.html"
for src in "$TMP"/assets/*; do
  name="$(basename "$src")"
  cp "$src" "$TARGET/assets/$name.new"
  chmod 0644 "$TARGET/assets/$name.new"
  mv -f "$TARGET/assets/$name.new" "$TARGET/assets/$name"
done
echo "Publisert: https://setai.no/ksh/fliskonkurrenten/produkt/sanipro-sense/"
echo "Andre KSH-sider er ikke endret."
if [[ -d "$BACKUP/sanipro-sense" ]]; then
  echo "Rollback (sidefiler): sudo cp -a '$BACKUP/sanipro-sense/.' '$TARGET/'"
fi

