#!/usr/bin/env python3
"""KSH v16: unify tile preview CTA across existing product catalogue and standard product pages."""
from pathlib import Path
from datetime import datetime,timezone
import shutil
ROOT=Path('/var/www/setai/ksh/fliskonkurrenten')
ASSETS=ROOT/'assets'
ts=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
js=r"""/* KSH: SKU-specific tile preview links; never mislabel a texture as a product GLB. */
(()=>{'use strict';
const prefix='/ksh/fliskonkurrenten/';
const arr=window.KSHTiles?.tiles||[];
const tileIndex=new Map(arr.map(t=>[t.id,t]));
const title='Prøv flisen i rommet ↗';
const escape=x=>String(x||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const room=(id)=>prefix+'showroom/?tile='+encodeURIComponent(id)+'&surface=wall#reisen';
function attachCard(card){
 if(card.dataset.tileLinked)return;
 const link=card.querySelector('a[href*="/vare/"],a[href*="/produkt/"]');
 const slug=link?.getAttribute('href')?.split('/').filter(Boolean).pop();
 const tile=tileIndex.get(slug);
 if(!tile)return;
 const row=card.querySelector('.sp-card-links');
 if(!row)return;
 card.dataset.tileLinked='1';
 row.insertAdjacentHTML('beforeend','<a class="sp-tile-preview" href="'+room(slug)+'" aria-label="Prøv '+escape(tile.name)+' som flisfoto i showroom">'+title+'</a>');
}
function attachDetail(){
 const match=location.pathname.match(/\/vare\/([^/]+)\/?$/);
 if(!match)return;
 const tile=tileIndex.get(match[1]);if(!tile)return;
 const row=document.querySelector('.sp-detail-actions');
 if(!row||row.querySelector('.sp-tile-preview'))return;
 row.insertAdjacentHTML('afterbegin','<a class="sp-tile-preview" href="'+room(tile.id)+'">Prøv flisen i rommet ↗</a>');
 const note=document.querySelector('.sp-detail-copy>small');
 if(note)note.textContent='Showroom viser produktbildet lagt som en flisoverflate. Dette er en materialforhåndsvisning – ikke en produsentverifisert, sømløs 3D-tekstur.';
}
function promo(){
 if(location.pathname!==prefix+'varer/')return;
 const dir=document.querySelector('#sp-directory');
 if(!dir||dir.querySelector('.sp-tile-promo'))return;
 const promo=document.createElement('aside');
 promo.className='sp-tile-promo';
 promo.innerHTML='<div><span>FLISER / DIGITAL MATERIALVELGER</span><strong>Se flisen i et helt rom.</strong><p>Velg fra '+arr.length+' produktbilder, og få automatisk forslag til farger, gulv og innredning som passer sammen.</p></div><a href="'+prefix+'fliser-i-rommet/">Velg flis og prøv i rommet ↗</a>';
 dir.insertBefore(promo,dir.querySelector('.sp-grid'));
}
function init(){
 document.querySelectorAll('.sp-card').forEach(attachCard);
 attachDetail();promo();
}
init();
const observer=new MutationObserver(init);
observer.observe(document.body,{childList:true,subtree:true});
})();
"""
css=r"""
.sp-tile-preview{background:#284c3e!important;color:#fff!important;border:1px solid #284c3e!important;font-weight:750!important;min-height:40px;display:inline-flex;align-items:center;justify-content:center;text-align:center;text-decoration:none;padding:11px 12px;white-space:normal!important;font-size:11px}
.sp-card .sp-tile-preview{flex:1 0 100%;margin-top:3px}
.sp-tile-promo{display:flex;align-items:center;justify-content:space-between;gap:26px;background:#e5e4da;border:1px solid #c9d1c6;padding:23px 28px;margin:20px 0 30px;color:#293b30}
.sp-tile-promo span{display:block;font-size:10px;font-weight:750;color:#b08066;letter-spacing:.15em;margin-bottom:8px}
.sp-tile-promo strong{font:600 clamp(22px,3vw,32px)/1.2 Manrope,Arial,sans-serif;letter-spacing:-.045em}
.sp-tile-promo p{max-width:550px;font-size:13px;line-height:1.6;margin:9px 0 0;color:#667166}
.sp-tile-promo>a{flex:none;background:#2b4f3c;color:#fff;padding:14px 20px;text-decoration:none;font-size:12px;font-weight:750;min-height:44px;display:flex;align-items:center}
@media(max-width:700px){.sp-tile-promo{align-items:flex-start;flex-direction:column;padding:18px}.sp-tile-promo>a{width:100%;justify-content:center;box-sizing:border-box}}
"""
(ASSETS/'tile-product-links-v16.js').write_text(js)
(ASSETS/'tile-product-links-v16.css').write_text(css)
for f in [ASSETS/'tile-product-links-v16.js',ASSETS/'tile-product-links-v16.css']:f.chmod(0o644)
lib='<script src="/ksh/fliskonkurrenten/assets/tile-library-v15.js?v=15"></script>'
tag='<script defer src="/ksh/fliskonkurrenten/assets/tile-product-links-v16.js?v=16"></script>'
style='<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/tile-product-links-v16.css?v=16">'
count=0
for f in sorted([ROOT/'varer/index.html',*list((ROOT/'vare').glob('*/index.html')),ROOT/'index.html',ROOT/'kategorier/index.html']):
 s=f.read_text()
 if tag in s:continue
 replacement=''
 if lib not in s:replacement+=lib
 replacement+=style+tag
 if '</head>' not in s:continue
 before=s
 s=s.replace('</head>',replacement+'</head>',1)
 if s!=before:
  shutil.copy2(f,f.with_name(f.name+'.bak.tilelinks-'+ts))
  tmp=f.with_name('index.html.tmp.tilelinks');tmp.write_text(s);tmp.chmod(0o644);tmp.replace(f);count+=1
print('TILE LINKS ADDED',count)
