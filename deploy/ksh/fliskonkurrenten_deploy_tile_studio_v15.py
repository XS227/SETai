#!/usr/bin/env python3
"""Publish tile studio v15 on authorized SETAEI KSH preview.
No WooCommerce mutation. No invented 3D models or quoted prices."""
from pathlib import Path
from datetime import datetime,timezone
import urllib.request, shutil, json, html
root=Path('/var/www/setai/ksh/fliskonkurrenten')
stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
def safe_write(path,new):
 old=path.read_text() if path.exists() else None
 if old==new:return False
 if old is not None:shutil.copy2(path,path.with_name(path.name+'.bak.tile15-'+stamp))
 tmp=path.with_name(path.name+'.tmp.tile15')
 tmp.parent.mkdir(parents=True,exist_ok=True)
 tmp.write_text(new,encoding='utf8');tmp.chmod(0o644);tmp.replace(path)
 return True
def swap_once(s,a,b,description):
 n=s.count(a)
 if n!=1:raise RuntimeError(description+' expects one match, got '+str(n)+':'+a[:80])
 return s.replace(a,b,1)
def remote_file(url,dest):
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
 with urllib.request.urlopen(req,timeout=22) as response:
  content=response.read()
 if len(content)<300:raise RuntimeError('Missing resource '+url)
 dest.write_bytes(content);dest.chmod(0o644)
 print('ASSET',dest.name,len(content))
assets=root/'assets'
remote_file('https://raw.githubusercontent.com/XS227/SETai/0bf8c596cb97ca774ad3604ee661e9f1e8dee161/deploy/ksh/assets/tile-studio-v15.js',
            assets/'bathroom-v11-1/tile-studio-v15.js')
remote_file('https://raw.githubusercontent.com/XS227/SETai/7c4357137cc1832420fd5892f5e0886a0e39c6df/deploy/ksh/assets/tile-studio-v15.css',
            assets/'tile-studio-v15.css')
assert (assets/'tile-library-v15.js').exists()
assert (assets/'tile-previews-v15').is_dir()
allTiles=json.loads((assets/'tile-library-v15.json').read_text())['tiles']
assert len(allTiles)>=35
page=root/'showroom/index.html'
s=page.read_text()
if 'tile-library-v15.js' not in s:
 s=swap_once(s,'<script src="/ksh/assets/ksh-v6/room-data.js"></script>',
  '<script src="/ksh/assets/ksh-v6/room-data.js"></script><script src="/ksh/fliskonkurrenten/assets/tile-library-v15.js?v=15"></script>','global room data loader')
if 'tile-studio-v15.css' not in s:
 s=swap_once(s,'</head>','<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/tile-studio-v15.css?v=15"></head>','showroom css')
s=s.replace('room.js?v=14.1','room.js?v=15.0')
s=s.replace('room.js?v=13.0','room.js?v=15.0')
print('MAIN PAGE',safe_write(page,s))

sense=root/'produkt/sanipro-sense/index.html'
s=sense.read_text()
if 'tile-studio-v15.css' not in s:
 s=swap_once(s,'</head>',
  '<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/ksh-showroom-v12.css?v=14.1">'+
  '<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/tile-studio-v15.css?v=15"></head>','sense controls CSS')
if 'tile-library-v15.js' not in s:
 s=swap_once(s,'<script src="/ksh/assets/ksh-v6/room-data.js"></script>',
  '<script src="/ksh/assets/ksh-v6/room-data.js"></script><script src="/ksh/fliskonkurrenten/assets/tile-library-v15.js?v=15"></script>','sense tile library loader')
print('SENSE_PAGE',safe_write(sense,s))

loader=assets/'sense-film-v4/landing.js'
js=loader.read_text()
js=js.replace('bathroom-v11-1/room.js?v=11.1','bathroom-v11-1/room.js?v=15.0')
print('SENSE_MODULE',safe_write(loader,js))
s=sense.read_text().replace('sense-film-v4/landing.js?v=6','sense-film-v4/landing.js?v=15')
print('SENSE_MODULE_CACHE',safe_write(sense,s))

room=assets/'bathroom-v11-1/room.js'
js=room.read_text()
if 'KSH_TILE_STUDIO_V15' not in js:
 js=swap_once(js,"import {products,placement,normalizeModel,quote,surfacePlan} from './layout.js';",
   "import {products,placement,normalizeModel,quote,surfacePlan} from './layout.js';\n/* KSH_TILE_STUDIO_V15: shared active tile material chooser & recommendations. */\nimport {getTile,styleRoom,renderTilePicker,applyTileTexture} from './tile-studio-v15.js';", 'tile studio import')
 js=swap_once(js,"const shapes={room:", "const shapes={tiles:'<rect x=\"2\" y=\"2\" width=\"9\" height=\"9\" rx=\"1\"/><rect x=\"13\" y=\"2\" width=\"9\" height=\"9\" rx=\"1\"/><rect x=\"2\" y=\"13\" width=\"9\" height=\"9\" rx=\"1\"/><rect x=\"13\" y=\"13\" width=\"9\" height=\"9\" rx=\"1\"/>',room:", 'icon shape tiles')
 js=swap_once(js,"floor:'Gulv og fliser',products:'Legg til eller fjern produkt'",
   "floor:'Gulvmateriale',tiles:'Fliser – prøv på vegg eller gulv',products:'Legg til eller fjern produkt'", 'labels tiles')
 js=swap_once(js,"floor:'Gulv',products:'+ Produkt'","floor:'Gulv',tiles:'Fliser',products:'+ Produkt'",'visible tile label')
 anchor="const allKeys=['sense','vedum','zup','althea','stone'];"
 insertion="""/* Preserve tile choice and user styling across navigation, but allow a tile
   product URL to override the selected material without overwriting the room. */
state.tileId=getTile(raw?.room?.tileId)?.id||null;
state.tileSurface=raw?.room?.tileSurface==='floor'?'floor':'wall';
state.tileStyle=Number.isInteger(raw?.room?.tileStyle)?raw.room.tileStyle:0;
const tileQuery=new URLSearchParams(location.search);
const incomingTile=getTile(tileQuery.get('tile'));
if(incomingTile){
 state.tileSurface=tileQuery.get('surface')==='floor'?'floor':'wall';
 styleRoom(state,incomingTile,0);
}
"""
 js=swap_once(js,anchor,insertion+anchor,'initialize URL tile')
 js=swap_once(js,"const enabled={\n  sense:stored?raw.enabled.sense!==false:true,",
   "const enabled={\n  sense:(incomingTile&&!stored)?false:(stored?raw.enabled.sense!==false:true),",'avoid auto-adding bathtub to tile-only room')
 anchor="buildRoom(s){const empty=s.floor==='none';super.buildRoom(empty?{...s,floor:'cemento'}:s);if(empty){const plane=this.room.children.find(o=>o.geometry?.type==='PlaneGeometry');if(plane){plane.material.dispose();plane.material=new T.MeshStandardMaterial({color:'#bdbab4',roughness:1});}}}"
 js=swap_once(js,anchor,
   anchor[:-1]+"if(s.tileId&&getTile(s.tileId))applyTileTexture(T,this,s);}",'tile geometry overlay')
 js=swap_once(js,"if(name==='products'){",
   """if(name==='tiles'){
   renderTilePicker({options,state,update,renderer,close,enabled,focus:key=>renderer.focus(key),render});
   return;
  }
  if(name==='products'){""",'tile chooser UI')
 # Updating an existing tile / optional style must rebuild room even if dimensions haven't changed.
 # renderer.roomKey from source RoomRenderer only includes physical surfaces & floor, not tile.
 js=swap_once(js,"function update(){renderer.objectKey='';renderer.update(state);persist();",
   "function update(){renderer.objectKey='';renderer.roomKey='';renderer.update(state);persist();",'force rebuild when tile selected')
 print('ROOM_JS',safe_write(room,js))
else:print('ROOM_JS already patched')
print('STUDIO READY',len(allTiles),'tile photos')
