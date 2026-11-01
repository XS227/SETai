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
 '<nav class="ksh2-nav" id="ksh2-menu" aria-label="Hovedmeny"><a href="'+root+'">Forside</a><a href="'+root+'produkter/">Produkter i 3D</a><a href="'+root+'showroom/">Baderom</a><a href="'+root+'#outlet">Outlet</a><a href="'+root+'#leverandorer">Leverandører</a><a href="'+root+'om-oss/">Om oss</a><a href="'+root+'kontakt/">Kontakt</a></nav>'+
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
 if(!document.querySelector('.k6-footer')&&!document.getElementById('ksh2-site-foot')){
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
 const slug=location.pathname.split('/produkt/')[1]?.split('/')[0];
 const key={'sanipro-sense':'sense','vedum-flow-takegronn':'vedum','zup-spilepanel-eik-sort':'zup','colorker-althea-sand-dekor':'althea'}[slug];
 const viewer=document.querySelector('model-viewer[src]');
 if(viewer){viewer.removeAttribute('ar');viewer.removeAttribute('ar-modes');viewer.dataset.kshRoomReady='1';
  if(key!=='sense'&&!viewer.getAttribute('src').includes('model-yup-v6'))viewer.src=root+'produkt/'+slug+'/assets/model-yup-v6.glb';
 }
 if(!key||document.querySelector('.ksh6-shared-room'))return;
 const target=viewer?.closest('.model-box, .viewer-wrap, .viewer-frame, .model-stage')||document.querySelector('#se3d');
 if(!target)return;
 const link=document.createElement('a');link.className='ksh6-shared-room';link.href=root+'showroom/?add='+key;
 link.textContent='＋ Prøv i felles baderom';link.style.cssText='display:inline-flex;align-items:center;gap:8px;margin:16px;padding:12px 18px;border:1px solid currentColor;border-radius:30px;color:inherit;text-decoration:none;font:14px Arial,sans-serif;min-height:44px;box-sizing:border-box';target.append(link);
}

let tries=0;
function init(){
 installChrome();installGallery();installRoomPreview();
 // Bounded late check for dynamic pages: never retry indefinitely if model-viewer fails.
 if(location.pathname.includes('/produkt/') && !document.querySelector('model-viewer[data-ksh-room-ready]') && ++tries<16)setTimeout(init,350);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();