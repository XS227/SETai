#!/usr/bin/env python3
"""Publish individual tile pages, tile gallery and category display enhancements."""
from pathlib import Path
from datetime import datetime,timezone
import json,html,urllib.request,shutil
BASE=Path('/var/www/setai/ksh/fliskonkurrenten')
ROOT='/ksh/fliskonkurrenten/'
ASSET=BASE/'assets'
ST=BASE/'flis'
LIB=json.loads((ASSET/'tile-library-v15.json').read_text())['tiles']
ST.mkdir(exist_ok=True)
stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
def put(path,s):
 path.parent.mkdir(parents=True,exist_ok=True)
 old=path.read_text() if path.exists() else None
 if old==s:return False
 if old is not None:shutil.copy2(path,path.with_name(path.name+'.bak.tilecat-'+stamp))
 temp=path.with_name(path.name+'.tmp.tilecat')
 temp.write_text(s,encoding='utf8');temp.chmod(0o644);temp.replace(path)
 return True
def esc(x):return html.escape(str(x),quote=True)
def download(commit,path,dest):
 with urllib.request.urlopen(urllib.request.Request('https://raw.githubusercontent.com/XS227/SETai/'+commit+'/deploy/ksh/assets/'+path,headers={'User-Agent':'Mozilla/5.0'}),timeout=22) as r:data=r.read()
 if len(data)<100:raise RuntimeError('Bad asset '+path)
 dest.write_bytes(data);dest.chmod(0o644)
download('c0662fb620102ae74ec141132f7d4f2522da48ed','tile-gallery-v15.js',ASSET/'tile-gallery-v15.js')
download('a3368bf775724060936a0a57b78b03a1eeded643','tile-gallery-v15.css',ASSET/'tile-gallery-v15.css')
SITE_STYLE='<link rel="stylesheet" href="/ksh/assets/ksh-v6/brand.css?v=6.1">'
PRODUCT_STYLE='<link rel="stylesheet" href="'+ROOT+'assets/tile-gallery-v15.css?v=15">'
SCRIPTS='<script src="'+ROOT+'assets/tile-library-v15.js?v=15"></script><script defer src="'+ROOT+'assets/tile-gallery-v15.js?v=15"></script>'
VENDORS='<link rel="stylesheet" href="'+ROOT+'assets/vendor-catalog-v1.css?v=1"><script defer src="'+ROOT+'assets/vendor-catalog-v1.js?v=1"></script>'
NAV='<nav class="tg15-return" aria-label="Navigasjon" style="display:flex;gap:18px;flex-wrap:wrap;padding:19px 0;font-size:12px"><a href="'+ROOT+'">← Forsiden</a><a href="'+ROOT+'kategorier/">Kategorier</a><a href="'+ROOT+'fliser-i-rommet/">Alle fliser</a><a href="'+ROOT+'showroom/">3D-showroom</a></nav>'
source=(BASE/'showroom/index.html').read_text()
footer=source[source.find('<footer class="k6-footer"'):source.find('</footer>')+len('</footer>')]
assert footer.startswith('<footer') and footer.endswith('</footer>')
meta='<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow">'
def head(title,desc):
 return '<!doctype html><html lang="nb"><head><meta charset="utf-8">'+meta+'<title>'+esc(title)+'</title><meta name="description" content="'+esc(desc)+'">'+SITE_STYLE+VENDORS+PRODUCT_STYLE+'</head><body data-ksh-brand="fliskonkurrenten">'
base=BASE/'fliser-i-rommet'
page=head('Prøv fliser i showroom | Fliskonkurrenten – SETAEI KSH','Velg flis fra ekte produktbilder og se en omtrentlig materialgjengivelse i baderommet med matchende fargeforslag.')+'<main class="tg15-page"><div class="tg15-container">'+NAV+'<div id="tg15-gallery" aria-live="polite"><p>Laster flisene …</p></div></div></main>'+footer+SCRIPTS+'</body></html>'
print('CATALOG PAGE',put(base/'index.html',page))
made=0
for tile in LIB:
 slug=tile['id'];name=esc(tile['name'])
 intro='Slik kan '+name+' se ut i et rom. Vi bruker utsnitt fra et produktfoto som en visuell flisprøve. Flisens farge, format og mønster må verifiseres med fysisk produktprøve.'
 product=(head(tile['name']+' | Prøv flisen i rommet | SETAEI KSH','Produktbilde, omtrentlig flisvisualisering og forslag til materialkombinasjoner for '+tile['name'])+
 '<main class="tg15-page"><div class="tg15-container">'+NAV+
 '<div class="tg15-detail"><figure class="tg15-detail-photo"><img loading="eager" src="'+esc(tile['photo'])+'" alt="Flisfoto: '+name+'"><figcaption>Foto: Fliskonkurrentens produktside. Materialtekstur er en illustrasjon.</figcaption></figure>'+
 '<div class="tg15-detail-copy"><span class="tg15-kicker">'+esc(tile['category'])+' / DIGITALT SHOWROOM</span><h1>'+name+'</h1><p>'+intro+'</p><p><strong>Valgt produkt:</strong> '+name+'</p>'+
 '<div class="tg15-action"><a href="'+ROOT+'showroom/?tile='+esc(slug)+'&surface=wall#reisen">Prøv på vegg ↗</a><a href="'+ROOT+'showroom/?tile='+esc(slug)+'&surface=floor#reisen">Prøv som gulv ↗</a><a href="'+esc(tile['origin'])+'" target="_blank" rel="noopener noreferrer">Pris og spesifikasjoner ↗</a></div>'+
 '<p><strong>Mer salg uten å forstyrre:</strong> Når du åpner showroomet, foreslår vi passende farger, gulvmaterialer og supplerende baderomsprodukter. Du velger selv hva som legges til.</p>'+
 '<p style="font-size:11px">Dette er en demonstrasjon basert på produktfoto – ikke en skannet 3D-modell. Oppdatert varepris og levering finnes hos originalbutikken.</p>'+
 '<p><a href="'+ROOT+'fliser-i-rommet/?kategori='+esc(tile['categorySlug'])+'">Se flere fliser fra '+esc(tile['category'])+' ↗</a></p></div></div></div></main>'+footer+'</body></html>')
 if put(ST/slug/'index.html',product):made+=1
print('TILE_PRODUCT_PAGES',made,'TOTAL',len(LIB))

# Add gallery scripts on homepage and category landing; defer initialization
# until content from the existing category builder has arrived.
for path in (BASE/'index.html',BASE/'kategorier/index.html'):
 text=path.read_text()
 if 'tile-gallery-v15.js' not in text:
  text=text.replace('</head>',PRODUCT_STYLE+SCRIPTS+'</head>',1)
  print('PUBLISH_GALLERY_LINK',put(path,text))
# Link the tile gallery in ordinary product overview without pretending every
# photographed tile has a full 3D model.
catalog=BASE/'varer/index.html'
text=catalog.read_text()
if 'fliser-i-rommet/' not in text:
 marker='<div class="sp-filters">'
 replacement='<p><a href="'+ROOT+'fliser-i-rommet/" style="display:inline-block;padding:13px 18px;background:#a77758;color:#fff;text-decoration:none;font-weight:700;font-size:12px;margin:8px 0 17px">Prøv 54 fliser på vegg eller gulv ↗</a></p>'+marker
 if marker in text:print('PRODUCT_OVERVIEW',put(catalog,text.replace(marker,replacement,1)))
print('ALL_TILES_READY',len(LIB))
