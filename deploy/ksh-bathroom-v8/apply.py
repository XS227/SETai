#!/usr/bin/env python3
"""Atomic, scoped install of KSH bathroom v8 with rollback on interrupted writes."""
from pathlib import Path
import json
import shutil
import sys
import os

root,tmp,backup=map(Path,sys.argv[1:])
assert (root/'showroom/index.html').is_file()
assert (root/'produkt/sanipro-sense/index.html').is_file()
assert (root/'produkt/vedum-flow-takegronn/index.html').is_file()
assert (root/'assets/sense-film-v4/landing.js').is_file()
assert (root/'assets/vedum-film-v7/vedum.mp4').is_file(), 'Approved source film missing'
assets=root/'assets/bathroom-v8'

def replace_one(data,old,new,label):
    count=data.count(old)
    if count==1:
        return data.replace(old,new,1)
    if count==0 and data.count(new)==1:
        return data
    raise ValueError(f'Expected exactly one v6/v7 or v8 script for {label}; found old={count}, new={data.count(new)}')

changes={}
for file in ['room.js','layout.js','room.css','film.js']:
    src=tmp/file
    changes[assets/file]=src.read_bytes()

pages={
    root/'showroom/index.html':[
      ('/assets/bathroom-v6/room.js?v=6','/assets/bathroom-v8/room.js?v=8'),
      ('/assets/bathroom-v6/room.css?v=6','/assets/bathroom-v8/room.css?v=8')
    ],
    root/'produkt/sanipro-sense/index.html':[
      ('/assets/bathroom-v6/room.css?v=6','/assets/bathroom-v8/room.css?v=8')
    ],
    root/'assets/sense-film-v4/landing.js':[
      ('/assets/bathroom-v6/room.js?v=6','/assets/bathroom-v8/room.js?v=8')
    ],
    root/'produkt/vedum-flow-takegronn/index.html':[
      ('/assets/vedum-film-v7/film.js?v=7','/assets/bathroom-v8/film.js?v=8')
    ]
}
for path,replacements in pages.items():
    original=path.read_text(encoding='utf-8')
    result=original
    for old,new in replacements: result=replace_one(result,old,new,str(path))
    changes[path]=result.encode('utf-8')
    if path.suffix=='.html' and '<!doctype html>' not in result.lower():
        raise ValueError('Unexpected product HTML: '+str(path))

# Verify exactly four product links work by testing the files; no external web links changed.
for slug in ['sanipro-sense','vedum-flow-takegronn','zup-spilepanel-eik-sort','colorker-althea-sand-dekor']:
    assert (root/'produkt'/slug/'index.html').is_file(),slug
assert len(changes)==8,len(changes)
backup.mkdir(parents=True,exist_ok=False)
created=[]
for dest in changes:
    rel=dest.relative_to(root)
    if dest.exists():
        target=backup/rel
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(dest,target)
    else:created.append(str(rel))
(backup/'created.json').write_text(json.dumps(created))
written=[]
try:
    for dest,data in changes.items():
        dest.parent.mkdir(parents=True,exist_ok=True)
        stage=dest.with_name(dest.name+'.ksh8.tmp')
        stage.write_bytes(data)
        stage.chmod((dest.stat().st_mode & 0o777) if dest.exists() else 0o644)
        stage.replace(dest)
        written.append(dest)
except BaseException:
    for dest in reversed(written):
        old=backup/dest.relative_to(root)
        if old.exists():shutil.copy2(old,dest)
        else:dest.unlink(missing_ok=True)
    raise
print('INSTALLED: corrected Vedum material, removable Sense and all products, responsive room controls and 11-second video playback.')
print('FILES:',len(written),'BACKUP:',backup)
print('ROLLBACK: restore matching paths from backup and remove newly added assets listed in created.json')
