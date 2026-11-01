(()=>{'use strict';
function init(){
 const hero=document.querySelector('.hero'),story=document.querySelector('#story'),stage=story?.querySelector('.story-stage');
 if(!hero||!story||!stage||document.querySelector('.vf7-track'))return;
 const base='/ksh/fliskonkurrenten/assets/vedum-film-v7/';
 const track=document.createElement('div');track.className='vf7-track vf7-ready';hero.before(track);
 const visual=document.createElement('div');visual.className='vf7-visual';visual.innerHTML='<video class="vf7-film" autoplay muted loop playsinline preload="auto" poster="'+base+'poster.jpg" aria-label="Vedum Flow i et baderom, med en rolig kamerabevegelse"><source src="'+base+'vedum.webm" type="video/webm"><source src="'+base+'vedum.mp4" type="video/mp4"></video><div class="vf7-shade"></div><div class="vf7-progress" aria-hidden="true"><span></span></div>';
 track.append(visual,hero,story);
 const video=visual.querySelector('video'),progress=visual.querySelector('.vf7-progress span');video.muted=true;video.playsInline=true;
 const button=document.createElement('button');button.className='vf7-toggle';button.type='button';hero.append(button);
 let paused=matchMedia('(prefers-reduced-motion:reduce)').matches||!!navigator.connection?.saveData,frame=0,failed=false;
 function label(){button.setAttribute('aria-label',paused?'Spill film':'Pause film');button.setAttribute('aria-pressed',String(paused));button.innerHTML=paused?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>';button.title=paused?'Spill film':'Pause film';}
 function sync(){frame=0;if(failed)return;
  const r=story.getBoundingClientRect(),h=hero.getBoundingClientRect(),inStory=r.top<=0&&r.bottom>0;
  const t=Math.max(0,Math.min(1,-r.top/Math.max(1,r.height-innerHeight)));
  const controlsParent=inStory?stage:hero;if(button.parentElement!==controlsParent)controlsParent.append(button);
  progress.style.transform='scaleX('+t+')';
  if(paused||document.hidden){video.pause();return;}
  if(inStory){video.pause();video.loop=false;
   if(video.readyState>=1&&Number.isFinite(video.duration)&&!video.seeking){const target=t*Math.max(0,video.duration-1/24);if(Math.abs(video.currentTime-target)>.045)video.currentTime=target;}
  }else if(h.bottom>0&&h.top<innerHeight){video.loop=true;if(video.paused)video.play().catch(e=>{if(e.name==='NotAllowedError'){paused=true;label();}});}
  else video.pause();
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(sync);}
 button.onclick=()=>{paused=!paused;label();schedule();};
 video.addEventListener('loadedmetadata',schedule);video.addEventListener('seeked',schedule);video.addEventListener('error',()=>{failed=true;track.classList.remove('vf7-ready');visual.hidden=true;button.remove();});
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);document.addEventListener('visibilitychange',schedule);
 label();if(paused)video.pause();schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
