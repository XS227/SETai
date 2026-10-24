/* Share a showroom setup: a picture of the room + a link that opens exactly the same setup.
 * The link goes through del.php so Facebook / Messenger / WhatsApp show a real preview (picture, room, stones).
 * Opening #studio?oppsett=<id> restores the setup. */
const API=new URL('./api/',import.meta.url).href,SITE=new URL('./',import.meta.url).href;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ROOM={bad:'Bad',kjokken:'Kjøkken',stue:'Stue'};
const ICON={
  share:'<svg viewBox="0 0 24 24"><path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7"/></svg>',
  link:'<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  down:'<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>'
};

export function collectState(){
  const st=window.getStudioState(),S3=window.Studio3D||{};
  const sink=S3.getSink&&S3.getSink(),table=S3.getTable&&S3.getTable(),top=S3.getTop&&S3.getTop();
  const names={floor:st.floor&&st.floor.name,wall:st.wall&&st.wall.name};
  if(st.room==='bad'&&sink&&S3.sinks&&S3.sinks[sink])names.sink=S3.sinks[sink].n;
  if(st.room==='stue'&&table&&S3.tables&&S3.tables[table])names.table=S3.tables[table].n;
  if(st.room==='kjokken'&&top&&S3.topStones){const t=S3.topStones.find(x=>x.id===top.stone);if(t)names.top=t.n;}
  return {room:st.room,floor:st.floor&&st.floor.id,wall:st.wall&&st.wall.id,light:st.light,
    sink:st.room==='bad'?sink||0:0,table:st.room==='stue'?table||0:0,top:st.room==='kjokken'?top||null:null,
    rug:S3.getRug?S3.getRug():'persisk',coffee:S3.getCoffee?S3.getCoffee()||'none':'',fire:S3.getFire?S3.getFire()||'none':'',kfloor:!!(S3.getKitchenFloor&&S3.getKitchenFloor()),splash:st.room==='kjokken'&&S3.getSplash?S3.getSplash()||'':'',view:S3.getView?S3.getView():'door',names};
}

/* 1200×630 (the size Facebook and Messenger use for link previews), with the room and stones written on it */
async function makeImage(state){
  // the 3D picture is copied in the same task as it is rendered; the logo is added after
  const src=window.Studio3D&&window.Studio3D.snapshot?window.Studio3D.snapshot():null;
  const c=document.createElement('canvas');c.width=1200;c.height=630;const x=c.getContext('2d');
  x.fillStyle='#e9e3da';x.fillRect(0,0,1200,630);
  if(src&&src.width){const s=Math.max(1200/src.width,630/src.height),w=src.width*s,h=src.height*s;x.drawImage(src,(1200-w)/2,(630-h)/2,w,h);}
  const W=await import('./watermark-v1.js?v=1');
  const g=x.createLinearGradient(0,400,0,630);g.addColorStop(0,'rgba(20,18,15,0)');g.addColorStop(1,'rgba(20,18,15,.72)');x.fillStyle=g;x.fillRect(0,380,1200,250);
  x.fillStyle='#fff';x.font='500 15px Arial, sans-serif';x.fillText('DIGITALT SHOWROOM',44,540);
  x.font='34px Georgia, serif';x.fillText('Mitt '+(ROOM[state.room]||'rom').toLowerCase(),44,582);
  const n=state.names,line=[n.floor&&'Gulv: '+n.floor,n.wall&&'Vegg: '+n.wall,n.sink||n.table||n.top].filter(Boolean).join('  ·  ');
  x.font='16px Arial, sans-serif';x.fillStyle='rgba(255,255,255,.88)';x.fillText(line.slice(0,80),44,610);
  await W.stamp(c,{corner:'br',size:.2});
  let q=.86,url=c.toDataURL('image/jpeg',q);
  while(url.length>820000&&q>.5){q-=.1;url=c.toDataURL('image/jpeg',q);}
  return {url,canvas:c};
}

function styles(){
  if(document.getElementById('shr-css'))return;
  const el=document.createElement('style');el.id='shr-css';el.textContent=`
.shr{border:0;padding:0;width:min(560px,94vw);max-height:94dvh;background:#faf7f1;color:#2f2b26;font:14px/1.5 Arial,sans-serif;overflow:auto}
.shr::backdrop{background:#15130fb3;backdrop-filter:blur(3px)}
.shr-head{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #e1d9cd}
.shr-head h3{margin:0;font:400 22px Georgia,serif}.shr-x{background:none;border:0;font:28px Arial;cursor:pointer;color:inherit;width:40px;height:40px}
.shr-img{display:block;width:100%;aspect-ratio:1200/630;object-fit:cover;background:#e9e3da}
.shr-body{padding:16px 20px 20px}.shr-status{min-height:20px;font-size:12px;color:#6f675c;margin:0 0 12px}
.shr-link{display:flex;gap:8px;margin-bottom:12px}.shr-link input{flex:1;min-width:0;border:1px solid #d6ccbe;background:#fff;padding:11px 12px;font:13px Arial;color:inherit}
.shr-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.shr-b{display:inline-flex;gap:8px;align-items:center;justify-content:center;min-height:46px;padding:10px 14px;border:1px solid #c9bdab;background:transparent;color:inherit;font:13px Arial;cursor:pointer;text-decoration:none}
.shr-b svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.shr-b.pri{background:#30382e;border-color:#30382e;color:#fff;grid-column:1/-1}.shr-b[aria-disabled=true]{opacity:.45;pointer-events:none}
.shr-note{font-size:11px;color:#7a7266;margin:12px 0 0}
.shr-banner{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:60;background:#2f2b26;color:#fff;padding:12px 14px 12px 18px;display:flex;gap:12px;align-items:center;font:13px Arial;box-shadow:0 10px 30px #0004;max-width:calc(100vw - 32px)}
.shr-banner button{background:#fff;color:#2f2b26;border:0;padding:8px 12px;font:12px Arial;cursor:pointer}`;
  document.head.append(el);
}

export async function openShare(){
  styles();
  const state=collectState(),{url:img}=await makeImage(state);
  const d=document.createElement('dialog');d.className='shr';d.setAttribute('aria-label','Del oppsettet');
  d.innerHTML=`<div class="shr-head"><h3>Del oppsettet ditt</h3><button class="shr-x" aria-label="Lukk">×</button></div>
  <img class="shr-img" src="${img}" alt="Bilde av oppsettet">
  <div class="shr-body"><p class="shr-status" role="status">Lager delingslenke …</p>
  <div class="shr-link"><input readonly aria-label="Delingslenke" value=""><button class="shr-b" data-a="copy" aria-disabled="true">${ICON.link}Kopier</button></div>
  <div class="shr-grid">
    <button class="shr-b pri" data-a="native" aria-disabled="true">${ICON.share}Del …</button>
    <a class="shr-b" data-a="fb" target="_blank" rel="noopener" aria-disabled="true">Facebook</a>
    <a class="shr-b" data-a="msg" aria-disabled="true">Messenger</a>
    <a class="shr-b" data-a="wa" target="_blank" rel="noopener" aria-disabled="true">WhatsApp</a>
    <a class="shr-b" data-a="mail" aria-disabled="true">E-post</a>
    <a class="shr-b" data-a="dl" download="stenhuset-oppsett.jpg" href="${img}" style="grid-column:1/-1">${ICON.down}Last ned bilde (til Instagram-story)</a>
  </div>
  <p class="shr-note">Lenken åpner nøyaktig dette rommet, med samme stein, produkter og lys. Den som får lenken kan endre videre og dele sitt eget.</p></div>`;
  document.body.append(d);d.showModal();
  const $=s=>d.querySelector(s),status=$('.shr-status');
  $('.shr-x').onclick=()=>d.close();d.addEventListener('close',()=>d.remove(),{once:true});
  d.addEventListener('click',e=>{if(e.target===d)d.close();});
  let link='';
  try{
    const r=await fetch(API+'share.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state,image:img})});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||('HTTP '+r.status));
    link=j.url;
  }catch(e){
    // no server (or offline): still shareable as a plain link to the showroom
    link=SITE+'#studio';status.textContent='Kunne ikke lagre oppsettet ('+e.message+'). Du kan fortsatt laste ned bildet.';
  }
  if(link&&!status.textContent.startsWith('Kunne'))status.textContent='Lenken er klar.';
  const title='Mitt '+(ROOM[state.room]||'rom').toLowerCase()+' i Stenhusets showroom',u=encodeURIComponent(link);
  $('.shr-link input').value=link;
  $('[data-a=fb]').href='https://www.facebook.com/sharer/sharer.php?u='+u;
  $('[data-a=msg]').href=/Android|iPhone|iPad/i.test(navigator.userAgent)?'fb-messenger://share/?link='+u:'https://www.facebook.com/sharer/sharer.php?u='+u;
  $('[data-a=wa]').href='https://wa.me/?text='+encodeURIComponent(title+' '+link);
  $('[data-a=mail]').href='mailto:?subject='+encodeURIComponent(title)+'&body='+encodeURIComponent('Se rommet jeg har satt opp hos Stenhuset:\n'+link);
  d.querySelectorAll('[aria-disabled]').forEach(b=>b.removeAttribute('aria-disabled'));
  if(!navigator.share)$('[data-a=native]').hidden=true;
  $('[data-a=copy]').onclick=async()=>{try{await navigator.clipboard.writeText(link);}catch(_){$('.shr-link input').select();document.execCommand&&document.execCommand('copy');}status.textContent='Lenken er kopiert.';};
  $('[data-a=native]').onclick=async()=>{
    const data={title,text:title,url:link};
    try{const blob=await (await fetch(img)).blob(),file=new File([blob],'stenhuset-oppsett.jpg',{type:'image/jpeg'});
      if(navigator.canShare&&navigator.canShare({files:[file]}))data.files=[file];}catch(_){}
    try{await navigator.share(data);}catch(e){if(e.name!=='AbortError'){delete data.files;navigator.share(data).catch(()=>{});}}
  };
}

/* ---------- restore a shared setup ---------- */
export async function applyState(s){
  const tab=document.querySelector('#room-tabs [data-room="'+s.room+'"]');
  if(tab&&window.getStudioState().room!==s.room)tab.click();
  // shop products tried in the showroom (stone ids p-<product id>) are registered before they can be picked
  for(const id of [s.floor,s.wall,s.splash])if(/^p-\d+$/.test(id||'')&&window.ensureProductStone)await window.ensureProductStone(id).catch(()=>{});
  const mats=window.getStudioMaterials(),fi=mats.findIndex(m=>m.id===s.floor),wi=mats.findIndex(m=>m.id===s.wall);
  if(fi>=0)window.setStudioMaterial('floor',fi);if(wi>=0)window.setStudioMaterial('wall',wi);
  const r=document.getElementById('light-range');if(r&&s.light){r.value=s.light;r.dispatchEvent(new Event('input',{bubbles:true}));}
  const S3=window.Studio3D;
  if(S3){
    if(s.room==='bad'&&S3.setSink)S3.setSink(s.sink||null);
    if(s.room==='stue'&&S3.setTable)S3.setTable(s.table||null);
    if(s.room==='kjokken'&&S3.setTop)S3.setTop(s.top||null);
    if(s.room==='stue'&&s.rug&&S3.setRug)S3.setRug(s.rug);
    if(s.room==='stue'&&s.coffee&&S3.setCoffee)S3.setCoffee(s.coffee==='none'?null:s.coffee);
    if(s.room==='stue'&&s.fire&&S3.setFire)S3.setFire(s.fire==='none'?null:s.fire);
    if(s.room==='kjokken'&&S3.setKitchenFloor)S3.setKitchenFloor(!!s.kfloor);
    if(s.room==='kjokken'&&S3.setSplash)S3.setSplash(s.splash||null);
    if(s.view&&S3.goView)setTimeout(()=>S3.goView(s.view),300);
  }
}
function banner(){
  styles();if(document.querySelector('.shr-banner'))return;
  const b=document.createElement('div');b.className='shr-banner';b.setAttribute('role','status');
  b.innerHTML='<span>Du ser et delt oppsett. Endre stein og produkter som du vil.</span><button type="button">OK</button>';
  b.querySelector('button').onclick=()=>b.remove();document.body.append(b);setTimeout(()=>b.remove(),9000);
}
let loaded='';
export async function restoreFromHash(){
  const m=/[?&]oppsett=([A-Za-z0-9]{8})/.exec(location.hash);if(!m||m[1]===loaded)return;loaded=m[1];
  try{
    const r=await fetch(API+'share.php?id='+m[1]);if(!r.ok)throw new Error('HTTP '+r.status);const s=await r.json();
    for(let i=0;i<60&&!(window.Studio3D&&window.Studio3D.ready&&window.getStudioState);i++)await new Promise(f=>setTimeout(f,150));
    await applyState(s);banner();
  }catch(e){console.warn('Delt oppsett kunne ikke lastes',e);}
}
export {esc};
