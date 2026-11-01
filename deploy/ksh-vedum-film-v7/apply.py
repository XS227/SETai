from pathlib import Path
import sys,re,shutil,hashlib,json
root,tmp,backup=map(Path,sys.argv[1:]);page=root/'fliskonkurrenten/produkt/vedum-flow-takegronn/index.html'
original=page.read_text();text=original
if 'window.KSH_PRODUCT=' not in text or 'vedum-flow-takegronn' not in text:raise SystemExit('Ukjent Vedum-side. Ingen endringer utført.')
text=re.sub(r'<link\b[^>]*href=["\']/ksh/fliskonkurrenten/assets/(?:vedum-film-v7|bathroom-v6)/film\.css[^"\']*["\'][^>]*>','',text)
text=re.sub(r'<script\b[^>]*src=["\']/ksh/fliskonkurrenten/assets/(?:vedum-film-v7|bathroom-v6)/film\.js[^"\']*["\'][^>]*>\s*</script>','',text)
tags='<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/vedum-film-v7/film.css?v=7"><script defer src="/ksh/fliskonkurrenten/assets/vedum-film-v7/film.js?v=7"></script>'
text=text.replace('</head>',tags+'</head>',1)
# Only insert the film adapter. Keep the exact footer and all product/room code.
assert original[original.index('<body'):]==text[text.index('<body'):]
assets=root/'fliskonkurrenten/assets/vedum-film-v7';plans={assets/n:(tmp/n).read_bytes() for n in ('film.js','film.css','vedum.mp4','vedum.webm','poster.jpg')};plans[page]=text.encode()
backup.mkdir(parents=True,exist_ok=False);created=[]
for p in plans:
 if p.exists():
  dest=backup/p.relative_to(root);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
 else:created.append(str(p.relative_to(root)))
(backup/'new-files.json').write_text(json.dumps(created));written=[]
try:
 for p,data in sorted(plans.items(),key=lambda x:x[0].suffix=='.html'):
  p.parent.mkdir(parents=True,exist_ok=True);dest=p.with_name(p.name+'.film-v7.tmp');dest.write_bytes(data);dest.chmod(0o644);dest.replace(p);written.append(p)
except BaseException:
 for p in reversed(written):
  old=backup/p.relative_to(root)
  if old.exists():shutil.copy2(old,p)
  else:p.unlink(missing_ok=True)
 raise
print('Vedum Film v7 installert: ekte filmfiler, bakgrunn og scrollstyrt film.')
print('Sikkerhetskopi:',backup)
print('Tilbakestill: sudo cp -a '+str(backup)+'/. '+str(root)+'/')
