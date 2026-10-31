(function(root){
'use strict';
const catalog={
 sofa:{name:'Atelier · sofa',size:[2.4,.86,.96],category:'sofaer',info:'Tre seter med løse puter. Illustrativ modell, ikke en bekreftet Heimslig-vare.'},
 chair:{name:'Form · lenestol',size:[.86,1.02,.9],category:'stoler',info:'Lenestol med armlener. Målene gjelder demomodellen.'},
 table:{name:'Stille · sofabord',size:[1.2,.42,.65],category:'bord',info:'Lavt bord i tre. Finish og mål kan justeres i rommet.'},
 dining:{name:'Samle · spisebord',size:[1.8,.75,.9],category:'bord',info:'Rektangulært spisebord. Stoler legges til separat.'},
 bed:{name:'Ro · seng',size:[1.8,1,2.1],category:'senger',info:'Dobbeltseng med hodegavl. Illustrativ modell.'},
 storage:{name:'Linje · skjenk',size:[1.6,.8,.45],category:'oppbevaring',info:'Lav oppbevaring med tre fronter. Illustrativ modell.'}
};
const floors={oak:'Eik',concrete:'Betong',slate:'Skifer',limestone:'Kalkstein'};
const finishes={sand:'Sand',sage:'Salvie',charcoal:'Koks',ivory:'Elfenben'};
const walls={warm:'Varm hvit',chalk:'Kalkhvit',sage:'Salvie',clay:'Leire',charcoal:'Koksgrå'};
const number=(v,min,max,fallback)=>{const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;};
const price=v=>v===''||v===null||v===undefined?null:number(v,0,10000000,0);
function item(type='sofa',id='i1'){const p=catalog[type]||catalog.sofa;return {id,type:catalog[type]?type:'sofa',finish:'sand',size:[...p.size],x:0,z:0,rotation:0,price:null};}
function defaults(){return {version:5,roomType:'stue',width:5,length:4,height:2.5,wall:'warm',floor:'oak',pattern:'straight',format:.6,daylight:'day',waste:10,floorPrices:{},delivery:null,items:[item()],selected:'i1'};}
function normalize(raw){const s=defaults();if(!raw||typeof raw!=='object')return s;
 for(const [k,min,max] of [['width',2.5,12],['length',2.5,12],['height',2.1,4],['waste',0,30],['format',.2,1.2]])if(raw[k]!=null)s[k]=number(raw[k],min,max,s[k]);
 for(const [k,opts] of [['floor',floors],['wall',walls],['roomType',{stue:1,spisestue:1,soverom:1}],['pattern',{straight:1,offset:1}],['daylight',{day:1,evening:1}]])if(Object.hasOwn(opts,raw[k]))s[k]=raw[k];
 s.delivery=price(raw.delivery);for(const k of Object.keys(floors))s.floorPrices[k]=price(raw.floorPrices?.[k]);
 if(Array.isArray(raw.items))s.items=raw.items.slice(0,20).filter(x=>x&&Object.hasOwn(catalog,x.type)).map((v,i)=>{
  const n=item(v.type,'i'+(i+1));n.finish=Object.hasOwn(finishes,v.finish)?v.finish:'sand';n.size=n.size.map((x,j)=>number(v.size?.[j]??x,.2,4,x));n.rotation=number(v.rotation??0,-180,180,0);n.x=number(v.x??0,-6,6,0);n.z=number(v.z??0,-6,6,0);n.price=price(v.price);return n;
 });const selectedIndex=Array.isArray(raw.items)?raw.items.findIndex(x=>x?.id===raw.selected):-1;s.selected=s.items[selectedIndex]?.id||s.items[0]?.id||null;return s;}
function totals(s){const area=s.width*s.length;const orderArea=Math.ceil(area*(1+s.waste/100)*100-1e-8)/100;const floorPrice=price(s.floorPrices[s.floor]);const furniture=s.items.reduce((n,x)=>n+(price(x.price)??0),0);const missing=s.items.filter(x=>price(x.price)===null).length+(floorPrice===null?1:0)+(price(s.delivery)===null?1:0);const floorCost=floorPrice===null?0:orderArea*floorPrice;return {area,orderArea,furniture,floorCost,total:furniture+floorCost+(price(s.delivery)??0),missing};}
function outside(s,i){const a=i.rotation*Math.PI/180,w=Math.abs(Math.cos(a))*i.size[0]+Math.abs(Math.sin(a))*i.size[2],d=Math.abs(Math.sin(a))*i.size[0]+Math.abs(Math.cos(a))*i.size[2];return Math.abs(i.x)+w/2>s.width/2+.001||Math.abs(i.z)+d/2>s.length/2+.001||i.size[1]>s.height;}
const api={catalog,floors,finishes,walls,item,defaults,normalize,totals,outside,price};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HeimsligRoom=api;
})(typeof globalThis!=='undefined'?globalThis:this);
