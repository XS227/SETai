/* Bestill på mål: Stenhusets made-to-measure page.
 * Strategy: the visitor arrives with a project, not a product. The page answers four questions in order:
 * "can they make my thing?" (what we make, with their own projects), "which stone?" (the real slabs on stock, each one
 * viewable as a countertop in 3D), "how does it work?" (five steps, from visit to installation), and "what do I do now?"
 * (a short request in four steps that collects what a stone specialist needs to quote without ten e-mails).
 * Content is Stenhusets own: texts from stenhuset.no/bestill-pa-mal, slab list and photos from that page, project photos
 * from their media library. Route: #bestill-pa-mal (and #bestill-pa-mal?skjema to jump to the request). */
const BASE=new URL('./',import.meta.url).href;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KINDS=[
  ['benkeplate','Benkeplate og bakvegg','Kjøkken og kjøkkenøy, med utsparing for kum og koketopp.','assets/projects/leilighet-marmor/03-s.jpg'],
  ['bad','Bad','Servantplate, dusjvegg, nisjer og vegger.','assets/projects/bad-travertin/01-s.jpg'],
  ['peis','Peis','Kledning og gulvplate i samme stein.','assets/projects/peis/02-s.jpg'],
  ['bord','Bordplate og pidestall','Spisebord, stuebord og sokler i massiv stein.','assets/projects/emperador-bord/01-s.jpg'],
  ['vinduskarm','Vinduskarm og trapp','Karmer, trinn og terskler kappet på mål.','assets/slabs/14-travertino-classico-slipt-2cm-s.jpg'],
  ['ute','Ute','Uteplass, trapper og murkrone.','assets/projects/uteplass-kalksten/01-s.jpg']
];
const STEPS=[
  ['Idé og stein','Se platene på lager i Oslo, eller design benkeplaten i 3D her.'],
  ['Befaring og oppmåling','Vi måler nøyaktig hjemme hos deg.'],
  ['Tilbud','Du får et tilbud på mål, stein, kanter og utsparinger.'],
  ['Produksjon i Oslo','Platen kappes og bearbeides i vår datastyrte produksjon på Fossum.'],
  ['Montering','Benkeplater monteres av oss.']
];
const FAQ=[
  ['Hva koster en benkeplate i natursten?','Prisen avhenger av stein, mål, tykkelse, kantprofil og utsparinger. Send en forespørsel med omtrentlige mål, så får du et tilbud. Endelige mål tas ved oppmåling.'],
  ['Må jeg måle selv?','Nei. Vi tilbyr befaring med nøyaktige målinger. Omtrentlige mål og et bilde av rommet hjelper oss å gi et første anslag.'],
  ['Tåler marmor å være på kjøkkenet?','Marmor og kalksten er kalkholdige og kan etses av syre (sitron, eddik, vin). Med impregnering og pH-nøytral rengjøring fungerer de godt, og får en levende patina. Ønsker du en mer motstandsdyktig overflate, spør oss om granitt og kvartsitt.'],
  ['2 eller 3 cm tykkelse?','2 cm gir et slankt, moderne uttrykk. 3 cm gir en kraftigere kant. Mange velger 2 cm og en tykkere synlig kant der det trengs. Vi hjelper deg å velge ut fra steinen og bruken.'],
  ['Kan jeg se platen før den kappes?','Ja. Hele plater står på lager i Oslo, så du kan se åretegningen i stort format før du bestemmer deg.']
];
let state={kinds:[],measure:'befaring',size:'',stone:'',slab:'',timeframe:'',config:null,photos:[]},slabs=[],filter='alle',step=0;

function styles(){
  if(document.getElementById('made-css'))return;
  const el=document.createElement('style');el.id='made-css';el.textContent=`
#pa-mal{padding-top:0}
.mm-hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:clamp(24px,4vw,56px);align-items:center;padding:clamp(28px,5vw,64px) 0 clamp(28px,4vw,48px)}
.mm-hero h1{font:400 clamp(36px,5.2vw,64px)/1.04 var(--serif);letter-spacing:-.02em;margin:14px 0 18px}
.mm-hero h1 i{color:var(--accent)}
.mm-lead{font-size:clamp(15px,1.4vw,17px);line-height:1.65;color:#4c4e4a;max-width:560px}
.mm-proof{display:flex;flex-wrap:wrap;gap:8px;margin:22px 0}
.mm-proof span{display:inline-flex;gap:8px;align-items:center;font:13px var(--sans);padding:8px 12px;background:var(--paper);border:1px solid var(--line)}
.mm-proof span::before{content:'';width:7px;height:7px;background:var(--accent);border-radius:50%}
.mm-cta{display:flex;flex-wrap:wrap;gap:10px}
.mm-b{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:14px 22px;font:14px var(--sans);border:1px solid var(--dark);background:var(--dark);color:#fff;cursor:pointer;text-decoration:none}
.mm-b.soft{background:transparent;color:inherit}
.mm-b.sm{min-height:40px;padding:9px 14px;font-size:12.5px}
.mm-photo{position:relative;margin:0}.mm-photo img{width:100%;aspect-ratio:4/5;object-fit:cover;display:block}
.mm-photo figcaption{position:absolute;left:12px;bottom:12px;background:#1d1c19c7;color:#fff;font:12px var(--sans);padding:7px 10px;max-width:80%}
.mm-sec{padding:clamp(34px,5vw,64px) 0;border-top:1px solid var(--line)}
.mm-sec h2{font:400 clamp(28px,3.4vw,42px)/1.1 var(--serif);margin:8px 0 10px}
.mm-sec>p.sub{max-width:640px;color:var(--mute);margin:0 0 24px}
.mm-kinds{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}
.mm-kind{border:1px solid var(--line);background:var(--paper);padding:0;text-align:left;cursor:pointer;color:inherit;font:inherit;display:flex;flex-direction:column}
.mm-kind img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
.mm-kind b{font:400 19px var(--serif);padding:12px 14px 2px}.mm-kind span{font-size:13px;color:var(--mute);padding:0 14px 14px}
.mm-kind[aria-pressed=true]{outline:2px solid var(--accent);outline-offset:-2px}
.mm-filters{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.mm-f{border:1px solid var(--line);background:transparent;padding:8px 13px;font:13px var(--sans);cursor:pointer;color:inherit}
.mm-f[aria-pressed=true]{background:var(--dark);color:#fff;border-color:var(--dark)}
.mm-slabs{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.mm-slab{background:var(--paper);border:1px solid var(--line);display:flex;flex-direction:column}
.mm-slab .im{position:relative;aspect-ratio:16/9;overflow:hidden;background:#d9d2c6}
.mm-slab .im img{width:100%;height:100%;object-fit:cover;display:block}
.mm-slab .n{position:absolute;right:8px;top:8px;background:#fffdfae8;font:11.5px var(--sans);padding:4px 8px}
.mm-slab .b{padding:12px 14px 14px;display:flex;flex-direction:column;gap:8px;flex:1}
.mm-slab h3{font:400 19px var(--serif);margin:0}.mm-slab small{color:var(--mute);font-size:12.5px}
.mm-slab .acts{display:flex;gap:6px;margin-top:auto;flex-wrap:wrap}
.mm-note{font-size:12px;color:var(--mute);margin-top:12px}
.mm-steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0;counter-reset:s;list-style:none;padding:0;margin:0}
.mm-steps li{position:relative;padding:22px 16px 0 0;border-top:2px solid var(--line);counter-increment:s}
.mm-steps li::before{content:counter(s,decimal-leading-zero);position:absolute;top:-13px;left:0;background:var(--cream);padding-right:8px;font:12px var(--sans);color:var(--accent);letter-spacing:.1em}
.mm-steps b{display:block;font:400 19px var(--serif);margin-bottom:6px}.mm-steps span{font-size:13.5px;color:#55574f}
.mm-form{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(260px,.75fr);gap:24px;align-items:start}
.mm-card{background:var(--paper);border:1px solid var(--line);padding:clamp(18px,3vw,30px)}
.mm-prog{display:flex;gap:6px;margin-bottom:18px}.mm-prog i{flex:1;height:3px;background:var(--line)}.mm-prog i.on{background:var(--accent)}
.mm-step h3{font:400 24px var(--serif);margin:0 0 6px}.mm-step>p{color:var(--mute);margin:0 0 16px;font-size:14px}
.mm-chips{display:flex;flex-wrap:wrap;gap:8px}
.mm-chip{border:1px solid var(--line);background:#fff;padding:10px 14px;font:13.5px var(--sans);cursor:pointer;color:inherit;min-height:44px}
.mm-chip[aria-pressed=true]{background:var(--dark);color:#fff;border-color:var(--dark)}
.mm-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.mm-fields .full{grid-column:1/-1}
.mm-fields label{display:flex;flex-direction:column;gap:5px;font-size:12.5px;color:var(--mute)}
.mm-fields input,.mm-fields select,.mm-fields textarea{font:15px var(--sans);color:var(--dark);border:1px solid var(--line);background:#fff;padding:11px 12px;min-height:46px;width:100%}
.mm-fields textarea{min-height:110px;resize:vertical}
.mm-nav{display:flex;justify-content:space-between;gap:10px;margin-top:20px}
.mm-err{color:#9a3a2a;font-size:13px;min-height:18px;margin-top:10px}
.mm-sum h4{font:400 20px var(--serif);margin:0 0 10px}.mm-sum dl{margin:0}.mm-sum div{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px}
.mm-sum dt{color:var(--mute)}.mm-sum dd{margin:0;text-align:right}
.mm-person{margin-top:16px;font-size:13px;color:#55574f;line-height:1.6}
.mm-thumbs{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.mm-thumbs img{width:72px;height:72px;object-fit:cover}
.mm-done{text-align:center;padding:30px 10px}.mm-done b{display:block;font:400 28px var(--serif);margin-bottom:8px}
.mm-faq details{border-top:1px solid var(--line);padding:16px 0}.mm-faq summary{cursor:pointer;font:400 19px var(--serif);list-style:none;display:flex;justify-content:space-between;gap:16px}
.mm-faq summary::after{content:'+';font:22px var(--sans);color:var(--accent)}.mm-faq details[open] summary::after{content:'–'}
.mm-faq p{color:#55574f;max-width:720px;margin:10px 0 0}
.mm-sticky{position:fixed;left:0;right:0;bottom:0;z-index:40;display:none;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:#fffdfaf2;border-top:1px solid var(--line);backdrop-filter:blur(8px)}
.mm-sticky .mm-b{flex:1;min-height:46px}
@media(max-width:900px){.mm-hero,.mm-form{grid-template-columns:1fr}.mm-photo img{aspect-ratio:4/3}.mm-steps{grid-template-columns:1fr;gap:18px}.mm-steps li{border-top:0;border-left:2px solid var(--line);padding:0 0 0 18px}.mm-steps li::before{position:static;display:block;background:none}}
@media(max-width:700px){body[data-view=custom] .mm-sticky{display:flex}body[data-view=custom]{padding-bottom:70px}.mm-fields{grid-template-columns:1fr}}`;
  document.head.append(el);
}

function page(){
  return `
  <div class="mm-hero">
    <div><div class="eyebrow">Bestill på mål · Egen produksjon i Oslo</div>
      <h1>Natursten skåret <i>etter ditt rom.</i></h1>
      <p class="mm-lead">Benkeplate og bakvegg i eksklusiv natursten, en bordplate i marmor, en pidestall i onyx eller en peis kledd i stein. Vi bearbeider steinplatene etter dine mål i vår datastyrte produksjon i Oslo, med rask leveringstid, inne som ute.</p>
      <div class="mm-proof"><span>Egen produksjon på Fossum</span><span>Befaring og nøyaktig oppmåling</span><span>Montering av benkeplater</span></div>
      <div class="mm-cta"><button class="mm-b" data-mm="design">Design benkeplaten i 3D</button><button class="mm-b soft" data-mm="form">Få tilbud på mål</button></div>
    </div>
    <figure class="mm-photo"><img src="${BASE}assets/projects/produksjon/01.jpg" alt="Marmorplate bearbeides i Stenhusets produksjon" loading="eager"><figcaption>Fra Stenhusets produksjon på Fossum</figcaption></figure>
  </div>

  <div class="mm-sec"><div class="eyebrow">Hva vil du lage?</div><h2>Alt kappet på mål.</h2>
    <p class="sub">Velg det som passer, så tar vi det med i forespørselen din. Bildene er fra prosjekter i Stenhusets natursten.</p>
    <div class="mm-kinds">${KINDS.map(k=>`<button class="mm-kind" data-kind="${k[0]}" aria-pressed="false"><img src="${BASE+k[3]}" alt="" loading="lazy"><b>${esc(k[1])}</b><span>${esc(k[2])}</span></button>`).join('')}</div>
    <p class="mm-note"><a href="#prosjekter">Se flere prosjekter ↗</a></p>
  </div>

  <div class="mm-sec" id="mm-lager"><div class="eyebrow">Plater på lager i Oslo</div><h2>Velg selve platen.</h2>
    <p class="sub">Hver plate er unik. Se dem som benkeplate i 3D med bildet av akkurat den platen, eller spør om den du liker.</p>
    <div class="mm-filters" role="group" aria-label="Filtrer plater"></div><div class="mm-slabs"></div>
    <p class="mm-note">Lagerlisten er hentet fra stenhuset.no og kan være endret. Vi bekrefter tilgjengelighet når du tar kontakt.</p>
  </div>

  <div class="mm-sec"><div class="eyebrow">Slik jobber vi</div><h2>Fra idé til montert plate.</h2>
    <ol class="mm-steps">${STEPS.map(s=>`<li><b>${esc(s[0])}</b><span>${esc(s[1])}</span></li>`).join('')}</ol>
  </div>

  <div class="mm-sec" id="mm-skjema"><div class="eyebrow">Forespørsel</div><h2>Fortell oss om prosjektet.</h2>
    <p class="sub">Fire korte steg. Du trenger ikke ha alle svarene, vi hjelper deg videre.</p>
    <div class="mm-form"><div class="mm-card" id="mm-steps"></div><aside class="mm-card mm-sum" id="mm-sum"></aside></div>
  </div>

  <div class="mm-sec mm-faq"><div class="eyebrow">Spørsmål og svar</div><h2>Godt å vite.</h2>
    ${FAQ.map(f=>`<details><summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`).join('')}
  </div>
  <div class="mm-sticky"><button class="mm-b soft" data-mm="design">3D</button><button class="mm-b" data-mm="form">Få tilbud på mål</button></div>`;
}

function slabCard(s){
  return `<article class="mm-slab"><div class="im"><img src="${BASE+esc(s.thumb)}" alt="Platen ${esc(s.name)}" loading="lazy"><span class="n">${s.count} ${s.count===1?'plate':'plater'}</span></div>
    <div class="b"><h3>${esc(s.name)}</h3><small>${esc(s.type)} · ${esc(s.finish.toLowerCase())} · ${Math.round(s.t*100)} cm</small>
    <div class="acts"><button class="mm-b sm" data-slab3d="${esc(s.id)}">Se som benkeplate i 3D</button><button class="mm-b sm soft" data-slabask="${esc(s.id)}">Spør om denne</button></div></div></article>`;
}
function drawSlabs(root){
  const types=['alle',...new Set(slabs.map(s=>s.type))];
  root.querySelector('.mm-filters').innerHTML=types.map(t=>`<button class="mm-f" data-sf="${esc(t)}" aria-pressed="${t===filter}">${t==='alle'?'Alle':esc(t)}</button>`).join('');
  root.querySelector('.mm-slabs').innerHTML=slabs.filter(s=>filter==='alle'||s.type===filter).map(slabCard).join('');
}

/* ---------- request in four steps ---------- */
const MEASURE=[['befaring','Jeg ønsker befaring og oppmåling'],['har-mal','Jeg har omtrentlige mål'],['usikker','Usikker']];
const TIME=['Så snart som mulig','Innen 1–3 måneder','Senere i år','Bare utforsker'];
function cm(c){return c?Math.round(c.L*100)+' × '+Math.round(c.D*100)+' × '+Math.round(c.t*100)+' cm':'';}
function summaryHTML(){
  const k=state.kinds.map(x=>(KINDS.find(y=>y[0]===x)||[0,x])[1]).join(', ')||'–';
  const slab=slabs.find(s=>s.id===state.slab);
  const rows=[['Hva',k],['Mål',state.config?cm(state.config):state.size||(MEASURE.find(m=>m[0]===state.measure)||[])[1]||'–'],['Stein',slab?slab.name+' (lager)':state.config&&state.config.slabName||state.stone||'Vil ha råd'],['Når',state.timeframe||'–']];
  if(state.config)rows.push(['Fra 3D-designer',[state.config.sink?'kum':'',state.config.hob?'koketopp':'',state.config.splash>0?'opplett':''].filter(Boolean).join(', ')||'uten utsparinger']);
  return `<h4>Din forespørsel</h4><dl>${rows.map(r=>`<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join('')}</dl>
    ${state.photos.length?`<div class="mm-thumbs">${state.photos.map(p=>`<img src="${p}" alt="">`).join('')}</div>`:''}
    <p class="mm-person">Forespørselen går til Stenhusets stenspesialist. Du kan også ringe eller skrive direkte: <a href="mailto:info@stenhuset.no">info@stenhuset.no</a>.</p>`;
}
function stepHTML(){
  const prog=`<div class="mm-prog">${[0,1,2,3].map(i=>`<i class="${i<=step?'on':''}"></i>`).join('')}</div>`;
  const nav=(back,next)=>`<div class="mm-err" role="alert"></div><div class="mm-nav">${back?'<button class="mm-b soft" data-nav="-1">Tilbake</button>':'<span></span>'}<button class="mm-b" data-nav="1">${next}</button></div>`;
  if(step===0)return prog+`<div class="mm-step"><h3>Hva vil du lage?</h3><p>Velg én eller flere.</p><div class="mm-chips">${KINDS.map(k=>`<button class="mm-chip" data-fk="${k[0]}" aria-pressed="${state.kinds.includes(k[0])}">${esc(k[1])}</button>`).join('')}<button class="mm-chip" data-fk="annet" aria-pressed="${state.kinds.includes('annet')}">Annet</button></div>${nav(false,'Neste')}</div>`;
  if(step===1)return prog+`<div class="mm-step"><h3>Mål</h3><p>${state.config?'Målene fra 3D-designeren er med. Du kan legge til mer under.':'Omtrentlige mål holder. Nøyaktige mål tar vi ved befaring.'}</p>
    <div class="mm-chips" style="margin-bottom:14px">${MEASURE.map(m=>`<button class="mm-chip" data-fm="${m[0]}" aria-pressed="${state.measure===m[0]}">${esc(m[1])}</button>`).join('')}</div>
    <div class="mm-fields"><label class="full">Mål og beskrivelse (valgfritt)<textarea data-ff="size" placeholder="F.eks. benkeplate 300 × 62 cm i L-form, kjøkkenøy 220 × 100 cm">${esc(state.size)}</textarea></label>
    <label class="full">Bilder av rommet eller en skisse (inntil 3)<input type="file" accept="image/*" multiple data-photos></label></div>${nav(true,'Neste')}</div>`;
  if(step===2)return prog+`<div class="mm-step"><h3>Stein</h3><p>Velg en plate fra lager, skriv ønsket stein, eller la oss foreslå.</p>
    <div class="mm-fields"><label class="full">Plate fra lager<select data-ff="slab"><option value="">Ingen bestemt plate</option>${slabs.map(s=>`<option value="${esc(s.id)}"${s.id===state.slab?' selected':''}>${esc(s.name)} · ${esc(s.type.toLowerCase())}, ${Math.round(s.t*100)} cm</option>`).join('')}</select></label>
    <label class="full">Eller ønsket stein / uttrykk<input data-ff="stone" value="${esc(state.stone)}" placeholder="F.eks. lys marmor med grå årer, eller «vil ha råd»"></label>
    <label class="full">Når vil du ha det?<select data-ff="timeframe"><option value="">Velg</option>${TIME.map(t=>`<option${t===state.timeframe?' selected':''}>${t}</option>`).join('')}</select></label></div>${nav(true,'Neste')}</div>`;
  return prog+`<div class="mm-step"><h3>Kontakt</h3><p>Vi svarer med forslag til befaring eller et første anslag.</p>
    <div class="mm-fields"><label>Navn<input data-ff="name" autocomplete="name" value="${esc(state.name||'')}"></label><label>Bedrift (valgfritt)<input data-ff="company" autocomplete="organization" value="${esc(state.company||'')}"></label>
    <label>E-post<input data-ff="email" type="email" autocomplete="email" value="${esc(state.email||'')}"></label><label>Telefon<input data-ff="phone" type="tel" autocomplete="tel" value="${esc(state.phone||'')}"></label>
    <label>Postnummer<input data-ff="postcode" inputmode="numeric" maxlength="4" autocomplete="postal-code" value="${esc(state.postcode||'')}"></label>
    <label class="full">Noe mer vi bør vite?<textarea data-ff="message">${esc(state.message||'')}</textarea></label>
    <label style="position:absolute;left:-5000px" aria-hidden="true">Nettside<input data-ff="website" tabindex="-1" autocomplete="off"></label></div>${nav(true,'Send forespørsel')}</div>`;
}
function render(root){root.querySelector('#mm-steps').innerHTML=stepHTML();root.querySelector('#mm-sum').innerHTML=summaryHTML();}
async function jpeg(file,max){
  const bmp=await createImageBitmap(file,{imageOrientation:'from-image'});const s=Math.min(1,max/Math.max(bmp.width,bmp.height));
  const c=document.createElement('canvas');c.width=Math.round(bmp.width*s);c.height=Math.round(bmp.height*s);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
  // three photos must fit in one request under the server's 1 MB limit
  let q=.8,u=c.toDataURL('image/jpeg',q);while(u.length>250000&&q>.4){q-=.08;u=c.toDataURL('image/jpeg',q);}return u;
}
async function send(root){
  const err=root.querySelector('.mm-err');
  if(!state.name||!(state.email||state.phone)){err.textContent='Skriv navn og e-post eller telefon.';return;}
  const b=root.querySelector('[data-nav="1"]');b.disabled=true;b.textContent='Sender …';
  try{
    const r=await fetch(BASE+'api/inquiry.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||('HTTP '+r.status));
    root.querySelector('#mm-steps').innerHTML=`<div class="mm-done"><b>Takk, ${esc(state.name.split(' ')[0])}!</b><p>Forespørselen er mottatt. Referanse: <strong>${esc(j.ref)}</strong>.<br>Stenhuset tar kontakt for å avtale befaring eller gi et første anslag.</p><p><a class="mm-b soft" href="#stein">Se steinbiblioteket mens du venter</a></p></div>`;
    try{sessionStorage.removeItem('mm-state');}catch(_){}
  }catch(e){err.textContent='Kunne ikke sende: '+e.message;b.disabled=false;b.textContent='Send forespørsel';}
}
function toForm(root){root.querySelector('#mm-skjema').scrollIntoView({behavior:'smooth',block:'start'});}
function openDesigner(slab){import('./countertop-v1.js?v=5').then(m=>m.open(slab?{slab}:{})).catch(()=>alert('3D-designeren kunne ikke lastes.'));}

let mounted=false;
export async function mount(root){
  styles();
  try{const saved=JSON.parse(sessionStorage.getItem('mm-state')||'null');if(saved)state={...state,...saved,photos:[]};}catch(_){}
  // a design sent from the 3D countertop designer
  try{const c=JSON.parse(sessionStorage.getItem('ct-quote')||'null');if(c){state.config=c;if(!state.kinds.includes('benkeplate'))state.kinds.push('benkeplate');state.measure='har-mal';if(c.slab)state.slab=c.slab;sessionStorage.removeItem('ct-quote');step=Math.max(step,1);}}catch(_){}
  if(!mounted){
    mounted=true;root.innerHTML=page();
    try{slabs=(await (await fetch(BASE+'slabs-seed-v1.json',{cache:'no-cache'})).json()).slabs;}catch(_){slabs=[];}
    drawSlabs(root);
    const save=()=>{try{const {photos,...rest}=state;sessionStorage.setItem('mm-state',JSON.stringify(rest));}catch(_){}};
    root.addEventListener('click',async e=>{
      const t=e.target.closest('[data-mm],[data-kind],[data-sf],[data-slab3d],[data-slabask],[data-fk],[data-fm],[data-nav]');if(!t)return;
      if(t.dataset.mm==='design')return openDesigner();
      if(t.dataset.mm==='form')return toForm(root);
      if(t.dataset.kind){const k=t.dataset.kind,on=!state.kinds.includes(k);state.kinds=on?[...state.kinds,k]:state.kinds.filter(x=>x!==k);t.setAttribute('aria-pressed',String(on));save();render(root);return;}
      if(t.dataset.sf){filter=t.dataset.sf;drawSlabs(root);return;}
      if(t.dataset.slab3d)return openDesigner(slabs.find(s=>s.id===t.dataset.slab3d));
      if(t.dataset.slabask){state.slab=t.dataset.slabask;if(!state.kinds.length)state.kinds=['benkeplate'];step=Math.max(step,2);save();render(root);toForm(root);return;}
      if(t.dataset.fk){const k=t.dataset.fk,on=!state.kinds.includes(k);state.kinds=on?[...state.kinds,k]:state.kinds.filter(x=>x!==k);root.querySelectorAll(`[data-kind="${k}"]`).forEach(b=>b.setAttribute('aria-pressed',String(on)));save();render(root);return;}
      if(t.dataset.fm){state.measure=t.dataset.fm;save();render(root);return;}
      if(t.dataset.nav){
        const d=+t.dataset.nav;
        if(d>0&&step===0&&!state.kinds.length){root.querySelector('.mm-err').textContent='Velg minst én ting.';return;}
        if(d>0&&step===3)return send(root);
        step=Math.max(0,Math.min(3,step+d));save();render(root);root.querySelector('#mm-steps').scrollIntoView({block:'nearest',behavior:'smooth'});
      }
    });
    root.addEventListener('input',e=>{const f=e.target.dataset.ff;if(f){state[f]=e.target.value;save();if(f!=='message'&&f!=='name'&&f!=='email'&&f!=='phone'&&f!=='company'&&f!=='postcode')root.querySelector('#mm-sum').innerHTML=summaryHTML();}});
    root.addEventListener('change',async e=>{
      if(e.target.dataset.photos===undefined)return;
      const files=[...e.target.files].slice(0,3);state.photos=[];
      for(const f of files){try{state.photos.push(await jpeg(f,1000));}catch(_){}}
      root.querySelector('#mm-sum').innerHTML=summaryHTML();
    });
  }
  render(root);
  root.querySelectorAll('[data-kind]').forEach(b=>b.setAttribute('aria-pressed',String(state.kinds.includes(b.dataset.kind))));
  if(/[?&]skjema/.test(location.hash))setTimeout(()=>toForm(root),250);
}
