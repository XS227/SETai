/* SETAEI Forskning: one page engine for Keno, Lotto and EuroJackpot (<body data-game data-url data-prereg>). */
(function(){
'use strict';
var E=window.SETAEI_ENGINE,U=window.SETAEI_UI,V=window.SETAEI_VIZ,$=U.$,el=U.el,fmt=U.fmt,pct=U.pct,pfmt=U.pfmt;
var body=document.body,game=body.getAttribute('data-game'),G=E.GAMES[game],DATA=body.getAttribute('data-url'),PREREG=body.getAttribute('data-prereg');
var PER_YEAR={keno:365,lotto:52,eurojackpot:104}[game];
var NAMES={numerology:'Numerologi',hot:'Hyppigste',gap:'Lengst siden',random:'Tilfeldig kontroll'};
var FIELD={main:'Hovedtall',stars:'Stjernetall',numbers:'Tall'};
var st={draws:[],level:10,tab:'numerology',pick:{},birth:'',sel:null,fview:'radial',fgroup:0,cells:null,cellMap:{},payouts:null,lottoPrizes:null,recentN:5,series:{numerology:true,random:true,hot:true,cold:false,fixed:false}};
try{st.birth=localStorage.getItem('setaei-forskning-birth')||''}catch(e){}
$('copyrightYear').textContent=new Date().getFullYear();

/* ---------- helpers ---------- */
function slots(){return game==='keno'?G.slots.filter(function(s){return s.id==='k'+st.level}):G.slots}
function primary(){return slots()[0]}
function fieldOf(slot){return slot.field}
function drawn(d,slot){return d[slot.field]}
function groups(){var g={};G.slots.forEach(function(s){(g[s.field]=g[s.field]||[]).push(s)});return Object.keys(g).map(function(k){return g[k][0]})}
function fieldDraws(slot){return st.draws.filter(function(d){return !slot.from||d.date>=slot.from})}
function labelOf(slot){return game==='eurojackpot'?(slot.field==='stars'?'Stjernetall':'Hovedtall'):'Tall'}
function daysUntil(iso){var a=new Date(new Date().toISOString().slice(0,10)+'T12:00:00Z'),b=new Date(iso+'T12:00:00Z');return Math.round((b-a)/864e5)}
function nextDate(){return E.nextDrawDate(game,st.draws[st.draws.length-1].date)}
function rowsNext(){return E.buildRows(game,st.draws,nextDate())}
function cell(key){return st.cellMap[key]}
function oneOf(p){return p>0?'1 av '+fmt(Math.round(1/p),0):'—'}
function section(node,list){list.forEach(function(c){node.appendChild(c)})}
function mkTabs(box,items,cur,cb){box.textContent='';items.forEach(function(it){var b=el('button',null,it[1]);b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',it[0]===cur?'true':'false');b.addEventListener('click',function(){cb(it[0])});box.appendChild(b)})}

/* ---------- 0. hero: next draw ---------- */
function renderHero(){
 var next=nextDate(),d=daysUntil(next),rows=rowsNext();
 $('nextWhen').textContent='';
 $('nextWhen').appendChild(el('b',null,U.niceDate(next)));
 $('nextWhen').appendChild(document.createTextNode(' · '+(d<=0?'i dag':d===1?'i morgen':'om '+d+' dager')));
 mkTabs($('strategyTabs'),[['numerology','Numerologi'],['hot','Hyppigste'],['gap','Lengst siden'],['random','Tilfeldig kontroll']],st.tab,function(t){st.tab=t;renderHero()});
 if(game==='keno'){
  var lc=$('levelChips');lc.textContent='';lc.appendChild(el('span','lbl','Nivå'));
  for(var k=2;k<=10;k++)(function(k){var b=el('button','chip',String(k));b.type='button';b.setAttribute('aria-pressed',st.level===k?'true':'false');b.addEventListener('click',function(){st.level=k;renderLevelDependent()});lc.appendChild(b)})(k);
 }
 var box=$('nextBalls');box.textContent='';var idx=0;
 slots().forEach(function(slot){
  var wrap=el('div');if(slots().length>1)wrap.appendChild(el('div','grouplabel',labelOf(slot)+' · '+slot.k));
  var b=el('div','bigballs');rows[st.tab][slot.id].forEach(function(n){var x=el('span','ball xl'+(slot.field==='stars'?' star':''),String(n));x.style.animationDelay=(idx++*45)+'ms';b.appendChild(x)});
  wrap.appendChild(b);box.appendChild(wrap);
 });
 var p=primary(),e=E.hyper(p).e,why=$('nextWhy');why.textContent='';
 if(st.tab==='numerology'){
  var det=el('details','more'),sm=el('summary',null,'Hvorfor disse tallene?');det.appendChild(sm);var bd=el('div','body');
  slots().forEach(function(slot){var r=E.numFor(game,slot).row(next,slot.k),ul=el('ul','refs');r.reasons.forEach(function(x){ul.appendChild(el('li',null,x.number+' · '+x.sources.join(' · ')))});if(slots().length>1)bd.appendChild(el('div','grouplabel',labelOf(slot)));bd.appendChild(ul)});
  bd.appendChild(el('p','mini','Hvert tall kommer fra en navngitt faktor (universelt dagtall, måned, år, dag, speilet dag …) redusert etter Åse Steinslands metode med mestertall 11/22/33. Metoden er deterministisk: samme dato gir alltid samme rekke.'));
  det.appendChild(bd);why.appendChild(det);
 }else{
  why.appendChild(el('p','mini',{hot:'De tallene som er trukket oftest i de siste '+G.hotWindow+' trekningene.',gap:'De tallene som har ventet lengst siden sist de ble trukket.',random:'En tilfeldig rekke, seedet på datoen. Den ærlige målestokken alle andre metoder må slå.'}[st.tab]))
 }
 var facts=$('nextFacts');facts.textContent='';
 function fact(t,v){var s=el('span');s.appendChild(document.createTextNode(t+' '));s.appendChild(el('b',null,v));facts.appendChild(s)}
 fact('Forventet treff uansett metode:',slots().map(function(s){return fmt(E.hyper(s).e,2)}).join(' + '));
 fact('Alle riktige:',slots().map(function(s){return oneOf(1/E.comb(s.pool,s.k))}).join(' · ').replace(/^1 av /,'1 av '));
 var lock=el('span');lock.id='lockInfo';facts.appendChild(lock);
 U.preregDoc(PREREG).then(function(doc){var en=(doc.entries||[]).filter(function(x){return x.reg.date===next})[0],l=$('lockInfo');if(!l)return;l.textContent='';if(en){l.appendChild(document.createTextNode('Låst '));l.appendChild(el('b',null,en.reg.registeredAt.slice(0,16).replace('T',' ')+' UTC'));l.appendChild(document.createTextNode(' · hash '+en.hash.slice(0,10)+'…'))}else l.appendChild(document.createTextNode('Ikke låst ennå (låses automatisk før trekning)'))});
 var cp=$('copyRow');cp.onclick=function(){var t=slots().map(function(s){return rows[st.tab][s.id].join(' ')}).join(' | ');try{navigator.clipboard.writeText(t);cp.textContent='Kopiert'}catch(x){cp.textContent=t}setTimeout(function(){cp.textContent='Kopier rekke'},2000)};
}

/* ---------- 1. overview ---------- */
function renderOverview(){
 var p=primary(),num=cell('numerology|'+p.id),rnd=cell('random|'+p.id);if(!num)return;
 var box=$('kpis');box.textContent='';
 var k1=el('div','kpi'),db=el('div','donutbox'),dv=el('div');
 var dn=el('div','chart');dn.style.width='104px';V.donut(dn,{value:num.mean/p.k,chance:num.expected/p.k,text:fmt(100*num.mean/p.k,1)+'%',aria:'Andel tall truffet'});
 db.appendChild(dn);dv.appendChild(el('div','l','Treffprosent · numerologi'));dv.appendChild(el('div','d','av trukne tall traff rekka (tilbakeregnet, '+fmt(num.n,0)+' trekninger). Hvit strek = ren tilfeldighet '+fmt(100*num.expected/p.k,1)+' %.'));db.appendChild(dv);k1.appendChild(db);
 var k2=el('div','kpi');k2.appendChild(el('div','l','Tilfeldig kontroll'));k2.appendChild(el('div','v',fmt(100*rnd.mean/p.k,1)+' %'));k2.appendChild(el('div','d','Samme test med en tilfeldig rekke. Forskjellen mellom oss og kontrollen er det som teller.'));
 var k3=el('div','kpi');k3.appendChild(el('div','l','Signifikans (primærtest)'));k3.appendChild(el('div','v'+(num.p<.05?' acc':''),'p = '+pfmt(num.p)));k3.appendChild(el('div','d','z = '+(num.z>=0?'+':'')+fmt(num.z,2)+' · Holm-p = '+pfmt(num.holm)+' over hele familien på '+st.cells.length+' tester.'));
 var k4=el('div','kpi');k4.id='kpiPre';k4.appendChild(el('div','l','Forhåndsregistrert (live)'));k4.appendChild(el('div','v','…'));k4.appendChild(el('div','d','Rekker låst før trekning, scoret etterpå.'));
 [k1,k2,k3,k4].forEach(function(k){box.appendChild(k)});
 var sig=st.cells.filter(function(c){return c.holm<.05}).length,raw=st.cells.filter(function(c){return c.p<.05}).length;
 $('verdict').textContent='Kort sagt: av '+st.cells.length+' strategier ser '+raw+' «signifikante» ut uten korreksjon (ca. '+fmt(st.cells.length*.05,1)+' er ventet av ren flaks), og '+sig+' overlever Holm-korreksjonen. Så langt er ingen metode til å skille fra tilfeldighet.';
 U.preregDoc(PREREG).then(function(doc){var en=doc.entries||[],by={};st.draws.forEach(function(d){by[d.date]=1});var sc=en.filter(function(e){return by[e.reg.date]}).length,k=$('kpiPre');if(!k)return;k.querySelector('.v').textContent=sc+' / '+en.length;k.querySelector('.d').textContent=sc?'trekninger scoret av '+en.length+' låste. Ingen konklusjon før 30.':'ingen scorede ennå, '+en.length+' låst og venter på trekning. Ingen konklusjon før 30 scorede.'});
}

/* ---------- 2. visualisations ---------- */
function periodDraws(slot){
 var x=$('period').value,ds=fieldDraws(slot);
 if(x==='all')return ds;if(/^\d{4}$/.test(x))return ds.filter(function(d){return d.date.slice(0,4)===x});
 return ds.slice(-Number(x));
}
function renderFreq(){
 var slot=groups()[st.fgroup]||groups()[0],ds=periodDraws(slot),pool=slot.pool,p=slot.drawn/pool,N=ds.length,Ex=N*p,sd=Math.sqrt(N*p*(1-p));
 var c=E.counts(ds.map(function(d){return d[slot.field]}),pool);
 var o={n:pool,values:c,expected:Ex,sd:sd,selected:st.sel,onPick:function(i){st.sel=st.sel===i?null:i;renderFreq()}};
 mkTabs($('freqView'),[['radial','Sirkel'],['bars','Stolper (σ)']],st.fview,function(v){st.fview=v;renderFreq()});
 if(groups().length>1){var gt=$('freqGroup');gt.hidden=false;mkTabs(gt,groups().map(function(g,i){return [String(i),labelOf(g)]}),String(st.fgroup),function(v){st.fgroup=Number(v);st.sel=null;renderFreq()})}
 var ch=$('freqChart');ch.style.maxWidth=st.fview==='radial'?'520px':'';ch.style.margin=st.fview==='radial'?'0 auto':'';
 (st.fview==='radial'?V.radial:V.zbars)(ch,o);
 var info=$('freqInfo');
 if(st.sel==null)info.textContent='Hvert felt viser hvor mange standardavvik (σ) et tall ligger fra forventet frekvens ('+fmt(Ex,1)+' trekk over '+fmt(N,0)+' trekninger). Oransje = over +2σ, blå = under −2σ. Ved ren tilfeldighet havner ca. '+fmt(pool*.0455,1)+' av '+pool+' tall utenfor ±2σ.';
 else{var all=fieldDraws(slot).map(function(d){return d[slot.field]}),g=E.gaps(all,pool)[st.sel],z=(c[st.sel]-Ex)/sd;info.textContent='Tall '+st.sel+': '+c[st.sel]+' trekk ('+(z>=0?'+':'')+fmt(z,2)+' σ). Siden sist: '+g+' trekninger. Sannsynlighet for en pause på minst '+g+' under ren tilfeldighet: '+pct(Math.pow(1-p,g))+'. Tall har ikke hukommelse, derfor er «forfalt» et mønster i hodet, ikke i trekningen.'}
}
function renderDist(){
 var p=primary(),num=cell('numerology|'+p.id),rnd=cell('random|'+p.id);if(!num||!num.hits)return;
 function dist(c){var d=new Array(p.k+1).fill(0);c.hits.forEach(function(h){d[h]++});return d.map(function(x){return x/c.hits.length})}
 var labels=[];for(var h=0;h<=p.k;h++)labels.push(String(h));
 V.histogram($('distChart'),{labels:labels,aria:'Antall riktige: observert mot teori',series:[{name:'Teori (hypergeometrisk)',color:'#ffffff55',values:E.matchDist(p)},{name:'Numerologi',color:V.C.ACC,values:dist(num)},{name:'Tilfeldig kontroll',color:V.C.COOL,values:dist(rnd)}]});
 $('distLegend').innerHTML='<span><i style="background:#ffffff55"></i>Teori</span><span><i style="background:'+V.C.ACC+'"></i>Numerologi</span><span><i style="background:'+V.C.COOL+'"></i>Tilfeldig kontroll</span>';
}
function renderPath(){
 var p=primary(),e=E.hyper(p),defs=[['numerology|'+p.id,'Numerologi',V.C.ACC,'numerology',3],['random|'+p.id,'Tilfeldig kontroll',V.C.COOL,'random',2],['hot'+G.windows[1]+'|'+p.id,'Hyppigste (vindu '+G.windows[1]+')',V.C.BLUE,'hot',2],['cold'+G.windows[1]+'|'+p.id,'Sjeldneste (vindu '+G.windows[1]+')','#c8a2f0','cold',2],['fixed|'+p.id,'Faste laveste tall',V.C.WARN,'fixed',2]];
 var ser=[],dates=null;
 defs.forEach(function(d){var c=cell(d[0]);if(!c||!c.hits||!st.series[d[3]])return;var cum=0,ex=c.hits.map(function(h){cum+=h-e.e;return cum});ser.push({name:d[1],color:d[2],excess:ex,width:d[4]});dates=dates||c.dates});
 V.paths($('pathChart'),{series:ser,sdPerDraw:Math.sqrt(e.v),dates:dates});
 var lg=$('pathLegend');lg.textContent='';
 defs.forEach(function(d){var b=el('button','chip ser');var dot=el('i');dot.style.background=d[2];b.appendChild(dot);b.appendChild(document.createTextNode(d[1]));b.type='button';b.setAttribute('aria-pressed',st.series[d[3]]?'true':'false');b.addEventListener('click',function(){st.series[d[3]]=!st.series[d[3]];renderPath()});lg.appendChild(b)});
}

/* ---------- 3. lab ---------- */
function labSlots(){return slots()}
function pickSet(slot){return st.pick[slot.id]||(st.pick[slot.id]=new Set())}
function renderLab(){
 var box=$('labPicker');box.textContent='';
 labSlots().forEach(function(slot){
  var wrap=el('div');wrap.appendChild(el('div','grouplabel',(game==='eurojackpot'?labelOf(slot)+' · velg '+slot.k:'Velg '+slot.k+' tall')+' · valgt '+pickSet(slot).size));
  var pk=el('div','picker'+(slot.field==='stars'?' stars':''));
  for(var n=1;n<=slot.pool;n++)(function(n){var b=el('button',pickSet(slot).has(n)?'sel':'',String(n));b.type='button';b.setAttribute('aria-pressed',pickSet(slot).has(n)?'true':'false');b.addEventListener('click',function(){var s=pickSet(slot);if(s.has(n))s.delete(n);else if(s.size<slot.k)s.add(n);renderLab()});pk.appendChild(b)})(n);
  wrap.appendChild(pk);box.appendChild(wrap);
 });
 var tools=$('labTools');tools.textContent='';
 function tool(label,fn,cls){var b=el('button','btn'+(cls?' '+cls:''),label);b.type='button';b.addEventListener('click',function(){fn();renderLab()});tools.appendChild(b)}
 tool('Numerologi',function(){setFrom('numerology')});tool('Hyppigste',function(){setFrom('hot')});tool('Lengst siden',function(){setFrom('gap')});
 tool('Tilfeldig',function(){labSlots().forEach(function(s){st.pick[s.id]=new Set(E.randomRow('lab'+Math.random(),s.k,s.pool))})});
 tool('Tøm',function(){st.pick={}});
 renderReplay();renderSim();renderPersonal();
}
function setFrom(strat){var r=rowsNext();labSlots().forEach(function(s){st.pick[s.id]=new Set(r[strat][s.id])})}
function complete(){return labSlots().every(function(s){return pickSet(s).size===s.k})}
function renderReplay(){
 var out=$('labReplay');out.textContent='';
 if(!complete()){out.appendChild(el('p','mini','Velg '+labSlots().map(function(s){return s.k+' '+(game==='eurojackpot'?labelOf(s).toLowerCase():'tall')}).join(' og ')+' for å se hvordan rekka din ville gått på alle tidligere trekninger.'));return}
 var s0=labSlots()[0],ds=fieldDraws(s0).filter(function(d){return d.date>=G.testFrom}),hs=[];
 ds.forEach(function(d){hs.push(E.hits(Array.from(pickSet(s0)),d[s0.field]))});
 var e=E.hyper(s0),mean=hs.reduce(function(a,b){return a+b},0)/hs.length,z=(mean-e.e)/Math.sqrt(e.v/hs.length),d=new Array(s0.k+1).fill(0);hs.forEach(function(h){d[h]++});
 var top=el('div','grid3');
 [['Snitt riktige',fmt(mean,3),'forventet '+fmt(e.e,3)],['Avvik',(z>=0?'+':'')+fmt(z,2)+' σ','p = '+pfmt(E.pTwoSided(z))],['Trekninger',fmt(hs.length,0),'fra '+G.testFrom]].forEach(function(x){var k=el('div','kpi');k.appendChild(el('div','l',x[0]));k.appendChild(el('div','v',x[1]));k.appendChild(el('div','d',x[2]));top.appendChild(k)});
 out.appendChild(top);
 var ch=el('div','chart');ch.style.marginTop='12px';out.appendChild(ch);
 var labels=[];for(var h=0;h<=s0.k;h++)labels.push(String(h));
 V.histogram(ch,{labels:labels,aria:'Din rekke: antall riktige historisk',series:[{name:'Teori',color:'#ffffff55',values:E.matchDist(s0)},{name:'Din rekke',color:V.C.ACC,values:d.map(function(x){return x/hs.length})}]});
 out.appendChild(el('p','cap','Å velge tall etter å ha sett historien er etterpåklokskap: nesten enhver rekke kan se bra ut bakover. Derfor teller bare rekker som ble låst før trekningen (se Forskningsdesign).'));
}
function simDraw(slot){var a=[];for(var i=1;i<=slot.pool;i++)a.push(i);for(i=0;i<slot.drawn;i++){var j=i+Math.floor(Math.random()*(slot.pool-i)),t=a[i];a[i]=a[j];a[j]=t}return a.slice(0,slot.drawn)}
function renderSim(){
 var box=$('simBox');box.textContent='';
 if(!complete()){box.appendChild(el('p','mini','Velg rekka di først.'));return}
 var rg=el('div','range'),inp=el('input');inp.type='range';inp.min=2;inp.max=5;inp.step=1;inp.value=st.simPow||3;var out=el('output',null,fmt(Math.pow(10,inp.value),0));
 inp.addEventListener('input',function(){out.textContent=fmt(Math.pow(10,inp.value),0);st.simPow=Number(inp.value)});
 var go=el('button','btn primary','Simuler trekninger');go.type='button';rg.appendChild(el('label',null,'Antall trekninger'));rg.appendChild(inp);rg.appendChild(out);rg.appendChild(go);box.appendChild(rg);
 var res=el('div');box.appendChild(res);
 go.addEventListener('click',function(){
  var s0=labSlots()[0],n=Math.pow(10,Number(inp.value)),mine=Array.from(pickSet(s0)),d=new Array(s0.k+1).fill(0),ret=0,pay=game==='keno'&&st.payouts?st.payouts.levels[String(s0.k)]:null;
  for(var i=0;i<n;i++){var h=E.hits(mine,simDraw(s0));d[h]++;if(pay)ret+=pay[String(h)]||0}
  res.textContent='';var ch=el('div','chart');res.appendChild(ch);var labels=[];for(var h=0;h<=s0.k;h++)labels.push(String(h));
  V.histogram(ch,{labels:labels,aria:'Simulert treffordeling',series:[{name:'Teori',color:'#ffffff55',values:E.matchDist(s0)},{name:'Simulering',color:V.C.COOL,values:d.map(function(x){return x/n})}]});
  var t='Simulert '+fmt(n,0)+' tilfeldige trekninger. ';
  if(pay)t+='Med 1 kr per trekning (innsats '+fmt(n,0)+' kr) ville utbetalingen blitt '+fmt(ret,0)+' kr, altså '+fmt(100*ret/n,1)+' % tilbake. Teoretisk gjennomsnitt: '+fmt(st.rtp[s0.k]*100,1)+' %. Jo flere trekninger, jo nærmere kommer du teorien; det er loven om store tall, ikke flaks som «jevner seg ut».';
  else t+='Forskjellen mellom simulering og teori krymper når antall trekninger øker.';
  res.appendChild(el('p','cap',t));
 });
}
function renderPersonal(){
 var box=$('personal');box.textContent='';
 var inp=el('input');inp.type='date';inp.min='1900-01-01';inp.value=st.birth;inp.setAttribute('aria-label','Fødselsdato');
 inp.addEventListener('change',function(){st.birth=/^\d{4}-\d{2}-\d{2}$/.test(inp.value)?inp.value:'';try{st.birth?localStorage.setItem('setaei-forskning-birth',st.birth):localStorage.removeItem('setaei-forskning-birth')}catch(e){}renderPersonal()});
 var lab=el('label','grouplabel','Fødselsdato (lagres bare i din nettleser)');box.appendChild(lab);box.appendChild(inp);
 if(!st.birth)return;
 var out=el('div');out.style.marginTop='12px';box.appendChild(out);var next=nextDate();
 try{
  slots().forEach(function(slot){var r=E.numFor(game,slot).row(next,slot.k,st.birth);if(slots().length>1)out.appendChild(el('div','grouplabel',labelOf(slot)));var b=el('div','bigballs');r.numbers.forEach(function(n){b.appendChild(el('span','ball xl'+(slot.field==='stars'?' star':''),String(n)))});out.appendChild(b);
   var ds=fieldDraws(slot).filter(function(d){return d.date>=G.testFrom&&d.date>st.birth}),hs=ds.map(function(d){return E.hits(E.numFor(game,slot).row(d.date,slot.k,st.birth).numbers,d[slot.field])}),e=E.hyper(slot);
   if(hs.length){var m=hs.reduce(function(a,b){return a+b},0)/hs.length,z=(m-e.e)/Math.sqrt(e.v/hs.length);out.appendChild(el('p','cap','Historisk snitt for din personlige rekke: '+fmt(m,3)+' riktige mot '+fmt(e.e,3)+' forventet (z = '+(z>=0?'+':'')+fmt(z,2)+', p = '+pfmt(E.pTwoSided(z))+'). Dette er én fødselsdato og tester ikke noe i seg selv: prøver du mange datoer finner du alltid en som «virker» (H4).'))}});
 }catch(err){out.appendChild(el('p','mini',err.message))}
}

/* ---------- 4. possible winnings ---------- */
function renderPay(){
 var box=$('payBox');box.textContent='';
 function table(heads,rows){var tb=el('div','tablebox'),t=el('table','table'),th=el('thead'),hr=el('tr');heads.forEach(function(h){hr.appendChild(el('th',null,h))});th.appendChild(hr);t.appendChild(th);var tbody=el('tbody');rows.forEach(function(r){var tr=el('tr');r.forEach(function(v){tr.appendChild(el('td',null,String(v)))});tbody.appendChild(tr)});t.appendChild(tbody);tb.appendChild(t);return tb}
 if(game==='keno'){
  var k=st.level,pay=st.payouts&&st.payouts.levels[String(k)],md=E.matchDist(primary()),rows=[],rtp=0,contrib=[];
  for(var h=0;h<=k;h++){var o=pay&&pay[String(h)]||0,c=md[h]*o;rtp+=c;contrib.push(c);rows.push([h,pfmt(md[h]*100)+' %',oneOf(md[h]),o?o+'× innsats':'—',o?fmt(c*100,2)+' %':'—'])}
  box.appendChild(el('p','lead','Nivå '+k+': slik fordeler sannsynlighet og utbetaling seg. Utbetalingene er Norsk Tippings faste multipler av innsatsen.'));
  box.appendChild(table(['Riktige','Sannsynlighet','Én av','Utbetaling','Bidrag til tilbakebetaling'],rows));
  var kp=el('div','grid3');kp.style.marginTop='12px';
  [['Forventet tilbake',fmt(rtp*100,1)+' kr','per 100 kr satset, i det lange løp'],['Spillselskapets andel',fmt(100-rtp*100,1)+' kr','blir igjen av hver 100 kr'],['Alle '+k+' riktige',oneOf(md[k]),(pay&&pay[String(k)]?fmt(pay[String(k)],0)+'× innsats':'')]].forEach(function(x){var q=el('div','kpi');q.appendChild(el('div','l',x[0]));q.appendChild(el('div','v',x[1]));q.appendChild(el('div','d',x[2]));kp.appendChild(q)});box.appendChild(kp);
  var ch=el('div','chart');ch.style.marginTop='12px';box.appendChild(ch);var labs=[];for(h=0;h<=k;h++)labs.push(String(h));
  V.histogram(ch,{labels:labs,aria:'Bidrag til forventet tilbakebetaling per antall riktige',series:[{name:'Bidrag til tilbakebetaling',color:V.C.ACC,values:contrib}]});
  box.appendChild(el('p','cap','Søylene viser hvor mye hvert treffantall bidrar til de '+fmt(rtp*100,1)+' % som i snitt betales ut. Ingen rekke, uansett metode, endrer disse tallene: alle rekker på samme nivå har identisk sannsynlighet og identisk forventet tilbakebetaling. Kilde: '+(st.payouts?st.payouts.drawName+' (offisielt resultat), hentet '+st.payouts.retrieved:'')+'.'));
 }else if(game==='lotto'){
  var tot=E.comb(34,7),tiers=[['7 rette',1],['6 + 1 rette (tilleggstall)',7],['6 rette',7*26],['5 rette',E.comb(7,5)*E.comb(27,2)],['4 rette',E.comb(7,4)*E.comb(27,3)]],pz=st.lottoPrizes?st.lottoPrizes.prize:[];
  var rows2=tiers.map(function(t,i){var pr=pz[i];return [t[0],oneOf(t[1]/tot),pfmt(t[1]/tot*100)+' %',pr?fmt(pr.amountNOK,0)+' kr':'—',pr?fmt(pr.winners,0):'—']});
  box.appendChild(el('p','lead','Lotto er pari-mutuel: premiene deles av antall vinnere og endres hver uke. Sannsynlighetene under er derimot faste og eksakte (C(34,7) = '+fmt(tot,0)+' mulige rekker).'));
  box.appendChild(table(['Premienivå','Én av','Sannsynlighet','Eksempel: '+(st.lottoPrizes?st.lottoPrizes.drawName:''),'Vinnere'],rows2));
  var any=(tiers.reduce(function(a,t){return a+t[1]},0))/tot;box.appendChild(el('p','cap','Sannsynlighet for minst 4 rette: '+oneOf(any)+'. Alle rekker har lik sjanse; en «populær» rekke (f.eks. datoer) gir ikke større sjanse, men deler gevinsten med flere dersom den vinner.'));
 }else{
  var P=function(a){return E.comb(5,a)*E.comb(45,5-a)/E.comb(50,5)},Q=function(b){return E.comb(2,b)*E.comb(10,2-b)/E.comb(12,2)};
  var order=[[5,2],[5,1],[5,0],[4,2],[4,1],[3,2],[4,0],[2,2],[3,1],[3,0],[1,2],[2,1]],sum=0,rows3=order.map(function(t,i){var p=P(t[0])*Q(t[1]);sum+=p;return [i+1,t[0]+' + '+t[1],oneOf(p),pfmt(p*100)+' %']});
  box.appendChild(el('p','lead','EuroJackpot har 12 premienivåer. Premiebeløpene varierer for hver trekning, så vi viser kun de eksakte sannsynlighetene (C(50,5)·C(12,2) = '+fmt(E.comb(50,5)*E.comb(12,2),0)+' mulige rekker).'));
  box.appendChild(table(['Nivå','Hovedtall + stjerner','Én av','Sannsynlighet'],rows3));
  box.appendChild(el('p','cap','Sannsynlighet for en gevinst på et av de 12 nivåene: '+oneOf(sum)+'. Tallene er rene kombinatorikk og kan ikke påvirkes av hvilke tall du velger.'));
 }
}

/* ---------- 5. recent draws ---------- */
function renderRecent(){
 U.renderRecent(game,$('recentDraws'),st.draws,{preregUrl:PREREG,slotId:game==='keno'?'k'+st.level:null,n:st.recentN});
 var b=$('recentMore');b.textContent=st.recentN===5?'Vis 10 trekninger':'Vis færre';b.onclick=function(){st.recentN=st.recentN===5?10:5;renderRecent()};
}

/* ---------- 6. research design ---------- */
function renderPower(){
 var p=primary(),e=E.hyper(p),sd=Math.sqrt(e.v),box=$('powerBox');box.textContent='';
 var rg=el('div','range'),inp=el('input');inp.type='range';inp.min=0.5;inp.max=10;inp.step=0.5;inp.value=st.eff||2;var out=el('output',null,'+'+fmt(inp.value,1)+' %');
 rg.appendChild(el('label',null,'Tenkt reell forbedring i snitt riktige'));rg.appendChild(inp);rg.appendChild(out);box.appendChild(rg);
 var res=el('div','grid3');box.appendChild(res);var note=el('p','cap');box.appendChild(note);
 function calc(){
  st.eff=Number(inp.value);out.textContent='+'+fmt(st.eff,1)+' %';var delta=st.eff/100*e.e,n=Math.pow((1.959964+0.841621)*sd/delta,2),have=cell('numerology|'+p.id).n;
  res.textContent='';[['Trekninger som kreves',fmt(Math.ceil(n),0),'for 80 % sjanse til å oppdage effekten (α = 0,05, tosidig)'],['Tid',n/PER_YEAR<1?fmt(n/PER_YEAR*12,1)+' måneder':fmt(n/PER_YEAR,1)+' år','med '+PER_YEAR+' trekninger i året'],['Vi har',fmt(have,0)+' trekninger','minste påvisbare effekt nå: +'+fmt(2.801585*sd/Math.sqrt(have)/e.e*100,1)+' %']].forEach(function(x){var k=el('div','kpi');k.appendChild(el('div','l',x[0]));k.appendChild(el('div','v',x[1]));k.appendChild(el('div','d',x[2]));res.appendChild(k)});
  note.textContent='Beregning: n = ((z₁₋α/₂ + z₁₋β)·σ / δ)², σ = '+fmt(sd,3)+' riktige per trekning (hypergeometrisk), δ = '+fmt(delta,4)+'. Med bare 30 forhåndsregistrerte trekninger kan vi bare oppdage en forbedring på ca. '+fmt(2.801585*sd/Math.sqrt(30)/e.e*100,0)+' % av forventet treff. Små effekter krever mange år med data, og det er derfor vi ikke trekker konklusjoner tidlig.';
 }
 inp.addEventListener('input',calc);calc();
}
function renderBacktest(){
 var yr=$('testYear').value,cells=E.backtestAll(game,st.draws,yr),tb=$('backtest');tb.textContent='';
 var name=function(c){return (c.strategy==='hot'?'Hyppigste':c.strategy==='cold'?'Sjeldneste':{numerology:'Numerologi',random:'Tilfeldig kontroll',fixed:'Faste laveste tall'}[c.strategy])+(c.window?' (vindu '+c.window+')':'')+' · '+c.slot};
 cells.slice().sort(function(a,b){return a.p-b.p}).forEach(function(c){var tr=el('tr',c.strategy==='numerology'?'primary':'');[name(c),fmt(c.n,0),fmt(c.mean,3),(c.mean-c.expected>=0?'+':'')+fmt(c.mean-c.expected,3),(c.z>=0?'+':'')+fmt(c.z,2),pfmt(c.p),pfmt(c.holm),String(c.max)].forEach(function(v,i){tr.appendChild(el('td',i===6?(c.holm<.05?'good':'muted'):i===4?(Math.abs(c.z)>=2?(c.z>0?'good':'negative'):'muted'):null,v))});tb.appendChild(tr)});
 var sig=cells.filter(function(c){return c.holm<.05}).length,raw=cells.filter(function(c){return c.p<.05}).length,minH=Math.min.apply(null,cells.map(function(c){return c.holm}));
 $('backtestNotice').textContent=cells.length+' tester i familien. Uten korreksjon har '+raw+' p < 0,05 (ventet ved flaks: ca. '+fmt(cells.length*.05,1)+'). Etter Holm har '+sig+' det; laveste Holm-p er '+pfmt(minH)+'. Tilfeldig kontroll og faste tall er med i familien nettopp for å vise hvor store avvik ren flaks gir.';
}

/* ---------- 7. numbers & tests ---------- */
function renderTop(){
 var box=$('topBox');box.textContent='';
 groups().forEach(function(slot){
  var pool=slot.pool,p=slot.drawn/pool,ds=periodDraws(slot),arr=ds.map(function(d){return d[slot.field]}),c=E.counts(arr,pool),N=arr.length,Ex=N*p,sd=Math.sqrt(N*p*(1-p)),all=fieldDraws(slot).map(function(d){return d[slot.field]}),g=E.gaps(all,pool),nums=[];for(var n=1;n<=pool;n++)nums.push(n);
  var wrap=el('div');if(groups().length>1)wrap.appendChild(el('h4','sub-h',labelOf(slot)));
  var grid=el('div','topgrid');
  function list(title,items,vf,nf){var pn=el('div','panel');pn.appendChild(el('h3',null,title));var ol=el('ol','toplist');items.forEach(function(n,i){var li=el('li','toprow');li.appendChild(el('span','rank',String(i+1)));li.appendChild(el('span','ball',String(n)));li.appendChild(el('span','topval',vf(n)));li.appendChild(el('span','topnote',nf(n)));ol.appendChild(li)});pn.appendChild(ol);grid.appendChild(pn)}
  var z=function(n){var v=sd?(c[n]-Ex)/sd:0;return (v>=0?'+':'')+fmt(v,2)+' σ'},top=Math.min(10,pool);
  list('Mest trukket',nums.slice().sort(function(a,b){return c[b]-c[a]||a-b}).slice(0,top),function(n){return c[n]+' trekk'},z);
  list('Minst trukket',nums.slice().sort(function(a,b){return c[a]-c[b]||a-b}).slice(0,top),function(n){return c[n]+' trekk'},z);
  list('Lengst siden sist',nums.slice().sort(function(a,b){return g[b]-g[a]||a-b}).slice(0,top),function(n){return g[n]+' trekn.'},function(n){return 'P = '+pct(Math.pow(1-p,g[n]))});
  if(game==='keno'){
   var pc=new Int32Array(71*71);arr.forEach(function(a){for(var i=0;i<a.length;i++)for(var j=i+1;j<a.length;j++)pc[a[i]*71+a[j]]++});var pairs=[];for(var a=1;a<70;a++)for(var b=a+1;b<=70;b++)pairs.push([a,b,pc[a*71+b]]);pairs.sort(function(x,y){return y[2]-x[2]||x[0]-y[0]||x[1]-y[1]});
   var pn=el('div','panel');pn.appendChild(el('h3',null,'Hyppigste par'));var ol=el('ol','toplist');pairs.slice(0,10).forEach(function(q,i){var li=el('li','toprow');li.appendChild(el('span','rank',String(i+1)));var w=el('span','pair');w.appendChild(el('span','ball',String(q[0])));w.appendChild(el('span','ball',String(q[1])));li.appendChild(w);li.appendChild(el('span','topval',q[2]+' sammen'));li.appendChild(el('span','topnote','forventet '+fmt(N*190/2415,1)));ol.appendChild(li)});pn.appendChild(ol);grid.appendChild(pn);
  }
  wrap.appendChild(grid);
  var ss=0;for(n=1;n<=pool;n++)ss+=Math.pow(c[n]-Ex,2);var chi=N?ss/(N*p*(1-p))*(pool-1)/pool:0,pv=N?E.chiP(chi,pool-1):1,t=el('div','tests');
  [['Likefordelingstest (χ², df '+(pool-1)+')',fmt(chi,1),'p = '+fmt(pv,3)+(pv<.01?' · avvik, undersøk datakilden':' · forenlig med ren tilfeldighet')],['Trekninger i perioden',fmt(N,0),'hvert tall forventes '+fmt(Ex,1)+' ganger (σ ≈ '+fmt(sd,1)+')'],['Snitt sum',fmt(arr.reduce(function(s,a){return s+a.reduce(function(x,y){return x+y},0)},0)/Math.max(1,N),1),'forventet '+fmt(slot.drawn*(pool+1)/2,1)]].forEach(function(r){var d=el('div','test');d.appendChild(el('div','metriclabel',r[0]));d.appendChild(el('div','testval',r[1]));d.appendChild(el('div','detail',r[2]));t.appendChild(d)});
  t.className='tests three';wrap.appendChild(t);box.appendChild(wrap);
 });
}

/* ---------- orchestration ---------- */
function renderLevelDependent(){renderHero();renderLab();renderPay();renderRecent();if(st.cells){renderOverview();renderDist();renderPath();renderPower()}}
function periodOptions(){
 var sel=$('period'),years={};st.draws.forEach(function(d){years[d.date.slice(0,4)]=1});var ys=Object.keys(years).sort().reverse(),first=game==='keno'?'365':'104';
 [[game==='keno'?'90':'52',game==='keno'?'Siste 90 trekninger':'Siste 52 trekninger'],[first,'Siste '+first+' trekninger']].concat(ys.slice(0,4).map(function(y){return [y,'År '+y]}),[['all','Hele arkivet']]).forEach(function(o,i){var op=el('option',null,o[1]);op.value=o[0];if(i===1)op.selected=true;sel.appendChild(op)});
 var ty=$('testYear');ty.appendChild(Object.assign(el('option',null,'Alle år'),{value:'all'}));ys.slice(0,4).forEach(function(y){ty.appendChild(Object.assign(el('option',null,y),{value:y}))});
}
function fetchJSON(u){return fetch(u,{cache:'no-cache'}).then(function(r){if(!r.ok)throw Error(u+' HTTP '+r.status);return r.json()})}
Promise.all([fetchJSON(DATA),game==='keno'?fetchJSON('/forskning/data/keno-payouts.json').catch(function(){return null}):Promise.resolve(null),game==='lotto'?fetchJSON('/forskning/data/lotto-prizes.json').catch(function(){return null}):Promise.resolve(null)]).then(function(r){
 var doc=r[0];st.draws=doc.draws;st.payouts=r[1];st.lottoPrizes=r[2];
 if(!st.draws||st.draws.length<200)throw Error('Datagrunnlag mangler');
 if(st.payouts){st.rtp={};for(var k=2;k<=10;k++){var md=E.matchDist({k:k,pool:70,drawn:20}),pay=st.payouts.levels[String(k)];st.rtp[k]=md.reduce(function(a,p,h){return a+p*(pay[String(h)]||0)},0)}}
 $('totalCount').textContent=fmt(st.draws.length,0);$('lastDate').textContent=U.niceDate(st.draws[st.draws.length-1].date);
 $('dataStatus').textContent='Arkiv sist hentet '+doc.retrieved;
 periodOptions();renderHero();renderLab();renderPay();renderRecent();renderTop();renderFreq();
 $('period').addEventListener('change',function(){renderTop();renderFreq()});$('testYear').addEventListener('change',renderBacktest);
 setTimeout(function(){
  var cells=E.backtestAll(game,st.draws,'all',{trace:true});st.cells=cells;cells.forEach(function(c){st.cellMap[c.key]=c});
  renderOverview();renderDist();renderPath();renderPower();renderBacktest();
 },30);
 U.renderPrereg(game,$('prereg'),st.draws,PREREG);
}).catch(function(err){
 var m=$('loadError');if(m){m.hidden=false;m.textContent='Kunne ikke laste data: '+err.message}
});
})();
