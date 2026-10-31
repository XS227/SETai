/* Verified product sources: 2026-10-31. Prices are snapshots, never a checkout quote. */
(function(root){'use strict';
const materials={
 windsor:{name:'Rondine Windsor Beige',size:[.406,.203],pack:1.07,price:949,image:'windsor-0.webp',photo:'windsor-1.webp',source:'https://fliskonkurrenten.no/produkt/rondine-windsor-beige-203x406-107m2/',info:'20,3 × 40,6 cm · 1,07 m²/pakke. Produktfoto fra Fliskonkurrenten. Overflateglans er tilnærmet.'},
 metro:{name:'CP Metro Sand',size:[.6,.6],pack:1.44,price:559,image:'metro.jpg',source:'https://fliskonkurrenten.no/produkt/cp-metro-sand-60x60/',info:'60 × 60 cm. Lagertømming – pris og tilgjengelighet må bekreftes i nettbutikken.'},
 cemento:{name:'Cemento Cassero Grigio',size:[.3,.6],pack:1.44,price:649,image:'cemento.jpg',source:'https://fliskonkurrenten.no/produkt/cemento-cassero-grigio-30x60/',info:'30 × 60 cm. Produktfoto fra Fliskonkurrenten. Overflateglans er tilnærmet.'},
 oak:{name:'Tre · materialstudie',size:null,pack:null,price:null,image:'wood_floor_diff_1k.jpg',source:'https://polyhaven.com/a/wood_floor',info:'Skannet treoverflate fra Poly Haven (CC0). Ikke en bekreftet salgsvare.'}
};
const catalog={
 chair:{name:'Lenestol · skannet modell',size:[.86,1.02,.9],info:'Modern Arm Chair 01 fra Poly Haven (CC0). Visualiseringsmodell, ikke bekreftet Heimslig-vare.'},
 sofa:{name:'Sofa · volumstudie',size:[2.4,.86,.96],info:'Forenklet målmodell. Ingen bekreftet salgsvare eller leverandørpris.'},
 table:{name:'Sofabord · volumstudie',size:[1.2,.42,.65],info:'Forenklet målmodell i tre. Egne mål og prisanslag.'},
 dining:{name:'Spisebord · volumstudie',size:[1.8,.75,.9],info:'Forenklet målmodell. Egne mål og prisanslag.'},
 bed:{name:'Seng · volumstudie',size:[1.8,1,2.1],info:'Forenklet målmodell. Egne mål og prisanslag.'},
 storage:{name:'Skjenk · volumstudie',size:[1.6,.8,.45],info:'Forenklet målmodell. Egne mål og prisanslag.'}
};
const walls={warm:{name:'Varm kalk',color:'#e8dfd1'},chalk:{name:'Kritthvit',color:'#f4f1eb'},clay:{name:'Leire',color:'#ba8f76'},charcoal:{name:'Skifergrå',color:'#6c6a67'},sage:{name:'Dempet salvie',color:'#a7aa96'}};
const finishes={sand:'#c9b799',ivory:'#e6dfd2',charcoal:'#3e3b36',sage:'#92967e'};
const clamp=(v,a,b,f)=>Number.isFinite(Number(v))&&v!==null?Math.max(a,Math.min(b,Number(v))):f;
const price=v=>v===''||v===null||v===undefined||!Number.isFinite(Number(v))?null:clamp(v,0,1e7,null);
function item(type='chair',id='i1'){return {id,type,finish:'sand',size:[...catalog[type].size],x:0,z:0,rotation:0,price:null};}
function defaults(){return {version:6,width:5,length:4,height:2.5,wall:'warm',floor:'windsor',pattern:'offset',daylight:'day',waste:10,floorPrices:{},delivery:null,items:[item()],selected:'i1'};}
function normalize(raw){const s=defaults();if(!raw||typeof raw!=='object')return s;
 for(const [k,a,b] of [['width',2.5,12],['length',2.5,12],['height',2.1,4],['waste',0,30]])if(raw[k]!=null)s[k]=clamp(raw[k],a,b,s[k]);
 for(const [k,opts] of [['floor',materials],['wall',walls],['pattern',{straight:1,offset:1}],['daylight',{day:1,evening:1}]])if(Object.hasOwn(opts,raw[k]))s[k]=raw[k];
 for(const k of Object.keys(materials))if(Object.hasOwn(raw.floorPrices||{},k))s.floorPrices[k]=price(raw.floorPrices[k]);
 s.delivery=price(raw.delivery);
 if(Array.isArray(raw.items))s.items=raw.items.filter(i=>i&&Object.hasOwn(catalog,i.type)).slice(0,20).map((v,j)=>({...item(v.type,'i'+j),finish:Object.hasOwn(finishes,v.finish)?v.finish:'sand',size:catalog[v.type].size.map((n,k)=>clamp(v.size?.[k],.2,4,n)),x:clamp(v.x,-6,6,0),z:clamp(v.z,-6,6,0),rotation:clamp(v.rotation,-180,180,0),price:price(v.price)}));
 const idx=Array.isArray(raw.items)?raw.items.findIndex(i=>i?.id===raw.selected):-1;s.selected=s.items[idx]?.id||s.items[0]?.id||null;return s;
}
const unitPrice=s=>Object.hasOwn(s.floorPrices,s.floor)?price(s.floorPrices[s.floor]):materials[s.floor].price;
function totals(s){const m=materials[s.floor],area=s.width*s.length,withWaste=area*(1+s.waste/100),packages=m.pack?Math.ceil((withWaste-1e-8)/m.pack):null,orderArea=packages!==null?Math.round(packages*m.pack*100)/100:Math.ceil(withWaste*100-1e-8)/100,p=unitPrice(s),furniture=s.items.reduce((n,i)=>n+(price(i.price)??0),0),floorCost=p===null?0:Math.round(p*orderArea*100)/100,missing=s.items.filter(i=>price(i.price)===null).length+(p===null?1:0)+(price(s.delivery)===null?1:0);return {area,withWaste,packages,orderArea,floorCost,furniture,missing,total:Math.round((floorCost+furniture+(price(s.delivery)??0))*100)/100};}
function outside(s,i){const a=i.rotation*Math.PI/180,w=Math.abs(Math.cos(a))*i.size[0]+Math.abs(Math.sin(a))*i.size[2],d=Math.abs(Math.sin(a))*i.size[0]+Math.abs(Math.cos(a))*i.size[2];return Math.abs(i.x)+w/2>s.width/2+.001||Math.abs(i.z)+d/2>s.length/2+.001||i.size[1]>s.height;}
const api={materials,catalog,walls,finishes,price,item,defaults,normalize,unitPrice,totals,outside};if(typeof module!=='undefined')module.exports=api;else root.KSHRoom=api;
})(globalThis);
