#!/usr/bin/env python3
"""Make Vedum standalone 3D use the SAME calibrated PBR palette as KSH showroom.
Preserves mesh, UV coordinates and the official Turbine Grey photographic texture.
No Blender dependency; no mutation of prior model files.
"""
from pathlib import Path
import json,struct,sys,math
source,target=map(Path,sys.argv[1:])
b=source.read_bytes()
assert b[:4]==b'glTF' and struct.unpack_from('<I',b,4)[0]==2
total=struct.unpack_from('<I',b,8)[0];assert total==len(b)
n,tag=struct.unpack_from('<I4s',b,12);assert tag==b'JSON'
g=json.loads(b[20:20+n])
pos=20+n
binsize,bintag=struct.unpack_from('<I4s',b,pos);assert bintag==b'BIN\x00'
binary=b[pos+8:pos+8+binsize]
assert len(binary)==binsize
assert len(g['textures'])>=1 and len(g['images'])>=1
palette={
 'fog':('#5a675d',.68,0),
 'front':('#647167',.60,0),
 'shadow':('#2d332f',.86,0),
 'stone':('#ffffff',.63,0),
 'white':('#f2f0eb',.31,0),
 'metal':('#878e8b',.29,.56)
}
def linear(hexcolor):
 vals=[int(hexcolor[i:i+2],16)/255 for i in (1,3,5)]
 return [(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4) for v in vals]+[1.0]
for m in g['materials']:
 if m['name'] not in palette:continue
 color,rough,metal=palette[m['name']]
 p=m.setdefault('pbrMetallicRoughness',{})
 p['baseColorFactor']=linear(color)
 p['roughnessFactor']=rough
 p['metallicFactor']=metal
 m['doubleSided']=False
 m.setdefault('extras',{})['kshPalette']='Calibrated to the 3D showroom v9'
top=next(m for m in g['materials'] if m['name']=='stone')
assert 'baseColorTexture' in top['pbrMetallicRoughness'],'Do not lose actual Turbine Grey texture'
g['asset']['generator']='SETAEI KSH v13 · identical showroom PBR colors, manufacturer stone map'
jsondata=json.dumps(g,ensure_ascii=False,separators=(',',':')).encode('utf8')
jsondata+=b' ' * ((-len(jsondata))%4)
out=struct.pack('<4sII',b'glTF',2,12+8+len(jsondata)+8+len(binary))
out+=struct.pack('<I4s',len(jsondata),b'JSON')+jsondata
out+=struct.pack('<I4s',len(binary),b'BIN\x00')+binary
assert len(out)==struct.unpack_from('<I',out,8)[0]
target.write_bytes(out)
assert len(out)>900000
print('CALIBRATED MODEL',target,'size',len(out),'materials',len(g['materials']),'textures',len(g['textures']))
print('COLOR PALETTE',[(n,linear(c)[:3]) for n,(c,_,_) in palette.items()])
