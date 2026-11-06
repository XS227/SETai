/* SETAEI Forskning shared UI helpers + pre-registration panel (no innerHTML: text only). */
(function(root){
'use strict';
var E=root.SETAEI_ENGINE, ZERO=new Array(65).join('0');
function $(id){return document.getElementById(id)}
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
function fmt(n,d){return Number(n).toLocaleString('nb-NO',{maximumFractionDigits:d==null?3:d})}
function pct(n){return fmt(100*n,1)+' %'}
function pfmt(p){return p<0.001?'< 0,001':fmt(p,3)}
function niceDate(d){return new Date(d+'T12:00:00').toLocaleDateString('nb-NO',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})}
function balls(row,cls){var b=el('div','balls');row.forEach(function(n){b.appendChild(el('span','ball'+(cls?' '+cls:''),String(n)))});return b}
function sha256(text){
 return crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)).then(function(buf){return Array.prototype.map.call(new Uint8Array(buf),function(x){return ('0'+x.toString(16)).slice(-2)}).join('')});
}
/* Verifies prev/hash links. Resolves {ok, head, brokenAt}. */
function verifyChain(entries){
 var prev=ZERO,i=0;
 function step(){
  if(i>=entries.length)return Promise.resolve({ok:true,head:prev,length:entries.length});
  var e=entries[i];
  if(e.prev!==prev)return Promise.resolve({ok:false,brokenAt:i});
  return sha256(prev+'\n'+JSON.stringify(e.reg)).then(function(h){
   if(h!==e.hash)return {ok:false,brokenAt:i};
   prev=e.hash;i++;return step();
  });
 }
 if(!(window.crypto&&crypto.subtle))return Promise.resolve({ok:null,head:entries.length?entries[entries.length-1].hash:ZERO,length:entries.length});
 return step();
}
var NAMES={numerology:'Numerologi · dato',hot:'Hyppigste tall',gap:'Lengst siden sist',random:'Tilfeldig kontroll',fixed:'Faste laveste tall'};

/* Renders the pre-registration panel for one game into `box`. */
function renderPrereg(game,box,draws,url,cb){
 box.textContent='';
 fetch(url,{cache:'no-cache'}).then(function(r){if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(function(doc){
  var entries=doc.entries||[],G=E.GAMES[game],prim=doc.protocol&&doc.protocol.primary&&doc.protocol.primary[game];
  return verifyChain(entries).then(function(chain){
   var by={};draws.forEach(function(d){by[d.date]=1});
   var scored=entries.filter(function(e){return by[e.reg.date]}),pending=entries.filter(function(e){return !by[e.reg.date]});
   var head=el('div','pillline');
   head.appendChild(el('span','pill',entries.length+' registrert'));
   head.appendChild(el('span','pill',scored.length+' scoret'));
   head.appendChild(el('span','pill',pending.length+' venter på trekning'));
   var badge=el('span','badge',chain.ok===true?'Hash-kjede OK':chain.ok===false?'KJEDEN ER BRUTT (oppføring '+(chain.brokenAt+1)+')':'Kjede ikke verifisert (nettleseren mangler SubtleCrypto)');
   if(chain.ok===false)badge.style.cssText='color:var(--bad);border-color:var(--bad)';
   head.appendChild(badge);box.appendChild(head);
   if(doc.protocol)box.appendChild(el('p','help',doc.protocol.text));
   if(chain.head)box.appendChild(el('p','detail','Kjedens siste hash: '+chain.head));
   if(!entries.length){box.appendChild(el('div','notice','Ingen oppføringer ennå. Første rekker lagres automatisk før neste trekning.'));return}
   var cells=E.scoreEntries(game,scored,draws);
   if(prim&&scored.length){
    var c=cells.filter(function(x){return x.strategy===prim[0]&&x.slot===prim[1]})[0];
    var verdict=c.n<30?'For tidlig: bare '+c.n+' scorede trekninger (vi krever minst 30 før noen konklusjon).':(c.p<0.05?'p < 0,05 på den ene primærtesten. Må replikeres på nye trekninger før det kalles et funn.':'Ikke støttet: ikke skillbart fra tilfeldighet.');
    var n=el('div','notice');n.appendChild(el('strong',null,'Primærtest (H1): '+NAMES[prim[0]]+', '+prim[1]+'. '));
    n.appendChild(document.createTextNode('Snitt '+fmt(c.mean)+' mot forventet '+fmt(c.expected)+' · z = '+fmt(c.z,2)+' · p = '+pfmt(c.p)+' · n = '+c.n+'. '+verdict));
    box.appendChild(n);
    var tb=el('div','tablebox'),t=el('table','table'),th=el('thead'),hr=el('tr');
    ['Strategi','Nivå','n','Snitt','Forventet','z','p','Holm-p'].forEach(function(h){hr.appendChild(el('th',null,h))});th.appendChild(hr);t.appendChild(th);
    var tbody=el('tbody');
    cells.forEach(function(x){
     var tr=el('tr',(prim[0]===x.strategy&&prim[1]===x.slot)?'primary':'');
     [NAMES[x.strategy],x.slot,x.n,fmt(x.mean),fmt(x.expected),(x.z>=0?'+':'')+fmt(x.z,2),pfmt(x.p),pfmt(x.holm)].forEach(function(v,i){tr.appendChild(el('td',i===7&&x.holm<0.05?'good':null,String(v)))});
     tbody.appendChild(tr);
    });
    t.appendChild(tbody);tb.appendChild(t);box.appendChild(tb);
    box.appendChild(el('p','detail','Holm-p er korrigert for alle '+cells.length+' kombinasjonene (strategi × nivå) i denne tabellen. Bare Holm-p under 0,05 teller som utforskende funn.'));
   }
   box.appendChild(el('h3',null,'Siste oppføringer'));
   entries.slice(-5).reverse().forEach(function(e){
    var card=el('article','rowcard'),h=el('div','rowhead');
    h.appendChild(el('h3',null,niceDate(e.reg.date)));h.appendChild(el('span','tag '+(by[e.reg.date]?'tag-frekvens':'tag-numerologi'),by[e.reg.date]?'scoret':'venter'));card.appendChild(h);
    card.appendChild(el('p','detail','Registrert '+e.reg.registeredAt.replace('T',' ').slice(0,16)+' UTC · siste kjente trekning i data: '+e.reg.lastDrawInData+' · hash '+e.hash.slice(0,12)+'…'));
    var d=null;draws.forEach(function(x){if(x.date===e.reg.date)d=x});
    G.slots.filter(function(slot){return game!=='keno'||slot.id==='k10'}).forEach(function(slot){
     var row=e.reg.rows.numerology[slot.id];
     card.appendChild(el('div','metriclabel','Numerologi · '+slot.id));
     var b=el('div','balls');row.forEach(function(n){var hit=d&&d[slot.field].indexOf(n)>=0;b.appendChild(el('span','ball'+(hit?' hot':''),String(n)))});card.appendChild(b);
    });
    box.appendChild(card);
   });
  });
 }).catch(function(err){
  box.textContent='';box.appendChild(el('div','notice','Førhåndsregistreringen kunne ikke lastes: '+err.message));
 }).then(function(){if(cb)cb()});
}
root.SETAEI_UI={$:$,el:el,fmt:fmt,pct:pct,pfmt:pfmt,niceDate:niceDate,balls:balls,verifyChain:verifyChain,renderPrereg:renderPrereg,NAMES:NAMES,ZERO:ZERO};
})(window);
