#!/usr/bin/env python3
"""KSH v16: make actual Z-UP dark as source product photo, give Colorker authentic
stone texture while retaining 3D relief and geometry. Standard-library GLB edits."""
from pathlib import Path
from datetime import datetime,timezone
import struct,json,shutil,urllib.request
root=Path('/var/www/setai/ksh/fliskonkurrenten/produkt')
stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')

def read_glb(path):
 b=path.read_bytes()
 if b[:4]!=b'glTF':raise ValueError('Not GLB')
 jlen,jtyp=struct.unpack_from('<I4s',b,12)
 if jtyp!=b'JSON':raise ValueError('No JSON chunk')
 gltf=json.loads(b[20:20+jlen])
 binary_start=20+jlen
 blen,btyp=struct.unpack_from('<I4s',b,binary_start)
 if btyp!=b'BIN\x00':raise ValueError('No BIN chunk')
 buffer=bytearray(b[binary_start+8:binary_start+8+blen])
 return gltf,buffer
def align(buf):
 while len(buf)%4:buf.append(0)
def save_glb(path,model,buf):
 align(buf)
 model['buffers'][0]['byteLength']=len(buf)
 raw=json.dumps(model,separators=(',',':'),ensure_ascii=False).encode('utf8')
 while len(raw)%4:raw+=b' '
 total=12+8+len(raw)+8+len(buf)
 output=struct.pack('<4sII',b'glTF',2,total)+struct.pack('<I4s',len(raw),b'JSON')+raw+struct.pack('<I4s',len(buf),b'BIN\x00')+buf
 path.write_bytes(output);path.chmod(0o644)
 print('MODEL READY',path,'BYTES',len(output),'MAT',len(model.get('materials',[])))
def patch_asset(slug,mod,after):
 folder=root/slug/'assets'
 source=folder/'model-yup-v6.glb'
 target=folder/'model-material-v16.glb'
 if not source.exists():raise RuntimeError('No source model '+slug)
 g,buf=read_glb(source)
 mod(g,buf,folder)
 save_glb(target,g,buf)
 for f in [root/slug/'index.html',folder/'main.js']:
  if not f.exists():continue
  original=f.read_text()
  new=original.replace('model-yup-v6.glb','model-material-v16.glb')
  if f.name=='index.html':
   new=new.replace('assets/main.js?v=6','assets/main.js?v=16').replace('assets/main.js?v=9','assets/main.js?v=16').replace('assets/main.js?v=1','assets/main.js?v=16')
  if slug.startswith('colorker-'):
   new=new.replace('showroom/?add=althea','showroom/?tile=colorker-althea-sand-dekor-595x1192&surface=wall')
  if new!=original:
   shutil.copy2(f,f.with_name(f.name+'.bak.material16-'+stamp))
   t=f.with_name(f.name+'.tmp.material16');t.write_text(new);t.chmod(0o644);t.replace(f)
 after(folder)
def zup(g,b,folder):
 # Reference photo is dark charcoal oak grain over black felt. Prior render
 # used pale wooden slats; accurate tonal values here, still conceptual geometry.
 color={
 'felt':[.012,.013,.014,1],
 'oak':[.035,.038,.041,1],
 'oaklight':[.055,.058,.061,1],
 'grain':[.043,.046,.049,1],
 }
 for mat in g['materials']:
  name=mat.get('name','')
  if name in color:
   mat['pbrMetallicRoughness']['baseColorFactor']=color[name]
   mat['pbrMetallicRoughness']['roughnessFactor']=.88
 g.setdefault('asset',{}).setdefault('extras',{})['materialReference']='zup-eik-sort-600066.jpg'
def colorker(g,buf,folder):
 image=folder/'material-photo-v16.jpg'
 if not image.exists():raise RuntimeError('Photo JPEG missing; preserve source, abort')
 photo=image.read_bytes()
 if len(photo)<5000:raise RuntimeError('Photo JPEG invalid')
 primitive=g['meshes'][0]['primitives'][0]
 a=g['accessors'][primitive['attributes']['POSITION']]
 view=g['bufferViews'][a['bufferView']]
 assert a['componentType']==5126 and a['type']=='VEC3'
 pos=view.get('byteOffset',0)+a.get('byteOffset',0)
 stride=view.get('byteStride',12)
 xmin,xmax=a['min'][0],a['max'][0]
 zmin,zmax=a['min'][2],a['max'][2]
 coords=[]
 for k in range(a['count']):
  x,y,z=struct.unpack_from('<fff',buf,pos+k*stride)
  coords.extend([(x-xmin)/max(.0001,xmax-xmin),(z-zmin)/max(.0001,zmax-zmin)])
 align(buf)
 off=len(buf)
 for v in coords:buf.extend(struct.pack('<f',v))
 g['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':8*a['count']})
 g['accessors'].append({'bufferView':len(g['bufferViews'])-1,'byteOffset':0,'componentType':5126,'count':a['count'],'type':'VEC2','min':[0,0],'max':[1,1]})
 primitive['attributes']['TEXCOORD_0']=len(g['accessors'])-1
 align(buf)
 off=len(buf)
 buf.extend(photo)
 g['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(photo)})
 g.setdefault('images',[]).append({'name':'Colorker genuine stone reference','mimeType':'image/jpeg','bufferView':len(g['bufferViews'])-1})
 g.setdefault('samplers',[]).append({'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497})
 g.setdefault('textures',[]).append({'sampler':len(g['samplers'])-1,'source':len(g['images'])-1})
 mat=g['materials'][primitive['material']]['pbrMetallicRoughness']
 mat['baseColorTexture']={'index':len(g['textures'])-1}
 mat['baseColorFactor']=[1,1,1,1]
 mat['roughnessFactor']=.82
 g.setdefault('asset',{}).setdefault('extras',{})['materialReference']='Colorker Althea Sand detail.webp'
 # Reduce overly bright stripe colors, to let the product photo become dominant.
 for material in g['materials'][1:]:
  factors=material['pbrMetallicRoughness'].get('baseColorFactor',[1,1,1,1])
  material['pbrMetallicRoughness']['baseColorFactor']=[x*.63 for x in factors[:3]]+[1]
def mark(folder):pass
patch_asset('zup-spilepanel-eik-sort',zup,mark)
patch_asset('colorker-althea-sand-dekor',colorker,mark)
print('DONE. Reference textures approximate manufacturer imagery and must not be represented as CAD.')
