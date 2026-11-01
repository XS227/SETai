#!/usr/bin/env python3
"""SETAEI KSH: undercategories on home, real product catalogue/detail pages,
and 3D CTA strictly for already implemented 3D product demos."""
from pathlib import Path
from datetime import datetime,timezone
import html,json,re,shutil,urllib.request
from urllib.parse import urlparse

BASE=Path('/var/www/setai/ksh/fliskonkurrenten')
CAT=BASE/'kategorier'
STORE=BASE/'assets'
PRODUCT_DIR=BASE/'varer'
PRODUCT_DETAIL=BASE/'vare'
PRODUCT_DIR.mkdir(exist_ok=True)
PRODUCT_DETAIL.mkdir(exist_ok=True)
stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
catalog=json.loads((CAT/'catalog.json').read_text())
def esc(x):return html.escape(str(x),quote=True)
def ensure_saved(path,content):
    path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists():
        before=path.read_text()
        if before==content:return False
        shutil.copy2(path,path.with_name(path.name+'.bak.products-'+stamp))
    tmp=path.with_name(path.name+'.tmp.new')
    tmp.write_text(content,encoding='utf8')
    tmp.chmod(0o644)
    tmp.replace(path)
    return True

# Each product is taken from the actual Woodmart product card and linked to its
# official product detail page. No fabricated prices, specifications or 3D links.
sources=[
 ('stop-avretting-utvalg','https://fliskonkurrenten.no/product-category/stop-og-avretting/',3),
 ('fug-og-silikon','https://fliskonkurrenten.no/product-category/tilbehor/fug-og-silikon/',3),
 ('badekar','https://fliskonkurrenten.no/product-category/baderom/badekar/',4),
 ('skifer','https://fliskonkurrenten.no/product-category/naturstein/skifer/',3),
 ('fliser-bad','https://fliskonkurrenten.no/product-category/fliser/fliser-bad/',4),
 ('verktoy','https://fliskonkurrenten.no/product-category/tilbehor/verktoy/',3),
 ('baderomsinnredning','https://fliskonkurrenten.no/product-category/baderom/baderomsinnredning/',3),
 ('lim','https://fliskonkurrenten.no/product-category/tilbehor/lim/',2),
]
cats={}
for group in catalog['groups']:
    for c in group['categories']:
        cats[c['slug']]={'title':c['label'],'group':group['slug'],
                         'groupLabel':group['name'],'image':'/ksh/fliskonkurrenten/kategorier/'+c['image'],
                         'official':c.get('source','')}
pattern=re.compile(r'<a\s+href="(https://fliskonkurrenten\.no/produkt/[^"]+)"\s+class="product-image-link"[^>]*aria-label="([^"]+)"[^>]*>\s*<img[^>]*\bsrc="([^"]+)"',re.S)
products=[];seen=set()
for catSlug,url,count in sources:
    req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; SETAEI KSH demo; +https://setai.no/)'})
    try:
        with urllib.request.urlopen(req,timeout=18) as resp:source=resp.read().decode('utf8','replace')
        matches=pattern.findall(source)
    except Exception as e:
        print('SOURCE FAILED',catSlug,str(e)[:100])
        continue
    print('PRODUCT SOURCE',catSlug,len(matches))
    for original,name,picture in matches[:count]:
        slug=urlparse(original).path.strip('/').split('/')[-1]
        if slug in seen:continue
        seen.add(slug)
        c=cats[catSlug]
        products.append({'slug':slug,'name':html.unescape(name),'image':html.unescape(picture),
                         'cat':catSlug,'group':c['group'],'category':c['title'],
                         'official':original,'type':'standard',
                         'url':'/ksh/fliskonkurrenten/vare/'+slug+'/'})

show3d=[
 ('sanipro-sense','Sanipro Sense','badekar','/ksh/fliskonkurrenten/produkt/sanipro-sense/assets/sense-hero.webp'),
 ('sanipro-enzo','Sanipro Enzo','badekar','/ksh/fliskonkurrenten/produkt/sanipro-enzo/assets/enzo-hero.webp'),
 ('vedum-flow-takegronn','Vedum Flow · Tåkegrønn','baderomsinnredning','/ksh/fliskonkurrenten/produkt/vedum-flow-takegronn/assets/hero.webp'),
 ('colorker-althea-sand-dekor','Colorker Althea Sand Dekor','fliser-bad','/ksh/fliskonkurrenten/produkt/colorker-althea-sand-dekor/assets/hero.webp'),
 ('zup-spilepanel-eik-sort','Z-UP Spilepanel · Eik Sort','spileplater-utvalg','/ksh/fliskonkurrenten/produkt/zup-spilepanel-eik-sort/assets/hero.webp')
]
# Assets must exist before the 3D button is allowed. These are product demos,
# not a claim that every category's stock has a working 3D model.
for slug,name,catSlug,picture in show3d:
    page=BASE/'produkt'/slug/'index.html'
    if not page.is_file():raise RuntimeError('Missing 3D product page '+slug)
    c=cats[catSlug]
    products.insert(0,{'slug':slug,'name':name,'image':picture,
        'cat':catSlug,'group':c['group'],'category':c['title'],
        'official':c['official'],'type':'3d',
        'url':'/ksh/fliskonkurrenten/produkt/'+slug+'/'})
assert len([p for p in products if p['type']=='3d'])==5
assert len(products)>=17, 'Not enough live-source products!'
print('PRODUCT COUNT',len(products),'3D',5)
storeJson=STORE/'shop-products-v1.json'
ensure_saved(storeJson,json.dumps({'products':products,'groups':catalog['groups']},
                                  ensure_ascii=False,indent=2)+'\n')

ROOT='/ksh/fliskonkurrenten/'
CSS='/ksh/fliskonkurrenten/assets/shop-products-v1.css?v=1'
JS='/ksh/fliskonkurrenten/assets/shop-products-v1.js?v=1'
VENDOR_CSS='/ksh/fliskonkurrenten/assets/vendor-catalog-v1.css?v=1'
VENDOR_JS='/ksh/fliskonkurrenten/assets/vendor-catalog-v1.js?v=1'
COMMON_HEAD='<link rel="stylesheet" href="/ksh/assets/ksh-v6/brand.css?v=6.1"><link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/ksh-v13/entry.css?v=13"><script defer src="/ksh/fliskonkurrenten/assets/ksh-v13/entry.js?v=13"></script>'
SOCIAL_HEAD='<link rel="stylesheet" href="'+VENDOR_CSS+'"><script defer src="'+VENDOR_JS+'"></script>'
content=(BASE/'showroom/index.html').read_text()
footer=content[content.find('<footer class="k6-footer"'):content.find('</footer>')+len('</footer>')]
if not footer.startswith('<footer') or not footer.endswith('</footer>'):raise RuntimeError('Footer missing')

def bodyCard(p,feature=False):
    is3d=p['type']=='3d'
    main='<a class="sp-card-photo" href="'+esc(p['url'])+'"><img src="'+esc(p['image'])+'" loading="lazy" alt="'+esc(p['name'])+'" onerror="this.style.opacity=.25"></a>'
    details='<div class="sp-card-copy"><span class="sp-meta">'+esc(p['category'])+'</span><h3><a href="'+esc(p['url'])+'">'+esc(p['name'])+'</a></h3><span class="sp-kind">'+('INTERAKTIV 3D-MODELL' if is3d else 'PRODUKT FRA ORIGINALBUTIKKEN')+'</span><div class="sp-card-links"><a class="sp-regular" href="'+esc(p['url'])+'">Se produktet ↗</a>'
    if is3d:details+='<a class="sp-3d" href="'+esc(p['url'])+'">Se i 3D ↗</a>'
    return '<article class="sp-card'+(' sp-feature' if feature else '')+'">'+main+details+'</div></div></article>'

# Generate static informative product pages; external retail purchase not a replica.
made=0
for p in products:
    if p['type']=='3d':continue
    c=cats[p['cat']]
    title=esc(p['name'])
    page=('''<!doctype html><html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="description" content="SETAEI designforslag: '''+title+''', produktreferanse fra Fliskonkurrenten.">
<title>'''+title+''' | Fliskonkurrenten · SETAEI</title>'''+COMMON_HEAD+SOCIAL_HEAD+'<link rel="stylesheet" href="'+CSS+'"></head><body data-ksh-brand="fliskonkurrenten">'+
    '<main class="sp-page"><div class="sp-wrap"><nav class="sp-breadcrumb" aria-label="Tilbake"><a href="'+ROOT+'">Forside</a><span> / </span><a href="'+ROOT+'kategorier/?kategori='+esc(p['cat'])+'">'+esc(c['title'])+'</a><span> / </span><span>'+title+'</span></nav>'+
    '<div class="sp-detail"><figure><img src="'+esc(p['image'])+'" alt="'+title+'" loading="eager" fetchpriority="high"><figcaption>Produktfoto fra Fliskonkurrentens offisielle produktside.</figcaption></figure>'+
    '<div class="sp-detail-copy"><span class="sp-kicker">'+esc(c['groupLabel'])+' / '+esc(c['title'])+'</span><h1>'+title+'</h1>'+
    '<p>Utforsk produktet og sammenlign med andre alternativer i '+esc(c['title']).lower()+'. Dette er en uforpliktende produktside i SETAEIs designforslag.</p>'+
    '<div class="sp-live-price"><strong>Pris og tilgjengelighet</strong><span>Se oppdatert pris, produktspesifikasjoner, lagerstatus og levering i originalbutikken.</span></div>'+
    '<div class="sp-detail-actions"><a class="sp-regular" href="'+esc(p['official'])+'" target="_blank" rel="noopener noreferrer">Se pris og kjøp hos Fliskonkurrenten ↗</a>'+
    '<a class="sp-outline" href="'+ROOT+'kategorier/?kategori='+esc(p['cat'])+'">Flere produkter i kategorien</a></div>'+
    '<small>Ingen 3D-modell er knyttet til dette produktet. 3D-knappen vises bare for produkter med ferdig modell.</small></div></div></div></main>'+
    footer+'</body></html>')
    if ensure_saved(PRODUCT_DETAIL/p['slug']/'index.html',page):made+=1

# Distinct catalogue page with both real-source and 3D cards.
directory=('''<!doctype html><html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow">
<title>Produkter | Fliskonkurrenten · SETAEI demo</title><meta name="description" content="Utforsk produktsider og ferdige 3D-demoer i Fliskonkurrentens SETAEI-designforslag.">'''+COMMON_HEAD+SOCIAL_HEAD+'<link rel="stylesheet" href="'+CSS+'"><script defer src="'+JS+'"></script></head><body data-ksh-brand="fliskonkurrenten">'+
'<main class="sp-page"><header class="sp-hero"><div class="sp-wrap"><span class="sp-kicker">FLISKONKURRENTEN / PRODUKTUNIVERS</span><h1>Produkter.<br><em>Opplev mer.</em></h1><p>Utforsk produkteksempler fra nettbutikken. Der vi har en fungerende 3D-demo, kan du åpne og rotere modellen.</p></div></header><div class="sp-wrap sp-directory" id="sp-directory"><div class="sp-toolbar"><h2>Utforsk produkter</h2><div class="sp-filters"><button type="button" data-pfilter="alle" aria-pressed="true">Alle</button><button type="button" data-pfilter="3d">3D-demoer</button><button type="button" data-pfilter="fliser">Fliser</button><button type="button" data-pfilter="bad">Bad</button><button type="button" data-pfilter="stein">Naturstein</button><button type="button" data-pfilter="teknisk">Teknisk</button></div></div><div class="sp-grid" id="sp-products">'+''.join(bodyCard(p) for p in products)+'</div><p class="sp-disclaimer">Dette er et ikke-indeksert designforslag. Pris og tilgjengelighet kommer fra den offisielle nettbutikken, og kan endres.</p></div></main>'+footer+'</body></html>')
ensure_saved(PRODUCT_DIR/'index.html',directory)
print('DETAIL PAGES',made,'DIRECTORY',len(products))

# Insert all nine homepage categories, where main cards link to the NEW
# undercategories instead of bypassing the design to the old store.
homeFile=BASE/'index.html'
s=homeFile.read_text()
if 'KSH_SUBCATEGORIES_V14' not in s:
    newcats=[
      ('benkeplater','Benkeplater','07 / Naturmaterialer','Dekton, Silestone og ekte stein.','/ksh/fliskonkurrenten/kategorier/assets/benkeplater-reference.webp'),
      ('stop-og-avretting','Støp og avretting','08 / Underlaget','Primer, avrettingsmasse og tekniske løsninger.','/ksh/fliskonkurrenten/kategorier/assets/stop-avretting-utvalg.webp'),
      ('vaskerom','Vaskerom','09 / Praktiske rom','Innredning og løsninger for vaskerommet.','/ksh/fliskonkurrenten/kategorier/assets/vaskerom-reference.webp')
    ]
    additions=[]
    for slug,label,small,desc,img in newcats:
        additions.append('<a class="cat reveal" href="#underkategorier-'+slug+'"><img src="'+img+'" alt="'+esc(label)+'" loading="lazy"><div class="cat-content"><div class="eyebrow">'+esc(small)+'</div><h3>'+esc(label)+'</h3><p>'+esc(desc)+'</p><span class="go" aria-hidden="true">↗</span></div></a>')
    # Inserting after the sixth tile, before closing grid.
    pivot='<div class="quicklinks reveal" aria-label="Flere kategorier">'
    loc=s.find(pivot)
    if loc<0:raise RuntimeError('Cannot locate category quicklinks')
    close=s.rfind('</div>',0,loc)
    if close<0:raise RuntimeError('Cannot locate category grid')
    s=s[:close]+'\n<!-- KSH_SUBCATEGORIES_V14 -->\n'+'\n'.join(additions)+'\n'+s[close:]
    for group in ('fliser','baderom','naturstein','tilbehor','spileplater'):
        # Main tiles order; matches existing official links, internal anchors preferred.
        mapping={'fliser':'https://fliskonkurrenten.no/product-category/fliser/',
                 'baderom':'https://fliskonkurrenten.no/product-category/baderom/',
                 'naturstein':'https://fliskonkurrenten.no/product-category/naturstein/',
                 'tilbehor':'https://fliskonkurrenten.no/product-category/tilbehor/',
                 'spileplater':'https://fliskonkurrenten.no/product-category/spileplater/'}
        a='href="'+mapping[group]+'" target="_blank" rel="noopener"'
        b='href="#underkategorier-'+group+'"'
        if a not in s:raise RuntimeError('Home category link not found '+group)
        s=s.replace(a,b,1)
    # Add category/product panels directly in the requested #kategorier section.
    pivot='<div class="quicklinks reveal" aria-label="Flere kategorier">'
    # Remove outdated quicklinks: replace them with fully navigable verified category catalogue.
    start=s.find(pivot);end=s.find('</div>',start)+6
    if start<0 or end<6:raise RuntimeError('Quicklinks not found for replacement')
    s=s[:start]+'<div id="ksh-home-explorer" class="ksh-home-explorer" aria-label="Alle underkategorier og produkter"><p>Laster underkategorier …</p></div>'+s[end:]
    ensure_saved(homeFile,s)
    print('HOME NINE CATEGORIES READY')

# Script controls all categorized product display and removes fake generic 3D CTAs.
appjs=r"""
/* KSH v14: internal subcategories and verified product-only 3D links */
(()=>{'use strict';
const ROOT='/ksh/fliskonkurrenten/';
const clean=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const appPath=location.pathname;
const gSlug=new URLSearchParams(location.search).get('kategori');
let data;
function card(p){
 const can3d=p.type==='3d';
 return '<article class="sp-card" data-type="'+clean(p.type)+'" data-group="'+clean(p.group)+'">'+
  '<a class="sp-card-photo" href="'+clean(p.url)+'"><img src="'+clean(p.image)+'" loading="lazy" alt="'+clean(p.name)+'" onerror="this.style.opacity=.3"></a>'+
  '<div class="sp-card-copy"><span class="sp-meta">'+clean(p.category)+'</span><h3><a href="'+clean(p.url)+'">'+clean(p.name)+'</a></h3>'+
  '<span class="sp-kind">'+(can3d?'INTERAKTIV 3D-DEMO':'PRODUKT FRA ORIGINALBUTIKKEN')+'</span>'+
  '<div class="sp-card-links"><a class="sp-regular" href="'+clean(p.url)+'">Se produktet ↗</a>'+
  (can3d?'<a class="sp-3d" href="'+clean(p.url)+'">Se i 3D ↗</a>':'')+'</div></div></article>';
}
function home(){
 const box=document.querySelector('#ksh-home-explorer');if(!box)return;
 const groups=data.groups;
 let output='<header class="sh-title"><div><span class="sh-eyebrow">HELE SORTIMENTET / 9 HOVEDGRUPPER</span><h3>Finn riktig<br><em>underkategori.</em></h3></div><a href="'+ROOT+'kategorier/">Se alle kategorier ↗</a></header><div class="sh-groups">';
 for(const g of groups){
  output+='<details class="sh-group" id="underkategorier-'+clean(g.slug)+'" '+(['fliser','baderom'].includes(g.slug)?'open':'')+'><summary><span>'+clean(g.name)+'</span><small>'+g.categories.length+' underkategorier</small><b aria-hidden="true">＋</b></summary><div class="sh-group-links">'+g.categories.map(c=>'<a href="'+ROOT+'kategorier/?kategori='+encodeURIComponent(c.slug)+'">'+clean(c.label)+' <span aria-hidden="true">↗</span></a>').join('')+'</div></details>';
 }
 output+='</div><section class="sh-products"><header class="sh-title"><div><span class="sh-eyebrow">PRODUKTER / EKSEMPLER FRA SORTIMENTET</span><h3>Velg, utforsk,<br><em>se i 3D.</em></h3></div><a href="'+ROOT+'varer/">Alle produktsider ↗</a></header><div class="sp-grid">'+
 [...data.products.filter(p=>p.type==='3d'),...data.products.filter(p=>p.type==='standard'&&['stop-avretting-utvalg','skifer','fug-og-silikon'].includes(p.cat))].slice(0,9).map(card).join('')+
 '</div><p class="sp-disclaimer">3D vises bare for produktene som har fått en egen interaktiv modell. Øvrige varer har vanlige produktsider.</p></section>';
 box.innerHTML=output;
 document.querySelectorAll('#kategorier a.cat[href^="#underkategorier-"]').forEach(a=>a.addEventListener('click',()=>{const node=document.querySelector(a.getAttribute('href'));if(node)node.open=true;}));
 // Links arriving with a group hash open the matching accordion.
 if(location.hash.startsWith('#underkategorier-')){const d=document.querySelector(location.hash);if(d){d.open=true;requestAnimationFrame(()=>d.scrollIntoView({block:'start'}));}}
}
function directory(){
 const dir=document.querySelector('#sp-directory');if(!dir)return;
 const buttons=[...dir.querySelectorAll('[data-pfilter]')];
 const cards=[...dir.querySelectorAll('.sp-card')];
 buttons.forEach(b=>b.addEventListener('click',()=>{
   buttons.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
   const filter=b.dataset.pfilter;
   cards.forEach(c=>c.hidden=!(filter==='alle'||(filter==='3d'&&c.dataset.type==='3d')||(c.dataset.group===filter)));
 }));
}
function category(){
 if(!appPath.includes('/kategorier/')||!gSlug)return;
 const host=document.querySelector('#k13-view');if(!host)return;
 const cat=data.groups.flatMap(g=>g.categories.map(c=>({...c,groupSlug:g.slug}))).find(c=>c.slug===gSlug);
 if(!cat)return;
 const update=()=>{
   if(!host.querySelector('.k13-detail'))return;
   if(host.querySelector('.sp-cat-products'))return;
   const productList=data.products.filter(p=>p.cat===gSlug);
   const works=productList.filter(p=>p.type==='3d');
   const detailActions=host.querySelector('.k13-detail-actions');
   if(detailActions){
     detailActions.innerHTML='<a href="'+clean(cat.source)+'" target="_blank" rel="noopener noreferrer">Se sortiment og priser ↗</a>'+
       (works.length?'<a href="'+clean(works[0].url)+'">Se '+clean(works[0].name)+' i 3D ↗</a>':'<a href="'+ROOT+'leverandorer/?tema='+encodeURIComponent(['stop-og-avretting','tilbehor'].includes(cat.groupSlug)?'teknisk':cat.groupSlug==='naturstein'?'stein':cat.groupSlug==='baderom'?'bad':'fliser')+'">Relevante leverandører ↗</a>');
   }
   const related=host.querySelector('.k13-related');if(related)related.remove(); // category-wide generic demos had unrelated products
   const section=document.createElement('section');section.className='sp-cat-products';
   section.innerHTML='<div class="sp-wrap"><header class="sh-title"><div><span class="sh-eyebrow">PRODUKTER I KATEGORIEN</span><h3>Utforsk '+clean(cat.label)+'.</h3></div><a href="'+ROOT+'varer/">Alle produkter ↗</a></header>'+
      (productList.length?'<div class="sp-grid">'+productList.map(card).join('')+'</div>':'<p>Flere produktdetaljer finner du i den offisielle nettbutikken.</p>')+
      '<a class="sp-category-source" href="'+clean(cat.source)+'" target="_blank" rel="noopener noreferrer">Se hele kategorien hos Fliskonkurrenten ↗</a></div>';
   host.append(section);
 };
 const observer=new MutationObserver(update);observer.observe(host,{childList:true,subtree:false});update();
}
fetch(ROOT+'assets/shop-products-v1.json?v=1',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Product data '+r.status);return r.json()}).then(x=>{data=x;home();directory();category()}).catch(e=>{console.error('KSH product catalogue',e);const panel=document.querySelector('#ksh-home-explorer');if(panel)panel.innerHTML='<a href="'+ROOT+'kategorier/">Utforsk alle kategorier ↗</a>'});
})();
"""
ensure_saved(STORE/'shop-products-v1.js',appjs)

css=r"""
/* SETAEI KSH v14 | categories, products and responsive foldable UX */
#kategorier{scroll-margin-top:82px}
#kategorier .cat-grid .cat:nth-child(8),
#kategorier .cat-grid .cat:nth-child(9){grid-column:span 6}
#kategorier .cat-grid .cat:nth-child(7){grid-column:span 4}
#kategorier .cat-grid .cat:nth-child(8),#kategorier .cat-grid .cat:nth-child(9){min-height:350px}
#kategorier .ksh-home-explorer{margin-top:55px;scroll-margin-top:90px}
.sh-title{display:flex;justify-content:space-between;align-items:end;gap:15px;margin-bottom:26px}
.sh-eyebrow,.sp-kicker{font:700 11px/1.4 'DM Sans',Arial,sans-serif;color:#b58167;text-transform:uppercase;letter-spacing:.15em}
.sh-title h3{font:600 clamp(30px,4vw,49px)/1.09 Manrope,Arial,sans-serif;letter-spacing:-.065em;margin:12px 0;color:#282a28}
.sh-title h3 em{font-family:Georgia,serif;font-weight:400}
.sh-title>a{display:inline-block;color:#353c34;border-bottom:1px solid #444c43;padding:8px 0;font-size:12px;font-weight:700;text-decoration:none;white-space:nowrap}
.sh-groups{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:start}
.sh-group{min-width:0;border:1px solid #d8d5cd;background:#fff;scroll-margin-top:100px;box-shadow:0 4px 14px #24242405}
.sh-group summary{display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:center;list-style:none;cursor:pointer;padding:20px 18px;touch-action:manipulation}
.sh-group summary::-webkit-details-marker{display:none}
.sh-group summary span{font:700 18px/1.25 Manrope,Arial,sans-serif;color:#2d302c;letter-spacing:-.04em;grid-column:1}
.sh-group summary small{font-size:11px;color:#777d76;grid-column:1}
.sh-group summary b{grid-column:2;grid-row:1/span 2;font-weight:400;font-size:24px}
.sh-group[open] summary b{transform:rotate(45deg)}
.sh-group-links{padding:0 18px 18px;display:flex;flex-direction:column}
.sh-group-links a{display:flex;justify-content:space-between;gap:9px;min-height:36px;align-items:center;padding:8px 0;border-top:1px solid #e8e5dd;font:500 12px/1.4 'DM Sans',Arial,sans-serif;color:#3f473f;text-decoration:none}
.sh-group-links a:hover{text-decoration:underline}
.sh-group-links a span{color:#86968a}
.sh-products{margin:65px 0 12px}
.sp-page{background:#f7f5f0;color:#222822;font-family:'DM Sans',Arial,sans-serif;min-height:50svh;padding-top:50px}
.sp-wrap{max-width:1200px;width:calc(100% - 50px);margin:0 auto}
.sp-hero{background:#29322d;color:#fff;padding:80px 0 80px;margin-top:-50px}
.sp-hero h1{font:600 clamp(50px,7vw,103px)/1 Manrope,Arial,sans-serif;letter-spacing:-.07em;margin:17px 0}
.sp-hero h1 em{font-family:Georgia,serif;font-weight:400}
.sp-hero p{font-size:16px;line-height:1.6;max-width:620px;color:#e6e5de}
.sp-directory{padding:50px 0 85px}
.sp-toolbar{display:flex;flex-direction:column;gap:15px;margin-bottom:24px}
.sp-toolbar h2{font:600 34px/1 Manrope,Arial,sans-serif;letter-spacing:-.05em;margin:0}
.sp-filters{display:flex;flex-wrap:wrap;gap:8px}
.sp-filters button{background:#fff;border:1px solid #c7cbc4;border-radius:24px;padding:10px 17px;min-height:44px;color:#2d342e;cursor:pointer;font-size:12px}
.sp-filters button[aria-pressed=true]{background:#2a4235;color:#fff}
.sp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.sp-card{display:flex;flex-direction:column;min-width:0;overflow:hidden;background:#fff;color:#292d2a;border:1px solid #e4e2dc}
.sp-card[hidden]{display:none}
.sp-card-photo{display:block;position:relative;aspect-ratio:4/4.15;overflow:hidden;background:#e5e2db}
.sp-card-photo img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .6s ease}
.sp-card:hover .sp-card-photo img{transform:scale(1.035)}
.sp-card-copy{padding:17px;display:flex;flex-direction:column;gap:9px;flex:1}
.sp-meta{font:700 10px/1.3 'DM Sans',Arial,sans-serif;text-transform:uppercase;letter-spacing:.12em;color:#a16a52}
.sp-card h3{font:600 17px/1.35 Manrope,Arial,sans-serif;letter-spacing:-.025em;margin:0;min-height:43px}
.sp-card h3 a{color:#2b2d28;text-decoration:none}
.sp-kind{font-size:10px;color:#778078;letter-spacing:.04em}
.sp-card-links{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-top:auto;padding-top:8px}
.sp-card-links a{display:inline-block;flex:1;white-space:nowrap;text-align:center;font-size:11px;font-weight:700;padding:11px 6px;text-decoration:none;border:1px solid #d1d6cd}
.sp-card-links .sp-3d{background:#30594a;border-color:#30594a;color:#fff}
.sp-card-links .sp-regular{background:#fff;color:#333e36}
.sp-disclaimer{font-size:11px;color:#6f746f;line-height:1.6;margin:20px 0}
.sp-breadcrumb{display:flex;flex-wrap:wrap;gap:9px;color:#666b64;font-size:12px;margin:0 0 34px}
.sp-breadcrumb a{color:#4c624f}
.sp-detail{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:clamp(24px,6vw,82px);align-items:start;padding-bottom:65px}
.sp-detail figure{margin:0;background:#fff}
.sp-detail figure img{display:block;width:100%;max-height:670px;object-fit:contain;aspect-ratio:1/1}
.sp-detail figcaption{padding:10px 12px;font-size:11px;color:#777a73}
.sp-detail-copy{padding:15px 0}
.sp-detail-copy h1{font:600 clamp(34px,4.6vw,62px)/1.09 Manrope,Arial,sans-serif;letter-spacing:-.06em;margin:18px 0}
.sp-detail-copy p{font-size:15px;color:#61695f;line-height:1.65}
.sp-live-price{display:flex;flex-direction:column;gap:8px;margin-top:30px;padding:23px 0;border-top:1px solid #d7dad3;border-bottom:1px solid #d7dad3}
.sp-live-price strong{font-size:17px;color:#262c25}
.sp-live-price span{font-size:13px;line-height:1.5;color:#696f69}
.sp-detail-actions{display:flex;flex-wrap:wrap;gap:10px;margin:24px 0}
.sp-detail-actions a,.sp-category-source{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:13px 19px;text-decoration:none;font-weight:700;font-size:12px}
.sp-detail-actions .sp-regular,.sp-category-source{background:#304a3d;color:#fff}
.sp-detail-actions .sp-outline{border:1px solid #aeb6af;color:#263128}
.sp-detail-copy>small{display:block;line-height:1.5;color:#68716b}
.sp-cat-products{background:#f4f0e9;border-top:1px solid #ddd8cf;padding:55px 0 70px;clear:both}
.sp-cat-products .sp-wrap{max-width:1160px}
.sp-cat-products .sp-category-source{margin-top:24px}
@media(max-width:1050px){
 #kategorier .cat-grid .cat:nth-child(n){grid-column:span 6}
 .sp-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
 .sh-groups{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:650px){
 #kategorier .cat-grid .cat:nth-child(n){grid-column:span 12}
 #kategorier .cat-grid .cat:nth-child(8),#kategorier .cat-grid .cat:nth-child(9){min-height:390px}
 .sh-title{flex-wrap:wrap;align-items:start;flex-direction:column}
 .sh-groups{grid-template-columns:1fr}
 .sh-group summary{padding:17px}
 .sh-group-links{padding:0 16px 16px}
 .sh-products{margin-top:45px}
 .sp-wrap{width:calc(100% - 32px)}
 .sp-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
 .sp-card-copy{padding:12px;gap:7px}
 .sp-card h3{font-size:14px;min-height:37px}
 .sp-card-links{flex-direction:column;align-items:stretch}
 .sp-card-links a{flex:auto;min-height:36px;padding:9px 5px}
 .sp-detail{grid-template-columns:1fr;gap:15px}
 .sp-detail-copy{padding:0}
 .sp-hero{padding:58px 0}
}
@media(max-width:340px){
 .sp-grid{grid-template-columns:1fr 1fr}
 .sp-card h3{font-size:13px}
 .sp-card-links a{font-size:10px}
}
@media(prefers-reduced-motion:reduce){.sp-card-photo img{transition:none}}
"""
ensure_saved(STORE/'shop-products-v1.css',css)

# Include UI scripts only on the homepage and category directory.
for file in (BASE/'index.html',CAT/'index.html'):
    doc=file.read_text()
    style='<link rel="stylesheet" href="'+CSS+'">'
    script='<script defer src="'+JS+'"></script>'
    if style not in doc:
        doc=doc.replace('</head>',style+script+'</head>',1)
        ensure_saved(file,doc)
# All standard generated pages also use vendor relevance rules.
print('DEPLOYED',len(products),'products,',len(catalog['groups']),'category groups')
