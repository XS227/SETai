#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-/var/www/setai/ksh/fliskonkurrenten}"
RAW="https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-bathroom-v11-1"
[[ -f "$ROOT/showroom/index.html" && -f "$ROOT/assets/bathroom-v11/room.js" ]] || { echo "KSH showroom v10 is required. No changes made." >&2;exit 2; }
for cmd in curl python3 node;do command -v "$cmd" >/dev/null || { echo "Missing dependency $cmd";exit 2; };done
TMP="$(mktemp -d)";trap 'rm -rf "$TMP"' EXIT
for f in room.js room.css layout.js apply.py;do
 curl -fsSL --retry 3 --max-time 55 "$RAW/$f" -o "$TMP/$f"
 test -s "$TMP/$f" || { echo "Empty asset $f";exit 2; }
done
python3 - "$TMP" <<'PY'
import ast,sys
from pathlib import Path
p=Path(sys.argv[1])
ast.parse((p/'apply.py').read_text())
js=(p/'room.js').read_text()
css=(p/'room.css').read_text()
layout=(p/'layout.js').read_text()
for mark in ['requestFullscreen','exitFullscreen','sr11-faux-fullscreen','sr11-brightness','sr11-temperature',
             'setView(preset)','fullscreenchange','focus(key)','installWallSurface','Fjern alle produkter']:
 assert mark in js,mark
for mark in ['.sr11-fullscreen','.sr11-light-setting','.sr11-views','.sr11-faux-fullscreen','max-width:430px']:
 assert mark in css,mark
assert 'surfacePlan' in layout and 'orderPieces' in layout
assert "localStorage.setItem('ksh-bathroom-v6'" in js
assert 'renderer.applyLighting(state)' in js
assert 'document.body.append(stage)' in js
assert 'fullscreenPlaceholder.parentNode.insertBefore(stage,fullscreenPlaceholder)' in js
assert 'distance*1.35' in js
assert 'renderer.setView(view)' in js
print('PASS KSH v11.1 static feature and CSS checks')
PY
cp "$TMP/room.js" "$TMP/room.mjs"
cp "$TMP/layout.js" "$TMP/layout.mjs"
node --check "$TMP/room.mjs"
node --check "$TMP/layout.mjs"
node --input-type=module - "$TMP/layout.mjs" <<'JS'
import {pathToFileURL} from 'node:url';
const {surfacePlan,quote}=await import(pathToFileURL(process.argv[2]).href);
const s={width:3.8,length:3.4,height:2.8,waste:10};
const al=surfacePlan('althea',s),zu=surfacePlan('zup',s);
if(al.orderPieces!==20||zu.columns!==7)throw Error('v10 wall materials changed');
const C={totals:()=>({floorCost:0}),unitPrice:()=>0};
const empty=quote(C,s,{sense:false,vedum:false,zup:false,althea:false,stone:false});
if(empty.total!==0)throw Error('Empty room estimate changed');
console.log('PASS existing wall quantities, no-floor and pricing regression');
JS
BACKUP="/var/backups/setaei/ksh-bathroom-v11-1-$(date +%Y%m%d-%H%M%S)-$$"
python3 "$TMP/apply.py" "$ROOT" "$TMP" "$BACKUP"
echo "READY: https://setai.no/ksh/fliskonkurrenten/showroom/?v=11"
