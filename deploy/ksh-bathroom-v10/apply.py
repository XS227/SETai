#!/usr/bin/env python3
"""KSH v10 atomic installation. No other customer sites touched."""
from pathlib import Path
import sys,shutil,json
root,tmp,backup=map(Path,sys.argv[1:])
changes={
 root/'assets/bathroom-v10/room.js':(tmp/'room.js').read_bytes(),
 root/'assets/bathroom-v10/layout.js':(tmp/'layout.js').read_bytes(),
 root/'assets/bathroom-v10/room.css':(tmp/'room.css').read_bytes()
}
refs={
 root/'showroom/index.html':[
 ('/assets/bathroom-v9/room.js?v=9','/assets/bathroom-v10/room.js?v=10'),
 ('/assets/bathroom-v9/room.css?v=9','/assets/bathroom-v10/room.css?v=10')
 ],
 root/'produkt/sanipro-sense/index.html':[
 ('/assets/bathroom-v9/room.css?v=9','/assets/bathroom-v10/room.css?v=10')
 ],
 root/'assets/sense-film-v4/landing.js':[
 ('/assets/bathroom-v9/room.js?v=9','/assets/bathroom-v10/room.js?v=10')
 ]
}
for p,edits in refs.items():
 text=p.read_text(encoding='utf-8')
 for old,new in edits:
  if text.count(old)==1:text=text.replace(old,new)
  elif text.count(new)==1:pass
  else:raise ValueError('Missing unique version reference in '+str(p)+': '+old)
 changes[p]=text.encode('utf-8')
for product in ('sanipro-sense','vedum-flow-takegronn','zup-spilepanel-eik-sort','colorker-althea-sand-dekor'):
 assert (root/'produkt'/product/'index.html').is_file(), product
assert len(changes)==6
backup.mkdir(parents=True,exist_ok=False)
new=[]
for path in changes:
 if path.exists():
  target=backup/path.relative_to(root)
  target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,target)
 else:new.append(str(path.relative_to(root)))
(backup/'new_files.json').write_text(json.dumps(new,indent=2))
written=[]
try:
 for p,raw in changes.items():
  p.parent.mkdir(parents=True,exist_ok=True)
  temp=p.with_suffix(p.suffix+'.new')
  temp.write_bytes(raw)
  temp.chmod((p.stat().st_mode&0o777) if p.exists() else 0o644)
  temp.replace(p);written.append(p)
except BaseException:
 for p in written[::-1]:
  prior=backup/p.relative_to(root)
  if prior.exists():shutil.copy2(prior,p)
  else:p.unlink(missing_ok=True)
 raise
print('PUBLISHED V10: tile-wall installation, dynamic piece pricing, product camera focusing and Fold panel')
print('AFFECTED',len(changes),'BACKUP',backup)
print('TEST https://setai.no/ksh/fliskonkurrenten/showroom/?v10')
