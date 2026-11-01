from pathlib import Path
import re,sys,shutil,json
from repair_models import canonical,SLUGS
root,tmp,backup=map(Path,sys.argv[1:]);base=root/'fliskonkurrenten';assets=base/'assets/bathroom-v6'
plans={}
for n in ('room.js','layout.js','room.css','showroom.css','film.js','film.css'):
 if (tmp/n).exists():plans[assets/n]=(tmp/n).read_bytes()
plans[base/'showroom/index.html']=(tmp/'showroom.html').read_bytes()
plans[base/'assets/ksh-four-products-v2.js']=(tmp/'shared.js').read_bytes()
plans[root/'assets/ksh-v6/room-renderer.js']=(tmp/'room-renderer.js').read_bytes()
for slug in SLUGS:
 p=base/'produkt'/slug/'assets/model.glb';plans[p.with_name('model-yup-v6.glb')]=canonical(p.read_bytes())
 js=base/'produkt'/slug/'assets/main.js'
 if js.exists():
  text=js.read_text().replace('./assets/model.glb','./assets/model-yup-v6.glb')
  # The static KSH footer lives outside #app. Avoid replacing it with a dynamic second footer.
  text=re.sub(r"'<footer class=\"footer\">.*?</footer>'\+", "''+",text,flags=re.S)
  plans[js]=text.encode()
# Point all installed pages at one versioned shell, including the product gallery.
for page in base.rglob('*.html'):
 text=page.read_text();updated=re.sub(r'ksh-four-products-v2\.js(?:\?v=[\w.]+)?','ksh-four-products-v2.js?v=6',text)
 if '/produkt/' in str(page):updated=re.sub(r'assets/main\.js(?:\?v=[\w.]+)?','assets/main.js?v=6',updated)
 if '/sanipro-sense/' in str(page):
  updated=re.sub(r'/sense-film-v4/landing\.js\?v=[\w.]+','/sense-film-v4/landing.js?v=6',updated)
  updated=re.sub(r'/sense-room-v5/room\.css\?v=[\w.]+','/bathroom-v6/room.css?v=6',updated)
  if '/bathroom-v6/room.css' not in updated:updated=updated.replace('</head>','<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/bathroom-v6/room.css?v=6"></head>')
 if updated!=text:plans[page]=updated.encode()
loader=base/'assets/sense-film-v4/landing.js'
if loader.exists():plans[loader]=re.sub(r'/(?:sense-room-v5|sense-film-v4|bathroom-v6)/room\.js\?v=[\w.]+','/bathroom-v6/room.js?v=6',loader.read_text()).encode()
# The final film integration is conditional on a verified rendered clip being included.
if (tmp/'vedum.mp4').exists():
 for n in ('vedum.mp4','vedum.webm','vedum-poster.jpg'):plans[assets/n]=(tmp/n).read_bytes()
 page=base/'produkt/vedum-flow-takegronn/index.html';text=plans.get(page,page.read_bytes()).decode()
 text=re.sub(r'<(?:script|link)\b[^>]*(?:bathroom-v6/film\.(?:js|css))[^>]*(?:></script>|>)','',text)
 text=text.replace('</head>','<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/bathroom-v6/film.css?v=6"><script defer src="/ksh/fliskonkurrenten/assets/bathroom-v6/film.js?v=6"></script></head>')
 plans[page]=text.encode()
backup.mkdir(parents=True,exist_ok=False);created=[]
for p in plans:
 if p.exists():
  dest=backup/p.relative_to(root);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
 else:created.append(str(p.relative_to(root)))
(backup/'new-files.json').write_text(json.dumps(created))
written=[]
try:
 for p,data in sorted(plans.items(),key=lambda item:item[0].suffix=='.html'):
  p.parent.mkdir(parents=True,exist_ok=True);stage=p.with_name(p.name+'.bathroom-v6.tmp');stage.write_bytes(data);stage.chmod(0o644);stage.replace(p);written.append(p)
except BaseException:
 for p in reversed(written):
  old=backup/p.relative_to(root)
  if old.exists():shutil.copy2(old,p)
  else:p.unlink(missing_ok=True)
 raise
print('Baderom v6 installert. Felles showroom, Y-up produktmodeller og live pris.')
print('Sikkerhetskopi:',backup)
print('Tilbakestill eksisterende filer: sudo cp -a '+str(backup)+'/. '+str(root)+'/')
