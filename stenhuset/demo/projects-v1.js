/* Prosjektgalleri: finished work by Stenhuset, from their own photos. Each project shows its pictures, the stone,
 * the products used, and shortcuts: build something similar in the 3D showroom, a countertop in the same stone,
 * share, or ask Stenhuset. Data: api/projects.php (edited in projects-admin.html), seed projects-seed-v1.json.
 * Routes: #prosjekter, #prosjekter?p=<id> opens a project. */
const BASE=new URL('./',import.meta.url).href;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ROOM={bad:'Bad',kjokken:'Kjøkken',stue:'Stue',ute:'Uterom',produksjon:'Produksjon'};
const money=n=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:0}).format(n)+' kr';
let dataP=null;
async function getJSON(u){const r=await fetch(u,{cache:'no-cache'});if(!r.ok)throw new Error(r.status);return r.json();}
function data(){
  return dataP||(dataP=Promise.all([
    getJSON(BASE+'api/projects.php').catch(()=>getJSON(BASE+'projects-seed-v1.json')),
    getJSON(BASE+'catalog-v1.json').catch(()=>({products:[]}))
  ]).then(([p,c])=>({projects:(p.projects||[]).filter(x=>x.photos&&x.photos.length&&!x.hidden),cat:new Map(c.products.map(x=>[x.id,x]))})));
}
const src=f=>/^https?:/.test(f)?f:BASE+f;

function styles(){
  if(document.getElementById('pj-css'))return;
  const el=document.createElement('style');el.id='pj-css';el.textContent=`
.pj-filters{display:flex;flex-wrap:wrap;gap:6px;margin:22px 0 18px}
.pj-f{border:1px solid var(--line);background:transparent;padding:8px 13px;font:13px var(--sans);cursor:pointer;color:inherit}
.pj-f[aria-pressed=true]{background:var(--dark);color:#fff;border-color:var(--dark)}
.pj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:18px}
.pj-card{display:block;border:0;padding:0;background:none;text-align:left;cursor:pointer;color:inherit;font:inherit}
.pj-card .im{position:relative;aspect-ratio:4/5;overflow:hidden;background:#e6ddd1}
.pj-card img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .6s}
.pj-card:hover img{transform:scale(1.035)}
.pj-card .n{position:absolute;right:10px;top:10px;background:#242725c2;color:#fff;font:11px var(--sans);padding:4px 8px}
.pj-card h3{font:400 21px/1.2 var(--serif);margin:12px 0 4px}.pj-card small{color:var(--mute);font:12px var(--sans);letter-spacing:.05em;text-transform:uppercase}
.pj{border:0;padding:0;width:min(1180px,96vw);max-height:96dvh;background:var(--paper,#fffdfa);color:var(--dark,#242725);overflow:auto}
.pj::backdrop{background:#15130fcc;backdrop-filter:blur(3px)}
.pj-in{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,1fr)}
.pj-stage{position:relative;background:#1d1c19;min-height:300px;display:flex;flex-direction:column}
.pj-stage>img{width:100%;height:min(78dvh,760px);object-fit:contain;display:block}
.pj-nav{position:absolute;top:calc(50% - 40px);width:44px;height:52px;border:0;background:#fffdfae0;font-size:24px;cursor:pointer;color:#242725}
.pj-prev{left:10px}.pj-next{right:10px}
.pj-count{position:absolute;left:12px;top:12px;color:#fff;background:#0007;font:12px var(--sans);padding:4px 8px}
.pj-thumbs{display:flex;gap:6px;overflow-x:auto;padding:8px;background:#1d1c19}
.pj-thumbs button{flex:0 0 auto;width:62px;height:62px;padding:0;border:2px solid transparent;background:none;cursor:pointer;opacity:.65}
.pj-thumbs button[aria-current=true]{border-color:#fff;opacity:1}.pj-thumbs img{width:100%;height:100%;object-fit:cover;display:block}
.pj-info{padding:26px 26px 30px;display:flex;flex-direction:column;gap:14px}
.pj-x{position:sticky;top:0;align-self:flex-end;margin:-10px -10px 0 0;background:none;border:0;font:30px Arial;cursor:pointer;color:inherit;width:44px;height:44px}
.pj-info h2{font:400 clamp(26px,3vw,36px)/1.15 var(--serif);margin:0}
.pj-tags{display:flex;gap:6px;flex-wrap:wrap}.pj-tags span{font:11px var(--sans);letter-spacing:.06em;text-transform:uppercase;border:1px solid var(--line);padding:4px 8px;color:var(--mute)}
.pj-info p{margin:0;color:#4d4f4b;line-height:1.6}
.pj-prods{display:grid;gap:8px}.pj-p{display:grid;grid-template-columns:56px 1fr auto;gap:10px;align-items:center;border-top:1px solid var(--line);padding-top:8px}
.pj-p img{width:56px;height:56px;object-fit:cover}.pj-p small{display:block;color:var(--mute)}
.pj-acts{display:grid;gap:8px;margin-top:4px}
.pj-b{display:flex;align-items:center;justify-content:center;min-height:46px;padding:11px 14px;border:1px solid var(--dark);background:var(--dark);color:#fff;font:13px var(--sans);cursor:pointer;text-decoration:none;text-align:center}
.pj-b.soft{background:transparent;color:inherit;border-color:#c9bdab}
.pj-mini{border:1px solid var(--line);background:transparent;padding:6px 9px;font:11.5px var(--sans);cursor:pointer;color:inherit;text-decoration:none}
.pj-note{font-size:11px;color:var(--mute)}
@media(max-width:820px){.pj{width:100vw;max-height:100dvh;height:100dvh}.pj-in{display:block}.pj-stage>img{height:56dvh}.pj-x{position:absolute;right:8px;top:6px;margin:0;color:#fff;z-index:2}}`;
  document.head.append(el);
}

function cardHTML(p){
  const c=p.photos[p.cover||0]||p.photos[0];
  return `<button class="pj-card" data-p="${esc(p.id)}" aria-label="Åpne prosjektet ${esc(p.title)}"><div class="im"><img src="${esc(src(c.s||c.f))}" alt="" loading="lazy" decoding="async"><span class="n">${p.photos.length} ${p.photos.length===1?'bilde':'bilder'}</span></div><h3>${esc(p.title)}</h3><small>${p.rooms.map(r=>ROOM[r]||r).join(' · ')}</small></button>`;
}

let root=null,filter='alle';
export async function mount(el){
  styles();root=el;
  const grid=el.querySelector('.pj-grid');if(!grid)return;
  if(!grid.dataset.ready){
    grid.dataset.ready='1';
    let d;try{d=await data();}catch(e){grid.innerHTML='<p>Kunne ikke laste prosjektene.</p>';return;}
    const rooms=[...new Set(d.projects.flatMap(p=>p.rooms))];
    el.querySelector('.pj-filters').innerHTML=['alle',...Object.keys(ROOM).filter(r=>rooms.includes(r))].map(r=>`<button class="pj-f" data-f="${r}" aria-pressed="${r===filter}">${r==='alle'?'Alle':ROOM[r]}</button>`).join('');
    const draw=()=>{grid.innerHTML=d.projects.filter(p=>filter==='alle'||p.rooms.includes(filter)).map(cardHTML).join('');};
    draw();
    el.addEventListener('click',e=>{
      const f=e.target.closest('[data-f]');if(f){filter=f.dataset.f;el.querySelectorAll('[data-f]').forEach(b=>b.setAttribute('aria-pressed',String(b===f)));draw();return;}
      const c=e.target.closest('[data-p]');if(c)openProject(c.dataset.p);
    });
  }
  const m=/[?&]p=([a-z0-9-]{2,60})/.exec(location.hash);if(m)openProject(m[1]);
}

export async function openProject(id){
  styles();const d=await data(),p=d.projects.find(x=>x.id===id);if(!p)return;
  document.querySelector('dialog.pj')?.close();
  const prods=(p.products||[]).map(i=>d.cat.get(i)).filter(Boolean);
  const dlg=document.createElement('dialog');dlg.className='pj';dlg.setAttribute('aria-label',p.title);
  const st=p.stone&&p.stone[0]?'#stein?m='+encodeURIComponent(p.stone[0])+(p.stone[1]?'&f='+encodeURIComponent(p.stone[1]):''):'';
  dlg.innerHTML=`<div class="pj-in"><div class="pj-stage"><img alt="" decoding="async"><span class="pj-count"></span>
    ${p.photos.length>1?'<button class="pj-nav pj-prev" aria-label="Forrige bilde">‹</button><button class="pj-nav pj-next" aria-label="Neste bilde">›</button>':''}
    ${p.photos.length>1?'<div class="pj-thumbs">'+p.photos.map((ph,i)=>`<button data-i="${i}" aria-label="Bilde ${i+1}"><img src="${esc(src(ph.s||ph.f))}" alt="" loading="lazy"></button>`).join('')+'</div>':''}</div>
    <div class="pj-info"><button class="pj-x" aria-label="Lukk">×</button>
      <div class="pj-tags">${p.rooms.map(r=>'<span>'+esc(ROOM[r]||r)+'</span>').join('')}</div>
      <h2>${esc(p.title)}</h2><p>${esc(p.text)}</p>
      ${prods.length?'<div class="pj-prods"><b style="font:600 13px var(--sans)">Brukt i prosjektet</b>'+prods.map(x=>`<div class="pj-p"><img src="${esc(x.i)}" alt="" loading="lazy"><div>${esc(x.n)}<small>${x.p||x.sp?money(x.sp&&x.sp<x.p?x.sp:x.p):'Pris på forespørsel'}</small></div><button class="pj-mini" data-act="product" data-id="${x.id}">Se produkt</button></div>`).join('')+'</div>':''}
      <div class="pj-acts">
        ${p.studio?'<button class="pj-b" data-act="studio">Bygg lignende i 3D-showroomet</button>':''}
        ${p.countertop?'<button class="pj-b soft" data-act="top">Lag benkeplate i samme stein</button>':''}
        ${st?`<a class="pj-b soft" href="${st}" data-act="close">Les om steinen</a>`:''}
        <button class="pj-b soft" data-act="ask">Jeg vil ha noe lignende</button>
        <button class="pj-b soft" data-act="share">Del prosjektet</button>
      </div>
      <p class="pj-note">Bilder fra Stenhuset. Hvert stykke natursten er unikt; farge og åretegning varierer.</p>
    </div></div>`;
  document.body.append(dlg);
  let i=p.cover||0;const img=dlg.querySelector('.pj-stage>img'),cnt=dlg.querySelector('.pj-count');
  const show=k=>{i=(k+p.photos.length)%p.photos.length;const ph=p.photos[i];img.src=src(ph.f);img.alt=p.title+', bilde '+(i+1);cnt.textContent=(i+1)+' / '+p.photos.length;
    dlg.querySelectorAll('.pj-thumbs button').forEach((b,n)=>b.setAttribute('aria-current',String(n===i)));
    const pre=p.photos[(i+1)%p.photos.length];if(pre){const im=new Image();im.src=src(pre.f);}};
  show(i);
  dlg.querySelector('.pj-prev')?.addEventListener('click',()=>show(i-1));dlg.querySelector('.pj-next')?.addEventListener('click',()=>show(i+1));
  dlg.querySelector('.pj-thumbs')?.addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(b)show(+b.dataset.i);});
  dlg.addEventListener('keydown',e=>{if(e.key==='ArrowRight')show(i+1);if(e.key==='ArrowLeft')show(i-1);});
  let tx=null;img.addEventListener('touchstart',e=>{tx=e.touches.length===1?e.touches[0].clientX:null;},{passive:true});
  img.addEventListener('touchend',e=>{if(tx==null)return;const dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>45)show(i+(dx<0?1:-1));tx=null;},{passive:true});
  const close=()=>dlg.close();
  dlg.querySelector('.pj-x').onclick=close;dlg.addEventListener('click',e=>{if(e.target===dlg)close();});
  dlg.addEventListener('close',()=>{dlg.remove();if(/[?&]p=/.test(location.hash))history.replaceState(null,'','#prosjekter');},{once:true});
  dlg.addEventListener('click',async e=>{
    const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
    if(a==='close'){close();return;}
    if(a==='product'){close();if(typeof openProduct==='function')openProduct(+b.dataset.id);return;}
    if(a==='studio'){close();await toStudio(p.studio);return;}
    if(a==='top'){close();import('./countertop-v1.js?v=4').then(m=>m.open({stone:p.countertop}));return;}
    if(a==='ask'){close();if(typeof addItem==='function')addItem({kind:'project',id:'prosjekt-'+p.id,label:'Ønsker noe lignende som prosjektet «'+p.title+'»'});
      if(typeof showContact==='function')showContact();else location.hash='#kontakt';return;}
    if(a==='share'){
      const url=BASE+'del.php?pr='+encodeURIComponent(p.id);
      if(navigator.share){navigator.share({title:p.title+' | Stenhuset',url}).catch(()=>{});return;}
      try{await navigator.clipboard.writeText(url);b.textContent='Lenken er kopiert';}catch(_){prompt('Kopier lenken',url);}
    }
  });
  history.replaceState(null,'','#prosjekter?p='+p.id);
  dlg.showModal();dlg.querySelector('.pj-x').focus({preventScroll:true});
}

async function toStudio(s){
  location.hash='#studio';
  for(let k=0;k<60&&!(window.Studio3D&&window.Studio3D.ready&&window.getStudioState);k++)await new Promise(f=>setTimeout(f,120));
  const tab=document.querySelector('#room-tabs [data-room="'+s.room+'"]');if(tab&&window.getStudioState().room!==s.room)tab.click();
  const mats=window.getStudioMaterials?window.getStudioMaterials():[];
  for(const w of ['floor','wall']){if(!s[w])continue;const i=mats.findIndex(m=>m.id===s[w]);if(i>=0)window.setStudioMaterial(w,i);}
  const S3=window.Studio3D;if(!S3)return;
  if(s.fire&&S3.setFire)S3.setFire(s.fire);
  if(s.coffee&&S3.setCoffee)S3.setCoffee(s.coffee);
  if(s.top&&S3.setTop)S3.setTop(s.top);else if(!s.fire&&!s.coffee&&S3.update)S3.update();
}
