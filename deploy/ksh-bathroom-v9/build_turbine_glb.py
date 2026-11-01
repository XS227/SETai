#!/usr/bin/env python3
"""Embed a product-authoritative Vedum Turbine Grey JPEG in an original GLB concept.
No pip dependency; no edits to original source GLB, preserves all other materials.
"""
import sys,struct,json,copy,pathlib
source,texture,target=map(pathlib.Path,sys.argv[1:4])
raw=source.read_bytes();img=texture.read_bytes()
assert raw[:4]==b'glTF' and raw[4:8]==struct.pack('<I',2)
assert img[:3]==b'\xff\xd8\xff' and len(img)>10000
jlen,typ=struct.unpack_from('<I4s',raw,12);assert typ==b'JSON'
g=json.loads(raw[20:20+jlen]);pos=20+jlen
blen,btyp=struct.unpack_from('<I4s',raw,pos);assert btyp==b'BIN\x00'
bin_data=bytearray(raw[pos+8:pos+8+blen]);assert len(bin_data)==blen
g=copy.deepcopy(g)
stone=next(i for i,m in enumerate(g['materials']) if m.get('name')=='stone')
top=next(m for m in g['meshes'] if 'Turbine Grey' in m.get('name',''))
primitive=next(p for p in top['primitives'] if p.get('material')==stone)
assert 'TEXCOORD_0' not in primitive['attributes']
pacc=g['accessors'][primitive['attributes']['POSITION']]
pview=g['bufferViews'][pacc['bufferView']]
assert pacc['componentType']==5126 and pacc['type']=='VEC3'
offset=pview.get('byteOffset',0)+pacc.get('byteOffset',0)
stride=pview.get('byteStride',12)
points=[struct.unpack_from('<3f',bin_data,offset+i*stride) for i in range(pacc['count'])]
low=[min(v[k] for v in points) for k in (0,1)]
high=[max(v[k] for v in points) for k in (0,1)]
assert high[0]-low[0]>.9 and high[1]-low[1]>.45
def add_buf(data,target=None):
 while len(bin_data)%4:bin_data.append(0)
 start=len(bin_data);bin_data.extend(data)
 b={'buffer':0,'byteOffset':start,'byteLength':len(data)}
 if target:b['target']=target
 i=len(g['bufferViews']);g['bufferViews'].append(b);return i
uv=b''.join(struct.pack('<2f',(v[0]-low[0])/(high[0]-low[0])*1.62,(v[1]-low[1])/(high[1]-low[1])) for v in points)
uview=add_buf(uv,34962)
g['accessors'].append({'bufferView':uview,'componentType':5126,'count':len(points),'type':'VEC2','min':[0,0],'max':[1.62,1]})
primitive['attributes']['TEXCOORD_0']=len(g['accessors'])-1
iview=add_buf(img)
g.setdefault('images',[]).append({'name':'Vedum Turbine Grey manufacturer texture','mimeType':'image/jpeg','bufferView':iview})
g.setdefault('samplers',[]).append({'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497})
g.setdefault('textures',[]).append({'source':len(g['images'])-1,'sampler':len(g['samplers'])-1})
material=g['materials'][stone];pbr=material.setdefault('pbrMetallicRoughness',{})
pbr['baseColorFactor']=[1.0,1.0,1.0,1.0]
pbr['baseColorTexture']={'index':len(g['textures'])-1,'texCoord':0}
pbr['metallicFactor']=0.0;pbr['roughnessFactor']=.64
material['name']='stone'
material['extras']={'source':'Vedum official Turbine Grey sample from Vedum.se', 'material':'Komposittstein Turbine Grey (not scanned manufactured CAD)'}
while len(bin_data)%4:bin_data.append(0)
g['buffers'][0]['byteLength']=len(bin_data)
encoded=json.dumps(g,separators=(',',':'),ensure_ascii=False).encode()
encoded+=b' '*((-len(encoded))%4)
binary=bytes(bin_data)
total=12+8+len(encoded)+8+len(binary)
output=struct.pack('<4sII',b'glTF',2,total)+struct.pack('<I4s',len(encoded),b'JSON')+encoded+struct.pack('<I4s',len(binary),b'BIN\x00')+binary
assert len(output)==total
target.write_bytes(output)
# Confirm generated GLB has a complete material-map binding.
x=json.loads(encoded)
assert x['meshes'][6]['primitives'][0]['attributes']['TEXCOORD_0']>=0
assert x['materials'][stone]['pbrMetallicRoughness']['baseColorTexture']['index']==len(x['textures'])-1
print('OK GLB texture:',target,len(output),'bytes /',len(points),'UV coordinates /',len(img),'JPEG bytes')
