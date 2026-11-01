/* Metres, Y-up. Legacy Z-up exports are accepted during migration. */
export const products={
 sense:{name:'Sanipro Sense',size:[1.7,.6,.8],zUp:false,price:24750},
 vedum:{name:'Vedum Flow · Tåkegrønn',slug:'vedum-flow-takegronn',size:[1.205,.422,.628],zUp:true,price:41925},
 zup:{name:'Z-UP · Eik sort',slug:'zup-spilepanel-eik-sort',size:[.6,2.798,.02085],zUp:true,price:1999},
 althea:{name:'Colorker Althea · Sand Dekor',slug:'colorker-althea-sand-dekor',size:[.595,1.192,.01135],zUp:true,price:1299},
 stone:{name:'Heimdal · steinreferanse',price:null}
};
export function placement(key,room){const gap=.012;
 if(key==='sense')return {position:[.2,0,-room.length/2+.4+gap],rotation:0};
 if(key==='vedum')return {position:[-room.width/2+.628/2+gap,.48,.2],rotation:Math.PI/2};
 if(key==='zup')return {position:[room.width/2-.32,0,-room.length/2+.02085/2+gap],rotation:0};
 if(key==='althea')return {position:[-room.width/2+.01135/2+gap,1.1,.2],rotation:Math.PI/2};
}
export function normalizeModel(T,source,key){const p=products[key],axes=new T.Group(),model=source.clone(true);axes.add(model);if(p.zUp && !source.getObjectByName("KSH_Y_UP_ROOT"))axes.rotation.x=-Math.PI/2;
 axes.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(axes),size=bounds.getSize(new T.Vector3());
 if(![size.x,size.y,size.z].every(n=>Number.isFinite(n)&&n>0))throw Error('Ugyldige modellmål: '+key);
 // The geometry is already authored in metres. Reject incompatible units instead of stretching the product.
 if([size.x,size.y,size.z].some((n,j)=>Math.abs(n-p.size[j])>Math.max(.003,p.size[j]*.025)))throw Error('Uventede modellmål: '+key);
 const centered=new T.Group();centered.add(axes);axes.position.set(-(bounds.min.x+bounds.max.x)/2,-bounds.min.y,-(bounds.min.z+bounds.max.z)/2);centered.updateMatrixWorld(true);
 // glTF numeric baseColorFactor is linear. The legacy Vedum GLB was authored
 // with raw #RRGGBB/255 values, producing an over-bright mint green in Three.js.
 // Set calibrated sRGB HEX through THREE.Color.set(), which converts correctly
 // to Three's linear working space. Physical product images remain authoritative.
 const vedumPalette={
  fog:['#5a675d',.68,0],front:['#647167',.60,0],
  shadow:['#2d332f',.86,0],stone:['#ffffff',.63,0],
  white:['#f2f0eb',.31,0],metal:['#878e8b',.29,.56]
 };
 centered.traverse(o=>{
  if(!o.isMesh)return;
  o.castShadow=o.receiveShadow=true;o.userData.shared=true;
  if(key==='vedum'){
   const correct=m=>{
    const entry=vedumPalette[m?.name];
    if(!entry)return m;
    const copy=m.clone();
    copy.color.set(entry[0]); // sRGB hex correctly mapped to linear
    copy.roughness=entry[1];copy.metalness=entry[2];
    copy.needsUpdate=true;return copy;
   };
   o.material=Array.isArray(o.material)?o.material.map(correct):correct(o.material);
  }
 });return centered;
}

export const tile={width:.595,height:1.192,unit:1299,grout:.003};
export function wallSurface(room){
 const wall=['back','left','both'].includes(room.tileWall)?room.tileWall:'back';
 const surfaces=[];
 if(wall==='back'||wall==='both')surfaces.push({side:'back',width:room.width,height:room.height});
 if(wall==='left'||wall==='both')surfaces.push({side:'left',width:room.length,height:room.height});
 const area=surfaces.reduce((a,x)=>a+x.width*x.height,0);
 // Budget uses m² sold (plus 10% approximate cutting waste); no per-tile illusion.
 const orderArea=Math.round(area*1.1*100)/100;
 const estimatedTiles=Math.ceil(orderArea/(tile.width*tile.height));
 return {surfaces,area,orderArea,estimatedTiles,price:Math.round(orderArea*tile.unit)};
}
export function quote(C,room,enabled){
 const floor=C.totals(room),lines=[];
 if(enabled?.sense)lines.push({key:'sense',name:products.sense.name,price:products.sense.price});
 if(enabled?.vedum)lines.push({key:'vedum',name:products.vedum.name,price:products.vedum.price});
 if(enabled?.zup){
  const panels=Math.ceil(room.length/products.zup.size[0]);
  lines.push({key:'zup',name:'Z-UP · '+panels+' paneler til høyre vegg',price:panels*products.zup.price,qty:panels});
 }
 if(enabled?.althea){
  const surface=wallSurface(room);
  lines.push({key:'althea',name:'Colorker · '+surface.orderArea.toFixed(2).replace('.',',')+' m² inkl. 10 % svinn',price:surface.price,area:surface.area,qty:surface.estimatedTiles});
 }
 if(enabled?.stone)lines.push({key:'stone',name:products.stone.name,price:null});
 const missing=lines.filter(l=>l.price===null).length+(C.unitPrice(room)===null?1:0);
 const total=Math.round((floor.floorCost+lines.reduce((sum,l)=>sum+(l.price??0),0))*100)/100;
 return {floor,lines,missing,total};
}
