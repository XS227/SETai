/* Fliskonkurrenten v13.1: Embed the ACTUAL existing bathroom WebGL engine
   inside the Vedum cinematic product landing (not another low-detail render).
   Keep the standalone 360 GLB available as an alternate view. */
(()=>{
'use strict';
const path=location.pathname;
if(path.includes('/showroom/')){
 if(new URLSearchParams(location.search).get('embedded')==='1'){
  document.documentElement.classList.add('k13-embedded-room');
 }
 return;
}
if(!path.includes('/produkt/vedum-flow-takegronn/'))return;
let attempts=0;
function setup(){
 const box=document.querySelector('#model .model-box');
 const model=box?.querySelector('model-viewer');
 const tools=box?.querySelector('.model-tools');
 if(!box||!model||!tools){
  if(++attempts<30)setTimeout(setup,150);
  return;
 }
 if(box.dataset.k13Embedded)return;
 box.dataset.k13Embedded='true';
 const before=document.createElement('div');
 before.className='k13-studio-modes';
 before.setAttribute('role','tablist');
 before.setAttribute('aria-label','Velg produktvisning');
 before.innerHTML='<button type="button" role="tab" aria-selected="true" id="k13-tab-room" aria-controls="k13-room-frame">I baderommet · Live 3D</button><button type="button" role="tab" aria-selected="false" id="k13-tab-product" aria-controls="viewer">Produkt 360°</button>';
 box.insertAdjacentElement('beforebegin',before);
 const stage=document.createElement('div');stage.className='k13-embedded-stage';stage.id='k13-room-frame';
 const iframe=document.createElement('iframe');
 iframe.src='/ksh/fliskonkurrenten/showroom/?add=vedum&embedded=1#reisen';
 iframe.loading='lazy';
 iframe.title='Interaktivt Vedum Flow 3D-baderom – samme modell og materialer som hovedshowroom';
 iframe.setAttribute('allow','fullscreen');
 iframe.setAttribute('allowfullscreen','');
 stage.appendChild(iframe);
 box.insertBefore(stage,model);
 const note=document.createElement('p');note.className='k13-studio-note';
 note.innerHTML='Samme interaktive rom, lys og Turbine Grey som i det felles showroomet. Dra for å se materialene. <a href="/ksh/fliskonkurrenten/showroom/?add=vedum#reisen">Åpne rommet i egen fane ↗</a>';
 box.insertAdjacentElement('afterend',note);
 let selected='room';
 const buttons=Array.from(before.querySelectorAll('button'));
 function select(which){
  selected=which;
  const showRoom=which==='room';
  stage.hidden=!showRoom;
  stage.style.display=showRoom?'block':'none';
  model.style.display=showRoom?'none':'block';
  tools.style.display=showRoom?'none':'flex';
  buttons.forEach((b,i)=>{b.setAttribute('aria-selected',String((i===0)===showRoom));b.tabIndex=((i===0)===showRoom)?0:-1;});
  if(!showRoom && typeof model.updateFraming==='function')requestAnimationFrame(()=>model.updateFraming());
 }
 for(const b of buttons)b.addEventListener('click',()=>select(b.id==='k13-tab-room'?'room':'product'));
 before.addEventListener('keydown',ev=>{
  if(ev.key!=='ArrowLeft'&&ev.key!=='ArrowRight')return;
  ev.preventDefault();
  const next=selected==='room'?'product':'room';
  select(next);
  buttons[next==='room'?0:1].focus();
 });
 select('room');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();