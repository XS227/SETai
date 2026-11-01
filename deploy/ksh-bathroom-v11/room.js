import * as T from 'three';
import {GLTFLoader} from '/ksh/assets/ksh-v6/vendor/examples/jsm/loaders/GLTFLoader.js';
import {RoomRenderer} from '/ksh/assets/ksh-v6/room-renderer.js?v=5';
import {products,placement,normalizeModel,quote,surfacePlan} from './layout.js';
const C=window.KSHRoom;C.materials.none={name:'Ingen gulvbelegg',size:[1,1],pack:null,price:0,image:'cemento.jpg'};
const base='/ksh/fliskonkurrenten/produkt/',stage=document.querySelector('#reisen .journey-stage');
const host=document.createElement('div');host.id='sense-live-room';stage.prepend(host);
const shapes={room:'<path d="M3 9 12 3l9 6v12H3Z M8 21v-8h8v8"/>',floor:'<path d="m12 3 10 6-10 6L2 9Z M2 14l10 6 10-6"/>',products:'<path d="M4 9h16v12H4Z M8 9V4h8v5 M2 14h20"/>',light:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3 M12 20v3 M1 12h3 M20 12h3 M4 4l2 2 M18 18l2 2"/>',camera:'<path d="M4 8a9 9 0 1 1 0 9 M4 2v6h6"/>',views:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',budget:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8 M8 11h2 M14 11h2 M8 16h2 M14 16h2"/>'};
const icon=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[k]}</svg>`;
const labels={room:'Rommål',floor:'Gulv',products:'Produkter',light:'Lys',camera:'Nullstill kamera',views:'Kameravisninger',budget:'Prisberegning'};
const ui=document.createElement('div');ui.className='sense-composer sr5';ui.innerHTML=`<nav class="sr5-tools" aria-label="Romvalg">${Object.keys(labels).map(k=>`<button type="button" data-tool="${k}" aria-label="${labels[k]}" title="${labels[k]}" ${k==='camera'?'':'aria-expanded="false" aria-controls="sr5-drawer"'}>${icon(k)}<span class="sr5-tooltip">${labels[k]}</span></button>`).join('')}</nav><aside class="sr5-drawer" id="sr5-drawer" hidden aria-label="Romvalg"><header><h3 id="sr5-title"></h3><button class="sr5-close" type="button" aria-label="Lukk romvalg">×</button></header><div id="sr5-options"></div></aside><button type="button" class="sr5-price" aria-label="Åpne live prisberegning" aria-expanded="false" aria-controls="sr5-drawer"><span id="sr5-total-label">Delsum</span><output id="sr5-total" aria-live="polite"></output><span class="sr5-price-hint">${icon('budget')} Se beregning</span></button>`;stage.append(ui);
const fullButton=document.createElement('button');
fullButton.type='button';
fullButton.className='sr11-fullscreen';
fullButton.setAttribute('aria-label','Vis showroom i fullskjerm');
fullButton.setAttribute('title','Fullskjerm');
fullButton.setAttribute('aria-pressed','false');
fullButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5"/></svg><span>Fullskjerm</span>';
stage.append(fullButton);
let raw;try{raw=JSON.parse(localStorage.getItem('ksh-bathroom-v6')||localStorage.getItem('ksh-sense-room-v5')||localStorage.getItem('ksh-sense-room-v3'));}catch{}
const state=C.normalize({...C.defaults(),width:3.8,length:3.4,height:2.8,items:[],delivery:null,...raw?.room});state.width=Math.max(3.2,state.width);state.length=Math.max(2.8,state.length);state.height=Math.max(2.8,state.height);state.items=[];
state.lightBrightness=Number.isFinite(+raw?.room?.lightBrightness)
 ?Math.max(20,Math.min(180,Number(raw.room.lightBrightness))):100;
state.lightTemperature=Number.isFinite(+raw?.room?.lightTemperature)
 ?Math.max(2700,Math.min(6500,Number(raw.room.lightTemperature)))
 :(state.daylight==='evening'?3000:5500);
const allKeys=['sense','vedum','zup','althea','stone'];
const incoming=new URLSearchParams(location.search).get('add');
const stored=raw?.enabled && typeof raw.enabled==='object';
const enabled={
 sense:stored?raw.enabled.sense!==false:true,
 vedum:!!raw?.enabled?.vedum,zup:!!raw?.enabled?.zup,
 althea:!!raw?.enabled?.althea,stone:!!raw?.enabled?.stone
};
// First launch from a product page presents that product, not a compulsory
// pre-added Sense tub. Existing saved rooms retain their individual choices.
if(allKeys.includes(incoming)){
 if(!stored){for(const key of allKeys)enabled[key]=false;}
 enabled[incoming]=true;
 const url=new URL(location.href);url.searchParams.delete('add');
 history.replaceState(history.state,'',url.pathname+url.search+url.hash);
}
const money=n=>new Intl.NumberFormat('nb-NO',{style:'currency',currency:'NOK',maximumFractionDigits:0}).format(n),num=n=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:2}).format(n);
let current=null,lastOpener=null;const errors=new Set();
function status(message){document.querySelector('#sense-live-status').textContent=message;}
class BathRoom extends RoomRenderer{
 constructor(){super(host,()=>{},status,{skipChair:true,hideOpening:true});this.models={};this.focusedKey=null;this.focusAnimation=0;if(!this.is3D)return;this.controls.enabled=true;this.renderer.domElement.addEventListener('pointerdown',()=>this.cancelFocus(),{passive:true});this.renderer.domElement.addEventListener('wheel',()=>this.cancelFocus(),{passive:true});const loader=new GLTFLoader();
  for(const key of ['sense','vedum']){const url=key==='sense'?'/ksh/fliskonkurrenten/assets/sense-v3/sense-v3.glb':base+products[key].slug+'/assets/'+(key==='vedum'?'model-turbine-v9.glb':'model-yup-v6.glb');loader.load(url,g=>{try{this.models[key]=normalizeModel(T,g.scene,key);errors.delete(key);this.objectKey='';this.update(state);if(this.focusedKey===key)requestAnimationFrame(()=>this.focus(key));setStatus();}catch(e){errors.add(key);status(e.message+' · kontroller produktmodellen.');}},undefined,()=>{errors.add(key);setStatus();});}
 }
 update(s){super.update(s);if(this.is3D)this.applyLighting(s);}
 applyLighting(s){
  const factor=Math.max(.2,Math.min(1.8,(s.lightBrightness??100)/100));
  const kelvin=Math.max(2700,Math.min(6500,s.lightTemperature??5500));
  const tint=(kelvin-2700)/3800;
  this.sun.intensity=(s.daylight==='evening'?1.6:3.3)*factor;
  this.sun.color.lerpColors(new T.Color('#ffb77b'),new T.Color('#eaf3ff'),tint);
  const ambient=this.scene.children.find(o=>o.isHemisphereLight);
  if(ambient)ambient.intensity=.55+.65*factor;
  this.renderer.toneMappingExposure=(s.daylight==='evening'?1.04:1.15)*Math.pow(factor,.48);
  this.draw();
 }
 setView(preset){
  if(!this.is3D)return;
  const w=state.width,l=state.length,h=state.height;
  const distance=Math.max(w,l);
  let target=new T.Vector3(0,h*.43,0),eye;
  switch(preset){
   case 'front':eye=new T.Vector3(0,h*.70,l*.93+1);target.set(0,h*.48,-l*.18);break;
   case 'left':eye=new T.Vector3(w*.86+1,h*.62,l*.26);target.set(-w*.36,h*.46,0);break;
   case 'right':eye=new T.Vector3(-w*.86-1,h*.64,l*.29);target.set(w*.34,h*.46,0);break;
   case 'top':eye=new T.Vector3(.01,distance*2.0+1,.03);target.set(0,.03,0);break;
   default:eye=new T.Vector3(w*.98,h*.85+1,l*1.02+1);break;
  }
  this.cancelFocus();
  const oldEye=this.eye.position.clone(),oldTarget=this.controls.target.clone();
  const start=performance.now();
  const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:680;
  const step=(now)=>{
   const t=duration?Math.min(1,(now-start)/duration):1;
   const ease=t*t*(3-2*t);
   this.eye.position.lerpVectors(oldEye,eye,ease);
   this.controls.target.lerpVectors(oldTarget,target,ease);
   this.controls.update();this.draw();
   this.focusAnimation=t<1?requestAnimationFrame(step):0;
  };
  this.focusAnimation=requestAnimationFrame(step);
 }
 buildRoom(s){const empty=s.floor==='none';super.buildRoom(empty?{...s,floor:'cemento'}:s);if(empty){const plane=this.room.children.find(o=>o.geometry?.type==='PlaneGeometry');if(plane){plane.material.dispose();plane.material=new T.MeshStandardMaterial({color:'#bdbab4',roughness:1});}}}
 buildObjects(){
  this.clear(this.objects);if(!this.models)return;
  for(const key of ['sense','vedum'])if(enabled[key]&&this.models[key]){
   const object=this.models[key].clone(true),p=placement(key,state);
   object.position.set(...p.position);object.rotation.y=p.rotation;this.objects.add(object);
  }
  if(enabled.althea)this.installWallSurface('althea',state);
  if(enabled.zup)this.installWallSurface('zup',state);
 }
 installWallSurface(key,room){
  // Tiles and slat panels are INSTALLATION materials, not isolated loose objects.
  // Efficient instanced geometry keeps Fold/mobile GPU draw calls low.
  const plan=surfacePlan(key,room),tile=key==='althea',w=room.width,l=room.length;
  const group=new T.Group();group.name='INSTALLED_'+key.toUpperCase()+'_WALL';
  group.userData.kshMaterialArea=plan.area;
  const quat=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),tile?Math.PI/2:0);
  const baseMat=new T.MeshStandardMaterial({
   color:tile?'#b7a48c':'#292523',roughness:tile?.83:.91,metalness:0,side:T.DoubleSide
  });
  const grout=new T.MeshStandardMaterial({color:tile?'#948a7c':'#141416',roughness:.96,side:T.DoubleSide});
  const border=new T.Mesh(new T.PlaneGeometry(plan.width,plan.height),grout);
  border.position.set(tile?-w/2+.018:0,plan.height/2,tile?0:-l/2+.018);
  border.rotation.y=tile?Math.PI/2:0;border.receiveShadow=true;group.add(border);
  const count=plan.columns*plan.rows;
  const tiles=new T.InstancedMesh(new T.BoxGeometry(1,1,1),baseMat,count);
  tiles.name=tile?'Althea Sand Dekor · monterte fliser':'Z-UP Eik Sort · monterte veggpaneler';
  const inst=new T.Object3D(),gap=tile?.004:.003;
  let i=0;
  for(let row=0;row<plan.rows;row++)for(let col=0;col<plan.columns;col++){
   const sw=Math.min(plan.unitW,plan.width-col*plan.unitW);
   const sh=Math.min(plan.unitH,plan.height-row*plan.unitH);
   if(sw<=0||sh<=0)continue;
   const localX=-plan.width/2+col*plan.unitW+sw/2;
   const y=row*plan.unitH+sh/2;
   inst.position.set(tile?-w/2+.029:localX,y,tile?-localX:-l/2+.028);
   inst.quaternion.copy(quat);inst.scale.set(Math.max(.01,sw-gap),Math.max(.01,sh-gap),.011);
   inst.updateMatrix();tiles.setMatrixAt(i++,inst.matrix);
  }
  tiles.count=i;tiles.instanceMatrix.needsUpdate=true;
  tiles.castShadow=true;tiles.receiveShadow=true;
  group.add(tiles);
  // Product-specific relief: Althea vertical ceramic grooves, Z-UP wood strips.
  // This is an illustrative room installation of the selected surface.
  const ribMat=new T.MeshStandardMaterial({
   color:tile?'#d2c0aa':'#51463b',roughness:tile?.84:.76,side:T.DoubleSide
  });
  const ribPer=tile?17:12;
  const ribs=new T.InstancedMesh(new T.BoxGeometry(1,1,1),ribMat,i*ribPer);
  let j=0;
  for(let row=0;row<plan.rows;row++)for(let col=0;col<plan.columns;col++){
   const sw=Math.min(plan.unitW,plan.width-col*plan.unitW);
   const sh=Math.min(plan.unitH,plan.height-row*plan.unitH);
   if(sw<=0||sh<=0)continue;
   const y=row*plan.unitH+sh/2;
   for(let rib=0;rib<ribPer;rib++){
    const along=col*plan.unitW+(rib+.5)*sw/ribPer;
    const localX=-plan.width/2+along;
    inst.position.set(tile?-w/2+.037:localX,y,tile?-localX:-l/2+.037);
    inst.quaternion.copy(quat);
    inst.scale.set(tile?.0035:.026,Math.max(.01,sh-gap),tile?.006:.010);
    inst.updateMatrix();ribs.setMatrixAt(j++,inst.matrix);
   }
  }
  ribs.count=j;ribs.instanceMatrix.needsUpdate=true;
  ribs.castShadow=true;ribs.receiveShadow=true;group.add(ribs);
  this.objects.add(group);
 }
 cancelFocus(){if(this.focusAnimation){cancelAnimationFrame(this.focusAnimation);this.focusAnimation=0;}}
 focus(key){
  if(!this.is3D)return;
  this.focusedKey=key;
  const w=state.width,l=state.length,h=state.height;
  const target=key==='althea'?new T.Vector3(-w/2+.09,h*.52,0)
   :key==='zup'?new T.Vector3(0,h*.53,-l/2+.09)
   :key==='vedum'?new T.Vector3(-w/2+.54,.90,.2)
   :new T.Vector3(.2,.36,-l/2+.56);
  const eye=target.clone().add(key==='althea'?new T.Vector3(Math.min(w*.75,2.45),.45,1.3)
   :key==='zup'?new T.Vector3(.8,.52,Math.min(l*.78,2.4))
   :key==='vedum'?new T.Vector3(Math.min(w*.82,2.5),.65,1.4)
   :new T.Vector3(1.65,1.25,2.05));
  this.cancelFocus();
  const startEye=this.eye.position.clone(),startTarget=this.controls.target.clone();
  const begin=performance.now(),duration=window.matchMedia('(prefers-reduced-motion:reduce)').matches?0:680;
  const tick=now=>{
   const p=duration?Math.min(1,(now-begin)/duration):1;
   const ease=1-Math.pow(1-p,3);
   this.eye.position.lerpVectors(startEye,eye,ease);
   this.controls.target.lerpVectors(startTarget,target,ease);
   this.controls.update();this.draw();
   this.focusAnimation=p<1?requestAnimationFrame(tick):0;
  };
  this.focusAnimation=requestAnimationFrame(tick);
 }

}
const renderer=new BathRoom();window.KSHBathroom={state,enabled,focus:key=>renderer.focus(key),setView:view=>renderer.setView(view)};if(!renderer.is3D)host.hidden=true;
function setStatus(){status(!renderer.is3D?'Produktfoto · 3D er ikke tilgjengelig i nettleseren':errors.size?'En eller flere modeller kunne ikke lastes. Se prislisten.':!['sense','vedum','zup','althea'].some(k=>enabled[k])?'Rommet er tomt. Åpne produktikonet for å legge inn en modell.':'Dra for å rotere · mål i meter · produktstudier');}
function persist(){try{localStorage.setItem('ksh-bathroom-v6',JSON.stringify({room:state,enabled}));}catch{}}
function update(){renderer.objectKey='';renderer.update(state);persist();const q=quote(C,state,enabled);document.querySelector('#sr5-total').textContent=money(q.total);document.querySelector('#sr5-total-label').textContent=q.missing?`Delsum · ${q.missing} uten pris`:'Delsum produkter og gulv';
 if(current==='budget')renderBudget();if(!renderer.is3D){let board=ui.querySelector('.sr5-photo-samples');if(!board){board=document.createElement('div');board.className='sr5-photo-samples';ui.append(board);}board.innerHTML=state.floor==='none'?'<span>Ingen gulvbelegg valgt</span>':`<img src="/ksh/assets/ksh-v6/assets/${C.materials[state.floor].image}" alt="${C.materials[state.floor].name}"><span>${C.materials[state.floor].name}</span>`;}
}
const options=ui.querySelector('#sr5-options');
function renderBudget(){const q=quote(C,state,enabled),t=q.floor;options.innerHTML=`<dl class="sr5-breakdown">${q.lines.map(l=>`<dt>${l.name}${l.plan?`<small>${l.count} ${l.unit} til ${num(l.plan.area)} m² vegg · ${state.waste}% svinn · ${money(l.unitPrice)}/stk</small>`:''}</dt><dd>${l.price===null?'Ikke priset':money(l.price)}</dd>`).join('')}<dt>${C.materials[state.floor].name}<small>${num(t.area)} m² netto · ${state.waste}% svinn${t.packages===null?'':` · ${t.packages} pakker`}<br>${num(t.orderArea)} m² × ${C.unitPrice(state)===null?'ukjent pris':money(C.unitPrice(state))+'/m²'}</small></dt><dd>${C.unitPrice(state)===null?'Ikke priset':money(t.floorCost)}</dd><dt><strong>Delsum kjente priser</strong></dt><dd><strong>${money(q.total)}</strong></dd></dl><p>Priser fra produktstudiene, kontrollert 31.10.2026. Arbeid, lim, fug og levering kommer i tillegg. Steinreferansen er ikke priset. Colorker og Z-UP beregnes ut fra én illustrert hel vegg med hele enheter, kapp og svinn. Bekreft mengde, monteringsmåte og faktisk materialbehov før bestilling.</p><p>Modeller som ennå ikke er lastet inn, står fortsatt i prislisten.</p>`;}
function render(name){ui.querySelector('#sr5-title').textContent=labels[name];
 if(name==='budget'){renderBudget();return;}
 if(name==='room'){options.innerHTML=`<p>Rommålene oppdaterer gulvmengden, prisen og plasseringen av veggproduktene.</p>${[['width','Bredde',3.2,8],['length','Lengde',2.8,8],['height','Høyde',2.8,4]].map(([k,l,min,max])=>`<label>${l} (m)<input data-dimension="${k}" type="number" value="${state[k]}" min="${min}" max="${max}" step="0.1"></label>`).join('')}<p>Sense: 170 × 80 × 60 cm. Vedum: 120,5 cm bredde, topp ca. 90 cm over gulvet. Z-UP: 279,8 × 60 cm. Colorker: 119,2 × 59,5 cm.</p>`;
  options.querySelectorAll('[data-dimension]').forEach(el=>el.oninput=()=>{if(el.value===''||!el.validity.valid)return;state[el.dataset.dimension]=Number(el.value);update();});return;}
 if(name==='floor'){options.innerHTML='<p>Trykk på valgt gulv en gang til for å fjerne det. «Ingen gulvbelegg» fjerner gulv fra listen og prisen.</p>'+Object.entries(C.materials).map(([key,m])=>`<button class="sr5-material" type="button" data-floor="${key}" aria-pressed="${state.floor===key}"><img src="/ksh/assets/ksh-v6/assets/${m.image}" alt=""><span>${m.name}<small>${m.price===null?'Uten produktpris':money(C.unitPrice({...state,floor:key}))+' / m²'}</small></span></button>`).join('')+`<label>Kapp og svinn (%)<input id="sr5-waste" type="number" value="${state.waste}" min="0" max="30" step="1"></label><p>Hele pakker beregnes automatisk. Velg kalkulatorikonet for alle mengder og delpriser.</p>`;
  options.querySelectorAll('[data-floor]').forEach(b=>b.onclick=()=>{state.floor=state.floor===b.dataset.floor?'none':b.dataset.floor;update();render(name);});options.querySelector('#sr5-waste').oninput=e=>{if(e.target.value!==''&&e.target.validity.valid){state.waste=Number(e.target.value);update();}};return;}
 if(name==='products'){
  options.innerHTML='<p>Legg til eller fjern hvert produkt når du vil. Valgene og budsjettet lagres automatisk.</p>'+
   Object.entries(products).map(([key,p])=>{
    const on=!!enabled[key],plan=(key==='althea'||key==='zup')?surfacePlan(key,state):null,cost=p.price===null?'Referansefoto, ikke priset':(plan?money(p.price)+' / stk · ca. '+plan.orderPieces+' stk til veggen':money(p.price));
    return '<div class="sr10-product-row"><button type="button" class="sr5-product" data-product="'+key+'" aria-pressed="'+on+'" aria-label="'+(on?'Fjern ':'Legg til ')+p.name+'">'+
     '<span aria-hidden="true">'+(on?'−':'＋')+'</span><span>'+p.name+
     '<small>'+(on?'I rommet · trykk for å fjerne':'Legg til i rommet')+' · '+cost+'</small></span></button>'+ (on&&key!=='stone'?'<button class="sr10-focus" type="button" data-focus="'+key+'" aria-label="Se plassering av '+p.name+'">◎<small>Vis</small></button>':'')+'</div>';
   }).join('')+
   '<button type="button" class="sr8-clear" id="sr8-clear" '+(!Object.values(enabled).some(Boolean)?'disabled':'')+'>Fjern alle produkter fra rommet</button>'+
   '<p>Modellene er visuelle produktstudier. Vedum står mot venstre vegg; flis og spileplate vises som veggmaterialer.</p>'+
   '<figure class="sr9-stone-reference"><img src="/ksh/fliskonkurrenten/assets/bathroom-v9/turbine-grey.jpg" loading="lazy" alt="Vedum Turbine Grey komposittstein mønster"><figcaption>Vedum Turbine Grey · original materialreferanse fra produsenten. Naturlig åremønster og grå nyanser.</figcaption></figure>'+
   (enabled.stone?'<figure class="sr5-stone"><img src="/ksh/assets/ksh-v6/assets/social/DJqssF3tO5x.jpg" alt="Naturstein fra Heimdal"><figcaption>Heimdal · referansefoto, ikke en priset 3D-modell.</figcaption></figure>':'');
  options.querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>{
   const key=b.dataset.product,added=!enabled[key];enabled[key]=added;update();setStatus();if(added&&key!=='stone'){close();renderer.focus(key);}else render(name);
   if(!added)options.querySelector('[data-product="'+key+'"]')?.focus({preventScroll:true});
  });
  options.querySelectorAll('[data-focus]').forEach(b=>b.onclick=()=>{const key=b.dataset.focus;close();renderer.focus(key);});
  options.querySelector('#sr8-clear').onclick=()=>{for(const key of allKeys)enabled[key]=false;update();setStatus();render(name);};
  return;
 }
 if(name==='light'){
  options.innerHTML=`<div class="sr5-light-options"><button type="button" data-day="day" aria-pressed="${state.daylight==='day'}">Dagslys</button><button type="button" data-day="evening" aria-pressed="${state.daylight==='evening'}">Kveldslys</button></div>
  <div class="sr11-light-setting"><label for="sr11-brightness">Lysstyrke <output id="sr11-brightness-value" for="sr11-brightness">${Math.round(state.lightBrightness)} %</output></label>
   <input id="sr11-brightness" type="range" min="20" max="180" step="5" value="${state.lightBrightness}" aria-label="Lysstyrke fra 20 til 180 prosent"></div>
  <div class="sr11-light-setting"><label for="sr11-temperature">Fargetemperatur <output id="sr11-temperature-value" for="sr11-temperature">${Math.round(state.lightTemperature)} K</output></label>
   <input id="sr11-temperature" type="range" min="2700" max="6500" step="100" value="${state.lightTemperature}" aria-label="Varmt til kaldt lys, 2700 til 6500 Kelvin">
   <div class="sr11-temperature-scale"><span>Varmt · 2700 K</span><span>Kaldt · 6500 K</span></div></div>
  <p>Lys er en forhåndsvisning på skjerm. Produkters farger må sammenlignes med fysiske prøver før bestilling.</p>`;
  options.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{
   state.daylight=b.dataset.day;
   state.lightBrightness=b.dataset.day==='day'?100:65;
   state.lightTemperature=b.dataset.day==='day'?5500:3000;
   update();render('light');
  });
  const brightness=options.querySelector('#sr11-brightness'),
        temperature=options.querySelector('#sr11-temperature');
  brightness.oninput=()=>{state.lightBrightness=+brightness.value;options.querySelector('#sr11-brightness-value').textContent=brightness.value+' %';update();};
  temperature.oninput=()=>{state.lightTemperature=+temperature.value;options.querySelector('#sr11-temperature-value').textContent=temperature.value+' K';update();};
  return;
 }
 if(name==='views'){
  const views=[['overview','Oversikt','Hele rommet i perspektiv'],
   ['front','Forfra','Se bakveggen og produktene'],
   ['left','Venstre vegg','Se fliser og Vedum'],
   ['right','Høyre vegg','Se veggpanel og rom'],
   ['top','Ovenfra','Rom og gulv i plan']];
  options.innerHTML='<p>Velg hvor du vil se rommet fra. Dra i 3D-visningen for å rotere videre.</p><div class="sr11-views">'+
   views.map(([key,label,info])=>'<button type="button" data-view="'+key+'"><span>'+label+'</span><small>'+info+'</small></button>').join('')+'</div>';
  options.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{const view=b.dataset.view;close();renderer.setView(view);});
  return;
 }
}
function close(){current=null;ui.querySelector('.sr5-drawer').hidden=true;ui.querySelectorAll('[aria-expanded]').forEach(b=>b.setAttribute('aria-expanded','false'));lastOpener?.focus({preventScroll:true});}
function open(name,button){if(current===name){close();return;}current=name;lastOpener=button;render(name);ui.querySelector('.sr5-drawer').hidden=false;ui.querySelectorAll('[aria-expanded]').forEach(b=>b.setAttribute('aria-expanded',String(b===button)));ui.querySelector('.sr5-close').focus({preventScroll:true});}
ui.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{if(b.dataset.tool==='camera'){if(renderer.is3D)renderer.reset();close();}else open(b.dataset.tool,b);});ui.querySelector('.sr5-price').onclick=e=>open('budget',e.currentTarget);ui.querySelector('.sr5-close').onclick=close;
ui.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
function syncFullscreen(){
 const active=document.fullscreenElement===stage||stage.classList.contains('sr11-faux-fullscreen');
 fullButton.setAttribute('aria-pressed',String(active));
 fullButton.setAttribute('aria-label',active?'Avslutt fullskjerm':'Vis showroom i fullskjerm');
 fullButton.title=active?'Avslutt fullskjerm':'Fullskjerm';
 fullButton.querySelector('span').textContent=active?'Lukk fullskjerm':'Fullskjerm';
 fullButton.querySelector('svg').innerHTML=active
  ?'<path d="M3 9h6V3 M21 9h-6V3 M21 15h-6v6 M3 15h6v6"/>'
  :'<path d="M8 3H3v5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5"/>';
 requestAnimationFrame(()=>{if(renderer.is3D)renderer.resize();scheduleOverlay();});
}
function exitFauxFullscreen(){
 stage.classList.remove('sr11-faux-fullscreen');document.documentElement.classList.remove('sr11-page-locked');
 syncFullscreen();
}
fullButton.addEventListener('click',async()=>{
 if(stage.classList.contains('sr11-faux-fullscreen')){exitFauxFullscreen();return;}
 if(document.fullscreenElement===stage){
  try{await document.exitFullscreen();}catch(e){status('Kunne ikke avslutte fullskjerm: '+e.message);}
  syncFullscreen();return;
 }
 close();
 if(stage.requestFullscreen){
  try{await stage.requestFullscreen({navigationUI:'hide'});syncFullscreen();return;}
  catch(e){/* Some mobile browsers disallow native fullscreen on this element. Use page-level fullscreen. */}
 }
 stage.classList.add('sr11-faux-fullscreen');document.documentElement.classList.add('sr11-page-locked');
 syncFullscreen();
});
document.addEventListener('fullscreenchange',syncFullscreen);
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&stage.classList.contains('sr11-faux-fullscreen'))exitFauxFullscreen();
});
update();if(renderer.is3D){renderer.reset();const first=allKeys.find(k=>enabled[k]&&k!=='stone');if(first){renderer.focusedKey=first;setTimeout(()=>renderer.focus(first),230);}}setStatus();
// Keep the live subtotal inside the visible part of a tall showroom on phones.
let layoutFrame=0;
function fitOverlay(){stage.classList.toggle('sr10-compact',matchMedia('(pointer:coarse)').matches||stage.clientWidth<1050);layoutFrame=0;const rect=stage.getBoundingClientRect(),height=stage.clientHeight;ui.querySelector('.sr5-price').style.bottom=Math.min(Math.max(65,rect.bottom-innerHeight+18),Math.max(65,height-155))+'px';ui.style.setProperty('--sr5-drawer-height',Math.max(150,Math.min(height-235,innerHeight-Math.max(86,rect.top)-215))+'px');}
function scheduleOverlay(){if(!layoutFrame)layoutFrame=requestAnimationFrame(fitOverlay);}
addEventListener('scroll',scheduleOverlay,{passive:true});addEventListener('resize',scheduleOverlay);if(window.visualViewport)visualViewport.addEventListener('resize',scheduleOverlay);if(window.ResizeObserver)new ResizeObserver(scheduleOverlay).observe(stage);fitOverlay();
