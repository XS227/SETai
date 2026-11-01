#!/usr/bin/env python3
"""KSH follow-up: bypass cached room-photo textures and make Sense product appear."""
from pathlib import Path
from datetime import datetime,timezone
import shutil
root=Path('/var/www/setai/ksh/fliskonkurrenten')
room=root/'assets/bathroom-v11-1/room.js'
studio=root/'assets/bathroom-v11-1/tile-studio-v15.js'
landing=root/'assets/sense-film-v4/landing.js'
pages=[root/'showroom/index.html',root/'produkt/sanipro-sense/index.html']
def change(path,transform):
 src=path.read_text()
 dst=transform(src)
 if src==dst:return False
 shutil.copy2(path,path.with_name(path.name+'.bak.tilefix-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')))
 tmp=path.with_name(path.name+'.tmp.tilefix');tmp.write_text(dst,encoding='utf8');tmp.chmod(0o644);tmp.replace(path);return True
def jsfix(s):
 if 'SENSE_DEFAULT_PRODUCT_V152' not in s:
  match=" const enabled={"
  if match not in s:match="const enabled={"
  # Insert just after enabled object, which is immediately followed by the user-choice comment
  seq="};\n// First launch from a product page"
  assert s.count(seq)==1
  s=s.replace(seq,"};\n/* SENSE_DEFAULT_PRODUCT_V152: keep Sense in its own landing demo, while retaining customer-selected tiles. */\nif(location.pathname.includes('/produkt/sanipro-sense/')&&!incomingTile)enabled.sense=true;\n// First launch from a product page",1)
 return s.replace("from './tile-studio-v15.js'","from './tile-studio-v15.js?v=15.2'")
def texfix(s):
 return s.replace("new T.TextureLoader().load(tile.texture,","new T.TextureLoader().load(tile.texture+'?v=15.2',")
print('ROOM',change(room,jsfix))
print('TEX',change(studio,texfix))
print('LANDING',change(landing,lambda s:s.replace('room.js?v=15.0','room.js?v=15.2')))
for p in pages:
 print('PAGE',p,change(p,lambda s:s.replace('room.js?v=15.0','room.js?v=15.2').replace('landing.js?v=15','landing.js?v=15.2')))
