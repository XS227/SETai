/* KSH v13: category navigation and promotional category banners on Fliskonkurrenten proposal. */
(()=>{
'use strict';
const root='/ksh/fliskonkurrenten/',categories=root+'kategorier/';
function navigation(){
 const selectors=['#ksh2-menu','.sf-nav','.ksh2-head nav','.head nav'];
 for(const selector of selectors){
  const nav=document.querySelector(selector);
  if(!nav||nav.querySelector('a[href*="/kategorier/"]'))continue;
  const a=document.createElement('a');
  a.href=categories;a.textContent='Kategorier';
  a.className='kh13-nav-link';
  nav.insertBefore(a,nav.children[nav.children.length>1?1:0]||null);
 }
}
function feature(data){
 if(location.pathname.replace(/\/+$/,'/')!==root)return;
 if(document.getElementById('kh13-catalog'))return;
 const main=document.querySelector('main');
 if(!main)return;
 const section=document.createElement('section');
 section.id='kh13-catalog';section.className='kh13-home';
 section.innerHTML='<div class="kh13-wrap"><div class="kh13-heading"><div><p class="kh13-eyebrow">MATERIALBIBLIOTEK / KATEGORIER</p><h2>Finn uttrykket.<br><em>Skap rommet.</em></h2></div><p>Fra fliser og naturstein til baderom og alle detaljene mellom. Utforsk et nytt kategoriunivers med ekte materialbilder.</p></div><div class="kh13-banners">'+data.groups.map((g,i)=>
  '<a href="'+categories+'#gruppe-'+encodeURIComponent(g.slug)+'" class="kh13-banner">'+
  '<img src="'+categories+g.image+'" alt="'+g.name+' – materialinspirasjon" loading="lazy"><span class="kh13-banner-fade"></span><span class="kh13-title"><small>'+('0'+(i+1)).slice(-2)+' / '+g.tag+'</small><strong>'+g.name+'</strong></span><span class="kh13-arrow" aria-hidden="true">↗</span></a>'
 ).join('')+'</div><a class="kh13-all" href="'+categories+'">Utforsk alle kategoriene og underkategoriene ↗</a></div>';
 const productList=document.getElementById('ksh-four-products');
 if(productList)productList.insertAdjacentElement('beforebegin',section);
 else main.insertAdjacentElement('beforeend',section);
}
let tries=0;
function start(){
 navigation();
 if(location.pathname.replace(/\/+$/,'/')===root){
  fetch(categories+'catalog.json?v=13').then(r=>{if(!r.ok)throw Error('category catalog');return r.json()}).then(feature).catch(e=>console.warn('KSH categories offline:',e));
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('load',navigation,{once:true});
})();