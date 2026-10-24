/* Product 10827 only. Geometry reconstructed from photographs, not a scan.
 * Color/bump textures are sampled from original product photographs at runtime.
 * The originals remain unmodified. Smooth interior and rough exterior use distinct materials. */
import * as THREE from 'three';
const TAU=Math.PI*2;
const hash=(a,b)=>{let h=Math.imul(a|0,374761393)^Math.imul(b|0,668265263);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
function noise(x,y,s=71){let i=Math.floor(x),j=Math.floor(y),u=x-i,v=y-j;u=u*u*(3-2*u);v=v*v*(3-2*v);let a=hash(i*7919+j,s),b=hash((i+1)*7919+j,s),c=hash(i*7919+j+1,s),d=hash((i+1)*7919+j+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function outline(a,b,r,N){
 const pts=[];
 for(let i=0;i<N;i++){
  const t=i/N*TAU,dx=Math.cos(t),dz=Math.sin(t);let low=0,high=Math.hypot(a,b);
  for(let k=0;k<25;k++){let m=(low+high)/2,qx=Math.abs(dx*m)-(a-r),qz=Math.abs(dz*m)-(b-r),d=Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0)-r;if(d>0)high=m;else low=m;}
  let m=(low+high)/2;pts.push([dx*m,dz*m]);
 }
 return pts;
}
function makeBody(){
 const N=384,R=[],pos=[],uv=[],idx=[],materials=[];
 const ext=outline(.35,.205,.014,N),inside=outline(.304,.159,.027,N);
 const rim=ext.map((_,i)=>(noise(i/N*19,4)-.5)*.007+(noise(i/N*55,5)-.5)*.002);
 function ring(xz,yy,type){R.push({xz,yy,type})}
 const outside=[];
 for(let k=0;k<=64;k++){
  let v=k/64;const pts=ext.map(([x,z],j)=>{
   const l=Math.hypot(x,z),s=j/N*2.1;
   const n=noise(s*80,v*28),fine=noise(s*180,v*70,89);
   const pits=Math.pow(Math.max(0,noise(s*110,v*52,97)-.47),1.4)*.026;
   const d=((n-.5)*.009+(fine-.5)*.003-pits)*Math.sin(Math.PI*(.12+.78*v));
   return[x+x/l*d,z+z/l*d];
  });outside.push(pts);ring(pts,pts.map((_,j)=>v*.15+rim[j]*v**5),0);
 }
 for(let k=1;k<=10;k++){
  const v=k/10;ring(ext.map((p,j)=>[outside[64][j][0]*(1-v)+inside[j][0]*v,outside[64][j][1]*(1-v)+inside[j][1]*v]),ext.map((_,j)=>.15+rim[j]*(1-v)-.002*v),v<.7?0:1);
 }
 for(let k=1;k<=32;k++){
  const v=k/32;ring(outline(.304-.017*v**4,.159-.017*v**4,.027,N),ext.map(()=>.148-.103*Math.sin(v*Math.PI/2)),1);
 }
 const floor=R[R.length-1].xz;
 for(let k=1;k<=40;k++){
  const v=k/40;ring(floor.map(([x,z],j)=>[x*(1-v)+Math.cos(j/N*TAU)*.0225*v,z*(1-v)+Math.sin(j/N*TAU)*.0225*v]),ext.map(()=>.045-.005*v),1);
 }
 ring(outline(.0225,.0225,.0225,N),ext.map(()=>.022),1);
 for(let k=1;k<=10;k++){const v=k/10;ring(ext.map(([x,z],j)=>[Math.cos(j/N*TAU)*.0225*(1-v)+outside[0][j][0]*v,Math.sin(j/N*TAU)*.0225*(1-v)+outside[0][j][1]*v]),ext.map(()=>0),0);}
 for(let ri=0;ri<R.length;ri++){
  const rr=R[ri];for(let j=0;j<N;j++){
   const [x,z]=rr.xz[j],y=rr.yy[j];pos.push(x,y,z);
   // Repeating photo patch stays close to physical scale; no generic stone noise texture.
   if(rr.type===0)uv.push(j/N*8.4,y/.15);else uv.push((x+.35)/.7,(z+.205)/.41);
  }
 }
 let start=0;
 const groups=[];
 for(let ri=0;ri<R.length-1;ri++){
  const mat=R[ri].type;
  if(ri===0||mat!==R[ri-1].type){if(ri)groups[groups.length-1].count=idx.length-start;start=idx.length;groups.push({start,count:0,materialIndex:mat})}
  for(let j=0;j<N;j++){const a=ri*N+j,b=ri*N+(j+1)%N,c=a+N,d=b+N;idx.push(a,c,b,b,c,d);}
 }
 groups[groups.length-1].count=idx.length-start;
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
 if(g.attributes.normal.getX(N*20)<0){for(let i=0;i<idx.length;i+=3){const t=idx[i+1];idx[i+1]=idx[i+2];idx[i+2]=t;}g.setIndex(idx);g.computeVertexNormals();}
 groups.forEach(v=>g.addGroup(v.start,v.count,v.materialIndex));g.computeBoundingBox();return g;
}
const cache=new Map();
function photoMaterial(kind,onReady){
 if(cache.has(kind)){const m=cache.get(kind);if(m.map)setTimeout(()=>onReady?.(),0);else m.userData.wait.push(onReady);return m;}
 const rough=kind==='rough';const m=new THREE.MeshStandardMaterial({color:rough?'#bda47e':'#bca17a',roughness:rough?.97:.66,metalness:0,envMapIntensity:.55});m.userData.wait=[onReady];cache.set(kind,m);
 const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{
  const c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d');
  // Both crops lie entirely on the photographed stone: no floor, fingers or drain.
  const r=rough?[180,540,1040,1040]:[1050,1300,400,550];
  ctx.drawImage(image,...r,0,0,1024,1024);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;t.anisotropy=8;
  m.color.set('#ffffff');m.map=t;
  const bump=t.clone();bump.colorSpace=THREE.NoColorSpace;bump.needsUpdate=true;m.bumpMap=bump;m.bumpScale=rough?.0022:.00013;
  m.needsUpdate=true;for(const fn of m.userData.wait.splice(0))fn?.();
 };image.onerror=()=>{console.warn('10827: original photo texture could not load');for(const fn of m.userData.wait.splice(0))fn?.();};
 image.src=new URL('./assets/travertin-10827/'+(rough?'IMG_2781.jpeg':'IMG_2788.jpeg'),import.meta.url).href;
 return m;
}
export function buildTravertin10827(onReady){
 const group=new THREE.Group();group.name='Håndhugget Travertinservant 70×40 – fototekstur';
 const outer=photoMaterial('rough',onReady),inner=photoMaterial('inner',onReady);
 const mesh=new THREE.Mesh(makeBody(),[outer,inner]);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
 const gap=new THREE.Mesh(new THREE.CylinderGeometry(.0226,.0226,.003,64),new THREE.MeshStandardMaterial({color:'#352b20',roughness:1}));gap.position.y=.038;group.add(gap);
 // A solid matching stone lid covers the hole, as in the original photographs.
 const lid=new THREE.Mesh(new THREE.CylinderGeometry(.028,.0275,.006,80),inner);lid.position.y=.046;lid.castShadow=lid.receiveShadow=true;lid.name='Steindeksel';group.add(lid);
 group.userData={id:10827,referenceBased:true,photoTextures:true,spec:{W:.70,D:.41,H:.15},disclaimer:'Fototekstur på en rekonstruert form; ikke en 3D-skanning.'};
 return group;
}
