#!/usr/bin/env python3
"""KSH tile-material library v16: real product photos, searchable by 7 tile categories.
Bildebasert prototype, not manufacturer-verified PBR textures."""
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor,as_completed
import json, re, html, requests, shutil

ROOT=Path('/var/www/setai/ksh/fliskonkurrenten')
OUT=ROOT/'assets/tile-materials-v16'
OUT.mkdir(parents=True,exist_ok=True)
catalog=json.loads((ROOT/'kategorier/catalog.json').read_text())
cats=next(g for g in catalog['groups'] if g['slug']=='fliser')['categories']
def classify(name):
 s=name.lower()
 if re.search(r'\b(brun|brown|mocca|moka|cotto|terracotta|rust|corten|coffee|walnut|nøtt|noce)\b',s):return 'warm'
 if re.search(r'\b(sort|svart|nero|black|antracit|anthracite|charcoal)\b',s):return 'dark'
 if re.search(r'\b(grå|grey|gray|grigio|grafitt|grafite|silver|cement|betong)\b',s):return 'cool'
 if re.search(r'\b(grønn|green|verde|sage|salvie)\b',s):return 'nature'
 if re.search(r'\b(hvit|white|bianco|ivory|avorio|snow|perla)\b',s):return 'light'
 return 'warm'
def dimensions(name):
 m=re.search(r'(\d{1,3}(?:[,.]\d)?)\s*[x×]\s*(\d{1,3}(?:[,.]\d)?)',name,re.I)
 if m:
  a,b=(float(x.replace(',','.'))/100 for x in m.groups())
  if .07<=a<=2.5 and .07<=b<=2.5:return [a,b]
 return [.6,.6]
rx=re.compile(r'<a\s+href="(https://fliskonkurrenten\.no/produkt/[^"]+)"\s+class="product-image-link"[^>]*aria-label="([^"]+)"[^>]*>\s*<img[^>]*\bsrc="([^"]+)"',re.S)
items=[];dedup=set()
for c in cats:
 try:
  r=requests.get(c['source'],timeout=15,headers={'User-Agent':'Mozilla/5.0'})
  r.raise_for_status()
  matches=rx.findall(r.text)
  print('CATEGORY',c['slug'],'PRODUCTS',len(matches))
  for source,name,picture in matches[:12]:
   id=urlparse(source).path.rstrip('/').split('/')[-1]
   if id in dedup:continue
   dedup.add(id)
   name=html.unescape(name)
   picture=html.unescape(picture)
   items.append({'id':id,'name':name,'category':c['slug'],'categoryName':c['label'],
                 'url':source,'originalImage':picture,'image':'',
                 'tone':classify(name),'size':dimensions(name)})
 except Exception as e: print('WARN',c['slug'],str(e)[:100])

# Always include verified textured tiles already in our product studies.
pinned=[
 ('colorker-althea-sand-dekor','Colorker Althea Sand Dekor','fliser-bad','Baderomsfliser',
  'https://fliskonkurrenten.no/produkt/colorker-althea-sand-dekor-595x1192/',
  '/ksh/fliskonkurrenten/produkt/colorker-althea-sand-dekor/assets/detail.webp','warm',[.595,1.192]),
 ('rondine-windsor-beige','Rondine Windsor Beige','fliser-bad','Baderomsfliser',
  'https://fliskonkurrenten.no/produkt/rondine-windsor-beige-203x406-107m2/',
  '/ksh/assets/ksh-v6/assets/windsor-0.webp','warm',[.203,.406])
]
for id,name,cat,catName,url,img,tone,size in pinned:
 items=[x for x in items if x['id']!=id]
 items.insert(0,{'id':id,'name':name,'category':cat,'categoryName':catName,'url':url,
                 'originalImage':img,'image':img,'tone':tone,'size':size})

def obtain(item):
 if item['image']:return item
 src=item['originalImage']
 extension=src.split('?')[0].rsplit('.',1)[-1].lower()
 extension=extension if extension in ('webp','jpg','jpeg','png') else 'webp'
 dst=OUT/(item['id']+'.'+extension)
 if not dst.exists() or dst.stat().st_size<800:
  try:
   r=requests.get(src,timeout=18,headers={'User-Agent':'Mozilla/5.0'},stream=True)
   r.raise_for_status()
   content=r.content
   if not r.headers.get('Content-Type','').startswith('image/') or len(content)<800:raise ValueError('not image')
   if len(content)>3_000_000:raise ValueError('image too large')
   dst.write_bytes(content)
  except Exception as e:
   print('IMAGE FAILED',item['id'],str(e)[:70])
   return None
 dst.chmod(0o644)
 item['image']='/ksh/fliskonkurrenten/assets/tile-materials-v16/'+dst.name
 return item

allGood=[]
with ThreadPoolExecutor(max_workers=7) as pool:
 futs={pool.submit(obtain,x):x for x in items}
 for f in as_completed(futs):
  try:
   v=f.result()
   if v:allGood.append(v)
  except Exception as e:print('FETCH WARNING',e)
pos={x['id']:i for i,x in enumerate(items)}
allGood.sort(key=lambda x:pos[x['id']])
data={'version':16,'categories':[{'id':c['slug'],'name':c['label']} for c in cats],
      'materials':allGood,
      'disclaimer':'Bildebasert materialstudie. Produktfoto er ikke nødvendigvis en kalibrert, sømløs PBR-tekstur. Sjekk fysisk flisprøve før kjøp.'}
(OUT/'catalog.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
(OUT/'catalog.json').chmod(0o644)
print('FINISHED',len(allGood),'CATEGORIES',len(cats))
assert len(allGood)>=15
