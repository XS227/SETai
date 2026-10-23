/* Stenhuset marmorbord / pidestaller and made-to-measure countertops as real-size 3D models (no model files).
 * Tables: specs from the product pages (round side tables Ø40 × H45, plinth blocks 40×40×40 and 30×30×51).
 * Countertops: built from the customer's configuration (stone, length, depth, thickness, edge profile, cut-outs, upstand).
 * Stones, materials and UV mapping are shared with the stenvasker (sinks3d-v1.js). */
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {sinkMaterial,boxUV} from './sinks3d-v1.js?v=4';

/* kind 'round': R top radius, H height, tt top thickness, rb/rt column radius at bottom/top, rim: raised lip (top slightly sunk)
 * kind 'plinth': W x D x H block */
export const TABLES={
  10801:{n:'Viola marmor sidebord 40×45 cm',kind:'round',R:.20,H:.45,tt:.03,rb:.115,rt:.06,rim:true,stone:'sk-viola',surf:'honed'},
  10753:{n:'Travertin sidebord 40×45',kind:'round',R:.20,H:.45,tt:.032,rb:.11,rt:.085,round:true,stone:'sk-travvein',surf:'honed'},
  10747:{n:'Rosso Levanto sidebord',kind:'round',R:.20,H:.45,tt:.025,rb:.13,rt:.055,rim:true,stone:'sk-rosso',surf:'honed'},
  10635:{n:'Plinth Arabescato pidestall 51×30',kind:'plinth',W:.30,D:.30,H:.51,stone:'sk-arabescato',surf:'honed'},
  10630:{n:'Plinth Arabescato sidebord 40×40',kind:'plinth',W:.40,D:.40,H:.40,stone:'sk-arabescato',surf:'honed'},
  10625:{n:'Plinth Travertin pidestall 51×30',kind:'plinth',W:.30,D:.30,H:.51,stone:'sk-travvein',surf:'honed'},
  10619:{n:'Plinth Travertin sidebord 40×40',kind:'plinth',W:.40,D:.40,H:.40,stone:'sk-travvein',surf:'honed'},
  10612:{n:'Plinth Viola pidestall 51×30',kind:'plinth',W:.30,D:.30,H:.51,stone:'sk-viola',surf:'honed'},
  10606:{n:'Plinth Viola sidebord 40×40',kind:'plinth',W:.40,D:.40,H:.40,stone:'sk-viola',surf:'honed'}
};
export const tableSize=sp=>sp.kind==='round'?{W:sp.R*2,D:sp.R*2,H:sp.H}:{W:sp.W,D:sp.D,H:sp.H};

/* profile for the round tables, from the centre of the underside outwards and up to the centre of the top */
function roundProfile(sp){
  const {R,H,tt,rb,rt}=sp,e=sp.round?Math.min(.012,tt*.45):.003,yU=H-tt,P=[];
  P.push([0,0],[rb-.004,0],[rb,.004]);
  for(let i=1;i<=10;i++){const f=i/10,r=rb+(rt-rb)*Math.pow(f,.8);P.push([r,(yU-.004)*f]);} // gently curved cone
  P.push([rt+.004,yU],[R-e,yU]);
  for(let i=1;i<=6;i++){const a=-Math.PI/2+i/6*Math.PI/2;P.push([R-e+e*Math.cos(a),yU+e+e*Math.sin(a)]);}
  P.push([R,H-e]);
  for(let i=1;i<=6;i++){const a=i/6*Math.PI/2;P.push([R-e+e*Math.cos(a),H-e+e*Math.sin(a)]);}
  if(sp.rim){P.push([R-.014,H],[R-.017,H-.003],[0,H-.003]);} // raised lip, slightly sunk top (keeps glasses steady)
  else P.push([0,H]);
  return P.map(([r,y])=>new THREE.Vector2(Math.max(0,r),y));
}
export function buildTable(id,onReady){
  const sp=TABLES[id];if(!sp)return null;
  const mat=sinkMaterial({...sp,photo:id},onReady),G=new THREE.Group();let geo;
  if(sp.kind==='round'){
    geo=new THREE.LatheGeometry(roundProfile(sp),96);
    geo.computeVertexNormals();
    // lathe winding: make the normals point out of the stone (check a vertex half way up the column)
    const p=geo.attributes.position,n=geo.attributes.normal,i=7;
    if(n.getX(i)*p.getX(i)+n.getZ(i)*p.getZ(i)<0){const idx=geo.index.array;for(let k=0;k<idx.length;k+=3){const t=idx[k+1];idx[k+1]=idx[k+2];idx[k+2]=t;}geo.index.needsUpdate=true;geo.computeVertexNormals();}
  }else{
    geo=new RoundedBoxGeometry(sp.W,sp.H,sp.D,3,.004);geo.translate(0,sp.H/2,0);
  }
  boxUV(geo,{W:sp.W||sp.R*2});
  const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;G.add(m);
  G.userData={id,spec:sp,kind:'table'};
  return G;
}

/* ---------------- countertop (made to measure) ----------------
 * cfg: {stone, L, D, t (metres), edge:'rett'|'fas'|'avrundet'|'halvrund', sink:bool, sinkX, hob:bool, hobX, splash (metres)} */
export const EDGES=[['rett','Rett kant'],['fas','Fas'],['avrundet','Avrundet'],['halvrund','Halvrund']];
const steel=()=>new THREE.MeshStandardMaterial({color:'#c9cdd0',metalness:1,roughness:.25});
const glass=()=>new THREE.MeshPhysicalMaterial({color:'#0d0e10',roughness:.08,metalness:0,clearcoat:1,clearcoatRoughness:.05});
export function buildCountertop(cfg,onReady){
  const {L,D,t}=cfg,mat=sinkMaterial({stone:cfg.stone,surf:'honed'},onReady),G=new THREE.Group();
  let bt=0,bs=0,seg=1;
  if(cfg.edge==='fas'){bt=bs=.003;seg=1;}
  else if(cfg.edge==='avrundet'){bt=bs=.005;seg=4;}
  else if(cfg.edge==='halvrund'){bt=bs=Math.max(.004,t/2-.0006);seg=8;}
  const hx=L/2-bs,hz=D/2-bs,shape=new THREE.Shape();
  shape.moveTo(-hx,-hz);shape.lineTo(hx,-hz);shape.lineTo(hx,hz);shape.lineTo(-hx,hz);shape.lineTo(-hx,-hz);
  const hole=(cx,w,d)=>{const h=new THREE.Path(),a=w/2+bs,b=d/2+bs;h.moveTo(cx-a,-b);h.lineTo(cx-a,b);h.lineTo(cx+a,b);h.lineTo(cx+a,-b);h.lineTo(cx-a,-b);shape.holes.push(h);};
  const SINK=[.50,.40],HOB=[.56,.49];
  if(cfg.sink)hole(cfg.sinkX||0,SINK[0],SINK[1]);
  if(cfg.hob)hole(cfg.hobX||0,HOB[0],HOB[1]);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:Math.max(.0008,t-2*bt),bevelEnabled:bt>0,bevelThickness:bt,bevelSize:bs,bevelSegments:seg,curveSegments:12});
  geo.rotateX(-Math.PI/2);            // extrusion (z) becomes height (y); shape y becomes -z
  geo.computeBoundingBox();geo.translate(0,-geo.boundingBox.min.y,0);
  geo.computeVertexNormals();boxUV(geo,{W:L});
  const top=new THREE.Mesh(geo,mat);top.castShadow=top.receiveShadow=true;G.add(top);
  if(cfg.sink){
    // undermounted steel basin seen through the cut-out
    const sm=steel();sm.side=THREE.BackSide; // inside faces only: an open basin when seen through the cut-out
    const b=new THREE.Mesh(new THREE.BoxGeometry(SINK[0]-.01,.2,SINK[1]-.01),sm);b.position.set(cfg.sinkX||0,-.1,0);G.add(b);
    const d=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.004,24),new THREE.MeshStandardMaterial({color:'#222'}));d.position.set(cfg.sinkX||0,-.197,0);G.add(d);
  }
  if(cfg.hob){
    const g=new THREE.Mesh(new THREE.BoxGeometry(HOB[0]+.02,.006,HOB[1]+.02),glass());g.position.set(cfg.hobX||0,t+.003,0);g.castShadow=true;G.add(g);
    for(const [dx,dz,r] of [[-.14,-.1,.09],[.14,-.1,.07],[-.14,.11,.07],[.14,.11,.09]]){const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.0015,6,48),new THREE.MeshStandardMaterial({color:'#4a4d52',roughness:.6}));ring.rotation.x=Math.PI/2;ring.position.set((cfg.hobX||0)+dx,t+.0065,dz);G.add(ring);}
  }
  if(cfg.splash>0){
    const sg=new RoundedBoxGeometry(L,cfg.splash,.02,2,.002);sg.translate(0,t+cfg.splash/2,-D/2+.01);boxUV(sg,{W:L});
    const s=new THREE.Mesh(sg,mat);s.castShadow=s.receiveShadow=true;G.add(s);
  }
  G.userData={kind:'countertop',cfg};
  return G;
}
