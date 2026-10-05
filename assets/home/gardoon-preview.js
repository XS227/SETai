(function(){
const host=document.querySelector('.gardoon-preview');
if(!host) return;
/* =====================================================
   1. HJULENE
===================================================== */
const TOP_POCKETS = [
  [0,'g',true],[32,'r',false],[15,'b',false],[19,'r',false],[4,'b',true],
  [21,'r',false],[2,'b',false],[25,'r',false],[17,'b',false],[34,'r',true],
  [6,'b',false],[27,'r',false],[13,'b',false],[36,'r',true],[11,'b',false],
  [30,'r',false],[8,'b',false],[23,'r',false],[10,'b',true],[5,'r',false],
  [24,'b',false],[16,'r',false],[33,'b',false],[1,'r',false],[20,'b',true],
  [14,'r',false],[31,'b',false],[9,'r',false],[22,'b',true],[18,'r',false],
  [29,'b',false],[7,'r',false],[28,'b',true],[12,'r',false],[35,'b',false],
  [3,'r',false],[26,'b',false]
];
/* nedre plate: kun tallene som har hull i øvre plate, gjentatt tre runder */
const HOLE_NUMS=[0,4,10,20,22,28,34,36];
const GROUP_COLORS=['g','r','b','r','b','r','b','r'];
const BOT_POCKETS=[];
for(let round=0; round<3; round++){
  HOLE_NUMS.forEach((n,i)=>BOT_POCKETS.push([n,GROUP_COLORS[i],false]));
}
const STEP_T=360/TOP_POCKETS.length;   /* 9,73° */
const STEP_B=360/BOT_POCKETS.length;   /* 15°   */

const cx=400, cy=400;
const rEdge=396, rRimInner=350, rPocketOuter=326, rPocketInner=236, rNumber=282, rHole=190;
const rConeOuter=236, rConeMid=150, rHubTop=60, rHandleLen=88, rKnob=20;
const FILL={r:'url(#redG)',b:'url(#blackG)',g:'url(#greenG)'};

const pt=(r,deg)=>{const a=(deg-90)*Math.PI/180; return [ (cx+r*Math.cos(a)).toFixed(2), (cy+r*Math.sin(a)).toFixed(2) ];};
function arcPath(rOut,rIn,a0,a1){
  const [x0o,y0o]=pt(rOut,a0),[x1o,y1o]=pt(rOut,a1),[x1i,y1i]=pt(rIn,a1),[x0i,y0i]=pt(rIn,a0);
  return `M ${x0o} ${y0o} A ${rOut} ${rOut} 0 0 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${rIn} ${rIn} 0 0 0 ${x0i} ${y0i} Z`;
}

/* Bygger hele hjulet som én SVG-streng. Rasteriseres til canvas én gang per tilstand,
   slik at nettleseren ikke må tegne vektorene på nytt for hver eneste frame. */
function wheelSVG(pockets, step, opt){
  const P=[];
  P.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">`);
  P.push(`<defs>
   <linearGradient id="rimG" x1="15%" y1="0%" x2="85%" y2="100%">
     <stop offset="0%" stop-color="#f6e3ab"/><stop offset="30%" stop-color="#c9a35a"/>
     <stop offset="55%" stop-color="#8a6a2c"/><stop offset="78%" stop-color="#c9a35a"/>
     <stop offset="100%" stop-color="#f6e3ab"/></linearGradient>
   <radialGradient id="faceG" cx="38%" cy="34%" r="75%">
     <stop offset="0%" stop-color="#f6e3ab"/><stop offset="45%" stop-color="#d1ab63"/>
     <stop offset="78%" stop-color="#96762f"/><stop offset="100%" stop-color="#5a4318"/></radialGradient>
   <radialGradient id="coneG" cx="36%" cy="30%" r="80%">
     <stop offset="0%" stop-color="#fdf1cf"/><stop offset="35%" stop-color="#e7c877"/>
     <stop offset="65%" stop-color="#b78e46"/><stop offset="88%" stop-color="#7a5c26"/>
     <stop offset="100%" stop-color="#4a3714"/></radialGradient>
   <radialGradient id="hubG" cx="35%" cy="30%" r="80%">
     <stop offset="0%" stop-color="#fff6dc"/><stop offset="45%" stop-color="#e7c877"/>
     <stop offset="80%" stop-color="#8a6a2c"/><stop offset="100%" stop-color="#3a2c10"/></radialGradient>
   <radialGradient id="redG" cx="50%" cy="32%" r="80%">
     <stop offset="0%" stop-color="#c8323f"/><stop offset="100%" stop-color="#6c1219"/></radialGradient>
   <radialGradient id="blackG" cx="50%" cy="32%" r="80%">
     <stop offset="0%" stop-color="#2e2e2e"/><stop offset="100%" stop-color="#0a0a0a"/></radialGradient>
   <radialGradient id="greenG" cx="50%" cy="32%" r="80%">
     <stop offset="0%" stop-color="#1c8a4c"/><stop offset="100%" stop-color="#073d1e"/></radialGradient>
   <radialGradient id="holeG" cx="45%" cy="38%" r="65%">
     <stop offset="0%" stop-color="#2a2a2a"/><stop offset="55%" stop-color="#0a0a0a"/>
     <stop offset="100%" stop-color="#000"/></radialGradient>
  </defs>`);

  P.push(`<circle cx="400" cy="400" r="${rEdge}" fill="none" stroke="url(#rimG)" stroke-width="16"/>`);
  P.push(`<circle cx="400" cy="400" r="388" fill="none" stroke="#4a3714" stroke-width="1.6" opacity=".55"/>`);
  P.push(`<circle cx="400" cy="400" r="${rRimInner}" fill="none" stroke="url(#rimG)" stroke-width="30"/>`);
  P.push(`<circle cx="400" cy="400" r="336" fill="none" stroke="#4a3714" stroke-width="1.4" opacity=".5"/>`);
  P.push(`<circle cx="400" cy="400" r="${rPocketOuter}" fill="url(#faceG)"/>`);

  if(opt.colors){
    pockets.forEach((p,i)=>P.push(
      `<path d="${arcPath(rPocketOuter,rPocketInner,i*step,(i+1)*step)}" fill="${FILL[p[1]]}" stroke="#e7c877" stroke-width="1.2"/>`));
  }
  P.push(`<circle cx="400" cy="400" r="${rPocketOuter}" fill="none" stroke="#f6e3ab" stroke-width="1.3" opacity=".8"/>`);
  P.push(`<circle cx="400" cy="400" r="${rPocketInner}" fill="none" stroke="#f6e3ab" stroke-width="1.3" opacity=".8"/>`);
  pockets.forEach((p,i)=>{
    const [x1,y1]=pt(rPocketOuter+3,i*step),[x2,y2]=pt(rPocketInner-2,i*step);
    P.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#8a6a2c" stroke-width="1" opacity=".6"/>`);
  });

  if(opt.numbers){
    pockets.forEach((p,i)=>{
      const mid=i*step+step/2,[x,y]=pt(rNumber,mid);
      const fs=(step>12?28:(p[0]===0?26:23));
      P.push(`<text x="${x}" y="${y}" font-size="${fs}" font-family="Georgia,'Times New Roman',serif" font-weight="700" fill="#f7efe0" stroke="rgba(0,0,0,.5)" stroke-width="1" paint-order="stroke" text-anchor="middle" dominant-baseline="middle" transform="rotate(${mid.toFixed(2)} ${x} ${y})">${p[0]}</text>`);
    });
  }

  P.push(`<circle cx="400" cy="400" r="${rConeOuter}" fill="url(#coneG)"/>`);
  P.push(`<circle cx="400" cy="400" r="${rConeOuter}" fill="none" stroke="#4a3714" stroke-width="1.4" opacity=".5"/>`);
  P.push(`<circle cx="400" cy="400" r="${rConeMid}" fill="none" stroke="#4a3714" stroke-width="1" opacity=".35"/>`);
  for(let i=0;i<pockets.length;i++){
    const [x1,y1]=pt(rConeOuter-4,i*step),[x2,y2]=pt(rHubTop+18,i*step);
    P.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#4a3714" stroke-width=".6" opacity=".22"/>`);
  }
  if(opt.holes){
    pockets.forEach((p,i)=>{
      if(!p[2]) return;
      const [x,y]=pt(rHole,i*step+step/2);
      P.push(`<circle cx="${x}" cy="${y}" r="12" fill="url(#holeG)" stroke="#f6e3ab" stroke-width="1.7"/>`);
      P.push(`<circle cx="${x}" cy="${y}" r="4" fill="#000"/>`);
    });
  }
  P.push(`<circle cx="400" cy="400" r="${rHubTop+26}" fill="url(#hubG)" stroke="#3a2c10" stroke-width="1.8"/>`);
  P.push(`<circle cx="400" cy="400" r="${rHubTop}" fill="url(#hubG)" stroke="#f6e3ab" stroke-width="1.6"/>`);
  [0,90,180,270].forEach(a=>{
    const [x1,y1]=pt(18,a),[x2,y2]=pt(rHandleLen,a);
    P.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="url(#hubG)" stroke-width="9" stroke-linecap="round"/>`);
    P.push(`<circle cx="${x2}" cy="${y2}" r="11" fill="url(#hubG)" stroke="#3a2c10" stroke-width="1.3"/>`);
  });
  P.push(`<circle cx="400" cy="400" r="${rKnob}" fill="url(#hubG)" stroke="#f6e3ab" stroke-width="1.6"/>`);
  P.push(`<circle cx="400" cy="400" r="7" fill="#fff6dc"/>`);
  P.push(`</svg>`);
  return P.join('');
}

/* --- canvas-par per hjul, med kryssfading mellom tilstander --- */
const RASTER = 900;
function makeWheel(host, pockets, step){
  const a=document.createElement('canvas'), b=document.createElement('canvas');
  [a,b].forEach(c=>{ c.width=c.height=RASTER; host.appendChild(c); });
  return {host, pockets, step, a, b, showing:null, key:''};
}
function setWheel(w, opt){
  const key=`${opt.colors?1:0}${opt.numbers?1:0}${opt.holes?1:0}`;
  if(w.key===key) return;
  w.key=key;
  const target = w.showing===w.a ? w.b : w.a;
  const img=new Image();
  img.onload=()=>{
    const ctx=target.getContext('2d');
    ctx.clearRect(0,0,RASTER,RASTER);
    ctx.drawImage(img,0,0,RASTER,RASTER);
    target.style.opacity=1;
    if(w.showing && w.showing!==target) w.showing.style.opacity=0;
    w.showing=target;
  };
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(wheelSVG(w.pockets,w.step,opt));
}
const wheelTop=makeWheel(document.getElementById('discTop'),TOP_POCKETS,STEP_T);
const wheelBot=makeWheel(document.getElementById('discBottom'),BOT_POCKETS,STEP_B);

/* =====================================================
   2. GEOMETRI — 800 px = 76 cm
===================================================== */
const PXCM=800/76;
const Z_TOP=-321, Z_BOT=321;
const THICK=11*PXCM;
const R_TRACK=360, R_POCKET=281, R_HOLE=190;
const HOLE_INDEX=TOP_POCKETS.findIndex(p=>p[0]===20);   /* hullet kula faller i */
const WIN_INDEX=3;                                      /* nedre lomme: tallet 20 */
const HOLE_A=HOLE_INDEX*STEP_T+STEP_T/2;
const WIN_A=WIN_INDEX*STEP_B+STEP_B/2;

const stage=document.getElementById('stage');
const world=document.getElementById('world');
const ball=document.getElementById('ball');
const corona=document.getElementById('corona');
const shadow=document.getElementById('shadow');
const plateTop=document.getElementById('plateTop');
const plateBottom=document.getElementById('plateBottom');
const discTop=document.getElementById('discTop');
const discBottom=document.getElementById('discBottom');
const edgeTop=plateTop.querySelector('.edge');
const edgeBot=plateBottom.querySelector('.edge');
const pole=document.getElementById('pole');
const collarTop=document.getElementById('collarTop');
const collarBottom=document.getElementById('collarBottom');
const dimline=document.getElementById('dimline');
const glow=document.getElementById('glow');
const stars=document.getElementById('stars');
const solar=document.getElementById('solar');
const result=document.getElementById('result');
const hint=document.getElementById('hint');
const rail=document.getElementById('rail');

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const easeInOut=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const easeOut=t=>1-Math.pow(1-t,3);
const easeIn=t=>t*t;
const reduce=false;

const PLANETS=[
  {r:150,s:7, c:'#b7a893', d:1.00},{r:196,s:10,c:'#d8b784', d:0.76},
  {r:242,s:11,c:'#6fa8dc', d:0.60},{r:290,s:9, c:'#c1553b', d:0.48},
  {r:360,s:20,c:'#d9b98a', d:0.29},{r:424,s:17,c:'#e0cf9a', d:0.22},
  {r:484,s:13,c:'#93c9d6', d:0.16},{r:540,s:13,c:'#5b7fc7', d:0.12}
];
const planetEls=PLANETS.map(pl=>{
  const o=document.createElement('div');
  o.className='orbit';
  o.style.width=o.style.height=(pl.r*2)+'px';
  o.style.margin=(-pl.r)+'px 0 0 '+(-pl.r)+'px';
  solar.appendChild(o);
  const d=document.createElement('div');
  d.className='planet';
  d.style.width=d.style.height=pl.s+'px';
  d.style.margin=(-pl.s/2)+'px 0 0 '+(-pl.s/2)+'px';
  d.style.background='radial-gradient(circle at 34% 30%, rgba(255,255,255,.55), transparent 60%), '+pl.c;
  solar.appendChild(d);
  return {orbit:o, dot:d, r:pl.r, d:pl.d, phase:Math.random()*Math.PI*2};
});

const CAM=[
  {x:0,   z:0,     s:.52, phi:62},{x:0,   z:-260,  s:1.4, phi:62},
  {x:150, z:-520,  s:2.5, phi:60},{x:-165,z:Z_TOP, s:1.00,phi:58},
  {x:-165,z:Z_TOP, s:1.10,phi:42},{x:160, z:Z_TOP, s:1.14,phi:30},
  {x:160, z:Z_TOP, s:1.16,phi:20},{x:-160,z:Z_TOP, s:1.00,phi:48},
  {x:-160,z:Z_TOP, s:1.00,phi:56},{x:165, z:Z_TOP, s:1.16,phi:10},
  {x:165, z:Z_TOP, s:1.75,phi:18, follow:.8},{x:-175,z:0, s:.48, phi:60},
  {x:-175,z:0,     s:.54, phi:60},{x:170, z:Z_BOT-130, s:.92, phi:70},
  {x:170, z:Z_BOT, s:1.06,phi:76},{x:-168,z:Z_BOT, s:1.10,phi:44},
  {x:150, z:Z_BOT, s:1.16,phi:28},{x:150, z:Z_BOT, s:1.26,phi:30}
];
const BEATS=CAM.length-1;

let p=0, pTarget=0, rotTop=0, rotBot=0, dropAngle=null, last=performance.now(), solarT=0;
let beatsEls=[], railTicks=[], view='reisen';

function proj(r,angleDeg,z,cosP,sinP){
  const a=angleDeg*Math.PI/180;
  return {x:r*Math.sin(a), y:-r*Math.cos(a)*cosP + z*sinP, depth:-Math.cos(a)};
}

function syncPreview(){
  const q=pTarget;
  stars.classList.toggle('on', q<1.4);
  solar.classList.toggle('on', q<.85);
  glow.classList.toggle('on', q>1.4);
  plateTop.classList.toggle('visible', q>2.45 && q<13.6);
  plateTop.classList.toggle('underside', q>12.4);
  setWheel(wheelTop,{colors:q>5.45, numbers:q>4.45, holes:q>3.45});
  plateBottom.classList.toggle('visible', q>10.4);
  setWheel(wheelBot,{colors:true, numbers:true, holes:false});
  pole.classList.toggle('visible', q>10.4);
  collarTop.classList.toggle('visible', q>10.4 && q<13.6);
  collarBottom.classList.toggle('visible', q>10.4);
  dimline.classList.toggle('visible', q>10.7 && q<12.4);
  result.classList.toggle('on', false);
  if(q<9.9) dropAngle=null;
}
const _last={};
function setT(elm,key,val){ if(_last[key]!==val){ _last[key]=val; elm.style.transform=val; } }

let previewStart=performance.now()-5500;
function frame(now){
  const dt=Math.min(.05,(now-last)/1000); last=now;
  const sec=(now-previewStart)/1000;
  const cyc=(sec*(BEATS/14))%(BEATS*2);
  pTarget=cyc<=BEATS?cyc:(BEATS*2-cyc);
  syncPreview();

  const dp=pTarget-p;
  p = Math.abs(dp)<0.0005 ? pTarget : p + dp*Math.min(1, dt*9);
  const i=Math.floor(p), t=p-i;

  if(!reduce){
    let sT=0,sB=0;
    if(p>=6.6&&p<8) sT=lerp(0,175,clamp((p-6.6)/1.2,0,1));
    else if(p>=8&&p<10) sT=lerp(175,30,easeOut(clamp((p-8)/2,0,1)));
    else if(p>=10) sT=24;
    if(p>=12.6&&p<15) sB=-lerp(0,145,clamp((p-12.6)/1.2,0,1));
    else if(p>=15) sB=lerp(-145,0,easeOut(clamp((p-15)/1.4,0,1)));
    rotTop+=sT*dt; rotBot+=sB*dt; solarT+=dt;
  }
  if(p>16.4){
    const cur=((rotBot%360)+360)%360, want=(((180-WIN_A)%360)+360)%360;
    let d=want-cur; if(d>180)d-=360; if(d<-180)d+=360;
    rotBot+=d*Math.min(1,dt*3);
  }
  setT(discTop,'rt',`rotate(${rotTop.toFixed(1)}deg)`);
  setT(discBottom,'rb',`rotate(${rotBot.toFixed(1)}deg)`);

  const c0=CAM[clamp(i,0,BEATS)], c1=CAM[clamp(i+1,0,BEATS)];
  const e=easeInOut(t);
  const phi=lerp(c0.phi,c1.phi,e)*Math.PI/180;
  const cosP=Math.cos(phi), sinP=Math.sin(phi);
  const camS=lerp(c0.s,c1.s,e);
  const vw=host.clientWidth||400, vh=host.clientHeight||250;
  const mob=vw<420;
  const unit=Math.min(560, vw*(mob?1.12:1.02), vh*(mob?.88:.94))/800;
  const s=unit*camS;
  const camZ=lerp(c0.z,c1.z,e);
  const camX=(mob?0:lerp(c0.x,c1.x,e))*0.35;
  const camYoff=mob?-vh*0.08:0;
  const follow=lerp(c0.follow||0,c1.follow||0,e);

  const zT=Z_TOP*sinP, zB=Z_BOT*sinP, kY=cosP.toFixed(4);
  setT(plateTop,'pt',`translateY(${zT.toFixed(1)}px) scaleY(${kY})`);
  setT(plateBottom,'pb',`translateY(${zB.toFixed(1)}px) scaleY(${kY})`);
  const eOff=(THICK*sinP).toFixed(1);
  setT(edgeTop,'et',`translateY(${eOff}px)`);
  setT(edgeBot,'eb',`translateY(${eOff}px)`);
  const poleH=Math.max(1,(Z_BOT-Z_TOP)*sinP), poleHs=poleH.toFixed(1)+'px';
  if(_last.ph!==poleHs){ _last.ph=poleHs; pole.style.height=poleHs; dimline.style.height=poleHs; }
  setT(pole,'po',`translateY(${(-poleH/2).toFixed(1)}px)`);
  setT(dimline,'dl',`translateY(${(-poleH/2).toFixed(1)}px)`);
  setT(collarTop,'ct',`translateY(${(zT+THICK*sinP*0.5).toFixed(1)}px) scaleY(${kY})`);
  setT(collarBottom,'cb',`translateY(${zB.toFixed(1)}px) scaleY(${kY})`);

  if(p<1.5){
    planetEls.forEach(pl=>{
      const a=pl.phase+solarT*pl.d*.32;
      pl.dot.style.transform=`translate(${(Math.cos(a)*pl.r).toFixed(1)}px,${(Math.sin(a)*pl.r*cosP).toFixed(1)}px)`;
      pl.orbit.style.transform=`scaleY(${kY})`;
    });
  }

  let bx=0,by=0,bs=1,bo=1,sh=0,shS=1,cor=0;
  const LAND=200;

  if(p<1){ bs=9; cor=1; }
  else if(p<2){ const f=easeInOut(t); bs=lerp(9,1,f); cor=1-easeIn(clamp(t*1.25,0,1)); by=lerp(0,-520,f); }
  else if(p<3){ bx=Math.sin(now/900)*7; by=lerp(-520,-500,easeInOut(t)); }
  else if(p<6){ const q=clamp((p-3)/3,0,1); bx=Math.sin(now/900)*6; by=lerp(-500,-470,q); bo=lerp(1,.8,q); }
  else if(p<7){
    const L=proj(R_TRACK,LAND,Z_TOP,cosP,sinP), f=easeIn(t);
    bx=lerp(0,L.x,easeOut(t)); by=lerp(-470,L.y,f)-Math.sin(Math.PI*t)*10;
    sh=f*.5; shS=lerp(2.6,1,f);
  }
  else if(p<9){ const L=proj(R_TRACK,LAND-rotTop*1.6,Z_TOP,cosP,sinP); bx=L.x; by=L.y; bs=1+L.depth*.07; sh=.5; }
  else if(p<10){ const L=proj(lerp(R_TRACK,R_HOLE+34,easeInOut(t)),LAND-rotTop*1.6,Z_TOP,cosP,sinP); bx=L.x; by=L.y; bs=1+L.depth*.07; sh=.45; }
  else if(p<11){
    const k=clamp(t*1.4,0,1);
    const L=proj(lerp(R_HOLE+34,R_HOLE,easeInOut(t)), lerp(LAND-rotTop*1.6, rotTop+HOLE_A, easeInOut(k)), Z_TOP,cosP,sinP);
    bx=L.x; by=L.y;
    bs=(1+L.depth*.07)*(t>.85?lerp(1,.12,(t-.85)/.15):1);
    bo=t>.9?lerp(1,0,(t-.9)/.1):1;
    sh=.45*(1-clamp((t-.85)/.15,0,1));
    if(t>.85&&dropAngle===null) dropAngle=rotTop+HOLE_A;
  }
  else if(p<12){ const L=proj(R_HOLE,(dropAngle===null?HOLE_A:dropAngle),Z_TOP,cosP,sinP); bx=L.x; by=L.y; bo=0; sh=0; }
  else if(p<13){
    const L=proj(R_HOLE,(dropAngle===null?HOLE_A:dropAngle),Z_TOP,cosP,sinP), f=easeIn(t);
    bx=L.x; by=lerp(L.y+THICK*sinP+18, 100*sinP, f);
    bo=clamp(t*5,0,1); sh=.14+f*.18; shS=lerp(3.4,2.2,f);
  }
  else if(p<14){
    const S=proj(R_HOLE,(dropAngle===null?HOLE_A:dropAngle),Z_TOP,cosP,sinP);
    const L=proj(R_TRACK,LAND,Z_BOT,cosP,sinP), f=easeIn(t);
    bx=lerp(S.x,L.x,easeInOut(t)); by=lerp(100*sinP,L.y,f)-Math.sin(Math.PI*t)*6;
    sh=lerp(.3,.5,f); shS=lerp(2.2,1,f);
  }
  else if(p<15){ const L=proj(R_TRACK,LAND-rotBot*1.5,Z_BOT,cosP,sinP); bx=L.x; by=L.y; bs=1+L.depth*.07; sh=.5; }
  else if(p<16){ const L=proj(lerp(R_TRACK,R_TRACK-56,easeInOut(t)),LAND-rotBot*1.5,Z_BOT,cosP,sinP); bx=L.x; by=L.y; bs=1+L.depth*.07; sh=.48; }
  else {
    const k=easeOut(clamp(t*1.6,0,1));
    const L=proj(lerp(R_TRACK-56,R_POCKET,k), lerp(LAND-rotBot*1.5, rotBot+WIN_A, k), Z_BOT,cosP,sinP);
    bx=L.x; by=L.y; bs=1+L.depth*.07; sh=.45;
  }

  const focusY=lerp(camZ*sinP, by, follow), focusX=lerp(0, bx, follow);
  setT(world,'w',`translate3d(${(camX-focusX*s).toFixed(1)}px,${(camYoff-focusY*s).toFixed(1)}px,0) scale(${s.toFixed(4)})`);
  setT(ball,'b',`translate3d(${bx.toFixed(1)}px,${by.toFixed(1)}px,0) scale(${bs.toFixed(3)})`);
  setT(shadow,'sh',`translate3d(${bx.toFixed(1)}px,${(by+9).toFixed(1)}px,0) scale(${shS.toFixed(2)})`);
  if(_last.bo!==bo){_last.bo=bo; ball.style.opacity=bo;}
  if(_last.co!==cor){_last.co=cor; corona.style.opacity=cor;}
  if(_last.so!==sh){_last.so=sh; shadow.style.opacity=sh;}

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

})();
