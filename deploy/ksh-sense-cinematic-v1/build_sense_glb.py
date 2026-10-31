#!/usr/bin/env python3
"""Sanipro Sense 170x80x60 - GLB from same parametric control rings as Blender 3D Jutsu rev 2.
Original geometrical approximation, NOT supplier CAD. No external packages required.
"""
from __future__ import annotations
import math, json, struct, pathlib, argparse
N=72
# height, length, width, front radius, back-to-wall radius (metres)
RINGS=[(.012,1.55,.725,.130,.018),(.025,1.62,.770,.145,.025),
 (.052,1.67,.795,.165,.027),(.090,1.695,.800,.172,.030),
 (.510,1.695,.800,.172,.030),(.566,1.688,.800,.169,.030),
 (.589,1.670,.788,.162,.030),(.600,1.632,.768,.150,.030),
 (.600,1.577,.700,.156,.038),(.582,1.508,.652,.160,.038),
 (.547,1.465,.635,.169,.040),(.445,1.420,.605,.173,.042),
 (.300,1.330,.560,.168,.042),(.195,1.214,.500,.154,.044),
 (.143,1.119,.438,.132,.038)]

def rounded(l,w,fr,br,z):
 out=[]
 for x,y,r,start in [(l/2-fr,-w/2+fr,fr,-90),(l/2-br,w/2-br,br,0),(-l/2+br,w/2-br,br,90),(-l/2+fr,-w/2+fr,fr,180)]:
  for j in range(18):
   a=math.radians(start+5*j);out.append((x+r*math.cos(a),y+r*math.sin(a),z))
 return out

def make_shell():
 vs=[(x*1.7/1.695,y,(z-.012)*(.60/.588)) for z,l,w,rf,rb in RINGS for x,y,_ in rounded(l,w,rf,rb,z)]
 # fix y values above generated from x/y/z; retain rescaled z from ring
 fs=[];materials=[]
 for k in range(len(RINGS)-1):
  for j in range(N):
   t=(j+1)%N
   fs.append((k*N+j,k*N+t,(k+1)*N+t,(k+1)*N+j))
   materials.append(1 if k in [6,7,8] else 2 if k>=9 else 0)
 bc=len(vs);vs.append((0,0,0));ic=len(vs);vs.append((0,0,(.143-.012)*.60/.588))
 for j in range(N):
  fs.append((bc,(j+1)%N,j));materials.append(0)
  fs.append(((len(RINGS)-1)*N+j,(len(RINGS)-1)*N+(j+1)%N,ic));materials.append(2)
 return vs,fs,materials

def cylinder(cx,cy,cz,rx,ry,h,num=80):
 vs=[]
 for z in [cz-h/2,cz+h/2]:
  for k in range(num):
   a=2*math.pi*k/num;vs.append((cx+rx*math.cos(a),cy+ry*math.sin(a),z))
 fs=[]
 for j in range(num):
  t=(j+1)%num;fs.extend([(j,t,num+t),(j,num+t,num+j)])
 bottom=len(vs);vs.append((cx,cy,cz-h/2));top=len(vs);vs.append((cx,cy,cz+h/2))
 for j in range(num):
  t=(j+1)%num;fs.append((bottom,t,j));fs.append((top,num+j,num+t))
 return vs,fs

def torus(cx,cy,cz,r=.029,tube=.0045,major=80,minor=10):
 vs=[];fs=[]
 for a in range(major):
  phi=2*math.pi*a/major
  for b in range(minor):
   th=2*math.pi*b/minor;rr=r+tube*math.cos(th)
   vs.append((cx+rr*math.cos(phi),cy+rr*math.sin(phi),cz+tube*math.sin(th)))
 for a in range(major):
  for b in range(minor):
   p=a*minor+b;q=((a+1)%major)*minor+b;r0=((a+1)%major)*minor+(b+1)%minor;t=a*minor+(b+1)%minor
   fs.extend([(p,q,r0),(p,r0,t)])
 return vs,fs

def cuboid(cx,cy,cz,w,d,h):
 vs=[(cx+dx*w/2,cy+dy*d/2,cz+dz*h/2) for dz in [-1,1] for dy in [-1,1] for dx in [-1,1]]
 fs=[(0,2,3),(0,3,1),(4,5,7),(4,7,6),(0,1,5),(0,5,4),(2,6,7),(2,7,3),(0,4,6),(0,6,2),(1,3,7),(1,7,5)]
 return vs,fs

def normals(vs,fs):
 ns=[[0.,0.,0.] for _ in vs]
 for polygon in fs:
  if len(polygon)==4:
   aa,bb,cc,dd=polygon
  else:
   aa,bb,cc=polygon;dd=None
  a,b,c=vs[aa],vs[bb],vs[cc]
  u=[b[i]-a[i] for i in range(3)];v=[c[i]-a[i] for i in range(3)]
  cr=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
  for idx in ((aa,bb,cc,dd) if dd is not None else (aa,bb,cc)):
   for j in range(3):ns[idx][j]+=cr[j]
 return [tuple(z/(math.sqrt(sum(x*x for x in v)) or 1) for z in v) for v in ns]

def build(outfile):
 mats=[('Sense · hvit utside',(.87,.875,.863),0,.30),('Sense · polert kant',(.956,.965,.953),0,.20),('Sense · skål',(.963,.973,.965),0,.17),('Børstet krom',(.65,.69,.72),.88,.18),('Mørkt overløp/sluk',(.035,.039,.043),.25,.32)]
 materials=[{'name':name,'pbrMetallicRoughness':{'baseColorFactor':list(c)+[1], 'metallicFactor':metal,'roughnessFactor':rough},'doubleSided':True} for name,c,metal,rough in mats]
 shell_v,shell_f,mi=make_shell()
 groups=[]
 for material_idx in [0,1,2]:groups.append(('Sense basin / '+mats[material_idx][0],shell_v,[f for f,i in zip(shell_f,mi) if i==material_idx],material_idx))
 groups.append(('Sluk mørkt',*cylinder(0,-.025,.125,.029,.029,.0014),4))
 groups.append(('Sluk kromkant',*torus(0,-.025,.13),3))
 groups.append(('Overløp åpning',*cuboid(0,.317,.496,.077,.008,.006),4))
 groups.append(('Overløp kromlist',*cuboid(0,.318,.501,.085,.006,.0018),3))
 # glTF is Y-up; Blender is Z-up => convert (x,y,z)->(x,z,-y)
 def gltfcoords(v):return [(x,z,-y) for x,y,z in v]
 blob=bytearray();views=[];accessors=[];nodes=[];meshes=[]
 def block(buf,target):
  while len(blob)%4:blob.append(0)
  off=len(blob);blob.extend(buf);idx=len(views)
  views.append({'buffer':0,'byteOffset':off,'byteLength':len(buf),'target':target});return idx
 def acc(view,component,count,typ,lo=None,hi=None):
  a={'bufferView':view,'componentType':component,'count':count,'type':typ}
  if lo is not None:a['min']=lo;a['max']=hi
  accessors.append(a);return len(accessors)-1
 for name,base_vertices,faces,material_index in groups:
  coords=gltfcoords(base_vertices);n=normals(coords,faces)
  ps=block(b''.join(struct.pack('<fff',*x) for x in coords),34962)
  ns=block(b''.join(struct.pack('<fff',*x) for x in n),34962)
  triangles=[(f[0],f[1],f[2]) for f in faces]+[(f[0],f[2],f[3]) for f in faces if len(f)==4]
  inds=block(b''.join(struct.pack('<I',i) for f in triangles for i in f),34963)
  pa=acc(ps,5126,len(coords),'VEC3',[min(x[j] for x in coords) for j in range(3)],[max(x[j] for x in coords) for j in range(3)])
  na=acc(ns,5126,len(n),'VEC3');ia=acc(inds,5125,len(triangles)*3,'SCALAR')
  nodes.append({'name':name,'mesh':len(meshes)})
  meshes.append({'name':name,'primitives':[{'attributes':{'POSITION':pa,'NORMAL':na},'indices':ia,'material':material_index,'mode':4}]})
 doc={'asset':{'version':'2.0','generator':'SETAEI KSH parametric Sanipro Sense v1 — 3D Jutsu rev2 ring specification'},
 'scene':0,'scenes':[{'nodes':list(range(len(nodes)))}], 'nodes':nodes, 'meshes':meshes, 'materials':materials,
 'buffers':[{'byteLength':len(blob)}],'bufferViews':views,'accessors':accessors,
 'extras':{'disclaimer':'Visual 3D concept based on product dimensions and reference photos. Not manufacturer CAD.','dimensions_m':[1.7,.8,.6]}}
 js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*((-len(js))%4);blob+=b'\x00'*((-len(blob))%4)
 outfile=pathlib.Path(outfile);outfile.parent.mkdir(parents=True,exist_ok=True)
 with outfile.open('wb') as f:
  f.write(struct.pack('<4sII',b'glTF',2,12+8+len(js)+8+len(blob)))
  f.write(struct.pack('<I4s',len(js),b'JSON'));f.write(js)
  f.write(struct.pack('<I4s',len(blob),b'BIN\x00'));f.write(blob)
 print('OK Sense GLB:',outfile,'size',outfile.stat().st_size,'meshes',len(meshes))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',default='assets/sanipro-sense-170x80.glb')
 a=p.parse_args();build(a.output)

