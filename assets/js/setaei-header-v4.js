(()=>{document.querySelectorAll('header.site-nav').forEach(h=>{const nav=h.querySelector('.nav-actions');if(!nav)return;
let lang=nav.querySelector('.lang-switch')||h.querySelector(':scope > .lang-switch');
if(!lang){lang=document.createElement('div');lang.className='lang-switch';lang.setAttribute('role','group');lang.setAttribute('aria-label','Language');lang.innerHTML='<button type="button" data-lang="no">NO</button><button type="button" data-lang="en">EN</button><button type="button" data-lang="fa">فا</button>';}
if(lang.parentElement!==h) h.appendChild(lang);
let b=h.querySelector('.brand-menu-toggle');if(!b){b=document.createElement('button');b.className='brand-menu-toggle';b.type='button';h.appendChild(b);}
b.setAttribute('aria-label','Åpne meny');b.setAttribute('aria-expanded','false');b.innerHTML='<svg viewBox="0 0 24 18" aria-hidden="true"><line x1="1.5" y1="2" x2="22.5" y2="2"/><line x1="1.5" y1="9" x2="19" y2="9"/><line x1="1.5" y1="16" x2="22.5" y2="16"/></svg>';
const close=()=>{h.classList.remove('menu-open');b.setAttribute('aria-expanded','false');b.setAttribute('aria-label','Åpne meny');};
b.onclick=()=>{const open=!h.classList.contains('menu-open');h.classList.toggle('menu-open',open);b.setAttribute('aria-expanded',String(open));b.setAttribute('aria-label',open?'Lukk meny':'Åpne meny');};
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
});})();