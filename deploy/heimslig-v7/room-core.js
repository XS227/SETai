(function(root){
'use strict';
const catalog={
 sofa:{name:'Atelier · sofa',size:[2.4,.86,.96],category:'sofaer',info:'Tre seter med løse puter. Illustrativ modell, ikke en bekreftet Heimslig-vare.'},
 chair:{name:'Form · lenestol',size:[.86,1.02,.9],category:'stoler',info:'Lenestol med armlener. Målene gjelder demomodellen.'},
 table:{name:'Stille · sofabord',size:[1.2,.42,.65],category:'bord',info:'Lavt bord i tre. Finish og mål kan justeres i rommet.'},
 dining:{name:'Samle · spisebord',size:[1.8,.75,.9],category:'bord',info:'Rektangulært spisebord. Stoler legges til separat.'},
 bed:{name:'Ro · seng',size:[1.8,1,2.1],category:'senger',info:'Dobbeltseng med hodegavl. Illustrativ modell.'},
 storage:{name:'Linje · skjenk',size:[1.6,.8,.45],category:'oppbevaring',info:'Lav oppbevaring med tre fronter. Illustrativ modell.'},
 sirkel:{name:'Sirkel · sofabord',size:[.9,.43,.9],category:'bord',info:'Rund hvit sofabordmodell som følger konseptformen i produktbildet; målene er illustrative.'},
 side:{name:'Atelier · sidebord',size:[.52,.52,.52],category:'bord',info:'Lite illustrativt sidebord. Ingen bekreftede produktmål.'}
};
const floors={oak:'Eik',concrete:'Betong',slate:'Skifer',limestone:'Kalkstein'};
const finishes={sand:'Sand',sage:'Salvie',charcoal:'Koks',ivory:'Elfenben'};
const walls={warm:'Varm hvit',chalk:'Kalkhvit',sage:'Salvie',clay:'Leire',charcoal:'Koksgrå'};
const number=(v,min,max,fallback)=>{const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;};
const price=v=>v===''||v===null||v===undefined?null:number(v,0,10000000,0);
function item(type='sofa',id='i1'){const p=catalog[type]||catalog.sofa;return {id,type:catalog[type]?type:'sofa',productSlug:null,finish:type==='sirkel'?'ivory':'sand',size:[...p.size],x:0,z:0,rotation:0,price:null};}
function defaults(){return {version:5,roomType:'stue',width:5,length:4,height:2.5,wall:'warm',floor:'oak',pattern:'straight',format:.6,daylight:'day',waste:10,floorPrices:{},delivery:null,items:[item()],selected:'i1'};}
function normalize(raw){const s=defaults();if(!raw||typeof raw!=='object')return s;
 for(const [k,min,max] of [['width',2.5,12],['length',2.5,12],['height',2.1,4],['waste',0,30],['format',.2,1.2]])if(raw[k]!=null)s[k]=number(raw[k],min,max,s[k]);
 for(const [k,opts] of [['floor',floors],['wall',walls],['roomType',{stue:1,spisestue:1,soverom:1}],['pattern',{straight:1,offset:1}],['daylight',{day:1,evening:1}]])if(Object.hasOwn(opts,raw[k]))s[k]=raw[k];
 s.delivery=price(raw.delivery);for(const k of Object.keys(floors))s.floorPrices[k]=price(raw.floorPrices?.[k]);
 if(Array.isArray(raw.items))s.items=raw.items.slice(0,20).filter(x=>x&&Object.hasOwn(catalog,x.type)).map((v,i)=>{
  const n=item(v.type,'i'+(i+1));n.finish=Object.hasOwn(finishes,v.finish)?v.finish:'sand';n.size=n.size.map((x,j)=>number(v.size?.[j]??x,.2,4,x));n.rotation=number(v.rotation??0,-180,180,0);n.x=number(v.x??0,-6,6,0);n.z=number(v.z??0,-6,6,0);n.price=price(v.price);n.productSlug=typeof v.productSlug==='string'&&Object.hasOwn(products,v.productSlug)?v.productSlug:null;return n;
 });const selectedIndex=Array.isArray(raw.items)?raw.items.findIndex(x=>x?.id===raw.selected):-1;s.selected=s.items[selectedIndex]?.id||s.items[0]?.id||null;return s;}
function totals(s){const area=s.width*s.length;const orderArea=Math.ceil(area*(1+s.waste/100)*100-1e-8)/100;const floorPrice=price(s.floorPrices[s.floor]);const furniture=s.items.reduce((n,x)=>n+(price(x.price)??0),0);const missing=s.items.filter(x=>price(x.price)===null).length+(floorPrice===null?1:0)+(price(s.delivery)===null?1:0);const floorCost=floorPrice===null?0:orderArea*floorPrice;return {area,orderArea,furniture,floorCost,total:furniture+floorCost+(price(s.delivery)??0),missing};}
function outside(s,i){const a=i.rotation*Math.PI/180,w=Math.abs(Math.cos(a))*i.size[0]+Math.abs(Math.sin(a))*i.size[2],d=Math.abs(Math.sin(a))*i.size[0]+Math.abs(Math.cos(a))*i.size[2];return Math.abs(i.x)+w/2>s.width/2+.001||Math.abs(i.z)+d/2>s.length/2+.001||i.size[1]>s.height;}

/** Concept product variants. All dimensions and finishes are illustration-only, not confirmed inventory. */
const products={
 'sirkel-bord':{type:'sirkel',name:'Sirkel · sofabord',size:[.9,.43,.9],finish:'ivory',info:'Rundt, lyst sofabord med rund plate og sokkel. Illustrativ 3D-rekonstruksjon av designbildet, ikke en verifisert vare.'},
 'samlingsbord':{type:'dining',name:'Samling · spisebord',size:[1.8,.75,.9],finish:'sand'},
 'atelier-sidebord':{type:'side',name:'Atelier · sidebord',size:[.52,.52,.52],finish:'ivory'},
 'nord-ro-sofa':{type:'sofa',name:'Nord Ro · modulsofa',size:[2.5,.82,1.0],finish:'sand'},
 'linje-sofa':{type:'sofa',name:'Linje · sofa',size:[2.3,.83,.91],finish:'ivory'},
 'fjord-sofa':{type:'sofa',name:'Fjord · hjørnesofa',size:[2.7,.86,1.5],finish:'sand'},
 'saga-lenestol':{type:'chair',name:'Saga · lenestol',size:[.9,1,.9],finish:'sand'},
 'ro-lenestol':{type:'chair',name:'Ro · loungestol',size:[.88,.8,.9],finish:'ivory'},
 'alto-stol':{type:'chair',name:'Alto · spisestol',size:[.57,.85,.6],finish:'sand'},
 'hvile-seng':{type:'bed',name:'Hvile · seng',size:[1.8,.95,2.1],finish:'sand'},
 'natt-seng':{type:'bed',name:'Natt · seng',size:[1.8,.95,2.1],finish:'charcoal'},
 'linje-oppbevaring':{type:'storage',name:'Linje · oppbevaringsmodul',size:[1.6,.8,.45],finish:'sand'},
 'orden-kommode':{type:'storage',name:'Orden · kommode',size:[1.2,.9,.5],finish:'sand'}
};
function itemName(i){return i.productSlug&&products[i.productSlug]?products[i.productSlug].name:catalog[i.type]?.name||'Møbel';}
function itemInfo(i){return i.productSlug&&products[i.productSlug]?.info || catalog[i.type]?.info || 'Illustrativ 3D-modell.';}
function footprintAxes(i){
 const r=(i.rotation||0)*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
 return [[c,-s],[s,c]];
}
function overlaps(a,b,clearance=0.14){
 const aa=footprintAxes(a),bb=footprintAxes(b);
 const ha=[a.size[0]/2+clearance/2,a.size[2]/2+clearance/2];
 const hb=[b.size[0]/2+clearance/2,b.size[2]/2+clearance/2];
 const d=[b.x-a.x,b.z-a.z];
 for(const axis of [...aa,...bb]){
  const distance=Math.abs(d[0]*axis[0]+d[1]*axis[1]);
  const rA=ha[0]*Math.abs(axis[0]*aa[0][0]+axis[1]*aa[0][1])+ha[1]*Math.abs(axis[0]*aa[1][0]+axis[1]*aa[1][1]);
  const rB=hb[0]*Math.abs(axis[0]*bb[0][0]+axis[1]*bb[0][1])+hb[1]*Math.abs(axis[0]*bb[1][0]+axis[1]*bb[1][1]);
  if(distance>=rA+rB-1e-6)return false;
 }
 return true;
}
function collisions(s){
 const pairs=[];
 for(let a=0;a<s.items.length;a++)for(let b=a+1;b<s.items.length;b++)
  if(overlaps(s.items[a],s.items[b],.07))pairs.push([s.items[a].id,s.items[b].id]);
 return pairs;
}
function findPlacement(s,i){
 // Candidate centres in metres, sorted from the room centre outwards.
 // Never move existing furniture when placing a new object.
 const candidate=[];
 const step=.2;
 for(let xi=Math.ceil((-s.width/2+.1)/step);xi<=Math.floor((s.width/2-.1)/step);xi++)
  for(let zi=Math.ceil((-s.length/2+.1)/step);zi<=Math.floor((s.length/2-.1)/step);zi++)
   candidate.push([Math.round(xi*step*100)/100,Math.round(zi*step*100)/100]);
 candidate.sort((a,b)=>{
  const aa=a[0]*a[0]+a[1]*a[1],bb=b[0]*b[0]+b[1]*b[1];
  return aa-bb || b[1]-a[1] || a[0]-b[0];
 });
 for(const [x,z] of candidate){
  const trial={...i,x,z};
  if(!outside(s,trial)&&s.items.every(old=>!overlaps(trial,old)))return {x,z};
 }
 return null;
}
function reflow(s){
 const rearranged=[];
 for(const old of s.items){
  const pose=findPlacement({...s,items:rearranged},old);
  if(!pose)return false;
  rearranged.push({...old,...pose});
 }
 s.items=rearranged;return true;
}
function selectProduct(s,slug){
 const p=products[slug];
 if(!p)return {status:'unknown'};
 const current=s.items.find(i=>i.productSlug===slug);
 if(current){s.selected=current.id;return {status:'selected',name:p.name};}
 if(s.items.length>=20)return {status:'full',name:p.name};
 const id='p-'+slug;
 const next=item(p.type,id);
 next.productSlug=slug;next.size=[...p.size];next.finish=p.finish;
 // Never replace customised or saved furniture. Only replace the untouched
 // original starter sofa when visiting a product directly for the first time.
 const first=s.items.length===1&&s.items[0].id==='i1'&&s.items[0].type==='sofa'
  &&s.items[0].x===0&&s.items[0].z===0&&s.items[0].price===null
  &&!s.items[0].productSlug&&s.items[0].finish==='sand'
  &&s.items[0].size.every((v,j)=>v===catalog.sofa.size[j]);
 if(first){s.items=[next];s.selected=id;return {status:'added',name:p.name};}
 const position=findPlacement(s,next);
 if(!position)return {status:'no-space',name:p.name};
 Object.assign(next,position);s.items.push(next);s.selected=id;
 return {status:'added',name:p.name};
}

const api={catalog,products,floors,finishes,walls,item,itemName,itemInfo,defaults,normalize,totals,outside,price,overlaps,collisions,findPlacement,reflow,selectProduct};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HeimsligRoom=api;
})(typeof globalThis!=='undefined'?globalThis:this);
