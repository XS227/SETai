/* SETAEI Forskning: generic analysis page for Lotto and EuroJackpot (data-game on <body>). */
(function(){
'use strict';
var E=window.SETAEI_ENGINE,U=window.SETAEI_UI,$=U.$,el=U.el,fmt=U.fmt,pct=U.pct;
var game=document.body.getAttribute('data-game'),G=E.GAMES[game],draws=[],birth='',BIRTH_KEY='setaei-forskning-birth';
try{birth=localStorage.getItem(BIRTH_KEY)||''}catch(e){}
var FIELD={main:'Hovedtall',stars:'Stjernetall'};
$('copyrightYear').textContent=new Date().getFullYear();
function groups(){var g={};G.slots.forEach(function(s){(g[s.field]=g[s.field]||[]).push(s)});return Object.keys(g).map(function(k){return g[k]})}
function fieldDraws(slot){return draws.filter(function(d){return !slot.from||d.date>=slot.from})}
function periodDraws(slot){
 var x=$('period').value,ds=fieldDraws(slot);
 if(x==='all')return ds;
 if(/^\d{4}$/.test(x))return ds.filter(function(d){return d.date.slice(0,4)===x});
 return ds.slice(-Number(x));
}
/* ---- 01 Topp 10 + tests, per number group ---- */
function renderTop(){
 var box=$('topBox');box.textContent='';
 groups().forEach(function(gr){
  var slot=gr[0],pool=slot.pool,p=slot.drawn/pool,ds=periodDraws(slot),arr=ds.map(function(d){return d[slot.field]}),c=E.counts(arr,pool),N=arr.length,Ex=N*p,sd=Math.sqrt(N*p*(1-p));
  var all=fieldDraws(slot).map(function(d){return d[slot.field]}),g=E.gaps(all,pool),nums=[];for(var n=1;n<=pool;n++)nums.push(n);
  var wrap=el('div','panel');wrap.appendChild(el('h3',null,FIELD[slot.field]+' · '+slot.drawn+' av '+pool));
  var grid=el('div','topgrid');
  function list(title,items,valFn,noteFn){
   var pn=el('div');pn.appendChild(el('h3',null,title));var ol=el('ol','toplist');
   items.forEach(function(n,i){var li=el('li','toprow');li.appendChild(el('span','rank',String(i+1)));li.appendChild(el('span','ball',String(n)));li.appendChild(el('span','topval',valFn(n)));li.appendChild(el('span','topnote',noteFn(n)));ol.appendChild(li)});
   pn.appendChild(ol);grid.appendChild(pn);
  }
  var z=function(n){var v=sd?(c[n]-Ex)/sd:0;return (v>=0?'+':'')+fmt(v,2)+' σ'};
  var top=Math.min(10,pool);
  list('Mest trukket',nums.slice().sort(function(a,b){return c[b]-c[a]||a-b}).slice(0,top),function(n){return c[n]+' trekk'},z);
  list('Minst trukket',nums.slice().sort(function(a,b){return c[a]-c[b]||a-b}).slice(0,top),function(n){return c[n]+' trekk'},z);
  list('Lengst siden sist',nums.slice().sort(function(a,b){return g[b]-g[a]||a-b}).slice(0,top),function(n){return g[n]+' trekn.'},function(n){return 'P = '+pct(Math.pow(1-p,g[n]))});
  wrap.appendChild(grid);
  var ss=0;for(n=1;n<=pool;n++)ss+=Math.pow(c[n]-Ex,2);
  var chi=N?ss/(N*p*(1-p))*(pool-1)/pool:0,pv=N?E.chiP(chi,pool-1):1;
  var t=el('div','tests');
  [['Likefordelingstest (χ², df '+(pool-1)+')',fmt(chi,1),'p = '+fmt(pv,3)+(pv<.01?' · avvik, undersøk datakilden':' · forenlig med ren tilfeldighet')],
   ['Trekninger i perioden',fmt(N,0),'hvert tall forventes '+fmt(Ex,1)+' ganger (σ ≈ '+fmt(sd,1)+')'],
   ['Snitt sum',fmt(arr.reduce(function(s,a){return s+a.reduce(function(x,y){return x+y},0)},0)/Math.max(1,N),1),'forventet '+fmt(slot.drawn*(pool+1)/2,1)]].forEach(function(r){
    var d=el('div','test');d.appendChild(el('div','metriclabel',r[0]));d.appendChild(el('div','testval',r[1]));d.appendChild(el('div','detail',r[2]));t.appendChild(d);
  });
  t.className='tests three';wrap.appendChild(t);box.appendChild(wrap);
 });
}
/* ---- 02 Rekker ---- */
function renderRows(){
 var last=draws[draws.length-1].date,next=E.nextDrawDate(game,last),box=$('rows');box.textContent='';
 $('nextDate').textContent=U.niceDate(next);
 var rows=E.buildRows(game,draws,next);
 E.STRATEGIES.forEach(function(s){
  var card=el('article','rowcard'),head=el('div','rowhead');
  head.appendChild(el('span','tag tag-'+(s==='numerology'?'numerologi':s==='random'||s==='fixed'?'kontroll':'frekvens'),s==='numerology'?'Numerologi':s==='random'||s==='fixed'?'Kontroll':'Frekvens'));
  head.appendChild(el('h3',null,U.NAMES[s]));card.appendChild(head);
  G.slots.forEach(function(slot){
   card.appendChild(el('div','metriclabel',FIELD[slot.field]+' ('+slot.k+')'));
   card.appendChild(U.balls(rows[s][slot.id]));
   if(s==='numerology'){
    var r=E.numFor(game,slot).row(next,slot.k),det=el('details','why');det.appendChild(el('summary',null,'Hvorfor disse tallene?'));
    var ul=el('ul');r.reasons.forEach(function(x){ul.appendChild(el('li',null,x.number+' · '+x.sources.join(' · ')))});det.appendChild(ul);card.appendChild(det);
   }
  });
  var all=[];G.slots.forEach(function(slot){all.push(rows[s][slot.id].join(' '))});
  var cp=el('button','copy','Kopier');cp.type='button';cp.addEventListener('click',function(){try{navigator.clipboard.writeText(all.join(' | '));cp.textContent='Kopiert'}catch(e){cp.textContent=all.join(' | ')}});card.appendChild(cp);
  box.appendChild(card);
 });
}
/* ---- 03 Baktest ---- */
var btCache={};
function renderBacktest(){
 var yr=$('testYear').value,cells=btCache[yr]||(btCache[yr]=E.backtestAll(game,draws,yr)),tb=$('backtest');tb.textContent='';
 var sorted=cells.slice().sort(function(a,b){return a.p-b.p});
 var name=function(c){return (c.strategy==='hot'?'Hyppigste':c.strategy==='cold'?'Sjeldneste':U.NAMES[c.strategy])+(c.window?' (vindu '+c.window+')':'')+' · '+c.slot};
 sorted.forEach(function(c){
  var tr=el('tr',c.strategy==='numerology'?'primary':'');
  [name(c),fmt(c.n,0),fmt(c.mean),(c.mean-c.expected>=0?'+':'')+fmt(c.mean-c.expected),(c.z>=0?'+':'')+fmt(c.z,2),U.pfmt(c.p),U.pfmt(c.holm),String(c.max)].forEach(function(v,i){
   tr.appendChild(el('td',i===6?(c.holm<0.05?'good':'muted'):i===4?(Math.abs(c.z)>=2?(c.z>0?'good':'negative'):'muted'):null,v));
  });
  tb.appendChild(tr);
 });
 var sig=cells.filter(function(c){return c.holm<0.05}).length,raw=cells.filter(function(c){return c.p<0.05}).length,minH=Math.min.apply(null,cells.map(function(c){return c.holm}));
 $('backtestNotice').textContent=cells.length+' tester i familien. Uten korreksjon har '+raw+' p < 0,05 (ventet ved flaks alene: ca. '+fmt(cells.length*0.05,1)+'). Etter Holm-korreksjon har '+sig+' p < 0,05; laveste Holm-p er '+U.pfmt(minH)+'. Tilfeldig kontroll og faste tall er med i familien nettopp for å vise hvor store avvik ren flaks gir.';
}
/* ---- 04 Siste trekninger ---- */
function renderRecent(){U.renderRecent(game,$('recentDraws'),draws,{preregUrl:$('dataUrl').getAttribute('data-prereg'),n:10})}
function periodOptions(){
 var sel=$('period'),years={};draws.forEach(function(d){years[d.date.slice(0,4)]=1});
 var ys=Object.keys(years).sort().reverse();
 var opts=[['52','Siste 52 trekninger'],['104','Siste 104 trekninger']].concat(ys.slice(0,4).map(function(y){return [y,'År '+y]}),[['all','Hele arkivet']]);
 opts.forEach(function(o,i){var op=el('option',null,o[1]);op.value=o[0];if(i===2)op.selected=true;sel.appendChild(op)});
 var ty=$('testYear');ty.appendChild(Object.assign(el('option',null,'Alle år'),{value:'all'}));ys.slice(0,4).forEach(function(y){ty.appendChild(Object.assign(el('option',null,y),{value:y}))});
}
fetch($('dataUrl').getAttribute('data-url'),{cache:'no-cache'}).then(function(r){if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(function(doc){
 draws=doc.draws;
 if(!draws||draws.length<200)throw Error('Datagrunnlag mangler');
 $('totalCount').textContent=fmt(draws.length,0);$('lastDate').textContent=U.niceDate(draws[draws.length-1].date);
 $('dataStatus').textContent='Arkiv sist hentet '+doc.retrieved+' · kilde: '+(doc.source_kind==='official_operator_api'?'Norsk Tipping (offisielt API)':'WestLotto (offisiell operatør)');
 periodOptions();renderTop();renderRows();renderRecent();
 $('period').addEventListener('change',renderTop);$('testYear').addEventListener('change',renderBacktest);
 setTimeout(renderBacktest,30);
 U.renderPrereg(game,$('prereg'),draws,$('dataUrl').getAttribute('data-prereg'));
}).catch(function(err){
 $('topBox').textContent='Kan ikke laste historikken: '+err.message;$('dataStatus').textContent='Datastatus: feil ved lasting';
 $('rows').textContent='Trekningene kunne ikke lastes.';$('recentDraws').textContent='Trekningene kunne ikke lastes.';
});
})();
