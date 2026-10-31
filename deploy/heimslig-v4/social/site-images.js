/* Prefer licensed/in-project category imagery already available on this same site.
   The initial editorial Unsplash images remain fallbacks if site artwork is absent. */
(function(){
 "use strict";
 var root="/ksh/heimslig/";
 var cards=Array.from(document.querySelectorAll(".story a[href]"));
 function resolve(input,base){
   if(!input)return null;
   try{
     var s=String(input).trim().replace(/^['"]|['"]$/g,"");
     var u=new URL(s,base);
     if(u.origin!==location.origin||!/(\.(jpg|jpeg|png|webp|avif)(\?|$))/i.test(u.pathname+"?"+u.search))return null;
     if(/logo|icon|favicon|sprite|flag|avatar|placeholder/i.test(u.pathname))return null;
     return u.href;
   }catch(e){return null;}
 }
 function candidates(html,url){
   var doc=new DOMParser().parseFromString(html,"text/html"),out=[],seen=new Set();
   function push(s){var u=resolve(s,url);if(u&&!seen.has(u)){seen.add(u);out.push(u);}}
   Array.from(doc.querySelectorAll("main img,article img,section img,main source")).forEach(function(i){
      push(i.getAttribute("data-src")||i.getAttribute("src"));
      var ss=i.getAttribute("srcset");if(ss)push(ss.split(",").pop().trim().split(/\s+/)[0]);
   });
   Array.from(doc.querySelectorAll("meta[property='og:image'],meta[name='twitter:image']")).forEach(function(m){push(m.content);});
   var chunks=[html];
   Array.from(doc.querySelectorAll("style")).forEach(function(n){chunks.push(n.textContent||"");});
   chunks.join("\n").replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g,function(_,s){push(s);return "";});
   return out;
 }
 function check(u){
   return new Promise(function(ok){var im=new Image(),done=false;im.onload=function(){if(!done){done=true;ok(im.naturalWidth>360&&im.naturalHeight>240);}};im.onerror=function(){if(!done){done=true;ok(false);}};im.src=u;});
 }
 cards.forEach(async function(card){
   var img=card.querySelector("img");if(!img)return;
   try{
     var url=card.href,resp=await fetch(url,{credentials:"same-origin"});
     if(!resp.ok)return;
     var html=await resp.text(),urls=candidates(html,url);
     for(var i=0;i<Math.min(urls.length,18);i++){
       if(await check(urls[i])){img.src=urls[i];img.alt="Bilde fra Heimslig-konseptets "+card.querySelector("h3").textContent+"-seksjon";img.onerror=function(){this.onerror=null;this.src=this.dataset.fallback;};return;}
     }
   }catch(e){}
 });
 cards.forEach(function(c){var img=c.querySelector("img");if(img)img.dataset.fallback=img.src;});
})();
