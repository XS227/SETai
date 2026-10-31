/* SETAEI Heimslig enhancement v4: pricing as a user-defined budget, not real product prices. */
(function () {
  "use strict";
  var base="/ksh/heimslig/";
  if (!location.pathname.startsWith(base)) return;
  var path=location.pathname.toLowerCase();
  var categories=[
    ["sofaer","Sofaer"],["stoler","Stoler og lenestoler"],
    ["bord","Bord"],["senger","Senger"],["oppbevaring","Oppbevaring"],["annet","Annet"]
  ];
  var fmt=new Intl.NumberFormat("nb-NO",{style:"currency",currency:"NOK",maximumFractionDigits:0});
  var storeKey="heimslig-room-budget-v4";
  function onReady(fn){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn,{once:true});else fn();}
  function el(tag,cls){var node=document.createElement(tag);if(cls)node.className=cls;return node;}
  function num(v){var x=Number(String(v||"").replace(",","."));return isFinite(x)?Math.max(0,x):0;}
  function category(){for(var i=0;i<categories.length;i++)if(path.includes("/"+categories[i][0]+"/"))return categories[i][0];return "sofaer";}
  function addLinks(){
    if(path.includes("/social/"))return;
    var targets=Array.from(document.querySelectorAll("header nav,header .nav-links,nav.main-nav,footer nav,footer .footer-links"));
    if(!targets.length)targets=Array.from(document.querySelectorAll("header,footer")).slice(0,2);
    targets.forEach(function(t){
      if(t.querySelector(".heimslig-v4-navlinks"))return;
      var links=el("span","heimslig-v4-navlinks");
      var a=el("a");a.href=base+"social/";a.textContent="Sosialt & inspirasjon";links.appendChild(a);
      var p=el("a");p.href=base+"3d-studio/#heimslig-kalkulator";p.textContent="3D-rom & pris";links.appendChild(p);
      t.appendChild(links);
    });
  }
  function compactPrototypeWarning(){
    Array.from(document.querySelectorAll('nav,[class*="breadcrumb"],[class*="crumb"]')).forEach(function(n){
      var className=String(n.className||""),label=String(n.getAttribute("aria-label")||"");
      var txt=(n.textContent||"").trim().replace(/\s+/g," ");
      var isCrumb=/bread|crumb|brødsmul/i.test(className+" "+label) ||
        (n.tagName==="NAV"&&txt.length<150&&/^Hjem\s*[\/›»]/i.test(txt)&&/Produkter/i.test(txt));
      if(!isCrumb)return;
      n.hidden=true;n.style.display="none";n.style.margin="0";n.style.padding="0";
      if(n.parentElement&&n.parentElement.children.length===1&&
         !/^(MAIN|HEADER|BODY)$/i.test(n.parentElement.tagName)){
        n.parentElement.style.margin="0";n.parentElement.style.padding="0";
      }
    });
    Array.from(document.querySelectorAll("p,aside,div")).forEach(function(n){
      var s=(n.textContent||"").trim();
      if(s.startsWith("Alle produktene er designkonsepter:") && s.length<270 && n.querySelectorAll("p,aside,div").length===0){
        n.hidden=true; n.setAttribute("aria-hidden","true");
      }
    });
  }
  function buildCalculator(){
    if(!path.includes("/produkter/")&&!path.includes("/produkt/"))return;
    if(document.getElementById("heimslig-kalkulator"))return;
    var section=el("section","h5-bridge");section.id="heimslig-kalkulator";
    section.innerHTML='<div><h2>Se rommet. Beregn budsjettet.</h2><p>Velg møbler, mål og materialer i ett samlet romstudio.</p></div><a href="'+base+'3d-studio/#heimslig-kalkulator">Åpne 3D-rom & pris ↗</a>';
    var main=document.querySelector("main"),heading=document.querySelector("h1");
    var hero=heading&&heading.closest("section,article");
    if(hero)hero.insertAdjacentElement("afterend",section);
    else if(main)main.prepend(section);
    else {var nav=document.querySelector(".mega-row")||document.querySelector("header");if(nav)nav.insertAdjacentElement("afterend",section);}
  }
  function socialPromo(){
    if(!(path===base||path===base+"index.html"||path.includes("/inspirasjon/")))return;
    var main=document.querySelector("main")||document.body;
    if(document.querySelector(".h4-social-promo"))return;
    var box=el("section","h4-social-promo");
    box.innerHTML='<div><h2>Hjem som inspirerer.</h2><p>Utforsk et visuelt magasin med interiør, inspirasjonsbilder og plass til fremtidige sosiale innlegg.</p></div>'+
      '<a href="'+base+'social/">Oppdag inspirasjonsveggen ↗</a>';
    main.appendChild(box);
  }
  onReady(function(){addLinks();compactPrototypeWarning();buildCalculator();socialPromo();});
})();

