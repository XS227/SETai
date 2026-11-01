#!/usr/bin/env python3
"""Build Fliskonkurrenten KSH category catalog with REAL product images from its public catalog.
All category names and URLs follow actual taxonomy. All links in the proposal stay internal.
Images are explicitly attributed as retailer-sourced illustrative category photography.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
import html,json,re,requests,sys,hashlib,time
from urllib.parse import urlparse

OUT=Path(sys.argv[1]);OUT.mkdir(parents=True,exist_ok=True)
BASE='https://fliskonkurrenten.no/product-category/'
def c(label,slug,url=None,blurb=None):
    return dict(label=label,slug=slug,source=BASE+(url or slug)+'/',desc=blurb or '')
GROUPS=[
 dict(slug='fliser',name='Fliser',subtitle='Fra hverdagsrom til arkitektoniske overflater',tag='FLATER',tone='#484742',categories=[
  c('Baderomsfliser','fliser-bad','fliser/fliser-bad','Overflater som setter stemningen i badet'),
  c('Kjøkkenfliser','fliser-kjokken','fliser/fliser-kjokken','Fliser til vegg og gulv – én samlet kategori'),
  c('Gang og entré','fliser-gang','fliser/fliser-gang','Holdbare formater til soner med høy trafikk'),
  c('Marmorlook','fliser-marmorlook','fliser/fliser-marmorlook','Rolige årer, lys og en eksklusiv karakter'),
  c('Mosaikk','fliser-mosaikk','fliser/fliser-mosaikk','Små formater og kreative mønsterkombinasjoner'),
  c('Terrazzo','fliser-terrazzo','fliser/fliser-terrazzo','Karakteristiske steinkorn og levende flater'),
  c('Utendørsfliser','fliser-utendors','fliser/fliser-utendors','Overflater for uteplasser og inngangssoner')]),
 dict(slug='baderom',name='Baderom',subtitle='Hele rommet, fra servant til ferdig dusjsone',tag='ROM',tone='#6d7469',categories=[
  c('Badekar','badekar','baderom/badekar','Frittstående og veggmonterte badekar'),
  c('Dusj','dusj','baderom/dusj','Skjermvegger og komplette dusjløsninger'),
  c('Baderomsinnredning','baderomsinnredning','baderom/baderomsinnredning','Skap, benkeplater og oppbevaring'),
  c('Vasker og steinservanter','baderomsvasker-steinvasker','baderom/baderomsvasker-steinvasker','Servanter til ulike materialuttrykk'),
  c('Dusjarmatur','dusjarmatur','baderom/dusjarmatur','Funksjonelle og skulpturelle detaljer'),
  c('Servantarmatur','servantarmatur','baderom/servantarmatur','Blandebatterier som fullfører uttrykket'),
  c('Speil og speilskap','speil-og-speilskap','baderom/speil-og-speilskap','Lys, speil og oppbevaringsfunksjoner')]),
 dict(slug='naturstein',name='Naturstein',subtitle='Geologi, tekstur og varige materialer',tag='MATERIALER',tone='#5d5951',categories=[
  c('Marmor','marmor','naturstein/marmor','Naturens årer og steinens egne nyanser'),
  c('Skifer','skifer','naturstein/skifer','Naturlig karakter til inne- og uterom'),
  c('Bruddheller','bruddheller','naturstein/skifer/bruddheller','Organiske former for terrasse og hage'),
  c('Flis og belegningsskifer','flis-og-belegningsskifer','naturstein/skifer/flis-og-belegningsskifer','Naturlige steinheller til faste flater'),
  c('Tråkkheller','trakkheller','naturstein/skifer/trakkheller','Lag en sti av autentisk naturstein'),
  c('Andre skifervarer','andre-skifervarer','naturstein/skifer/andre-skifervarer','Tilpasninger og andre skiferprodukter'),
  c('Tørrmur','torrmur','naturstein/skifer/torrmur','Rustikke murflater uten mørtelfuger')]),
 dict(slug='benkeplater',name='Benkeplater',subtitle='Kompositt, keramikk og naturstein',tag='DETALJER',tone='#545b57',categories=[
  c('Dekton','dekton','benkeplate-granitt-cosentino/dekton','Keramiske flater og presise detaljer'),
  c('Silestone','silestone','benkeplate-granitt-cosentino/silestone','Komposittstein i flere uttrykk'),
  c('Granitt','granitt-benkeplate','benkeplate-granitt-cosentino/granitt-benkeplate','Naturlig hardhet og særegne nyanser'),
  c('Marmorbenkeplater','marmor-benkeplate','benkeplate-granitt-cosentino/marmor-benkeplate','Klassisk stein med unike åretegninger'),
  c('Terrazzobenkeplater','terrazzo-benkeplater','benkeplate-granitt-cosentino/terrazzo-benkeplater','Dekorative steinkorn i store flater'),
  c('Lundhs Real Stone','lundhs-real-stone','benkeplate-granitt-cosentino/lundhs-real-stone','Nordisk naturstein med egen identitet')]),
 dict(slug='tilbehor',name='Tilbehør og verktøy',subtitle='Det som gjør et godt materialvalg til et godt resultat',tag='FAGHANDEL',tone='#777368',categories=[
  c('Flistilbehør','flis-tilbehor','tilbehor/flis-tilbehor','Alt rundt flis og montering'),
  c('Fug og silikon','fug-og-silikon','tilbehor/fug-og-silikon','Fuger som både beskytter og fremhever'),
  c('Lim','lim','tilbehor/lim','Riktig lim til underlag og bruksområde'),
  c('Membran','membran','tilbehor/membran','Komponenter for vanntette konstruksjoner'),
  c('Lister','lister','tilbehor/lister','Avslutninger og beskyttede kanter'),
  c('Mørtel','mortel','tilbehor/mortel','Oppbygging, underlag og stabilitet'),
  c('Verktøy','verktoy','tilbehor/verktoy','Verktøy til presisjonsarbeid'),
  c('Verneutstyr','verneutstyr','tilbehor/verneutstyr','Sikkerhet i gjennomføringen'),
  c('Pleie og impregnering','pleiemidler-og-impregnering','tilbehor/pleiemidler-og-impregnering','Behold overflaten pen over tid'),
  c('Akemi','akemi','tilbehor/pleiemidler-og-impregnering/pleiemiddler','Pleie og vedlikehold'),
  c('Mapei','mapei','tilbehor/pleiemidler-og-impregnering/pleiemiddel','Produktsystemer for profesjonelle')]),
 dict(slug='spileplater',name='Spileplater',subtitle='Rytme, dybde og varme i vertikale flater',tag='AKUSTIKK',tone='#3a332e',categories=[
  c('Spileplater','spileplater-utvalg','spileplater','Mørk og lys eik, tilbehør og montering')]),
 dict(slug='outlet',name='Outlet',subtitle='Utvalgte partier og materialfunn',tag='FØRST TIL MØLLA',tone='#8d6047',categories=[
  c('Outlet og kampanjevarer','outlet-utvalg','outlet','Et utvalg til endrede priser – bekreft tilgjengelighet')]),
 dict(slug='stop-og-avretting',name='Støp og avretting',subtitle='Gode rom starter under overflaten',tag='KONSTRUKSJON',tone='#686d68',categories=[
  c('Støp og avretting','stop-avretting-utvalg','stop-og-avretting','Systemer til gulv og underlag')]),
 dict(slug='vaskerom',name='Vaskerom',subtitle='Smarte, slitesterke løsninger til hverdagens rom',tag='BRUKSROM',tone='#7b8177',categories=[
  c('Vaskerom','vaskerom-utvalg','vaskerom','Funksjonelle produkter til vaskerommet')]),
]
# In the source taxonomy 'Fliser Kjøkken' and 'Fliser kjøkken' overlap, so the demo
# deliberately consolidates them under a single clear card rather than duplicating.
session=requests.Session();session.headers.update({'User-Agent':'SETAEI KSH category reference browser (design proposal)','Accept':'text/html,image/avif,image/webp,image/jpeg,*/*'})
def fetch_one(cat):
 try:
  response=session.get(cat['source'],timeout=(5,16))
  response.raise_for_status()
  body=response.text
  matches=re.findall(r'<a\b[^>]*class="[^"]*\bproduct-image-link\b[^"]*"[^>]*aria-label="([^"]*)"[^>]*>\s*<img\b[^>]*\bsrc="([^"]+)"',body,re.I|re.S)
  valid=[]
  for title,src in matches:
   title=html.unescape(re.sub('<[^>]*>','',title)).strip()
   src=html.unescape(src).strip()
   if not src.startswith('https://fliskonkurrenten.no/wp-content/uploads/'):continue
   if any(bad in src.lower() for bad in ('placeholder','montasjeskrue','crop','logo','dummy')):continue
   valid.append((title,src))
  # Use actual Z-UP dark slat panel, never a mounting screw.
  if cat['slug']=='spileplater-utvalg':
   valid=[('Z-UP Spilepanel Eik Sort 600066','https://duri.no/media/catalog/product/cache/46ee0b8152f0e234e40d5971930c811e/d/u/duri-media-7072789020084-54589.jpg')]
  # Review first 4 product images to avoid dead/placeholder media.
  for name,url in valid[:5]:
   try:
    asset=session.get(url,timeout=(5,16))
    asset.raise_for_status()
    typ=asset.headers.get('content-type','').split(';')[0].lower()
    if typ not in ('image/jpeg','image/png','image/webp'):continue
    data=asset.content
    if len(data)<11000 or len(data)>2200000:continue
    ext={ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[typ]
    file=OUT/f"{cat['slug']}.{ext}"
    file.write_bytes(data)
    return cat['slug'],dict(image=f"assets/{file.name}",examples=[x[0] for x in valid[:3]],source_name=name,source_url=url)
   except Exception:continue
  return cat['slug'],dict(image=None,examples=[x[0] for x in valid[:3]],source_name=None,source_url=None)
 except Exception as e:
  return cat['slug'],dict(image=None,examples=[],source_name=None,source_url=None,error=str(e)[:125])

cats=[c for g in GROUPS for c in g['categories']]
print('Starting',len(cats),'official category references',flush=True)
results={}
with ThreadPoolExecutor(max_workers=6) as pool:
 for fut in as_completed([pool.submit(fetch_one,c) for c in cats]):
  slug,info=fut.result();results[slug]=info
  print(slug,info['image'] or 'NO_IMAGE',flush=True)
# Backfill missing category image only with a product image from the same family.
for g in GROUPS:
 lead=next((results[c['slug']]['image'] for c in g['categories'] if results[c['slug']]['image']),None)
 for cat in g['categories']:
  meta=results[cat['slug']]
  if meta['image'] is None and lead:
   meta['image']=lead
   meta['photo_note']='Felles illustrasjonsbilde fra kategorigruppen'
  cat.update(meta)
 g['image']=lead
 g['count']=len(g['categories'])
# Last-resort group fallback is still a real, locally sourced product photo.
fallback=next(g['image'] for g in GROUPS if g['image'])
for g in GROUPS:
 if not g['image']:g['image']=fallback
 for cat in g['categories']:
  if not cat.get('image'):
   cat['image']=g['image']
   cat['photo_note']='Generelt inspirasjonsbilde fra sortimentet'
manifest=OUT.parent/'catalog.json'
manifest.write_text(json.dumps({'groups':GROUPS,'image_source':'Originalt produktfoto fra Fliskonkurrentens offentlige sortiment, med Z-UP fotografi fra Duri for varen 600066','created':'2026-11-01'},ensure_ascii=False,indent=2),encoding='utf8')
print('CATEGORY_CATALOG_OK',len(GROUPS),'groups',len(cats),'subcategories',sum(bool(x.get('source_name'))for g in GROUPS for x in g['categories']),'own photos',len(list(OUT.iterdir())),'images',flush=True)
