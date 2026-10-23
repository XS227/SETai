/* Stenhuset digital showroom: real-time 3D room with physically based stone materials.
 * Real walls, floor, ceiling, window with a sun shadow, per-room furnishing (bath, kitchen, living room).
 * Stone surfaces come from stone-textures-v1.js (tiled layout, joints, pores, veining, glaze).
 * If WebGL or the module fails, the old 2D canvas in index.html keeps working. */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {generateStone,STONES,T} from './stone-textures-v1.js';
import {SINKS,buildSink} from './sinks3d-v1.js?v=1';

/* selected stenvask in the bathroom (product id) or null for the generic basin */
let SINK_ID=null;

const MOBILE=typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches;
const N_QUICK=512,N_FULL=MOBILE?1024:1280;
const H=2.7,TH=.14;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
let maxAniso=4;

/* ---------- surface materials (stone textures swapped in asynchronously) ---------- */
const surf=new Map();
function dataTex(arr,N,srgb){
  const t=new THREE.DataTexture(new Uint8Array(arr.buffer),N,N,THREE.RGBAFormat);
  t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;
  t.generateMipmaps=true;t.anisotropy=maxAniso;t.needsUpdate=true;return t;
}
function surfaceMaterial(id){
  let m=surf.get(id);if(m)return m;
  const k=STONES[id].kind,opts={roughness:1,metalness:0,envMapIntensity:.85};
  if(k==='zellige')m=new THREE.MeshPhysicalMaterial({...opts,clearcoat:.6,clearcoatRoughness:.1});
  else if(k==='marble')m=new THREE.MeshPhysicalMaterial({...opts,clearcoat:.14,clearcoatRoughness:.22});
  else m=new THREE.MeshStandardMaterial(opts);
  m.userData={level:0,loading:false};surf.set(id,m);return m;
}
function applyData(m,d){
  for(const k of ['map','normalMap','roughnessMap'])m[k]?.dispose();
  m.map=dataTex(d.albedo,d.N,true);m.normalMap=dataTex(d.normal,d.N,false);m.roughnessMap=dataTex(d.rough,d.N,false);
  m.needsUpdate=true;
}
function runGen(id,N,onProgress){
  return new Promise((res,rej)=>{
    const g=generateStone(id,N);
    const step=()=>{
      try{
        const t0=performance.now();let r;
        do{r=g.next();}while(!r.done&&performance.now()-t0<10);
        if(r.done)res(r.value);else{onProgress&&onProgress(r.value);setTimeout(step,0);}
      }catch(e){rej(e);}
    };
    step();
  });
}
let onTexture=()=>{},onBusy=()=>{};
async function ensureSurface(id){
  const m=surfaceMaterial(id);
  if(m.userData.level>=1)return m;
  onBusy(1);
  try{applyData(m,await runGen(id,N_QUICK));m.userData.level=1;onTexture();}finally{onBusy(-1);}
  if(!m.userData.loading){
    m.userData.loading=true;onBusy(1);
    runGen(id,N_FULL).then(d=>{applyData(m,d);m.userData.level=2;onTexture();}).catch(()=>{}).finally(()=>onBusy(-1));
  }
  return m;
}

/* ---------- plain materials ---------- */
const std=(color,rough,extra)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:0,...extra});
const MAT={
  shell:std('#e7e2d9',.95),paint:std('#ece8e0',.9),skirt:std('#f1eee8',.55),
  frame:std('#2a2c2b',.45,{metalness:.5}),
  brass:std('#b7945b',.28,{metalness:1}),steel:std('#aeb2b3',.22,{metalness:1}),
  ceramic:new THREE.MeshPhysicalMaterial({color:'#f5f3ee',roughness:.12,clearcoat:.8,clearcoatRoughness:.08}),
  cabinet:std('#c9c2b4',.62),cabinetDark:std('#8a8478',.7),oak:std('#a98660',.55),darkWood:std('#4a3a2e',.5),
  linen:std('#d6cbba',.97),wool:std('#dcd4c6',1),leaf:std('#566f48',.55),pot:std('#b8977c',.8),
  mirror:new THREE.MeshStandardMaterial({color:'#ffffff',metalness:1,roughness:.03,envMapIntensity:1.6}),
  dark:std('#2b2b29',.6),lampShade:new THREE.MeshStandardMaterial({color:'#f3e5c8',roughness:.9,emissive:'#ffcf8a',emissiveIntensity:0}),
  hang:new THREE.MeshStandardMaterial({color:'#f6ebd5',roughness:.5,emissive:'#ffd391',emissiveIntensity:0})
};
let gradAO=null;
function aoTexture(){
  if(gradAO)return gradAO;
  const c=mk(4,64),g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,64);
  gr.addColorStop(0,'rgba(30,22,14,0)');gr.addColorStop(.55,'rgba(30,22,14,.18)');gr.addColorStop(1,'rgba(30,22,14,.95)');
  g.fillStyle=gr;g.fillRect(0,0,4,64);
  gradAO=new THREE.CanvasTexture(c);gradAO.colorSpace=THREE.SRGBColorSpace;return gradAO;
}
const aoMat=()=>new THREE.MeshBasicMaterial({map:aoTexture(),transparent:true,depthWrite:false,opacity:.55,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,toneMapped:true});

/* ---------- geometry helpers ---------- */
function bakeUV(geo){
  const p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv;
  for(let i=0;i<p.count;i++){
    const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));
    let a,b;
    if(ay>=ax&&ay>=az){a=p.getX(i);b=p.getZ(i);}else if(ax>=az){a=p.getZ(i);b=p.getY(i);}else{a=p.getX(i);b=p.getY(i);}
    uv.setXY(i,a/T,b/T);
  }
  uv.needsUpdate=true;
}
function boxMesh(x0,x1,y0,y1,z0,z1,mats){
  const g=new THREE.BoxGeometry(x1-x0,y1-y0,z1-z0);
  g.translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);bakeUV(g);
  const m=new THREE.Mesh(g,mats);m.castShadow=m.receiveShadow=true;return m;
}
function faceMats(inner,idx,mat){const a=Array(6).fill(inner);a[idx]=mat;return a;}
function rbox(w,h,d,r,mat,x,y,z){
  const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/2-.001,h/2-.001,d/2-.001)),mat);
  m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;return m;
}
function cyl(rt,rb,h,mat,x,y,z,seg=32){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;return m;
}
function stoneBox(w,h,d,r,mat,x,y,z){const m=rbox(w,h,d,r,mat,x,y,z);m.geometry.translate(x,y,z);m.position.set(0,0,0);bakeUV(m.geometry);return m;}
function aoStrip(a,b,dir,width,opacity){
  const a2=a.clone().addScaledVector(dir,width),b2=b.clone().addScaledVector(dir,width);
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute([...a.toArray(),...b.toArray(),...b2.toArray(),...a2.toArray()],3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));g.setIndex([0,1,2,0,2,3]);
  const m=aoMat();m.opacity=opacity;const mesh=new THREE.Mesh(g,m);mesh.renderOrder=2;return mesh;
}

/* ---------- furnishing ---------- */
function plant(x,z,s=1){
  const g=new THREE.Group();
  g.add(cyl(.17*s,.12*s,.34*s,MAT.pot,0,.17*s,0));
  for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2,lean=.35+.5*((i*37%10)/10);
    const leaf=new THREE.Mesh(new THREE.SphereGeometry(.09*s,10,8),MAT.leaf);
    leaf.scale.set(.32,1.7,.1);leaf.position.set(Math.cos(a)*.1*s,.62*s+.2*s*((i%4)/4),Math.sin(a)*.1*s);
    leaf.rotation.set(Math.sin(a)*lean,0,-Math.cos(a)*lean);leaf.castShadow=true;g.add(leaf);
  }
  g.position.set(x,0,z);return g;
}
function lamp(x,z,h,lights,power){
  const g=new THREE.Group();
  g.add(cyl(.12,.14,.02,MAT.dark,0,.01,0));g.add(cyl(.012,.012,h,MAT.brass,0,h/2,0,12));
  const sh=new THREE.Mesh(new THREE.CylinderGeometry(.14,.22,.26,32,1,true),MAT.lampShade);sh.material.side=THREE.DoubleSide;sh.position.y=h+.05;g.add(sh);
  const pl=new THREE.PointLight('#ffc27a',0,7,1.6);pl.position.set(x,h,z);lights.push({l:pl,power});
  g.position.set(x,0,z);return {g,pl};
}
function faucet(x,y,z,rot){
  const g=new THREE.Group();
  g.add(cyl(.014,.014,.26,MAT.brass,0,.13,0,16));
  const sp=cyl(.011,.011,.14,MAT.brass,0,.26,.07,16);sp.rotation.x=Math.PI/2;g.add(sp);
  g.add(cyl(.03,.03,.02,MAT.brass,0,.01,0,16));g.position.set(x,y,z);g.rotation.y=rot||0;return g;
}
function artCanvas(){
  const c=mk(256,192),g=c.getContext('2d');
  g.fillStyle='#e9e1d4';g.fillRect(0,0,256,192);
  g.fillStyle='#c99a7d';g.beginPath();g.arc(88,100,58,0,7);g.fill();
  g.fillStyle='#6f7a68';g.beginPath();g.arc(150,86,42,0,7);g.fill();
  g.fillStyle='#2d2f2c';g.fillRect(40,150,176,6);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

/* Persian rug: medallion field, floral border, wool grain and fringe, all drawn procedurally (no image files) */
const rugCache=new Map();
function rugTextures(W,H){
  const key=W+'x'+H;if(rugCache.has(key))return rugCache.get(key);
  const c=mk(W,H),g=c.getContext('2d'),S=Math.min(W,H);
  const RED='#7a1d1e',DEEP='#561315',IVORY='#e9dcbd',INDIGO='#1d2c52',GOLD='#c7a04c',TEAL='#2e5a5a',BLUE='#34528a';
  let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  g.fillStyle=DEEP;g.fillRect(0,0,W,H);
  // borders (outer to inner)
  const rings=[[0,IVORY],[S*.012,RED],[S*.03,INDIGO],[S*.145,IVORY],[S*.153,RED],[S*.172,GOLD],[S*.178,DEEP]];
  for(const [i,col] of rings){g.fillStyle=col;g.fillRect(i,i,W-i*2,H-i*2);}
  // floral motifs along the main indigo border
  const flower=(x,y,r,a,b)=>{
    for(let k=0;k<8;k++){g.save();g.translate(x,y);g.rotate(k*Math.PI/4);g.fillStyle=k%2?a:b;g.beginPath();g.ellipse(0,-r*.62,r*.26,r*.5,0,0,7);g.fill();g.restore();}
    g.fillStyle=GOLD;g.beginPath();g.arc(x,y,r*.26,0,7);g.fill();g.fillStyle=RED;g.beginPath();g.arc(x,y,r*.11,0,7);g.fill();
  };
  const bw=S*.115,bc=S*.03+bw/2,step=S*.095;
  for(let x=S*.12;x<W-S*.1;x+=(W-S*.24)/Math.round((W-S*.24)/step)){flower(x,bc,bw*.42,IVORY,TEAL);flower(x,H-bc,bw*.42,IVORY,TEAL);
    g.fillStyle=GOLD;for(const y of [bc,H-bc])for(const dx of [-step/2]){g.beginPath();g.arc(x+dx,y,bw*.07,0,7);g.fill();}}
  for(let y=S*.12;y<H-S*.1;y+=(H-S*.24)/Math.round((H-S*.24)/step)){flower(bc,y,bw*.42,IVORY,TEAL);flower(W-bc,y,bw*.42,IVORY,TEAL);
    g.fillStyle=GOLD;for(const x of [bc,W-bc]){g.beginPath();g.arc(x,y+step/2,bw*.07,0,7);g.fill();}}
  for(const [x,y] of [[bc,bc],[W-bc,bc],[bc,H-bc],[W-bc,H-bc]])flower(x,y,bw*.55,GOLD,BLUE);
  // field lattice
  const f0=S*.178,fx=W/2,fy=H/2;
  g.save();g.beginPath();g.rect(f0,f0,W-f0*2,H-f0*2);g.clip();
  g.fillStyle=RED;g.fillRect(f0,f0,W-f0*2,H-f0*2);
  const cell=S*.075;
  for(let y=f0-cell;y<H;y+=cell)for(let x=f0-cell;x<W;x+=cell){
    const odd=(Math.round((x-f0)/cell)+Math.round((y-f0)/cell))%2;
    g.save();g.translate(x+cell/2,y+cell/2);g.rotate(Math.PI/4);
    g.strokeStyle='rgba(233,220,189,.30)';g.lineWidth=S*.004;g.strokeRect(-cell*.3,-cell*.3,cell*.6,cell*.6);
    g.fillStyle=odd?'rgba(199,160,76,.55)':'rgba(29,44,82,.45)';g.fillRect(-cell*.11,-cell*.11,cell*.22,cell*.22);g.restore();
    g.strokeStyle='rgba(86,19,21,.5)';g.lineWidth=S*.006;g.beginPath();g.moveTo(x,y+cell);g.quadraticCurveTo(x+cell*.5,y+cell*.35,x+cell,y+cell);g.stroke();
  }
  // corner spandrels
  g.fillStyle=INDIGO;
  const sp=S*.27;
  for(const [sx,sy] of [[1,1],[-1,1],[1,-1],[-1,-1]]){
    const ox=sx>0?f0:W-f0,oy=sy>0?f0:H-f0;
    g.beginPath();g.moveTo(ox,oy);g.lineTo(ox+sx*sp,oy);g.quadraticCurveTo(ox+sx*sp*.45,oy+sy*sp*.45,ox,oy+sy*sp);g.closePath();g.fill();
    g.strokeStyle=IVORY;g.lineWidth=S*.007;g.stroke();
    g.fillStyle=GOLD;g.beginPath();g.arc(ox+sx*sp*.2,oy+sy*sp*.2,S*.018,0,7);g.fill();g.fillStyle=INDIGO;
  }
  // central medallion with pendants
  const mr=Math.min(W,H)*.30,my=mr*1.42;
  const lozenge=(rx,ry,fill)=>{g.beginPath();g.moveTo(fx,fy-ry);
    g.bezierCurveTo(fx+rx*.35,fy-ry*.55,fx+rx,fy-ry*.3,fx+rx,fy);g.bezierCurveTo(fx+rx,fy+ry*.3,fx+rx*.35,fy+ry*.55,fx,fy+ry);
    g.bezierCurveTo(fx-rx*.35,fy+ry*.55,fx-rx,fy+ry*.3,fx-rx,fy);g.bezierCurveTo(fx-rx,fy-ry*.3,fx-rx*.35,fy-ry*.55,fx,fy-ry);g.closePath();g.fillStyle=fill;g.fill();};
  const pend=H>W?1.5:1;
  for(const d of [-1,1]){const py=fy+d*my*1.18*pend;if(py>f0+S*.06&&py<H-f0-S*.06){g.save();g.translate(0,py-fy);g.beginPath();g.moveTo(fx,fy-S*.1);g.lineTo(fx+S*.07,fy);g.lineTo(fx,fy+S*.1);g.lineTo(fx-S*.07,fy);g.closePath();g.fillStyle=INDIGO;g.fill();g.strokeStyle=GOLD;g.lineWidth=S*.006;g.stroke();g.restore();}}
  lozenge(mr*1.05,my*1.06,IVORY);lozenge(mr*.98,my*.98,INDIGO);lozenge(mr*.8,my*.8,RED);lozenge(mr*.66,my*.66,IVORY);lozenge(mr*.6,my*.6,TEAL);lozenge(mr*.42,my*.42,INDIGO);
  g.strokeStyle=GOLD;g.lineWidth=S*.006;
  for(const k of [.9,.7,.5]){g.beginPath();g.moveTo(fx,fy-my*k);g.lineTo(fx+mr*k,fy);g.lineTo(fx,fy+my*k);g.lineTo(fx-mr*k,fy);g.closePath();g.stroke();}
  flower(fx,fy,mr*.34,IVORY,GOLD);
  g.restore();
  // wool: abrash bands, grain, weave
  for(let i=0;i<14;i++){const y=rnd()*H,h=S*(.02+rnd()*.06);g.fillStyle=rnd()>.5?'rgba(255,200,150,.045)':'rgba(30,10,20,.06)';g.fillRect(0,y,W,h);}
  for(let i=0;i<W*H/38;i++){g.fillStyle=rnd()>.5?'rgba(255,240,220,.07)':'rgba(20,5,5,.09)';g.fillRect(rnd()*W,rnd()*H,1+rnd()*2,1);}
  g.fillStyle='rgba(20,8,8,.05)';for(let y=0;y<H;y+=3)g.fillRect(0,y,W,1);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=maxAniso;map.needsUpdate=true;
  // knot bump tile
  const b=mk(16,16),bg=b.getContext('2d');bg.fillStyle='#808080';bg.fillRect(0,0,16,16);
  for(let y=0;y<16;y+=4)for(let x=0;x<16;x+=4){bg.fillStyle=((x+y)/4)%2?'#9a9a9a':'#6c6c6c';bg.fillRect(x,y,4,3);}
  const bump=new THREE.CanvasTexture(b);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.anisotropy=maxAniso;
  // fringe strip (alpha)
  const fr=mk(512,48),fg=fr.getContext('2d');fg.strokeStyle='#efe6d2';fg.lineWidth=2.2;
  for(let x=2;x<512;x+=5){fg.beginPath();fg.moveTo(x,0);fg.bezierCurveTo(x+(rnd()-.5)*6,16,x+(rnd()-.5)*10,32,x+(rnd()-.5)*12,47);fg.stroke();}
  const fringe=new THREE.CanvasTexture(fr);fringe.colorSpace=THREE.SRGBColorSpace;
  const res={map,bump,fringe};rugCache.set(key,res);return res;
}
function persianRug(rw,rl,x,z){
  const W=1024,H=Math.max(512,Math.round(1024*rl/rw));
  const t=rugTextures(W,H),g=new THREE.Group();
  const top=new THREE.Mesh(new THREE.PlaneGeometry(rw,rl),new THREE.MeshStandardMaterial({map:t.map,bumpMap:t.bump,bumpScale:1.4,roughness:1,metalness:0,envMapIntensity:.4}));
  t.bump.repeat.set(rw*55,rl*55);
  top.rotation.x=-Math.PI/2;top.position.set(0,.022,0);top.receiveShadow=true;g.add(top);
  const pad=rbox(rw-.004,.018,rl-.004,.006,MAT.wool,0,.011,0);g.add(pad);
  for(const s of [-1,1]){
    const f=new THREE.Mesh(new THREE.PlaneGeometry(rw,.1),new THREE.MeshStandardMaterial({map:t.fringe,transparent:true,alphaTest:.3,roughness:1,side:THREE.DoubleSide}));
    f.rotation.x=-Math.PI/2;f.position.set(0,.012,s*(rl/2+.05));f.receiveShadow=true;g.add(f);
  }
  g.position.set(x,0,z);return g;
}

function wallFaucet(x,y,z){
  // wall-mounted spout, as used with vessel sinks
  const g=new THREE.Group();
  const plate=cyl(.032,.032,.012,MAT.brass,0,0,0,24);plate.rotation.x=Math.PI/2;g.add(plate);
  const sp=cyl(.011,.011,.17,MAT.brass,0,0,.085,16);sp.rotation.x=Math.PI/2;g.add(sp);
  const tip=cyl(.013,.011,.02,MAT.brass,0,-.008,.168,16);g.add(tip);
  const knob=cyl(.018,.018,.03,MAT.brass,.09,0,.015,16);knob.rotation.x=Math.PI/2;g.add(knob);
  g.position.set(x,y,z);return g;
}
function furnishBath(G,st,fm,lights,hx,hz){
  const sk=SINK_ID&&SINKS[SINK_ID]?SINKS[SINK_ID]:null;
  let vw=clamp(st.w*.34,.8,1.4),vd=.5;
  if(sk){vw=clamp(Math.max(vw,sk.W+.24),.8,Math.min(1.9,hx*2-.7));vd=Math.max(.5,sk.D+.06);}
  const vx=-hx*.18,vz=-hz+vd/2+.02,TOP=.91;
  let rimY=TOP+.06;
  if(sk&&sk.top){
    // the stone itself is the vanity top: a slim oak drawer under it
    const s=buildSink(SINK_ID,()=>onTexture());s.position.set(vx,TOP-sk.H,vz);G.add(s);
    G.add(rbox(Math.min(vw,sk.W)-.04,.24,sk.D-.04,.012,MAT.oak,vx,TOP-sk.H-.12,vz));
    G.add(wallFaucet(vx+(sk.offset||0),TOP+.16,-hz));rimY=TOP;
  }else{
    G.add(stoneBox(vw,.5,vd,.015,fm,vx,.66,vz));
    if(sk){
      const s=buildSink(SINK_ID,()=>onTexture());s.position.set(vx,TOP,vz);G.add(s);rimY=TOP+sk.H;
      if(sk.splash)G.add(wallFaucet(vx,TOP+sk.H+sk.splash.h*.62,vz-sk.D/2+.026));
      else G.add(wallFaucet(vx,TOP+sk.H+.13,-hz));
    }else{
      G.add(cyl(.2,.16,.13,MAT.ceramic,vx,.97,vz));
      G.add(faucet(vx,.9,-hz+.12,0));
    }
  }
  const my=Math.max(1.62,rimY+.62);
  const mir=new THREE.Mesh(new THREE.CircleGeometry(.44,48),MAT.mirror);mir.position.set(vx,my,-hz+.012);G.add(mir);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.44,.011,12,64),MAT.brass);ring.position.copy(mir.position);ring.position.z+=.004;G.add(ring);
  // freestanding bath
  const pts=[[0,.07],[.32,.07],[.45,.2],[.5,.5],[.485,.575],[.44,.585],[.41,.55],[.37,.46],[.3,.2],[.0,.17]].map(p=>new THREE.Vector2(p[0],p[1]));
  const tub=new THREE.Mesh(new THREE.LatheGeometry(pts,64),new THREE.MeshPhysicalMaterial({color:'#f6f4ef',roughness:.14,clearcoat:.7,side:THREE.DoubleSide}));
  const k=clamp(Math.min(st.w/3.4,st.l/4.2),.7,1.1);
  tub.scale.set(1.62*k,1,.82*k);tub.rotation.y=Math.PI/2;tub.position.set(-hx+.62*k+.1,0,hz*.28);tub.castShadow=tub.receiveShadow=true;G.add(tub);
  const tf=faucet(0,.58,0,Math.PI/2);tf.position.set(-hx+.2,.5,hz*.28);tf.scale.set(1,1.5,1);G.add(tf);
  // stool + towel
  G.add(cyl(.17,.17,.45,MAT.oak,hx-.5,.225,-hz*.25));
  G.add(rbox(.3,.08,.2,.03,MAT.linen,hx-.5,.49,-hz*.25));
  G.add(plant(hx-.4,-hz+.4,1));
  const l=lamp(Math.min(vx+vw/2+.5,hx-.35),-hz+.35,1.35,lights,2.2);G.add(l.g);
}
function furnishKitchen(G,st,fm,lights,hx,hz){
  const len=clamp(st.w-.5,1.8,4.8),cx=-hx+.25+len/2,cz=-hz+.31;
  G.add(rbox(len,.74,.58,.01,MAT.cabinetDark,cx,.47,cz-.01));
  const n=Math.max(2,Math.round(len/.62)),dw=len/n;
  for(let i=0;i<n;i++){
    const x=cx-len/2+dw*(i+.5);
    G.add(rbox(dw-.006,.74,.022,.006,MAT.cabinet,x,.47,cz+.3));
    G.add(rbox(.2,.012,.016,.004,MAT.brass,x,.78,cz+.322));
  }
  G.add(stoneBox(len+.02,.04,.66,.004,fm,cx,.90,cz+.015));
  const sink=rbox(.55,.02,.4,.01,MAT.steel,cx-len*.2,.92,cz+.02);G.add(sink);
  G.add(faucet(cx-len*.2,.92,cz-.2,0));
  // wall cabinets and shelf
  const un=Math.max(1,Math.floor(len*.5/.62));
  for(let i=0;i<un;i++)G.add(rbox(.6,.75,.34,.008,MAT.cabinet,cx+len/2-.32-i*.62,1.98,-hz+.18));
  G.add(rbox(len*.4,.035,.24,.006,MAT.oak,cx-len*.3,1.55,-hz+.13));
  G.add(cyl(.045,.04,.1,MAT.ceramic,cx-len*.32,1.62,-hz+.13,20));
  // island
  const iw=clamp(st.w*.38,1.1,2.2),iz=clamp(st.l*.08,-.2,.5);
  G.add(rbox(iw,.88,.78,.012,MAT.cabinet,0,.46,iz));
  G.add(stoneBox(iw+.08,.04,.92,.006,fm,0,.92,iz+.04));
  for(const sx of [-iw*.27,iw*.27]){
    G.add(cyl(.17,.17,.05,MAT.oak,sx,.66,iz+.72,28));G.add(cyl(.02,.02,.62,MAT.dark,sx,.31,iz+.72,10));
  }
  for(const sx of [-iw*.28,iw*.28]){
    const pen=new THREE.Mesh(new THREE.SphereGeometry(.14,24,16),MAT.hang);pen.position.set(sx,1.85,iz);G.add(pen);
    G.add(cyl(.004,.004,.85,MAT.dark,sx,2.28,iz,6));
  }
  const l=lamp(hx-.45,-hz+.45,1.5,lights,2);G.add(l.g);
  G.add(plant(hx-.4,hz-.5,1.05));
}
function furnishLiving(G,st,fm,lights,hx,hz){
  const rw=clamp(st.w*.7,2,3.2),rl=clamp(st.l*.5,1.8,2.8);
  const sw=clamp(st.w-.9,1.5,2.15),sx=-hx*.12,sz=-hz+.62,cw=(sw-.4)/3;
  // Persian rug under the coffee table, in front of the sofa, kept inside the room
  const prw=Math.min(rw,hx*2-.5),prl=Math.min(rl,hz*2-.8);
  G.add(persianRug(prw,prl,clamp(sx,-hx+prw/2+.1,hx-prw/2-.1),clamp(sz+1.25,-hz+prl/2+.35,hz-prl/2-.15)));
  G.add(rbox(sw,.38,.95,.06,MAT.linen,sx,.26,sz));
  G.add(rbox(sw,.48,.22,.08,MAT.linen,sx,.64,sz-.37));
  for(const dx of [-1,1])G.add(rbox(.2,.56,.95,.07,MAT.linen,sx+dx*(sw/2-.1),.32,sz));
  for(let i=-1;i<=1;i++){
    G.add(rbox(cw-.02,.15,.72,.05,MAT.linen,sx+i*cw,.52,sz+.05));
    const b=rbox(cw-.04,.38,.16,.06,MAT.linen,sx+i*cw,.76,sz-.2);b.rotation.x=-.18;G.add(b);
  }
  G.add(rbox(.42,.42,.1,.04,std('#a58f76',.95),sx+sw/2-.5,.66,sz+.18));
  G.add(stoneBox(.95,.05,.95,.012,fm,sx,.42,sz+1.2));
  for(const [a,b] of [[-.3,-.3],[.3,-.3],[-.3,.3],[.3,.3]])G.add(cyl(.02,.02,.4,MAT.dark,sx+a,.2,sz+1.2+b,10));
  const frame=rbox(1.2,.9,.04,.006,MAT.darkWood,sx,1.58,-hz+.03);G.add(frame);
  const art=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.8),new THREE.MeshStandardMaterial({map:artCanvas(),roughness:.9}));art.position.set(sx,1.58,-hz+.054);G.add(art);
  const l=lamp(Math.min(sx+sw/2+.5,hx-.35),sz-.1,1.45,lights,2.4);G.add(l.g);
  G.add(plant(-hx+.4,hz-.5,1.15));
  G.add(rbox(.7,.55,.5,.05,MAT.oak,hx-.5,.28,-hz+.4));
}

/* ---------- room content ---------- */
let skyTex=null;
function sky(){
  if(skyTex)return skyTex;
  const c=mk(8,256),g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,256);
  gr.addColorStop(0,'#8fb9e3');gr.addColorStop(.55,'#e3ecf3');gr.addColorStop(.7,'#f4efe4');gr.addColorStop(1,'#b9c4ad');
  g.fillStyle=gr;g.fillRect(0,0,8,256);skyTex=new THREE.CanvasTexture(c);skyTex.colorSpace=THREE.SRGBColorSpace;return skyTex;
}
export function buildContent(st,fm,wm){
  const W=clamp(st.w,2.4,12),L=clamp(st.l,2.4,12),hx=W/2,hz=L/2;
  const G=new THREE.Group(),walls={},lights=[];
  // floor slab
  G.add(boxMesh(-hx-TH,hx+TH,-.16,0,-hz-TH,hz+TH,[fm,fm,fm,fm,fm,fm]));
  // ceiling (inner face = underside, index 3)
  const ceil=boxMesh(-hx-TH,hx+TH,H,H+.12,-hz-TH,hz+TH,faceMats(MAT.shell,3,MAT.paint));G.add(ceil);walls.ceiling=ceil;
  const back=boxMesh(-hx-TH,hx+TH,0,H,-hz-TH,-hz,faceMats(MAT.shell,4,wm));G.add(back);walls.back=back;
  const front=boxMesh(-hx-TH,hx+TH,0,H,hz,hz+TH,faceMats(MAT.shell,5,wm));G.add(front);walls.front=front;
  const left=boxMesh(-hx-TH,-hx,0,H,-hz,hz,faceMats(MAT.shell,0,wm));G.add(left);walls.left=left;
  // right wall with window opening
  const ww=clamp(L*.42,1.2,2.4),zc=-hz*.2+.1,y0=.85,y1=2.2;
  const rm=faceMats(MAT.shell,1,wm),rp=[];
  rp.push(boxMesh(hx,hx+TH,0,H,-hz,zc-ww/2,rm),boxMesh(hx,hx+TH,0,H,zc+ww/2,hz,rm),
    boxMesh(hx,hx+TH,0,y0,zc-ww/2,zc+ww/2,rm),boxMesh(hx,hx+TH,y1,H,zc-ww/2,zc+ww/2,rm));
  rp.forEach(m=>G.add(m));walls.right=rp;
  // window frame and mullions
  const fr=(a,b,c,d,e,f)=>{const m=boxMesh(a,b,c,d,e,f,MAT.frame);m.castShadow=false;G.add(m);};
  const fx0=hx-.02,fx1=hx+.04,ft=.05;
  fr(fx0,fx1,y0,y0+ft,zc-ww/2,zc+ww/2);fr(fx0,fx1,y1-ft,y1,zc-ww/2,zc+ww/2);
  fr(fx0,fx1,y0,y1,zc-ww/2,zc-ww/2+ft);fr(fx0,fx1,y0,y1,zc+ww/2-ft,zc+ww/2);
  fr(fx0,fx1,y0,y1,zc-.012,zc+.012);fr(fx0,fx1,(y0+y1)/2-.012,(y0+y1)/2+.012,zc-ww/2,zc+ww/2);
  const sill=boxMesh(hx-.1,hx+.09,y0-.04,y0,zc-ww/2-.06,zc+ww/2+.06,MAT.paint);G.add(sill);
  // skirting
  const sk=(x0,x1,z0,z1)=>{const m=boxMesh(x0,x1,0,.09,z0,z1,MAT.skirt);m.castShadow=false;G.add(m);};
  sk(-hx,hx,-hz,-hz+.016);sk(-hx,hx,hz-.016,hz);sk(-hx,-hx+.016,-hz,hz);
  sk(hx-.016,hx,-hz,zc-ww/2);sk(hx-.016,hx,zc+ww/2,hz);
  // sky behind window
  const skyM=new THREE.Mesh(new THREE.PlaneGeometry(40,20),new THREE.MeshBasicMaterial({map:sky(),toneMapped:false}));
  skyM.position.set(hx+12,3,zc);skyM.rotation.y=-Math.PI/2;skyM.name='sky';G.add(skyM);
  // contact shadows (ambient occlusion look)
  const ao=new THREE.Group(),v=(x,y,z)=>new THREE.Vector3(x,y,z),e=.004,wd=.5;
  ao.add(aoStrip(v(-hx,e,-hz),v(hx,e,-hz),v(0,0,1),wd,.55),aoStrip(v(-hx,e,hz),v(hx,e,hz),v(0,0,-1),wd,.55),
    aoStrip(v(-hx,e,-hz),v(-hx,e,hz),v(1,0,0),wd,.55));
  ao.add(aoStrip(v(-hx,H-e,-hz),v(hx,H-e,-hz),v(0,0,1),.38,.5),aoStrip(v(-hx,H-e,hz),v(hx,H-e,hz),v(0,0,-1),.38,.5),
    aoStrip(v(-hx,H-e,-hz),v(-hx,H-e,hz),v(1,0,0),.38,.5),aoStrip(v(hx,H-e,-hz),v(hx,H-e,hz),v(-1,0,0),.38,.5));
  for(const [cx,cz,dx,dz] of [[-hx,-hz,1,0],[-hx,-hz,0,1],[hx,-hz,-1,0],[hx,-hz,0,1],[-hx,hz,1,0],[-hx,hz,0,-1]]){
    const ix=cx===-hx?e:-e,iz=cz===-hz?e:-e;
    ao.add(aoStrip(v(cx+(dx?0:ix),0,cz+(dz?0:iz)),v(cx+(dx?0:ix),H,cz+(dz?0:iz)),v(dx,0,dz),.35,.35));
  }
  G.add(ao);
  // furnishing
  if(st.room==='kjokken')furnishKitchen(G,st,fm,lights,hx,hz);
  else if(st.room==='stue')furnishLiving(G,st,fm,lights,hx,hz);
  else furnishBath(G,st,fm,lights,hx,hz);
  for(const o of lights)G.add(o.l);
  // soft skylight: an area light in the window opening, so daylight wraps around objects like in a photo
  const win=new THREE.RectAreaLight('#dfeaff',0,ww,y1-y0);
  win.position.set(hx-.03,(y0+y1)/2,zc);win.lookAt(0,(y0+y1)/2-.35,zc);G.add(win);
  return {group:G,walls,lights,win,dims:{W,L,hx,hz,zc,ww}};
}

/* ---------- viewer ---------- */
function init(){
  const shell=document.querySelector('.scene-shell'),old=document.getElementById('room-canvas');
  if(!shell||typeof window.getStudioState!=='function')return;
  const canvas=document.createElement('canvas');canvas.id='room3d';canvas.setAttribute('aria-label','Interaktivt 3D-rom med natursten. Dra for å se deg rundt.');
  canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:1;touch-action:pan-y;cursor:grab;opacity:0;transition:opacity .5s';
  shell.appendChild(canvas);
  let renderer;
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  }catch(e){canvas.remove();return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,MOBILE?1.5:2));
  RectAreaLightUniformsLib.init();
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  maxAniso=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const scene=new THREE.Scene();scene.background=new THREE.Color('#cfcac1');
  const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;
  const camera=new THREE.PerspectiveCamera(62,1,.05,80);
  const controls=new OrbitControls(camera,canvas);canvas.style.touchAction='pan-y';
  controls.enableDamping=false;controls.enablePan=false;
  const sun=new THREE.DirectionalLight('#fff1dc',3);sun.castShadow=true;
  sun.shadow.mapSize.set(MOBILE?1024:4096,MOBILE?1024:4096);sun.shadow.bias=-.0002;sun.shadow.normalBias=.025;sun.shadow.radius=6;sun.shadow.blurSamples=16;
  scene.add(sun,sun.target);
  const hemi=new THREE.HemisphereLight('#fff6ea','#b9a88f',.4);scene.add(hemi);
  // UI: view buttons + loading label
  const css=document.createElement('style');
  css.textContent='.scene-views{position:absolute;top:14px;right:14px;z-index:9;display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;max-width:62%}.scene-views button{border:0;background:#f7f5eee8;color:#242725;padding:8px 11px;font:600 10px/1 var(--sans,system-ui);letter-spacing:.06em;text-transform:uppercase;cursor:pointer}.scene-views button.on{background:#242725;color:#fff}.scene-loading{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:9;background:#242725d9;color:#fff;padding:9px 14px;font:600 10px/1 var(--sans,system-ui);letter-spacing:.08em;text-transform:uppercase;opacity:0;transition:opacity .3s;pointer-events:none}.scene-loading.on{opacity:1}@media(max-width:700px){.scene-views{top:60px;max-width:calc(100% - 24px);left:12px;right:auto;justify-content:flex-start}.scene-views button{padding:7px 8px;font-size:9px}}';
  document.head.appendChild(css);
  const bar=document.createElement('div');bar.className='scene-views';
  const VIEWS=[['door','Fra døren'],['window','Mot vinduet'],['floor','Gulvdetalj'],['wall','Veggdetalj'],['dollhouse','Oversikt']];
  bar.innerHTML=VIEWS.map(v=>'<button type="button" data-v="'+v[0]+'">'+v[1]+'</button>').join('')+'<button type="button" data-z="-1" aria-label="Zoom ut">−</button><button type="button" data-z="1" aria-label="Zoom inn">＋</button>';
  shell.appendChild(bar);
  const loading=document.createElement('div');loading.className='scene-loading';loading.textContent='Lager steinstruktur …';shell.appendChild(loading);
  let busy=0;onBusy=d=>{busy=Math.max(0,busy+d);loading.classList.toggle('on',busy>0);};
  let raf=0,tween=null,content=null,dims=null,view='door',roomKey='',token=0,lampsOn=0;
  const request=()=>{if(!raf)raf=requestAnimationFrame(frame);};
  onTexture=request;
  controls.addEventListener('change',request);

  function viewDef(name){
    const {W,L,hx,hz,zc}=dims;
    switch(name){
      case 'window':return {mode:'in',fov:64,pos:new THREE.Vector3(-hx+.55,1.5,hz*.55),target:new THREE.Vector3(hx,1.3,zc)};
      case 'floor':return {mode:'in',fov:55,pos:new THREE.Vector3(-hx*.15,.95,hz*.55),target:new THREE.Vector3(hx*.2,0,-hz*.15)};
      case 'wall':return {mode:'in',fov:55,pos:new THREE.Vector3(0,1.55,Math.min(hz-.4,-hz+1.9)),target:new THREE.Vector3(-.1,1.35,-hz)};
      case 'dollhouse':{const d=Math.max(W,L);return {mode:'orbit',fov:42,pos:new THREE.Vector3(-W*.85,d*1.05+1.2,L*1.3),target:new THREE.Vector3(0,.7,0)};}
      default:return {mode:'in',fov:66,pos:new THREE.Vector3(hx*.35,1.55,hz-.32),target:new THREE.Vector3(-hx*.1,1.1,-hz)};
    }
  }
  function setMode(mode){
    if(mode==='in'){controls.enableZoom=false;controls.rotateSpeed=-.38;controls.minDistance=.01;controls.maxDistance=.01;controls.minPolarAngle=.45;controls.maxPolarAngle=2.55;}
    else{const d=Math.max(dims.W,dims.L);controls.enableZoom=true;controls.rotateSpeed=.7;controls.minDistance=d*.6;controls.maxDistance=d*3;controls.minPolarAngle=.2;controls.maxPolarAngle=1.5;}
  }
  function snap(v){
    setMode(v.mode);camera.fov=v.fov;camera.updateProjectionMatrix();camera.position.copy(v.pos);
    if(v.mode==='in'){const d=v.target.clone().sub(v.pos).normalize();controls.target.copy(v.pos).addScaledVector(d,.01);}
    else controls.target.copy(v.target);
    controls.update();
  }
  function showWalls(name){
    if(!content)return;
    const dh=name==='dollhouse',w=content.walls;
    w.ceiling.visible=!dh;w.front.visible=!dh;w.left.visible=!dh;
  }
  function goView(name,instant){
    if(!dims)return;
    view=name;bar.querySelectorAll('[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===name));
    showWalls(name);
    const v=viewDef(name);
    if(instant){tween=null;snap(v);request();return;}
    const d=new THREE.Vector3();camera.getWorldDirection(d);
    tween={t0:performance.now(),dur:700,p0:camera.position.clone(),l0:camera.position.clone().addScaledVector(d,4),f0:camera.fov,v};
    controls.enabled=false;request();
  }
  bar.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.v)goView(b.dataset.v);
    else if(b.dataset.z){camera.fov=clamp(camera.fov-Number(b.dataset.z)*7,28,88);camera.updateProjectionMatrix();request();}
  });

  function applyLight(st){
    const Lf=clamp(st.light/100,.15,1),night=clamp((.55-Lf)/.4,0,1);
    const el=THREE.MathUtils.degToRad(6+(Lf-.15)/.85*46);
    const dir=new THREE.Vector3(Math.cos(el)*.92,Math.sin(el),Math.cos(el)*.4).normalize();
    const c=dims?dims.hz:2;sun.position.copy(dir).multiplyScalar(24);sun.target.position.set(0,.8,0);
    const warm=new THREE.Color('#ff9658'),day=new THREE.Color('#fff0da');
    sun.color.copy(warm).lerp(day,THREE.MathUtils.smoothstep(Lf,.15,.65));
    sun.intensity=.25+3.3*Math.pow(Lf,1.25);
    const ext=dims?Math.max(dims.W,dims.L)*.9:5;
    Object.assign(sun.shadow.camera,{left:-ext,right:ext,top:ext,bottom:-ext,near:1,far:60});sun.shadow.camera.updateProjectionMatrix();
    scene.environmentIntensity=.30+.55*Lf;hemi.intensity=.30+.28*Lf;
    renderer.toneMappingExposure=.92+.2*(1-night*.3);
    const skyMesh=content&&content.group.getObjectByName('sky');
    if(skyMesh)skyMesh.material.color.setRGB(.25+.75*Lf*Lf+.08,.28+.72*Lf*Lf+.06,.4+.6*Lf*Lf);
    scene.background.set(night>0?'#7d7a74':'#cfcac1');
    lampsOn=night;
    if(content&&content.win){
      content.win.intensity=(1.2+5.5*Math.pow(Lf,1.4))*(1-night*.75);
      content.win.color.set('#ffc9a0').lerp(new THREE.Color('#dfeaff'),THREE.MathUtils.smoothstep(Lf,.2,.7));
    }
    MAT.lampShade.emissiveIntensity=night*1.6;MAT.hang.emissiveIntensity=night*1.4;
    if(content)for(const o of content.lights)o.l.intensity=o.power*night*14;
  }
  function rebuild(st,fm,wm){
    if(content){
      scene.remove(content.group);
      content.group.traverse(o=>{if(o.geometry)o.geometry.dispose();});
    }
    content=buildContent(st,fm,wm);dims=content.dims;scene.add(content.group);
  }
  async function update(){
    const st=window.getStudioState(),key=[st.room,st.w,st.l,st.floor.id,st.wall.id,SINK_ID].join('|');
    if(key===roomKey){applyLight(st);request();return;}
    roomKey=key;const my=++token;
    let fm,wm;
    try{[fm,wm]=await Promise.all([ensureSurface(st.floor.id),ensureSurface(st.wall.id)]);}catch(e){console.warn('Stenhuset studio:',e);return;}
    if(my!==token)return;
    const first=!content;
    rebuild(st,fm,wm);applyLight(st);goView(view,true);
    if(first){canvas.style.opacity='1';if(old)old.style.visibility='hidden';const tag=document.querySelector('.scene-tag');if(tag)tag.textContent='3D-ROMVISNING · FYSISK LYS';}
    request();
  }
  function resize(){
    const r=shell.getBoundingClientRect();if(r.width<10||r.height<10)return;
    renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();request();
  }
  function frame(){
    raf=0;
    if(shell.offsetWidth<10)return;
    if(tween){
      const k=clamp((performance.now()-tween.t0)/tween.dur,0,1),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
      const v=tween.v,lt=v.target;
      camera.position.lerpVectors(tween.p0,v.pos,e);
      camera.fov=tween.f0+(v.fov-tween.f0)*e;camera.updateProjectionMatrix();
      camera.lookAt(new THREE.Vector3().lerpVectors(tween.l0,lt,e));
      if(k>=1){tween=null;controls.enabled=true;snap(v);}else request();
    }
    renderer.render(scene,camera);
  }
  new ResizeObserver(resize).observe(shell);
  window.Studio3D={ready:true,update,goView,
    setSink(id){SINK_ID=id&&SINKS[id]?Number(id):null;roomKey='';update();},getSink:()=>SINK_ID,sinks:SINKS};
  window.addEventListener('hashchange',()=>setTimeout(()=>{resize();request();},50));
  resize();update();
}
if(!globalThis.__STUDIO_TEST__){
  try{init();}catch(e){console.warn('Stenhuset 3D-studio utilgjengelig, bruker 2D-visning.',e);}
}
