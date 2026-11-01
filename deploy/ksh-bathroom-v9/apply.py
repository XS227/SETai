#!/usr/bin/env python3
"""Safely stage and deploy Vedum v9 textured GLB and removable showroom floor."""
from pathlib import Path
import sys,shutil,json
root,tmp,backup=map(Path,sys.argv[1:])
files={
 root/'assets/bathroom-v9/room.js':tmp/'room.js',
 root/'assets/bathroom-v9/layout.js':tmp/'layout.js',
 root/'assets/bathroom-v9/room.css':tmp/'room.css',
 root/'assets/bathroom-v9/turbine-grey.jpg':tmp/'turbine-grey.jpg',
 root/'produkt/vedum-flow-takegronn/assets/model-turbine-v9.glb':tmp/'model-turbine-v9.glb'
}
changes={path:src.read_bytes() for path,src in files.items()}
def substitute(path,old,new):
 text=changes.get(path,path.read_bytes()).decode('utf-8')
 if text.count(old)==1:out=text.replace(old,new,1)
 elif text.count(new)==1:out=text
 else:raise SystemExit('Expected exactly one reference in '+str(path)+': '+old)
 changes[path]=out.encode('utf-8')
substitute(root/'showroom/index.html','/assets/bathroom-v8/room.js?v=8','/assets/bathroom-v9/room.js?v=9')
substitute(root/'showroom/index.html','/assets/bathroom-v8/room.css?v=8','/assets/bathroom-v9/room.css?v=9')
substitute(root/'produkt/sanipro-sense/index.html','/assets/bathroom-v8/room.css?v=8','/assets/bathroom-v9/room.css?v=9')
substitute(root/'assets/sense-film-v4/landing.js','/assets/bathroom-v8/room.js?v=8','/assets/bathroom-v9/room.js?v=9')
substitute(root/'produkt/vedum-flow-takegronn/assets/main.js','./assets/model.glb','./assets/model-turbine-v9.glb')
# Source material image is copied unmodified from the manufacturer's publicly visible swatch.
# Preserve original source meshes and older files for rollback, never overwrite them.
assert (root/'produkt/vedum-flow-takegronn/assets/model-yup-v6.glb').is_file()
assert (root/'produkt/vedum-flow-takegronn/index.html').is_file()
backup.mkdir(parents=True,exist_ok=False)
created=[]
for p in changes:
 rel=p.relative_to(root)
 if p.exists():
  q=backup/rel;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q)
 else:created.append(str(rel))
(backup/'created.json').write_text(json.dumps(created,indent=2))
written=[]
try:
 for p,raw in changes.items():
  p.parent.mkdir(parents=True,exist_ok=True)
  tmp_path=p.with_name(p.name+'.ksh9.tmp')
  tmp_path.write_bytes(raw);tmp_path.chmod((p.stat().st_mode&0o777) if p.exists() else 0o644)
  tmp_path.replace(p);written.append(p)
except BaseException:
 for p in reversed(written):
  prior=backup/p.relative_to(root)
  if prior.exists():shutil.copy2(prior,p)
  else:p.unlink(missing_ok=True)
 raise
print('KSH V9 LIVE:',len(written),'files. BACKUP:',backup)
print('MATERIAL: manufacturer Vedum Turbine Grey photo baked into new GLB')
print('FLOOR: click selected floor again to remove; select Ingen gulvbelegg to clear price')
