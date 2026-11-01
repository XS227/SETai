#!/usr/bin/env python3
"""KSH suppliers: official 18-logo directory and contextual partners, category CTA relevance."""
from pathlib import Path
from datetime import datetime, timezone
import json
import re
import shutil
import urllib.request

BASE=Path('/var/www/setai/ksh/fliskonkurrenten')
ASSETS=BASE/'assets'
DIR=BASE/'leverandorer'
LOGOS=ASSETS/'vendor-logos-v1'
LOGOS.mkdir(parents=True,exist_ok=True)
DIR.mkdir(parents=True,exist_ok=True)
now=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')

# Every first-party logo below is copied from Fliskonkurrenten's own public
# /leverandorer/ gallery; original external supplier links retained.
rows=[
 ('casalgrande','Casalgrande Padana','fliser','flis,fliser,overflater','https://www.casalgrandepadana.com/en/','2023/12/ViewImage-18.webp'),
 ('rondine','Ceramica Rondine','fliser','flis,fliser,overflater','https://www.ceramicarondine.it/en/','2023/12/ViewImage-12.webp'),
 ('panaria','Panaria Ceramica','fliser','flis,fliser,overflater','https://www.panaria.net/','2023/12/ViewImage-15.webp'),
 ('marmi-scala','Marmi Scala','fliser','flis,fliser,marmor,overflater','https://www.marmiscala.com/en/home.html','2023/12/ViewImage-4.webp'),
 ('dekora','Dekora','fliser','flis,fliser,overflater','https://dekora.se/produkter/','2023/12/ViewImage-6.webp'),
 ('vedum','Vedum','bad','bad,innredning,vaskerom','https://www.vedum.no/','2023/12/ViewImage-19.webp'),
 ('inr','INR','bad','bad,dusj,innredning','https://www.inr.no/','2023/12/ViewImage-9.webp'),
 ('sanipro','Sanipro','bad','bad,dusj,innredning','https://www.sanipro.no/','2023/12/ViewImage-7.webp'),
 ('axor','AXOR','bad','bad,armatur','https://www.axor-design.com/int/','2023/12/ViewImage-1.webp'),
 ('hansgrohe','Hansgrohe','bad','bad,dusj,armatur','https://www.hansgrohe.no/','2023/12/ViewImage-10.webp'),
 ('mapei','Mapei','teknisk','teknisk,støp,avretting,lim,membran,fug','https://www.mapei.com/no/no/hjemmeside','2023/12/ViewImage-13.webp'),
 ('nordic-tools','Nordic Tools','teknisk','teknisk,verktøy,flis','https://www.nordictools.no/','2024/11/0013202_nordic_tools_spesialverktoy.webp'),
 ('bosch','Bosch','teknisk','teknisk,verktøy','https://www.bosch.no/','2023/12/ViewImage-14.webp'),
 ('heydi','Hey’di','teknisk','teknisk,støp,avretting,lim,membran,fug','https://www.heydi.no/','2023/12/ViewImage-17.webp'),
 ('duri','Duri Fagprofil','teknisk','teknisk,støp,avretting,verktøy,flis','https://duri.no/','2024/01/duri-400x400-1.png'),
 ('wedi','Wedi','teknisk','teknisk,bad,membran,støp','https://www.wedi.net/en/','2023/12/ViewImage-2.webp'),
 ('jackon','Jackon','teknisk','teknisk,støp,avretting,bygg','https://www.jackon.no/','2023/12/ViewImage-3.webp'),
 ('caparol','Caparol','teknisk','teknisk,maling,overflater','https://www.caparol.se/','2023/12/ViewImage-5.webp'),
]
vendors=[]
for slug,name,group,tags,external,source in rows:
    fname=slug+'.'+source.rsplit('.',1)[-1]
    uri='https://fliskonkurrenten.no/wp-content/uploads/'+source
    out=LOGOS/fname
    if not out.exists() or out.stat().st_size<1000:
        req=urllib.request.Request(uri,headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req,timeout=23) as r:
            raw=r.read();kind=r.headers.get('content-type','')
        if len(raw)<1000 or not kind.startswith('image/'):raise RuntimeError('Missing authentic logo '+name+' '+kind)
        out.write_bytes(raw)
    out.chmod(0o644)
    vendors.append({'id':slug,'name':name,'group':group,'tags':tags.split(','),
                    'url':external,'logo':'/ksh/fliskonkurrenten/assets/vendor-logos-v1/'+fname,'verified':'official-gallery'})
# The three featured brands are already used in the SETAEI demo. Keep this
# presentation distinction from the official 18-brand source list.
for slug,name,group,tags,external,logofile,photo in [
 ('cosentino','Cosentino','stein','stein,benkeplater,overflater,dekton,silestone','https://www.cosentino.com/','logo-cosentino.png','cosentino.jpg'),
 ('minera','Minera Skifer','stein','stein,naturstein,skifer','https://mineraskifer.no/','logo-minera.svg','minera.jpg'),
 ('korsbakken','Korsbakken Bad','bad','bad,armatur,innredning','https://www.korsbakken.no/','logo-korsbakken.png','korsbakken.webp')
]:
    vendors.append({'id':slug,'name':name,'group':group,'tags':tags.split(','),
                    'url':external,'logo':'/ksh/fliskonkurrenten/assets/suppliers-v4/'+logofile,
                    'image':'/ksh/fliskonkurrenten/assets/suppliers-v4/'+photo,
                    'verified':'featured-demo'})
assert len(vendors)==21 and sum(v['verified']=='official-gallery' for v in vendors)==18
catalog={'vendors':vendors,'counts':{'official':18,'featured':3},
         'partners':[{'name':'Heimdal Naturstein','url':'/ksh/heimdal-naturstein/','logo':'/ksh/assets/ksh-v6/assets/heimdal-logo.png'},
                     {'name':'Flyt-Gulv','url':'/ksh/flyt-gulv/','logo':'/ksh/assets/ksh-v6/assets/flyt-logo.png'}]}
(ASSETS/'vendor-catalog-v1.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
(ASSETS/'vendor-catalog-v1.json').chmod(0o644)

css=r"""
/* KSH SUPPLIER CATALOG v1 - current 18 official gallery brands, + 3 demo-featured */
.kv-page{background:#f3f0ea;color:#242724;min-height:70svh;font-family:'DM Sans',Manrope,Arial,sans-serif}
.kv-wrap{width:min(1180px,calc(100% - 44px));margin-inline:auto}
.kv-hero{background:#222a27;color:#fff;padding:100px 0 78px;position:relative;isolation:isolate;overflow:hidden}
.kv-hero:after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 84% 40%,#47584b 0%,transparent 52%),repeating-linear-gradient(110deg,transparent 0 28px,#ffffff08 28px 29px);z-index:-1}
.kv-eyebrow{font:700 11px/1.4 'DM Sans',Arial,sans-serif;letter-spacing:.19em;text-transform:uppercase;color:#b19a81}
.kv-hero h1{font-size:clamp(45px,7vw,98px);line-height:1.03;letter-spacing:-.07em;font-weight:500;margin:24px 0}
.kv-hero h1 em{font-family:Georgia,serif;font-weight:400}
.kv-hero p{font:400 16px/1.65 'DM Sans',Arial,sans-serif;max-width:620px;color:#e4e5e1}
.kv-hero a{display:inline-flex;margin-top:20px;color:#fff;border-bottom:1px solid #cac6bc;padding:8px 0;font-size:13px}
.kv-main{padding:54px 0 88px}
.kv-sub{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:22px}
.kv-sub h2{margin:9px 0;font-size:clamp(27px,4vw,42px);letter-spacing:-.05em;line-height:1.15;font-weight:600}
.kv-count{font-size:12px;color:#737c72}
.kv-controls{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:27px}
.kv-filter{appearance:none;cursor:pointer;background:transparent;border:1px solid #b6b7af;border-radius:50px;min-height:42px;padding:10px 17px;font:600 12px/1.3 'DM Sans',Arial,sans-serif;color:#323831}
.kv-filter[aria-pressed=true]{background:#27352d;border-color:#27352d;color:#fff}
.kv-filter:focus-visible,.kv-card:focus-visible{outline:3px solid #bc9071;outline-offset:2px}
.kv-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.kv-card{position:relative;display:flex;flex-direction:column;min-width:0;color:inherit;text-decoration:none;border:1px solid #dedcd5;background:#fff;transition:transform .2s,border-color .2s;overflow:hidden}
.kv-card:hover{transform:translateY(-4px);border-color:#778579}
.kv-card[hidden]{display:none!important}
.kv-card-visual{height:165px;padding:24px;display:grid;place-items:center;background:#fff}
.kv-card-visual img{display:block;max-width:100%;max-height:105px;width:auto;height:auto;object-fit:contain}
.kv-card[data-id="minera"] .kv-card-visual img{max-height:85px}
.kv-card-footer{padding:15px 18px 17px;border-top:1px solid #f0eee9;display:flex;justify-content:space-between;align-items:center;gap:10px;font:600 12px/1.4 'DM Sans',Arial,sans-serif}
.kv-card-footer span:last-child{font-size:22px;font-weight:400}
.kv-secondary{margin-top:34px;padding:22px 26px;background:#e5e2da;border:1px solid #d6d3c9;font-size:12px;line-height:1.6;color:#606761}
.kv-secondary strong{display:block;margin-bottom:6px;color:#27352d;font-size:14px}
.kv-partners{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:15px}
.kv-partners a{display:flex;align-items:center;justify-content:center;padding:12px;background:#28362f;min-width:140px;min-height:65px;color:#fff;font-weight:600}
.kv-partners img{max-width:145px;max-height:45px;object-fit:contain}
.kv-related{background:#f3f0ea;padding:45px max(22px,calc((100% - 1180px)/2));border-top:1px solid #e0dcd1;font-family:'DM Sans',Arial,sans-serif;color:#262b26;clear:both}
.kv-related header{display:flex;align-items:end;justify-content:space-between;gap:15px;margin-bottom:24px}
.kv-related h2{font:600 clamp(25px,3vw,36px)/1.12 Manrope,Arial,sans-serif;letter-spacing:-.045em;margin:7px 0}
.kv-related .kv-all{font-size:12px;font-weight:700;color:#3b5044;white-space:nowrap;text-decoration:underline;text-underline-offset:4px}
.kv-related-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px}
.kv-related-logo{display:flex;align-items:center;justify-content:center;background:#fff;min-width:0;min-height:94px;padding:15px 10px;border:1px solid #e3e1d9}
.kv-related-logo img{max-width:100%;max-height:65px;object-fit:contain}
.kv-related-logo:hover{border-color:#758878}
.kv-related .kv-note{font-size:11px;color:#767b76;margin:15px 0 0;line-height:1.6}
.kv-related-banners{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
.kv-related-banner{min-height:130px;position:relative;overflow:hidden;background:#333;color:#fff;text-decoration:none;display:flex;align-items:flex-end;padding:18px}
.kv-related-banner:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,#000c,transparent 85%)}
.kv-related-banner img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.kv-related-banner strong{position:relative;z-index:2;font-size:20px;letter-spacing:-.035em}
.kv-related .kv-technical-cta{margin-top:18px;display:inline-flex;background:#293f35;color:#fff;padding:14px 22px;text-decoration:none;font-size:12px;font-weight:700}
@media(max-width:800px){.kv-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.kv-related-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:540px){
 .kv-hero{padding:65px 0 50px}
 .kv-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
 .kv-card-visual{height:135px;padding:16px}
 .kv-card-visual img{max-height:95px}
 .kv-card-footer{padding:11px;font-size:11px}
 .kv-related{padding:36px 18px}
 .kv-related header{align-items:flex-start;flex-direction:column}
 .kv-related-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
 .kv-related-logo{min-height:78px;padding:10px 6px}
 .kv-related-logo img{max-height:49px}
 .kv-related-banner{min-height:120px}
}
@media(prefers-reduced-motion:reduce){.kv-card{transition:none!important}}
"""
(ASSETS/'vendor-catalog-v1.css').write_text(css)
(ASSETS/'vendor-catalog-v1.css').chmod(0o644)

js=r"""
/* KSH vendor directory + context-aware supplier mentions. No invented partnerships. */
(()=>{'use strict';
const root='/ksh/fliskonkurrenten/';
const vendorUrl=root+'leverandorer/';
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const groups={alle:'Alle',fliser:'Fliser',bad:'Baderom',stein:'Naturstein & benkeplater',teknisk:'Støp, avretting & verktøy'};
const currentPath=location.pathname,category=new URLSearchParams(location.search).get('kategori')||'';
function theme(){
 const t=(category+' '+currentPath+' '+document.title).toLowerCase();
 if(/st(o|ø)p|avrett|membran|m(o|ø)rtel|verkt(o|ø)y|flis-tilbeh(o|ø)r|fug|silikon|(^|[/-])lim([/-]|$)|mapei|fagprofil|verneutstyr|impregnering|teknisk/.test(t))return 'teknisk';
 if(/spileplate|zup/.test(t))return null;
 if(/skifer|naturstein|dekton|silestone|marmor-benke|granitt|benkeplat|trakkhell|bruddhell|torrmur|stein/.test(t))return 'stein';
 if(/bad|dusj|servant|vaskerom|speil|vedum|sanipro|armatur|inr/.test(t))return 'bad';
 if(/flis|keramikk|mosaikk|terrazzo|colorker|rondine|panaria/.test(t))return 'fliser';
 return null;
}
const store={data:null};
function logos(v){return '<img src="'+safe(v.logo)+'" loading="lazy" alt="'+safe(v.name)+' logo">';}
function supplierCard(v){return '<a class="kv-card" data-id="'+safe(v.id)+'" data-group="'+safe(v.group)+'" href="'+safe(v.url)+'" target="_blank" rel="noopener noreferrer" aria-label="Åpne '+safe(v.name)+' sin nettside"><div class="kv-card-visual">'+logos(v)+'</div><div class="kv-card-footer"><span>'+safe(v.name)+'</span><span aria-hidden="true">↗</span></div></a>';}
function renderDirectory(data){
 const app=document.querySelector('#kv-app');if(!app)return;
 const verified=data.vendors.filter(x=>x.verified==='official-gallery');
 const additional=data.vendors.filter(x=>x.verified==='featured-demo');
 app.innerHTML='<section class="kv-hero"><div class="kv-wrap"><span class="kv-eyebrow">FLISKONKURRENTEN · LEVERANDØRER</span><h1>Merker med<br><em>substans.</em></h1><p>Utforsk leverandørene som presenteres på Fliskonkurrentens offisielle leverandørside. Filtrer etter fagområde og gå direkte til produsentene.</p><a href="'+root+'">← Til forsiden</a></div></section><div class="kv-main kv-wrap"><div class="kv-sub"><div><span class="kv-eyebrow">SORTIMENT / MERKER</span><h2>Våre leverandører</h2></div><span class="kv-count" id="kv-result-count">18 leverandører</span></div><div class="kv-controls" role="group" aria-label="Filtrer leverandører">'+Object.entries(groups).map(([k,n])=>'<button type="button" class="kv-filter" data-filter="'+k+'" aria-pressed="'+(k==='alle')+'">'+safe(n)+'</button>').join('')+'</div><div class="kv-grid">'+verified.map(supplierCard).join('')+'</div><section class="kv-secondary"><strong>Flere merker og lokale samarbeid</strong><p>Cosentino, Minera Skifer og Korsbakken Bad er også fremhevet i dette SETAEI-designforslaget. Disse er vist separat fra de 18 logoene som for øyeblikket finnes på Fliskonkurrentens offisielle leverandørside.</p><div class="kv-grid">'+additional.map(supplierCard).join('')+'</div><p>Lokale virksomheter i designforslaget:</p><div class="kv-partners">'+data.partners.map(x=>'<a href="'+safe(x.url)+'" aria-label="'+safe(x.name)+'"><img src="'+safe(x.logo)+'" loading="lazy" alt="'+safe(x.name)+'"></a>').join('')+'</div></section><p class="kv-count" style="margin-top:15px">Kilde: <a href="https://fliskonkurrenten.no/leverandorer/" target="_blank" rel="noopener noreferrer">Fliskonkurrentens leverandøroversikt ↗</a>. Produkter, lager og leverandøravtaler bekreftes i originalbutikken.</p></div>';
 function filter(){
  let selected=app.querySelector('.kv-filter[aria-pressed="true"]')?.dataset.filter||'alle';
  const cards=[...app.querySelectorAll('.kv-main > .kv-grid .kv-card')];
  let count=0;
  cards.forEach(c=>{c.hidden=selected!=='alle'&&c.dataset.group!==selected;if(!c.hidden)count++;});
  const label=document.querySelector('#kv-result-count');if(label)label.textContent=count+' leverandører';
 }
 app.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  app.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));
  filter();history.replaceState(history.state,'',vendorUrl+(button.dataset.filter==='alle'?'':'?tema='+encodeURIComponent(button.dataset.filter)));
 }));
 const requested=new URLSearchParams(location.search).get('tema');
 if(requested&&groups[requested]){const selected=app.querySelector('[data-filter="'+requested+'"]');if(selected)selected.click();}
 else filter();
}
function renderRelated(data){
 if(currentPath===root||currentPath===vendorUrl||currentPath===vendorUrl.slice(0,-1))return;
 const t=theme();
 const exist=document.querySelector('.kv-related');
 if(!t){exist?.remove();return;}
 const list=data.vendors.filter(x=>x.tags.includes(t)||(t==='stein'&&x.group==='stein')||(t==='bad'&&x.group==='bad')||(t==='fliser'&&x.group==='fliser'));
 const picked=list.filter(x=>x.group===t).concat(list.filter(x=>x.group!==t)).slice(0,6);
 if(!picked.length){exist?.remove();return;}
 const heading={bad:'Leverandører til badet',fliser:'Flisleverandører',stein:'Stein og benkeplater',teknisk:'Leverandører til dette arbeidet'}[t];
 const note=t==='teknisk'?'For støp, avretting, lim og membran viser vi tekniske leverandører og produktkategorier – ikke irrelevant 3D-showroom.':'Leverandørene er valgt etter tema, ikke som en påstand om produsenten til akkurat dette produktet.';
 const highlighted=t==='bad'?['vedum','inr']:t==='stein'?['minera','cosentino']:[];
 const banners=data.vendors.filter(x=>highlighted.includes(x.id)&&x.image).slice(0,2);
 const section=document.createElement('section');section.className='kv-related';section.setAttribute('aria-label','Relevante leverandører');section.innerHTML='<header><div><span class="kv-eyebrow">PASSER TIL DENNE SIDEN</span><h2>'+heading+'</h2></div><a class="kv-all" href="'+vendorUrl+'?tema='+t+'">Se alle leverandører ↗</a></header><div class="kv-related-grid">'+picked.map(v=>'<a class="kv-related-logo" href="'+safe(v.url)+'" target="_blank" rel="noopener noreferrer" aria-label="'+safe(v.name)+'"><img src="'+safe(v.logo)+'" alt="'+safe(v.name)+' logo" loading="lazy"></a>').join('')+'</div>'+(banners.length?'<div class="kv-related-banners">'+banners.map(v=>'<a class="kv-related-banner" target="_blank" rel="noopener noreferrer" href="'+safe(v.url)+'"><img loading="lazy" src="'+safe(v.image)+'" alt=""><strong>'+safe(v.name)+' ↗</strong></a>').join('')+'</div>':'')+(t==='teknisk'?'<a class="kv-technical-cta" href="https://fliskonkurrenten.no/product-category/stop-og-avretting/" target="_blank" rel="noopener noreferrer">Se tekniske produkter ↗</a>':'')+'<p class="kv-note">'+note+'</p>';
 const parent=document.querySelector('main');
 if(!parent)return;
 if(exist)exist.replaceWith(section);else parent.appendChild(section);
}
function fixNav(){
 document.querySelectorAll('a[href]').forEach(a=>{
  const href=a.getAttribute('href')||'';
  if(href.includes('#leverandorer')&&a.closest('header, nav, .supplier-scroll') && !a.classList.contains('supplier'))a.setAttribute('href',vendorUrl);
  if(a.textContent.trim().toLowerCase().includes('alle leverandører') && href.includes('fliskonkurrenten.no/leverandorer/'))a.setAttribute('href',vendorUrl);
 });
}
function init(data){store.data=data;if(document.querySelector('#kv-app'))renderDirectory(data);else renderRelated(data);fixNav();
 if(currentPath.includes('/kategorier/')){const dynamic=document.querySelector('#k13-view');if(dynamic)new MutationObserver(()=>{renderRelated(data);fixNav()}).observe(dynamic,{childList:true,subtree:false});}
 setTimeout(fixNav,400);setTimeout(fixNav,1400);
}
fetch(root+'assets/vendor-catalog-v1.json?v=1').then(r=>{if(!r.ok)throw Error('Leverandørdata kunne ikke leses');return r.json()}).then(init).catch(e=>{console.error('KSH vendors',e);const app=document.querySelector('#kv-app');if(app)app.innerHTML='<div class="kv-wrap"><p>Kunne ikke hente leverandører. <a href="https://fliskonkurrenten.no/leverandorer/">Se den offisielle oversikten</a>.</p></div>'});
})();
"""
(ASSETS/'vendor-catalog-v1.js').write_text(js)
(ASSETS/'vendor-catalog-v1.js').chmod(0o644)

old=(BASE/'kategorier/category.js').read_text()
if "ksh-vendors-technical" not in old:
    updated=old.replace("  const demo=(featured[group.slug]||[]).map", "  /* ksh-vendors-technical: show only relevant commerce CTAs for technical categories */\n  const technical=['stop-og-avretting','tilbehor'].includes(group.slug);\n  const demo=(technical?[]:(featured[group.slug]||[])).map")
    updated=updated.replace("'<div class=\"k13-detail-actions\"><a href=\"/ksh/fliskonkurrenten/showroom/\">Test 3D-showroom ↗</a><a href=\"/ksh/fliskonkurrenten/produkter/\">Se produktstudiene ↗</a></div></div>'+",
       "'<div class=\"k13-detail-actions\">'+(technical?'<a href=\"'+safe(category.source)+'\" target=\"_blank\" rel=\"noopener\">Se produkter i denne kategorien ↗</a><a href=\"/ksh/fliskonkurrenten/leverandorer/?tema=teknisk\">Se relevante leverandører ↗</a>':'<a href=\"/ksh/fliskonkurrenten/showroom/\">Test 3D-showroom ↗</a><a href=\"/ksh/fliskonkurrenten/produkter/\">Se produktstudiene ↗</a>')+'</div></div>'+")
    if old==updated or 'ksh-vendors-technical' not in updated or updated.count("Test 3D-showroom")!=1:
        raise RuntimeError('Technical CTA patch incomplete')
    f=BASE/'kategorier/category.js'
    shutil.copy2(f,f.with_name('category.js.bak.vendors-'+now))
    tmp=f.with_suffix('.js.tmp');tmp.write_text(updated);tmp.chmod(0o644);tmp.replace(f)
    print('PATCHED_TECH_CTA')

# Set up dedicated directory, reusing the existing KSH footer markup.
src=(BASE/'kategorier/index.html').read_text()
footer=src[src.find('<footer class="k6-footer"'):src.find('</footer>')+len('</footer>')]
if not footer.startswith('<footer') or not footer.endswith('</footer>'):raise RuntimeError('Footer not found')
page='''<!doctype html><html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><title>Alle leverandører | Fliskonkurrenten · SETAEI KSH</title><meta name="description" content="Utforsk 18 leverandører fra Fliskonkurrentens offisielle oversikt, med kategorier for fliser, baderom og tekniske produkter.">
<link rel="stylesheet" href="/ksh/assets/ksh-v6/brand.css?v=6.1">
<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/ksh-v13/entry.css?v=13">
<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/vendor-catalog-v1.css?v=1">
<script defer src="/ksh/fliskonkurrenten/assets/ksh-v13/entry.js?v=13"></script>
<script defer src="/ksh/fliskonkurrenten/assets/vendor-catalog-v1.js?v=1"></script>
</head><body data-ksh-brand="fliskonkurrenten"><main class="kv-page" id="kv-app"><div class="kv-wrap"><p>Laster leverandører …</p></div></main>
'''+footer+'</body></html>'
outfile=DIR/'index.html'
if outfile.exists():shutil.copy2(outfile,outfile.with_name('index.html.bak.vendors-'+now))
outfile.write_text(page);outfile.chmod(0o644)

# Include directory + contextual logos across each demo page.
style='<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/vendor-catalog-v1.css?v=1">'
script='<script defer src="/ksh/fliskonkurrenten/assets/vendor-catalog-v1.js?v=1"></script>'
count=0
for f in sorted(BASE.rglob('index.html')):
    if f==outfile:continue
    s=f.read_text()
    if style in s and script in s:continue
    if '</head>' not in s:continue
    shutil.copy2(f,f.with_name('index.html.bak.vendors-'+now))
    s=s.replace('</head>',style+script+'</head>',1)
    if f==BASE/'kategorier/index.html':
        s=s.replace('category.js?v=13','category.js?v=14')
        s=s.replace('<a href="/ksh/fliskonkurrenten/#outlet">Outlet</a>','<a href="/ksh/fliskonkurrenten/#outlet">Outlet</a><a href="/ksh/fliskonkurrenten/leverandorer/">Leverandører</a>')
    tmp=f.with_suffix('.html.tmp');tmp.write_text(s);tmp.chmod(0o644);tmp.replace(f)
    count+=1
print('VENDOR_PUBLISHED',len(vendors),'official',18,'additional',3,'pages updated',count,'directory',outfile)
