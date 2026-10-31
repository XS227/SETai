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
    var targets=Array.from(document.querySelectorAll("header nav,header .nav-links,nav.main-nav,footer nav,footer .footer-links"));
    if(!targets.length)targets=Array.from(document.querySelectorAll("header,footer")).slice(0,2);
    targets.forEach(function(t){
      if(t.querySelector(".heimslig-v4-navlinks"))return;
      var links=el("span","heimslig-v4-navlinks");
      var a=el("a");a.href=base+"social/";a.textContent="Sosialt & inspirasjon";links.appendChild(a);
      var p=el("a");p.href=base+"produkter/#heimslig-kalkulator";p.textContent="Priskalkulator";links.appendChild(p);
      t.appendChild(links);
    });
  }
  function compactPrototypeWarning(){
    Array.from(document.querySelectorAll("p,aside,div")).forEach(function(n){
      var s=(n.textContent||"").trim();
      if(s.startsWith("Alle produktene er designkonsepter:") && s.length<270 && n.querySelectorAll("p,aside,div").length===0){
        n.hidden=true; n.setAttribute("aria-hidden","true");
      }
    });
  }
  function buildCalculator(){
    if(!(path.includes("/produkter/")||path.includes("/produkt/")||path.includes("/3d-studio/")))return;
    if(document.getElementById("heimslig-kalkulator"))return;
    var main=document.querySelector("main")||document.body;
    var section=el("section","heimslig-v4-panel");section.id="heimslig-kalkulator";
    section.setAttribute("aria-label","Budsjettkalkulator for møbler");
    section.innerHTML=
      '<p class="h4-eyebrow">Planlegg ditt rom</p>'+
      '<h2>Hva vil rommet koste?</h2>'+
      '<p class="h4-intro">Lag et personlig møbelbudsjett med antall, kategori og beløp du selv velger. Et praktisk planleggingsverktøy mens Heimsligs faktiske sortiment og priser ikke er lagt inn.</p>'+
      '<div class="h4-calculator"><div><div class="h4-lines" id="h4-lines"></div>'+
      '<div class="h4-actions"><button type="button" class="h4-button ghost" id="h4-add">+ Legg til møbel</button><button type="button" class="h4-button ghost" id="h4-reset">Nullstill</button></div>'+
      '<div class="h4-shipping"><label for="h4-delivery">Anslått frakt / levering (kr)</label><input id="h4-delivery" type="number" min="0" step="1" inputmode="numeric" placeholder="Valgfritt" /></div></div>'+
      '<div class="h4-summary"><div class="h4-sumlabel">Ditt budsjettestimat</div><output id="h4-total" aria-live="polite">Legg inn beløp</output>'+
      '<p id="h4-breakdown">Summen oppdateres når du skriver inn anslått stykkpris.</p>'+
      '<button type="button" class="h4-button" id="h4-copy">Kopier budsjettet</button></div></div>'+
      '<p class="h4-fineprint">NB: Dette er ikke et pristilbud. Ingen faktiske Heimslig-produktpriser eller leveringsvilkår er publisert i konseptet. Du skriver inn egne anslag i kroner, inkludert eventuell mva. Ingen betaling eller bestilling aktiveres.</p>';
    var search=main.querySelector('input[placeholder*="produkt"],input[placeholder*="kategori"],input[placeholder*="Søk"]');
    var anchor=search && search.closest("form,.filters,.catalog-toolbar,.search-bar");
    if(anchor && anchor.parentNode)anchor.parentNode.insertBefore(section,anchor);
    else {
      var heading=main.querySelector("h1");
      var hero=heading&&heading.closest("section,article,header");
      if(hero&&hero!==main&&hero.parentNode)hero.insertAdjacentElement("afterend",section);
      else main.insertBefore(section,main.firstChild);
    }
    var lines=document.getElementById("h4-lines");
    var delivery=document.getElementById("h4-delivery");
    var previous;
    try{previous=JSON.parse(localStorage.getItem(storeKey)||"null");}catch(e){previous=null;}
    function row(data){
      var wrap=el("div","h4-line");
      var options=categories.map(function(c){return '<option value="'+c[0]+'">'+c[1]+'</option>';}).join("");
      wrap.innerHTML='<div><label>Kategori</label><select class="h4-category" aria-label="Møbelkategori">'+options+'</select></div>'+
        '<div><label>Antall</label><input class="h4-qty" type="number" min="1" max="1000" step="1" inputmode="numeric" value="1" aria-label="Antall"/></div>'+
        '<div><label>Stykkpris (kr)</label><input class="h4-price" type="number" min="0" step="1" inputmode="numeric" placeholder="Ditt anslag" aria-label="Anslått stykkpris"/></div>'+
        '<button class="h4-remove" type="button" aria-label="Fjern møbelrad">×</button>';
      wrap.querySelector("select").value=data&&data.category||category();
      wrap.querySelector(".h4-qty").value=data&&data.qty||1;
      wrap.querySelector(".h4-price").value=(data&&data.price!==undefined&&data.price!==null)?data.price:"";
      wrap.querySelector(".h4-remove").addEventListener("click",function(){if(lines.children.length>1){wrap.remove();update();}});
      wrap.addEventListener("input",update);wrap.addEventListener("change",update);
      lines.appendChild(wrap);
    }
    function collect(){
      return Array.from(lines.children).map(function(w){
        return {category:w.querySelector("select").value,qty:Math.max(1,Math.floor(num(w.querySelector(".h4-qty").value))),
          price:w.querySelector(".h4-price").value.trim()};
      });
    }
    function update(){
      var items=collect(),hasPrice=items.some(function(x){return x.price!=="";});
      var subtotal=items.reduce(function(t,x){return t+x.qty*num(x.price);},0),freight=num(delivery.value),total=subtotal+freight;
      document.getElementById("h4-total").textContent=hasPrice?fmt.format(total):"Legg inn beløp";
      document.getElementById("h4-breakdown").textContent=hasPrice?
        items.length+" møbelkategori(er) · møbler "+fmt.format(subtotal)+" · frakt "+fmt.format(freight):
        "Skriv inn egne prisanslag for å se totalsummen.";
      lines.querySelectorAll(".h4-remove").forEach(function(b){b.disabled=lines.children.length===1;});
      try{localStorage.setItem(storeKey,JSON.stringify({items:items,delivery:delivery.value}));}catch(e){}
    }
    if(previous&&Array.isArray(previous.items)&&previous.items.length){
      previous.items.slice(0,25).forEach(row);delivery.value=previous.delivery||"";
    } else row({category:category(),qty:1,price:""});
    document.getElementById("h4-add").addEventListener("click",function(){if(lines.children.length<25){row({category:category(),qty:1,price:""});update();}});
    document.getElementById("h4-reset").addEventListener("click",function(){lines.replaceChildren();delivery.value="";row({category:category(),qty:1,price:""});update();});
    delivery.addEventListener("input",update);
    document.getElementById("h4-copy").addEventListener("click",function(){
      var items=collect();
      var content="Heimslig rombudsjett (egne estimater, ikke tilbud)\n"+
        items.map(function(x){return (categories.find(function(c){return c[0]===x.category;})||["","Møbel"])[1]+": "+x.qty+" × "+(x.price||"ikke oppgitt")+" kr";}).join("\n")+
        "\nFrakt: "+(delivery.value||"0")+" kr\nSum: "+document.getElementById("h4-total").textContent+"\nIngen bekreftede produktpriser.";
      var b=this;function done(){b.textContent="Kopiert ✓";setTimeout(function(){b.textContent="Kopier budsjettet";},1800);}
      if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(content).then(done).catch(function(){window.prompt("Kopier budsjettet:",content);});}
      else window.prompt("Kopier budsjettet:",content);
    });
    update();
    if(location.hash==="#heimslig-kalkulator")setTimeout(function(){section.scrollIntoView({behavior:"smooth",block:"start"});},250);
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
