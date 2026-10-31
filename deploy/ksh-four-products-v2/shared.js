/* Shared Fliskonkurrenten/SETAEI KSH shell and on-page 3D room preview.
   Never launches a camera: real spatial AR is disabled until device-tested. */
(()=>{
'use strict';
const root='/ksh/fliskonkurrenten/';
const logo=root+'assets/fliskonkurrenten-logo.png';
const products=[
 {slug:'sanipro-sense',category:'BADEKAR',name:'Sanipro Sense',subtitle:'Back-to-wall · hvit',price:'24 750',unit:'kr · veiledende demopris',photo:root+'produkt/sanipro-sense/assets/sense-hero.webp'},
 {slug:'vedum-flow-takegronn',category:'BADEROMSINNREDNING',name:'Vedum Flow',subtitle:'Tåkegrønn · Turbine Grey',price:'41 925',unit:'kr · oppgitt utførelse',photo:root+'produkt/vedum-flow-takegronn/assets/hero.webp'},
 {slug:'zup-spilepanel-eik-sort',category:'SPILEPLATER',name:'Z-UP Spilepanel',subtitle:'Eik sort · 2798 × 600 mm',price:'1 999',unit:'kr / panel',photo:root+'produkt/zup-spilepanel-eik-sort/assets/hero.webp'},
 {slug:'colorker-althea-sand-dekor',category:'FLISER',name:'Colorker Althea',subtitle:'Sand Dekor · 59,5 × 119,2 cm',price:'1 299',unit:'kr / m²',photo:root+'produkt/colorker-althea-sand-dekor/assets/hero.webp'}
];
function card(p){
 const safe=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 return '<a class="ksh2-product" href="'+root+'produkt/'+p.slug+'/" aria-label="Utforsk '+safe(p.name)+' i 3D">'+
 '<div class="ksh2-product-figure"><img loading="lazy" src="'+p.photo+'" alt="'+safe(p.name)+' – originalt produktfoto" onerror="this.style.opacity=.15"><span>'+safe(p.category)+'</span></div>'+
 '<div class="ksh2-product-content"><h3>'+safe(p.name)+'</h3><p>'+safe(p.subtitle)+'</p><div class="ksh2-price">'+p.price+' <small>'+safe(p.unit)+'</small></div><div class="ksh2-explore">Utforsk produktreisen og 3D ↗</div></div></a>';
}
function gallery({mini=false}={}){
 return '<section class="ksh2-products" id="ksh-four-products" aria-labelledby="ksh-four-title"><div class="ksh2-products-wrap"><p class="ksh2-products-kicker">SETAEI / KSH · DIGITALT PRODUKTSTUDIO</p><h2 id="ksh-four-title">Fire produkter.<br><em>Fire opplevelser.</em></h2><p class="ksh2-products-intro">Se hvordan Fliskonkurrentens eget sortiment kan presenteres med filmatisk scrolling, mål, materialer og ekte roterbare 3D-modeller. Designforslag — ikke en aktiv nettbutikk.</p><div class="ksh2-grid">'+products.map(card).join('')+'</div>'+(mini?'<a class="ksh2-all" href="'+root+'produkter/">Se alle fire produktstudier ↗</a>':'')+'</div></section>';
}
function head(){
 return '<header class="ksh2-head" id="ksh2-site-head" data-open="false"><a class="ksh2-logo" href="'+root+'" aria-label="Fliskonkurrenten – til forsiden"><img src="'+logo+'" alt="Fliskonkurrenten" width="174" height="56"></a>'+
 '<nav class="ksh2-nav" id="ksh2-menu" aria-label="Hovedmeny"><a href="'+root+'">Forside</a><a href="'+root+'produkter/">Produkter i 3D</a><a href="'+root+'#outlet">Outlet</a><a href="'+root+'#leverandorer">Leverandører</a><a href="'+root+'om-oss/">Om oss</a><a href="'+root+'kontakt/">Kontakt</a></nav>'+
 '<a class="ksh2-shop" href="'+root+'produkter/">UTFORSK PRODUKTER ↗</a><button class="ksh2-toggle" aria-controls="ksh2-menu" aria-expanded="false" aria-label="Åpne meny" type="button">☰</button></header>';
}
function foot(){
 return '<footer class="ksh2-foot" id="ksh2-site-foot"><div class="ksh2-foot-inner">'+
 '<div><a class="ksh2-logo" href="'+root+'"><img src="'+logo+'" width="174" height="56" alt="Fliskonkurrenten"></a><p>Fliser, naturstein og baderom. Materialer med karakter, mennesker med fagkunnskap.</p><p>Haakon VIIs gate 19, Lade · Trondheim</p><p><a href="tel:+4740691111">406 91 111</a><br><a href="mailto:post@fliskonkurrenten.no">post@fliskonkurrenten.no</a></p></div>'+
 '<div><h3>Utforsk</h3><div class="ksh2-list"><a href="'+root+'">Forsiden</a><a href="'+root+'produkter/">Fire produkter i 3D</a><a href="'+root+'#outlet">Outlet</a><a href="'+root+'#leverandorer">Våre leverandører</a><a href="'+root+'om-oss/">Om oss</a><a href="'+root+'kontakt/">Kontakt</a></div></div>'+
 '<div><h3>Følg oss</h3><div class="ksh2-list"><a href="https://www.instagram.com/fliskonkurrenten/" target="_blank" rel="noopener noreferrer">Instagram ↗</a><a href="https://www.facebook.com/Fliskonkurrenten" target="_blank" rel="noopener noreferrer">Facebook ↗</a><a href="https://www.tiktok.com/discover/fliskonkurrenten" target="_blank" rel="noopener noreferrer">TikTok ↗</a></div><p style="margin-top:24px">Alle 3D-modellene er illustrative konsepter, ikke fabrikkens CAD-modeller. Ingen betaling på denne forslagssiden.</p></div></div>'+
 '<div class="ksh2-foot-bottom"><span>© 2026 Fliskonkurrenten · Designforslag utviklet av SETAEI</span><span>Samme design · samme footer · alle produktsider</span></div></footer>';
}
function installChrome(){
 if(!document.getElementById('ksh2-site-head')){
  const old=document.querySelector('header:not(.ksh2-head)');
  if(old){old.insertAdjacentHTML('beforebegin',head());old.remove()}
  else document.body.insertAdjacentHTML('afterbegin',head());
 }
 if(!document.getElementById('ksh2-site-foot')){
  const old=document.querySelector('footer:not(.ksh2-foot)');
  if(old){old.insertAdjacentHTML('beforebegin',foot());old.remove()}
  else document.body.insertAdjacentHTML('beforeend',foot());
 }
 const h=document.getElementById('ksh2-site-head'),button=h?.querySelector('.ksh2-toggle');
 if(button&&!button.dataset.bound){button.dataset.bound='1';button.addEventListener('click',()=>{const open=h.dataset.open!=='true';h.dataset.open=open;button.setAttribute('aria-expanded',String(open));button.textContent=open?'×':'☰';});}
}
function installGallery(){
 const pathname=location.pathname.replace(/\/+$/,'/')||root;
 if(pathname===root || pathname===root+'index.html'){
  if(document.getElementById('ksh-four-products'))return;
  const main=document.querySelector('main');
  if(main)main.insertAdjacentHTML('beforeend',gallery({mini:true}));
  else document.getElementById('ksh2-site-foot')?.insertAdjacentHTML('beforebegin',gallery({mini:true}));
 }else if(pathname===root+'produkter/' || pathname===root+'produkter/index.html'){
  const mount=document.getElementById('ksh2-gallery');
  if(mount && !mount.dataset.filled){mount.innerHTML=gallery();mount.dataset.filled='1';}
 }
}
function installRoomPreview(){
 if(!location.pathname.includes('/produkt/'))return;
 const viewer=document.querySelector('model-viewer[src]');
 if(!viewer||viewer.dataset.kshRoomReady)return;
 viewer.dataset.kshRoomReady='1';
 viewer.removeAttribute('ar');viewer.removeAttribute('ar-modes');
 const old=viewer.querySelector('[slot="ar-button"]');
 if(old)old.remove();
 const modelURL=new URL(viewer.getAttribute('src'),location.href).href;
 const btn=document.createElement('button');
 btn.type='button';btn.className='ksh2-enter-room';
 btn.textContent='◇ Visualiser i et digitalt rom';
 const target=viewer.closest('.model-box, .viewer-wrap, .viewer-frame, .model-stage') || viewer.parentElement;
 target.append(btn);
 const box=document.createElement('dialog');
 box.className='ksh2-room';box.setAttribute('aria-label','Digital romvisualisering');box.dataset.tone='day';
 box.innerHTML='<div class="ksh2-roomscene"></div><div id="ksh2-room-model"></div>'+
 '<div class="ksh2-roomtoolbar"><strong>Romstudio · 360° 3D</strong><button type="button" class="ksh2-roomclose" aria-label="Lukk romvisualisering">×</button></div>'+
 '<div class="ksh2-roomfoot"><p>Digital romvisualisering, ikke kamera-AR. Dra for å rotere, knip for å zoome. Illustrativ størrelse og plassering.</p><div class="ksh2-roomtones"><button type="button" data-tone="day" aria-pressed="true">Dagslys</button><button type="button" data-tone="warm" aria-pressed="false">Varmt</button><button type="button" data-tone="night" aria-pressed="false">Mørkt</button></div></div>';
 const mv=document.createElement('model-viewer');
 mv.setAttribute('camera-controls','');mv.setAttribute('touch-action','pan-y');
 mv.setAttribute('auto-rotate','');mv.setAttribute('rotation-per-second','6deg');
 mv.setAttribute('environment-image','neutral');mv.setAttribute('shadow-intensity','1');
 mv.setAttribute('exposure','1.3');mv.setAttribute('alt','Roterbar 3D-modell vist i et digitalt rom');
 box.querySelector('#ksh2-room-model').append(mv);
 document.body.append(box);
 btn.addEventListener('click',()=>{mv.src=modelURL;box.showModal();document.body.style.overflow='hidden';});
 const close=()=>{box.close();document.body.style.overflow='';};
 box.querySelector('.ksh2-roomclose').addEventListener('click',close);
 box.addEventListener('click',ev=>{if(ev.target===box)close()});
 box.addEventListener('close',()=>{document.body.style.overflow='';mv.removeAttribute('src');});
 for(const b of box.querySelectorAll('[data-tone]'))b.addEventListener('click',()=>{box.dataset.tone=b.dataset.tone;box.querySelectorAll('[data-tone]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
}
let tries=0;
function init(){
 installChrome();installGallery();installRoomPreview();
 // Bounded late check for dynamic pages: never retry indefinitely if model-viewer fails.
 if(location.pathname.includes('/produkt/') && !document.querySelector('model-viewer[data-ksh-room-ready]') && ++tries<16)setTimeout(init,350);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();