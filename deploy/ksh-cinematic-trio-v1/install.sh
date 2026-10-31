#!/usr/bin/env bash
# Scoped SETAEI KSH install: three cinematic GLB pages + existing Sense price correction.
set -euo pipefail
ROOT="/var/www/setai/ksh/fliskonkurrenten"
if [ "$#" -gt 0 ]; then ROOT="$1"; fi
RAW="https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-cinematic-trio-v1"
[[ -f "$ROOT/index.html" ]] || { echo "KSH Fliskonkurrenten mangler på $ROOT. Ingen endringer." >&2; exit 2; }
for c in curl python3; do command -v "$c" >/dev/null || { echo "Mangler $c" >&2; exit 2; }; done
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/models"
for f in main.js style.css build_glb.py; do
 curl -fLsS --retry 3 --max-time 75 "$RAW/$f" -o "$TMP/$f"
 test -s "$TMP/$f"
done
if command -v node >/dev/null; then node --check "$TMP/main.js"; fi
python3 -m py_compile "$TMP/build_glb.py"
for slug in vedum-flow-takegronn zup-spilepanel-eik-sort colorker-althea-sand-dekor; do
 mkdir -p "$TMP/$slug/assets"
 curl -fLsS --retry 3 --max-time 75 "$RAW/$slug/index.html" -o "$TMP/$slug/index.html"
 cp "$TMP/style.css" "$TMP/main.js" "$TMP/$slug/assets/"
done
getphoto() {
 local slug="$1" name="$2" url="$3"
 curl -fLsS --retry 3 --max-time 100 "$url" -o "$TMP/$slug/assets/$name.webp"
}
getphoto vedum-flow-takegronn hero "https://fliskonkurrenten.no/wp-content/uploads/2025/08/vedum_badrum_flow_zone_1200_dimgron_00_toppbild-1200x900.webp"
getphoto vedum-flow-takegronn detail "https://fliskonkurrenten.no/wp-content/uploads/2025/08/vedum_badrum_flow_zone_1200_dimgron_00_toppbild.webp"
getphoto zup-spilepanel-eik-sort hero "https://fliskonkurrenten.no/wp-content/uploads/2024/03/duri-media-7072789020817-51582-jpg.webp"
getphoto zup-spilepanel-eik-sort detail "https://fliskonkurrenten.no/wp-content/uploads/2024/01/Skjermbilde-2024-10-31-084259-png.webp"
getphoto colorker-althea-sand-dekor hero "https://fliskonkurrenten.no/wp-content/uploads/2026/05/E6mp-pifWn-U4mniGoxN3v_A9G9D7ItkJiOAwc7LU_lQdYD_t7B2z7KNdWF6EZPFkSOqFOWP2lLmGGpSGsxae_sC-600x600.webp"
getphoto colorker-althea-sand-dekor detail "https://fliskonkurrenten.no/wp-content/uploads/2026/05/E6mp-pifWn-U4mniGoxN3v_A9G9D7ItkJiOAwc6aBPkDc9Ckt7B4yuKPcjV5FZeZyS79Ru-Li121GDxZScxae_k-600x600.webp"
python3 "$TMP/build_glb.py" "$TMP/models"
for slug in vedum-flow-takegronn zup-spilepanel-eik-sort colorker-althea-sand-dekor;do
 cp "$TMP/models/$slug.glb" "$TMP/$slug/assets/model.glb"
done
curl -fLsS --retry 3 --max-time 75 "https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-sense-cinematic-v1/index.html" -o "$TMP/sense.html"
python3 - "$TMP" <<'PY'
import json,struct,sys
from pathlib import Path
from html.parser import HTMLParser
root=Path(sys.argv[1])
names={'vedum-flow-takegronn':('41 925','Vedum Flow'),
'zup-spilepanel-eik-sort':('1 999','Z-UP'),
'colorker-althea-sand-dekor':('1 299','Colorker')}
class Links(HTMLParser):
 def __init__(self):super().__init__();self.urls=[]
 def handle_starttag(self,tag,attrs):
  if tag=='a':self.urls.extend(v for k,v in attrs if k=='href')
for slug,(price,name) in names.items():
 p=root/slug;html=(p/'index.html').read_text()
 assert price in html and name in html and 'noindex,nofollow' in html,slug
 assert 'oslovvssenter' not in html.lower()
 links=Links();links.feed(html)
 assert not any(str(x).startswith(('http:','https:','//')) for x in links.urls)
 for f in ('hero.webp','detail.webp'):
  data=(p/'assets'/f).read_bytes()
  assert len(data)>3500 and data[:4]==b'RIFF' and data[8:12]==b'WEBP',(slug,f)
 buf=(p/'assets/model.glb').read_bytes()
 magic,version,size=struct.unpack_from('<4sII',buf)
 assert (magic,version,size)==(b'glTF',2,len(buf))
 n,tag=struct.unpack_from('<I4s',buf,12);assert tag==b'JSON'
 doc=json.loads(buf[20:20+n]);assert len(doc['meshes'])>=9
print('3D, priser, interne CTA-er og alle seks originalbilder godkjent.')
sense=(root/'sense.html').read_text()
assert '24 750' in sense and 'oslovvssenter.no' not in sense
PY
BACKUP="/var/backups/setaei/ksh-trio-$(date +%Y%m%d-%H%M%S)-$$"
mkdir -p "$BACKUP"
for slug in vedum-flow-takegronn zup-spilepanel-eik-sort colorker-althea-sand-dekor;do
 target="$ROOT/produkt/$slug"
 if [[ -d "$target" ]];then cp -a "$target" "$BACKUP/$slug";fi
done
sense="$ROOT/produkt/sanipro-sense/index.html"
if [[ -f "$sense" ]];then cp -a "$sense" "$BACKUP/sense-index.html";fi
for slug in vedum-flow-takegronn zup-spilepanel-eik-sort colorker-althea-sand-dekor;do
 target="$ROOT/produkt/$slug";mkdir -p "$target/assets"
 cp "$TMP/$slug/index.html" "$target/index.html.new";chmod 644 "$target/index.html.new";mv "$target/index.html.new" "$target/index.html"
 for src in "$TMP/$slug/assets/"*;do
  name="$(basename "$src")"
  cp "$src" "$target/assets/$name.new";chmod 644 "$target/assets/$name.new";mv "$target/assets/$name.new" "$target/assets/$name"
 done
 echo "Publisert https://setai.no/ksh/fliskonkurrenten/produkt/$slug/"
done
if [[ -f "$sense" ]];then
 cp "$TMP/sense.html" "$sense.new";chmod 644 "$sense.new";mv "$sense.new" "$sense"
 echo "Sense oppdatert til Fliskonkurrenten 24 750 kr, uten VVS-link."
fi
echo "Backup: $BACKUP"
echo "Alle andre KSH-sider urørt."
