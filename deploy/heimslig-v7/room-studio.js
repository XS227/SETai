/* One shared room state drives geometry, selection, quantities and estimates. */
(function(){'use strict';
const C=window.HeimsligRoom,KEY='heimslig-room-v5',base='/ksh/heimslig/';
function start(){
 const old=document.querySelector('#heimsligViewer');if(!old)return;
 const shell=old.closest('.studio-shell');if(!shell)return;
 document.querySelector('#heimslig-kalkulator')?.remove();
 let state;try{state=C.normalize(JSON.parse(localStorage.getItem(KEY)));}catch{state=C.defaults();}
 const money=n=>new Intl.NumberFormat('nb-NO',{style:'currency',currency:'NOK',maximumFractionDigits:0}).format(n);
 const num=n=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:2}).format(n);
 const options=(o)=>Object.entries(o).map(([v,t])=>`<option value="${v}">${typeof t==='string'?t:t.name}</option>`).join('');
 shell.className='h5-studio';shell.id='heimslig-kalkulator';
 shell.innerHTML=`<div class="h5-heading"><div><span class="h5-kicker">HEIMSLIG · ROM & BUDSJETT</span><h2>Ditt rom. Dine valg.</h2></div><p>Velg møbler og overflater. Juster rommet og se hva valgene betyr for plass og budsjett.</p></div>
 <p id="h5-product-context" class="h5-fine" role="status"></p><div class="h5-workspace"><div class="h5-visual"><div class="h5-toolbar"><span id="h5-render-mode">Romvisning</span><button type="button" id="h5-fullscreen">Fullskjerm ⤢</button></div><div id="h5-canvas"></div>
 <div class="h5-camera" role="group" aria-label="Kameravinkel"><button type="button" data-view="perspective" aria-pressed="true">Perspektiv</button><button type="button" data-view="front" aria-pressed="false">Forfra</button><button type="button" data-view="side" aria-pressed="false">Fra siden</button><button type="button" data-view="top" aria-pressed="false">Ovenfra</button><button type="button" id="h5-zoom-in" aria-label="Zoom inn">＋</button><button type="button" id="h5-zoom-out" aria-label="Zoom ut">−</button><button type="button" id="h5-camera-reset">Nullstill kamera</button></div>
 <div class="h5-live"><span id="h5-area"></span><span id="h5-selection"></span></div><p id="h5-fit" role="status"></p><button type="button" id="h5-reflow" hidden>Fordel overlappende møbler</button><p class="h5-hint">Dra i 3D-visningen for å rotere rommet. Velg et møbel i listen for å endre mål, plassering og pris.</p>
 <div class="h5-budget"><div><span class="h5-kicker">DITT BUDSJETTESTIMAT</span><output id="h5-total" aria-live="polite"></output></div><p id="h5-price-status"></p><dl id="h5-totals"></dl><details><summary>Se hele material- og møbellisten</summary><div id="h5-breakdown"></div></details><div class="h5-actions"><button type="button" id="h5-copy">Kopier prosjekt</button><button type="button" id="h5-print">Skriv ut / PDF</button></div><p class="h5-fine">Egne prisanslag i kroner inkl. eventuell mva. Demomodeller og overflater, ikke bekreftede Heimslig-produkter. Ingen bestilling eller betaling.</p></div></div>
 <div class="h5-controls"><details open><summary><b>01</b> Rom og mål</summary><label>Romtype<select id="h5-roomType"><option value="stue">Stue</option><option value="spisestue">Spisestue</option><option value="soverom">Soverom</option></select></label><p class="h5-fine">Romtypen foreslår et møbel; listen beholdes når du bytter.</p><div class="h5-fields"><label>Bredde (m)<input id="h5-width" type="number" min="2.5" max="12" step="0.1"></label><label>Lengde (m)<input id="h5-length" type="number" min="2.5" max="12" step="0.1"></label><label>Høyde (m)<input id="h5-height" type="number" min="2.1" max="4" step="0.1"></label></div></details>
 <details open><summary><b>02</b> Møbler i rommet <span id="h5-count"></span></summary><div id="h5-items"></div><div class="h5-add"><label>Legg til møbel<select id="h5-add-type">${options(C.catalog)}</select></label><button type="button" id="h5-add">＋ Legg i rommet</button></div><p id="h5-place-status" role="status" class="h5-fine"></p>
 <div id="h5-editor"><h3 id="h5-item-name"></h3><p id="h5-info"></p><label>Tekstil / finish<select id="h5-finish">${options(C.finishes)}</select></label><div class="h5-fields"><label>Bredde (cm)<input id="h5-item-width" type="number" min="20" max="400" step="1"></label><label>Høyde (cm)<input id="h5-item-height" type="number" min="20" max="400" step="1"></label><label>Dybde (cm)<input id="h5-item-depth" type="number" min="20" max="400" step="1"></label></div><div class="h5-fields"><label>Sideveis (m)<input id="h5-x" type="number" min="-6" max="6" step="0.1"></label><label>Frem / tilbake (m)<input id="h5-z" type="number" min="-6" max="6" step="0.1"></label><label>Rotasjon (°)<input id="h5-rotation" type="number" min="-180" max="180" step="15"></label></div><label>Ditt prisanslag for dette møbelet (kr)<input id="h5-item-price" type="number" min="0" max="10000000" step="1" placeholder="Ikke oppgitt"></label><p class="h5-fine">Når størrelse eller finish endres, tømmes prisanslaget slik at du kan vurdere den nye varianten.</p><div class="h5-actions"><button type="button" id="h5-duplicate">＋ Ett til</button><button type="button" id="h5-remove">Fjern fra rommet</button></div></div></details>
 <details open><summary><b>03</b> Overflater og lys</summary><div class="h5-fields two"><label>Vegg<select id="h5-wall">${options(C.walls)}</select></label><label>Gulv<select id="h5-floor">${options(C.floors)}</select></label><label>Leggemønster<select id="h5-pattern"><option value="straight">Rett</option><option value="offset">Halvforband</option></select></label><label>Flisformat<select id="h5-format"><option value="0.3">30 × 30 cm</option><option value="0.6">60 × 60 cm</option><option value="0.9">90 × 90 cm</option></select></label><label>Lys<select id="h5-daylight"><option value="day">Dagslys</option><option value="evening">Kveld</option></select></label><label>Kapp / svinn (%)<input id="h5-waste" type="number" min="0" max="30" step="1"></label></div><p id="h5-floor-info" class="h5-fine"></p><label id="h5-floor-price-label">Ditt anslag per m² gulv (kr)<input id="h5-floor-price" type="number" min="0" max="10000000" step="1" placeholder="Ikke oppgitt"></label><label>Frakt / levering (kr)<input id="h5-delivery" type="number" min="0" max="10000000" step="1" placeholder="Ikke oppgitt – skriv 0 ved henting"></label><p class="h5-fine">Veggfarge og lys er visningsvalg. Arbeid, veggbehandling og andre tillegg er ikke med i estimatet.</p></details><p id="h5-save-status" class="h5-fine"></p></div></div>`;
 const $=id=>document.getElementById('h5-'+id),selected=()=>state.items.find(i=>i.id===state.selected);
 const requestedProduct=new URLSearchParams(location.search).get('produkt');
 const productResult=requestedProduct?C.selectProduct(state,requestedProduct):null;
 if(productResult){
  $('product-context').textContent=productResult.status==='unknown'
   ?'Dette produktet har ennå ingen egen 3D-modell. Vi viser derfor en generell romdemo, ikke et bilde av varen.'
   :productResult.status==='no-space'||productResult.status==='full'
   ?'Det er ikke plass til '+productResult.name+'. Utvid rommet eller fjern et møbel og åpne produktlenken igjen.'
   :'Fra butikken: '+productResult.name+' · egen illustrativ modell med tilsvarende grunnform (ikke bekreftede produktmål).';
 }
 const renderer=new window.HeimsligRenderer($('canvas'));
 $('render-mode').textContent=renderer.is3D?'LIVE 3D · DRA FOR Å ROTERE':'MÅLFAST 2D-PLAN';
 if(!renderer.is3D){shell.querySelector('.h5-camera').hidden=true;shell.querySelector('.h5-hint').textContent='Velg et møbel i listen for å endre mål, plassering og pris.';}
 function set(id,value){if(document.activeElement!==$(id))$(id).value=value??'';}
 function summaryText(){const t=C.totals(state);return ['Heimslig · rom og budsjett (egne anslag, ikke tilbud)',`Rom: ${state.roomType} · ${num(state.width)} × ${num(state.length)} × ${num(state.height)} m`,...state.items.map(i=>`${C.itemName(i)} · ${C.finishes[i.finish]} · ${i.size.map(v=>num(v*100)).join(' × ')} cm · ${i.price===null?'Pris mangler':money(i.price)}`),`Gulv: ${C.floors[state.floor]} · netto ${num(t.area)} m² · med ${state.waste}% svinn ${num(t.orderArea)} m² · ${C.price(state.floorPrices[state.floor])===null?'Pris mangler':money(t.floorCost)}`,`Vegg: ${C.walls[state.wall]}`,`Frakt: ${state.delivery===null?'Ikke oppgitt':money(state.delivery)}`,`${t.missing?'Delsum kjente beløp':'Sum'}: ${money(t.total)}`,`${t.missing} prisfelt mangler. Arbeid og veggbehandling er ikke med.`].join('\n');}
 function update(){const t=C.totals(state),i=selected();renderer.update(state);
 for(const key of ['roomType','width','length','height','wall','floor','pattern','format','daylight','waste','delivery'])set(key,state[key]);set('floor-price',state.floorPrices[state.floor]);
 $('area').textContent=`${num(t.area)} m² · ${num(state.width)} × ${num(state.length)} m`;
 $('selection').textContent=i?C.itemName(i)+' · '+C.finishes[i.finish]:'Ingen møbler valgt';
 const outside=state.items.filter(x=>C.outside(state,x)),overlap=C.collisions(state);
 $('fit').textContent=[
  outside.length?outside.length+' møbel(er) går utenfor rommet. Juster mål eller plassering.':'',
  overlap.length?overlap.length+' møbelpar overlapper. Trykk «Fordel overlappende møbler» for å rydde opp.':''
 ].filter(Boolean).join(' ');
 $('reflow').hidden=!overlap.length;
 $('total').textContent=money(t.total);$('price-status').textContent=t.missing?`Delsum · ${t.missing} prisfelt mangler. Fyll inn egne anslag for et komplett budsjett.`:'Alle prisfelt er fylt inn · ditt samlede estimat.';
 $('totals').innerHTML=`<dt>Møbler (${state.items.length} stk.)</dt><dd>${money(t.furniture)}</dd><dt>Gulv · ${num(t.orderArea)} m² inkl. ${state.waste}% svinn</dt><dd>${C.price(state.floorPrices[state.floor])===null?'Pris mangler':money(t.floorCost)}</dd><dt>Levering</dt><dd>${state.delivery===null?'Ikke oppgitt':money(state.delivery)}</dd>`;
 $('breakdown').textContent=summaryText();$('count').textContent=state.items.length+' / 20';
 const focusedID=document.activeElement?.dataset.item;
 $('items').replaceChildren();for(const it of state.items){const b=document.createElement('button');b.type='button';b.dataset.item=it.id;b.setAttribute('aria-pressed',String(it.id===state.selected));b.textContent=`${C.itemName(it)} · ${C.finishes[it.finish]} · ${it.price===null?'pris mangler':money(it.price)}`;b.onclick=()=>{state.selected=it.id;update();};$('items').append(b);if(focusedID===it.id)b.focus({preventScroll:true});}
 $('editor').hidden=!i;if(i){$('item-name').textContent=C.itemName(i);$('info').textContent=C.itemInfo(i);set('finish',i.finish);['width','height','depth'].forEach((k,j)=>set('item-'+k,Math.round(i.size[j]*100)));for(const key of ['x','z','rotation'])set(key,i[key]);set('item-price',i.price);}
 const tiled=['slate','limestone'].includes(state.floor);$('pattern').disabled=!tiled;$('format').disabled=!tiled;
 $('floor-info').textContent=`${C.floors[state.floor]} · ${num(t.area)} m² netto → ${num(t.orderArea)} m² med svinn. ${tiled?'Flisformat og fugemønster vises i rommet.':'Sammenhengende overflate; flisformat brukes ikke.'}`;
 $('add').disabled=state.items.length>=20;$('duplicate').disabled=state.items.length>=20;
 try{localStorage.setItem(KEY,JSON.stringify(state));$('save-status').textContent='Valgene lagres automatisk i denne nettleseren.';}catch{$('save-status').textContent='Lagring er ikke tilgjengelig. Kopier prosjektet før du lukker siden.';}
 }
 const numeric=(id,fn)=>$(id).addEventListener('input',e=>{const el=e.target;if(el.value===''||!el.validity.valid)return;fn(Number(el.value));update();});
 for(const key of ['width','length','height','waste'])numeric(key,v=>state[key]=v);
 for(const key of ['roomType','wall','floor','pattern','daylight'])$(key).onchange=e=>{state[key]=e.target.value;if(key==='roomType')$('add-type').value={stue:'sofa',spisestue:'dining',soverom:'bed'}[state.roomType];update();};
 $('format').onchange=e=>{state.format=Number(e.target.value);update();};
 function add(type,source){
  if(state.items.length>=20){$('place-status').textContent='Maksimum 20 møbler. Fjern et møbel først.';return;}
  const id='i'+Date.now()+'-'+Math.random().toString(16).slice(2,6);
  const i=source?{...source,id,size:[...source.size]}:C.item(type,id);
  const placement=C.findPlacement(state,i);
  if(!placement){$('place-status').textContent='Ingen ledig gulvplass til '+C.itemName(i)+'. Utvid rommet, flytt eller fjern et møbel. Ingenting ble lagt oppå andre møbler.';return;}
  Object.assign(i,placement);state.items.push(i);state.selected=id;
  $('place-status').textContent=C.itemName(i)+' er plassert på en ledig plass i rommet.';
  update();
 }
 $('reflow').onclick=()=>{
  if(C.reflow(state)){$('place-status').textContent='Møblene er fordelt uten overlapping.';update();}
  else $('place-status').textContent='Ikke nok plass til å fordele alle møblene. Prøv et større rom.';
 };
 $('add').onclick=()=>add($('add-type').value);$('duplicate').onclick=()=>{if(selected())add(selected().type,selected());};$('remove').onclick=()=>{state.items=state.items.filter(i=>i.id!==state.selected);state.selected=state.items[0]?.id||null;update();};
 $('finish').onchange=e=>{if(selected()){selected().finish=e.target.value;selected().price=null;set('item-price','');update();}};
 ['width','height','depth'].forEach((k,j)=>numeric('item-'+k,v=>{if(selected()){selected().size[j]=v/100;selected().price=null;set('item-price','');}}));
 for(const key of ['x','z','rotation'])numeric(key,v=>{if(selected())selected()[key]=v;});
 for(const [id,fn] of [['item-price',v=>{if(selected())selected().price=v;}],['floor-price',v=>state.floorPrices[state.floor]=v],['delivery',v=>state.delivery=v]])$(id).oninput=e=>{if(e.target.value!==''&&!e.target.validity.valid)return;fn(C.price(e.target.value));update();};
 shell.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{renderer.camera(b.dataset.view);shell.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
 $('zoom-in').onclick=()=>renderer.zoom(.15);$('zoom-out').onclick=()=>renderer.zoom(-.15);$('camera-reset').onclick=()=>{renderer.reset();shell.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view==='perspective')));};
 $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(shell.requestFullscreen)await shell.requestFullscreen();else shell.classList.toggle('h5-expanded');}catch{shell.classList.toggle('h5-expanded');}};
 document.addEventListener('keydown',e=>{if(e.key==='Escape')shell.classList.remove('h5-expanded');});
 $('copy').onclick=async()=>{try{await navigator.clipboard.writeText(summaryText());$('copy').textContent='Kopiert ✓';}catch{window.prompt('Kopier prosjektet:',summaryText());}};
 $('print').onclick=()=>{const d=$('breakdown').closest('details');d.open=true;window.print();};
 // Catalog links share this single room and persisted state; no disconnected calculator remains.
 document.querySelectorAll('a[href*="#heimslig-kalkulator"]').forEach(a=>{a.href=base+'3d-studio/#heimslig-kalkulator';a.textContent='3D-rom & pris';});
 const context=document.querySelector('.studio-context span');if(context)context.textContent='Romvalg, møbler og budsjett er samlet. Modeller og prisanslag er illustrative.';
 update();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
