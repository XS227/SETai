/* SETAEI Forskning shared engine (setaei-forskning-engine-v1).
 * One implementation for Keno, Lotto and EuroJackpot: numerology rows, baseline rows,
 * hypergeometric scoring and Holm correction. Works in the browser (window.SETAEI_ENGINE)
 * and in Node (require). Everything is deterministic: same inputs, same rows. */
(function(root){
 'use strict';
 var VERSION='setaei-forskning-engine-v1', MASTERS=[11,22,33];

 /* ---------- numerology (factory, pool = highest number in the game) ---------- */
 function digitSum(n){return String(Math.abs(n)).split('').reduce(function(s,d){return s+Number(d)},0)}
 function reduce(n,keepMasters){
  n=Math.abs(Number(n));
  while(n>9&&!(keepMasters&&MASTERS.indexOf(n)>=0))n=digitSum(n);
  return n;
 }
 function parse(iso){
  if(typeof iso!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(iso))throw Error('Ugyldig dato: '+iso);
  var d=new Date(iso+'T12:00:00Z');
  if(!isFinite(+d)||d.toISOString().slice(0,10)!==iso)throw Error('Datoen finnes ikke: '+iso);
  return {y:Number(iso.slice(0,4)),m:Number(iso.slice(5,7)),d:Number(iso.slice(8,10))};
 }
 function factors(drawISO,birthISO){
  var t=parse(drawISO),raw=digitSum(t.d)+digitSum(t.m)+digitSum(t.y);
  var uy=reduce(digitSum(t.y),true),um=reduce(uy+t.m,true),ud=reduce(raw,true);
  var mirror=Number(String(t.d).padStart(2,'0').split('').reverse().join(''));
  var out={date:drawISO,universalDay:ud,universalMonth:um,universalYear:uy,dateSum:raw,day:t.d,month:t.m,mirror:mirror,yearTail:t.y%100,personal:null};
  if(birthISO){
   var b=parse(birthISO);
   if(birthISO>drawISO)throw Error('Fødselsdato må være før trekningsdatoen.');
   var life=reduce(reduce(b.d,true)+reduce(b.m,true)+reduce(digitSum(b.y),true),true);
   var py=reduce(reduce(b.d)+reduce(b.m)+reduce(digitSum(t.y))),pm=reduce(py+t.m),pd=reduce(pm+t.d);
   out.personal={life:life,birthday:b.d,birthMonth:b.m,personalYear:py,personalMonth:pm,personalDay:pd};
  }
  return out;
 }
 function numerology(MAX,METHOD){
  function row(drawISO,k,birthISO){
   k=Number(k);if(!(k>=1&&k<=MAX))throw Error('Ugyldig nivå');
   var f=factors(drawISO,birthISO),picked=new Map();
   function add(value,label){
    if(!(value>0))return;
    var n=((value-1)%MAX)+1;
    if(!picked.has(n)){if(picked.size>=k)return;picked.set(n,{number:n,sources:[]})}
    var text=label+(n!==value?' ('+value+' → '+n+')':'');
    if(picked.get(n).sources.indexOf(text)<0)picked.get(n).sources.push(text);
   }
   var p=f.personal,anchor=f.universalDay;
   if(p){
    add(p.personalDay,'Personlig dag');add(p.life,'Livstall');add(p.birthday,'Fødselsdag');
    add(p.personalYear,'Personlig år');add(p.personalMonth,'Personlig måned');
    add(p.life+f.universalDay,'Livstall + dagens tall');add(p.birthMonth,'Fødselsmåned');
    anchor=p.personalDay;
   }
   add(f.universalDay,'Universelt dagtall');add(f.day,'Dagen i måneden');
   if(f.dateSum!==f.universalDay)add(f.dateSum,'Datosum før reduksjon');
   add(f.universalMonth,'Universell måned');add(f.universalYear,'Universelt år');
   add(f.day+f.month,'Dag + måned');add(f.mirror,'Dagen speilet');add(f.month,'Måned');add(f.yearTail,'Årstallets to siste sifre');
   [anchor,f.universalMonth,f.universalYear].forEach(function(src,i){
    var r=reduce(src);
    for(var n=r;n<=MAX&&picked.size<k;n+=9)add(n,'Samme rotvibrasjon som '+['dagen','måneden','året'][i]+' ('+r+')');
   });
   for(var n=1;picked.size<k;n++)add(n,'Fyll (stigende)');
   var reasons=Array.from(picked.values()).sort(function(a,b){return a.number-b.number});
   return {date:drawISO,numbers:reasons.map(function(x){return x.number}),reasons:reasons,factors:f,method:METHOD};
  }
  return {METHOD:METHOD,reduce:reduce,digitSum:digitSum,factors:factors,row:row};
 }

 /* ---------- seeded control rows ---------- */
 function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
 function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
 function randomRow(key,k,pool){var r=rng(hash(key)),a=[];for(var i=1;i<=pool;i++)a.push(i);for(i=0;i<k;i++){var j=i+Math.floor(r()*(pool-i));var t=a[i];a[i]=a[j];a[j]=t}return a.slice(0,k).sort(function(x,y){return x-y})}

 /* ---------- frequency rows. `draws` = array of arrays of numbers ---------- */
 function counts(draws,pool){var c=new Array(pool+1).fill(0);draws.forEach(function(d){d.forEach(function(n){c[n]++})});return c}
 function order(pool){var n=[];for(var i=1;i<=pool;i++)n.push(i);return n}
 function hotRow(draws,k,lookback,pool){var c=counts(draws.slice(-lookback),pool);return order(pool).sort(function(a,b){return c[b]-c[a]||a-b}).slice(0,k).sort(function(a,b){return a-b})}
 function gaps(draws,pool){var g=new Array(pool+1).fill(draws.length);for(var i=draws.length-1;i>=0;i--)draws[i].forEach(function(n){if(g[n]===draws.length)g[n]=draws.length-1-i});return g}
 function gapRow(draws,k,pool){var g=gaps(draws,pool);return order(pool).sort(function(a,b){return g[b]-g[a]||a-b}).slice(0,k).sort(function(a,b){return a-b})}

 /* ---------- game definitions ---------- */
 function slotsKeno(){var s=[];for(var k=2;k<=10;k++)s.push({id:'k'+k,field:'numbers',k:k,pool:70,drawn:20});return s}
 var GAMES={
  keno:{label:'Keno',file:'draws.json',slots:slotsKeno(),windows:[90,180,365],hotWindow:90,testFrom:'2013-01-01',numMethod:'setaei-keno-numerology-v1'},
  lotto:{label:'Lotto',slots:[{id:'main7',field:'main',k:7,pool:34,drawn:7}],windows:[26,52,104],hotWindow:52,testFrom:'2016-01-01',numMethod:'setaei-numerology-v1-pool34'},
  eurojackpot:{label:'EuroJackpot',slots:[{id:'main5',field:'main',k:5,pool:50,drawn:5},{id:'stars2',field:'stars',k:2,pool:12,drawn:2,from:'2022-03-25'}],windows:[26,52,104],hotWindow:52,testFrom:'2012-01-01',numMethod:'setaei-numerology-v1-pool50-12'}
 };
 var STRATEGIES=['numerology','hot','gap','random','fixed'];
 var NUM_CACHE={};
 function numFor(game,slot){
  var m=game==='keno'?GAMES.keno.numMethod:'setaei-numerology-v1-pool'+slot.pool, key=game+':'+slot.pool;
  return NUM_CACHE[key]||(NUM_CACHE[key]=numerology(slot.pool,m));
 }
 function slotDraws(game,draws,slot){
  var out=slot.from?draws.filter(function(d){return d.date>=slot.from}):draws;
  return out.map(function(d){return d[slot.field]});
 }
 function controlKey(game,slot,iso){return game==='keno'?'ctrl'+iso:'ctrl'+iso+':'+game+':'+slot.id}
 /* rows for one future draw. Uses only draws strictly before `iso`. */
 function buildRows(game,draws,iso){
  var g=GAMES[game],rows={};STRATEGIES.forEach(function(s){rows[s]={}});
  var past=draws.filter(function(d){return d.date<iso});
  g.slots.forEach(function(slot){
   var sd=slotDraws(game,past,slot),fixed=[];for(var f=1;f<=slot.k;f++)fixed.push(f);
   rows.numerology[slot.id]=numFor(game,slot).row(iso,slot.k).numbers;
   rows.hot[slot.id]=hotRow(sd,slot.k,g.hotWindow,slot.pool);
   rows.gap[slot.id]=gapRow(sd,slot.k,slot.pool);
   rows.random[slot.id]=randomRow(controlKey(game,slot,iso),slot.k,slot.pool);
   rows.fixed[slot.id]=fixed;
  });
  return rows;
 }

 /* ---------- statistics ---------- */
 function phi(z){var t=1/(1+.3275911*Math.abs(z)/Math.SQRT2),y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-z*z/2);return z>=0?(1+y)/2:(1-y)/2}
 function pTwoSided(z){return Math.min(1,2*(1-phi(Math.abs(z))))}
 function hyper(slot){var p=slot.drawn/slot.pool,k=slot.k;return{e:k*p,v:k*p*(1-p)*(slot.pool-k)/(slot.pool-1)}}
 function chiP(x,df){var z=(Math.pow(x/df,1/3)-(1-2/(9*df)))/Math.sqrt(2/(9*df));return 1-phi(z)} // Wilson–Hilferty
 function addDays(iso,n){var d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
 function weekday(iso){return new Date(iso+'T12:00:00Z').getUTCDay()} // 0 = Sunday
 function nextDrawDate(game,last){ // Keno daily, Lotto Saturday, EuroJackpot Tuesday and Friday
  var ok={keno:function(){return true},lotto:function(d){return weekday(d)===6},eurojackpot:function(d){var w=weekday(d);return w===2||w===5}}[game];
  for(var i=1;i<=8;i++){var d=addDays(last,i);if(ok(d))return d}
  throw Error('no draw date found');
 }
 function holm(ps){ // returns adjusted p-values in original order
  var idx=ps.map(function(p,i){return i}).sort(function(a,b){return ps[a]-ps[b]}),m=ps.length,out=new Array(m),run=0;
  idx.forEach(function(i,j){run=Math.max(run,Math.min(1,(m-j)*ps[i]));out[i]=run});
  return out;
 }
 function comb(n,k){if(k<0||k>n)return 0;var o=1;for(var i=1;i<=k;i++)o=o*(n-i+1)/i;return o}
 function matchDist(slot){var o=[];for(var h=0;h<=slot.k;h++)o.push(comb(slot.drawn,h)*comb(slot.pool-slot.drawn,slot.k-h)/comb(slot.pool,slot.k));return o}
 function hits(row,drawn){var s=new Set(drawn),h=0;for(var i=0;i<row.length;i++)if(s.has(row[i]))h++;return h}
 /* Score a list of pre-registered entries ({reg:{date,rows}}) against real draws. */
 function scoreEntries(game,entries,draws){
  var g=GAMES[game],by={};draws.forEach(function(d){by[d.date]=d});
  var cells=[];
  STRATEGIES.forEach(function(s){g.slots.forEach(function(slot){
   var hs=[];
   entries.forEach(function(e){var d=by[e.reg.date],row=e.reg.rows[s]&&e.reg.rows[s][slot.id];if(d&&row)hs.push(hits(row,d[slot.field]))});
   var st=hyper(slot),n=hs.length,mean=n?hs.reduce(function(a,b){return a+b},0)/n:0,z=n?(mean-st.e)/Math.sqrt(st.v/n):0;
   cells.push({strategy:s,slot:slot.id,k:slot.k,n:n,mean:mean,expected:st.e,z:z,p:n?pTwoSided(z):1});
  })});
  var adj=holm(cells.map(function(c){return c.p}));
  cells.forEach(function(c,i){c.holm=adj[i]});
  return cells;
 }

 /* ---------- walk-forward backtest, whole family in one pass ---------- */
 /* Cells for every strategy × slot (× window for hot/cold), Holm-adjusted over the whole family.
  * All strategies are scored on the same draws (those with at least max(window) draws of history). */
 function backtestAll(game,draws,yr,opts){
  var trace=!!(opts&&opts.trace);
  var curDate='',g=GAMES[game],cells={},keys=[],maxW=Math.max.apply(null,g.windows),groups={};
  g.slots.forEach(function(slot){var key=slot.field+'|'+slot.pool+'|'+(slot.from||'');(groups[key]=groups[key]||[]).push(slot)});
  function add(key,meta,h){
   var c=cells[key];if(!c){c=cells[key]=Object.assign({key:key,sum:0,n:0,max:0},meta);keys.push(key)}
   c.sum+=h;c.n++;if(h>c.max)c.max=h;
   if(trace){(c.hits||(c.hits=[])).push(h);(c.dates||(c.dates=[])).push(curDate)}
  }
  Object.keys(groups).forEach(function(gk){
   var slots=groups[gk],first=slots[0],sd=draws.filter(function(d){return !first.from||d.date>=first.from});
   var dates=sd.map(function(d){return d.date}),arr=sd.map(function(d){return d[first.field]}),pool=first.pool,ord=order(pool);
   var counters={};g.windows.forEach(function(w){counters[w]=new Array(pool+1).fill(0)});
   slots.forEach(function(s){s.fixedRow=[];for(var f=1;f<=s.k;f++)s.fixedRow.push(f)});
   for(var i=0;i<arr.length;i++){
    var date=dates[i];curDate=date;
    if(i>=maxW&&date>=g.testFrom&&(yr==='all'||date.slice(0,4)===yr)){
     var drawn=new Set(arr[i]);
     var h0=function(row){var h=0;for(var j=0;j<row.length;j++)if(drawn.has(row[j]))h++;return h};
     var hotO={},coldO={};
     g.windows.forEach(function(w){var c=counters[w];hotO[w]=ord.slice().sort(function(a,b){return c[b]-c[a]||a-b});coldO[w]=ord.slice().sort(function(a,b){return c[a]-c[b]||a-b})});
     slots.forEach(function(slot){
      var m={slot:slot.id,k:slot.k,slotDef:slot};
      add('numerology|'+slot.id,Object.assign({strategy:'numerology'},m),h0(numFor(game,slot).row(date,slot.k).numbers));
      add('random|'+slot.id,Object.assign({strategy:'random'},m),h0(randomRow(controlKey(game,slot,date),slot.k,pool)));
      add('fixed|'+slot.id,Object.assign({strategy:'fixed'},m),h0(slot.fixedRow));
      g.windows.forEach(function(w){
       add('hot'+w+'|'+slot.id,Object.assign({strategy:'hot',window:w},m),h0(hotO[w].slice(0,slot.k)));
       add('cold'+w+'|'+slot.id,Object.assign({strategy:'cold',window:w},m),h0(coldO[w].slice(0,slot.k)));
      });
     });
    }
    g.windows.forEach(function(w){var c=counters[w];if(i>=w)arr[i-w].forEach(function(n){c[n]--});arr[i].forEach(function(n){c[n]++})});
   }
  });
  var list=keys.map(function(k){var c=cells[k],st=hyper(c.slotDef);c.mean=c.n?c.sum/c.n:0;c.expected=st.e;c.z=c.n?(c.mean-st.e)/Math.sqrt(st.v/c.n):0;c.p=c.n?pTwoSided(c.z):1;return c});
  var adj=holm(list.map(function(c){return c.p}));
  list.forEach(function(c,i){c.holm=adj[i];delete c.slotDef;delete c.sum});
  g.slots.forEach(function(s){delete s.fixedRow});
  return list;
 }

 var api={VERSION:VERSION,comb:comb,matchDist:matchDist,numFor:numFor,GAMES:GAMES,STRATEGIES:STRATEGIES,numerology:numerology,hash:hash,rng:rng,randomRow:randomRow,counts:counts,gaps:gaps,hotRow:hotRow,gapRow:gapRow,
  buildRows:buildRows,slotDraws:slotDraws,phi:phi,chiP:chiP,addDays:addDays,nextDrawDate:nextDrawDate,pTwoSided:pTwoSided,hyper:hyper,holm:holm,hits:hits,scoreEntries:scoreEntries,backtestAll:backtestAll,controlKey:controlKey};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SETAEI_ENGINE=api;
})(typeof window!=='undefined'?window:globalThis);
