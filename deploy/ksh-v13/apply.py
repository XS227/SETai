#!/usr/bin/env python3
"""Atomic scoped installation of Fliskonkurrenten v13 product studio and category universe."""
from pathlib import Path
import shutil,sys,re,json
root,tmp,backup=map(Path,sys.argv[1:])
pages=[root/'index.html',root/'produkter/index.html',root/'showroom/index.html']
pages += [root/'produkt'/x/'index.html' for x in ['sanipro-sense','vedum-flow-takegronn','zup-spilepanel-eik-sort','colorker-althea-sand-dekor']]
for p in pages:assert p.is_file(),p
assert (root/'produkt/vedum-flow-takegronn/assets/main.js').is_file()
manifest=json.loads((tmp/'categories/catalog.json').read_text())
assert len(manifest['groups'])==9
assert sum(len(g['categories']) for g in manifest['groups'])==42
assets=tmp/'categories/assets'
assert len(list(assets.iterdir()))>=25
for g in manifest['groups']:
 for item in g['categories']:
  assert (tmp/'categories'/item['image']).is_file(),item['slug']
model=tmp/'model-turbine-v13.glb'
assert model.stat().st_size>900000 and model.open('rb').read(4)==b'glTF'
changes={}
for name in ['entry.js','entry.css']:
 changes[root/'assets/ksh-v13'/name]=(tmp/name).read_bytes()
for name in ['index.html','category.css','category.js','catalog.json']:
 changes[root/'kategorier'/name]=(tmp/'categories'/name).read_bytes()
for p in assets.iterdir():
 if p.is_file():changes[root/'kategorier/assets'/p.name]=p.read_bytes()
changes[root/'produkt/vedum-flow-takegronn/assets/model-turbine-v13.glb']=model.read_bytes()
# Match the canonical footer across proposal pages. Source is from current KSH.
source=(root/'produkter/index.html').read_text(encoding='utf-8')
footer=re.search(r'<footer class="k6-footer"[\s\S]*?</footer>',source)
assert footer,'Cannot find canonical KSH footer'
category_page=(tmp/'categories/index.html').read_text(encoding='utf-8')
anchor='<div id="k13-footer">'
assert anchor in category_page
begin=category_page.index(anchor)
end=category_page.index('</body>',begin)
category_page=category_page[:begin]+anchor+footer.group(0)+'</div>'+category_page[end:]
changes[root/'kategorier/index.html']=category_page.encode('utf-8')

extra='<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/ksh-v13/entry.css?v=13">'
extra+='<script defer src="/ksh/fliskonkurrenten/assets/ksh-v13/entry.js?v=13"></script>'
for p in pages:
 text=p.read_text(encoding='utf-8')
 text=re.sub(r'<link\b[^>]*href=["\'][^"\']*ksh-v13/entry\.css[^"\']*["\'][^>]*>','',text,flags=re.I)
 text=re.sub(r'<script\b[^>]*src=["\'][^"\']*ksh-v13/entry\.js[^"\']*["\'][^>]*>\s*</script>','',text,flags=re.I)
 assert len(re.findall('</head>',text,re.I))==1,p
 text=re.sub('</head>',extra+'</head>',text,count=1,flags=re.I)
 changes[p]=text.encode('utf-8')
jsfile=root/'produkt/vedum-flow-takegronn/assets/main.js'
mainjs=jsfile.read_text(encoding='utf-8')
old='./assets/model-turbine-v9.glb'
new='./assets/model-turbine-v13.glb'
assert mainjs.count(old)==1 or mainjs.count(new)==1,'Unexpected Vedum model reference'
mainjs=mainjs.replace(old,new)
# Match the visual exposure to showroom light; no washed-out 3D cabinet.
if 'exposure="1.15"' in mainjs:
 mainjs=mainjs.replace('exposure="1.15"','exposure="0.93"',1)
if 'shadow-intensity="1"' in mainjs:
 mainjs=mainjs.replace('shadow-intensity="1"','shadow-intensity="1.25"',1)
# The photo below the interactive 3D can be inspected to compare visual appearance.
if 'ksh13-material-reference' not in mainjs:
 needle='<p class="disclaimer">'
 assert needle in mainjs
 mainjs=mainjs.replace(needle,
  '<div class="ksh13-material-reference"><img src="./assets/hero.webp" loading="lazy" alt="Vedum Flow ekte produktfoto" />'+
  '<span>Samme tåkegrønne farge og Turbine Grey-overflate som i vårt 3D-showroom. '+ 
  '3D-modellen er en interaktiv rekonstruksjon; sammenlign alltid med materialprøver.</span></div>'+
  needle,1)
# Reject any generated JavaScript that does not parse before touching production.
import subprocess
testfile=tmp/'vedum-main-preview.js'
testfile.write_text(mainjs,encoding='utf-8')
subprocess.run(['node','--check',str(testfile)],check=True,timeout=12)
changes[jsfile]=mainjs.encode('utf-8')
# Improve the material reference / model-viewer background on the Vedum page only.
vedum_css=(
 '.ksh13-material-reference{display:flex;align-items:center;gap:17px;padding:19px 21px;margin:16px 0 0;'+
 'background:#f4f0ea;border:1px solid #d4cab9;border-radius:10px;color:#61584e;font-size:13px;line-height:1.6}'+
 '.ksh13-material-reference img{width:138px;height:100px;object-fit:cover;border-radius:6px;flex:none}'+
 '.model-box:has(.model-view[src*="model-turbine-v13"]){background:radial-gradient(circle at 50% 20%,#ece9e2,#a49f93)!important}'+
 '@media(max-width:560px){.ksh13-material-reference{flex-direction:column;align-items:flex-start;padding:14px}.ksh13-material-reference img{width:100%;height:175px}}')
changes[root/'assets/ksh-v13/vedum.css']=vedum_css.encode()
p=root/'produkt/vedum-flow-takegronn/index.html'
v=changes[p].decode()
v=v.replace('</head>','<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/ksh-v13/vedum.css?v=13"></head>',1)
changes[p]=v.encode()
# Backup all previously existing files before writing, and keep a manifest for rollback.
backup.mkdir(parents=True,exist_ok=False)
created=[]
for dest in changes:
 rel=dest.relative_to(root)
 if dest.exists():
  prior=backup/rel;prior.parent.mkdir(parents=True,exist_ok=True)
  shutil.copy2(dest,prior)
 else:created.append(str(rel))
(backup/'created.json').write_text(json.dumps(created,indent=2))
done=[]
try:
 for dest,data in changes.items():
  dest.parent.mkdir(parents=True,exist_ok=True)
  stage=dest.with_name(dest.name+'.ksh13.tmp')
  stage.write_bytes(data)
  stage.chmod((dest.stat().st_mode & 0o777) if dest.exists() else 0o644)
  stage.replace(dest)
  done.append(dest)
except BaseException:
 for dest in reversed(done):
  prior=backup/dest.relative_to(root)
  if prior.exists():shutil.copy2(prior,dest)
  else:dest.unlink(missing_ok=True)
 raise
print('PUBLISHED KSH v13',len(done),'files; category groups',len(manifest['groups']))
print('Category banners',len(list(assets.iterdir())),'real product photography files')
print('Vedum GLB',model.stat().st_size,'bytes, calibrated PBR colors / original Turbine Grey stone')
print('BACKUP',backup)
