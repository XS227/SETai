/* Fliskonkurrenten / SETAEI KSH category directory – all content from catalog.json */
(()=>{
 'use strict';
 const route='/ksh/fliskonkurrenten/kategorier/';
 const host=document.getElementById('k13-view');
 const safe=x=>String(x||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const encode=s=>encodeURIComponent(s);
 const image=s=>route+String(s||'assets/fliser-bad.webp');
 const menu=document.getElementById('k13-menu'),head=document.querySelector('.k13-head');
 menu?.addEventListener('click',()=>{
  const open=head.dataset.open!=='true';head.dataset.open=String(open);
  menu.setAttribute('aria-expanded',String(open));
  menu.setAttribute('aria-label',open?'Lukk hovedmeny':'Åpne hovedmeny');
 });
 head.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>{
  head.dataset.open='false';menu.setAttribute('aria-expanded','false');
 }));
 const featured={
  fliser:[{label:'Colorker Althea Sand Dekor',image:'/ksh/fliskonkurrenten/produkt/colorker-althea-sand-dekor/assets/hero.webp',url:'/ksh/fliskonkurrenten/produkt/colorker-althea-sand-dekor/'}],
  baderom:[{label:'Sanipro Sense · badekar',image:'/ksh/fliskonkurrenten/produkt/sanipro-sense/assets/sense-hero.webp',url:'/ksh/fliskonkurrenten/produkt/sanipro-sense/'},
    {label:'Vedum Flow · baderomsmøbel',image:'/ksh/fliskonkurrenten/produkt/vedum-flow-takegronn/assets/hero.webp',url:'/ksh/fliskonkurrenten/produkt/vedum-flow-takegronn/'}],
  spileplater:[{label:'Z-UP Eik Sort · 3D',image:'/ksh/fliskonkurrenten/produkt/zup-spilepanel-eik-sort/assets/zup-eik-sort-600066.jpg',url:'/ksh/fliskonkurrenten/produkt/zup-spilepanel-eik-sort/'}]
 };
 function card(c,index){
  return '<a class="k13-banner" href="'+route+'?kategori='+encode(c.slug)+'" aria-label="Se '+safe(c.label)+'"><div class="k13-photo">'+
  '<img src="'+image(c.image)+'" alt="Materialinspirasjon for '+safe(c.label)+'" loading="lazy" onerror="this.style.opacity=.25">'+
  '<span class="k13-count">'+('0'+(index+1)).slice(-2)+' / '+safe(c.label).toUpperCase()+'</span><strong>'+safe(c.label)+'</strong></div>'+
  '<div class="k13-banner-copy"><p>'+safe(c.desc)+'</p><span class="k13-circle" aria-hidden="true">↗</span></div></a>';
 }
 function all(data){
  const groups=data.groups;
  document.title='Alle kategorier og materialer · Fliskonkurrenten | SETAEI KSH';
  const nav='<nav class="k13-indexnav" aria-label="Hopp til kategori">'+groups.map(g=>'<a href="#gruppe-'+g.slug+'">'+safe(g.name)+'</a>').join('')+'</nav>';
  const sections=groups.map((g,i)=>{
   const n=('0'+(i+1)).slice(-2);
   return '<section class="k13-block" id="gruppe-'+g.slug+'"><div class="k13-wrap"><div class="k13-blockheading"><div><span class="k13-sectionnum">'+n+' / 09 · '+safe(g.tag)+'</span><h2>'+safe(g.name)+'</h2></div><p>'+safe(g.subtitle)+'. Utforsk underkategorier og materialer fra Fliskonkurrentens sortiment.</p></div><div class="k13-featured">'+g.categories.map(card).join('')+'</div>'+
     (g.slug==='fliser'?'<p class="k13-alt">Kjøkkenfliser er samlet i én tydelig kategori. Den nåværende nettbutikken har to overlappende oppføringer.</p>':'')+
   '</div></section>';
  }).join('');
  host.innerHTML=nav+'<div id="k13-groups">'+sections+'</div><section class="k13-ending"><p class="k13-eyebrow">DESIGNFORSLAG / DIGITALT PRODUKTSTUDIO</p><h2>Vil du se materialene<br><em>i et ekte rom?</em></h2><p>Opplev hvordan produkter kan vises, kombineres og beregnes i Fliskonkurrentens foreslåtte 3D-løsning.</p><a href="/ksh/fliskonkurrenten/showroom/">Åpne 3D-showroom ↗</a></section>';
  // Hash navigation must run after async catalog content is generated.
  if(location.hash)requestAnimationFrame(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView({block:'start'}));
 }
 function detail(data,slug){
  let group,category;
  for(const g of data.groups){
   const c=g.categories.find(c=>c.slug===slug);
   if(c){group=g;category=c;break;}
  }
  if(!group){all(data);return;}
  document.title=category.label+' · Fliskonkurrenten kategorier | SETAEI';
  const intro=document.querySelector('.k13-intro');
  if(intro)intro.hidden=true;
  const examples=(category.examples||[]).filter(Boolean);
  const demo=(featured[group.slug]||[]).map(x=>'<a href="'+x.url+'"><img src="'+x.image+'" alt="'+safe(x.label)+'" loading="lazy"><span>'+safe(x.label)+' · Utforsk i 3D ↗</span></a>').join('');
  host.innerHTML=
   '<div class="k13-detail"><section class="k13-detail-hero">'+
    '<img src="'+image(category.image)+'" alt="Kategori '+safe(category.label)+'" fetchpriority="high">'+
    '<div><a class="k13-return" href="'+route+'">← Til alle kategorier</a>'+
    '<p class="k13-eyebrow">'+safe(group.name.toUpperCase())+' / MATERIALER</p><h1>'+safe(category.label)+'</h1><p>'+safe(category.desc)+'.</p></div></section>'+
    '<div class="k13-detail-content"><div><p class="k13-eyebrow">01 / UTFORSK MATERIALET</p><h2>En hel verden<br><em>av detaljer.</em></h2><p>Dette er et skreddersydd forslag til hvordan kategorien kan presenteres med inspirasjon, underlag og materialfortelling. Pris og lagerstatus bekreftes hos Fliskonkurrenten.</p><div class="k13-detail-actions"><a href="/ksh/fliskonkurrenten/showroom/">Test 3D-showroom ↗</a><a href="/ksh/fliskonkurrenten/produkter/">Se produktstudiene ↗</a></div></div>'+
    '<div><p class="k13-eyebrow">02 / EKSEMPLER FRA SORTIMENTET</p><h2>Fra katalogen.</h2>'+
    (examples.length?'<ul class="k13-source-list">'+examples.map(x=>'<li>'+safe(x)+'</li>').join('')+'</ul>':'<p>Hele utvalget og aktuelle varer kan oppdateres når den nye nettbutikken kobles til et live produktlager.</p>')+
    '<p class="k13-photo-source">Bildet er hentet fra et offentlig produktfoto hos Fliskonkurrenten eller leverandør. Kategorioversikten er et ikke-indeksert designforslag – ikke en aktiv nettbutikk.</p></div></div></div>'+
    (demo?'<section class="k13-related"><div class="k13-related-wrap"><p class="k13-eyebrow">03 / PRODUKTOPPLEVELSER</p><h2>Se hvordan produkter<br><em>kan presenteres.</em></h2><div class="k13-related-list">'+demo+'</div></div></section>':'')+
    '<section class="k13-ending"><p class="k13-eyebrow">KSH / MER Å UTFORSKE</p><h2>Fra idé til<br><em>ferdig rom.</em></h2><a href="'+route+'">Tilbake til kategoriene ↗</a></section>';
  window.scrollTo(0,0);
 }
 fetch(route+'catalog.json?v=13',{cache:'no-store'}).then(r=>{
  if(!r.ok)throw Error('Kunne ikke laste kategorikatalogen');
  return r.json();
 }).then(data=>{
  const slug=new URLSearchParams(location.search).get('kategori');
  if(slug)detail(data,slug);else all(data);
 }).catch(e=>{
  host.innerHTML='<section class="k13-loading"><p>Kategoriene kunne ikke lastes inn.</p><a href="/ksh/fliskonkurrenten/">Tilbake til Fliskonkurrenten</a></section>';
  console.error('KSH category load:',e);
 });
})();
