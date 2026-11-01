#!/usr/bin/env python3
"""Replace repeated room/product photography with honest approximated tile swatches.
Retain original source photos separately for comparison and retailer attribution."""
from PIL import Image, ImageFilter, ImageDraw
from pathlib import Path
import json, numpy as np, hashlib, re
b=Path('/home/ubuntu/ksh_tile_v15_staging/assets')
items=json.loads((b/'tile-library-v15.json').read_text())['tiles']
for item in items:
 name=item['name'].lower()
 src=b/'tile-previews-v15'/(item['id']+'.webp')
 dst=b/'tile-previews-v15'/(item['id']+'-texture.webp')
 base=tuple(int(item.get('color','#b4b0a4')[i:i+2],16) for i in (1,3,5))
 if any(w in name for w in ('white','bianco','blanc','hvit','ice','snow')):base=(219,218,212)
 elif any(w in name for w in ('black','nero','antracite','antrac','sort','graphite')):base=(54,56,53)
 elif any(w in name for w in ('brun','brown','cotto','terracotta','cocoa','rust','ruggine')):base=(142,108,85)
 elif any(w in name for w in ('taupe','beige','sand','cream','bone','avorio','ivory')):base=(202,189,166)
 elif any(w in name for w in ('grey','gray','grigio','grå','slate','ash','silver')):base=(152,151,148)
 elif any(w in name for w in ('green','grønn','sage','verde')):base=(128,148,130)
 else:
  # Source photo median is a useful reference, but staged-room images can have
  # misleading color; keep variations physically plausible and avoid saturation.
  avg=sum(base)/3
  base=tuple(round(.65*x+.35*avg) for x in base)
 if item['categorySlug']=='fliser-marmorlook' or 'marmor' in name:
  base=tuple(int(min(232,max(68,x*1.06))) for x in base)
 seed=int.from_bytes(hashlib.sha256(item['id'].encode()).digest()[:8],'little')
 rng=np.random.default_rng(seed)
 size=512
 def noise(n,blur):
  raw=(rng.random((n,n))*255).astype('uint8')
  im=Image.fromarray(raw,'L').resize((size,size),Image.Resampling.BILINEAR).filter(ImageFilter.GaussianBlur(blur))
  return (np.asarray(im).astype('float32')-127.5)/42
 coarse=noise(18,9)
 medium=noise(85,3)
 fine=rng.normal(0,1,(size,size)).astype('float32')
 scalar=coarse*4.9+medium*2.1+fine*1.7
 y,x=np.mgrid[0:size,0:size]
 if item['categorySlug']=='fliser-marmorlook' or any(w in name for w in ('marble','venato','vein')):
  wobble=28*coarse+9*medium
  line=np.abs(np.sin((x+y*.29+wobble)/55))
  vein=np.exp(-(line/.063)**2)
  scalar-=vein*13
 if item['categorySlug']=='fliser-terrazzo':
  for j in range(100):
   cy,cx=rng.integers(8,size-8,size=2)
   rad=int(rng.integers(2,7))
   yy,xx=np.ogrid[max(0,cy-rad):min(size,cy+rad+1),max(0,cx-rad):min(size,cx+rad+1)]
   local=(xx-cx)**2+(yy-cy)**2<=rad*rad
   a=scalar[max(0,cy-rad):min(size,cy+rad+1),max(0,cx-rad):min(size,cx+rad+1)]
   a[local]+=int(rng.choice([-21,-16,13,21]))
 r=base[0]+scalar
 g=base[1]+scalar*.96
 bb=base[2]+scalar*.91
 image=np.clip(np.stack([r,g,bb],axis=2),0,255).astype('uint8')
 # Subtle grout visible as product-defined tile edges, not as room photo layers.
 grout=np.array([max(34,int(x*.69)) for x in base],dtype='uint8')
 image[:4,:,:]=grout
 image[-4:,:,:]=grout
 image[:,:4,:]=grout
 image[:,-4:,:]=grout
 if item['categorySlug']=='fliser-mosaikk':
  for k in (size//3,2*size//3):
   image[k-3:k+3,:,:]=grout
   image[:,k-3:k+3,:]=grout
 Image.fromarray(image,'RGB').save(dst,'WEBP',quality=84,method=5)
 print('MATERIAL',item['id'],base,flush=False)
print('GENERATED_CLEAN_MATERIALS',len(items))
