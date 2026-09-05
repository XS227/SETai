(() => {
'use strict';
const root=document.documentElement;
const journey=document.getElementById('journey');
const scenes=[...document.querySelectorAll('.scene')];
const chapters=[...document.querySelectorAll('.chapter-nav a')];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const film=document.getElementById('world-film');
const filmButton=document.getElementById('film-toggle');
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
let frame=0,current=0,motion=false,userPaused=false,language='no';
const translations=[...document.querySelectorAll('[data-en]')].map(el=>({el,no:el.innerHTML,en:el.dataset.en}));
function filmLabel(){filmButton.textContent=film.paused?(language==='en'?'Play film':'Spill film'):(language==='en'?'Pause film':'Pause film')}
function loadFilm(){const source=film.querySelector('source');if(!source.src){source.src=source.dataset.src;film.load()}}
function playFilm(){loadFilm();film.play().then(filmLabel).catch(filmLabel)}
filmButton.addEventListener('click',()=>{if(film.paused){userPaused=false;playFilm()}else{userPaused=true;film.pause();filmLabel()}});
film.addEventListener('pause',filmLabel);film.addEventListener('play',filmLabel);
const filmSceneIndex=scenes.findIndex(s=>s.contains(film));
function update(){
 frame=0;
 const last=scenes.length-1;
 const span=Math.max(1,journey.offsetHeight-innerHeight);
 const progress=clamp((scrollY-journey.offsetTop)/span)*last;
 const active=motion?Math.min(last,Math.floor(progress+.12)):scenes.reduce((a,s,i)=>s.getBoundingClientRect().top<innerHeight*.5?i:a,0);
 current=active;
 scenes.forEach((scene,i)=>{
  if(!motion)return;
  const local=progress-i;
  const enter=i===0?1:smooth((local+.35)/.35);
  const leave=i===last?1:1-smooth((local-.65)/.35);
  const alpha=enter*leave;
  scene.style.opacity=alpha;
  scene.classList.toggle('is-visible',alpha>.001);
  scene.classList.toggle('is-active',i===active);
  scene.inert=i!==active;
  scene.setAttribute('aria-hidden',String(i!==active));
  const t=clamp(local);
  const fx=scene.dataset.fx;
  if(fx){
   const target=fx==='browserZoom'?scene.querySelector('.browser-surface'):scene.querySelector('.visual');
   if(target){
    if(fx==='zoomSlow')target.style.transform=`scale(${1+t*.65})`;
    else if(fx==='zoomStrong')target.style.transform=`scale(${1+smooth((t-.1)/.9)*4.2})`;
    else if(fx==='zoomTiny')target.style.transform=`scale(${1+t*.12})`;
    else if(fx==='browserZoom')target.style.transform=`scale(${.86+smooth(t)*.95})`;
   }
  }
  const copy=scene.querySelector('.scene-copy');
  if(copy){copy.style.opacity=i===last?1:1-smooth((t-.35)/.4);copy.style.transform=`translateY(${-t*28}px)`;}
 });
 chapters.forEach((a,i)=>a.setAttribute('aria-current',String(i===active)));
 document.getElementById('chapter-label').textContent=`0${active+1} / ${scenes[active].dataset.chapter}`;
 if(active===filmSceneIndex&&!document.hidden&&!reduced.matches&&!userPaused&&!navigator.connection?.saveData){if(film.paused)playFilm()}else if(!film.paused){film.pause()}
}
function requestUpdate(){if(!frame)frame=requestAnimationFrame(update)}
function configure(){
 // At zoomed text sizes / short landscape heights, retain normal readable flow.
 motion=!reduced.matches&&innerHeight>=560&&innerWidth>=320;
 root.classList.toggle('journey-motion',motion);
 scenes.forEach(s=>{s.inert=false;s.removeAttribute('aria-hidden');s.style.opacity='';s.classList.remove('is-active','is-visible');const c=s.querySelector('.scene-copy');if(c){c.style.opacity='';c.style.transform=''};const v=s.querySelector('.visual');if(v)v.style.transform='';const b=s.querySelector('.browser-surface');if(b)b.style.transform=''});
 update();
}
function goTo(index){
 const last=scenes.length-1;
 index=clamp(index,0,last);
 if(motion){const span=journey.offsetHeight-innerHeight;scrollTo({top:journey.offsetTop+span*index/last,behavior:reduced.matches?'auto':'smooth'})}
 else scenes[index].scrollIntoView({behavior:reduced.matches?'auto':'smooth'});
}
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const index=scenes.findIndex(s=>'#'+s.id===a.getAttribute('href'));if(index<0)return;e.preventDefault();history.replaceState(null,'','#'+scenes[index].id);goTo(index)}));
document.getElementById('next-scene').addEventListener('click',()=>goTo(current===scenes.length-1?0:current+1));
window.addEventListener('scroll',requestUpdate,{passive:true});
let resizeTimer;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(configure,120)},{passive:true});
reduced.addEventListener('change',configure);
document.addEventListener('visibilitychange',requestUpdate);
configure();
const initial=scenes.findIndex(s=>'#'+s.id===location.hash);if(initial>=0)goTo(initial);
function setLanguage(lang){language=lang;root.lang=lang==='en'?'en':'no';translations.forEach(t=>t.el.innerHTML=t[lang]);document.getElementById('language').textContent=lang==='en'?'NO':'EN';filmLabel();try{localStorage.setItem('setaei-lang',lang)}catch{}}
document.getElementById('language').addEventListener('click',()=>setLanguage(language==='no'?'en':'no'));
try{const saved=localStorage.getItem('setaei-lang');const wantEn=saved?saved==='en':location.pathname.startsWith('/en/');if(wantEn)setLanguage('en')}catch{}
  // ── contact modal ──────────────────────────────────────────
  const contactOverlay = document.getElementById('contactOverlay');
  const contactSheet   = document.getElementById('contactSheet');
  const contactForm    = document.getElementById('contactForm');
  const contactStatus  = document.getElementById('contactStatus');
  const contactSubmit  = document.getElementById('contactSubmit');
  const contactSuccess = document.getElementById('contactSuccess');

  function openContact() {
    contactOverlay.classList.add('open');
    contactSheet.classList.add('open');
    contactOverlay.setAttribute('aria-hidden', 'false');
    contactSheet.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => { const f = document.getElementById('cf-name'); if (f) f.focus(); }, 350);
  }
  function closeContact() {
    contactOverlay.classList.remove('open');
    contactSheet.classList.remove('open');
    contactOverlay.setAttribute('aria-hidden', 'true');
    contactSheet.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // Reset back to the form for next time, after the close transition ends —
    // avoids a visible flash of the form underneath the success state.
    setTimeout(() => {
      if (!contactSheet.classList.contains('open')) showContactForm();
    }, 400);
  }
  function showContactSuccess() {
    contactForm.hidden = true;
    contactSuccess.hidden = false;
    const closeBtn = document.getElementById('contactSuccessClose');
    if (closeBtn) closeBtn.focus();
  }
  function showContactForm() {
    contactSuccess.hidden = true;
    contactForm.hidden = false;
    contactForm.reset();
    contactForm.querySelectorAll('input, textarea, button').forEach(el => el.disabled = false);
    setContactStatus('', '');
  }
  document.getElementById('contactSuccessClose').addEventListener('click', closeContact);
  document.querySelectorAll('.js-open-contact').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();

      openContact();
    });
  });
  document.getElementById('contactClose').addEventListener('click', closeContact);
  contactOverlay.addEventListener('click', closeContact);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && contactSheet.classList.contains('open')) closeContact();
  });

  function setContactStatus(msg, kind) {
    contactStatus.textContent = msg;
    contactStatus.className = 'status ' + (kind || '');
  }

  contactForm.addEventListener('submit', async e => {
    e.preventDefault();
    const lang = document.documentElement.lang === 'en' ? 'en' : 'no';
    setContactStatus(lang === 'en' ? 'Sending…' : 'Sender…', '');
    contactSubmit.disabled = true;
    const fd = new FormData(contactForm);
    const payload = {
      name:    (fd.get('name')    || '').toString().trim(),
      company: (fd.get('company') || '').toString().trim(),
      email:   (fd.get('email')   || '').toString().trim(),
      phone:   (fd.get('phone')   || '').toString().trim(),
      message: (fd.get('message') || '').toString().trim(),
      source:  (fd.get('source')  || 'homepage').toString().trim(),
      website: (fd.get('website') || '').toString().trim()
    };
    try {
      const r = await fetch('/api/homepage-contact.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const d = await r.json().catch(() => ({}));
      if (d.ok) {
        showContactSuccess();
      } else {
        setContactStatus(d.error || (lang === 'en' ? 'Could not send the message. Please email khabat@setai.no directly.' : 'Klarte ikke å sende meldingen. Send gjerne en e-post til khabat@setai.no i mellomtiden.'), 'err');
        contactSubmit.disabled = false;
      }
    } catch (err) {
      setContactStatus(lang === 'en' ? 'Network error. Please try again, or email khabat@setai.no directly.' : 'Nettverksfeil. Prøv igjen, eller send en e-post til khabat@setai.no i mellomtiden.', 'err');
      contactSubmit.disabled = false;
    }
  });

// Restore focus and keep keyboard navigation within the contact dialog.
let returnFocus;
document.querySelectorAll('.js-open-contact').forEach(el=>el.addEventListener('click',()=>{returnFocus=el}));
contactSheet.addEventListener('keydown',e=>{
 if(e.key!=='Tab')return;
 const items=[...contactSheet.querySelectorAll('button,input,textarea,a[href]')].filter(el=>!el.disabled&&el.getClientRects().length);
 const first=items[0],last=items[items.length-1];
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});
const closeWatch=new MutationObserver(()=>{if(!contactSheet.classList.contains('open'))returnFocus?.focus()});
closeWatch.observe(contactSheet,{attributes:true,attributeFilter:['class']});
})();
