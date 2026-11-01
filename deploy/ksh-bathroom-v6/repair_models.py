"""Convert the three authored Z-up GLBs to canonical glTF Y-up, losslessly."""
import json,struct,math
from pathlib import Path
SLUGS=('vedum-flow-takegronn','zup-spilepanel-eik-sort','colorker-althea-sand-dekor')
def canonical(data):
 magic,version,total=struct.unpack_from('<III',data)
 assert magic==0x46546c67 and version==2 and total==len(data),'Invalid GLB'
 length,kind=struct.unpack_from('<II',data,12);assert kind==0x4e4f534a
 doc=json.loads(data[20:20+length]);chunks=data[20+length:]
 if not any(n.get('name')=='KSH_Y_UP_ROOT' for n in doc['nodes']):
  for scene in doc['scenes']:
   roots=scene.get('nodes',[]);idx=len(doc['nodes'])
   doc['nodes'].append({'name':'KSH_Y_UP_ROOT','rotation':[-math.sqrt(.5),0,0,math.sqrt(.5)],'children':roots})
   scene['nodes']=[idx];scene.setdefault('extras',{})['ksh_up_axis']='Y'
 encoded=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();encoded+=b' '*((-len(encoded))%4)
 return struct.pack('<III',magic,version,20+len(encoded)+len(chunks))+struct.pack('<II',len(encoded),kind)+encoded+chunks
if __name__=='__main__':
 import sys
 root=Path(sys.argv[1])
 for slug in SLUGS:
  p=root/'fliskonkurrenten/produkt'/slug/'assets/model.glb'
  target=p.with_name('model-yup-v6.glb');target.write_bytes(canonical(p.read_bytes()))
  print(slug+': Y-up canonical model ready')
