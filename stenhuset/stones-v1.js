/* Steinbibliotek: one page per stone type, built from the shop's own categories and product names (catalog-v1.json),
 * so it follows the catalog. Each page: what the stone is, colours and finishes that exist in the shop, the stone
 * families (Carrara, Calacatta …) as filters, every product, and a shortcut into the 3D showroom.
 * Routes: #stein (overview) and #stein?m=<material>&f=<family>. */
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const COLOURS={42:'Hvit',46:'Beige',68:'Beige',43:'Grå',69:'Grå',44:'Sort',82:'Sort',45:'Grønn',95:'Rød',106:'Rosa'};
const FINISH=[['polert','Polert'],['silkematt','Silkematt'],['honed','Silkematt'],['børstet','Børstet'],['tromlet','Tromlet'],['antikk','Antikk'],['antique','Antikk'],['sandblåst','Sandblåst'],['flammet','Flammet'],['slipt','Slipt'],['håndhugget','Håndhugget'],['glasert','Glasert']];
/* material groups: shop categories (c) and/or name words (w); studio = stone id in the 3D showroom; general text only */
const MATERIALS=[
  {id:'marmor',n:'Marmor',c:[22],w:/marmor|carrara|calacatta|arabescato|statuario|bardiglio|viola|levanto|bottocino|nero|verde alpi|breccia|biancone|thasos/i,studio:'carrara-c',
   t:'Marmor er kalkstein som er omdannet under trykk og varme. Det gir årene, dybden og lyset som gjør marmor så gjenkjennelig. Polert marmor får glans og dyp farge, mens silkematt og børstet gir et roligere uttrykk og et mindre glatt gulv.',
   care:'Marmor er kalkholdig og tåler ikke syre (sitron, eddik, vin). Impregner flatene og vask med pH-nøytralt middel.',
   fam:[['Carrara',/carrara/i,'carrara-c'],['Calacatta',/calacatta|viola/i,'calacatta-viola'],['Arabescato',/arabescato/i],['Statuario',/statuario/i],['Bardiglio',/bardiglio/i],['Nero',/nero|noir|sort marmor/i],['Verde',/verde/i],['Rosso',/rosso|levanto/i],['Breccia',/breccia/i]]},
  {id:'kalksten',n:'Kalksten',c:[17],w:/kalksten|bastide|provence|belgian blue/i,studio:'bastide-beige',
   t:'Kalksten er en sedimentær stein med rolig, jevn struktur og myke, naturlige farger fra lys beige til grå. Den gir et varmt og stille uttrykk, og passer på gulv og vegg i både bad, kjøkken og stue.',
   care:'Kalksten er porøs og kalkholdig: impregner før bruk og vask med pH-nøytralt middel.',
   fam:[['Bastide',/bastide/i,'bastide-beige'],['Provence',/provence/i,'provence-beige'],['Belgian blue',/belgian/i]]},
  {id:'travertin',n:'Travertin',c:[],w:/travertin/i,
   t:'Travertin er en kalkstein dannet ved kilder. De naturlige porene og de vannrette lagene gir et levende, varmt uttrykk. Overflaten kan være fylt og slipt, eller hugget for hånd.',
   care:'Impregner travertin og vask med pH-nøytralt middel. Unngå syreholdige rengjøringsmidler.'},
  {id:'terracotta',n:'Terracotta',c:[23],w:/terracotta|cotto/i,studio:'terracotta',
   t:'Terracotta er brent leire. Den varme, jordnære fargen og den levende overflaten gjør den til et klassisk gulv i sydlandske og nordiske hjem.',
   care:'Terracotta suger opp væske og må impregneres eller behandles før bruk.'},
  {id:'terrazzo',n:'Terrazzo',c:[81],w:/terrazzo/i,
   t:'Terrazzo er biter av marmor og stein støpt i et bindemiddel og slipt flatt. Resultatet er et slitesterkt gulv med et tydelig, grafisk mønster.',
   care:'Vask med pH-nøytralt middel. Følg Stenhusets anbefaling for impregnering.'},
  {id:'handlaget',n:'Zellige og håndlagde fliser',c:[29,36,49,50,51,53],w:/zellige/i,studio:'zellige',
   t:'Håndlagde fliser har små ujevnheter, varierende glasur og myke kanter. Lyset spiller i overflaten, og ingen flis er helt lik den neste. Zellige kommer tradisjonelt fra Marokko.',
   care:'Glaserte fliser vaskes med mildt, pH-nøytralt middel. Fugene bør impregneres.'},
  {id:'uterom',n:'Sten til uterom',c:[117],w:null,
   t:'Sten til terrasse, gangvei og uteplass. Spør Stenhuset om frostbestandighet, tykkelse og sklisikker overflate for ditt prosjekt.',
   care:'Rengjøring og eventuell impregnering avhenger av steinen. Spør Stenhuset.'}
];
let catP=null;const cat=()=>catP||(catP=fetch(new URL('./catalog-v1.json',import.meta.url)).then(r=>r.json()));
const inMat=(m,p)=>(m.c.length&&m.c.some(c=>p.c.includes(c)))||(m.w&&m.w.test(p.n));
const finishes=list=>[...new Set(list.flatMap(p=>FINISH.filter(([k])=>p.n.toLowerCase().includes(k)).map(f=>f[1])))];
const colours=list=>{const n={};list.forEach(p=>p.c.forEach(c=>{if(COLOURS[c])n[COLOURS[c]]=(n[COLOURS[c]]||0)+1;}));return Object.entries(n).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);};
const money=n=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:0}).format(n)+' kr';
const price=p=>!p.p&&!p.sp?'Pris på forespørsel':p.sp&&p.sp<p.p?'<del>'+money(p.p)+'</del> <ins>'+money(p.sp)+'</ins>':money(p.p);

function styles(){
  if(document.getElementById('stones-css'))return;
  const el=document.createElement('style');el.id='stones-css';el.textContent=`
.sb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:18px;margin-top:26px}
.sb-card{position:relative;display:block;aspect-ratio:4/5;overflow:hidden;color:#fff;text-decoration:none;background:#cfc4b4}
.sb-card img{width:100%;height:100%;object-fit:cover;transition:transform .6s}.sb-card:hover img{transform:scale(1.04)}
.sb-card span{position:absolute;inset:auto 0 0 0;padding:60px 18px 18px;background:linear-gradient(transparent,#1d1b18c7);font:400 25px/1.15 var(--serif)}
.sb-card small{display:block;font:12px var(--sans);letter-spacing:.06em;opacity:.85;margin-top:6px;text-transform:uppercase}
.sb-back{display:inline-block;margin-bottom:18px;color:inherit;font:13px var(--sans)}
.sb-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:34px;align-items:start}
.sb-hero img{width:100%;aspect-ratio:4/5;object-fit:cover;display:block}
.sb-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--line);border:1px solid var(--line);margin:22px 0}
.sb-facts div{background:var(--paper);padding:12px 14px;font-size:13px}.sb-facts b{display:block;font:400 22px var(--serif)}
.sb-care{border-left:2px solid var(--accent);padding:4px 0 4px 14px;color:var(--mute);font-size:14px;margin:18px 0}
.sb-chips{display:flex;flex-wrap:wrap;gap:6px;margin:16px 0}
.sb-chip{border:1px solid var(--line);background:transparent;padding:8px 12px;font:13px var(--sans);cursor:pointer;color:inherit}
.sb-chip[aria-pressed=true]{background:var(--dark);color:#fff;border-color:var(--dark)}
.sb-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.sb-btn{display:inline-flex;align-items:center;min-height:46px;padding:12px 18px;border:1px solid var(--dark);background:var(--dark);color:#fff;font:13px var(--sans);cursor:pointer;text-decoration:none}
.sb-btn.soft{background:transparent;color:inherit;border-color:var(--line)}
.sb-products{margin-top:30px}
.sb-count{color:var(--mute);font-size:13px}
@media(max-width:760px){.sb-hero{grid-template-columns:1fr}.sb-hero img{aspect-ratio:4/3}.sb-facts{grid-template-columns:1fr 1fr}}`;
  document.head.append(el);
}

function card(p){
  const s3=typeof SINK3D!=='undefined'&&SINK3D.has(p.id);
  return `<article class="product"><div class="product-img" role="button" tabindex="0" data-sb="detail" data-id="${p.id}" aria-label="Vis ${esc(p.n)}">${s3?'<span class="product-3d">3D</span>':''}<img src="${esc(p.i)}" alt="${esc(p.n)}" loading="lazy" decoding="async"></div><div class="product-body"><h3>${esc(p.n)}</h3><div class="product-foot"><span class="price">${price(p)}</span>${s3?`<button class="tiny-btn" data-sb="3d" data-id="${p.id}">3D</button>`:''}<button class="tiny-btn" data-sb="add" data-id="${p.id}">+ Legg til</button></div></div></article>`;
}

function overview(root,d){
  const cards=MATERIALS.map(m=>{const list=d.products.filter(p=>inMat(m,p));if(!list.length)return '';
    const cover=list.find(p=>p.i)||{};return `<a class="sb-card" href="#stein?m=${m.id}"><img src="${esc(cover.i)}" alt="" loading="lazy"><span>${esc(m.n)}<small>${list.length} produkter</small></span></a>`;}).join('');
  root.innerHTML=`<div class="eyebrow">Steinbibliotek</div><h2 class="section-title">Bli kjent med <i>steinen.</i></h2><p class="sub">Hva steinen er, hvordan den oppfører seg, og alt Stenhuset har i den, samlet på ett sted.</p><div class="sb-grid">${cards}</div>`;
}

function detail(root,d,mid,fam){
  const m=MATERIALS.find(x=>x.id===mid);if(!m)return overview(root,d);
  const all=d.products.filter(p=>inMat(m,p)),fams=(m.fam||[]).map(f=>({n:f[0],re:f[1],studio:f[2],k:all.filter(p=>f[1].test(p.n)).length})).filter(f=>f.k>0);
  const F=fams.find(f=>f.n.toLowerCase()===String(fam||'').toLowerCase()),list=F?all.filter(p=>F.re.test(p.n)):all;
  const cover=(F?list:all).find(p=>p.i)||{},studio=(F&&F.studio)||m.studio,fin=finishes(list),col=colours(list);
  root.innerHTML=`<a class="sb-back" href="#stein">← Alle steintyper</a>
  <div class="sb-hero"><img src="${esc(cover.i)}" alt="${esc(cover.n||m.n)}"><div>
    <div class="eyebrow">Steinbibliotek</div><h2 class="section-title">${esc(F?F.n:m.n)}</h2>
    <p class="sub">${esc(m.t)}</p>
    <div class="sb-facts"><div><b>${list.length}</b>produkter</div><div><b>${col.length||'–'}</b>${col.slice(0,3).join(', ')||'farger'}</div><div><b>${fin.length||'–'}</b>${fin.slice(0,3).join(', ')||'overflater'}</div></div>
    <p class="sb-care">${esc(m.care)}</p>
    ${fams.length>1?`<div class="sb-chips" role="group" aria-label="Steinfamilier"><button class="sb-chip" data-fam="" aria-pressed="${!F}">Alle</button>${fams.map(f=>`<button class="sb-chip" data-fam="${esc(f.n)}" aria-pressed="${F===f}">${esc(f.n)} <small>${f.k}</small></button>`).join('')}</div>`:''}
    <div class="sb-acts">${studio?`<button class="sb-btn" data-sb="studio" data-stone="${esc(studio)}">Se ${esc(F?F.n:m.n.toLowerCase())} i 3D-showroom</button>`:''}<a class="sb-btn soft" href="#kalkulator">Beregn materialpris</a><a class="sb-btn soft" href="#kontakt">Spør Stenhuset</a></div>
  </div></div>
  <div class="sb-products"><span class="sb-count">${list.length} produkter${F?' i '+esc(F.n):''}</span><div class="product-grid">${list.map(card).join('')}</div></div>`;
}

let bound=false;
export async function show(root){
  styles();const d=await cat(),q=new URLSearchParams((location.hash.split('?')[1])||'');
  if(q.get('m'))detail(root,d,q.get('m'),q.get('f'));else overview(root,d);
  if(bound)return;bound=true;
  root.addEventListener('click',async e=>{
    const chip=e.target.closest('[data-fam]');
    if(chip){const q=new URLSearchParams((location.hash.split('?')[1])||'');if(chip.dataset.fam)q.set('f',chip.dataset.fam);else q.delete('f');history.replaceState(null,'','#stein?'+q.toString());show(root);return;}
    const b=e.target.closest('[data-sb]');if(!b)return;
    const d=await cat(),p=d.products.find(x=>x.id===Number(b.dataset.id));
    if(b.dataset.sb==='detail'&&typeof openProduct==='function')openProduct(p.id);
    else if(b.dataset.sb==='3d'&&typeof openSink3D==='function')openSink3D(p);
    else if(b.dataset.sb==='add'&&typeof addItem==='function'){addItem({kind:'product',id:p.id,label:p.n});}
    else if(b.dataset.sb==='studio'){
      const mats=window.getStudioMaterials?window.getStudioMaterials():[],i=mats.findIndex(x=>x.id===b.dataset.stone);
      location.hash='#studio';if(i>=0)setTimeout(()=>window.setStudioMaterial('floor',i),60);
    }
  });
}
