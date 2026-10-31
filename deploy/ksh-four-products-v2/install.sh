#!/usr/bin/env bash
# SETAEI KSH four products, one header/footer and camera-free 3D room visualization.
set -euo pipefail
ROOT="/var/www/setai/ksh/fliskonkurrenten"
if [ "$#" -gt 0 ];then ROOT="$1";fi
RAW="https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-four-products-v2"
[[ -f "$ROOT/index.html" ]] || { echo "KSH Fliskonkurrenten root missing: $ROOT" >&2;exit 2; }
for cmd in python3 curl;do command -v "$cmd" >/dev/null || { echo "Missing $cmd" >&2;exit 2; };done
TMP="$(mktemp -d)";trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/produkter"
for f in shared.js shared.css produkter/index.html;do
 curl -fLsS --retry 3 --max-time 50 "$RAW/$f" -o "$TMP/$f"
 test -s "$TMP/$f" || { echo "Missing file: $f" >&2;exit 2; }
done
curl -fLsS --retry 3 --max-time 70 "https://fliskonkurrenten.no/wp-content/uploads/2023/12/logo-Flisa-hvit-e1703620450362.png" -o "$TMP/ksh-logo.png"
if command -v node >/dev/null;then node --check "$TMP/shared.js";fi
for slug in sanipro-sense vedum-flow-takegronn zup-spilepanel-eik-sort colorker-althea-sand-dekor;do
 [[ -f "$ROOT/produkt/$slug/index.html" ]] || { echo "Missing product HTML: $slug" >&2;exit 2; }
 find "$ROOT/produkt/$slug/assets" -maxdepth 1 -type f -name '*.glb' -size +1k | grep -q . || { echo "GLB model missing: $slug" >&2;exit 2; }
done
python3 - "$ROOT" "$TMP" <<'PY'
import sys,struct
from pathlib import Path
root,tmp=map(Path,sys.argv[1:])
logo=(tmp/'ksh-logo.png').read_bytes()
assert logo[:8]==b'\x89PNG\r\n\x1a\n' and len(logo)>1000
js=(tmp/'shared.js').read_text(encoding='utf-8')
assert "removeAttribute('ar')" in js
assert all(slug in js for slug in ['sanipro-sense','vedum-flow-takegronn','zup-spilepanel-eik-sort','colorker-althea-sand-dekor'])
assert 'ksh2-gallery' in (tmp/'produkter/index.html').read_text()
for slug in ['sanipro-sense','vedum-flow-takegronn','zup-spilepanel-eik-sort','colorker-althea-sand-dekor']:
 folder=root/'produkt'/slug
 source=(folder/'index.html').read_text(encoding='utf-8')
 assert '</head>' in source.lower() and '</body>' in source.lower(),slug
 for path in (folder/'assets').glob('*.glb'):
  data=path.read_bytes()
  assert len(data)>1500 and data[:4]==b'glTF' and len(data)==struct.unpack_from('<I',data,8)[0],path
assert '<head' in (root/'index.html').read_text(encoding='utf-8').lower()
print('Preflight OK: all four 3D pages, valid GLBs, real logo and product gallery.')
PY
BACKUP="/var/backups/setaei/ksh-four-products-v2-$(date +%Y%m%d-%H%M%S)-$$"
mkdir -p "$BACKUP/products"
cp -a "$ROOT/index.html" "$BACKUP/root-index.html"
for slug in sanipro-sense vedum-flow-takegronn zup-spilepanel-eik-sort colorker-althea-sand-dekor;do
 mkdir -p "$BACKUP/products/$slug"
 cp -a "$ROOT/produkt/$slug/index.html" "$BACKUP/products/$slug/index.html"
done
for slug in vedum-flow-takegronn zup-spilepanel-eik-sort colorker-althea-sand-dekor;do
 if [[ -f "$ROOT/produkt/$slug/assets/main.js" ]];then
  mkdir -p "$BACKUP/products/$slug/assets"
  cp -a "$ROOT/produkt/$slug/assets/main.js" "$BACKUP/products/$slug/assets/main.js"
 fi
done
for name in "assets/ksh-four-products-v2.css" "assets/ksh-four-products-v2.js" "assets/fliskonkurrenten-logo.png" "produkter/index.html";do
 if [[ -f "$ROOT/$name" ]];then
  mkdir -p "$BACKUP/$(dirname "$name")"
  cp -a "$ROOT/$name" "$BACKUP/$name"
 fi
done
mkdir -p "$ROOT/assets" "$ROOT/produkter"
cp "$TMP/shared.css" "$ROOT/assets/ksh-four-products-v2.css.new"
cp "$TMP/shared.js" "$ROOT/assets/ksh-four-products-v2.js.new"
cp "$TMP/ksh-logo.png" "$ROOT/assets/fliskonkurrenten-logo.png.new"
cp "$TMP/produkter/index.html" "$ROOT/produkter/index.html.new"
for f in "$ROOT/assets/ksh-four-products-v2.css" "$ROOT/assets/ksh-four-products-v2.js" "$ROOT/assets/fliskonkurrenten-logo.png" "$ROOT/produkter/index.html";do
 chmod 0644 "$f.new";mv -f "$f.new" "$f"
done
python3 - "$ROOT" <<'PY'
from pathlib import Path
import re,sys
root=Path(sys.argv[1])
css='<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/ksh-four-products-v2.css?v=2">'
js='<script defer src="/ksh/fliskonkurrenten/assets/ksh-four-products-v2.js?v=2"></script>'
paths=[root/'index.html']
paths += [root/'produkt'/x/'index.html' for x in ('sanipro-sense','vedum-flow-takegronn','zup-spilepanel-eik-sort','colorker-althea-sand-dekor')]
for p in paths:
 html=p.read_text(encoding='utf-8')
 # Disable the old camera-only AR button in already deployed Sense pages too.
 if p.parent.name=='sanipro-sense':
  html=re.sub(r' ar\s+ar-modes=["\'][^"\']*["\']','',html,flags=re.I)
  html=re.sub(r'<button\b[^>]*slot=["\']ar-button["\'][^>]*>.*?</button>','',html,flags=re.I|re.S)
 html=re.sub(r'<link\b[^>]*href=["\'][^"\']*ksh-four-products-v2\.css[^"\']*["\'][^>]*>', '',html,flags=re.I)
 html=re.sub(r'<script\b[^>]*src=["\'][^"\']*ksh-four-products-v2\.js[^"\']*["\'][^>]*>\s*</script>', '',html,flags=re.I)
 assert len(re.findall('</head>',html,re.I))==1,p
 html=re.sub('</head>',css+js+'</head>',html,count=1,flags=re.I)
 assert html.count('ksh-four-products-v2.css')==1
 assert html.count('ksh-four-products-v2.js')==1
 staged=p.with_name(p.name+'.new')
 staged.write_text(html,encoding='utf-8')
 staged.chmod(p.stat().st_mode & 0o777)
 staged.replace(p)
for slug in ('vedum-flow-takegronn','zup-spilepanel-eik-sort','colorker-althea-sand-dekor'):
 jsfile=root/'produkt'/slug/'assets/main.js'
 if not jsfile.is_file():continue
 script=jsfile.read_text(encoding='utf-8')
 # Remove old AR elements from the JS-generated HTML, preventing camera launch.
 script=re.sub(r' ar\s+ar-modes=["\'][^"\']*["\']','',script,flags=re.I)
 script=re.sub(r'<button\b[^>]*slot=["\']ar-button["\'][^>]*>.*?</button>','',script,flags=re.I|re.S)
 staged=jsfile.with_name('main.js.new')
 staged.write_text(script,encoding='utf-8')
 staged.chmod(jsfile.stat().st_mode & 0o777)
 staged.replace(jsfile)
print('Four product pages and proposal homepage upgraded; camera-only AR controls disabled.')
PY
echo "=== PUBLISHED ==="
echo "https://setai.no/ksh/fliskonkurrenten/"
echo "https://setai.no/ksh/fliskonkurrenten/produkter/"
for slug in sanipro-sense vedum-flow-takegronn zup-spilepanel-eik-sort colorker-althea-sand-dekor;do
 echo "https://setai.no/ksh/fliskonkurrenten/produkt/$slug/"
done
echo "Backups: $BACKUP"
