(function(){
var LANGS=[['en','English','ltr'],['is','Íslenska','ltr'],['fa','فارسی','rtl']],de=document.documentElement,cur='en',V='20261018-contacts';
function detect(){
  if(window.KASHI_FIXED_LANG)return window.KASHI_FIXED_LANG;
  try{var q=new URLSearchParams(location.search).get('lang');if(q&&LANGS.some(function(l){return l[0]===q})){localStorage.setItem('kashi-lang',q);return q}
  var st=localStorage.getItem('kashi-lang');if(st&&LANGS.some(function(l){return l[0]===st}))return st}catch(e){}
  var ls=navigator.languages||[navigator.language||''];
  for(var i=0;i<ls.length;i++){var c=(ls[i]||'').slice(0,2).toLowerCase();if(c==='is'||c==='fa'||c==='en')return c}
  return 'en'}
function meta(l){for(var i=0;i<LANGS.length;i++)if(LANGS[i][0]===l)return LANGS[i]}
function setDir(l){de.lang=l;de.dir=meta(l)[2];
  if(l==='fa'&&!document.getElementById('fa-font')){var k=document.createElement('link');k.id='fa-font';k.rel='stylesheet';k.href='https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap';document.head.appendChild(k)}}
cur=detect();setDir(cur);
window.KASHI_DICT=window.KASHI_DICT||{};
window.T=function(s){var d=window.KASHI_DICT[cur];return cur!=='en'&&d&&d[s]!=null?d[s]:s};
window.kashiLang=function(){return cur};
function load(l,cb){if(l==='en'||window.KASHI_DICT[l])return cb();var s=document.createElement('script');s.src='/kashi/i18n/'+l+'.js?v='+V;s.onload=cb;s.onerror=cb;document.head.appendChild(s)}
function apply(){
  var d=window.KASHI_DICT[cur]||{},q=function(a,f){Array.prototype.forEach.call(document.querySelectorAll(a),f)};
  q('[data-i]',function(el){if(el._en===undefined)el._en=el.innerHTML;var t=cur!=='en'&&d[el.dataset.i]!=null?d[el.dataset.i]:el._en;if(el.innerHTML!==t)el.innerHTML=t});
  q('[data-ip]',function(el){if(el._enp===undefined)el._enp=el.getAttribute('placeholder');var t=cur!=='en'&&d[el.dataset.ip]!=null?d[el.dataset.ip]:el._enp;el.setAttribute('placeholder',t)});
  q('[data-ia]',function(el){if(el._ena===undefined)el._ena=el.getAttribute('aria-label');var t=cur!=='en'&&d[el.dataset.ia]!=null?d[el.dataset.ia]:el._ena;el.setAttribute('aria-label',t)});
  q('[data-im]',function(el){if(el._enm===undefined)el._enm=el.getAttribute('content');var t=cur!=='en'&&d[el.dataset.im]!=null?d[el.dataset.im]:el._enm;el.setAttribute('content',t)});
  q('.lang-pop button',function(b){b.classList.toggle('cur',b.dataset.l===cur)});
  var lb=document.getElementById('langBtn');if(lb)lb.setAttribute('aria-label',window.T('Language'));
  var mb=document.getElementById('menuBtn');if(mb)mb.setAttribute('aria-label',window.T('Menu'));
  var wa=document.getElementById('waBtn');if(wa)wa.setAttribute('aria-label',window.T('Chat with KASHI on WhatsApp'));
  if(window.onKashiLang)try{window.onKashiLang(cur)}catch(e){console.error(e)}
  window.dispatchEvent(new CustomEvent('kashi:lang',{detail:cur}));
}
function set(l,store){cur=l;setDir(l);if(store!==false)try{localStorage.setItem('kashi-lang',l)}catch(e){}load(l,apply)}
window.kashiSetLang=set;

function dock(){
  var d=document.createElement('div');d.className='dock';
  d.innerHTML='<button class="dkb menu" id="menuBtn" type="button" aria-label="Menu"><svg class="b" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg><svg class="x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'
  +'<div class="langbox"><div class="lang-pop" id="langPop" role="menu">'+LANGS.map(function(l){return '<button type="button" role="menuitem" data-l="'+l[0]+'"><span>'+l[1]+'</span><small>'+l[0].toUpperCase()+'</small></button>'}).join('')+'</div>'
  +'<button class="dkb" id="langBtn" type="button" aria-label="Language" aria-haspopup="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4.5 6 4.5 9S15 18 12 21c-3-3-4.5-6-4.5-9S9 6 12 3z"/></svg></button></div>'
  +'<a class="dkb wa" id="waBtn" href="https://wa.me/4741227175?text=Hello%20KASHI%2C%20I%20would%20like%20to%20ask%20about%20your%20tiles." target="_blank" rel="noopener noreferrer" aria-label="Chat with KASHI on WhatsApp"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.52 3.48A11.8 11.8 0 0 0 12.05 0C5.46 0 .09 5.36.08 11.95c0 2.11.55 4.18 1.6 6L0 24l6.22-1.63a12 12 0 0 0 5.83 1.48h.01c6.59 0 11.95-5.36 11.95-11.95a11.86 11.86 0 0 0-3.49-8.42ZM12.06 21.8a9.87 9.87 0 0 1-5.04-1.38l-.36-.21-3.74.98.99-3.64-.24-.38a9.86 9.86 0 0 1-1.51-5.22c0-5.45 4.44-9.89 9.9-9.89a9.82 9.82 0 0 1 7 2.9 9.83 9.83 0 0 1 2.89 7c0 5.45-4.44 9.88-9.89 9.88Zm5.43-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.08-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.87 1.21 3.07c.15.2 2.09 3.19 5.06 4.47.71.31 1.26.49 1.69.63.71.23 1.35.2 1.86.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z"/></svg></a>';
  document.body.appendChild(d);
  var pop=document.getElementById('langPop'),nav=document.getElementById('nav'),mb=document.getElementById('menuBtn');
  function closeMenu(){if(nav)nav.classList.remove('open');mb.classList.remove('on');document.body.classList.remove('menu-open')}
  mb.onclick=function(){if(!nav)return;var o=nav.classList.toggle('open');mb.classList.toggle('on',o);document.body.classList.toggle('menu-open',o);pop.classList.remove('open')};
  Array.prototype.forEach.call(document.querySelectorAll('#nav a'),function(a){a.addEventListener('click',closeMenu)});
  document.getElementById('langBtn').onclick=function(e){e.stopPropagation();pop.classList.toggle('open')};
  pop.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;pop.classList.remove('open');if(window.KASHI_FIXED_LANG){if(b.dataset.l!==window.KASHI_FIXED_LANG)location.href=(window.KASHI_ALT&&window.KASHI_ALT[b.dataset.l])||('/kashi/?lang='+b.dataset.l);return}set(b.dataset.l)});
  document.addEventListener('click',function(){pop.classList.remove('open')});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){pop.classList.remove('open');closeMenu()}});
}
function start(){dock();load(cur,apply)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
