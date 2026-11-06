(function(){
'use strict';
var NUM=window.KENO_NUMEROLOGY, archive=[], chosen=null, birth='';
var $=function(id){return document.getElementById(id)};
var period=$('period'), level=$('level'), windowEl=$('window'), yearEl=$('testYear'), birthEl=$('birth');
var BIRTH_KEY='setaei-keno-birth';
try{birth=localStorage.getItem(BIRTH_KEY)||''}catch(e){}
if(birth)birthEl.value=birth;
$('copyrightYear').textContent=new Date().getFullYear();

function fmt(n,d){return Number(n).toLocaleString('nb-NO',{maximumFractionDigits:d==null?3:d})}
function pct(n){return fmt(100*n,1)+' %'}
function niceDate(d){return new Date(d+'T12:00:00').toLocaleDateString('nb-NO',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})}
function addDays(iso,n){var d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
function comb(n,k){if(k<0||k>n)return 0;var o=1;for(var i=1;i<=k;i++)o=o*(n-i+1)/i;return o}
// Standard normal CDF (Abramowitz–Stegun 7.1.26 via erf)
function phi(z){var t=1/(1+.3275911*Math.abs(z)/Math.SQRT2),y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-z*z/2);return z>=0?(1+y)/2:(1-y)/2}
function chiP(x,df){var z=(Math.pow(x/df,1/3)-(1-2/(9*df)))/Math.sqrt(2/(9*df));return 1-phi(z)}
var ENG=window.SETAEI_ENGINE,UI=window.SETAEI_UI;
function randomRow(key,k){return ENG.randomRow(key,k,70)}
function hitStats(k){var e=k*20/70,v=k*(20/70)*(50/70)*(70-k)/69;return{e:e,v:v}}

function rows(){
 var x=period.value;
 if(x==='all')return archive;
 if(/^\d{4}$/.test(x))return archive.filter(function(d){return d.date.slice(0,4)===x});
 return archive.slice(-Number(x));
}
function counts(ds){var c=new Array(71).fill(0);ds.forEach(function(d){d.numbers.forEach(function(n){c[n]++})});return c}
function gaps(){ // draws since each number was last seen (full archive)
 var g=new Array(71).fill(archive.length);
 for(var i=archive.length-1;i>=0;i--)archive[i].numbers.forEach(function(n){if(g[n]===archive.length)g[n]=archive.length-1-i});
 return g;
}

/* ---------- 01 Topp 10 ---------- */
function renderTop(){
 var ds=rows(),c=counts(ds),N=ds.length,p=20/70,E=N*p,sd=Math.sqrt(N*p*(1-p)),g=gaps();
 var nums=[];for(var n=1;n<=70;n++)nums.push(n);
 function list(target,items,valueFn,noteFn){
  var box=$(target);box.textContent='';
  items.forEach(function(n,i){
   var li=el('li','toprow');
   li.appendChild(el('span','rank',String(i+1)));
   var b=el('button','ball'+(n===chosen?' hot':''),String(n));b.type='button';b.addEventListener('click',function(){select(n)});li.appendChild(b);
   li.appendChild(el('span','topval',valueFn(n)));li.appendChild(el('span','topnote',noteFn(n)));
   box.appendChild(li);
  });
 }
 var z=function(n){var v=(c[n]-E)/sd;return (v>=0?'+':'')+fmt(v,2)+' σ'};
 list('topHot',nums.slice().sort(function(a,b){return c[b]-c[a]||a-b}).slice(0,10),function(n){return c[n]+' trekk'},z);
 list('topCold',nums.slice().sort(function(a,b){return c[a]-c[b]||a-b}).slice(0,10),function(n){return c[n]+' trekk'},z);
 list('topGap',nums.slice().sort(function(a,b){return g[b]-g[a]||a-b}).slice(0,10),function(n){return g[n]+' trekn.'},function(n){return 'P = '+pct(Math.pow(50/70,g[n]))});
 // pairs
 var pc=new Int32Array(71*71);
 ds.forEach(function(d){var a=d.numbers;for(var i=0;i<20;i++)for(var j=i+1;j<20;j++){var x=a[i],y=a[j];pc[x<y?x*71+y:y*71+x]++}});
 var pairs=[];for(var a=1;a<70;a++)for(var b=a+1;b<=70;b++)pairs.push([a,b,pc[a*71+b]]);
 pairs.sort(function(x,y){return y[2]-x[2]||x[0]-y[0]||x[1]-y[1]});
 var pe=N*190/2415,box=$('topPairs');box.textContent='';
 pairs.slice(0,10).forEach(function(p,i){
  var li=el('li','toprow');li.appendChild(el('span','rank',String(i+1)));
  var w=el('span','pair');w.appendChild(el('span','ball',String(p[0])));w.appendChild(el('span','ball',String(p[1])));li.appendChild(w);
  li.appendChild(el('span','topval',p[2]+' sammen'));li.appendChild(el('span','topnote','forventet '+fmt(pe,1)));box.appendChild(li);
 });
 // randomness tests for the period
 var ss=0;for(n=1;n<=70;n++)ss+=Math.pow(c[n]-E,2);
 var chi=N?ss/(N*p*(1-p))*69/70:0,pv=N?chiP(chi,69):1;
 var sum=0,odd=0,low=0,rep=0;
 ds.forEach(function(d){d.numbers.forEach(function(n){sum+=n;if(n%2)odd++;if(n<=35)low++})});
 var idx=archive.indexOf(ds[0]),repN=0;
 ds.forEach(function(d,i){var prev=archive[idx+i-1];if(!prev)return;var s=new Set(prev.numbers);d.numbers.forEach(function(n){if(s.has(n))rep++});repN++});
 var t=$('tests');t.textContent='';
 [['Likefordelingstest (χ², df 69)',fmt(chi,1),'p = '+fmt(pv,3)+(pv<.01?' · avvik — undersøk datakilden':' · forenlig med ren tilfeldighet')],
  ['Snitt sum av 20 tall',fmt(sum/Math.max(1,N),1),'forventet 710,0'],
  ['Snitt oddetall per trekning',fmt(odd/Math.max(1,N),2),'forventet 10,00'],
  ['Snitt lave tall (1–35)',fmt(low/Math.max(1,N),2),'forventet 10,00'],
  ['Gjentatt fra forrige trekning',fmt(rep/Math.max(1,repN),2),'forventet 5,71']].forEach(function(r){
   var d=el('div','test');d.appendChild(el('div','metriclabel',r[0]));d.appendChild(el('div','testval',r[1]));d.appendChild(el('div','detail',r[2]));t.appendChild(d);
 });
 $('topInfo').textContent=fmt(N,0)+' trekninger i perioden · hvert tall forventes '+fmt(E,1)+' ganger (σ ≈ '+fmt(sd,1)+'). Avvik innenfor ±2 σ er helt normalt; med 70 tall vil 3–4 tall ligge utenfor ved ren tilfeldighet.';
}

/* ---------- 02 Rekker ---------- */
function hotRow(k,lookback){return ENG.hotRow(archive.map(function(d){return d.numbers}),k,lookback,70)}
function gapRow(k){return ENG.gapRow(archive.map(function(d){return d.numbers}),k,70)}
function renderRows(){
 var k=Number(level.value),next=addDays(archive[archive.length-1].date,1),box=$('rows');box.textContent='';
 $('nextDate').textContent=niceDate(next);
 var list=[];
 var nd=NUM.row(next,k);
 list.push({tag:'Numerologi',name:'Dagens dato-vibrasjon',desc:'Universelt dagtall '+nd.factors.universalDay+' · måned '+nd.factors.universalMonth+' · år '+nd.factors.universalYear,row:nd.numbers,reasons:nd.reasons});
 if(birth){
  try{var np=NUM.row(next,k,birth);list.push({tag:'Numerologi',name:'Personlig rekke',desc:'Livstall '+np.factors.personal.life+' · personlig dag '+np.factors.personal.personalDay,row:np.numbers,reasons:np.reasons})}
  catch(e){list.push({tag:'Numerologi',name:'Personlig rekke',desc:e.message,row:[]})}
 }
 list.push({tag:'Frekvens',name:'Varmeste siste 90',desc:'De '+k+' mest trukne tallene i de siste 90 trekningene',row:hotRow(k,90)});
 list.push({tag:'Frekvens',name:'Lengst siden sist',desc:'De '+k+' tallene som har ventet lengst',row:gapRow(k)});
 list.push({tag:'Kontroll',name:'Tilfeldig kontrollrekke',desc:'Seedet på datoen — den ærlige målestokken alle andre må slå',row:randomRow('ctrl'+next,k)});
 list.forEach(function(r){
  var card=el('article','rowcard');
  var head=el('div','rowhead');head.appendChild(el('span','tag tag-'+r.tag.toLowerCase(),r.tag));head.appendChild(el('h3',null,r.name));card.appendChild(head);
  card.appendChild(el('p','detail',r.desc));
  var balls=el('div','balls');r.row.forEach(function(n){var b=el('span','ball'+(n===chosen?' hot':''),String(n));if(r.reasons){var why=r.reasons.find(function(x){return x.number===n});if(why)b.title=why.sources.join(' · ')}balls.appendChild(b)});card.appendChild(balls);
  if(r.reasons){var det=el('details','why');det.appendChild(el('summary',null,'Hvorfor disse tallene?'));var ul=el('ul');r.reasons.forEach(function(x){ul.appendChild(el('li',null,x.number+' — '+x.sources.join(' · ')))});det.appendChild(ul);card.appendChild(det)}
  if(r.row.length){var cp=el('button','copy','Kopier rekke');cp.type='button';cp.addEventListener('click',function(){try{navigator.clipboard.writeText(r.row.join(' '));cp.textContent='Kopiert'}catch(e){cp.textContent=r.row.join(' ')}});card.appendChild(cp)}
  box.appendChild(card);
 });
}

/* ---------- 03 Frekvenskart ---------- */
function renderHeatmap(){
 var ds=rows(),c=counts(ds),min=Math.min.apply(null,c.slice(1)),max=Math.max.apply(null,c.slice(1)),grid=$('heatmap');grid.textContent='';
 for(var n=1;n<=70;n++){
  var f=(c[n]-min)/Math.max(1,max-min),b=el('button','cell'+(n===chosen?' selected':''));b.type='button';
  b.style.background='color-mix(in srgb, var(--accent) '+Math.round(8+f*62)+'%, var(--card2))';
  b.setAttribute('aria-label','Tall '+n+': '+c[n]+' trekninger');
  b.appendChild(el('span','n',String(n)));b.appendChild(el('span','count',c[n]+' / '+ds.length));
  (function(x){b.addEventListener('click',function(){select(x)})})(n);grid.appendChild(b);
 }
 $('selectedInfo').textContent=chosen===null?'Trykk på et tall for detalj':'Tall '+chosen+': '+c[chosen]+' trekk ('+pct(c[chosen]/Math.max(1,ds.length))+', forventet 28,6 %)';
}

/* ---------- 04 Baktest (shared engine, Holm over the whole family) ---------- */
var btCache={};
function familyCells(yr){return btCache[yr]||(btCache[yr]=ENG.backtestAll('keno',archive,yr))}
function personalStats(k,yr){ // depends on the visitor's birth date, so it is outside the Holm family
 var hs=[];
 if(!birth)return hs;
 archive.forEach(function(cur){
  if(cur.date<'2013-01-01'||(yr!=='all'&&cur.date.slice(0,4)!==yr)||birth>=cur.date)return;
  var set=new Set(cur.numbers),h=0;NUM.row(cur.date,k,birth).numbers.forEach(function(n){if(set.has(n))h++});hs.push(h);
 });
 return hs;
}
function numDist(k,yr){
 var d=new Array(k+1).fill(0),n=0;
 archive.forEach(function(cur,i){
  if(i<365||cur.date<'2013-01-01'||(yr!=='all'&&cur.date.slice(0,4)!==yr))return;
  var set=new Set(cur.numbers),h=0;NUM.row(cur.date,k).numbers.forEach(function(x){if(set.has(x))h++});d[h]++;n++;
 });
 return {d:d,n:n};
}
function renderBacktest(){
 var k=Number(level.value),w=Number(windowEl.value),y=yearEl.value,cells=familyCells(y),st=hitStats(k),tb=$('backtest');tb.textContent='';
 var by={};cells.forEach(function(c){by[c.key]=c});
 var pick=[['numerology|k'+k,'Numerologi · dato','primary'],['hot'+w+'|k'+k,'Hyppigste tall (vindu '+w+')'],['cold'+w+'|k'+k,'Sjeldneste tall (vindu '+w+')'],['random|k'+k,'Tilfeldig kontroll'],['fixed|k'+k,'Faste tall 1–'+k]];
 pick.forEach(function(x){
  var c=by[x[0]];if(!c)return;var tr=el('tr',x[2]||'');
  [x[1],fmt(c.n,0),fmt(c.mean),(c.mean-c.expected>=0?'+':'')+fmt(c.mean-c.expected),(c.z>=0?'+':'')+fmt(c.z,2),UI.pfmt(c.p),UI.pfmt(c.holm),String(c.max)].forEach(function(v,i){
   tr.appendChild(el('td',i===4?(Math.abs(c.z)>=2?(c.z>0?'good':'negative'):'muted'):i===6?(c.holm<0.05?'good':'muted'):null,v));
  });
  tb.appendChild(tr);
 });
 var hs=personalStats(k,y),tr=el('tr');
 if(hs.length){
  var avg=hs.reduce(function(a,b){return a+b},0)/hs.length,z=(avg-st.e)/Math.sqrt(st.v/hs.length);
  [ 'Numerologi · personlig ('+birth+')',fmt(hs.length,0),fmt(avg),(avg-st.e>=0?'+':'')+fmt(avg-st.e),(z>=0?'+':'')+fmt(z,2),UI.pfmt(ENG.pTwoSided(z)),'utenfor familien',String(Math.max.apply(null,hs))].forEach(function(v,i){tr.appendChild(el('td',i===4?(Math.abs(z)>=2?(z>0?'good':'negative'):'muted'):null,v))});
 }else{tr.appendChild(el('td',null,'Numerologi · personlig'));var td=el('td',null,'Legg inn fødselsdato under «Rekker» for å teste');td.colSpan=7;tr.appendChild(td)}
 tb.appendChild(tr);
 var sig=cells.filter(function(c){return c.holm<0.05}).length,raw=cells.filter(function(c){return c.p<0.05}).length,minH=Math.min.apply(null,cells.map(function(c){return c.holm}));
 $('backtestNotice').textContent='Forventning ved tilfeldig valg: '+fmt(st.e)+' treff på nivå '+k+'. Hele familien er '+cells.length+' tester (9 nivå × numerologi, kontroll, faste tall og 3 vinduer for hyppigste og sjeldneste). Uten korreksjon har '+raw+' p < 0,05 (ventet ved flaks alene: ca. '+fmt(cells.length*0.05,1)+'). Etter Holm-korreksjon har '+sig+' det; laveste Holm-p er '+UI.pfmt(minH)+'. Tilfeldig kontroll og faste tall er med nettopp for å vise hvor store avvik ren flaks gir. Alle strategier måles på samme trekninger (de med minst 365 trekninger historikk).';
 var nd=numDist(k,y),d=nd.d,n=nd.n,box=$('dist');box.textContent='';
 var maxP=0,rowsD=[];for(var h=0;h<=k;h++){var pe=comb(20,h)*comb(50,k-h)/comb(70,k),po=d[h]/Math.max(1,n);rowsD.push([h,po,pe]);maxP=Math.max(maxP,po,pe)}
 rowsD.forEach(function(r){
  var line=el('div','distrow');line.appendChild(el('span','distlabel',r[0]+' rette'));
  var bars=el('span','bars');var o=el('span','bar obs');o.style.width=(100*r[1]/maxP)+'%';var e=el('span','bar exp');e.style.width=(100*r[2]/maxP)+'%';bars.appendChild(o);bars.appendChild(e);line.appendChild(bars);
  line.appendChild(el('span','distval',pct(r[1])+' / '+pct(r[2])));box.appendChild(line);
 });
}

/* ---------- 05 Trekninger + sannsynlighet ---------- */
function renderRecent(){
 var t=$('recentDraws');t.textContent='';
 archive.slice(-10).reverse().forEach(function(d){
  var line=el('div','result');line.appendChild(el('div','drawdate',niceDate(d.date)));
  var nr=NUM.row(d.date,10).numbers,nb=el('div','balls');
  d.numbers.forEach(function(n){nb.appendChild(el('span','ball'+(n===chosen?' hot':'')+(nr.indexOf(n)>=0?' num':''),String(n)))});
  line.appendChild(nb);line.appendChild(el('div','drawhits',d.numbers.filter(function(n){return nr.indexOf(n)>=0}).length+'/10 numerologi'));t.appendChild(line);
 });
}
function renderProbability(){
 var k=Number(level.value);$('levelDisplay').textContent=k;
 var p=comb(20,k)/comb(70,k);$('perfectOdds').textContent='1 av '+fmt(Math.round(1/p),0);
 $('perfectDetails').textContent='Sjanse for '+k+' av '+k+' rette: '+fmt(p*100,6)+' % per rekke.';
 $('expectedHits').textContent=fmt(k*20/70);
}

function select(n){chosen=chosen===n?null:n;renderTop();renderHeatmap();renderRows();renderRecent()}
function validate(data){
 if(!data||!Array.isArray(data.draws)||data.draws.length<365)throw Error('Datagrunnlag mangler');
 var last='';data.draws.forEach(function(d){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||d.date<=last||!Array.isArray(d.numbers)||d.numbers.length!==20||new Set(d.numbers).size!==20||d.numbers.some(function(n){return !Number.isInteger(n)||n<1||n>70}))throw Error('Ugyldig eller duplisert trekning '+d.date);
  last=d.date;
 });return data.draws;
}
period.addEventListener('change',function(){renderTop();renderHeatmap()});
level.addEventListener('input',function(){renderProbability();renderRows()});
level.addEventListener('change',renderBacktest);
windowEl.addEventListener('change',renderBacktest);yearEl.addEventListener('change',renderBacktest);
birthEl.addEventListener('change',function(){
 birth=/^\d{4}-\d{2}-\d{2}$/.test(birthEl.value)?birthEl.value:'';
 try{birth?localStorage.setItem(BIRTH_KEY,birth):localStorage.removeItem(BIRTH_KEY)}catch(e){}
 renderRows();renderBacktest();
});
fetch('./draws.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(function(data){
 archive=validate(data);
 $('totalCount').textContent=fmt(archive.length,0);
 $('lastDate').textContent=niceDate(archive[archive.length-1].date);
 $('dataStatus').textContent='Arkiv sist hentet '+data.retrieved+' · kilde: Statyr · ikke offisielt bekreftet';
 renderTop();renderHeatmap();renderRows();renderProbability();renderRecent();
 setTimeout(renderBacktest,30);
 UI.renderPrereg('keno',$('prereg'),archive,'./preregistered.json');
}).catch(function(err){
 ['topInfo','periodDescription'].forEach(function(id){if($(id))$(id).textContent='Kan ikke laste historikken: '+err.message});
 $('backtest').textContent='';$('rows').textContent='Trekningene kunne ikke lastes.';$('recentDraws').textContent='Trekningene kunne ikke lastes.';
 $('dataStatus').textContent='Datastatus: feil ved lasting';
});
})();
