/* SETAEI Forskning shell: app bar + slide-in side panel built from the page's own sections.
 * Markup contract: <section data-nav="Label" id="x"> with optional <h3 data-sub="Label" id="y"> inside. */
(function(){
'use strict';
var LOGO='<a class="wordmark" href="/" aria-label="SETAEI – hjem"><svg viewBox="15 15 545 105" role="img" aria-label="SETAEI"><g fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="butt" stroke-linejoin="round"><path d="M78 29H49C31 29 27 50 43 58L68 70C83 77 79 105 58 105H27"/><path d="M118 31h58M118 68h48M118 105h58"/><path d="M215 31h70M250 31v74"/><path d="M321 105l34-74 34 74"/><path d="M429 31h58M429 68h48M429 105h58"/><path d="M539 31v74"/></g><path fill="#F47A2A" d="M355 58l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z"/></svg><small>Forskning</small></a>';
var SITES=[['/forskning/','Oversikt','Alle prosjekter'],['/Keno/','Keno','20 av 70'],['/forskning/lotto/','Lotto','7 av 34'],['/forskning/eurojackpot/','EuroJackpot','5 av 50 + 2 av 12'],['/forskning/#wallet-agent','Wallet-agent','planlagt']];
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function build(){
 var secs=[].slice.call(document.querySelectorAll('[data-nav]'));
 var bar=el('header','appbar'),inn=el('div','wrap in');
 var bb=el('button','burger');bb.type='button';bb.setAttribute('aria-label','Åpne meny');bb.setAttribute('aria-expanded','false');bb.setAttribute('aria-controls','drawer');
 for(var i=0;i<3;i++)bb.appendChild(el('span'));
 inn.appendChild(bb);
 var wm=document.createElement('div');wm.innerHTML=LOGO;inn.appendChild(wm.firstChild);
 var now=el('div','now');now.id='navNow';inn.appendChild(now);bar.appendChild(inn);
 var skip=el('a','skip','Hopp til innhold');skip.href='#main';
 var scrim=el('div','scrim');scrim.addEventListener('click',close);
 var dr=el('nav','drawer');dr.id='drawer';dr.setAttribute('aria-label','Meny');dr.setAttribute('aria-hidden','true');
 var hd=el('div','dhead');var t=document.createElement('div');t.innerHTML=LOGO;hd.appendChild(t.firstChild);
 var cl=el('button','dclose','×');cl.type='button';cl.setAttribute('aria-label','Lukk meny');cl.addEventListener('click',close);hd.appendChild(cl);dr.appendChild(hd);
 var body=el('div','dbody');dr.appendChild(body);
 body.appendChild(el('h4',null,'På denne siden'));
 var links={};
 secs.forEach(function(s){
  var a=el('a',null,s.getAttribute('data-nav'));a.href='#'+s.id;links[s.id]=a;body.appendChild(a);
  [].slice.call(s.querySelectorAll('[data-sub]')).forEach(function(h){
   if(!h.id)return;var b=el('a','sub',h.getAttribute('data-sub'));b.href='#'+h.id;body.appendChild(b);
  });
 });
 body.appendChild(el('h4',null,'SETAEI Forskning'));
 var here=location.pathname.replace(/index\.html$/,'');
 SITES.forEach(function(x){var a=el('a','site'+(x[0].split('#')[0]===here?' cur':''),x[1]);a.href=x[0];a.appendChild(el('span','tag2',x[2]));body.appendChild(a)});
 body.appendChild(el('h4',null,'Merk'));
 body.appendChild(el('p','mini','Forskning, ikke spilletips. Vi selger ingen spill og tar ikke imot innsats. 18+ · Hjelpelinjen.no'));
 document.body.insertBefore(scrim,document.body.firstChild);document.body.insertBefore(dr,document.body.firstChild);document.body.insertBefore(bar,document.body.firstChild);document.body.insertBefore(skip,document.body.firstChild);
 function open(){document.body.classList.add('nav-open');bb.setAttribute('aria-expanded','true');dr.setAttribute('aria-hidden','false');cl.focus()}
 function close(){document.body.classList.remove('nav-open');bb.setAttribute('aria-expanded','false');dr.setAttribute('aria-hidden','true');bb.focus({preventScroll:true})}
 bb.addEventListener('click',function(){document.body.classList.contains('nav-open')?close():open()});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.body.classList.contains('nav-open'))close()});
 body.addEventListener('click',function(e){if(e.target.closest('a')&&e.target.closest('a').getAttribute('href').charAt(0)==='#')document.body.classList.remove('nav-open'),bb.setAttribute('aria-expanded','false'),dr.setAttribute('aria-hidden','true')});
 // scroll-spy
 function mark(id){Object.keys(links).forEach(function(k){links[k].classList.toggle('active',k===id)});var s=document.getElementById(id);now.textContent='';if(s){var b=el('b',null,document.title.split(' – ')[0].split(' |')[0]);now.appendChild(b);now.appendChild(document.createTextNode(' · '+s.getAttribute('data-nav')))}}
 if('IntersectionObserver' in window){
  var vis={};
  var io=new IntersectionObserver(function(es){es.forEach(function(e){vis[e.target.id]=e.isIntersecting?e.boundingClientRect.top:null});
   var best=null,bt=1e9;Object.keys(vis).forEach(function(k){if(vis[k]!==null&&Math.abs(vis[k])<bt){bt=Math.abs(vis[k]);best=k}});if(best)mark(best)},{rootMargin:'-70px 0px -55% 0px',threshold:0});
  secs.forEach(function(s){io.observe(s)});
 }
 if(secs[0])mark(secs[0].id);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
