import * as T from 'three';
import {GLTFLoader} from '/ksh/assets/ksh-v6/vendor/examples/jsm/loaders/GLTFLoader.js';
import {RoomRenderer} from '/ksh/assets/ksh-v6/room-renderer.js';
const base='/ksh/fliskonkurrenten/produkt/',C=window.KSHRoom;
const stage=document.querySelector('.journey-stage'),journey=document.querySelector('#reisen');
const host=document.createElement('div');host.id='sense-live-room';stage.prepend(host);
const ui=document.createElement('div');ui.className='sense-composer';ui.innerHTML=`<div class="sense-composer-tools"><button data-sense="floor" aria-expanded="false">▱ Gulv</button><button data-sense="products" aria-expanded="false">＋ Produkter</button><button data-sense="light" aria-expanded="false">☼ Lys</button><button id="sense-resume">↺ Filmreise</button></div><div class="sense-drawer" hidden><button class="sense-close" aria-label="Lukk valg">×</button><div id="sense-options"></div></div><button class="sense-open">Tilpass dette rommet ↗</button><output id="sense-budget"></output>`;stage.append(ui);
let saved;try{saved=JSON.parse(localStorage.getItem('ksh-sense-room-v3'));}catch{}
const state=C.normalize({...C.defaults(),width:3.8,length:3.4,height:2.8,items:[],delivery:null,...saved?.room});
let enabled={vedum:!!saved?.enabled?.vedum,zup:!!saved?.enabled?.zup,althea:!!saved?.enabled?.althea,stone:!!saved?.enabled?.stone};let manual=false,drawer=null,raf=0;
const products={vedum:{name:'Vedum Flow · Tåkegrønn',slug:'vedum-flow-takegronn',price:41925,pos:[-1.48,.75,.1],rotation:Math.PI/2},zup:{name:'Z-UP · Eik sort',slug:'zup-spilepanel-eik-sort',price:1999,pos:[1.35,0,-1.64],rotation:0},althea:{name:'Colorker Althea · Sand Dekor',slug:'colorker-althea-sand-dekor',price:Math.round(.595*1.192*1299*100)/100,pos:[-.3,1.05,-1.61],rotation:0},stone:{name:'Heimdal · steinreferanse',price:null}};
class BathRoom extends RoomRenderer{
 constructor(){super(host,()=>{},m=>status(m),{skipChair:true});this.models={};if(!this.is3D)return;
  this.controls.enabled=false;const loader=new GLTFLoader();
  loader.load('/ksh/fliskonkurrenten/assets/sense-v3/sense-v3.glb',g=>{this.models.sense=g.scene;this.refresh();},undefined,()=>status('3D-modellen kunne ikke lastes. Produktbilder vises.'));
  for(const [key,p] of Object.entries(products)){if(!p.slug)continue;loader.load(base+p.slug+'/assets/model.glb',g=>{this.models[key]=g.scene;this.refresh();},undefined,()=>{status(p.name+' kunne ikke lastes. Prisen beholdes i oversikten.');});}
 }
 refresh(){this.objectKey='';this.update(state);schedule();}
 buildObjects(){this.clear(this.objects);if(!this.models)return;
  const add=(model,pos,rotation=0)=>{if(!model)return;const m=model.clone(true);m.position.set(...pos);m.rotation.y=rotation;m.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.userData.shared=true;}});this.objects.add(m);};
  add(this.models.sense,[0,0,-1.25]);for(const [key,p] of Object.entries(products))if(enabled[key]&&p.slug)add(this.models[key],p.pos,p.rotation);
  if(enabled.stone){const texture=this.texture('social/DJqssF3tO5x.jpg',[1,1],true);const board=new T.Mesh(new T.PlaneGeometry(.65,.65),new T.MeshStandardMaterial({map:texture,roughness:1}));board.position.set(1.5,1.4,-1.6);this.objects.add(board);}
 }
 update(s){this.objectKey='';super.update(s);}
}
function status(m){const el=document.querySelector('#sense-live-status');if(el)el.textContent=m;}
const renderer=new BathRoom();if(!renderer.is3D){host.hidden=true;status('Produktfoto · 3D er ikke tilgjengelig i denne nettleseren');}
renderer.update(state);
function persist(){try{localStorage.setItem('ksh-sense-room-v3',JSON.stringify({room:state,enabled}));}catch{}}
function total(){const t=C.totals(state),extras=Object.entries(enabled).reduce((n,[k,on])=>n+(on?(products[k].price||0):0),0);document.querySelector('#sense-budget').textContent=`Delsum ${new Intl.NumberFormat('nb-NO',{maximumFractionDigits:0}).format(24750+t.floorCost+extras)} kr · arbeid og levering kommer i tillegg`;persist();}
function activate(){manual=true;journey.classList.add('sense-editing');if(renderer.is3D)renderer.controls.enabled=true;host.style.opacity='1';document.querySelector('.sense-open').textContent=renderer.is3D?'Dra i rommet for å se deg rundt':'Materialvalg · produktfoto';total();}
function update(){renderer.update(state);if(renderer.is3D)renderer.buildObjects(state);renderer.draw();total();if(!renderer.is3D){let board=document.querySelector('.sense-fallback-board');if(!board){board=document.createElement('div');board.className='sense-fallback-board';ui.append(board);}board.innerHTML=Object.entries(enabled).filter(([k,on])=>on&&products[k].slug).map(([k])=>`<img src="${base+products[k].slug}/assets/hero.webp" alt="Referansebilde av ${products[k].name}">`).join('')+`<img src="/ksh/assets/ksh-v6/assets/${C.materials[state.floor].image}" alt="Valgt gulv: ${C.materials[state.floor].name}"><span>${C.materials[state.floor].name}</span>`;}}
function choices(name){activate();drawer=name;const options=document.querySelector('#sense-options');
 if(name==='floor')options.innerHTML='<h3>Gulv i rommet</h3><p>Romstudie: 3,8 × 3,4 m. 10% svinn, avrundet til hele pakker.</p>'+Object.entries(C.materials).map(([k,m])=>`<button data-floor="${k}" aria-pressed="${state.floor===k}"><img src="/ksh/assets/ksh-v6/assets/${m.image}" alt="">${m.name}</button>`).join('');
 if(name==='products')options.innerHTML='<h3>Kombiner produkter</h3>'+Object.entries(products).map(([k,p])=>`<button data-product="${k}" aria-pressed="${enabled[k]}">${enabled[k]?'✓':'＋'} ${p.name}</button>`).join('')+'<p>Én av hver produktstudie. Althea prises for én flis; Z-UP per panel. Steinreferansen er et foto fra Heimdal, uten pris. Våtromsegnethet og montering må avklares.</p>';
 if(name==='light')options.innerHTML='<h3>Lyset i rommet</h3><button data-day="day">Dagslys</button><button data-day="evening">Kveldslys</button><p>Farge og glans er tilnærmet. Vurder en fysisk prøve før bestilling.</p>';
 ui.querySelector('.sense-drawer').hidden=false;ui.querySelectorAll('[data-sense]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.sense===name)));
 options.querySelectorAll('[data-floor]').forEach(b=>b.onclick=()=>{state.floor=b.dataset.floor;update();choices(name);});options.querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>{enabled[b.dataset.product]=!enabled[b.dataset.product];update();choices(name);});options.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{state.daylight=b.dataset.day;update();});
}
ui.querySelectorAll('[data-sense]').forEach(b=>b.onclick=()=>choices(b.dataset.sense));ui.querySelector('.sense-open').onclick=activate;ui.querySelector('.sense-close').onclick=()=>{ui.querySelector('.sense-drawer').hidden=true;ui.querySelectorAll('[data-sense]').forEach(b=>b.setAttribute('aria-expanded','false'));};document.querySelector('#sense-resume').onclick=()=>{manual=false;journey.classList.remove('sense-editing');if(renderer.controls)renderer.controls.enabled=false;ui.querySelector('.sense-drawer').hidden=true;schedule();};
const chapter=[['01 / SILHUETT','En form.<br><i>Et pusterom.</i>','Back-to-wall. 170 × 80 cm. Hvit sanitærakryl.'],['02 / MATERIALE','Lyset viser<br><i>detaljene.</i>','Myke kanter og en glansfull overflate. Gå nærmere.'],['03 / HELHET','Sense, i<br><i>ditt eget rom.</i>','Se badekaret sammen med gulv og veggflater.'],['04 / DITT ROM','Fra produkt<br><i>til helhet.</i>','Åpne romvalgene og kombiner med Vedum, Z-UP og Colorker.']];
let prev=-1;const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function frame(){raf=0;const r=journey.getBoundingClientRect(),p=Math.min(1,Math.max(0,-r.top/Math.max(1,journey.offsetHeight-innerHeight))),idx=Math.min(3,Math.floor(p*4));if(!manual){if(idx!==prev){prev=idx;const [a,b,c]=chapter[idx];document.querySelector('#stage-copy').innerHTML=`<p class="eyebrow">${a}</p><h2>${b}</h2><p>${c}</p>`;document.querySelector('#chapter-number').textContent=`0${idx+1} / 04`;}document.querySelector('#chapter-bar').style.width=(p*100)+'%';
  if(renderer.is3D){const keys=[[3.5,2.4,4.8],[1.55,1.18,1.5],[2.8,2.5,3.3],[3.9,2.8,4.8]],v=p*3,k=Math.min(2,Math.floor(v)),f=reduce?0:(v-k)**2*(3-2*(v-k));renderer.eye.position.set(...keys[k].map((x,i)=>x+(keys[k+1][i]-x)*f));renderer.controls.target.set(0,.45,-.6);renderer.eye.lookAt(renderer.controls.target);renderer.draw();host.style.opacity=String(Math.min(1,Math.max(0,(p-.15)/.25)));}
  else document.querySelector('#stage-a').style.transform=reduce?'none':`scale(${1+p*.12}) translateY(${-p*2}%)`;
 }
 const prog=document.querySelector('#progress');if(prog)prog.style.width=100*scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)+'%';}
function schedule(){if(!raf)raf=requestAnimationFrame(frame);}addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);schedule();total();
for(const a of document.querySelectorAll('[data-open-sense]'))a.onclick=()=>{activate();journey.scrollIntoView({behavior:reduce?'instant':'smooth'});};
document.querySelector('#sense-viewer')?.addEventListener('error',()=>{const e=document.querySelector('.viewer-bottom>div');if(e)e.textContent='Produktfoto · 3D kunne ikke lastes';});

const sv=document.querySelector("#sense-viewer");document.querySelector("#reset-orbit")?.addEventListener("click",()=>{sv.cameraOrbit="35deg 67deg 2.9m";sv.jumpCameraToGoal?.();});document.querySelector("#toggle-spin")?.addEventListener("click",e=>{const on=sv.hasAttribute("auto-rotate");sv.toggleAttribute("auto-rotate",!on);e.currentTarget.textContent=on?"▶ Start rotasjon":"Ⅱ Stopp rotasjon";});
