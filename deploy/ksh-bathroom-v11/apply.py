#!/usr/bin/env python3
"""Safely install KSH Fliskonkurrenten bathroom v11 while preserving v10 and all other KSH pages."""
from pathlib import Path
import json,shutil,sys
root,temp,backup=map(Path,sys.argv[1:])
assert (root/'showroom/index.html').is_file()
assert (root/'produkt/sanipro-sense/index.html').is_file()
assert (root/'assets/sense-film-v4/landing.js').is_file()
assert (root/'assets/bathroom-v10/layout.js').is_file()
changes={}
for name in ('room.js','room.css','layout.js'):
 dest=root/'assets/bathroom-v11'/name
 changes[dest]=(temp/name).read_bytes()
refs={
 root/'showroom/index.html':[
  ('/assets/bathroom-v10/room.js?v=10','/assets/bathroom-v11/room.js?v=11'),
  ('/assets/bathroom-v10/room.css?v=10','/assets/bathroom-v11/room.css?v=11')
 ],
 root/'produkt/sanipro-sense/index.html':[
  ('/assets/bathroom-v10/room.css?v=10','/assets/bathroom-v11/room.css?v=11')
 ],
 root/'assets/sense-film-v4/landing.js':[
  ('/assets/bathroom-v10/room.js?v=10','/assets/bathroom-v11/room.js?v=11')
 ]
}
for path,changes_for_file in refs.items():
 text=path.read_text(encoding='utf-8')
 for old,new in changes_for_file:
  if text.count(old)==1:text=text.replace(old,new,1)
  elif text.count(new)==1:pass
  else:raise SystemExit(f'Missing unique reference {old} in {path} — no files modified')
 changes[path]=text.encode('utf-8')
assert len(changes)==6
backup.mkdir(parents=True,exist_ok=False)
new_paths=[]
for dest in changes:
 rel=dest.relative_to(root)
 if dest.is_file():
  old=backup/rel
  old.parent.mkdir(parents=True,exist_ok=True)
  shutil.copy2(dest,old)
 else:new_paths.append(str(rel))
(backup/'created.json').write_text(json.dumps(new_paths,indent=2))
written=[]
try:
 for path,data in changes.items():
  path.parent.mkdir(parents=True,exist_ok=True)
  stage=path.with_name(path.name+'.ksh11.tmp')
  stage.write_bytes(data)
  stage.chmod((path.stat().st_mode & 0o777) if path.exists() else 0o644)
  stage.replace(path)
  written.append(path)
except BaseException:
 for path in written[::-1]:
  old=backup/path.relative_to(root)
  if old.exists():shutil.copy2(old,path)
  else:path.unlink(missing_ok=True)
 raise
print('KSH V11 INSTALLED:',len(written),'files')
print('Full screen / light sliders / camera views')
print('Backup:',backup)
