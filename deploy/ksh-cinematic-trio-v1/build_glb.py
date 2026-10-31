#!/usr/bin/env python3
"""Create 3 ORIGINAL illustrative GLB product meshes, using Python stdlib only.
Not manufacturer CAD. All geometry in metres. Do not use for installation."""
from pathlib import Path
import math,struct,json,sys
OUT=Path(sys.argv[1] if len(sys.argv)>1 else '.');OUT.mkdir(parents=True,exist_ok=True)
def box(out,name,size,at,mat):
 x,y,z=[v/2 for v in size];cx,cy,cz=at
 v=[(cx+sx*x,cy+sy*y,cz+sz*z) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 f=[(0,2,1),(0,3,2),(4,5,6),(4,6,7),(0,1,5),(0,5,4),(1,2,6),(1,6,5),(2,3,7),(2,7,6),(3,0,4),(3,4,7)]
 out.append((name,v,f,mat))
def cylinder(out,name,r,h,at,mat,n=48):
 cx,cy,cz=at
 v=[(cx+r*math.cos(j*2*math.pi/n),cy+r*math.sin(j*2*math.pi/n),z) for z in (cz-h/2,cz+h/2) for j in range(n)]
 v.extend([(cx,cy,cz-h/2),(cx,cy,cz+h/2)])
 f=[]
 for j in range(n):
  k=(j+1)%n;f.extend(((j,k,n+k),(j,n+k,n+j),(2*n,k,j),(2*n+1,n+j,n+k)))
 out.append((name,v,f,mat))
def basin(out,name,cx,cy,z,rx,ry,mat,n=80):
 rings=[(z,rx,ry),(z+.021,rx-.006,ry-.005),(z+.008,rx-.039,ry-.034),(z-.018,rx-.052,ry-.049),(z-.068,rx-.072,ry-.074),(z-.089,rx-.119,ry-.108)]
 v=[(cx+a*math.cos(j*2*math.pi/n),cy+b*math.sin(j*2*math.pi/n),zz) for zz,a,b in rings for j in range(n)]
 f=[]
 for i in range(len(rings)-1):
  for j in range(n):
   k=(j+1)%n;a=i*n+j;b=i*n+k;c=(i+1)*n+k;d=(i+1)*n+j;f.extend(((a,b,c),(a,c,d)))
 v.append((cx,cy,rings[-1][0]));bottom=len(v)-1
 for j in range(n):f.append(((len(rings)-1)*n+j,(len(rings)-1)*n+(j+1)%n,bottom))
 out.append((name,v,f,mat))
def glb(comps,colors,name):
 raw=bytearray();views=[];acc=[];meshes=[];nodes=[]
 materials=[]
 for key,(color,rough,metal) in colors.items():
  rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)]
  materials.append({'name':key,'doubleSided':True,'pbrMetallicRoughness':{'baseColorFactor':rgb+[1.0],'roughnessFactor':rough,'metallicFactor':metal}})
 def write(data,target):
  while len(raw)%4:raw.append(0)
  off=len(raw);raw.extend(data);idx=len(views);views.append({'buffer':0,'byteOffset':off,'byteLength':len(data),'target':target});return idx
 def accessor(view,count,kind,ctype,low=None,high=None):
  x={'bufferView':view,'count':count,'type':kind,'componentType':ctype}
  if low is not None:x.update(min=low,max=high)
  idx=len(acc);acc.append(x);return idx
 for namepart,v,fs,mat in comps:
  normals=[[0.,0.,0.] for a in v]
  for a,b,c in fs:
   u=[v[b][k]-v[a][k] for k in range(3)];w=[v[c][k]-v[a][k] for k in range(3)]
   cross=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]]
   for i in (a,b,c):
    for k in range(3):normals[i][k]+=cross[k]
  n=[]
  for point in normals:
   length=math.sqrt(sum(x*x for x in point)) or 1.;n.append(tuple(x/length for x in point))
  pos=accessor(write(b''.join(struct.pack('<3f',*x) for x in v),34962),len(v),'VEC3',5126,[min(x[k] for x in v) for k in range(3)],[max(x[k] for x in v) for k in range(3)])
  normal=accessor(write(b''.join(struct.pack('<3f',*x) for x in n),34962),len(n),'VEC3',5126)
  ind=accessor(write(b''.join(struct.pack('<I',i) for face in fs for i in face),34963),len(fs)*3,'SCALAR',5125)
  meshes.append({'name':namepart,'primitives':[{'attributes':{'POSITION':pos,'NORMAL':normal},'indices':ind,'mode':4,'material':list(colors).index(mat)}]})
  nodes.append({'name':namepart,'mesh':len(meshes)-1})
 doc={'asset':{'version':'2.0','generator':'SETAEI KSH illustrative GLB builder'},'scene':0,'scenes':[{'nodes':list(range(len(nodes)))}],'nodes':nodes,'meshes':meshes,'materials':materials,'buffers':[{'byteLength':len(raw)}],'bufferViews':views,'accessors':acc,'extras':{'not_manufacturer_cad':True,'not_for_installation':True}}
 j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4);raw+=b'\0'*((-len(raw))%4)
 with open(OUT/name,'wb') as f:
  f.write(struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(raw)));f.write(struct.pack('<I4s',len(j),b'JSON'));f.write(j);f.write(struct.pack('<I4s',len(raw),b'BIN\0'));f.write(raw)
 print(name,len(comps),'mesh parts')
c=[];colors={'fog':('#747f70',.49,0),'front':('#839184',.4,0),'shadow':('#242a28',.72,0),'stone':('#777875',.45,0),'white':('#efefed',.29,0),'metal':('#9eaaa8',.36,.55)}
box(c,'Cabinet',(1.192,.586,.348),(0,0,.174),'fog');box(c,'Drawer gap',(1.182,.018,.005),(0,-.304,.177),'shadow')
for i,z in enumerate((.09,.27)):
 box(c,'Drawer front '+str(i+1),(1.174,.019,.164),(0,-.309,z),'front')
 box(c,'Drawer handle '+str(i+1),(.97,.012,.005),(0,-.322,z+.065),'metal')
box(c,'Turbine Grey top',(1.205,.60,.028),(0,0,.375),'stone')
basin(c,'Right hand Zone bowl',.33,0,.401,.19,.175,'white')
cylinder(c,'Drain',.018,.003,(.33,0,.31),'metal')
glb(c,colors,'vedum-flow-takegronn.glb')
c=[];colors={'felt':('#171719',.9,0),'oak':('#302722',.72,0),'oaklight':('#48382d',.75,0),'grain':('#372b24',.74,0)}
box(c,'Backing felt',(.6,.005,2.798),(0,0,1.399),'felt')
for i in range(14):
 x=-.285+i*.570/13
 box(c,'Dark oak slat '+str(i+1),(.028,.015,2.793),(x,-.010,1.399),'oaklight' if i%3==0 else 'oak')
 box(c,'Oak grain '+str(i+1),(.0014,.0007,2.72),(x-.008,-.018,1.40),'grain')
glb(c,colors,'zup-spilepanel-eik-sort.glb')
c=[];colors={'sand':('#c5b5a1',.87,0),'face':('#d9cabb',.83,0),'stripe':('#cbbba9',.88,0),'vein':('#bfae9b',.94,0)}
box(c,'Tile ceramic body',(.595,.009,1.192),(0,0,.596),'sand')
for i in range(38):
 x=-.288+i*.576/37;box(c,'Relief rib '+str(i+1),(.006,.0016,1.182),(x,-.0055,.596),'stripe' if i%4==0 else 'face')
for i in range(11):
 x=-.275+i*.052;box(c,'Natural grain '+str(i+1),(.0012,.0005,1.16),(x,-.0066,.596),'vein')
glb(c,colors,'colorker-althea-sand-dekor.glb')