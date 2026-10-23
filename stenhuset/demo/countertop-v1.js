/* Stenhuset: made-to-measure countertop configurator in 3D (benkeplate på mål).
 * Loaded on demand from "Bestill på mål". The customer picks stone, size, thickness, edge, cut-outs and upstand; the plate is rebuilt
 * live on kitchen cabinets (furniture3d-v1.js). "Prøv i showroom" puts the stone and thickness on the showroom kitchen;
 * "Be om pris" adds the configuration to the project list and opens the enquiry form. No price: made to measure. */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {STONES} from './stone-textures-v1.js';
import {TOP_STONES} from './sinks3d-v1.js?v=4';
import {buildCountertop,EDGES} from './furniture3d-v1.js?v=2';

const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const cfg={stone:'sk-carrara',L:2.4,D:.62,t:.03,edge:'fas',sink:true,sinkX:-.55,hob:true,hobX:.6,splash:.1};
let cur=null;

function css(){
  if(document.getElementById('ct-css'))return;
  const s=document.createElement('style');s.id='ct-css';
  s.textContent=`
.ct{position:fixed;inset:0;z-index:2147483100;background:rgba(18,20,18,.72);display:flex;align-items:center;justify-content:center;padding:14px}
.ct-box{background:#f6f2eb;color:#242725;width:min(1180px,100%);height:min(780px,100%);display:grid;grid-template-columns:1fr 340px;grid-template-rows:auto 1fr;box-shadow:0 20px 60px rgba(0,0,0,.4)}
.ct-head{grid-column:1/-1;display:flex;justify-content:space-between;align-items:flex-start;padding:14px 18px 8px}
.ct-head h2{font:400 clamp(20px,3vw,28px)/1.2 var(--serif,Georgia,serif);margin:4px 0 0}
.ct-head small{font:700 10px/1 var(--sans,system-ui);letter-spacing:.16em;text-transform:uppercase;color:#7e817d}
.ct-x{border:0;background:transparent;font-size:28px;min-width:44px;min-height:44px;cursor:pointer;color:#242725}
.ct-stage{position:relative;min-height:0;background:linear-gradient(180deg,#ece7df,#dcd5ca)}
.ct-stage canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab}
.ct-sum{position:absolute;left:12px;top:12px;right:12px;background:rgba(246,242,235,.92);padding:8px 11px;font:600 12px/1.45 var(--sans,system-ui)}
.ct-panel{overflow:auto;padding:4px 18px 18px;border-left:1px solid #ddd5ca}
.ct-panel h4{font:700 10px/1 var(--sans,system-ui);letter-spacing:.14em;text-transform:uppercase;margin:16px 0 8px}
.ct-stones{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.ct-stones button{border:2px solid transparent;background:#fff;padding:6px 4px;font:600 10.5px/1.25 var(--sans,system-ui);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;min-height:44px}
.ct-stones button i{width:34px;height:34px;border-radius:50%;box-shadow:inset 0 0 0 1px #0002}
.ct-stones button.on{border-color:#242725}
.ct-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ct-panel label{display:flex;flex-direction:column;gap:5px;font-size:11.5px}
.ct-panel input[type=number],.ct-panel select{min-height:42px;border:1px solid #d8d2c8;background:#fff;padding:8px;font:inherit;color:#242725}
.ct-panel input[type=range]{width:100%;accent-color:#8b775d}
.ct-chk{flex-direction:row!important;align-items:center;gap:8px!important;font-size:12.5px!important;margin-top:4px}
.ct-btn{border:1px solid #242725;background:#242725;color:#fff;padding:12px 14px;min-height:46px;font:700 11px/1 var(--sans,system-ui);letter-spacing:.1em;text-transform:uppercase;cursor:pointer;width:100%;margin-top:8px}
.ct-btn.soft{background:transparent;color:#242725}
.ct-note{font-size:11px;line-height:1.55;color:#77736b;margin-top:12px}
.ct-btn:focus-visible,.ct-x:focus-visible,.ct-stones button:focus-visible{outline:3px solid #af6f3b;outline-offset:2px}
@media(max-width:820px){.ct{padding:0}.ct-box{height:100%;grid-template-columns:1fr;grid-template-rows:auto 46vh 1fr}.ct-panel{border-left:0;border-top:1px solid #ddd5ca}}`;
  document.head.appendChild(s);
}
const stoneName=id=>(TOP_STONES.find(s=>s[0]===id)||[0,id])[1];
const rgb=id=>{const c=STONES[id]&&STONES[id].c0||[200,200,200];return `rgb(${c.join(',')})`;};
function summary(){
  const p=[Math.round(cfg.L*100)+' × '+Math.round(cfg.D*100)+' × '+Math.round(cfg.t*100)+' cm',stoneName(cfg.stone),(EDGES.find(e=>e[0]===cfg.edge)||[0,''])[1]];
  if(cfg.sink)p.push('utsparing for kum');if(cfg.hob)p.push('utsparing for koketopp');if(cfg.splash>0)p.push('opplett '+Math.round(cfg.splash*100)+' cm');
  return p.join(' · ')+' · ca. '+(cfg.L*cfg.D).toFixed(2).replace('.',',')+' m²';
}

export function close(){
  if(!cur)return;const c=cur;cur=null;
  c.renderer.setAnimationLoop(null);c.ro.disconnect();window.removeEventListener('keydown',c.onKey);
  c.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();});c.renderer.dispose();c.root.remove();document.documentElement.style.overflow=c.overflow;
}
export function open(){
  close();css();
  const root=document.createElement('div');root.className='ct';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Benkeplate på mål i 3D');
  root.innerHTML=`<div class="ct-box">
   <div class="ct-head"><div><small>Bestill på mål · 3D</small><h2>Design benkeplaten din</h2></div><button class="ct-x" data-ct="x" aria-label="Lukk">×</button></div>
   <div class="ct-stage"><div class="ct-sum" aria-live="polite"></div></div>
   <div class="ct-panel">
    <h4>Stein</h4><div class="ct-stones">${TOP_STONES.map(s=>`<button type="button" data-stone="${s[0]}"><i style="background:${rgb(s[0])}"></i>${esc(s[1])}</button>`).join('')}</div>
    <h4>Mål</h4><div class="ct-two"><label>Lengde (cm)<input type="number" data-k="L" min="40" max="420" step="1" inputmode="numeric"></label><label>Dybde (cm)<input type="number" data-k="D" min="30" max="130" step="1" inputmode="numeric"></label></div>
    <div class="ct-two" style="margin-top:8px"><label>Tykkelse<select data-k="t">${[2,3,4,6].map(v=>`<option value="${v/100}">${v} cm</option>`).join('')}</select></label><label>Kantprofil<select data-k="edge">${EDGES.map(e=>`<option value="${e[0]}">${e[1]}</option>`).join('')}</select></label></div>
    <h4>Utsparinger</h4>
    <label class="ct-chk"><input type="checkbox" data-k="sink"> Kum (underlimt)</label><input type="range" data-k="sinkX" aria-label="Plassering av kum">
    <label class="ct-chk"><input type="checkbox" data-k="hob"> Koketopp</label><input type="range" data-k="hobX" aria-label="Plassering av koketopp">
    <h4>Opplett mot vegg</h4><select data-k="splash" style="width:100%">${[0,5,10,15].map(v=>`<option value="${v/100}">${v?v+' cm':'Ingen'}</option>`).join('')}</select>
    <button class="ct-btn" data-ct="showroom">Prøv i showroom ↗</button><button class="ct-btn soft" data-ct="quote">Be om pris ↗</button>
    <p class="ct-note">Benkeplater lages på mål i Stenhusets egen produksjon på Fossum. Prisen avhenger av stein, mål og bearbeiding, og gis på forespørsel. Endelige mål tas ved oppmåling.</p>
   </div></div>`;
  document.body.appendChild(root);
  const overflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
  const stage=root.querySelector('.ct-stage'),canvas=document.createElement('canvas');stage.prepend(canvas);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.toneMapping=(THREE.NeutralToneMapping!==undefined?THREE.NeutralToneMapping:THREE.ACESFilmicToneMapping);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene(),pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;
  const cam=new THREE.PerspectiveCamera(35,1,.05,40),ctl=new OrbitControls(cam,canvas);ctl.enableDamping=true;ctl.enablePan=false;ctl.maxPolarAngle=Math.PI*.49;
  scene.add(new THREE.HemisphereLight('#fff8ee','#a89c8c',.55));
  const sun=new THREE.DirectionalLight('#fff3e2',2);sun.position.set(1.5,3,2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.5,far:10});sun.shadow.bias=-.0004;scene.add(sun);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshStandardMaterial({color:'#cbbfae',roughness:.9}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const cabMat=new THREE.MeshStandardMaterial({color:'#efede8',roughness:.55}),dark=new THREE.MeshStandardMaterial({color:'#3a3a38',roughness:.8});
  let cab=null,top=null,needs=true;
  function build(first){
    if(cab){scene.remove(cab);cab.traverse(o=>o.geometry&&o.geometry.dispose());}
    if(top){scene.remove(top);top.traverse(o=>o.geometry&&o.geometry.dispose());}
    cab=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(cfg.L-.02,.76,cfg.D-.05),cabMat);body.position.set(0,.1+.38,-.01);body.castShadow=body.receiveShadow=true;cab.add(body);
    const plinth=new THREE.Mesh(new THREE.BoxGeometry(cfg.L-.06,.1,cfg.D-.12),dark);plinth.position.set(0,.05,-.04);cab.add(plinth);
    const n=Math.max(2,Math.round(cfg.L/.6));for(let i=1;i<n;i++){const g=new THREE.Mesh(new THREE.BoxGeometry(.003,.74,.002),dark);g.position.set(-cfg.L/2+cfg.L*i/n,.48,cfg.D/2-.034);cab.add(g);}
    scene.add(cab);
    top=buildCountertop(cfg,()=>{needs=true;});top.position.y=.86;scene.add(top);
    root.querySelector('.ct-sum').textContent=summary();
    if(first){const s=Math.max(cfg.L,1.4);ctl.target.set(0,.8,0);cam.position.set(s*.55,1.6+s*.25,s*1.05);ctl.minDistance=.6;ctl.maxDistance=8;}
    needs=true;
  }
  // panel <-> cfg
  const rng=k=>root.querySelector(`input[type=range][data-k="${k}"]`);
  function syncPanel(){
    root.querySelectorAll('[data-stone]').forEach(b=>b.classList.toggle('on',b.dataset.stone===cfg.stone));
    root.querySelector('[data-k="L"]').value=Math.round(cfg.L*100);root.querySelector('[data-k="D"]').value=Math.round(cfg.D*100);
    root.querySelector('select[data-k="t"]').value=String(cfg.t);root.querySelector('select[data-k="edge"]').value=cfg.edge;root.querySelector('select[data-k="splash"]').value=String(cfg.splash);
    root.querySelector('input[type=checkbox][data-k="sink"]').checked=cfg.sink;root.querySelector('input[type=checkbox][data-k="hob"]').checked=cfg.hob;
    const lim=cfg.L/2-.33;for(const k of ['sinkX','hobX']){const r=rng(k);r.min=String(Math.round(-lim*100));r.max=String(Math.round(lim*100));r.value=String(Math.round(cfg[k]*100));r.disabled=!cfg[k==='sinkX'?'sink':'hob'];}
  }
  function fit(){ // keep cut-outs inside the plate and apart from each other
    const lim=Math.max(0,cfg.L/2-.33);cfg.sinkX=clamp(cfg.sinkX,-lim,lim);cfg.hobX=clamp(cfg.hobX,-lim,lim);
    if(cfg.sink&&cfg.hob&&Math.abs(cfg.sinkX-cfg.hobX)<.6){if(cfg.L<1.3)cfg.hob=false;else{const m=(cfg.sinkX+cfg.hobX)/2,sgn=cfg.sinkX<=cfg.hobX?-1:1;cfg.sinkX=clamp(m+sgn*.3,-lim,lim);cfg.hobX=clamp(m-sgn*.3,-lim,lim);}}
    if(cfg.D<.45){cfg.sink=false;cfg.hob=false;}
  }
  root.addEventListener('click',e=>{
    if(e.target===root){close();return;}
    const st=e.target.closest('[data-stone]');if(st){cfg.stone=st.dataset.stone;syncPanel();build(false);return;}
    const b=e.target.closest('[data-ct]');if(!b)return;
    if(b.dataset.ct==='x')close();
    else if(b.dataset.ct==='showroom'){
      const c={...cfg};close();
      const tab=document.querySelector('#room-tabs [data-room="kjokken"]');if(tab)tab.click();
      if(window.Studio3D&&window.Studio3D.setTop)window.Studio3D.setTop(c);
      location.hash='#studio';
    }else if(b.dataset.ct==='quote'){
      const label='Benkeplate på mål – '+summary()+'. Pris på forespørsel, mål bekreftes ved oppmåling.';
      close();if(typeof window.addItem==='function')window.addItem({kind:'countertop',id:'benk-'+Date.now(),label});
      if(typeof window.showContact==='function')window.showContact();
    }
  });
  root.addEventListener('change',e=>{
    const t=e.target,k=t.dataset.k;if(!k)return;
    if(k==='L')cfg.L=clamp((+t.value||240)/100,.4,4.2);
    else if(k==='D')cfg.D=clamp((+t.value||62)/100,.3,1.3);
    else if(k==='t'||k==='splash')cfg[k]=+t.value;
    else if(k==='edge')cfg.edge=t.value;
    else if(k==='sink'||k==='hob')cfg[k]=t.checked;
    else return;
    fit();syncPanel();build(k==='L');
  });
  root.addEventListener('input',e=>{const t=e.target,k=t.dataset.k;if(k==='sinkX'||k==='hobX'){cfg[k]=+t.value/100;fit();syncPanel();build(false);}});
  const resize=()=>{const r=stage.getBoundingClientRect();if(r.width<2)return;renderer.setSize(r.width,r.height,false);cam.aspect=r.width/r.height;cam.updateProjectionMatrix();needs=true;};
  const ro=new ResizeObserver(resize);ro.observe(stage);
  fit();syncPanel();build(true);resize();
  renderer.setAnimationLoop(()=>{const moved=ctl.update();if(moved||needs){needs=false;renderer.render(scene,cam);}});
  const onKey=e=>{if(e.key==='Escape')close();};window.addEventListener('keydown',onKey);
  cur={root,renderer,scene,ro,onKey,overflow};
  root.querySelector('.ct-x').focus({preventScroll:true});
}
