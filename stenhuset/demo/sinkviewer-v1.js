/* Stenhuset: 3D viewer for a stenvask, opened from the product card / product modal.
 * Loaded on demand. Shows the real-size model (sinks3d-v1.js) on a countertop; drag to turn, pinch or scroll to zoom.
 * "Prøv i showroom" puts the same model into the bathroom of the 3D showroom. */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {SINKS,buildSink} from './sinks3d-v1.js?v=1';

const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cm=v=>String(Math.round(v*1000)/10).replace('.',',');
let cur=null;

function css(){
  if(document.getElementById('sv-css'))return;
  const s=document.createElement('style');s.id='sv-css';
  s.textContent=`
.sv{position:fixed;inset:0;z-index:2147483100;background:rgba(18,20,18,.72);display:flex;align-items:center;justify-content:center;padding:14px}
.sv-box{background:#f6f2eb;color:#242725;width:min(980px,100%);height:min(720px,100%);display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.4)}
.sv-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 18px 10px}
.sv-head h2{font:400 clamp(20px,3.2vw,28px)/1.2 var(--serif,Georgia,serif);margin:4px 0 0}
.sv-head small{font:700 10px/1 var(--sans,system-ui);letter-spacing:.16em;text-transform:uppercase;color:#7e817d}
.sv-x{border:0;background:transparent;font-size:28px;line-height:1;cursor:pointer;min-width:44px;min-height:44px;color:#242725}
.sv-stage{position:relative;flex:1;min-height:0;background:linear-gradient(180deg,#ece7df,#dcd5ca)}
.sv-stage canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab}
.sv-tip{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);background:rgba(36,39,37,.78);color:#fff;font:600 11px/1 var(--sans,system-ui);padding:8px 12px;border-radius:999px;pointer-events:none;transition:opacity .6s}
.sv-dims{position:absolute;left:12px;top:12px;background:rgba(246,242,235,.92);padding:8px 11px;font:600 12px/1.4 var(--sans,system-ui)}
.sv-foot{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:12px 18px 16px}
.sv-foot p{margin:0;font-size:11.5px;line-height:1.5;color:#77736b;max-width:460px}
.sv-btns{display:flex;gap:8px;flex-wrap:wrap}
.sv-btn{border:1px solid #242725;background:#242725;color:#fff;padding:12px 16px;min-height:44px;font:700 11px/1 var(--sans,system-ui);letter-spacing:.1em;text-transform:uppercase;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
.sv-btn.soft{background:transparent;color:#242725}
.sv-btn:focus-visible,.sv-x:focus-visible{outline:3px solid #af6f3b;outline-offset:2px}
@media(max-width:640px){.sv{padding:0}.sv-box{height:100%}}`;
  document.head.appendChild(s);
}

export function close(){
  if(!cur)return;
  const c=cur;cur=null;
  c.renderer.setAnimationLoop(null);c.ro.disconnect();window.removeEventListener('keydown',c.onKey);
  c.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();});c.renderer.dispose();c.root.remove();
  document.documentElement.style.overflow=c.overflow;
}

/* id: product id. product (optional): catalog entry {n,p,sp,u} for price and link. */
export function open(id,product){
  const sp=SINKS[id];if(!sp)return;
  close();css();
  const root=document.createElement('div');root.className='sv';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','3D-visning av '+sp.n);
  const price=product&&(product.sp||product.p)?new Intl.NumberFormat('nb-NO',{style:'currency',currency:'NOK',maximumFractionDigits:0}).format(product.sp&&product.sp<product.p?product.sp:product.p):'';
  root.innerHTML=`<div class="sv-box">
    <div class="sv-head"><div><small>Stenvask · 3D-modell</small><h2>${esc(product&&product.n||sp.n)}</h2></div><button class="sv-x" data-sv="x" aria-label="Lukk 3D-visning">×</button></div>
    <div class="sv-stage"><div class="sv-dims">${cm(sp.W)} × ${cm(sp.D)} × ${cm(sp.H)} cm${sp.approx?' (ca.)':''}${price?'<br>'+price:''}</div><div class="sv-tip">Dra for å snu · klyp eller rull for å zoome</div></div>
    <div class="sv-foot"><p>3D-modellen er laget etter målene på produktsiden. Årer, farge og hugget overflate er naturlige og varierer fra stein til stein.</p>
      <div class="sv-btns"><button class="sv-btn" data-sv="showroom">Prøv i showroom ↗</button>${product&&product.u?`<a class="sv-btn soft" href="${esc(product.u)}" target="_blank" rel="noopener">Se i nettbutikken ↗</a>`:''}</div></div>
  </div>`;
  document.body.appendChild(root);
  const overflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
  const stage=root.querySelector('.sv-stage'),canvas=document.createElement('canvas');stage.prepend(canvas);

  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene(),pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;
  const cam=new THREE.PerspectiveCamera(32,1,.02,30);
  const ctl=new OrbitControls(cam,canvas);ctl.enableDamping=true;ctl.dampingFactor=.08;ctl.enablePan=false;ctl.autoRotate=true;ctl.autoRotateSpeed=.8;
  const size=Math.max(sp.W,sp.D);ctl.minDistance=size*.7;ctl.maxDistance=size*4;ctl.maxPolarAngle=Math.PI*.48;
  ctl.target.set(0,sp.H*.45,0);cam.position.set(size*.95,size*.85,size*1.35);
  // countertop under the sink (top sinks stand on a slim console)
  const topW=sp.W+.3,topD=Math.max(sp.D+.16,.5);
  const top=new THREE.Mesh(new THREE.BoxGeometry(topW,.04,topD),new THREE.MeshStandardMaterial({color:'#b89a78',roughness:.6}));
  top.position.set(0,-.02,0);top.receiveShadow=true;scene.add(top);
  const hemi=new THREE.HemisphereLight('#fff8ee','#a89c8c',.55);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff3e2',2.2);sun.position.set(1.2,2.2,1.4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-1,right:1,top:1,bottom:-1,near:.5,far:6});sun.shadow.bias=-.0004;sun.shadow.radius=4;scene.add(sun);
  let needs=true;const sink=buildSink(id,()=>{needs=true;});scene.add(sink);
  ctl.addEventListener('start',()=>{ctl.autoRotate=false;const tip=root.querySelector('.sv-tip');if(tip)tip.style.opacity=0;});
  const resize=()=>{const r=stage.getBoundingClientRect();if(r.width<2)return;renderer.setSize(r.width,r.height,false);cam.aspect=r.width/r.height;cam.updateProjectionMatrix();needs=true;};
  const ro=new ResizeObserver(resize);ro.observe(stage);resize();
  renderer.setAnimationLoop(()=>{const moved=ctl.update();if(moved||ctl.autoRotate||needs){needs=false;renderer.render(scene,cam);}});
  const onKey=e=>{if(e.key==='Escape')close();};window.addEventListener('keydown',onKey);
  root.addEventListener('click',e=>{
    if(e.target===root){close();return;}
    const b=e.target.closest('[data-sv]');if(!b)return;
    if(b.dataset.sv==='x')close();
    else if(b.dataset.sv==='showroom'){
      close();
      const tab=document.querySelector('#room-tabs [data-room="bad"]');if(tab)tab.click();
      if(window.Studio3D&&window.Studio3D.setSink)window.Studio3D.setSink(id);
      location.hash='#studio';
    }
  });
  cur={root,renderer,scene,ro,onKey,overflow};
  root.querySelector('.sv-x').focus({preventScroll:true});
}
