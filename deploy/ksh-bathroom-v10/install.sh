#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-/var/www/setai/ksh/fliskonkurrenten}"
RAW="https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-bathroom-v10"
[[ -f "$ROOT/showroom/index.html" && -f "$ROOT/assets/bathroom-v9/room.js" ]] || { echo "KSH v9 not installed. No files changed";exit 2; }
TMP=$(mktemp -d);trap 'rm -rf "$TMP"' EXIT
for file in room.js room.css layout.js apply.py;do
 curl -fsSL --retry 3 --max-time 55 "$RAW/$file" -o "$TMP/$file"
 test -s "$TMP/$file"
done
python3 - "$TMP" <<'PY'
import ast,sys
from pathlib import Path
p=Path(sys.argv[1])
ast.parse((p/'apply.py').read_text())
room=(p/'room.js').read_text()
layout=(p/'layout.js').read_text()
css=(p/'room.css').read_text()
for signature in ('installWallSurface','InstancedMesh','focus(key)','sr10-compact','sr10-focus'):
 assert signature in room,signature
assert 'surfacePlan' in layout and 'orderPieces' in layout
assert '.sr10-compact .sr5-drawer' in css
PY
if command -v node >/dev/null;then
 cp "$TMP/room.js" "$TMP/room.mjs"
 cp "$TMP/layout.js" "$TMP/layout.mjs"
 node --check "$TMP/room.mjs"
 node --check "$TMP/layout.mjs"
 node --input-type=module - "$TMP/layout.mjs" <<'JS'
import {pathToFileURL} from 'node:url';
const {surfacePlan,quote}=await import(pathToFileURL(process.argv[2]).href);
const s={width:3.8,length:3.4,height:2.8,waste:10};
const al=surfacePlan('althea',s),zu=surfacePlan('zup',s);
if(al.columns!==6||al.rows!==3||al.orderPieces!==20)throw Error('Althea calculated quantities incorrect');
if(zu.columns!==7||zu.rows!==1)throw Error('Z-UP calculated quantities incorrect');
const data={materials:{none:{price:0}},totals:()=>({floorCost:0}),unitPrice:()=>0};
const bill=quote(data,s,{sense:false,vedum:false,zup:false,althea:true,stone:false});
if(Math.abs(bill.total-al.orderPieces*.595*1.192*1299)>.1)throw Error('Calculated wall total incorrect');
console.log('PASS: Althea 18 installed tiles / 20 with waste, Z-UP 7 wall panels, calculated sum');
JS
fi
BACKUP="/var/backups/setaei/ksh-bathroom-v10-$(date +%Y%m%d-%H%M%S)-$$"
python3 "$TMP/apply.py" "$ROOT" "$TMP" "$BACKUP"
