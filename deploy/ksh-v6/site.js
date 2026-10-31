(function(){'use strict';
 function start(){
  if(!location.pathname.startsWith('/ksh/heimslig/'))return;
  document.querySelectorAll('[class*="breadcrumb"],[class*="crumb"]').forEach(n=>n.hidden=true);
  const nav=document.querySelector('header nav');if(nav&&!nav.querySelector('[data-k6-nav]')){const a=document.createElement('a');a.dataset.k6Nav='';a.href='/ksh/heimslig/social/';a.textContent='Fra Instagram';nav.append(a);}
  if(!/\/produkt(?:er)?\//.test(location.pathname))return;
  if(document.getElementById('heimslig-kalkulator'))return;
  const section=document.createElement('section');section.className='h5-bridge';section.id='heimslig-kalkulator';section.innerHTML='<div><h2>Se rommet. Beregn budsjettet.</h2><p>Samle møbler, materialer og mål i romstudioet.</p></div><a href="/ksh/heimslig/3d-studio/#heimslig-kalkulator">Åpne rom og pris ↗</a>';
  const hero=document.querySelector('h1')?.closest('section,article');if(hero)hero.after(section);else(document.querySelector('main')||document.querySelector('header'))?.after(section);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
