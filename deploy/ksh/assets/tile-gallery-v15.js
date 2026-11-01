/* KSH Fliskonkurrenten: source-linked flis catalogue and contextual showroom CTA. */
(()=>{'use strict';
const ROOT='/ksh/fliskonkurrenten/',data=window.KSHTiles?.tiles||[];
const clean=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const groups=[['alle','Alle'],['fliser-bad','Bad'],['fliser-kjokken','Kjøkken'],['fliser-gang','Gang'],['fliser-marmorlook','Marmorlook'],['fliser-mosaikk','Mosaikk'],['fliser-terrazzo','Terrazzo'],['fliser-utendors','Utendørs']];
const tileHref=t=>ROOT+'flis/'+encodeURIComponent(t.id)+'/';
const roomHref=(t,s='wall')=>ROOT+'showroom/?tile='+encodeURIComponent(t.id)+'&surface='+s+'#reisen';
function card(t){
 return '<article class="tg15-card" data-group="'+clean(t.categorySlug)+'" data-name="'+clean(t.name.toLocaleLowerCase('nb'))+'">'+
 '<a class="tg15-image" href="'+tileHref(t)+'"><img loading="lazy" src="'+clean(t.photo)+'" alt="Produktbilde: '+clean(t.name)+'"></a>'+
 '<div class="tg15-content"><span>'+clean(t.category)+'</span><h3><a href="'+tileHref(t)+'">'+clean(t.name)+'</a></h3>'+
 '<div class="tg15-links"><a href="'+roomHref(t)+'">Prøv i rommet ↗</a><a href="'+tileHref(t)+'">Produktdetaljer</a></div></div></article>';
}
function renderFull(){
 const panel=document.querySelector('#tg15-gallery');if(!panel)return;
 panel.innerHTML='<header class="tg15-header"><span class="tg15-kicker">DIGITAL MATERIALVELGER / FLISKONKURRENTEN</span><h1>Velg flisen.<br><em>Finn helheten.</em></h1><p>Prøv fliser på vegg eller gulv i et interaktivt rom. Se fargeforslag, juster materialer og velg eventuelt tilleggsprodukter.</p></header>'+
 '<div class="tg15-toolbar"><label for="tg15-search">Søk etter flis</label><input id="tg15-search" type="search" placeholder="Produktnavn, farge eller merke …"><div class="tg15-filters">'+groups.map(([id,name])=>'<button type="button" data-filter="'+id+'" aria-pressed="'+(id==='alle')+'">'+name+'</button>').join('')+'</div></div>'+
 '<p class="tg15-results" id="tg15-results">'+data.length+' fliser med produktbilder</p><div class="tg15-grid">'+data.map(card).join('')+'</div>'+
 '<p class="tg15-disclaimer">Forhåndsvisningene er laget av utsnitt fra produktfoto, og er ikke kalibrerte 3D-skanninger. Mønster, farger og mål kan avvike fra fysiske fliser. Bekreft alltid vareinformasjon i den offisielle nettbutikken.</p>';
 let filter='alle',search='';
 const cards=[...panel.querySelectorAll('.tg15-card')],buttons=[...panel.querySelectorAll('[data-filter]')];
 function show(){let n=0;cards.forEach(c=>{const ok=(filter==='alle'||c.dataset.group===filter)&&c.dataset.name.includes(search);c.hidden=!ok;if(ok)n++});panel.querySelector('#tg15-results').textContent=n+' fliser med produktbilder';}
 panel.querySelector('#tg15-search').addEventListener('input',e=>{search=e.target.value.trim().toLocaleLowerCase('nb');show()});
 buttons.forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;buttons.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));show()}));
 const requested=new URLSearchParams(location.search).get('kategori');if(groups.some(x=>x[0]===requested)){panel.querySelector('[data-filter="'+requested+'"]')?.click();}
}
function renderCategory(){
 const slug=new URLSearchParams(location.search).get('kategori');
 if(!slug?.startsWith('fliser-'))return;
 const host=document.querySelector('#k13-view');if(!host)return;
 const update=()=>{
  if(!host.querySelector('.k13-detail')||host.querySelector('.tg15-category'))return;
  const items=data.filter(t=>t.categorySlug===slug);
  if(!items.length)return;
  const section=document.createElement('section');section.className='tg15-category';
  section.innerHTML='<div class="tg15-container"><div class="tg15-cathead"><div><span class="tg15-kicker">FLISER DU KAN PRØVE</span><h2>Se flisen på <em>vegg eller gulv.</em></h2></div><a href="'+ROOT+'fliser-i-rommet/?kategori='+encodeURIComponent(slug)+'">Se alle flisene ↗</a></div><div class="tg15-mini">'+items.slice(0,8).map(card).join('')+'</div></div>';
  host.append(section);
 };
 new MutationObserver(update).observe(host,{childList:true,subtree:false});update();
}
function renderHome(){
 const container=document.querySelector('#kategorier .wrap');
 if(!container||container.querySelector('.tg15-homecta'))return;
 const wrap=document.createElement('section');wrap.className='tg15-homecta';
 wrap.innerHTML='<span class="tg15-kicker">DIGITALT SHOWROOM / FLISER</span><h2>En flis. <em>Mange muligheter.</em></h2><p>Velg en flis fra '+data.length+' produktbilder, se hvordan den oppleves i et helt rom og få forslag til farger, gulv og innredning.</p><a href="'+ROOT+'fliser-i-rommet/">Prøv flisene i showroom ↗</a>';
 const explorer=container.querySelector('#ksh-home-explorer');if(explorer)container.insertBefore(wrap,explorer);else container.append(wrap);
}
if(!data.length)return;
renderFull();renderCategory();renderHome();
})();