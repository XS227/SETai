#!/usr/bin/env python3
"""KSH Fliskonkurrenten v12: isolated mobile/editorial layout and correct Z-UP product image."""
from pathlib import Path
import json,shutil,sys
root,tmp,backup=map(Path,sys.argv[1:])
slugs=('sanipro-sense','vedum-flow-takegronn','zup-spilepanel-eik-sort','colorker-althea-sand-dekor')
pages=[root/'index.html',root/'produkter/index.html',root/'showroom/index.html']
pages += [root/'produkt'/slug/'index.html' for slug in slugs]
for page in pages:assert page.is_file(),str(page)
for f in ['ux.css','ux.js','zup-eik-sort-600066.jpg']:assert (tmp/f).is_file(),f
assert (root/'produkt/zup-spilepanel-eik-sort/assets/hero.webp').is_file()
assert (root/'produkt/zup-spilepanel-eik-sort/assets/detail.webp').is_file()
new_css='<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/ksh-ux-v12.css?v=12">'
new_js='<script defer src="/ksh/fliskonkurrenten/assets/ksh-ux-v12.js?v=12"></script>'
changes={
 root/'assets/ksh-ux-v12.css':(tmp/'ux.css').read_bytes(),
 root/'assets/ksh-ux-v12.js':(tmp/'ux.js').read_bytes(),
 root/'produkt/zup-spilepanel-eik-sort/assets/zup-eik-sort-600066.jpg':(tmp/'zup-eik-sort-600066.jpg').read_bytes()
}
for path in pages:
 html=path.read_text(encoding='utf-8')
 assert html.lower().count('</head>')==1,path
 # Keep re-deployment safe: do not accumulate duplicate asset includes.
 import re
 html=re.sub(r'<link\b[^>]*href=["\'][^"\']*ksh-ux-v12\.css[^"\']*["\'][^>]*>', '',html,flags=re.I)
 html=re.sub(r'<script\b[^>]*src=["\'][^"\']*ksh-ux-v12\.js[^"\']*["\'][^>]*>\s*</script>', '',html,flags=re.I)
 html=re.sub('</head>',new_css+new_js+'</head>',html,count=1,flags=re.I)
 if 'zup-spilepanel-eik-sort' in str(path) and path.name=='index.html':
  html=html.replace('data-ksh-product="zup"','')
  html=html.replace('data-ksh-brand="fliskonkurrenten"','data-ksh-brand="fliskonkurrenten" data-ksh-product="zup"',1)
  assert 'data-ksh-product="zup"' in html
 assert html.count('ksh-ux-v12.css')==1
 assert html.count('ksh-ux-v12.js')==1
 changes[path]=html.encode('utf-8')
backup.mkdir(parents=True,exist_ok=False)
created=[]
for target in changes:
 relative=target.relative_to(root)
 if target.is_file():
  dest=backup/relative;dest.parent.mkdir(parents=True,exist_ok=True)
  shutil.copy2(target,dest)
 else:created.append(str(relative))
(backup/'new_files.json').write_text(json.dumps(created,indent=2))
written=[]
try:
 for dest,data in changes.items():
  dest.parent.mkdir(parents=True,exist_ok=True)
  staging=dest.with_name(dest.name+'.ksh12.tmp')
  staging.write_bytes(data)
  staging.chmod((dest.stat().st_mode&0o777) if dest.is_file() else 0o644)
  staging.replace(dest)
  written.append(dest)
except BaseException:
 for dest in written[::-1]:
  prior=backup/dest.relative_to(root)
  if prior.is_file():shutil.copy2(prior,dest)
  else:dest.unlink(missing_ok=True)
 raise
print('PUBLISHED KSH UX v12:',len(changes),'files')
print('MOBILE: responsive cinematic layouts and compact showroom popovers')
print('Z-UP: manufacturer-sourced product 600066 photograph, not mounting screw')
print('BACKUP:',backup)
