(()=>{'use strict';
function init(){const hero=document.querySelector('.hero'),story=document.querySelector('#story'),stage=document.querySelector('.story-stage');if(!hero||!stage)return;
 const base='/ksh/fliskonkurrenten/assets/bathroom-v6/',reduced=matchMedia('(prefers-reduced-motion:reduce)').matches||navigator.connection?.saveData;
 const video=document.createElement('video');video.className='bath-film';video.muted=true;video.playsInline=true;video.preload=reduced?'none':'metadata';video.poster=base+'vedum-poster.jpg';video.setAttribute('aria-label','Vedum produktstudie · rolig kamerareise i et baderom');video.innerHTML='<source src="'+base+'vedum.webm" type="video/webm"><source src="'+base+'vedum.mp4" type="video/mp4">';hero.prepend(video);
 const button=document.createElement('button');button.className='bath-film-toggle';button.type='button';let paused=!!reduced;button.textContent=paused?'Spill film':'Pause film';hero.append(button);
 const shade=document.createElement('div');shade.className='bath-film-shade';hero.prepend(shade);
 let raf=0,active=false;function sync(){raf=0;const h=hero.getBoundingClientRect(),r=story.getBoundingClientRect();active=r.top<innerHeight&&r.bottom>0;const parent=active?stage:hero;
 if(video.parentElement!==parent)parent.prepend(video);if(button.parentElement!==parent)parent.append(button);
 if(paused){video.pause();return;}if(active){video.loop=false;video.pause();if(Number.isFinite(video.duration)&&video.duration>0&&!video.seeking){const t=Math.max(0,Math.min(1,-r.top/Math.max(1,r.height-innerHeight)));const next=t*Math.max(0,video.duration-.05);if(Math.abs(next-video.currentTime)>.07)video.currentTime=next;}}
 else if(h.bottom>0){video.loop=true;video.play().catch(()=>{});}else video.pause();}
 function schedule(){if(!raf)raf=requestAnimationFrame(sync);}button.onclick=()=>{paused=!paused;button.textContent=paused?'Spill film':'Pause film';schedule();};video.addEventListener('loadedmetadata',schedule);video.addEventListener('error',()=>{video.remove();button.remove();});addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();else schedule();});sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();})();
