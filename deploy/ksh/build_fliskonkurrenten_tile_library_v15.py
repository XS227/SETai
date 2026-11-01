#!/usr/bin/env python3
"""Build a verified flis-image material preview library from Fliskonkurrenten.
Requires requests, bs4, Pillow on the staging machine. Produces deploy-ready
WebP files + metadata; never claims photos are calibrated tile scans."""
import requests, re, json, io, colorsys, sys
from bs4 import BeautifulSoup
from PIL import Image,ImageOps,ImageStat
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from urllib.parse import urlparse
BASE=Path('/home/ubuntu/ksh_tile_v15_staging')
ASSET=BASE/'assets/tile-previews-v15'
ASSET.mkdir(parents=True,exist_ok=True)
cats=[
 ('fliser-bad','Baderomsfliser','https://fliskonkurrenten.no/product-category/fliser/fliser-bad/'),
 ('fliser-kjokken','Kjøkkenfliser','https://fliskonkurrenten.no/product-category/fliser/fliser-kjokken/'),
 ('fliser-gang','Gang og entré','https://fliskonkurrenten.no/product-category/fliser/fliser-gang/'),
 ('fliser-marmorlook','Marmorlook','https://fliskonkurrenten.no/product-category/fliser/fliser-marmorlook/'),
 ('fliser-mosaikk','Mosaikk','https://fliskonkurrenten.no/product-category/fliser/fliser-mosaikk/'),
 ('fliser-terrazzo','Terrazzo','https://fliskonkurrenten.no/product-category/fliser/fliser-terrazzo/'),
 ('fliser-utendors','Utendørsfliser','https://fliskonkurrenten.no/product-category/fliser/fliser-utendors/')
]
headers={'User-Agent':'Mozilla/5.0 (compatible; SETAEI KSH visual product explorer; +https://setai.no/)', 'Accept':'text/html,application/xhtml+xml'}
seen=set();entries=[]
for slug,category,url in cats:
 try:
  resp=requests.get(url,timeout=19,headers=headers);resp.raise_for_status()
  soup=BeautifulSoup(resp.text,'html.parser')
  cards=soup.select('.wd-product')
  print('CATEGORY',slug,'source-products',len(cards),flush=True)
  for node in cards:
   link=node.select_one('a.product-image-link[href*="/produkt/"]')
   img=link.select_one('img') if link else None
   if not img or not link:continue
   u=link.get('href','').split('?')[0]
   item=urlparse(u).path.strip('/').split('/')[-1]
   if item in seen or not item:continue
   if any(v in item for v in ('primer','avrett','fug','lim-','verkt','membran')):continue
   seen.add(item)
   name=link.get('aria-label') or (node.select_one('.wd-entities-title') or node).get_text(' ',strip=True)[:110]
   source=img.get('src') or img.get('data-src')
   if not source or source.startswith('data:'):continue
   dims=re.search(r'(\d{1,3}(?:[,.]\d)?)\s*[x×X]\s*(\d{1,3}(?:[,.]\d)?)',name)
   a,b=([float(v.replace(',','.')) for v in dims.groups()] if dims else [60,60])
   # Dimensions commonly in centimetres; avoid very implausible values.
   if not (5<=a<=200 and 5<=b<=300):a,b=60,60
   entries.append({'id':item,'name':name,'category':category,'categorySlug':slug,'origin':u,
       'sourceImage':source,'tileWidth':a/100,'tileHeight':b/100,
       'surface':'floor' if slug in ('fliser-gang','fliser-utendors') else 'wall'})
 except Exception as e:print('SOURCE_ERROR',slug,str(e)[:130],flush=True)
print('UNIQUE',len(entries),flush=True)
def convert(p):
 id=p['id'];pic=ASSET/(id+'.webp');tex=ASSET/(id+'-texture.webp')
 if not pic.exists() or not tex.exists():
  r=requests.get(p['sourceImage'],timeout=23,headers={'User-Agent':'Mozilla/5.0'})
  r.raise_for_status()
  if not r.headers.get('content-type','').startswith('image/'):raise ValueError('not image')
  im=Image.open(io.BytesIO(r.content)).convert('RGB')
  im.thumbnail((700,700),Image.Resampling.LANCZOS)
  im.save(pic,'WEBP',quality=78,method=5)
  # Center square, no logo/border overlays from the product card itself.
  w,h=im.size;d=int(min(w,h)*.54)
  x=max(0,(w-d)//2);y=max(0,(h-d)//2)
  patch=im.crop((x,y,x+d,y+d)).resize((512,512),Image.Resampling.LANCZOS)
  patch.save(tex,'WEBP',quality=78,method=5)
 else:patch=Image.open(tex).convert('RGB')
 small=patch.resize((22,22),Image.Resampling.BOX)
 stat=ImageStat.Stat(small)
 red,green,blue=stat.median[:3]
 rr,gg,bb=[v/255 for v in (red,green,blue)]
 hh,ss,vv=colorsys.rgb_to_hsv(rr,gg,bb)
 name=p['name'].lower()
 if any(k in name for k in ('brown','brun','cotto','terracotta','copper','bronze')):tone='earth'
 elif any(k in name for k in ('black','nero','antrac','graphite','sort')):tone='dark'
 elif any(k in name for k in ('green','grønn','verde','sage')):tone='sage'
 elif any(k in name for k in ('grey','gray','grigio','grå','silver')):tone='cool'
 elif any(k in name for k in ('beige','sand','cream','ivo','ivory','taupe','bone')):tone='warm'
 elif vv<.41:tone='dark'
 elif ss<.095 and vv>.78:tone='neutral'
 elif .035<hh<.17 and ss>.12:tone='earth' if vv<.63 else 'warm'
 elif .20<hh<.52 and ss>.13:tone='sage'
 else:tone='cool' if ss<.14 else 'neutral'
 p.update({'tone':tone,'color':'#%02x%02x%02x'%(red,green,blue),
         'photo':'/ksh/fliskonkurrenten/assets/tile-previews-v15/'+id+'.webp',
         'texture':'/ksh/fliskonkurrenten/assets/tile-previews-v15/'+id+'-texture.webp'})
 return p
items=[]
with ThreadPoolExecutor(max_workers=8) as exe:
 fs={exe.submit(convert,p):p for p in entries}
 for f in as_completed(fs):
  try:items.append(f.result())
  except Exception as e:print('IMAGE_ERROR',fs[f]['id'],str(e)[:120],flush=True)
positions={p['id']:i for i,p in enumerate(entries)}
items.sort(key=lambda p:positions[p['id']])
assert len(items)>=12, 'insufficient verified flis products to publish'
payload={'version':'15','tiles':items,'note':'Texture previews use cropped supplier product photos; not calibrated material scans or true product GLB models.'}
(BASE/'assets/tile-library-v15.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
(BASE/'assets/tile-library-v15.js').write_text('window.KSHTiles='+json.dumps(payload,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')+';\n')
print('FINAL_LIBRARY',len(items),'BY_CATEGORY',{x:sum(p['categorySlug']==x for p in items) for x,_,_ in cats},flush=True)
