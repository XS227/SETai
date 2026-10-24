/* Stenhuset digital showroom: in-viewer UI (stone carousel, fullscreen, mini HUD).
 * Deliberately separate from the 3D engine (studio3d-v1.js) so the same UI layer can be reused in an app shell.
 * It talks to the page only through this contract:
 *   window.getStudioState()                 -> {floor,wall,room,light,w,l}
 *   window.getStudioMaterials()             -> [{i,id,name,plaster,pattern}]
 *   window.setStudioMaterial(which,index)   -> which: 'floor' | 'wall'
 * Room type and daylight are driven through the existing #room-tabs and #light-range controls. */
const shell=document.querySelector('.scene-shell');
if(shell&&typeof window.getStudioMaterials==='function'){
  const LABEL={floor:'Gulv',wall:'Vegg',sink:'Servant',table:'Bord',top:'Benkeplate',rug:'Teppe'};
  // each room only offers products that belong there
  const ROOM_TARGETS={bad:['floor','wall','sink'],stue:['floor','wall','table','rug'],kjokken:['floor','wall','top']};
  let target='floor',open=false,settleT=0,building=false;

  const css=document.createElement('style');
  css.textContent=`
.scene-shell:after{content:'';position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,transparent 55%,rgba(20,16,10,.28) 100%)}
.su-tools{position:absolute;left:14px;top:58px;z-index:9;display:flex;flex-direction:column;gap:8px}
.su-ib{width:44px;height:44px;border:0;background:#f7f5eee8;color:#242725;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .2s,color .2s}
.su-ib:hover,.su-ib.on{background:#242725;color:#fff}
.su-ib:focus-visible{outline:3px solid #af6f3b;outline-offset:2px}
.su-ib svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.su-dock{position:absolute;left:0;right:0;bottom:0;z-index:10;padding:14px 0 18px;background:linear-gradient(0deg,rgba(24,22,18,.92),rgba(24,22,18,.72) 70%,transparent);color:#fff;transform:translateY(105%);transition:transform .35s cubic-bezier(.2,.8,.2,1);pointer-events:none}
.su-dock.on{transform:none;pointer-events:auto}
.su-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 18px 10px;flex-wrap:wrap}
.su-seg{display:flex;gap:4px}
.su-seg button{border:1px solid #ffffff55;background:transparent;color:#fff;padding:8px 14px;font:700 10px/1 var(--sans,system-ui);letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
.su-seg button.on{background:#fff;color:#242725;border-color:#fff}
.su-name{font:400 22px var(--serif,Georgia,serif);text-align:center;flex:1;min-width:140px}
.su-name small{display:block;font:600 9px var(--sans,system-ui);letter-spacing:.16em;text-transform:uppercase;opacity:.65;margin-top:3px}
.su-close{border:0;background:transparent;color:#fff;font-size:26px;line-height:1;cursor:pointer;padding:4px 8px}
.su-track-wrap{position:relative}
.su-track{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:10px 50% 14px;scrollbar-width:none;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
.su-track::-webkit-scrollbar{display:none}
.su-card{flex:0 0 auto;width:96px;height:96px;scroll-snap-align:center;border:3px solid transparent;background:transparent;padding:0;cursor:pointer;opacity:.55;transform:scale(.82);transition:transform .25s,opacity .25s,border-color .25s;position:relative}
.su-card span{display:block;width:100%;height:100%;background:var(--slab);box-shadow:inset 0 0 0 1px #0002,0 6px 14px #0006}
.su-card.cur{opacity:1;transform:scale(1.12);border-color:#fff}
.su-card.cur::after{content:'';position:absolute;right:-7px;top:-7px;width:20px;height:20px;border-radius:50%;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5' fill='none' stroke='%23242725' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/14px no-repeat;box-shadow:0 2px 6px #0005}
.su-arr{position:absolute;top:50%;transform:translateY(-60%);z-index:2;width:38px;height:38px;border:1px solid #ffffff66;background:#00000066;color:#fff;font-size:18px;cursor:pointer}
.su-arr.l{left:10px}.su-arr.r{right:10px}
.studio-grid{grid-template-columns:1fr!important}.scene-shell{height:auto!important;min-height:clamp(470px,76vh,780px)!important}
.su-tools{flex-direction:column;flex-wrap:wrap;max-height:calc(100% - 130px);align-content:flex-start}
.su-ib.txt{width:auto;padding:0 14px;font:700 10px/1 var(--sans,system-ui);letter-spacing:.1em;text-transform:uppercase;gap:8px}
.su-pop{position:absolute;left:72px;top:58px;z-index:11;width:min(300px,calc(100% - 96px));background:#fcfaf6;color:#242725;padding:16px;box-shadow:0 12px 30px #0004;display:none}
.su-pop.on{display:block}
.su-pop h4{margin:0 0 10px;font:700 10px/1 var(--sans,system-ui);letter-spacing:.14em;text-transform:uppercase}
.su-pop .su-seg button{border:1px solid #cfc8bc;color:#242725;background:transparent}
.su-pop .su-seg button.on{background:#242725;color:#fff;border-color:#242725}
.su-pop input[type=range]{width:100%;accent-color:#8b775d}
.su-pop .two{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.su-pop label{font-size:11px;display:flex;flex-direction:column;gap:5px}
.su-pop input[type=number]{min-height:42px;padding:8px;border:1px solid #d8d2c8;background:#fff;font:inherit}
.su-bottom{position:absolute;right:14px;bottom:14px;z-index:9;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.su-sum{position:absolute;left:14px;bottom:14px;z-index:9;font:13px/1.25 var(--sans,system-ui)}
.su-sum>button{display:flex;flex-direction:column;align-items:flex-start;gap:1px;border:0;background:#f7f5eeeb;color:#242725;padding:8px 13px;cursor:pointer;backdrop-filter:blur(6px);box-shadow:0 4px 14px #0002;min-height:46px;justify-content:center}
.su-sum b{font:600 16px var(--sans,system-ui)}.su-sum small{font-size:10.5px;color:#6b6e69;letter-spacing:.02em}
.su-sum-p{position:absolute;left:0;bottom:calc(100% + 8px);width:min(300px,calc(100vw - 28px));background:#faf8f3;color:#242725;padding:12px 14px;box-shadow:0 10px 30px #0004}
.su-sum-p[hidden]{display:none}.su-sum-p div{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #e3ddd3;font-size:12.5px}
.su-sum-p div span:last-child{white-space:nowrap}.su-sum-p .tot{font-weight:600;border-bottom:0;font-size:14px}
.su-sum-p p{margin:6px 0 10px;font-size:11px;color:#6b6e69}.su-sum-p .acts{display:flex;gap:6px;border:0;padding:0}
.su-sum-p .acts button{flex:1;min-height:38px;border:1px solid #242725;background:#242725;color:#fff;font:12px var(--sans,system-ui);cursor:pointer}.su-sum-p .acts button+button{background:transparent;color:inherit}
@media(max-width:560px){.su-sum{bottom:72px}}
.su-dock.on~.su-sum{display:none}
.su-dsum{border:1px solid #ffffff55;background:transparent;color:#fff;font:12px var(--sans,system-ui);padding:6px 10px;margin-right:8px;cursor:pointer;white-space:nowrap}
.su-bottom .su-ib{height:46px}
.su-hud{position:absolute;left:14px;right:14px;top:14px;z-index:9;display:none;gap:10px;align-items:center;pointer-events:none}
.su-hud>*{pointer-events:auto}
.su-hud .su-seg button{background:#f7f5eee8;color:#242725;border:0}
.su-hud .su-seg button.on{background:#242725;color:#fff}
.su-hud input[type=range]{width:140px;accent-color:#c9a77a}
.su-hud .su-light{display:flex;align-items:center;gap:8px;background:#f7f5eee8;padding:8px 12px;color:#242725;font-size:13px}
.scene-shell.su-fs{position:fixed!important;inset:0;width:100vw!important;height:100dvh!important;min-height:0!important;z-index:2147483000}
.scene-shell:fullscreen{width:100vw!important;height:100vh!important;min-height:0!important}
.scene-shell.su-fs .su-hud,.scene-shell:fullscreen .su-hud{display:flex}
.scene-shell.su-fs .scene-tag,.scene-shell:fullscreen .scene-tag{display:none}
.scene-shell.su-fs .su-tools,.scene-shell:fullscreen .su-tools{top:70px}
.scene-shell.su-fs .scene-views,.scene-shell:fullscreen .scene-views{top:70px}
@media(max-width:700px){.su-tools{top:104px}.su-card{width:78px;height:78px}.su-name{font-size:18px}.su-hud .su-light input{width:90px}.scene-shell.su-fs .su-tools,.scene-shell:fullscreen .su-tools{top:114px}.scene-shell.su-fs .scene-views,.scene-shell:fullscreen .scene-views{top:64px}}
@media(prefers-reduced-motion:reduce){.su-dock,.su-card{transition:none}}`;
  document.head.appendChild(css);

  const ICON={
    stones:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg>',
    full:'<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    exit:'<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
    room:'<svg viewBox="0 0 24 24"><path d="M3 20V8l9-4 9 4v12M3 20h18M9 20v-6h6v6"/></svg>',
    sun:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>',
    share:'<svg viewBox="0 0 24 24"><path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7"/></svg>',
    cam:'<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    calc:'<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18"/><path d="M8 7h8M8 12h2M12 12h2M16 12h0M8 16h2M12 16h2"/></svg>'
  };
  const tools=document.createElement('div');tools.className='su-tools';
  tools.innerHTML=
    '<button type="button" class="su-ib" id="su-stones" aria-label="Bla gjennom steiner" aria-expanded="false" title="Bla gjennom steiner">'+ICON.stones+'</button>'+
    '<button type="button" class="su-ib" id="su-room" aria-label="Rom og størrelse" aria-expanded="false" title="Romtype og størrelse">'+ICON.room+'</button>'+
    '<button type="button" class="su-ib" id="su-light-b" aria-label="Dagslys" aria-expanded="false" title="Dagslys">'+ICON.sun+'</button>'+
    '<button type="button" class="su-ib" id="su-full" aria-label="Fullskjerm" title="Fullskjerm">'+ICON.full+'</button>';
  shell.appendChild(tools);
  const pop=document.createElement('div');pop.className='su-pop';pop.setAttribute('role','group');shell.appendChild(pop);
  const bottom=document.createElement('div');bottom.className='su-bottom';
  bottom.innerHTML='<button type="button" class="su-ib txt" id="su-try">'+ICON.cam+'Prøv i mitt rom</button><button type="button" class="su-ib txt" id="su-calc">'+ICON.calc+'Beregn materialpris</button><button type="button" class="su-ib txt" id="su-share">'+ICON.share+'Del</button>';
  shell.appendChild(bottom);

  const dock=document.createElement('div');dock.className='su-dock';dock.setAttribute('role','region');dock.setAttribute('aria-label','Steinvelger');
  dock.innerHTML=
    '<div class="su-head"><div class="su-seg" id="su-target"><button type="button" data-t="floor" class="on">Gulv</button><button type="button" data-t="wall">Vegg</button><button type="button" data-t="sink">Servant</button><button type="button" data-t="table">Bord</button><button type="button" data-t="top">Benkeplate</button><button type="button" data-t="rug">Teppe</button></div>'+
    '<div class="su-name" id="su-name" aria-live="polite"></div><button type="button" class="su-close" id="su-x" aria-label="Lukk steinvelger">×</button></div>'+
    '<div class="su-track-wrap"><button type="button" class="su-arr l" aria-label="Forrige stein">‹</button><div class="su-track" id="su-track" tabindex="0"></div><button type="button" class="su-arr r" aria-label="Neste stein">›</button></div>';
  shell.appendChild(dock);

  const hud=document.createElement('div');hud.className='su-hud';
  hud.innerHTML='<button type="button" class="su-ib" id="su-exit" aria-label="Avslutt fullskjerm" style="margin-left:auto">'+ICON.exit+'</button>';
  shell.appendChild(hud);

  const track=dock.querySelector('#su-track'),nameEl=dock.querySelector('#su-name');
  const btnStones=tools.querySelector('#su-stones'),btnFull=tools.querySelector('#su-full');

  // stenvasker (3D models of the shop's sinks): photos from the catalogue, models from sinks3d-v1.js via Studio3D
  let catMap=null;
  const loadCat=()=>{if(catMap)return;catMap=new Map();fetch('catalog-v1.json').then(r=>r.json()).then(d=>{d.products.forEach(p=>catMap.set(p.id,p));if(open&&target==='sink')render();window.dispatchEvent(new Event('studio:changed'));}).catch(()=>{});};
  const cmv=v=>String(Math.round(v*1000)/10).replace('.',',');
  const isModel=()=>target==='sink'||target==='table'||target==='top'||target==='rug';
  const modelList=()=>{
    const S3=window.Studio3D;
    if(target==='rug'){
      const RG=S3&&S3.rugs;if(!RG)return [];
      return [{id:'none',name:'Uten teppe',pattern:'linear-gradient(135deg,#efebe2,#d5cdbf)'}].concat(Object.entries(RG).map(([id,r])=>({id,name:r.n,rug:r,pattern:"url('"+S3.rugThumb(id)+"') center/cover"})));
    }
    if(target==='top'){
      const TS=S3&&S3.topStones;if(!TS)return [];
      return [{id:'0',name:'Samme stein som gulvet',pattern:'linear-gradient(135deg,#efebe2,#d5cdbf)'}].concat(TS.map(t=>({id:t.id,name:t.n,top:true,pattern:'linear-gradient(125deg,rgb('+t.c0.join(',')+') 0 55%,rgba('+t.c0.map(v=>Math.round(v*.82)).join(',')+') 56% 58%,rgb('+t.c0.join(',')+') 59%)'})));
    }
    const SK=S3&&(target==='sink'?S3.sinks:S3.tables);if(!SK)return [];
    return [{id:'0',name:target==='sink'?'Standard servant':'Uten bord',pattern:'linear-gradient(135deg,#f5f3ee,#d9d5cc)'}].concat(Object.entries(SK).map(([id,sp])=>{
      const p=catMap&&catMap.get(+id);return {id,name:sp.n,sp,pattern:p?"url('"+p.i+"') center/cover":'linear-gradient(135deg,#d8d2c6,#a9a294)'};}));
  };
  const sinkList=modelList;
  const list=()=>isModel()?modelList():window.getStudioMaterials().filter(m=>target==='wall'||!m.plaster);
  const current=()=>{
    if(target==='top'){const t=window.Studio3D&&window.Studio3D.getTop&&window.Studio3D.getTop();return t?t.stone:'0';}
    if(target==='rug')return String((window.Studio3D&&window.Studio3D.getRug&&window.Studio3D.getRug())||'none');
    if(target==='table')return String((window.Studio3D&&window.Studio3D.getTable&&window.Studio3D.getTable())||0);
    if(target==='sink')return String((window.Studio3D&&window.Studio3D.getSink&&window.Studio3D.getSink())||0);
    const s=window.getStudioState();return (target==='floor'?s.floor:s.wall).id;};
  const KIND={'bastide-beige':'Kalkstein','bastide-grey':'Kalkstein','provence-beige':'Kalkstein','provence-grey':'Kalkstein','carrara-c':'Marmor','calacatta-viola':'Marmor','zellige':'Håndlaget flis','terracotta':'Terracotta','kalkpuss-hvit':'Puss','leirpuss':'Puss'};

  function syncTargets(){
    const room=(window.getStudioState&&window.getStudioState().room)||'bad',ok=ROOM_TARGETS[room]||['floor','wall'];
    dock.querySelectorAll('#su-target [data-t]').forEach(b=>{b.hidden=!ok.includes(b.dataset.t);});
    if(!ok.includes(target)){target='floor';dock.querySelectorAll('#su-target [data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t==='floor'));}
  }
  function render(){
    syncTargets();
    building=true;
    track.innerHTML=list().map(m=>'<button type="button" class="su-card" data-id="'+m.id+'" data-i="'+(m.i==null?'':m.i)+'" title="'+m.name+'" aria-label="'+m.name+'"><span style="--slab:'+m.pattern+'"></span></button>').join('');
    markCurrent(true);building=false;
  }
  function markCurrent(center){
    const id=current();let el=null;
    track.querySelectorAll('.su-card').forEach(c=>{const on=c.dataset.id===id;c.classList.toggle('cur',on);if(on)el=c;});
    if(el){showName(el);if(center)track.scrollTo({left:el.offsetLeft+el.offsetWidth/2-track.clientWidth/2,behavior:'auto'});}
  }
  function showName(card){
    if(target==='rug'){const it=modelList().find(x=>x.id===card.dataset.id),R=it&&it.rug;nameEl.innerHTML=(it?it.name:'')+'<small>Teppe · stue · '+(R?R.size?R.size[1]*100+' × '+R.size[0]*100+' cm':'tilpasset rommet':'bare stein')+'</small>';return;}
    if(target==='top'){const it=modelList().find(x=>x.id===card.dataset.id);nameEl.innerHTML=(it?it.name:'')+'<small>Benkeplate · kjøkken og øy · '+(card.dataset.id==='0'?'som gulvet':'3 cm')+'</small>';return;}
    if(isModel()){const it=modelList().find(x=>x.id===card.dataset.id),sp=it&&it.sp;
      const dims=!sp?'':sp.kind==='round'?'Ø '+cmv(sp.R*2)+' × H '+cmv(sp.H)+' cm':cmv(sp.W)+' × '+cmv(sp.D)+' × '+cmv(sp.H)+' cm';
      nameEl.innerHTML=(it?it.name:'')+'<small>'+LABEL[target]+' · '+(dims||'standard')+'</small>';return;}
    const m=window.getStudioMaterials().find(x=>x.id===card.dataset.id);
    nameEl.innerHTML=(m?m.name:'')+'<small>'+LABEL[target]+' · '+(KIND[card.dataset.id]||'')+'</small>';
  }
  function centered(){
    const mid=track.scrollLeft+track.clientWidth/2;let best=null,bd=1e9;
    track.querySelectorAll('.su-card').forEach(c=>{const d=Math.abs(c.offsetLeft+c.offsetWidth/2-mid);if(d<bd){bd=d;best=c;}});
    return best;
  }
  function apply(card){
    if(!card)return;
    if(card.dataset.id!==current())applyNow(card);
    markCurrent(false);window.dispatchEvent(new Event('studio:changed'));
  }
  function applyNow(card){
    if(isModel()){
      const room=target==='sink'?'bad':target==='top'?'kjokken':'stue';
      if(target==='rug'){if(window.getStudioState().room!=='stue'){const tab=document.querySelector('#room-tabs [data-room="stue"]');if(tab)tab.click();}const S3=window.Studio3D;if(S3&&S3.setRug)S3.setRug(card.dataset.id);return;}
      if(window.getStudioState().room!==room){const tab=document.querySelector('#room-tabs [data-room="'+room+'"]');if(tab)tab.click();}
      const S3=window.Studio3D;if(S3){if(target==='sink'&&S3.setSink)S3.setSink(+card.dataset.id||null);if(target==='table'&&S3.setTable)S3.setTable(+card.dataset.id||null);if(target==='top'&&S3.setTop){const cur=S3.getTop&&S3.getTop();S3.setTop(card.dataset.id==='0'?null:{...(cur||{t:.03}),stone:card.dataset.id});}}
      return;
    }
    window.setStudioMaterial(target,+card.dataset.i);
  }
  function goto(card,smooth){
    if(!card)return;
    track.scrollTo({left:card.offsetLeft+card.offsetWidth/2-track.clientWidth/2,behavior:smooth?'smooth':'auto'});
  }
  function step(d){
    const cards=[...track.querySelectorAll('.su-card')],cur=cards.findIndex(c=>c.classList.contains('cur'));
    goto(cards[clampI(cur+d,0,cards.length-1)],true);
    apply(cards[clampI(cur+d,0,cards.length-1)]);
  }
  const clampI=(v,a,b)=>Math.min(b,Math.max(a,v));

  // browsing like a game: whatever settles in the centre of the track is applied live
  track.addEventListener('scroll',()=>{
    if(building)return;
    const c=centered();if(c){showName(c);track.querySelectorAll('.su-card.cur').forEach(x=>{if(x!==c)x.classList.remove('cur');});c.classList.add('cur');}
    clearTimeout(settleT);settleT=setTimeout(()=>{const k=centered();if(k)apply(k);},220);
  },{passive:true});
  track.addEventListener('click',e=>{const c=e.target.closest('.su-card');if(c){goto(c,true);apply(c);}});
  // vertical mouse wheel scrolls the track sideways
  track.addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){track.scrollLeft+=e.deltaY;e.preventDefault();}},{passive:false});
  track.addEventListener('keydown',e=>{
    if(e.key==='ArrowRight'){step(1);e.preventDefault();}
    else if(e.key==='ArrowLeft'){step(-1);e.preventDefault();}
  });
  dock.querySelector('.su-arr.l').onclick=()=>step(-1);
  dock.querySelector('.su-arr.r').onclick=()=>step(1);
  dock.querySelector('#su-target').addEventListener('click',e=>{
    const b=e.target.closest('[data-t]');if(!b)return;
    target=b.dataset.t;if(target==='sink'||target==='table')loadCat();dock.querySelectorAll('#su-target button').forEach(x=>x.classList.toggle('on',x===b));render();
  });
  function setOpen(v){
    open=v;dock.classList.toggle('on',v);btnStones.classList.toggle('on',v);btnStones.setAttribute('aria-expanded',v);
    if(v){render();setTimeout(()=>track.focus({preventScroll:true}),350);}
  }
  btnStones.onclick=()=>setOpen(!open);
  dock.querySelector('#su-x').onclick=()=>setOpen(false);

  // keep the carousel in sync when the page's own swatches change the material
  const sync=()=>{if(open&&!building){clearTimeout(settleT);markCurrent(false);const c=track.querySelector('.su-card.cur');if(c)goto(c,true);}};
  ['floor-swatches','wall-swatches'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('click',()=>setTimeout(sync,60));});

  // fullscreen (native where available, CSS fallback for iOS Safari)
  const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
  let fake=false;
  function syncHud(){
    const on=!!fsEl()||fake;
    btnFull.innerHTML=on?ICON.exit:ICON.full;btnFull.setAttribute('aria-label',on?'Avslutt fullskjerm':'Fullskjerm');
    if(popKind)renderPop(popKind);
  }
  async function enterFs(){
    const rq=shell.requestFullscreen||shell.webkitRequestFullscreen;
    if(rq){try{await rq.call(shell);}catch(e){fake=true;shell.classList.add('su-fs');}}
    else{fake=true;shell.classList.add('su-fs');}
    syncHud();
  }
  function exitFs(){
    if(fsEl()){(document.exitFullscreen||document.webkitExitFullscreen).call(document);}
    if(fake){fake=false;shell.classList.remove('su-fs');}
    syncHud();window.dispatchEvent(new Event('resize'));
  }
  btnFull.onclick=()=>((fsEl()||fake)?exitFs():enterFs());
  hud.querySelector('#su-exit').onclick=exitFs;
  ['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,()=>{syncHud();window.dispatchEvent(new Event('resize'));}));
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&fake)exitFs();});
  // popovers: room type + size, daylight. They drive the page's own (hidden) controls so all state stays in one place.
  let popKind=null;
  const real=id=>document.getElementById(id);
  function renderPop(kind){
    const st=window.getStudioState();
    if(kind==='room'){
      pop.innerHTML='<h4>Romtype</h4><div class="su-seg" id="su-rooms">'+[['bad','Bad'],['kjokken','Kjøkken'],['stue','Stue']].map(r=>'<button type="button" data-room="'+r[0]+'" class="'+(st.room===r[0]?'on':'')+'">'+r[1]+'</button>').join('')+
        '</div><div class="two"><label>Bredde (m)<input type="number" min="1" max="20" step=".5" inputmode="decimal" data-size="room-width" value="'+st.w+'"></label><label>Lengde (m)<input type="number" min="1" max="20" step=".5" inputmode="decimal" data-size="room-length" value="'+st.l+'"></label></div>'+
        '<p style="font-size:11.5px;margin:12px 0 0">Gulvareal: <strong>'+(st.w*st.l).toLocaleString('nb-NO',{maximumFractionDigits:2})+' m²</strong></p>';
    }else{
      pop.innerHTML='<h4>Dagslys · '+(st.light<40?'Kveld':st.light<70?'Ettermiddag':'Middag')+'</h4><div style="display:flex;gap:10px;align-items:center">☾<input type="range" min="15" max="100" value="'+st.light+'" data-light aria-label="Dagslys">☀</div>';
    }
  }
  function setPop(kind){
    popKind=popKind===kind?null:kind;
    pop.classList.toggle('on',!!popKind);tools.querySelector('#su-room').classList.toggle('on',popKind==='room');tools.querySelector('#su-light-b').classList.toggle('on',popKind==='light');
    tools.querySelector('#su-room').setAttribute('aria-expanded',popKind==='room');tools.querySelector('#su-light-b').setAttribute('aria-expanded',popKind==='light');
    if(popKind){if(open)setOpen(false);renderPop(popKind);}
  }
  tools.querySelector('#su-room').onclick=()=>setPop('room');
  tools.querySelector('#su-light-b').onclick=()=>setPop('light');
  pop.addEventListener('click',e=>{
    const b=e.target.closest('[data-room]');if(!b)return;
    const r=document.querySelector('#room-tabs [data-room="'+b.dataset.room+'"]');if(r)r.click();setTimeout(()=>renderPop('room'),40);
  });
  pop.addEventListener('input',e=>{
    const t=e.target;
    if(t.dataset.size){const r=real(t.dataset.size);if(r){r.value=t.value;r.dispatchEvent(new Event('input',{bubbles:true}));}}
    else if(t.dataset.light!==undefined){const r=real('light-range');if(r){r.value=t.value;r.dispatchEvent(new Event('input',{bubbles:true}));}
      const h=pop.querySelector('h4');if(h){const v=+t.value;h.textContent='Dagslys · '+(v<40?'Kveld':v<70?'Ettermiddag':'Middag');}}
  });
  btnStones.addEventListener('click',()=>{if(popKind)setPop(popKind);});
  document.addEventListener('click',e=>{if(e.target.closest('#room-tabs [data-room]'))setTimeout(()=>{syncTargets();if(open)render();},40);});
  bottom.querySelector('#su-calc').onclick=()=>{const b=real('scene-to-calc');if(b)b.click();};

  /* running total while you build: stone by m² (same rules as the price calculator: waste, at least 5 m², volume
   * discount) and the chosen product at the shop's price. Indicative, incl. VAT, before delivery. */
  const sum=document.createElement('div');sum.className='su-sum';
  sum.innerHTML='<div class="su-sum-p" hidden></div><button type="button" aria-expanded="false"><b>–</b><small>ca. totalt · se detaljer</small></button>';
  shell.appendChild(sum);
  // while the stone picker is open the total sits in its header
  const dsum=document.createElement('button');dsum.type='button';dsum.className='su-dsum';dsum.title='Se prisdetaljer';
  dock.querySelector('#su-x').before(dsum);
  dsum.onclick=()=>{setOpen(false);const p=sum.querySelector('.su-sum-p');p.hidden=false;sum.querySelector('button').setAttribute('aria-expanded','true');refreshSum();};
  const kr=n=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:0}).format(Math.round(n/10)*10)+' kr';
  const stonePrice=(m2,price)=>{const gross=m2*(1+((window.getStudioWaste&&window.getStudioWaste())||10)/100),ordered=Math.max(5,Math.ceil(gross)),disc=ordered>=60?30:ordered>=40?20:ordered>=20?10:0;return {ordered,total:ordered*price*(1-disc/100),disc};};
  function totals(){
    const st=window.getStudioState&&window.getStudioState();if(!st)return null;
    const mats=window.getStudioMaterials(),fm=mats.find(m=>m.id===st.floor.id),wm=mats.find(m=>m.id===st.wall.id),S3=window.Studio3D||{};
    const floorA=st.w*st.l,wallA=Math.max(0,2*(st.w+st.l)*2.7-3.6); // walls minus door and window
    const lines=[];
    if(fm&&fm.price){if(wm&&wm.id===fm.id&&wm.price){const r=stonePrice(floorA+wallA,fm.price);lines.push([fm.name+' · gulv og vegg, '+r.ordered+' m²'+(r.disc?' (−'+r.disc+' %)':''),r.total]);}
      else{const r=stonePrice(floorA,fm.price);lines.push([fm.name+' · gulv, '+r.ordered+' m²'+(r.disc?' (−'+r.disc+' %)':''),r.total]);}}
    if(wm&&wm.price&&!(fm&&wm.id===fm.id)){const r=stonePrice(wallA,wm.price);lines.push([wm.name+' · vegg, '+r.ordered+' m²'+(r.disc?' (−'+r.disc+' %)':''),r.total]);}
    else if(wm&&!wm.price)lines.push([wm.name+' · vegg','på forespørsel']);
    const prod=(id,label)=>{const p=catMap&&catMap.get(+id);if(p){const v=p.sp&&p.sp<p.p?p.sp:p.p;lines.push([p.n,v||'på forespørsel']);}else if(id)lines.push([label,'–']);};
    if(st.room==='bad'&&S3.getSink&&S3.getSink())prod(S3.getSink(),'Servant');
    if(st.room==='stue'&&S3.getTable&&S3.getTable())prod(S3.getTable(),'Bord');
    if(st.room==='kjokken'&&S3.getTop&&S3.getTop())lines.push(['Benkeplate på mål','på forespørsel']);
    return {lines,total:lines.reduce((a,l)=>a+(typeof l[1]==='number'?l[1]:0),0),ask:lines.some(l=>typeof l[1]!=='number')};
  }
  function refreshSum(){
    const t=totals();if(!t)return;
    const txt=(t.total?kr(t.total):'Pris på forespørsel')+(t.total&&t.ask?' +':'');
    sum.querySelector('b').textContent=txt;dsum.textContent='Ca. '+txt;
    const p=sum.querySelector('.su-sum-p');if(p.hidden)return;
    p.innerHTML=t.lines.map(l=>'<div><span>'+l[0]+'</span><span>'+(typeof l[1]==='number'?kr(l[1]):l[1])+'</span></div>').join('')+
      '<div class="tot"><span>Ca. totalt</span><span>'+kr(t.total)+(t.ask?' +':'')+'</span></div><p>Veiledende, inkl. mva., før levering. Vegg regnet som alle vegger minus dør og vindu.</p>'+
      '<div class="acts"><button type="button" data-sum="add">Legg i materiallisten</button><button type="button" data-sum="calc">Kalkulator</button></div>';
  }
  sum.querySelector('button').onclick=()=>{const p=sum.querySelector('.su-sum-p');p.hidden=!p.hidden;sum.querySelector('button').setAttribute('aria-expanded',String(!p.hidden));loadCat();refreshSum();};
  sum.addEventListener('click',e=>{
    const b=e.target.closest('[data-sum]');if(!b)return;
    if(b.dataset.sum==='calc'){const c=real('scene-to-calc');if(c)c.click();return;}
    const t=totals(),st=window.getStudioState();
    if(t&&typeof window.addItem==='function')window.addItem({kind:'estimate',id:'showroom-'+Date.now(),label:'Showroom ('+({bad:'bad',kjokken:'kjøkken',stue:'stue'}[st.room])+', '+st.w+' × '+st.l+' m): '+t.lines.map(l=>l[0]+' – '+(typeof l[1]==='number'?kr(l[1]):l[1])).join('; ')+'. Ca. '+kr(t.total)+' inkl. mva. (veiledende).'});
    sum.querySelector('.su-sum-p').hidden=true;
  });
  const later=()=>setTimeout(refreshSum,80);
  document.addEventListener('click',e=>{if(e.target.closest('#room-tabs [data-room],#floor-swatches,#wall-swatches,.su-card'))later();});
  document.addEventListener('input',e=>{if(e.target.closest('#room-width,#room-length,[data-size]'))later();});
  window.addEventListener('studio:changed',later);
  loadCat();setTimeout(refreshSum,400);
  // "Prøv i mitt rom" is loaded on demand: no camera code is downloaded until the customer asks for it.
  let tryP=null;
  const openTry=()=>{
    if(document.fullscreenElement)document.exitFullscreen&&document.exitFullscreen();
    tryP=tryP||import('./tryroom-v1.js?v=18');
    tryP.then(m=>m.open()).catch(err=>{console.warn('Prøv i mitt rom feilet:',err);tryP=null;alert('Funksjonen kunne ikke lastes. Sjekk tilkoblingen og prøv igjen.');});
  };
  bottom.querySelector('#su-try').onclick=openTry;
  // sharing: picture + link to exactly this setup; a shared link (#studio?oppsett=…) is restored on arrival
  const shareMod=()=>import('./share-v1.js?v=3');
  bottom.querySelector('#su-share').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen&&document.exitFullscreen();shareMod().then(m=>m.openShare()).catch(e=>{console.warn(e);alert('Deling kunne ikke lastes.');});};
  const restore=()=>{if(/[?&]oppsett=/.test(location.hash))shareMod().then(m=>m.restoreFromHash());};
  window.addEventListener('hashchange',restore);restore();
  document.querySelectorAll('[data-try-room]').forEach(b=>b.addEventListener('click',openTry));
  syncHud();
}
