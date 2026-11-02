/* KSH shared fullscreen affordance for legacy Heimdal 3D viewer.
   Reuses original working rotation and four camera preset controls. */
(()=>{
'use strict';
function init(){
  const shell=document.querySelector('#atelier.studio-shell');
  const viewer=shell?.querySelector('#stoneViewer');
  if(!viewer||viewer.querySelector('[data-ksh-fullscreen]'))return;
  const tools=viewer.querySelector('.viewer-controls')||viewer;
  const btn=document.createElement('button');
  btn.type='button';btn.className='viewer-btn ksh29-fullscreen';btn.dataset.kshFullscreen='true';
  btn.setAttribute('aria-label','Vis 3D-studio i fullskjerm');
  btn.setAttribute('aria-pressed','false');btn.textContent='⤢ Fullskjerm';
  tools.append(btn);
  function state(){
    const on=document.fullscreenElement===shell||shell.classList.contains('ksh29-expanded');
    btn.setAttribute('aria-pressed',String(on));
    btn.textContent=on?'⤡ Avslutt fullskjerm':'⤢ Fullskjerm';
  }
  btn.addEventListener('click',async()=>{
    try {
      if(document.fullscreenElement===shell){await document.exitFullscreen();}
      else if(document.fullscreenEnabled&&shell.requestFullscreen){await shell.requestFullscreen();}
      else shell.classList.toggle('ksh29-expanded');
    } catch {shell.classList.toggle('ksh29-expanded');}
    state();
  });
  document.addEventListener('fullscreenchange',state);
  shell.addEventListener('keydown',e=>{if(e.key==='Escape'&&shell.classList.contains('ksh29-expanded')){shell.classList.remove('ksh29-expanded');state();}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();