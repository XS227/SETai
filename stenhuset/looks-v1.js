/* "Shop the look" from Stenhuset's Instagram (@stenhuset_no).
 * Each post or reel is linked to the products it shows; every product goes straight to 3D, the showroom,
 * the product sheet or the shop. The list is kept in api/looks.php and edited in looks-admin.html.
 * The Instagram post itself only loads when the visitor asks for it (no Instagram tracking before that). */
const BASE=new URL('./',import.meta.url).href;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kr=n=>n>0?new Intl.NumberFormat('nb-NO',{maximumFractionDigits:0}).format(n)+' kr':'';
const TABLE_IDS=new Set([10801,10753,10747,10635,10630,10625,10619,10612,10606]);
const FB='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/></svg>';
const isFb=l=>l.source==='facebook';
const IG='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".8"/></svg>';

function styles(){
  if(document.getElementById('looks-css'))return;
  const el=document.createElement('style');el.id='looks-css';el.textContent=`
.looks-head{display:flex;justify-content:space-between;align-items:end;gap:20px;flex-wrap:wrap;margin-bottom:28px}
.looks-follow{display:inline-flex;gap:8px;align-items:center;border:1px solid var(--line);padding:11px 15px;color:inherit;text-decoration:none;font:13px var(--sans)}
.looks-follows{display:flex;gap:8px;flex-wrap:wrap}.looks-follow svg,.lk-ig svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.7}
.looks-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:22px}
.lk{background:var(--paper);border:1px solid var(--line);display:flex;flex-direction:column;min-width:0;scroll-margin-top:90px}
.lk.hl{outline:2px solid var(--accent);outline-offset:3px}
.lk-media{position:relative;aspect-ratio:4/5;background:linear-gradient(140deg,#ece4d8,#d9cbb8);overflow:hidden}
.lk-media img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(.95)}
.lk-media iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff}
.lk-play{position:absolute;inset:auto 14px 14px 14px;display:flex;gap:8px;align-items:center;justify-content:center;min-height:46px;border:0;background:#fffdfae8;color:var(--dark);font:13px var(--sans);cursor:pointer;backdrop-filter:blur(4px)}
.lk-play svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.7}
.lk-badge{position:absolute;left:12px;top:12px;background:#242725cc;color:#fff;font:11px var(--sans);letter-spacing:.06em;padding:5px 9px;text-transform:uppercase}
.lk-empty{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:30px;color:#6d6458;font:15px/1.4 var(--serif)}
.lk-body{padding:16px 16px 18px;display:flex;flex-direction:column;gap:12px;flex:1}
.lk-title{font:400 20px/1.25 var(--serif);margin:0}.lk-text{margin:0;color:var(--mute);font-size:13px}
.lk-prods{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none}
.lk-p{display:grid;grid-template-columns:52px 1fr;gap:10px;align-items:center}
.lk-p img{width:52px;height:52px;object-fit:cover;display:block;background:#eee}
.lk-pn{font-size:13px;line-height:1.3}.lk-pn small{display:block;color:var(--mute);font-size:12px}
.lk-acts{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}
.lk-a{border:1px solid var(--line);background:transparent;color:inherit;font:11.5px var(--sans);padding:6px 9px;cursor:pointer;text-decoration:none;min-height:30px;display:inline-flex;align-items:center}
.lk-a:hover{border-color:var(--accent)}
.lk-none{font-size:13px;color:var(--mute);margin:0}
.lk-foot{display:flex;gap:8px;margin-top:auto;padding-top:4px}
.lk-foot .lk-a{flex:1;justify-content:center;min-height:40px}
.lk-ig{gap:6px}`;
  document.head.append(el);
}

async function getJSON(u){const r=await fetch(u,{cache:'no-cache'});if(!r.ok)throw new Error(u+' '+r.status);return r.json();}
let state=null;
async function data(){
  if(state)return state;
  const looks=await getJSON(BASE+'api/looks.php').catch(()=>getJSON(BASE+'looks-seed-v1.json'));
  const cat=await getJSON(BASE+'catalog-v1.json');let sheets=new Set();
  try{const pd=await getJSON(BASE+'assets/products/products-v1.json');sheets=new Set(pd.products.map(p=>p.id));}catch(_){}
  state={looks:looks.looks||[],account:looks.account||'stenhuset_no',cat:new Map(cat.products.map(p=>[p.id,p])),sheets};
  return state;
}

function productRow(p,s){
  const has3d=typeof SINK3D!=='undefined'&&SINK3D.has(p.id),isTable=TABLE_IDS.has(p.id);
  const acts=[];
  if(has3d)acts.push('<button class="lk-a" data-act="3d" data-id="'+p.id+'">Se i 3D</button>');
  // every product with a place in the showroom (tiles too: floor, wall, kitchen splashback) opens in its own room
  const a=window.PR&&window.PR.analyze(p),room=a&&a.room?window.PR.ROOM_NAME[a.room]:has3d?(isTable?'stuen':'badet'):null;
  if(room)acts.push('<button class="lk-a" data-act="room" data-id="'+p.id+'">Prøv i '+room+'</button>');
  if(s.sheets.has(p.id)||p.id===10827)acts.push('<button class="lk-a" data-act="sheet" data-id="'+p.id+'">Produktark</button>');
  acts.push('<a class="lk-a" href="'+esc(p.u)+'" target="_blank" rel="noopener">Kjøp ↗</a>');
  return '<li class="lk-p"><img loading="lazy" src="'+esc(p.i)+'" alt=""><div><div class="lk-pn">'+esc(p.n)+'<small>'+(kr(p.sp||p.p)||'Pris på forespørsel')+'</small></div><div class="lk-acts">'+acts.join('')+'</div></div></li>';
}

function careRows(prods,s){
  if(prods.length>1||!window.PR)return '';
  const all=[...s.cat.values()],c=window.PR.complete(prods[0],all).filter(x=>[2396,3834,10820].includes(x.p.id)).slice(0,2);
  return c.map(x=>'<li class="lk-p lk-care"><img loading="lazy" src="'+esc(x.p.i)+'" alt=""><div><div class="lk-pn">'+esc(x.p.n)+'<small>'+esc(x.why)+'</small></div><div class="lk-acts"><a class="lk-a" href="'+esc(x.p.u)+'" target="_blank" rel="noopener">Kjøp ↗</a></div></div></li>').join('');
}
function card(l,s){
  const prods=l.products.map(id=>s.cat.get(id)).filter(Boolean),cover=prods[0];
  const fb=isFb(l),kind=fb?(l.kind==='video'?'Video':'Innlegg'):(l.kind==='reel'?'Reel':'Innlegg'),icon=fb?FB:IG;
  return '<article class="lk" id="look-'+esc(l.id)+'" data-code="'+esc(l.id)+'">'+
    '<div class="lk-media">'+(cover?'<img loading="lazy" src="'+esc(cover.i)+'" alt="">':'<div class="lk-empty">'+esc(l.title||'Fra @'+s.account)+'</div>')+
    '<span class="lk-badge">'+(fb?'Facebook':'Instagram')+' · '+kind+'</span>'+
    '<button class="lk-play" data-act="embed">'+icon+(l.kind==='reel'?'Spill av reelen':l.kind==='video'?'Spill av videoen':'Vis innlegget')+'</button></div>'+
    '<div class="lk-body">'+(l.title?'<h3 class="lk-title">'+esc(l.title)+'</h3>':'')+(l.text?'<p class="lk-text">'+esc(l.text)+'</p>':'')+
    (prods.length?'<ul class="lk-prods">'+prods.map(p=>productRow(p,s)).join('')+careRows(prods,s)+'</ul>':'<p class="lk-none">Produktene fra dette innlegget kommer snart. <a href="#kolleksjon">Se nettbutikken</a>.</p>')+
    '<div class="lk-foot"><button class="lk-a" data-act="share">Del</button><a class="lk-a lk-ig" href="'+esc(l.url)+'" target="_blank" rel="noopener">'+icon+'Åpne på '+(fb?'Facebook':'Instagram')+'</a></div>'+
    '</div></article>';
}

function embed(art){
  const media=art.querySelector('.lk-media');if(media.querySelector('iframe'))return;
  const l=state&&state.looks.find(x=>x.id===art.dataset.code),fb=l&&isFb(l);
  const f=document.createElement('iframe');f.loading='lazy';f.allow='autoplay; encrypted-media; picture-in-picture; clipboard-write';
  f.title=(fb?'Facebook':'Instagram')+'-innlegg fra Stenhuset';
  f.src=fb?'https://www.facebook.com/plugins/'+(l.kind==='video'?'video':'post')+'.php?show_text=true&width=500&href='+encodeURIComponent(l.url)
    :'https://www.instagram.com/p/'+encodeURIComponent(art.dataset.code)+'/embed/captioned/';
  media.append(f);media.querySelector('.lk-play').remove();
}

async function act(b,art){
  const a=b.dataset.act,id=Number(b.dataset.id),s=await data(),p=s.cat.get(id);
  if(a==='embed')return embed(art);
  if(a==='3d'&&typeof openSink3D==='function')return openSink3D(p);
  if(a==='sheet')return import('./product-sheet-v1.js?v=2').then(m=>m.open({id,product:p,on3D:typeof openSink3D==='function'?()=>openSink3D(p):undefined}));
  if(a==='room'&&window.PR&&window.PR.analyze(p).room)return window.PR.openInShowroom(p);
  if(a==='room'){
    const room=TABLE_IDS.has(id)?'stue':'bad';location.hash='#studio';
    for(let i=0;i<60&&!(window.Studio3D&&window.Studio3D.ready);i++)await new Promise(f=>setTimeout(f,120));
    const tab=document.querySelector('#room-tabs [data-room="'+room+'"]');if(tab&&window.getStudioState().room!==room)tab.click();
    const S3=window.Studio3D;if(S3)(room==='stue'?S3.setTable:S3.setSink).call(S3,id);return;
  }
  if(a==='share'){
    const l=s.looks.find(x=>x.id===art.dataset.code),url=BASE+'del.php?l='+encodeURIComponent(art.dataset.code);
    const title=(l&&l.title)||'Fra Stenhuset';
    if(navigator.share){navigator.share({title,url}).catch(()=>{});return;}
    try{await navigator.clipboard.writeText(url);b.textContent='Lenke kopiert';}catch(_){prompt('Kopier lenken',url);}
  }
}

export async function mount(root){
  styles();
  const grid=root.querySelector('.looks-grid');if(!grid||grid.dataset.ready)return;grid.dataset.ready='1';
  let s;try{s=await data();}catch(e){grid.innerHTML='<p class="lk-none">Kunne ikke laste innleggene.</p>';return;}
  const ig=root.querySelector('.looks-follow');if(ig)ig.href='https://www.instagram.com/'+encodeURIComponent(s.account)+'/';
  grid.innerHTML=s.looks.map(l=>card(l,s)).join('')||'<p class="lk-none">Ingen innlegg ennå.</p>';
  grid.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(b){e.preventDefault();act(b,b.closest('.lk'));}});
  focusFromHash();
}
export function focusFromHash(){
  const m=/[?&]look=([A-Za-z0-9_-]{5,40})/.exec(location.hash);if(!m)return;
  const art=document.getElementById('look-'+m[1]);if(!art)return;
  art.classList.add('hl');embed(art);setTimeout(()=>art.scrollIntoView({behavior:'smooth',block:'start'}),200);
}
