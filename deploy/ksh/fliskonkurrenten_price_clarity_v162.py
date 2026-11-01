#!/usr/bin/env python3
"""KSH v16.2: avoid false zero-price in material-preview rooms; show official tile price link."""
from pathlib import Path
from datetime import datetime,timezone
import shutil
root=Path('/var/www/setai/ksh/fliskonkurrenten')
ts=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
def swap(file,a,b):
 s=file.read_text()
 if a not in s:
  if b in s:print('ALREADY',file);return
  raise RuntimeError('Missing source '+str(file))
 shutil.copy2(file,file.with_name(file.name+'.bak.pricing-'+ts))
 tmp=file.with_name(file.name+'.tmp.pricing')
 tmp.write_text(s.replace(a,b,1));tmp.chmod(0o644);tmp.replace(file)
 print('UPDATED',file)
room=root/'assets/bathroom-v11-1/room.js'
swap(room,"document.querySelector('#sr5-total').textContent=money(q.total);",
          "document.querySelector('#sr5-total').textContent=q.total>0?money(q.total):(q.missing?'Pris må bekreftes':money(0));")
studio=root/'assets/bathroom-v11-1/tile-studio-v15.js'
needle="const stage='<div class=\"sr15-surface\""
value="""if(chosen)selected+='<a class="sr15-source-link" href="'+e(chosen.origin)+'" target="_blank" rel="noopener noreferrer">Se produkt, pris og tilgjengelighet hos Fliskonkurrenten ↗</a>';
 const stage='<div class="sr15-surface\\""""
# Keep JS interpolation and quote boundaries exact; short direct string replacement.
s=studio.read_text()
a="const stage='<div class=\"sr15-surface\""
b="if(chosen)selected+='<a class=\"sr15-source-link\" href=\"'+e(chosen.origin)+'\" target=\"_blank\" rel=\"noopener noreferrer\">Se produkt, pris og tilgjengelighet ↗</a>';\\n const stage='<div class=\"sr15-surface\""
if a in s:
 shutil.copy2(studio,studio.with_name(studio.name+'.bak.pricing-'+ts))
 s=s.replace(a,b,1).replace("\\n const stage", "\n const stage",1)
 tmp=studio.with_name('tile-studio-v15.js.tmp.pricing');tmp.write_text(s);tmp.chmod(0o644);tmp.replace(studio)
 print('TILE PRODUCT SOURCE CTA ADDED')
elif 'sr15-source-link' in s:print('EXISTS')
else:raise RuntimeError('Tile markup not found')
css=root/'assets/tile-studio-v15.css'
s=css.read_text()
if 'sr15-source-link' not in s:
 s+="""\n/* Product retailer CTA: price from official store, not invented quote */\n#reisen .sr15-source-link{display:flex;align-items:center;justify-content:center;text-align:center;min-height:44px;background:#e5e9df;color:#244335;border:1px solid #b6c5b7;padding:11px 12px;margin:8px 0 16px;text-decoration:none;font-size:11px;font-weight:750;line-height:1.4;box-sizing:border-box}\n"""
 css.write_text(s);css.chmod(0o644)
for p in (root/'showroom/index.html',root/'produkt/sanipro-sense/index.html'):
 content=p.read_text()
 new=content.replace('room.js?v=16.1','room.js?v=16.2').replace('tile-studio-v15.css?v=15','tile-studio-v15.css?v=16.2')
 p.write_text(new);p.chmod(0o644)
landing=root/'assets/sense-film-v4/landing.js'
s=landing.read_text()
if 'room.js?v=16.1' in s:landing.write_text(s.replace('room.js?v=16.1','room.js?v=16.2'))
print('DONE')
