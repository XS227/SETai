/* Stenhuset digital showroom: real-time 3D room with physically based stone materials.
 * Real walls, floor, ceiling, window with a sun shadow, per-room furnishing (bath, kitchen, living room).
 * Stone surfaces come from stone-textures-v1.js (tiled layout, joints, pores, veining, glaze).
 * If WebGL or the module fails, the old 2D canvas in app.html keeps working. */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {generateStone,STONES,T} from './stone-textures-v1.js';
import {SINKS,buildSink,sinkMaterial,TOP_STONES,FEATURE_STONES} from './sinks3d-v1.js?v=5';
import {TABLES,buildTable,buildCountertop} from './furniture3d-v1.js?v=3';

/* selected stenvask in the bathroom (product id) or null for the generic basin; marmorbord in the living room;
 * made-to-measure countertop {stone,t,...} for the kitchen, or null to use the floor stone */
let SINK_ID=null,TABLE_ID=null,TOP_CFG=null,RUG_ID='persisk';
/* kitchen splashback in a tile from the shop (stone id, e.g. zellige 'p-3360'); null = the countertop stone */
let SPLASH=null,splashM=null;
/* Where stone goes in a Nordic home: bathroom floor and walls; kitchen countertop and splashback (floor optional,
 * oak by default); living room on oak with painted walls, stone only in the big pieces: coffee table and fireplace. */
let COFFEE='sk-travvein',FIRE='sk-green',KFLOOR=false,LIVING_FOCUS='coffee';
const KITCHEN_TOP='sk-carrara';
/* rugs for the living room; size in metres (null = fitted to the room) */
const RUGS={persisk:{n:'Persisk teppe, rødt',size:null,style:'persian'},balmoral:{n:'Vintage medaljong, mørk turkis 200×300',size:[3,2],style:'vintage'}};

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
  hang:new THREE.MeshStandardMaterial({color:'#f6ebd5',roughness:.5,emissive:'#ffd391',emissiveIntensity:0}),
  wallPaint:std('#ebe6dd',.93),glass:new THREE.MeshPhysicalMaterial({color:'#101010',roughness:.08,metalness:0,clearcoat:1,clearcoatRoughness:.05}),
  ember:new THREE.MeshStandardMaterial({color:'#2a120a',emissive:'#ff7a2a',emissiveIntensity:.0,roughness:1})
};
/* oak parquet, planks along x: one texture covers T × T metres like the stone surfaces (bakeUV) */
let oakM=null;
function oakFloor(){
  if(oakM)return oakM;
  const N=1024,c=mk(N,N),g=c.getContext('2d'),px=N/T,pw=.18*px;let seed=5;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let row=0;row*pw<N;row++){
    let x=-rnd()*1.2*px;
    while(x<N){const len=(1.1+rnd()*.7)*px,tone=rnd(),base=[198+tone*22,160+tone*20,112+tone*16];
      const gr=g.createLinearGradient(0,row*pw,0,row*pw+pw);gr.addColorStop(0,`rgb(${base.map(v=>v-6).join(',')})`);gr.addColorStop(.5,`rgb(${base.join(',')})`);gr.addColorStop(1,`rgb(${base.map(v=>v-8).join(',')})`);
      g.fillStyle=gr;g.fillRect(x,row*pw,len,pw);
      // grain
      for(let k=0;k<26;k++){g.strokeStyle=`rgba(110,74,40,${.05+rnd()*.09})`;g.lineWidth=.6+rnd()*1.4;const y=row*pw+rnd()*pw;g.beginPath();g.moveTo(x,y);
        for(let s=0;s<=8;s++)g.lineTo(x+len*s/8,y+(rnd()-.5)*pw*.12);g.stroke();}
      if(rnd()<.35){g.fillStyle='rgba(90,58,30,.25)';g.beginPath();g.ellipse(x+rnd()*len,row*pw+rnd()*pw,3+rnd()*5,2+rnd()*3,0,0,7);g.fill();}
      g.fillStyle='rgba(60,40,22,.35)';g.fillRect(x,row*pw,1.5,pw);x+=len;}
    g.fillStyle='rgba(60,40,22,.32)';g.fillRect(0,row*pw,N,1.2);
  }
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=maxAniso;
  oakM=new THREE.MeshStandardMaterial({map,roughness:.48,metalness:0,envMapIntensity:.6});return oakM;
}
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
/* vintage medallion rug (machine-woven look, no fringe): turquoise field, a dense cream / burgundy / navy medallion and
 * corner spandrels, faded and worn pile (multi-scale noise) the way "vintage" rugs are printed */
function vintageRugCanvas(W,H){
  const c=mk(W,H),g=c.getContext('2d'),S=Math.min(W,H);
  const TQ='#3a8ea6',NAVY='#21405f',CREAM='#e4d8c2',WINE='#8b3040',PLUM='#5e3358',OCHRE='#cf9a42',SKY='#93c4cf',ROSE='#b8656f';
  let seed=11;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  const pick=a=>a[Math.floor(rnd()*a.length)];
  // field: turquoise, darker towards the edges, cloudy
  const gr=g.createRadialGradient(W/2,H/2,S*.15,W/2,H/2,Math.hypot(W,H)*.55);gr.addColorStop(0,'#3f97b0');gr.addColorStop(.6,'#2f7d98');gr.addColorStop(1,'#1d4f6e');
  g.fillStyle=gr;g.fillRect(0,0,W,H);
  for(let i=0;i<90;i++){g.fillStyle=rnd()>.4?'rgba(20,50,80,.16)':'rgba(120,190,205,.12)';g.beginPath();g.ellipse(rnd()*W,rnd()*H,S*(.05+rnd()*.18),S*(.03+rnd()*.1),rnd()*3,0,7);g.fill();}
  // small ornaments
  const flower=(x,y,r,a,b,n=6)=>{for(let k=0;k<n;k++){g.save();g.translate(x,y);g.rotate(k*Math.PI*2/n);g.fillStyle=k%2?a:b;g.beginPath();g.ellipse(0,-r*.55,r*.24,r*.45,0,0,7);g.fill();g.restore();}g.fillStyle=pick([OCHRE,WINE,NAVY]);g.beginPath();g.arc(x,y,r*.22,0,7);g.fill();};
  const leaf=(x,y,r,col)=>{g.save();g.translate(x,y);g.rotate(rnd()*Math.PI*2);g.fillStyle=col;g.beginPath();g.moveTo(0,-r);g.quadraticCurveTo(r*.6,0,0,r);g.quadraticCurveTo(-r*.6,0,0,-r);g.fill();g.restore();};
  const curl=(x,y,r,col)=>{g.strokeStyle=col;g.lineWidth=Math.max(1,S*.0035);g.beginPath();g.arc(x,y,r,rnd()*6,rnd()*6+2.5);g.stroke();};
  // rounded-lobed shape (smooth scallops)
  const lobed=(cx,cy,rx,ry,n,depth,rot=0)=>{g.beginPath();for(let k=0;k<=n*24;k++){const a=k/(n*24)*Math.PI*2,w=1-depth*(.5-.5*Math.cos(a*n+rot));const x=cx+Math.cos(a)*rx*w,y=cy+Math.sin(a)*ry*w;k?g.lineTo(x,y):g.moveTo(x,y);}g.closePath();};
  // dense filigree inside the current path
  // ornaments are placed in one quarter and mirrored four ways, like a woven design
  const fill=(cx,cy,rx,ry,base,cols,count,size)=>{g.save();g.clip();g.fillStyle=base;g.fillRect(cx-rx*1.1,cy-ry*1.1,rx*2.2,ry*2.2);
    for(let k=0;k<count/4;k++){const a=rnd()*Math.PI/2,d=Math.sqrt(rnd()),dx=Math.cos(a)*rx*d,dy=Math.sin(a)*ry*d,r=size*(.5+rnd()*.8),t=rnd(),c1=pick(cols),c2=pick(cols),n=rnd()>.5?6:8,s0=seed;
      for(const [mx,my] of [[1,1],[-1,1],[1,-1],[-1,-1]]){seed=s0;const x=cx+mx*dx,y=cy+my*dy;
        if(t<.45)flower(x,y,r,c1,c2,n);else if(t<.8)leaf(x,y,r*.8,c1);else curl(x,y,r*.7,c1);}}
    g.restore();};
  // borders: navy, cream with tiny motif, turquoise, wine line, cream
  const band=(i,w,col)=>{g.strokeStyle=col;g.lineWidth=w;g.strokeRect(i+w/2,i+w/2,W-2*i-w,H-2*i-w);};
  band(0,S*.014,NAVY);band(S*.014,S*.034,'#c9c3b1');band(S*.048,S*.006,WINE);band(S*.054,S*.02,TQ);band(S*.074,S*.005,CREAM);band(S*.079,S*.005,NAVY);
  const bi=S*.031;
  for(let x=bi;x<W-bi;x+=S*.034){flower(x,bi,S*.012,pick([WINE,NAVY,TQ]),pick([SKY,ROSE]));flower(x,H-bi,S*.012,pick([WINE,NAVY,TQ]),pick([SKY,ROSE]));}
  for(let y=bi;y<H-bi;y+=S*.034){flower(bi,y,S*.012,pick([WINE,NAVY,TQ]),pick([SKY,ROSE]));flower(W-bi,y,S*.012,pick([WINE,NAVY,TQ]),pick([SKY,ROSE]));}
  const f0=S*.084;
  g.save();g.beginPath();g.rect(f0,f0,W-2*f0,H-2*f0);g.clip();
  // corner spandrels: cream lace with wine / navy cores
  for(const [sx,sy] of [[0,0],[1,0],[0,1],[1,1]]){
    const cx=sx?W-f0:f0,cy=sy?H-f0:f0;
    lobed(cx,cy,S*.27,S*.23,9,.24);g.strokeStyle=WINE;g.lineWidth=S*.007;g.stroke();lobed(cx,cy,S*.27,S*.23,9,.24);
    fill(cx,cy,S*.27,S*.23,CREAM,[WINE,NAVY,TQ,SKY,OCHRE,ROSE,WINE,NAVY],220,S*.02);
    lobed(cx,cy,S*.15,S*.13,7,.25);fill(cx,cy,S*.15,S*.13,WINE,[CREAM,SKY,OCHRE,NAVY],60,S*.018);
  }
  for(const sx of [0,1]){const cx=sx?W-f0:f0;lobed(cx,H/2,S*.08,S*.16,8,.25);fill(cx,H/2,S*.08,S*.16,CREAM,[WINE,NAVY,PLUM,SKY],80,S*.018);}
  // central medallion: cream lace star, navy / wine / plum layers, dense ornament
  const fx=W/2,fy=H/2,mr=S*.36;
  for(const d of [-1,1]){const py=fy+d*mr*1.02;lobed(fx,py,S*.08,S*.065,6,.3);fill(fx,py,S*.08,S*.065,CREAM,[WINE,NAVY,SKY],22,S*.018);}
  lobed(fx,fy,mr*1.06,mr*.86,12,.14);g.strokeStyle=WINE;g.lineWidth=S*.008;g.stroke();lobed(fx,fy,mr*1.06,mr*.86,12,.14);
  fill(fx,fy,mr*1.06,mr*.86,CREAM,[WINE,NAVY,TQ,SKY,OCHRE,PLUM,ROSE,NAVY,WINE],760,S*.022);
  lobed(fx,fy,mr*.8,mr*.65,12,.22,.3);fill(fx,fy,mr*.8,mr*.65,NAVY,[CREAM,SKY,WINE,OCHRE,TQ],420,S*.02);
  lobed(fx,fy,mr*.44,mr*.36,8,.25);fill(fx,fy,mr*.44,mr*.36,WINE,[CREAM,OCHRE,SKY,PLUM],120,S*.018);
  lobed(fx,fy,mr*.2,mr*.17,6,.25);fill(fx,fy,mr*.2,mr*.17,PLUM,[OCHRE,CREAM,SKY],24,S*.016);
  g.restore();
  // vintage wear: multi-scale noise fades the colours towards the pale backing, plus pile streaks and grain
  const img=g.getImageData(0,0,W,H),px=img.data,G0=8,gw=Math.ceil(W/G0)+2,gh=Math.ceil(H/G0)+2;
  const grid=sc=>{const n=new Float32Array((Math.ceil(W/sc)+2)*(Math.ceil(H/sc)+2));for(let i=0;i<n.length;i++)n[i]=rnd();return n;};
  const scales=[[S*.25,.5],[S*.07,.3],[S*.018,.2]].map(([sc,w])=>({sc,w,n:grid(sc),cw:Math.ceil(W/sc)+2}));
  const at=(o,x,y)=>{const fx=x/o.sc,fy=y/o.sc,ix=fx|0,iy=fy|0,u=fx-ix,v=fy-iy,n=o.n,cw=o.cw;
    const a=n[iy*cw+ix],b=n[iy*cw+ix+1],c2=n[(iy+1)*cw+ix],d=n[(iy+1)*cw+ix+1];return (a*(1-u)+b*u)*(1-v)+(c2*(1-u)+d*u)*v;};
  for(let y=0;y<H;y++){const streak=Math.sin(y*.9+rnd()*.3)*.04;
    for(let x=0;x<W;x++){
      let n=0;for(const o of scales)n+=at(o,x,y)*o.w;
      const wear=Math.max(0,Math.min(.62,(n-.42)*1.6+streak+(rnd()-.5)*.18)),i=(y*W+x)*4;
      // faded pile shows a pale grey-beige backing
      px[i]=px[i]+(206-px[i])*wear;px[i+1]=px[i+1]+(201-px[i+1])*wear;px[i+2]=px[i+2]+(188-px[i+2])*wear;
      const gr2=(rnd()-.5)*26;px[i]+=gr2;px[i+1]+=gr2;px[i+2]+=gr2;
    }}
  g.putImageData(img,0,0);
  for(let i=0;i<260;i++){const y=rnd()*H,x=rnd()*W,w=S*(.04+rnd()*.3),h=1+rnd()*S*.006;g.fillStyle=rnd()>.5?'rgba(230,222,205,'+(.05+rnd()*.12)+')':'rgba(15,30,45,'+(.04+rnd()*.1)+')';g.fillRect(x,y,w,h);}
  g.fillStyle='rgba(10,20,30,.05)';for(let y=0;y<H;y+=3)g.fillRect(0,y,W,1);
  return c;
}
function rugTextures(W,H,style){
  const key=W+'x'+H+(style||'');if(rugCache.has(key))return rugCache.get(key);
  if(style==='vintage'){
    const c=vintageRugCanvas(W,H),map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=maxAniso;map.needsUpdate=true;
    const b=mk(16,16),bg=b.getContext('2d');bg.fillStyle='#808080';bg.fillRect(0,0,16,16);
    for(let y=0;y<16;y+=2)for(let x=0;x<16;x+=2){bg.fillStyle=((x+y)/2)%2?'#949494':'#707070';bg.fillRect(x,y,2,2);}
    const bump=new THREE.CanvasTexture(b);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.anisotropy=maxAniso;
    const res={map,bump,fringe:null,canvas:c};rugCache.set(key,res);return res;
  }
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
  const res={map,bump,fringe,canvas:c};rugCache.set(key,res);return res;
}
function persianRug(rw,rl,x,z,style){
  const W=1024,H=Math.max(512,Math.round(1024*rl/rw));
  const t=rugTextures(W,H,style),g=new THREE.Group();
  const top=new THREE.Mesh(new THREE.PlaneGeometry(rw,rl),new THREE.MeshStandardMaterial({map:t.map,bumpMap:t.bump,bumpScale:1.4,roughness:1,metalness:0,envMapIntensity:.4}));
  t.bump.repeat.set(rw*55,rl*55);
  top.rotation.x=-Math.PI/2;top.position.set(0,.022,0);top.receiveShadow=true;g.add(top);
  const pad=rbox(rw-.004,.018,rl-.004,.006,MAT.wool,0,.011,0);g.add(pad);
  if(t.fringe)for(const s of [-1,1]){
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
/* where the room's product stands, and where to look at it from (set while furnishing, used by the "product" view) */
let FOCUS=null;
const setFocus=(tx,ty,tz,px,py,pz,obj)=>{FOCUS={target:new THREE.Vector3(tx,ty,tz),pos:new THREE.Vector3(px,py,pz),obj:obj||null};};
/* camera placement that is checked against the furniture: rooms come in many sizes, so fixed coordinates can end up
 * looking at the back of a sofa or under an island */
const ray=new THREE.Raycaster();
function within(o,root){for(;o;o=o.parent)if(o===root)return true;return false;}
function sightClear(group,pos,target,tol,own){
  const d=target.clone().sub(pos),dist=d.length();ray.set(pos,d.multiplyScalar(1/dist));ray.near=.05;ray.far=dist+.1;
  const h=ray.intersectObject(group,true).find(x=>x.object.visible&&x.object.name!=='sky'&&!(x.object.material&&x.object.material.side===THREE.BackSide));
  return !h||h.distance>dist-tol||(own&&within(h.object,own));
}
export function productView(group,f,hz){
  // raise the camera (and step back a little) until nothing stands between it and the product
  for(let k=0;k<8;k++){
    const pos=f.pos.clone();pos.y+=k*.12;pos.z=Math.min(hz-.25,pos.z+k*.04);
    if(sightClear(group,pos,f.target,.08,f.obj))return {pos,target:f.target.clone()};
  }
  return {pos:f.pos.clone(),target:f.target.clone()};
}
export function floorView(group,dims,pos){
  // the open piece of floor (stone, not rug or furniture) closest to 1.7 m in front of the camera
  const {hx,hz}=dims;
  // first ask for a generous free patch, then accept a smaller and closer one (small, furnished rooms)
  for(const [dmin,pad] of [[1.1,.3],[.75,.18],[.5,.08]]){
    let best=null;
    for(let x=-hx+.35;x<=hx-.35;x+=.15)for(let z=-hz+.35;z<=hz-.35;z+=.15){
      const t=new THREE.Vector3(x,0,z),dist=t.distanceTo(pos);if(dist<dmin||dist>2.8)continue;
      if(!sightClear(group,pos,t,.04))continue;
      if(![[pad,0],[-pad,0],[0,pad],[0,-pad]].every(([a,b])=>sightClear(group,pos,new THREE.Vector3(x+a,0,z+b),.04)))continue;
      const score=Math.abs(dist-1.7)+.25*Math.abs(x);
      if(!best||score<best.score)best={score,target:t};
    }
    if(best)return best.target;
  }
  return new THREE.Vector3(pos.x+.3,0,pos.z-.6);
}
function furnishBath(G,st,fm,lights,hx,hz){
  const sk=SINK_ID&&SINKS[SINK_ID]?SINKS[SINK_ID]:null;
  let vw=clamp(st.w*.34,.8,1.4),vd=.5;
  if(sk){vw=clamp(Math.max(vw,sk.W+.24),.8,Math.min(1.9,hx*2-.7));vd=Math.max(.5,sk.D+.06);}
  const vx=-hx*.18,vz=-hz+vd/2+.02,TOP=.91;
  let rimY=TOP+.06,own=null;
  if(sk&&sk.top){
    // the stone itself is the vanity top: a slim oak drawer under it
    const s=buildSink(SINK_ID,()=>onTexture());s.position.set(vx,TOP-sk.H,vz);G.add(s);own=s;
    G.add(rbox(Math.min(vw,sk.W)-.04,.24,sk.D-.04,.012,MAT.oak,vx,TOP-sk.H-.12,vz));
    G.add(wallFaucet(vx+(sk.offset||0),TOP+.16,-hz));rimY=TOP;
  }else{
    G.add(stoneBox(vw,.5,vd,.015,fm,vx,.66,vz));
    if(sk){
      const s=buildSink(SINK_ID,()=>onTexture());s.position.set(vx,TOP,vz);G.add(s);rimY=TOP+sk.H;own=s;
      if(sk.splash)G.add(wallFaucet(vx,TOP+sk.H+sk.splash.h*.62,vz-sk.D/2+.026));
      else G.add(wallFaucet(vx,TOP+sk.H+.13,-hz));
    }else{
      own=cyl(.2,.16,.13,MAT.ceramic,vx,.97,vz);G.add(own);
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
  setFocus(vx,rimY-.06,vz,vx+.3,1.5,Math.min(hz-.3,vz+1.65),own);
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
  const topM=sinkMaterial(TOP_CFG&&TOP_CFG.slab?{stone:TOP_CFG.stone,surf:'honed',photo:'assets/slabs/'+TOP_CFG.slab+'-tex.jpg',patch:TOP_CFG.slabW||2.2}:{stone:TOP_CFG?TOP_CFG.stone:KITCHEN_TOP,surf:'honed'},()=>onTexture()),tt=TOP_CFG?TOP_CFG.t:.03;
  // splashback in the countertop stone, from the counter up to the wall cabinets (the usual Nordic choice)
  G.add(stoneBox(len+.02,.6,.02,.003,splashM||topM,cx,.92+.3,-hz+.011));
  let fx=cx-len*.2,ctObj=null;
  if(TOP_CFG&&TOP_CFG.L){
    // the countertop from the designer, with its own length, depth, edge, cut-outs and splash, against the back wall
    const k=Math.min(1,(len+.02)/TOP_CFG.L),cfg={...TOP_CFG,L:Math.min(TOP_CFG.L,len+.02),sinkX:(TOP_CFG.sinkX||0)*k,hobX:(TOP_CFG.hobX||0)*k};
    const ct=buildCountertop(cfg,()=>onTexture());ct.position.set(cx,.92-tt,-hz+cfg.D/2+.005);G.add(ct);ctObj=ct;
    if(cfg.sink)G.add(faucet(cx+cfg.sinkX,.92,-hz+.1,0));
    fx=cx+(cfg.hob?cfg.hobX:cfg.sink?cfg.sinkX:0);
  }else{
    G.add(stoneBox(len+.02,tt,.66,.004,topM,cx,.92-tt/2,cz+.015));
    const sink=rbox(.55,.02,.4,.01,MAT.steel,cx-len*.2,.92,cz+.02);G.add(sink);
    G.add(faucet(cx-len*.2,.92,cz-.2,0));
  }
  // wall cabinets and shelf
  const un=Math.max(1,Math.floor(len*.5/.62));
  for(let i=0;i<un;i++)G.add(rbox(.6,.75,.34,.008,MAT.cabinet,cx+len/2-.32-i*.62,1.98,-hz+.18));
  G.add(rbox(len*.4,.035,.24,.006,MAT.oak,cx-len*.3,1.55,-hz+.13));
  G.add(cyl(.045,.04,.1,MAT.ceramic,cx-len*.32,1.62,-hz+.13,20));
  // island
  const iw=clamp(st.w*.38,1.1,2.2),iz=clamp(st.l*.08,-.2,.5);
  G.add(rbox(iw,.88,.78,.012,MAT.cabinet,0,.46,iz));
  G.add(stoneBox(iw+.08,tt,.92,.006,topM,0,.94-tt/2,iz+.04));
  for(const sx of [-iw*.27,iw*.27]){
    G.add(cyl(.17,.17,.05,MAT.oak,sx,.66,iz+.72,28));G.add(cyl(.02,.02,.62,MAT.dark,sx,.31,iz+.72,10));
  }
  for(const sx of [-iw*.28,iw*.28]){
    const pen=new THREE.Mesh(new THREE.SphereGeometry(.14,24,16),MAT.hang);pen.position.set(sx,1.85,iz);G.add(pen);
    G.add(cyl(.004,.004,.85,MAT.dark,sx,2.28,iz,6));
  }
  const l=lamp(hx-.45,-hz+.45,1.5,lights,2);G.add(l.g);
  G.add(plant(hx-.4,hz-.5,1.05));
  // look at the counter you designed (between counter and island), otherwise at the island top
  if(TOP_CFG&&TOP_CFG.L)setFocus(fx,.9,cz+.05,fx+.25,1.62,Math.min(iz-.45,cz+1.75),ctObj);
  else setFocus(0,.92,iz,hx*.45,1.65,Math.min(hz-.3,iz+1.9));
}
function furnishLiving(G,st,fm,lights,hx,hz){
  const rw=clamp(st.w*.7,2,3.2),rl=clamp(st.l*.5,1.8,2.8);
  let sw=clamp(st.w-.9,1.5,2.15),sx=-hx*.12;const sz=-hz+.62;
  if(TABLE_ID&&TABLES[TABLE_ID]){
    // make room for the side table left of the sofa (in small rooms it used to end up inside the sofa arm)
    const left=-hx+.62;sx=Math.max(sx,left+sw/2);
    if(sx+sw/2>hx-.1){sw=Math.max(1.3,hx-.1-left);sx=(left+hx-.1)/2;}
  }
  const cw=(sw-.4)/3;
  // fireplace clad in stone on the left wall, with a hearth plate in the same stone (like Stenhusets peis project)
  // the hearth plate reaches .15 beyond the fireplace on each side, so keep that clear of the sofa
  const fz0=sz+.65,fz1=hz-.95,fireOn=!!FIRE,fireRoom=fz1-fz0>=.85;let fireObj=null,fzc=(fz0+fz1)/2,leftClear=-hx+.1;
  if(fireOn){
    const fwid=clamp((fireRoom?fz1-fz0:hz-.3-fz0)-.05,.8,1.3);fzc=fireRoom?fzc:fz0+fwid/2+.02;
    const fm2=sinkMaterial({stone:FIRE,surf:'honed'},()=>onTexture()),fg=new THREE.Group(),dep=.5,hh=.95,fx=-hx+dep/2;
    fg.add(stoneBox(dep,hh,fwid,.004,fm2,fx,hh/2,fzc));
    const glass=new THREE.Mesh(new THREE.PlaneGeometry(fwid*.62,.42),MAT.glass);glass.rotation.y=Math.PI/2;glass.position.set(-hx+dep+.002,.52,fzc);fg.add(glass);
    const glow=new THREE.Mesh(new THREE.PlaneGeometry(fwid*.5,.12),MAT.ember);glow.rotation.y=Math.PI/2;glow.position.set(-hx+dep+.001,.38,fzc);fg.add(glow);
    fg.add(stoneBox(.42,.02,fwid+.3,.003,fm2,-hx+dep+.21,.01,fzc));
    fg.name='peis';G.add(fg);fireObj=fg;leftClear=-hx+dep+.42+.08;
  }
  // coffee table (and rug) move right when the hearth needs the space
  const cxT=fireOn?Math.min(hx-.75,Math.max(sx,leftClear+.78)):sx;
  // rug under the coffee table, in front of the sofa, inside the room and clear of the hearth
  const R=RUGS[RUG_ID];
  if(R){
    const availW=hx-.1-leftClear;
    let prw=Math.min(rw,availW),prl=Math.min(rl,hz*2-.8);
    if(R.size){
      // real size; turned if the room is too narrow for the long side along the sofa
      [prw,prl]=R.size;if(prw>availW&&prl<=availW&&prw<=hz*2-.5)[prw,prl]=[prl,prw];
      prw=Math.min(prw,availW);prl=Math.min(prl,hz*2-.3);
    }
    G.add(persianRug(prw,prl,clamp(cxT,leftClear+prw/2,hx-prw/2-.1),clamp(sz+1.25,-hz+prl/2+.3,hz-prl/2-.1),R.style));
  }
  G.add(rbox(sw,.38,.95,.06,MAT.linen,sx,.26,sz));
  G.add(rbox(sw,.48,.22,.08,MAT.linen,sx,.64,sz-.37));
  for(const dx of [-1,1])G.add(rbox(.2,.56,.95,.07,MAT.linen,sx+dx*(sw/2-.1),.32,sz));
  for(let i=-1;i<=1;i++){
    G.add(rbox(cw-.02,.15,.72,.05,MAT.linen,sx+i*cw,.52,sz+.05));
    const b=rbox(cw-.04,.38,.16,.06,MAT.linen,sx+i*cw,.76,sz-.2);b.rotation.x=-.18;G.add(b);
  }
  G.add(rbox(.42,.42,.1,.04,std('#a58f76',.95),sx+sw/2-.5,.66,sz+.18));
  // the big coffee table: a slab top on two slab legs, all in one stone (like Stenhusets Emperador table)
  let coffeeObj=null;
  if(COFFEE){const cm=sinkMaterial({stone:COFFEE,surf:'honed'},()=>onTexture()),ct=new THREE.Group(),L2=1.25,D2=.66,Ht=.38,tk=.035;
    ct.add(stoneBox(L2,tk,D2,.004,cm,cxT,Ht-tk/2,sz+1.2));
    for(const s of [-1,1])ct.add(stoneBox(tk,Ht-tk,D2-.04,.003,cm,cxT+s*(L2/2-.12),(Ht-tk)/2,sz+1.2));
    ct.name='stuebord';G.add(ct);coffeeObj=ct;}
  else{G.add(rbox(1.1,.05,.6,.012,MAT.oak,cxT,.4,sz+1.2));for(const [a,b] of [[-.45,-.22],[.45,-.22],[-.45,.22],[.45,.22]])G.add(cyl(.02,.02,.38,MAT.dark,cxT+a,.19,sz+1.2+b,10));}
  const frame=rbox(1.2,.9,.04,.006,MAT.darkWood,sx,1.58,-hz+.03);G.add(frame);
  const art=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.8),new THREE.MeshStandardMaterial({map:artCanvas(),roughness:.9}));art.position.set(sx,1.58,-hz+.054);G.add(art);
  const l=lamp(Math.min(sx+sw/2+.5,hx-.35),sz-.1,1.45,lights,2.4);G.add(l.g);
  if(!fireOn||fireRoom)G.add(plant(-hx+.4,hz-.5,1.15));
  G.add(rbox(.7,.55,.5,.05,MAT.oak,hx-.5,.28,-hz+.4));
  let tableObj=null,tx=0;
  if(TABLE_ID&&TABLES[TABLE_ID]){tx=Math.max(-hx+.32,sx-sw/2-.3);tableObj=buildTable(TABLE_ID,()=>onTexture());tableObj.position.set(tx,0,sz+.05);G.add(tableObj);}
  // the camera's "product" view looks at what was chosen last
  if(LIVING_FOCUS==='fire'&&fireObj)setFocus(-hx+.3,.5,fzc,Math.min(hx-.4,-hx+2.3),1.35,Math.min(hz-.3,fzc+.6),fireObj);
  else if(LIVING_FOCUS==='table'&&tableObj)setFocus(tx,.34,sz+.05,tx+.1,1.45,Math.min(hz-.3,sz+1.75),tableObj);
  else setFocus(cxT,.38,sz+1.2,cxT+.5,1.45,Math.min(hz-.3,sz+2.7),coffeeObj);
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
  return {group:G,walls,lights,win,dims:{W,L,hx,hz,zc,ww,room:st.room},focus:FOCUS};
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
  // Khronos PBR Neutral keeps the base colour of the stone (ACES shifts hue and saturation); falls back to ACES on old three.js
  renderer.toneMapping=THREE.NeutralToneMapping!==undefined?THREE.NeutralToneMapping:THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
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
  css.textContent='.scene-views{position:absolute;top:14px;right:14px;z-index:9;display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;max-width:62%}.scene-views button{border:0;background:#f7f5eee8;color:#242725;padding:8px 11px;font:600 10px/1 var(--sans,system-ui);letter-spacing:.06em;text-transform:uppercase;cursor:pointer}.scene-views button.on{background:#242725;color:#fff}.scene-views{align-items:flex-start;flex-wrap:nowrap}.scene-views .sv-cam{display:flex;align-items:center;gap:7px;min-height:34px}.sv-cam svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.sv-cam .sv-car{font-size:9px;opacity:.7}.scene-views [data-z]{min-width:34px;min-height:34px}.sv-menu{position:absolute;top:calc(100% + 6px);right:0;display:flex;flex-direction:column;min-width:190px;background:#f7f5eef7;box-shadow:0 10px 26px #0003;padding:6px;backdrop-filter:blur(6px)}.sv-menu[hidden]{display:none}.scene-views .sv-menu button{background:transparent;text-align:left;padding:11px 12px;font-size:11px}.scene-views .sv-menu button.on{background:#242725;color:#fff}.scene-loading{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:9;background:#242725d9;color:#fff;padding:9px 14px;font:600 10px/1 var(--sans,system-ui);letter-spacing:.08em;text-transform:uppercase;opacity:0;transition:opacity .3s;pointer-events:none}.scene-loading.on{opacity:1}@media(max-width:700px){.scene-views{top:60px;max-width:calc(100% - 24px);left:12px;right:auto;justify-content:flex-start}.scene-views button{padding:7px 8px;font-size:9px}.sv-menu{left:0;right:auto}}';
  document.head.appendChild(css);
  const bar=document.createElement('div');bar.className='scene-views';
  const VIEWS=[['door','Fra døren'],['product','Servanten'],['window','Mot vinduet'],['floor','Gulvdetalj'],['wall','Veggdetalj'],['dollhouse','Oversikt']];
  // one camera button opens the list of camera angles (keeps the top of the room free); zoom stays beside it
  bar.innerHTML='<button type="button" class="sv-cam" aria-haspopup="true" aria-expanded="false" aria-label="Velg kameravinkel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg><span class="sv-cur">Fra døren</span><span class="sv-car" aria-hidden="true">▾</span></button>'+
    '<div class="sv-menu" role="menu" hidden>'+VIEWS.map(v=>'<button type="button" role="menuitem" data-v="'+v[0]+'">'+v[1]+'</button>').join('')+'</div>'+
    '<button type="button" data-z="-1" aria-label="Zoom ut">−</button><button type="button" data-z="1" aria-label="Zoom inn">＋</button>';
  const svMenu=bar.querySelector('.sv-menu'),svCam=bar.querySelector('.sv-cam');
  const svOpen=v=>{svMenu.hidden=!v;svCam.setAttribute('aria-expanded',String(v));};
  const svLabel=()=>{const b=bar.querySelector('[data-v].on');bar.querySelector('.sv-cur').textContent=b?b.textContent:'Kamera';};
  document.addEventListener('click',e=>{if(!bar.contains(e.target))svOpen(false);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')svOpen(false);});
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
      case 'product':{const f=content&&content.focus;if(f){content.group.updateMatrixWorld(true);const v=productView(content.group,f,hz);return {mode:'in',fov:58,...v};}return viewDef('door');}
      case 'floor':{
        // stand near the front of the room and look down at a free piece of floor (not under the island or on the rug)
        const pos=new THREE.Vector3(-hx*.2,1.25,hz-.35);content.group.updateMatrixWorld(true);
        return {mode:'in',fov:55,pos,target:floorView(content.group,dims,pos)};}
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
    view=name;bar.querySelectorAll('[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===name));svLabel();
    showWalls(name);
    const v=viewDef(name);
    if(instant){tween=null;snap(v);request();return;}
    const d=new THREE.Vector3();camera.getWorldDirection(d);
    tween={t0:performance.now(),dur:700,p0:camera.position.clone(),l0:camera.position.clone().addScaledVector(d,4),f0:camera.fov,v};
    controls.enabled=false;request();
  }
  bar.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b===svCam){svOpen(svMenu.hidden);return;}
    if(b.dataset.v){goView(b.dataset.v);svOpen(false);}
    else if(b.dataset.z){camera.fov=clamp(camera.fov-Number(b.dataset.z)*7,28,88);camera.updateProjectionMatrix();request();}
  });

  /* Light as it behaves in a real room: colour temperatures in kelvin, partly white-balanced the way the eye (or a phone camera)
   * adapts, and an exposure that follows the light level, so a stone looks like the same stone at noon and in the evening. */
  const kelvin=K=>{const t=K/100;let r,g,b;
    if(t<=66){r=255;g=99.4708025861*Math.log(t)-161.1195681661;b=t<=19?0:138.5177312231*Math.log(t-10)-305.0447927307;}
    else{r=329.698727446*Math.pow(t-60,-.1332047592);g=288.1221695283*Math.pow(t-60,-.0755148492);b=255;}
    return new THREE.Color().setRGB(clamp(r,0,255)/255,clamp(g,0,255)/255,clamp(b,0,255)/255,THREE.SRGBColorSpace);};
  const adapted=(K,adapt)=>new THREE.Color(1,1,1).lerp(kelvin(K),1-adapt); // adapt 1 = fully white-balanced
  function applyLight(st){
    const Lf=clamp(st.light/100,.15,1),night=clamp((.55-Lf)/.4,0,1),day=THREE.MathUtils.smoothstep(Lf,.15,.75);
    const el=THREE.MathUtils.degToRad(6+(Lf-.15)/.85*46);
    const dir=new THREE.Vector3(Math.cos(el)*.92,Math.sin(el),Math.cos(el)*.4).normalize();
    sun.position.copy(dir).multiplyScalar(24);sun.target.position.set(0,.8,0);
    // sun 2900 K (low, evening) .. 5600 K (midday); sky light through the window 4300 .. 7200 K
    sun.color.copy(adapted(THREE.MathUtils.lerp(2900,5600,day),.62));
    sun.intensity=.3+3.0*Math.pow(Lf,1.15);
    const ext=dims?Math.max(dims.W,dims.L)*.9:5;
    Object.assign(sun.shadow.camera,{left:-ext,right:ext,top:ext,bottom:-ext,near:1,far:60});sun.shadow.camera.updateProjectionMatrix();
    const skyK=THREE.MathUtils.lerp(4300,7200,day);
    scene.environmentIntensity=.32+.5*Lf;hemi.intensity=.3+.26*Lf;hemi.color.copy(adapted(skyK,.7));hemi.groundColor.copy(adapted(3800,.6)).multiplyScalar(.75);
    // exposure follows the light (camera / eye adaptation): darker light -> longer exposure, but evenings still read as evenings
    const level=.22+.78*Lf*(1-night*.55)+night*.3;
    renderer.toneMappingExposure=clamp(.98/Math.pow(level,.5),.92,1.55);
    const skyMesh=content&&content.group.getObjectByName('sky');
    if(skyMesh){const sc=adapted(skyK,.3);skyMesh.material.color.copy(sc).multiplyScalar(.35+.7*Lf);}
    scene.background.set(night>0?'#7d7a74':'#cfcac1');
    lampsOn=night;
    if(content&&content.win){
      content.win.intensity=(1.2+5.5*Math.pow(Lf,1.4))*(1-night*.75);
      content.win.color.copy(adapted(skyK,.55));
    }
    // warm lamps (2700 K) in the evening, white-balanced like the eye does indoors
    const lampC=adapted(2700,.55);
    MAT.lampShade.emissive.copy(lampC);MAT.hang.emissive.copy(lampC);
    MAT.ember.emissiveIntensity=.5+night*1.6;
    MAT.lampShade.emissiveIntensity=night*1.6;MAT.hang.emissiveIntensity=night*1.4;
    if(content)for(const o of content.lights){o.l.color.copy(lampC);o.l.intensity=o.power*night*14;}
  }
  function rebuild(st,fm,wm){
    if(content){
      scene.remove(content.group);
      content.group.traverse(o=>{if(o.geometry)o.geometry.dispose();});
    }
    content=buildContent(st,fm,wm);dims=content.dims;scene.add(content.group);
  }
  const PRODUCT_LABEL={bad:'Servanten',kjokken:'Benkeplaten',stue:'Bordet'};
  let focusNext=false;
  async function update(){
    const st=window.getStudioState(),key=[st.room,st.w,st.l,st.floor.id,st.wall.id,SINK_ID,TABLE_ID,TOP_CFG?JSON.stringify(TOP_CFG):'',RUG_ID,COFFEE,FIRE,KFLOOR,LIVING_FOCUS,SPLASH].join('|');
    const pb=bar.querySelector('[data-v=product]');if(pb)pb.textContent=PRODUCT_LABEL[st.room]||'Produktet';svLabel();
    if(key===roomKey){applyLight(st);request();return;}
    roomKey=key;const my=++token;
    let fm,wm;
    try{
      // bathroom: the chosen stones; kitchen: oak (or the chosen floor stone) with painted walls; living room: oak and paint
      const stoneFloor=st.room==='bad'||(st.room==='kjokken'&&KFLOOR);
      [fm,wm,splashM]=await Promise.all([stoneFloor?ensureSurface(st.floor.id):oakFloor(),st.room==='bad'?ensureSurface(st.wall.id):MAT.wallPaint,st.room==='kjokken'&&SPLASH&&STONES[SPLASH]?ensureSurface(SPLASH):null]);
    }catch(e){console.warn('Stenhuset studio:',e);return;}
    if(my!==token)return;
    const first=!content;
    rebuild(st,fm,wm);applyLight(st);goView(view,true);
    // a new sink / table / countertop: turn the camera to it
    if(focusNext){focusNext=false;if(!first)goView('product');else goView('product',true);}
    window.dispatchEvent(new Event('studio:changed'));
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
    setSink(id){SINK_ID=id&&SINKS[id]?Number(id):null;roomKey='';focusNext=true;update();},getSink:()=>SINK_ID,sinks:SINKS,
    setTable(id){TABLE_ID=id&&TABLES[id]?Number(id):null;LIVING_FOCUS='table';roomKey='';focusNext=true;update();},getTable:()=>TABLE_ID,tables:TABLES,
    featureStones:FEATURE_STONES.map(([id,n])=>({id,n,c0:STONES[id]?STONES[id].c0:[200,200,200]})),
    setCoffee(id){COFFEE=id&&STONES[id]?id:null;LIVING_FOCUS='coffee';roomKey='';focusNext=true;update();},getCoffee:()=>COFFEE,
    setFire(id){FIRE=id&&STONES[id]?id:null;LIVING_FOCUS='fire';roomKey='';focusNext=!!FIRE;update();},getFire:()=>FIRE,
    setKitchenFloor(stone){KFLOOR=!!stone;roomKey='';update();},getKitchenFloor:()=>KFLOOR,
    setSplash(id){SPLASH=id&&STONES[id]?id:null;roomKey='';focusNext=!!SPLASH;update();},getSplash:()=>SPLASH,
    topStones:TOP_STONES.map(([id,n])=>({id,n,c0:STONES[id]?STONES[id].c0:[200,200,200]})),
    // keeps the whole design from the countertop designer (length, depth, edge, sink and hob cut-outs, splash)
    setTop(cfg){TOP_CFG=cfg&&cfg.stone?{...cfg,t:cfg.t||.03}:null;roomKey='';focusNext=true;update();},getTop:()=>TOP_CFG&&{...TOP_CFG},
    getView:()=>view,
    rugs:RUGS,getRug:()=>RUG_ID,setRug(id){RUG_ID=RUGS[id]?id:'none';roomKey='';update();},
    // small picture of a rug for the carousel
    rugThumb(id){const R=RUGS[id];if(!R)return '';const t=rugTextures(256,R.size?Math.round(256*R.size[1]/R.size[0]):170,R.style);return t.canvas.toDataURL('image/jpeg',.8);},
    // picture of the current view for sharing: rendered and read back in the same task (no preserveDrawingBuffer needed)
    snapshot(){renderer.render(scene,camera);return renderer.domElement;}};
  window.addEventListener('hashchange',()=>setTimeout(()=>{resize();request();},50));
  resize();update();
}
if(!globalThis.__STUDIO_TEST__){
  try{init();}catch(e){console.warn('Stenhuset 3D-studio utilgjengelig, bruker 2D-visning.',e);}
}
