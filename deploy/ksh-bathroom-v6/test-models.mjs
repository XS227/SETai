import * as T from '../ksh-v6/vendor/build/three.module.js';
import {GLTFLoader} from '../ksh-v6/vendor/examples/jsm/loaders/GLTFLoader.js';
import {products,placement,normalizeModel,quote} from './layout.js';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),C=require('../ksh-v6/room-data.js');
const loader=new GLTFLoader(),models={};
for(const key of ['sense','vedum','zup','althea']){
 const url=key==='sense'?'../sanipro-upgrade/sense-v3.glb':`../ksh-v6/dist/ksh/fliskonkurrenten/produkt/${products[key].slug}/assets/model-yup-v6.glb`;
 const file=readFileSync(new URL(url,import.meta.url));const gltf=await loader.parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');models[key]=gltf.scene;
 for(const room of [{width:3.8,length:3.4,height:2.8},{width:3.2,length:2.8,height:2.8},{width:8,length:8,height:4}]){
  const obj=normalizeModel(T,gltf.scene,key),where=placement(key,room);obj.position.set(...where.position);obj.rotation.y=where.rotation;obj.updateMatrixWorld(true);const b=new T.Box3().setFromObject(obj),size=b.getSize(new T.Vector3());
  assert(b.min.y>=-1e-5&&b.max.y<=room.height+1e-5,key+' vertical bounds');assert(b.min.x>=-room.width/2&&b.max.x<=room.width/2,key+' horizontal bounds');assert(b.min.z>=-room.length/2&&b.max.z<=room.length/2,key+' depth bounds');
  if(key==='zup')assert(Math.abs(size.y-2.798)<.001,'Panel must stand upright');
  if(key==='althea')assert(Math.abs(b.min.y-1.1)<.001,'Tile must be mounted above the vanity');
  if(key==='vedum')assert(Math.abs(size.y-.422)<.001&&Math.abs(size.z-1.205)<.001,'Vanity front must face into the room');
 }
}
const room=C.defaults();room.width=3.8;room.length=3.4;let q=quote(C,room,{});assert.equal(q.total,38966.02);const withAll=quote(C,room,{vedum:true,zup:true,althea:true,stone:true});assert.equal(withAll.missing,1);assert.equal(Math.round((withAll.total-q.total)*100)/100,Math.round((41925+1999+.595*1.192*1299)*100)/100);
room.width=4.8;assert(quote(C,room,{}).total>q.total,'Room area must update the price');room.floor='oak';assert.equal(quote(C,room,{}).missing,1,'Unknown floor price is not free');
console.log('PASS: actual GLB orientation, dimensions, room bounds at three sizes, wall mounts, live totals and missing prices.');
