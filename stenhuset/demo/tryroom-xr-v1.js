/* Stenhuset showroom: live AR with WebXR (Chrome on ARCore-capable Android). Loaded only when the customer chooses it.
 * What it does: hit-test places real 3D points on the physical floor/wall; the material is a mesh in world space, so it stays on
 * the surface while the phone moves (true tracking, unlike the camera mode).
 * What it does NOT do (yet): hide the material behind sinks, furniture or people (needs the WebXR depth-sensing API on a device that
 * supports it), tile format/grout controls (natural stone layout only), or export the camera picture (WebXR does not expose it;
 * use the phone's own screenshot). Not verified on a physical device in this build: treat as beta. */
import * as THREE from 'three';

const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

export async function start(opt){
  if(!navigator.xr||!(await navigator.xr.isSessionSupported('immersive-ar')))throw new Error('Live AR støttes ikke på denne enheten.');
  const st={floorId:opt.stoneId(),wallId:opt.wallId(),mode:'floor',pts:[],scale:1,hasFloor:false,hasWall:false,wallH:2.4,items:[],tex:new Map(),lastHit:0};

  /* --- DOM overlay UI --- */
  const ui=document.createElement('div');
  ui.style.cssText='position:fixed;inset:0;z-index:2147483300;font-family:var(--sans,system-ui,sans-serif);color:#fff;pointer-events:none';
  ui.innerHTML=`<style>
  .xr-b{pointer-events:auto;border:1px solid #ffffff66;background:#000a;color:#fff;padding:12px 14px;min-height:46px;font:700 11px/1 var(--sans,system-ui);letter-spacing:.08em;text-transform:uppercase}
  .xr-b.pri{background:#f0e9de;color:#242725;border-color:#f0e9de}.xr-b.on{background:#fff;color:#242725}
  .xr-top{position:absolute;left:10px;right:10px;top:max(10px,env(safe-area-inset-top));display:flex;gap:8px;align-items:flex-start}
  .xr-hint{flex:1;background:#000b;padding:10px 12px;font-size:13px;line-height:1.45;pointer-events:auto}
  .xr-bot{position:absolute;left:0;right:0;bottom:0;background:#000b;padding:10px 10px max(10px,env(safe-area-inset-bottom));pointer-events:auto}
  .xr-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}.xr-strip{display:flex;gap:8px;overflow-x:auto;margin-bottom:8px}
  .xr-c{flex:none;width:58px;border:3px solid transparent;background:none;color:#fff;font-size:9px;padding:0;pointer-events:auto}.xr-c.on{border-color:#fff}
  .xr-c i{display:block;aspect-ratio:1;background:var(--slab)}.xr-c em{display:block;font-style:normal;margin-top:3px;line-height:1.2}
  </style>
  <div class="xr-top"><button class="xr-b" data-x="end" aria-label="Avslutt AR">✕</button><div class="xr-hint" data-x="hint"></div></div>
  <div class="xr-bot"><div class="xr-row">
    <button class="xr-b pri" data-x="add">Sett punkt</button><button class="xr-b" data-x="floor">Gulv</button><button class="xr-b" data-x="wall">Vegg</button>
    <button class="xr-b" data-x="undo">Angre</button><button class="xr-b" data-x="reset">Nullstill</button><button class="xr-b" data-x="quote">Be om tilbud</button></div>
    <div class="xr-row"><button class="xr-b on" data-x="mf">Gulv</button><button class="xr-b" data-x="mw">Vegg</button>
    <label style="display:flex;align-items:center;gap:8px;font-size:12px;pointer-events:auto">Skala <input type="range" min="50" max="200" value="100" data-x="scale"></label></div>
    <div class="xr-strip" data-x="strip"></div></div>`;
  document.body.appendChild(ui);
  const $=k=>ui.querySelector('[data-x="'+k+'"]');
  const hint=h=>{$('hint').innerHTML=h;};
  let matFor='floor';
  function strip(){
    $('strip').innerHTML=opt.materials.filter(m=>matFor==='wall'||!m.plaster).map(m=>`<button class="xr-c ${m.id===(matFor==='floor'?st.floorId:st.wallId)?'on':''}" data-mat="${m.id}"><i style="--slab:${m.pattern}"></i><em>${esc(m.name)}</em></button>`).join('');
  }

  /* --- renderer + scene --- */
  const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:2147483250';
  document.body.appendChild(canvas);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
  const reticle=new THREE.Mesh(new THREE.RingGeometry(.07,.09,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xf0e9de,side:THREE.DoubleSide,depthTest:false}));
  reticle.matrixAutoUpdate=false;reticle.visible=false;reticle.renderOrder=10;scene.add(reticle);
  const dots=new THREE.Group();scene.add(dots);
  const dotGeo=new THREE.SphereGeometry(.02,12,8),dotMat=new THREE.MeshBasicMaterial({color:0xe8d3ae,depthTest:false});

  /* --- stone textures: same procedural generator as the 3D showroom --- */
  function stoneTex(id){
    if(st.tex.has(id))return st.tex.get(id);
    const N=512,g=opt.generateStone(id,N);let r;do{r=g.next();}while(!r.done);
    const t=new THREE.DataTexture(new Uint8Array(r.value.albedo.buffer),N,N,THREE.RGBAFormat);
    t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.needsUpdate=true;
    st.tex.set(id,t);return t;
  }
  const mkMat=id=>new THREE.MeshBasicMaterial({map:stoneTex(id),side:THREE.DoubleSide,color:0xeeeeee});
  function polyMesh(points,kind,id){
    // points: THREE.Vector3[]; floor = polygon in the XZ plane at the mean height; wall = quad extruded straight up
    let pos=[],uv=[];const T=opt.T,sc=st.scale;
    if(kind==='floor'){
      const y=points.reduce((s,p)=>s+p.y,0)/points.length,cx=points.reduce((s,p)=>s+p.x,0)/points.length,cz=points.reduce((s,p)=>s+p.z,0)/points.length;
      const c2=points.map(p=>new THREE.Vector2(p.x,p.z)),tri=THREE.ShapeUtils.triangulateShape(c2,[]);
      for(const t of tri)for(const i of t){const p=points[i];pos.push(p.x,y+.001,p.z);uv.push((p.x-cx)/(T*sc),(p.z-cz)/(T*sc));}
    }else{
      const a=points[0],b=points[1],h=st.wallH,len=a.distanceTo(b),y0=Math.min(a.y,b.y);
      const q=[[a,0,0],[b,len,0],[b,len,h],[a,0,h]].map(([p,u,v])=>({x:p.x,y:y0+v,z:p.z,u:u/(T*sc),v:v/(T*sc)}));
      for(const i of [0,1,2,0,2,3]){const p=q[i];pos.push(p.x,p.y,p.z);uv.push(p.u,p.v);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    const m=new THREE.Mesh(g,mkMat(id));m.userData={kind,points:points.map(p=>p.clone())};scene.add(m);return m;
  }
  function rebuild(){
    for(const it of st.items){scene.remove(it);it.geometry.dispose();it.material.dispose();}
    const old=st.items.map(i=>i.userData);st.items=[];
    for(const d of old)st.items.push(polyMesh(d.points,d.kind,d.kind==='floor'?st.floorId:st.wallId));
  }
  function refreshDots(){
    dots.clear();for(const p of st.pts){const m=new THREE.Mesh(dotGeo,dotMat);m.position.copy(p);m.renderOrder=11;dots.add(m);}
  }
  const need=()=>st.mode==='floor'?4:2;

  /* --- session --- */
  const session=await navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test'],optionalFeatures:['dom-overlay','local-floor'],domOverlay:{root:ui}});
  await renderer.xr.setSession(session);
  const viewer=await session.requestReferenceSpace('viewer');
  const hitSource=await session.requestHitTestSource({space:viewer});
  let ended=false;
  const cleanup=()=>{
    if(ended)return;ended=true;
    renderer.setAnimationLoop(null);
    for(const it of st.items){it.geometry.dispose();it.material.dispose();}
    st.tex.forEach(t=>t.dispose());renderer.dispose();canvas.remove();ui.remove();
    try{hitSource.cancel();}catch(e){}
  };
  session.addEventListener('end',()=>{cleanup();opt.onEnd&&opt.onEnd();});

  renderer.setAnimationLoop((time,frame)=>{
    if(!frame)return;
    const ref=renderer.xr.getReferenceSpace(),pose=frame.getViewerPose(ref);
    const hits=frame.getHitTestResults(hitSource);
    if(hits.length){const p=hits[0].getPose(ref);if(p){reticle.visible=true;reticle.matrix.fromArray(p.transform.matrix);st.lastHit=time;}}
    else{reticle.visible=false;}
    if(!pose||pose.emulatedPosition){if(!st._lost){st._lost=true;hint('<b>Mistet sporing.</b> Beveg mobilen rolig og se mot en flate med litt mønster eller kanter, og med godt lys.');}}
    else if(st._lost){st._lost=false;hint('Sporing er tilbake.');}
    else if(!reticle.visible&&time-st.lastHit>4000&&!st._noHit){st._noHit=true;hint('Finner ingen flate. Sikt mot gulvet eller veggen og beveg mobilen sakte frem og tilbake.');}
    if(reticle.visible)st._noHit=false;
    renderer.render(scene,camera);
  });

  /* --- UI actions --- */
  const intro=()=>hint('<b>Live AR (beta, manuell).</b> Sikt ringen mot gulvet og trykk <b>Sett punkt</b> på 4 hjørner av gulvet. Trykk <b>Vegg</b> for å legge til en vegg (2 punkter nederst langs veggen). For automatisk gjenkjenning, bruk «Live kamera».');
  intro();strip();
  ui.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.mat){if(matFor==='floor')st.floorId=b.dataset.mat;else st.wallId=b.dataset.mat;rebuild();strip();return;}
    switch(b.dataset.x){
      case 'end':session.end();break;
      case 'floor':case 'wall':st.mode=b.dataset.x;st.pts=[];refreshDots();matFor=st.mode;hint(st.mode==='floor'?'<b>Gulv:</b> sett punkt på 4 hjørner, rundt flaten i rekkefølge.':'<b>Vegg:</b> sett to punkter nederst langs veggen (venstre, så høyre).');strip();break;
      case 'mf':matFor='floor';strip();break;
      case 'mw':matFor='wall';strip();break;
      case 'add':{
        if(!st.mode){hint('Velg først <b>Gulv</b> eller <b>Vegg</b>.');break;}
        if(!reticle.visible){hint('Ingen flate under ringen. Beveg mobilen og prøv igjen.');break;}
        st.pts.push(new THREE.Vector3().setFromMatrixPosition(reticle.matrix));refreshDots();
        if(st.pts.length>=need()){
          const id=st.mode==='floor'?st.floorId:st.wallId;
          let pts=st.pts.slice();
          if(st.mode==='floor'){ // order around the centroid so the polygon cannot self-intersect
            const c=pts.reduce((s,p)=>s.add(p),new THREE.Vector3()).multiplyScalar(1/pts.length);
            pts.sort((a,b)=>Math.atan2(a.z-c.z,a.x-c.x)-Math.atan2(b.z-c.z,b.x-c.x));st.hasFloor=true;
          }else st.hasWall=true;
          st.items.push(polyMesh(pts,st.mode,id));st.pts=[];refreshDots();
          hint('Flate lagt til. Bytt materiale nederst, eller sett flere flater. <span style="color:#ffd9a0">Møbler og inventar dekkes av materialet i denne versjonen.</span>');
        }else hint('Punkt '+st.pts.length+' av '+need()+' satt.');
        break;}
      case 'undo':
        if(st.pts.length){st.pts.pop();refreshDots();}
        else if(st.items.length){const it=st.items.pop();scene.remove(it);it.geometry.dispose();it.material.dispose();}
        break;
      case 'reset':for(const it of st.items){scene.remove(it);it.geometry.dispose();it.material.dispose();}st.items=[];st.pts=[];st.hasFloor=st.hasWall=false;refreshDots();intro();break;
      case 'quote':{const info={floor:st.hasFloor,wall:st.hasWall,floorId:st.floorId,wallId:st.wallId};session.end();setTimeout(()=>opt.onQuote&&opt.onQuote(info),250);break;}
    }
  });
  ui.addEventListener('input',e=>{if(e.target.dataset.x==='scale'){st.scale=clamp(+e.target.value/100,.5,2);rebuild();}});
  return {session};
}
