/* KSH v12 – correct Z-UP photo on generated cards, avoid double footers.
   No camera or pricing code changed. */
(()=>{
 'use strict';
 const asset='/ksh/fliskonkurrenten/produkt/zup-spilepanel-eik-sort/assets/zup-eik-sort-600066.jpg';
 function repair(){
  document.querySelectorAll('img').forEach(img=>{
   const url=img.getAttribute('src')||'';
   if(url.includes('/zup-spilepanel-eik-sort/assets/hero.webp')){
    img.src=asset;
    img.dataset.kshZup='correct';
    img.alt='Z-UP Spilepanel Eik Sort, produkt 600066 – mørke vertikale spiler';
   }
  });
  // Product HTML already contains an official KSH footer. The demo script
  // previously created a second footer inside #app, causing repetition.
  if(document.querySelector('footer.k6-footer')){
   document.querySelectorAll('#app > footer.footer').forEach(duplicate=>duplicate.remove());
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',repair,{once:true});
 else repair();
 // In case a delayed website script creates the gallery slightly later.
 window.addEventListener('load',repair,{once:true});
})();
