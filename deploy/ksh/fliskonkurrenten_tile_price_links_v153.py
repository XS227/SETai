#!/usr/bin/env python3
"""Final pass: accurate unpriced subtotal and tile preview links on original item landing demos."""
from pathlib import Path
import json,shutil
from datetime import datetime,timezone
base=Path('/var/www/setai/ksh/fliskonkurrenten')
stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
room=base/'assets/bathroom-v11-1/room.js'
s=room.read_text()
old="document.querySelector('#sr5-total').textContent=money(q.total);"
new="document.querySelector('#sr5-total').textContent=(q.missing && q.total===0)?'Ikke priset':money(q.total);"
if old in s:
 s=s.replace(old,new,1)
 s=s.replace("'Rommet er tomt. Trykk «+ Produkt» for å legge inn et produkt.'",
             "(state.tileId?'Valgt flis: '+(getTile(state.tileId)?.name||'materialprøve')+' · Åpne «Fliser» for anbefalte kombinasjoner.':'Rommet er tomt. Trykk «+ Produkt» for å legge inn et produkt.')",1)
 shutil.copy2(room,room.with_name('room.js.bak.pricefix-'+stamp))
 tmp=room.with_name('room.js.tmp.pricefix');tmp.write_text(s);tmp.chmod(0o644);tmp.replace(room)
 print('ROOM_TOTAL_FIXED')
entries=json.loads((base/'assets/tile-library-v15.json').read_text())['tiles']
matched=0
for t in entries:
 p=base/'vare'/t['id']/'index.html'
 if not p.is_file():continue
 s=p.read_text()
 if 'tile-preview-v15-cta' in s:continue
 tag='<div class="sp-detail-actions">'
 add='<div class="tile-preview-v15-cta" style="margin:17px 0"><a href="/ksh/fliskonkurrenten/showroom/?tile='+t['id']+'&surface=wall#reisen" style="display:inline-block;background:#a87957;color:white;text-decoration:none;padding:14px 19px;font-size:12px;font-weight:bold">Prøv denne flisen på vegg eller gulv ↗</a><p style="font-size:11px">Visuell materialprøve basert på produktfoto, ikke en 3D-skanning.</p></div>'
 if tag in s:
  s=s.replace(tag,add+tag,1);p.write_text(s);p.chmod(0o644);matched+=1
print('EXISTING_PRODUCT_LINKS',matched)
roomMain=base/'showroom/index.html'
s=roomMain.read_text().replace('room.js?v=15.2','room.js?v=15.3');roomMain.write_text(s);roomMain.chmod(0o644)
senseModule=base/'assets/sense-film-v4/landing.js'
s=senseModule.read_text().replace('room.js?v=15.2','room.js?v=15.3');senseModule.write_text(s);senseModule.chmod(0o644)
sense=base/'produkt/sanipro-sense/index.html'
s=sense.read_text().replace('landing.js?v=15.2','landing.js?v=15.3');sense.write_text(s);sense.chmod(0o644)
