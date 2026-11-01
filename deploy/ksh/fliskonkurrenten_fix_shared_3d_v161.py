#!/usr/bin/env python3
"""KSH v16.1 fix shared JS that previously overwrote the improved GLB models."""
from pathlib import Path
from datetime import datetime,timezone
import shutil
ROOT=Path('/var/www/setai/ksh/fliskonkurrenten')
ts=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
def update(file,original,patched):
 s=file.read_text()
 if original in s:
  shutil.copy2(file,file.with_name(file.name+'.bak.fidelity-'+ts))
  tmp=file.with_name(file.name+'.tmp.fidelity')
  tmp.write_text(s.replace(original,patched));tmp.chmod(0o644);tmp.replace(file);print('UPDATED',file)
 elif patched in s:print('ALREADY_OK',file)
 else:raise RuntimeError('Expected code not found '+str(file))
js=ROOT/'assets/ksh-four-products-v2.js'
update(js,"if(key!=='sense'&&!viewer.getAttribute('src').includes('model-yup-v6'))viewer.src=root+'produkt/'+slug+'/assets/model-yup-v6.glb';",
  "const modelName=(key==='zup'||key==='althea')?'model-material-v16.glb':'model-yup-v6.glb';if(key!=='sense'&&!viewer.getAttribute('src').includes(modelName))viewer.src=root+'produkt/'+slug+'/assets/'+modelName;")
update(js,"link.href=root+'showroom/?add='+key;",
  "link.href=key==='althea'?root+'showroom/?tile=colorker-althea-sand-dekor-595x1192&surface=wall':root+'showroom/?add='+key;")
for file in list((ROOT/'produkt').glob('*/index.html'))+[ROOT/'index.html',ROOT/'produkter/index.html']:
 if not file.exists():continue
 s=file.read_text()
 if 'ksh-four-products-v2.js?v=6' in s:
  s=s.replace('ksh-four-products-v2.js?v=6','ksh-four-products-v2.js?v=16.1')
  file.write_text(s);file.chmod(0o644);print('CACHE_BUST',file)
room=ROOT/'assets/bathroom-v11-1/room.js'
s=room.read_text()
before=s
s=s.replace("color:tile?'#b7a48c':'#292523'","color:tile?'#b7a48c':'#161719'")
s=s.replace("color:tile?'#948a7c':'#141416'","color:tile?'#948a7c':'#0b0c0d'")
s=s.replace("color:tile?'#d2c0aa':'#51463b'","color:tile?'#d2c0aa':'#393c40'")
if s!=before:
 shutil.copy2(room,room.with_name('room.js.bak.fidelity-'+ts))
 tmp=room.with_name('room.js.tmp.fidelity');tmp.write_text(s);tmp.chmod(0o644);tmp.replace(room)
 print('SHOWROOM ZUP DARK TONE')
for file in (ROOT/'showroom/index.html',ROOT/'produkt/sanipro-sense/index.html'):
 content=file.read_text()
 before=content
 content=content.replace('room.js?v=14.1','room.js?v=16.1')
 content=content.replace('landing.js?v=15','landing.js?v=16.1')
 if content!=before:file.write_text(content);file.chmod(0o644)
landing=ROOT/'assets/sense-film-v4/landing.js'
content=landing.read_text()
if 'room.js?v=15' in content:landing.write_text(content.replace('room.js?v=15','room.js?v=16.1'))
print('DONE')
