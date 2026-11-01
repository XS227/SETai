#!/usr/bin/env bash
set -euo pipefail
ROOT="/var/www/setai/ksh/fliskonkurrenten"
if [ "$#" -gt 0 ];then ROOT="$1";fi
RAW="https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-bathroom-v10"
test -f "$ROOT/showroom/index.html" || { echo "Showroom missing";exit 2; }
for name in python3 curl node;do command -v "$name" >/dev/null || { echo "Missing $name";exit 2;};done
TEMP="$(mktemp -d)";trap 'rm -rf "$TEMP"' EXIT
for f in room.js layout.js room.css apply.py;do
 curl -fsSL --retry 3 --max-time 50 "$RAW/$f" -o "$TEMP/$f";test -s "$TEMP/$f"
done
python3 - "$TEMP" <<'PY'
from pathlib import Path
import ast,sys
root=Path(sys.argv[1])
ast.parse((root/'apply.py').read_text())
room=(root/'room.js').read_text()
layout=(root/'layout.js').read_text()
css=(root/'room.css').read_text()
assert 'wallSurface(state).surfaces' in room
assert 'focusProduct(key)' in room
assert "tileWall" in room
assert "enabled.althea" in room
assert "room.width*room.height" not in layout or "export function wallSurface" in layout
assert 'max-width:1180px' in css and 'sr5-drawer' in css
PY
cp "$TEMP/room.js" "$TEMP/room.mjs"
cp "$TEMP/layout.js" "$TEMP/layout.mjs"
node --check "$TEMP/room.mjs"
node --check "$TEMP/layout.mjs"
ROOT_FOR_JS="$ROOT" TEMP_FOR_JS="$TEMP" node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const C=require(process.env.ROOT_FOR_JS+'/../assets/ksh-v6/room-data.js');
C.materials.none={name:'Ingen gulvbelegg',size:[1,1],pack:null,price:0,image:'cemento.jpg'};
const m=await import(pathToFileURL(process.env.TEMP_FOR_JS+'/layout.mjs').href);
const room={...C.defaults(),floor:'none',items:[],width:3.8,length:3.4,height:2.8,tileWall:'back'};
const empty=m.quote(C,room,{sense:false,vedum:false,zup:false,althea:false,stone:false});
assert.equal(empty.total,0);
const tiled=m.quote(C,room,{sense:false,vedum:false,zup:false,althea:true,stone:false});
assert.ok(Math.abs(m.wallSurface(room).area-10.64)<1e-8);
assert.equal(tiled.lines.length,1);assert.equal(tiled.lines[0].price,Math.round(11.70*1299));
assert.equal(tiled.total,tiled.lines[0].price);
assert.equal(tiled.lines[0].qty,m.wallSurface(room).estimatedTiles);
const two=m.quote(C,{...room,tileWall:'both'},{sense:false,althea:true,zup:false,vedum:false,stone:false});
assert.ok(two.total>tiled.total);
const panels=m.quote(C,room,{sense:false,althea:false,zup:true,vedum:false,stone:false});
assert.equal(panels.lines[0].qty,Math.ceil(room.length/.6));
assert.equal(panels.total,panels.lines[0].qty*1999);
console.log('PASS: full-wall m² pricing, no-floor 0kr, two-wall quote, real spilepanel quantities');
JS
BACKUP="/var/backups/setaei/ksh-bathroom-v10-$(date +%Y%m%d-%H%M%S)-$$"
sudo -n python3 "$TEMP/apply.py" "$ROOT" "$TEMP" "$BACKUP"
echo "LIVE: https://setai.no/ksh/fliskonkurrenten/showroom/"
