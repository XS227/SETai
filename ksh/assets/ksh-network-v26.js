/* KSH v26 — shared editorial project navigator enhancement.
   Keeps verified company URLs and mailto submission from the existing network module.
   Rebuilds cards as material-led stories without losing original route semantics. */
(()=>{
'use strict';
const images={
  'heimslig':{src:'/ksh/heimslig/assets/v6/textures/oak_veneer_03_diff_1k.jpg',text:'INNREDNING / ROM'},
  'heimdal-naturstein':{src:'/ksh/fliskonkurrenten/assets/tile-previews-v15/marmi-scala-nero-ebano-60x60-2cm.webp',text:'NATURSTEIN / MATERIALER'},
  'flyt-gulv':{src:'/ksh/heimslig/assets/v6/textures/concrete_floor_diff_1k.jpg',text:'UNDERLAG / GULV'},
  'fliskonkurrenten':{src:'/ksh/fliskonkurrenten/assets/ksh-hero-v5.jpg',text:'FLIS / BADEROM'}
};
function enhance(){
  const section=document.querySelector('.net21-guide');
  const result=document.querySelector('#net21-result');
  if(!section||!result)return;
  section.classList.add('net26-guide');
  result.classList.add('net26-result');
  result.querySelectorAll('.net21-card').forEach((card,index)=>{
    if(card.querySelector('.net26-media'))return;
    const href=card.querySelector('a[href^="/ksh/"]')?.getAttribute('href')||'';
    const slug=href.split('/')[2]||'';
    const media=images[slug];
    if(!media)return;
    const div=document.createElement('div');
    div.className='net26-media';
    div.innerHTML='<img src="'+media.src+'" alt="" loading="lazy" decoding="async"><span>'+String(index+1).padStart(2,'0')+' / '+media.text+'</span>';
    card.prepend(div);
  });
  const form=result.querySelector('form.net21-brief');
  if(form&&!form.closest('details')){
    const details=document.createElement('details');
    details.className='net26-brief-details';
    const summary=document.createElement('summary');
    summary.innerHTML='<span><strong>Fortell oss om prosjektet</strong><small>Valgfritt · send en uforpliktende forespørsel selv</small></span><b aria-hidden="true">＋</b>';
    form.before(details);
    details.append(summary,form);
  }
}
function start(){
 const root=document.getElementById('net21-result');
 if(!root)return;
 enhance();
 const observer=new MutationObserver(()=>enhance());
 observer.observe(root,{childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();