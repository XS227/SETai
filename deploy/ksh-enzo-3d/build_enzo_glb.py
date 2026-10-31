#!/usr/bin/env python3
"""Build an original Enzo GLB design approximation using only Python stdlib."""
import argparse, json, math, os, struct
N=144
def loft(rings,start=False,end=False):
    verts=[(rx*math.cos(2*math.pi*k/N),y,rz*math.sin(2*math.pi*k/N)) for y,rx,rz in rings for k in range(N)]
    faces=[]
    for i in range(len(rings)-1):
        for j in range(N):
            nxt=(j+1)%N
            a,b,c,d=i*N+j,(i+1)*N+j,i*N+nxt,(i+1)*N+nxt
            faces.extend(((a,b,d),(a,d,c)))
    if start:
        c=len(verts); verts.append((0,rings[0][0],0))
        for j in range(N):faces.append((c,(j+1)%N,j))
    if end:
        c=len(verts);verts.append((0,rings[-1][0],0))
        off=(len(rings)-1)*N
        for j in range(N):faces.append((c,off+j,off+(j+1)%N))
    return verts,faces
def torus(radius,tube,h):
    verts=[];faces=[];ns=64;ts=12
    for a in range(ns):
        phi=2*math.pi*a/ns
        for b in range(ts):
            theta=2*math.pi*b/ts
            rad=radius+tube*math.cos(theta)
            verts.append((rad*math.cos(phi),h+tube*math.sin(theta),rad*math.sin(phi)))
    for a in range(ns):
        for b in range(ts):
            aa=(a+1)%ns; bb=(b+1)%ts
            i,j,k,l=a*ts+b,aa*ts+b,a*ts+bb,aa*ts+bb
            faces.extend(((i,k,l),(i,l,j)))
    return verts,faces
def normals(verts,faces):
    n=[[0.,0.,0.] for _ in verts]
    for a,b,c in faces:
        x,y,z=verts[a],verts[b],verts[c]
        u=[y[i]-x[i] for i in range(3)];v=[z[i]-x[i] for i in range(3)]
        q=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
        for t in (a,b,c):
            for k in range(3):n[t][k]+=q[k]
    out=[]
    for x in n:
        d=math.sqrt(sum(z*z for z in x)) or 1.
        out.append(tuple(z/d for z in x))
    return out
def build(path):
    exterior=[(.048,.730,.320),(.052,.745,.334),(.082,.774,.356),(.150,.801,.372),(.260,.839,.400),(.410,.867,.424),(.540,.888,.442),(.620,.895,.450),(.645,.895,.450),(.656,.886,.440),(.660,.850,.403),(.649,.806,.354)]
    interior=[exterior[-1],(.633,.785,.338),(.600,.770,.328),(.510,.744,.318),(.420,.709,.305),(.328,.670,.280),(.256,.610,.253),(.210,.526,.218),(.182,.419,.175),(.168,.306,.132),(.162,.185,.082),(.160,.062,.029)]
    parts=[('Enzo exterior',*loft(exterior,start=True),0),('Enzo interior',*loft(interior,end=True),1),('Chrome drain',*torus(.033,.007,.165),2),('Drain inner',*loft([(.163,.025,.025),(.166,.025,.025)],start=True,end=True),3)]
    mats=[
        {'name':'Enzo exterior','pbrMetallicRoughness':{'baseColorFactor':[.925,.935,.929,1],'metallicFactor':0,'roughnessFactor':.37},'doubleSided':True},
        {'name':'Enzo interior','pbrMetallicRoughness':{'baseColorFactor':[.985,.984,.976,1],'metallicFactor':0,'roughnessFactor':.31},'doubleSided':True},
        {'name':'Chrome trim','pbrMetallicRoughness':{'baseColorFactor':[.83,.85,.86,1],'metallicFactor':.94,'roughnessFactor':.22},'doubleSided':True},
        {'name':'Drain dark','pbrMetallicRoughness':{'baseColorFactor':[.22,.24,.25,1],'metallicFactor':.4,'roughnessFactor':.33},'doubleSided':True}]
    data=bytearray();views=[];acc=[];meshes=[];nodes=[]
    def put(raw,target):
        while len(data)%4:data.append(0)
        off=len(data);data.extend(raw)
        idx=len(views);views.append({'buffer':0,'byteOffset':off,'byteLength':len(raw),'target':target})
        return idx
    def accessor(view,component,count,typ,lo=None,hi=None):
        x={'bufferView':view,'componentType':component,'count':count,'type':typ}
        if lo is not None:x['min']=lo;x['max']=hi
        idx=len(acc);acc.append(x);return idx
    for name,verts,faces,material in parts:
        pos=put(b''.join(struct.pack('<3f',*x) for x in verts),34962)
        nor=put(b''.join(struct.pack('<3f',*x) for x in normals(verts,faces)),34962)
        ind=put(b''.join(struct.pack('<I',v) for f in faces for v in f),34963)
        p=accessor(pos,5126,len(verts),'VEC3',[min(x[i] for x in verts) for i in range(3)],[max(x[i] for x in verts) for i in range(3)])
        n=accessor(nor,5126,len(verts),'VEC3')
        i=accessor(ind,5125,len(faces)*3,'SCALAR')
        meshes.append({'name':name,'primitives':[{'attributes':{'POSITION':p,'NORMAL':n},'indices':i,'material':material,'mode':4}]})
        nodes.append({'name':name,'mesh':len(meshes)-1})
    gltf={'asset':{'version':'2.0','generator':'SETAEI original parametric Enzo concept; NOT manufacturer CAD'},
          'scenes':[{'nodes':list(range(len(nodes)))}],'scene':0,'nodes':nodes,
          'meshes':meshes,'materials':mats,'buffers':[{'byteLength':len(data)}],'bufferViews':views,'accessors':acc,
          'extras':{'notice':'Illustrative only; external envelope L179 W90 H66 cm; not for installation.'}}
    j=json.dumps(gltf,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
    data+=b'\x00'*((-len(data))%4)
    size=12+8+len(j)+8+len(data)
    os.makedirs(os.path.dirname(os.path.abspath(path)),exist_ok=True)
    with open(path,'wb') as f:
        f.write(struct.pack('<4sII',b'glTF',2,size))
        f.write(struct.pack('<I4s',len(j),b'JSON'));f.write(j)
        f.write(struct.pack('<I4s',len(data),b'BIN\x00'));f.write(data)
    print('Enzo concept GLB built',path,'size',size)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',default='enzo-concept.glb')
    build(p.parse_args().output)
