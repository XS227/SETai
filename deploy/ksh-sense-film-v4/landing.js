(()=>{'use strict';
const video=document.querySelector('#sf-film'),track=document.querySelector('#filmreise'),hero=document.querySelector('.sf-hero-copy'),chapter=document.querySelector('.sf-film-chapter'),toggle=document.querySelector('#sf-film-toggle'),bar=document.querySelector('#sf-film-progress'),cue=document.querySelector('#sf-scroll-cue');
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),saveData=!!navigator.connection?.saveData;
let userPaused=reduced.matches||saveData,explicitPlay=false,scrollPhase=false,frame=0,targetTime=0,lastChapter=-1,available=true,playing=false,playPending=false;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const chapters=[['01 / FORM','La rommet<br><em>falle til ro.</em>','Sense følger veggen. Resten av rommet får puste.'],['02 / LYS','De små<br><em>øyeblikkene.</em>','Varmt dagslys. Myke skygger. Ro i detaljene.'],['03 / HELHET','En følelse.<br><em>Dine valg.</em>','Ta stemningen videre inn i 3D-rommet.']];
function label(){toggle.innerHTML=(userPaused?'▶ <span>Spill film</span>':'Ⅱ <span>Pause film</span>');toggle.setAttribute('aria-label',userPaused?'Spill film':'Pause film');}
async function play(){if(!available||userPaused||document.hidden||scrollPhase||playPending)return;playPending=true;try{await video.play();playing=true;}catch(error){if(error.name!=="AbortError"&&!scrollPhase&&!userPaused){userPaused=true;label();}}finally{playPending=false;}}
function seek(){if(!available||userPaused||video.seeking||video.readyState<2||!Number.isFinite(video.duration))return;if(Math.abs(video.currentTime-targetTime)>1/30){try{video.currentTime=targetTime;}catch{}}}
function update(){frame=0;const rect=track.getBoundingClientRect(),view=innerHeight,travel=Math.max(1,track.offsetHeight-view),offset=-rect.top,p=clamp(offset/travel),heroFade=clamp((p-.025)/.14);const nextPhase=p>.035&&offset<travel+view;
 if(nextPhase!==scrollPhase){scrollPhase=nextPhase;if(scrollPhase){video.pause();playing=false;video.loop=false;}else{video.loop=true;play();}}
 const quiet=(reduced.matches&&!explicitPlay)||saveData&&!explicitPlay;hero.style.opacity=String(quiet?1:1-heroFade);hero.style.transform=quiet?'none':`translateY(${-heroFade*35}px)`;hero.style.pointerEvents=heroFade>.95&&!quiet?'none':'auto';
 const chapterP=clamp((p-.15)/.80),idx=Math.min(2,Math.floor(chapterP*3));if(idx!==lastChapter){lastChapter=idx;document.querySelector('#sf-chapter-kicker').textContent=chapters[idx][0];document.querySelector('#sf-chapter-title').innerHTML=chapters[idx][1];document.querySelector('#sf-chapter-body').textContent=chapters[idx][2];}
 const alpha=quiet?0:clamp((p-.13)/.1);chapter.style.opacity=String(alpha);chapter.style.transform=`translateY(${(1-alpha)*18}px)`;bar.style.width=`${p*100}%`;cue.textContent=p>.07?'SCROLL FOR Å UTFORSKE ↓':'SCROLL FOR Å OPPLEVE ↓';
 if(scrollPhase&&!quiet){targetTime=clamp((p-.035)/.965)*Math.max(0,(video.duration||6.04)-.05);seek();}
 const roomRect=document.querySelector('#se3d').getBoundingClientRect(),contact=document.querySelector('#contact-sense').getBoundingClientRect();document.querySelector('.sf-mobile-cta').classList.toggle('is-visible',rect.bottom<view*.3&&roomRect.top>view*.7&&contact.top>view);
 if(rect.bottom<0||rect.top>view){video.pause();playing=false;}else if(!scrollPhase&&!userPaused&&!playing)play();
}
function schedule(){if(!frame)frame=requestAnimationFrame(update);}
video.muted=true;video.defaultMuted=true;video.playsInline=true;
if(userPaused){video.removeAttribute('autoplay');video.pause();}
label();toggle.onclick=()=>{userPaused=!userPaused;if(!userPaused)explicitPlay=true;label();if(userPaused){video.pause();playing=false;}else if(scrollPhase){seek();}else play();schedule();};
video.addEventListener('loadedmetadata',schedule);video.addEventListener('loadeddata',()=>{schedule();play();});video.addEventListener('seeked',()=>{if(scrollPhase&&!userPaused)seek();});video.addEventListener('error',()=>{available=false;video.hidden=true;toggle.hidden=true;document.querySelector('.sf-still-note').hidden=false;});
video.addEventListener('pause',()=>{playing=false;});video.addEventListener('playing',()=>{playing=true;});
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);document.addEventListener('visibilitychange',()=>{if(document.hidden){video.pause();playing=false;}else schedule();});reduced.addEventListener('change',()=>{if(reduced.matches){userPaused=true;explicitPlay=false;video.pause();label();}schedule();});
const menu=document.querySelector('.sf-menu'),mobile=document.querySelector('#sf-mobile-nav');menu.onclick=()=>{mobile.hidden=!mobile.hidden;menu.setAttribute('aria-expanded',String(!mobile.hidden));menu.textContent=mobile.hidden?'☰':'×';};mobile.querySelectorAll('a').forEach(a=>a.onclick=()=>{mobile.hidden=true;menu.setAttribute('aria-expanded','false');menu.textContent='☰';});document.addEventListener('keydown',e=>{if(e.key==='Escape'){mobile.hidden=true;menu.setAttribute('aria-expanded','false');}});
let loadedRoom=false;function loadRoom(){if(loadedRoom)return;loadedRoom=true;import('/ksh/fliskonkurrenten/assets/sense-film-v4/room.js?v=4').catch(()=>{document.querySelector('#sense-live-status').textContent='3D-rommet kunne ikke lastes. Kontakt oss for hjelp med produkt- og materialvalg.';});}
const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){loadRoom();observer.disconnect();}},{rootMargin:'400px'});observer.observe(document.querySelector('#se3d'));
schedule();play();
})();
