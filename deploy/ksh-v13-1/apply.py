#!/usr/bin/env python3
"""KSH v13.1: embed live showroom into Vedum landing; replace unrelated category images."""
from pathlib import Path
import shutil,sys,json,re,subprocess
root,tmp,backup=map(Path,sys.argv[1:])
files={
 root/'assets/ksh-v13-1/studio.js':tmp/'studio.js',
 root/'assets/ksh-v13-1/studio.css':tmp/'studio.css',
}
for src in files.values():assert src.is_file() and src.stat().st_size>100
catroot=root/'kategorier'
catalog=json.loads((catroot/'catalog.json').read_text(encoding='utf-8'))
groups={g['slug']:g for g in catalog['groups']}
assert len(groups)==9
# Use actual category-relevant photography instead of a fallback bathroom tile image.
realphotos={
 'benkeplater-reference.webp':root/'produkt/vedum-flow-takegronn/assets/hero.webp',
 'vaskerom-reference.webp':catroot/'assets/baderomsinnredning.webp',
 'verktoy-reference.webp':catroot/'assets/stop-avretting-utvalg.webp',
 'naturstein-reference.webp':catroot/'assets/skifer.webp'
}
for name,src in realphotos.items():
 assert src.is_file() and src.stat().st_size>12000,src
 files[catroot/'assets'/name]=src
# All source images remain illustrative, not wrongly presented as a specific slab.
for g in catalog['groups']:
 if g['slug']=='benkeplater':
  g['image']='assets/benkeplater-reference.webp'
  for c in g['categories']:
   c['image']='assets/benkeplater-reference.webp'
   c['photo_note']='Illustrasjonsbilde av en reell komposittstein-benkeplate; ikke produktfoto for dette undermerket'
 elif g['slug']=='vaskerom':
  g['image']='assets/vaskerom-reference.webp'
  for c in g['categories']:
   c['image']='assets/vaskerom-reference.webp'
   c['photo_note']='Illustrasjonsbilde av innredning fra butikkens sortiment'
 elif g['slug']=='tilbehor':
  for c in g['categories']:
   if c['slug']=='verktoy':
    c['image']='assets/verktoy-reference.webp'
    c['photo_note']='Illustrasjonsbilde av produkter for underlag og montering'
 elif g['slug']=='naturstein':
  for c in g['categories']:
   if c['slug']=='torrmur':
    c['image']='assets/naturstein-reference.webp'
    c['photo_note']='Natursteinsreferanse fra samme sortiment'
files[catroot/'catalog.json']=json.dumps(catalog,ensure_ascii=False,indent=2).encode('utf-8')
script='<script defer src="/ksh/fliskonkurrenten/assets/ksh-v13-1/studio.js?v=13.1"></script>'
css='<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/ksh-v13-1/studio.css?v=13.1">'
for path in [root/'showroom/index.html',root/'produkt/vedum-flow-takegronn/index.html']:
 text=path.read_text(encoding='utf-8')
 text=re.sub(r'<script\b[^>]*src=["\'][^"\']*ksh-v13-1/studio\.js[^"\']*["\'][^>]*>\s*</script>','',text,flags=re.I)
 text=re.sub(r'<link\b[^>]*href=["\'][^"\']*ksh-v13-1/studio\.css[^"\']*["\'][^>]*>','',text,flags=re.I)
 assert text.lower().count('</head>')==1
 text=re.sub('</head>',css+script+'</head>',text,count=1,flags=re.I)
 files[path]=text.encode('utf-8')
# Verify source JS in server's Node before altering the live page.
subprocess.run(['node','--check',str(tmp/'studio.js')],check=True,timeout=12)
backup.mkdir(parents=True,exist_ok=False)
created=[]
for dest in files:
 rel=dest.relative_to(root)
 if dest.exists():
  b=backup/rel;b.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(dest,b)
 else:created.append(str(rel))
(backup/'created.json').write_text(json.dumps(created,indent=2))
done=[]
try:
 for dest,src in files.items():
  data=src.read_bytes() if isinstance(src,Path) else src
  dest.parent.mkdir(parents=True,exist_ok=True)
  staging=dest.with_name(dest.name+'.ksh131.tmp')
  staging.write_bytes(data);staging.chmod((dest.stat().st_mode & 0o777) if dest.exists() else 0o644)
  staging.replace(dest);done.append(dest)
except BaseException:
 for dest in reversed(done):
  old=backup/dest.relative_to(root)
  if old.exists():shutil.copy2(old,dest)
  else:dest.unlink(missing_ok=True)
 raise
print('PUBLISHED KSH v13.1',len(done),'assets/pages')
print('Product landing: LIVE SAME ROOM 3D as first tab; standalone 360° remains optional')
print('Category banners: corrected countertops, utility room, tools and dry-stone illustrative photos')
print('BACKUP:',backup)
