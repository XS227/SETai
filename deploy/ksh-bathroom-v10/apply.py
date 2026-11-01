#!/usr/bin/env python3
"""Scoped, atomic and rollback-safe KSH Fliskonkurrenten v10 deployment."""
from pathlib import Path
import json,shutil,sys
root,temp,backup=map(Path,sys.argv[1:])
assert (root/'showroom/index.html').is_file()
assert (root/'assets/sense-film-v4/landing.js').is_file()
assert (root/'produkt/sanipro-sense/index.html').is_file()
assert (root/'produkt/colorker-althea-sand-dekor/assets/detail.webp').is_file()
assert (root/'produkt/zup-spilepanel-eik-sort/assets/model-yup-v6.glb').is_file()

changes={}
for name in ('room.js','layout.js','room.css'):
 path=root/'assets/bathroom-v10'/name
 changes[path]=(temp/name).read_bytes()

def rewrite(path,patterns):
 content=changes.get(path,path.read_bytes()).decode('utf-8')
 for old,new in patterns:
  if content.count(old)==1:content=content.replace(old,new,1)
  elif content.count(new)==1:pass # rerunnable
  else:raise SystemExit(f'Unexpected {old} reference in {path}; no files modified')
 changes[path]=content.encode('utf-8')

rewrite(root/'showroom/index.html',[
 ('/assets/bathroom-v9/room.js?v=9','/assets/bathroom-v10/room.js?v=10'),
 ('/assets/bathroom-v9/room.css?v=9','/assets/bathroom-v10/room.css?v=10')])
rewrite(root/'produkt/sanipro-sense/index.html',[
 ('/assets/bathroom-v9/room.css?v=9','/assets/bathroom-v10/room.css?v=10')])
rewrite(root/'assets/sense-film-v4/landing.js',[
 ('/assets/bathroom-v9/room.js?v=9','/assets/bathroom-v10/room.js?v=10')])

backup.mkdir(parents=True,exist_ok=False)
created=[]
for dst in changes:
 rel=dst.relative_to(root)
 if dst.exists():
  prior=backup/rel;prior.parent.mkdir(parents=True,exist_ok=True)
  shutil.copy2(dst,prior)
 else:created.append(str(rel))
(backup/'created.json').write_text(json.dumps(created,indent=2))
written=[]
try:
 for dst,data in changes.items():
  dst.parent.mkdir(parents=True,exist_ok=True)
  staged=dst.with_name(dst.name+'.ksh10.tmp')
  staged.write_bytes(data)
  staged.chmod((dst.stat().st_mode&0o777) if dst.exists() else 0o644)
  staged.replace(dst);written.append(dst)
except BaseException:
 for dst in reversed(written):
  old=backup/dst.relative_to(root)
  if old.exists():shutil.copy2(old,dst)
  else:dst.unlink(missing_ok=True)
 raise
print(f'PUBLISHED KSH v10: {len(written)} files. Backup: {backup}')
print('Tiles: true wall coverage with 3mm joints and m² quote; product-specific camera focus; Fold/mobile bottom sheet.')
