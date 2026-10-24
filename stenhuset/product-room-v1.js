/* Stenhuset: every shop product placed in the customer journey.
 * analyze(p) reads a catalogue product (name, categories, description) and decides what it is (tile, sink, table,
 * care, installation, trim, restlager), which room and surface it belongs to in a Nordic home (Chess on the bathroom
 * floor, zellige on the kitchen splashback, terracotta on the kitchen floor …), its laid format and pattern, and the
 * stones it is made of. From that it builds a texture for the 3D showroom (colours from the shop photo), opens the
 * product in the right room, suggests products that go with it, and fills empty suggestion slots with the care and
 * installation products (stensåpe, impregnering, Stone P, lim, fugemasse).
 * analyze / related / complete / stoneSpec are pure (testable in Node); the rest needs the page. */
import {STONES} from './stone-textures-v1.js';

const has=(p,...ids)=>ids.some(i=>p.c.includes(i));
const ROOM_NAME={bad:'badet',kjokken:'kjøkkenet',stue:'stuen'};
const SURF_NAME={floor:'gulv',wall:'vegg',splash:'bakvegg',sink:'servant',table:'bord'};
export {ROOM_NAME,SURF_NAME};

/* care and installation products in the shop, with what they do (from Stenhuset's own product texts) */
export const ACC={
  glue:{id:2108,why:'Høyfleksibelt flislim til gulv og vegg (Laticrete Maxi S, 20 kg).'},
  grout:{id:2473,why:'Vannavvisende fugemasse til gulv og vegg, inne og ute (Permacolor).'},
  seal:{id:3834,why:'Impregnering som lukker porene i steinen og beskytter mot flekker (Fila MP90 Eco Xtreme).'},
  stoneP:{id:10820,why:'Ekstra beskyttelse etter impregnering. Steinen blir enklere å holde ren.'},
  soap:{id:2396,why:'Skånsom daglig rengjøring av marmor og kalkstein (Fila Cleaner Pro).'}
};
const TRIM_IDS=[10839,10397,10405,10300];

/* marble and stone names → colours (sRGB): ground, veins, optional patches */
const NAMED=[
  ['viola',/calacatta\s*viola|viola/i,{c0:[240,231,222],vein:[108,76,82],patch:[214,188,170]}],
  ['calacatta gold',/calacatta\s*gold/i,{c0:[242,238,230],vein:[176,146,98]}],
  ['bluette',/bluette/i,{c0:[236,236,234],vein:[86,104,138]}],
  ['calacatta',/calacatta|calcatta/i,{c0:[241,237,229],vein:[118,110,100]}],
  ['statuario',/statuario/i,{c0:[243,242,239],vein:[98,100,106]}],
  ['bardiglio',/bardiglio|bardigio/i,{c0:[130,136,144],vein:[190,194,200],th:[.94,.96]}],
  ['nero',/nero\s*marquina|\bnero\b/i,{c0:[36,36,38],vein:[214,214,208]}],
  ['carrara',/carrara/i,{c0:[233,233,229],vein:[138,140,146]}],
  ['botticino',/botticino|botticio|bottocino/i,{c0:[224,208,182],vein:[196,174,142]}],
  ['crema',/crema/i,{c0:[228,210,180],vein:[240,232,216]}],
  ['rosso',/rosso/i,{c0:[150,62,52],vein:[214,176,156],th:[.93,.955]}],
  ['breccia',/breccia/i,{c0:[206,192,184],vein:[124,92,94],patch:[176,150,146],th:[.9,.94]}],
  ['verde',/verde\s*alpi/i,{c0:[38,66,52],vein:[188,208,194]}],
  ['verde',/verde\s*guatemala/i,{c0:[44,82,62],vein:[196,214,200]}],
  ['lilac',/lilac/i,{c0:[222,212,214],vein:[134,104,128]}],
  ['rosa',/rosa/i,{c0:[228,196,186],vein:[196,148,140]}],
  ['biancone',/biancone/i,{c0:[226,217,198],vein:[192,180,160]}],
  ['grigio',/grigio\s*carnico/i,{c0:[72,74,78],vein:[202,202,200]}],
  ['grigio',/pietra\s*grey/i,{c0:[82,84,88],vein:[212,212,210]}],
  ['grigio',/grigio\s*perla/i,{c0:[184,183,178],vein:[150,148,144]}],
  ['grigio',/tundra/i,{c0:[150,150,148],vein:[214,214,212]}],
  ['ruivina',/ruivina/i,{c0:[92,96,100],vein:[170,172,174]}],
  ['campillo',/campillo/i,{c0:[214,198,176],vein:[180,160,132]}],
  ['travertin',/travertin/i,{c0:[218,198,168],vein:[196,174,140],lime:true}],
  ['thasos',/thasos/i,{c0:[238,236,230],vein:[214,210,202]}]
];
/* fallbacks for limestone when the photo cannot be read */
const LIME=[
  [/silver travertin/i,[196,192,182],[166,160,150]],
  [/travertin/i,[218,198,168],[192,168,134]],
  [/blue|cortina|nero|noir|salvia/i,[74,78,82],[54,58,62]],
  [/gotland|öland|östersjön|ostersjon/i,[176,170,156],[140,134,120]],
  [/gr[eå]y|gris|grå|grigio|moir|martil/i,[176,175,166],[132,132,124]],
  [/./,[226,210,182],[196,174,140]]
];
const COLOUR_CATS={42:'hvit',43:'grå',44:'sort',45:'grønn',46:'beige',95:'rød',106:'rosa',68:'beige',69:'grå',82:'sort'};

const num=s=>{if(!s)return null;if(/fl/i.test(s))return 'FL';const r=s.replace(/,/g,'.').split('-').map(Number).filter(x=>!isNaN(x));return r.length?r.reduce((a,b)=>a+b,0)/r.length:null;};
/* "30,5×30,5 x 1 cm", "61 x 30,5 x 1 cm", "50xFLx2 cm", "46-50×37-39x3cm" → {w,h,t} in cm (h:'FL' = free length) */
export function parseFormat(name){
  const N='(\\d+(?:[.,]\\d+)?(?:\\s*-\\s*\\d+(?:[.,]\\d+)?)?|FL)';
  const m=new RegExp(N+'\\s*[x×X]\\s*'+N+'(?:\\s*[x×X]\\s*'+N+')?','i').exec(name.replace(/\s*-\s*/g,'-'));
  if(!m)return null;
  let a=num(m[1]),b=num(m[2]),t=num(m[3]);
  if(a==null||b==null)return null;
  if(a!=='FL'&&b!=='FL'&&(a<3||b<3))return null; // "1.43×20" (area × something) is not a format
  return {w:a,h:b,t:typeof t==='number'?t:null};
}

function stonesIn(text){
  const out=[];
  for(const [key,re,col] of NAMED){const m=re.exec(text);if(m&&!out.some(s=>s.key===key))out.push({key,at:m.index,col});}
  return out.sort((a,b)=>a.at-b.at);
}

/* What the product is and where it goes. */
export function analyze(p){
  const n=p.n||'',d=(p.d||'').slice(0,400),t=n+' '+d;
  const a={id:p.id,type:'tile',room:null,surface:null,alts:[],kind:null,pattern:'grid',format:parseFormat(n),finish:null,stones:[],twoTone:false,outdoor:false,label:''};
  if(has(p,31,113)){Object.assign(a,{type:'sink',room:'bad',surface:'sink',label:'Servant'});a.stones=stonesIn(t);return a;}
  if(has(p,114,109)){Object.assign(a,{type:'table',room:'stue',surface:'table',label:'Marmorbord'});a.stones=stonesIn(t);return a;}
  if(has(p,28)){
    const care=[ACC.soap.id,ACC.seal.id,ACC.stoneP.id].includes(p.id);
    Object.assign(a,{type:care?'care':'install',label:care?'Vedlikehold':'Montering'});return a;
  }
  if(has(p,112)){Object.assign(a,{type:'trim',label:'Marmorlist'});return a;}
  if(has(p,87)&&!/terracotta/i.test(n)){Object.assign(a,{type:'restlager',label:'Restlager'});return a;}

  a.finish=/polert/i.test(n)?'polert':/sandbl|børstet|antique|antikk|antic|vintage|rustikk/i.test(n)?'struktur':/silkematt|honed/i.test(t)?'silkematt':null;
  a.stones=stonesIn(n);
  if(a.stones.length<2&&/chess|sjakk|ottagono|ottogano|cassettone|diamante|basket/i.test(n)){
    // two-tone patterns name the second stone in the description ("… kombineres med små tosetter av Nero Marquina")
    for(const s of stonesIn(d))if(!a.stones.some(x=>x.key===s.key))a.stones.push(s);
  }
  if(has(p,36)){a.kind='zellige';a.label='Zellige';}
  else if(has(p,49,50,51,53)){a.kind='glazed';a.label='Glasert flis';}
  else if(has(p,23)||/terracotta/i.test(n)){a.kind='terracotta';a.label='Terracotta';}
  else if(has(p,81)){a.kind='terrazzo';a.label='Terrazzo';}
  else if(has(p,68,69,82,115,116,117)&&!(a.stones.length&&!a.stones[0].col.lime&&has(p,22))){a.kind='limestone';a.label=/travertin/i.test(n)?'Travertin':'Kalkstein';}
  else {a.kind='marble';a.label=has(p,111)?'Marmormosaikk':'Marmor';}
  if(/travertin/i.test(n)&&a.kind==='marble'&&!/chess|sjakk/i.test(n)){a.kind='limestone';a.label='Travertin';}
  a.outdoor=has(p,117);

  // pattern
  if(/chess|sjakk/i.test(n)){a.pattern='chess';a.twoTone=true;}
  else if(/diamante/i.test(n)){a.pattern='diag';a.twoTone=true;}
  else if(/cassettone/i.test(n)){a.pattern='frame';a.twoTone=true;}
  else if(/ottagono|ottogano|octagon/i.test(n)){a.pattern='octagon';a.twoTone=true;}
  else if(/hexagon|sekskant/i.test(n)){a.pattern='hex';}
  else if(/basket/i.test(n)){a.pattern='basket';a.twoTone=a.stones.length>1;}
  else if(/fiskeben|herringbone/i.test(n)){a.pattern='plank';}
  else if(/opus/i.test(n)){a.pattern='opus';}
  else if(a.format&&(a.format.w==='FL'||a.format.h==='FL')){a.pattern='free';}
  else if(!a.format&&a.kind==='limestone'){a.pattern='free';}

  // room and surface (Nordic homes: stone on the bathroom floor and walls, kitchen splashback, kitchen floor optional)
  const f=a.format,small=f&&typeof f.w==='number'&&typeof f.h==='number'?Math.max(f.w,f.h):null,ratio=f&&small?small/Math.min(f.w,f.h):1;
  if(a.kind==='zellige'){a.room='kjokken';a.surface='splash';a.alts=[['bad','wall']];}
  else if(a.kind==='glazed'){a.room='bad';a.surface='wall';a.alts=[['kjokken','splash']];}
  else if(a.kind==='terracotta'){a.room='kjokken';a.surface='floor';a.alts=[['bad','floor']];}
  else if(a.kind==='terrazzo'){a.room='bad';a.surface='floor';a.alts=[['kjokken','floor']];}
  else if(has(p,111)){a.room='bad';a.surface='floor';a.alts=[['bad','wall']];}
  else if(a.kind==='marble'&&small&&small<=30&&ratio>=2){a.room='bad';a.surface='wall';a.alts=[['kjokken','splash'],['bad','floor']];}
  else if(a.kind==='marble'){a.room='bad';a.surface='floor';a.alts=a.twoTone?[['kjokken','floor']]:[['bad','wall'],['kjokken','floor']];}
  else {a.room='bad';a.surface='floor';a.alts=[['kjokken','floor'],['bad','wall']];}
  return a;
}
export const inShowroom=a=>!!(a&&a.room);

/* ---------- texture for the showroom ---------- */
const lum=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
const mix=(a,b,k)=>a.map((v,i)=>Math.round(v+(b[i]-v)*k));
const shade=(a,k)=>a.map(v=>Math.max(0,Math.min(255,Math.round(v*k))));
const fitTo=(cm,def)=>typeof cm==='number'&&cm>0?cm/100:def;

/* sample = {major,minor,light,dark,share} from the shop photo (or null) */
export function stoneSpec(a,sample){
  const f=a.format||{},S=sample,k=a.kind;
  const s={kind:k==='glazed'?'zellige':k,seed:(a.id%997)+7,jitter:.004,rough:.7,bump:1.6};
  const st=a.stones;
  // colours
  if(k==='marble'){
    const A=st[0]&&st[0].col;
    if(A&&!A.lime){Object.assign(s,{c0:A.c0,vein:A.vein,th:A.th||[.958,.968],patch:A.patch||null});}
    else if(S){s.c0=S.light;s.vein=mix(S.dark,S.light,.25);s.th=[.95,.965];s.patch=null;}
    else{s.c0=[233,233,229];s.vein=[138,140,146];s.th=[.958,.968];s.patch=null;}
    if(A&&A.lime){s.kind='limestone';s.c0=A.c0;s.c1=A.vein;}
  }else if(k==='limestone'){
    const fb=LIME.find(r=>r[0].test(a.name||''))||LIME[LIME.length-1];
    if(S){s.c0=S.major;s.c1=mix(S.major,S.minor,.55);}else{s.c0=fb[1];s.c1=fb[2];}
  }else if(k==='terracotta'){
    s.c0=S?S.major:[190,108,76];s.c1=S?mix(S.major,S.minor,.5):[160,82,56];
  }else if(k==='terrazzo'){
    s.c0=S?S.major:[226,222,212];s.c1=S?S.minor:[150,140,128];s.vein=shade(s.c1,.72);
  }else{ // zellige / glazed
    s.c0=S?S.major:[137,163,148];s.c1=S?mix(S.major,shade(S.major,1.12),.6):[162,186,172];
  }
  // second colour
  if(a.twoTone){
    const B=st[1]&&st[1].col;
    if(B&&!B.lime)s.alt={c0:B.c0,c1:mix(B.c0,B.vein,.15),vein:B.vein,th:B.th||[.958,.968],patch:B.patch||null};
    else if(B&&B.lime)s.alt={c0:B.c0,c1:B.vein,vein:B.vein,th:[.995,.998],patch:null}; // travertine squares in a marble chess
    else if(S){const other=lum(S.light)-lum(s.c0)>30?S.light:S.dark;s.alt={c0:other,c1:mix(other,s.c1||other,.3),vein:mix(other,s.vein||other,.5),th:s.th,patch:null};}
    else s.alt={c0:shade(s.c0,.35),c1:shade(s.c1||s.c0,.35),vein:shade(s.vein||s.c0,1.6),th:s.th,patch:null};
    // cassettone: the squares are the second stone, the 10 cm frames the first (Carrara)
    if(a.pattern==='frame'&&s.alt){const m={c0:s.c0,c1:s.c1,vein:s.vein,th:s.th,patch:s.patch};Object.assign(s,{c0:s.alt.c0,c1:s.alt.c1,vein:s.alt.vein||s.vein,th:s.alt.th||s.th,patch:s.alt.patch});s.alt=m;}
  }
  // surface
  const fin=a.finish;
  if(s.kind==='marble'){s.rough=fin==='polert'?.1:fin==='struktur'?.5:.28;s.bump=fin==='struktur'?1.2:.5;}
  else if(s.kind==='limestone'){s.rough=fin==='polert'?.2:fin==='silkematt'?.55:.76;s.bump=fin==='struktur'?2.6:fin==='polert'?.6:1.8;}
  else if(s.kind==='terracotta'){s.rough=.78;s.bump=1.9;}
  else if(s.kind==='terrazzo'){s.rough=.24;s.bump=.3;}
  else{s.rough=.1;s.bump=3.2;s.tileTone=k==='glazed'?.14:.3;}
  const antique=/antique|antikk|antic|vintage|rustikk/i.test(a.name||'');
  s.jw={marble:.0015,limestone:.003,terracotta:.004,terrazzo:.0015,zellige:.0022}[s.kind]||.002;
  s.bevel=antique?.007:s.kind==='marble'?.0016:s.kind==='zellige'?.004:.008;
  s.joint=lum(s.c0)<90?[78,78,80]:s.kind==='terracotta'?[188,176,156]:s.kind==='limestone'?[205,196,180]:s.kind==='zellige'?[206,202,190]:[214,210,202];
  // laid format
  const w=fitTo(f.w,null),h=fitTo(f.h,null),long=w&&h?Math.max(w,h):w||h,short=w&&h?Math.min(w,h):w||h;
  const P=a.pattern;
  if(P==='chess'){s.pattern='grid';s.chess=true;s.tw=s.th2=long||.3;}
  else if(P==='diag'){s.pattern='diag';s.tw=.07;}
  else if(P==='frame'){s.pattern='frame';s.tw=.4;s.inner=.75;}
  else if(P==='octagon'){s.pattern='octagon';s.tw=long||.3;s.insert=.3;}
  else if(P==='hex'){s.pattern='hex';s.tw=long||.2;}
  else if(P==='basket'){s.pattern='basket';s.tw=.1;s.dots=true;s.dot=.22;if(!a.twoTone)s.alt={c0:s.vein||shade(s.c0,.4),c1:s.vein||shade(s.c0,.4),vein:s.c0,th:s.th,patch:null};}
  else if(P==='plank'){s.pattern='grid';s.bond=true;s.tw=long||.3;s.th2=short||.06;}
  else if(P==='opus'){s.rowH=.2;s.widths=[.2,.4,.6];}
  else if(P==='free'){const r=typeof f.w==='number'?f.w/100:typeof f.h==='number'?f.h/100:.4;s.rowH=Math.max(.2,Math.min(.6,r));s.widths=[.4,.6,.8,.9].filter(x=>x>=s.rowH*.8);if(!s.widths.length)s.widths=[s.rowH];}
  else{s.pattern='grid';s.tw=long||(s.kind==='marble'?.61:.3);s.th2=short||(s.kind==='marble'?.305:.3);s.bond=s.tw/s.th2>=1.9;}
  if(!s.rowH){s.rowH=s.th2||s.tw||.3;s.widths=[s.tw||.3];}
  return s;
}

/* ---------- suggestions ---------- */
const FAM=/carrara|calacatta|statuario|bardiglio|nero|botticino|crema|rosso|breccia|verde|viola|travertin|terracotta|zellige|belgium blue|thasos|biancone|grigio|terrazzo|kalksten|limestone/gi;
const fams=p=>new Set(((p.n||'')+' '+(p.d||'').slice(0,200)).toLowerCase().match(FAM)||[]);
const cols=p=>new Set(p.c.map(c=>COLOUR_CATS[c]).filter(Boolean));

/* products that go with p: the other surface of the same room (wall for a floor, floor for a wall, splashback for a
 * kitchen floor), a sink in the same stone; scored by shared stone family and colour */
export function related(p,cat,n=3){
  const a=analyze(p),F=fams(p),C=cols(p);
  const want=a.type==='sink'?[['bad','floor'],['bad','wall']]:a.type==='table'?[['stue','table']]:
    a.surface==='floor'&&a.room==='bad'?[['bad','wall'],['bad','sink']]:a.surface==='wall'?[['bad','floor'],['bad','sink']]:
    a.surface==='splash'?[['kjokken','floor']]:a.surface==='floor'?[['kjokken','splash']]:[];
  if(!want.length)return [];
  // one ranked list per wanted surface (a product counts for its main place and its alternatives), then taken in turn
  const lists=want.map(()=>[]);
  for(const q of cat){
    if(q.id===p.id||!q.i)continue;const b=analyze(q);
    const places=[[b.room,b.surface],...b.alts];
    let sc=0;for(const f of fams(q))if(F.has(f))sc+=3;for(const c of cols(q))if(C.has(c))sc+=1.5;
    if(sc<=0)continue;if(q.st)sc+=1;if(q.p||q.sp)sc+=.5;
    want.forEach(([r,s],k)=>{const at=places.findIndex(([r2,s2])=>r2===r&&s2===s);if(at>=0)lists[k].push([sc-(at?1:0),q,b,r,s]);});
  }
  lists.forEach(l=>l.sort((x,y)=>y[0]-x[0]||x[1].id-y[1].id));
  const res=[],seen=new Set(),pos=lists.map(()=>0);
  const key=q=>q.n.replace(/\s*(polert|silkematt|børstet|sandblåst).*$/i,'').trim();
  for(let guard=0;res.length<n&&guard<n*lists.length*20;guard++){
    const k=guard%lists.length,l=lists[k];
    while(pos[k]<l.length&&(seen.has(key(l[pos[k]][1]))||res.some(x=>x.p.id===l[pos[k]][1].id)))pos[k]++;
    if(pos[k]>=l.length){if(lists.every((L,i)=>pos[i]>=L.length))break;continue;}
    const [,q,b,r,s]=l[pos[k]++];seen.add(key(q));res.push({p:q,a:b,where:[r,s],why:'Til '+SURF_NAME[s]+' i '+ROOM_NAME[r]});
  }
  return res;
}
/* what a project with p also needs: installation for tiles, care for natural stone (sinks and tables too) */
export function complete(p,cat){
  const a=analyze(p),k=a.kind,list=[];
  if(a.type==='tile'){
    list.push(ACC.glue,ACC.grout);
    if(k!=='glazed')list.push(ACC.seal);
    if(['marble','limestone','terrazzo'].includes(k)){list.push(ACC.soap);if(a.surface==='floor')list.push(ACC.stoneP);}
    if(k==='marble'&&a.surface==='floor'){const t=cat.find(q=>q.id===TRIM_IDS[0]);if(t)list.push({id:t.id,why:'Sokkellist i Carrara-marmor som avslutter gulvet mot veggen.'});}
  }else if(a.type==='sink'||a.type==='table'){list.push(ACC.soap,ACC.seal,ACC.stoneP);}
  else if(a.type==='trim'){list.push(ACC.glue);}
  else if(a.type==='care'||a.type==='install'){
    const o=[ACC.seal,ACC.stoneP,ACC.soap,ACC.glue,ACC.grout].filter(x=>x.id!==p.id);list.push(...o.slice(0,3));
  }
  return list.map(x=>({p:cat.find(q=>q.id===x.id),why:x.why})).filter(x=>x.p);
}
/* related products, topped up with care / installation products when fewer than n fit */
export function suggest(p,cat,n=3){
  const r=related(p,cat,n);
  if(r.length<n)for(const c of complete(p,cat)){if(r.length>=n)break;if(!r.some(x=>x.p.id===c.p.id))r.push({p:c.p,a:analyze(c.p),why:c.why,care:true});}
  return r;
}
/* accessories a materialliste is missing */
export function missing(items,cat){
  const ids=new Set(items.map(i=>Number(i.id)).filter(Boolean)),need=new Map();
  for(const id of ids){const p=cat.find(q=>q.id===id);if(!p)continue;for(const c of complete(p,cat))if(!ids.has(c.p.id)&&!need.has(c.p.id))need.set(c.p.id,c);}
  return [...need.values()];
}

/* ---------- browser: photo colours, registering the stone, opening the showroom ---------- */
const sampleCache=new Map();
/* two dominant colours in the middle of the shop photo (k-means, k = 2) */
export function sampleColors(url){
  if(sampleCache.has(url))return sampleCache.get(url);
  const pr=new Promise(res=>{
    const im=new Image();im.crossOrigin='anonymous';im.decoding='async';
    im.onload=()=>{
      try{
        const S=48,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d',{willReadFrequently:true});
        const w=im.naturalWidth,h=im.naturalHeight,cw=w*.6,ch=h*.6;x.drawImage(im,(w-cw)/2,(h-ch)/2,cw,ch,0,0,S,S);
        const d=x.getImageData(0,0,S,S).data,px=[];for(let i=0;i<d.length;i+=4)px.push([d[i],d[i+1],d[i+2]]);
        px.sort((a,b)=>lum(a)-lum(b));
        let A=px[Math.floor(px.length*.15)].slice(),B=px[Math.floor(px.length*.85)].slice(),na=0,nb=0;
        for(let it=0;it<10;it++){
          const sa=[0,0,0],sb=[0,0,0];na=nb=0;
          for(const q of px){const da=(q[0]-A[0])**2+(q[1]-A[1])**2+(q[2]-A[2])**2,db=(q[0]-B[0])**2+(q[1]-B[1])**2+(q[2]-B[2])**2;
            if(da<db){sa[0]+=q[0];sa[1]+=q[1];sa[2]+=q[2];na++;}else{sb[0]+=q[0];sb[1]+=q[1];sb[2]+=q[2];nb++;}}
          if(na)A=sa.map(v=>Math.round(v/na));if(nb)B=sb.map(v=>Math.round(v/nb));
        }
        const dark=lum(A)<=lum(B)?A:B,light=dark===A?B:A,nd=dark===A?na:nb,share=1-nd/px.length;
        res({light,dark,major:share>=.5?light:dark,minor:share>=.5?dark:light,share});
      }catch(e){res(null);}
    };
    im.onerror=()=>res(null);im.src=url;
  });
  sampleCache.set(url,pr);return pr;
}
export async function registerStone(p,a){
  const id='p-'+p.id;if(STONES[id])return id;
  const sample=p.i?await sampleColors(p.i):null;
  STONES[id]=stoneSpec({...a,name:p.n},sample);
  return id;
}

/* the product as a stone in the showroom's floor / wall / splashback carousel (the shop photo as its swatch) */
export async function ensureMaterial(p,a=analyze(p)){
  const id=await registerStone(p,a);
  const i=window.addStudioMaterial({id,name:p.n.replace(/\s+\d[\d,.]*\s*[x×].*$/i,'').trim()||p.n,pattern:"url('"+p.i+"') center/cover",kind:a.label,product:p.id});
  return {id,i};
}

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kr=p=>{const v=p.sp||p.p;return v?new Intl.NumberFormat('nb-NO',{style:'currency',currency:'NOK',maximumFractionDigits:0}).format(v):'Pris på forespørsel';};
const tick=ms=>new Promise(f=>setTimeout(f,ms));
const fmtLine=a=>{
  const f=a.format,PAT={chess:'Sjakkmønster',diag:'Diamantmønster',frame:'Cassettone-mønster',octagon:'Oktagonmønster',hex:'Sekskant',basket:'Basket weave',plank:'Fiskeben',opus:'Opus Romano',free:'Fri lengde'};
  const size=f&&typeof f.w==='number'&&typeof f.h==='number'?String(f.w).replace('.',',')+' × '+String(f.h).replace('.',',')+' cm':'';
  return [a.label,PAT[a.pattern],size,a.finish].filter(Boolean).join(' · ');
};
export {fmtLine};

let lastOpen=null;
/* Open p in the room it belongs to (or in one of its alternatives: [room,surface]); returns false if it has no room. */
export async function openInShowroom(p,where){
  const a=analyze(p);if(!a.room)return false;
  const room=where?where[0]:a.room,surface=where?where[1]:a.surface;
  lastOpen=p.id;
  const h='#studio?p='+p.id+(where?'&i='+encodeURIComponent(room+'.'+surface):'');
  if(location.hash!==h)history.replaceState(null,'',location.pathname+location.search+h);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  for(let i=0;i<80&&!(window.Studio3D&&window.Studio3D.ready&&window.getStudioState);i++)await tick(120);
  const S3=window.Studio3D;if(!S3)return false;
  const tab=document.querySelector('#room-tabs [data-room="'+room+'"]');if(tab&&window.getStudioState().room!==room)tab.click();
  if(a.type==='sink')S3.setSink(p.id);
  else if(a.type==='table')S3.setTable(p.id);
  else{
    const {id,i}=await ensureMaterial(p,a);
    if(surface==='splash'&&S3.setSplash)S3.setSplash(id);
    else{
      if(room==='kjokken'&&S3.setKitchenFloor)S3.setKitchenFloor(true);
      window.setStudioMaterial(surface==='wall'?'wall':'floor',i);
      if(S3.goView)setTimeout(()=>S3.goView(surface==='wall'?'wall':'floor'),400);
    }
    if(surface==='splash'&&S3.goView)setTimeout(()=>S3.goView('product'),400);
  }
  if(window.StudioUI&&window.StudioUI.sync)window.StudioUI.sync(surface==='splash'?'splash':surface);
  panel(p,a,room,surface);
  const sec=document.getElementById('studio');if(sec)setTimeout(()=>sec.scrollIntoView({behavior:'smooth',block:'start'}),60);
  return true;
}
export function openFromHash(cat){
  const m=/^#studio\?(?:.*&)?p=(\d+)(?:&i=([a-z]+)\.([a-z]+))?/.exec(location.hash);if(!m)return;
  const id=Number(m[1]);if(id===lastOpen)return;
  const p=cat.find(q=>q.id===id);if(p)openInShowroom(p,m[2]?[m[2],m[3]]:null);
}

/* ---------- UI blocks ---------- */
let css=false;
function styles(){
  if(css)return;css=true;
  const s=document.createElement('style');
  s.textContent=`
.pr-panel{display:grid;grid-template-columns:120px 1fr;gap:18px;margin-top:18px;padding:18px;background:#f7f4ee;border:1px solid #e4ddd1}
.pr-panel>img{width:120px;height:120px;object-fit:cover;display:block}
.pr-panel h3{font:400 24px/1.15 var(--serif,Georgia,serif);margin:2px 0 6px}
.pr-k{font:700 10px/1.3 var(--sans,Arial,sans-serif);letter-spacing:.14em;text-transform:uppercase;color:#8a7a66}
.pr-meta{font-size:13px;color:#5f584e;margin:0 0 12px}
.pr-acts{display:flex;flex-wrap:wrap;gap:8px}
.pr-b{border:1px solid #2f2b26;background:#2f2b26;color:#fff;padding:9px 14px;font:700 11px/1 var(--sans,Arial,sans-serif);letter-spacing:.08em;text-transform:uppercase;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
.pr-b.soft{background:transparent;color:#2f2b26}
.pr-b:focus-visible{outline:3px solid #af6f3b;outline-offset:2px}
.pr-alts{margin-top:10px;font-size:13px;color:#5f584e;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.pr-alts button{border:1px solid #cfc5b6;background:#fff;padding:6px 10px;font-size:12px;cursor:pointer}
.pr-note{grid-column:1/-1;font-size:12px;color:#7a7266;margin:0}
.pr-sug{grid-column:1/-1}
.pr-sug h4{font:700 10px/1 var(--sans,Arial,sans-serif);letter-spacing:.14em;text-transform:uppercase;color:#8a7a66;margin:6px 0 10px}
.pr-list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.pr-item{display:grid;grid-template-columns:56px 1fr;gap:10px;align-items:center;background:#fff;border:1px solid #e4ddd1;padding:8px}
.pr-item img{width:56px;height:56px;object-fit:cover;display:block}
.pr-item b{display:block;font-size:13px;line-height:1.25;font-weight:600}
.pr-item small{display:block;font-size:11.5px;color:#6d655a;line-height:1.35;margin:2px 0 6px}
.pr-item .pr-row{display:flex;gap:6px;flex-wrap:wrap}
.pr-item button{border:1px solid #cfc5b6;background:#faf8f3;padding:5px 8px;font-size:11px;cursor:pointer}
.pr-modal{margin-top:22px;display:grid;gap:16px}
@media (max-width:640px){.pr-panel{grid-template-columns:72px 1fr;gap:12px;padding:14px}.pr-panel>img{width:72px;height:72px}.pr-panel h3{font-size:19px}}
`;
  document.head.appendChild(s);
}
function itemHtml(x,mode){
  const p=x.p,b=x.a||analyze(p),acts=[];
  if(!x.care&&inShowroom(b)&&mode!=='noroom'){
    const w=x.where||[b.room,b.surface],own=w[0]===b.room&&w[1]===b.surface;
    acts.push('<button type="button" data-pr="'+(own?'try':'alt')+'" data-id="'+p.id+'" data-where="'+w[0]+'.'+w[1]+'">Prøv i '+ROOM_NAME[w[0]]+'</button>');
  }
  acts.push('<button type="button" data-pr="add" data-id="'+p.id+'">+ Materialliste</button>');
  acts.push('<button type="button" data-pr="view" data-id="'+p.id+'">Se produktet</button>');
  return '<li class="pr-item"><img loading="lazy" src="'+esc(p.i)+'" alt=""><div><b>'+esc(p.n)+'</b><small>'+esc(x.why)+' · '+kr(p)+'</small><div class="pr-row">'+acts.join('')+'</div></div></li>';
}
export function sugHtml(p,cat,opts={}){
  const r=related(p,cat,opts.n||3),c=complete(p,cat).filter(x=>!r.some(y=>y.p.id===x.p.id));
  let h='';
  if(r.length)h+='<div class="pr-sug"><h4>Passer sammen med</h4><ul class="pr-list">'+r.map(x=>itemHtml(x,opts.mode)).join('')+'</ul></div>';
  if(c.length)h+='<div class="pr-sug"><h4>'+(a=>a.type==='tile'?'Alt du trenger for å legge og ta vare på den':'Ta vare på steinen')(analyze(p))+'</h4><ul class="pr-list">'+c.map(x=>itemHtml({...x,care:true},opts.mode)).join('')+'</ul></div>';
  return h;
}
/* click handling for any block made by sugHtml: needs the page's addItem / openProduct */
export function wire(root,cat,hooks={}){
  root.addEventListener('click',e=>{
    const b=e.target.closest('[data-pr]');if(!b)return;
    const C=typeof cat==='function'?cat():cat,{onAdd,onView,onTry}=typeof hooks==='function'?hooks():hooks;
    const p=C.find(q=>q.id===Number(b.dataset.id));if(!p)return;
    e.preventDefault();
    if(b.dataset.pr==='add'&&onAdd)onAdd(p);
    else if(b.dataset.pr==='view'&&onView)onView(p);
    else if(b.dataset.pr==='try'){if(onTry)onTry(p);openInShowroom(p);}
    else if(b.dataset.pr==='alt'){if(onTry)onTry(p);openInShowroom(p,b.dataset.where.split('.'));}
  });
}
/* extra section in the product modal / product sheet: "see it in the room" first, then what goes with it */
export function modalBlock(host,p,cat,hooks){
  styles();
  const a=analyze(p),div=document.createElement('div');div.className='pr-modal';
  const own=inShowroom(a)?'<div><div class="pr-acts"><button type="button" class="pr-b" data-pr="try" data-id="'+p.id+'">Se '+esc(SURF_NAME[a.surface]==='servant'||SURF_NAME[a.surface]==='bord'?'den':'den som '+SURF_NAME[a.surface])+' i '+ROOM_NAME[a.room]+' →</button>'+
    a.alts.map(([r,s])=>'<button type="button" class="pr-b soft" data-pr="alt" data-id="'+p.id+'" data-where="'+r+'.'+s+'">'+SURF_NAME[s]+' i '+ROOM_NAME[r]+'</button>').join('')+'</div>'+
    (a.type==='tile'?'<p class="pr-meta" style="margin:8px 0 0">'+esc(fmtLine(a))+'</p>':'')+'</div>':'';
  div.innerHTML=own+sugHtml(p,cat);
  if(!div.innerHTML)return null;host.appendChild(div);wire(div,cat,hooks);return div;
}
let panelHooks={},panelCat=[];
export function setPanelContext(cat,hooks){panelCat=cat;panelHooks=hooks||{};}
/* "what you are looking at" under the 3D room */
function panel(p,a,room,surface){
  styles();
  const shell=document.querySelector('#studio .scene-shell');if(!shell)return;
  let el=document.getElementById('pr-panel');
  if(!el){el=document.createElement('div');el.id='pr-panel';el.className='pr-panel';el.setAttribute('aria-live','polite');shell.insertAdjacentElement('afterend',el);wire(el,()=>panelCat.length?panelCat:[p],()=>panelHooks);}
  const alts=[[a.room,a.surface],...a.alts].filter(([r,s])=>!(r===room&&s===surface));
  el.innerHTML='<img src="'+esc(p.i)+'" alt=""><div><div class="pr-k">Du ser · '+esc(SURF_NAME[surface]||'')+' i '+esc(ROOM_NAME[room]||'')+'</div><h3>'+esc(p.n)+'</h3>'+
    '<p class="pr-meta">'+esc(fmtLine(a))+(a.outdoor?' · også til uterom':'')+' · '+kr(p)+'</p>'+
    '<div class="pr-acts"><button type="button" class="pr-b" data-pr="add" data-id="'+p.id+'">+ Materialliste</button><button type="button" class="pr-b soft" data-pr="view" data-id="'+p.id+'">Se produktet</button><a class="pr-b soft" href="'+esc(p.u)+'" target="_blank" rel="noopener">Kjøp i nettbutikken ↗</a></div>'+
    (alts.length?'<div class="pr-alts">Se den også som '+alts.map(([r,s])=>'<button type="button" data-pr="alt" data-id="'+p.id+'" data-where="'+r+'.'+s+'">'+SURF_NAME[s]+' i '+ROOM_NAME[r]+'</button>').join('')+'</div>':'')+
    '</div>'+(a.type==='tile'?'<p class="pr-note">Mønster, format og farger er tegnet digitalt ut fra produktbildet. Naturstein varierer fra flis til flis, så be om en fysisk prøve før du bestiller.</p>':'')+
    (panelCat.length?sugHtml(p,panelCat,{mode:'panel'}):'');
}
