/* Stenhuset stenvasker as real-size 3D models, built from parameters (no model files).
 * Every product in the "Stenvasker" category gets a spec: outer size (from the product page), basin shape, surface
 * (polished / honed / hand-hewn / organic river stone), stone and drain. The same module is used by the product 3D viewer
 * (sinkviewer-v1.js) and by the bathroom in the 3D showroom (studio3d-v1.js).
 * The models are faithful in size and type, not scans: veins and hewn edges are generated and differ from the real piece. */
import * as THREE from 'three';
import {STONES,generateStone,T} from './stone-textures-v1.js';
import {buildTravertin10827} from './travertin-10827-photo3d-v1.js?v=1';

/* monolithic stones for sinks (no tile joints) */
const SOLID={rowH:T,widths:[T],jw:0,bevel:0,jitter:0,joint:[0,0,0]};
const SINK_STONES={
  'sk-travertin':{kind:'limestone',c0:[222,204,174],c1:[192,168,132],rough:.62,bump:2.2,seed:211},
  'sk-arabescato':{kind:'marble',c0:[238,236,232],vein:[92,94,104],th:[.90,.94],rough:.3,bump:.5,seed:223,patch:null},
  'sk-carrara':{kind:'marble',c0:[234,233,229],vein:[138,140,146],th:[.955,.968],rough:.3,bump:.5,seed:227,patch:null},
  'sk-viola':{kind:'marble',c0:[240,232,224],vein:[104,72,80],th:[.91,.95],rough:.28,bump:.5,seed:229,patch:[214,188,170]},
  'sk-nero':{kind:'marble',c0:[44,44,46],vein:[190,190,194],th:[.955,.975],rough:.3,bump:.5,seed:233,patch:null},
  'sk-botticino':{kind:'marble',c0:[228,214,188],vein:[196,176,146],th:[.94,.965],rough:.18,bump:.5,seed:239,patch:[214,196,166]},
  'sk-beige':{kind:'marble',c0:[226,210,182],vein:[188,166,134],th:[.93,.96],rough:.35,bump:.7,seed:241,patch:[206,184,156]},
  'sk-belgian':{kind:'limestone',c0:[78,80,82],c1:[58,60,62],rough:.6,bump:1.4,seed:251},
  'sk-grey':{kind:'limestone',c0:[120,120,116],c1:[94,94,92],rough:.55,bump:1.6,seed:257},
  'sk-greyveined':{kind:'marble',c0:[150,152,156],vein:[96,98,104],th:[.9,.94],rough:.35,bump:.9,seed:263,patch:[132,134,138]},
  'sk-green':{kind:'marble',c0:[112,120,106],vein:[160,164,150],th:[.93,.96],rough:.22,bump:.6,seed:269,patch:[96,104,92]},
  'sk-petrified':{kind:'marble',c0:[176,142,104],vein:[86,62,42],th:[.86,.91],rough:.4,bump:1.2,seed:271,patch:[140,110,80]},
  'sk-white':{kind:'marble',c0:[240,238,234],vein:[204,204,202],th:[.97,.985],rough:.3,bump:.4,seed:277,patch:null},
  'sk-black':{kind:'limestone',c0:[40,40,42],c1:[30,30,32],rough:.4,bump:1,seed:281},
  'sk-rosso':{kind:'marble',c0:[104,32,36],vein:[232,226,220],th:[.93,.96],rough:.3,bump:.5,seed:283,patch:[84,24,30]},
  'sk-travvein':{kind:'marble',c0:[216,198,168],vein:[172,146,110],th:[.84,.9],rough:.5,bump:.9,seed:293,patch:[200,180,148]},
  'sk-emperador':{kind:'marble',c0:[94,66,50],vein:[214,198,174],th:[.9,.95],rough:.25,bump:.5,seed:307,patch:[72,50,38]}
};
/* stones for the big pieces in a living room: coffee table and fireplace cladding (made to measure) */
export const FEATURE_STONES=[['sk-travvein','Travertin'],['sk-emperador','Emperador'],['sk-green','Grågrønn marmor'],['sk-carrara','Carrara'],['sk-viola','Calacatta Viola'],['sk-arabescato','Arabescato'],['sk-nero','Sort marmor'],['sk-rosso','Rosso Levanto'],['sk-belgian','Belgian blue'],['sk-beige','Beige marmor']];
/* stones offered for made-to-measure countertops (name shown to the customer) */
export const TOP_STONES=[['sk-carrara','Carrara'],['sk-viola','Calacatta Viola'],['sk-arabescato','Arabescato'],['sk-nero','Sort marmor'],['sk-travvein','Travertin'],['sk-botticino','Botticino'],['sk-belgian','Belgian blue'],['sk-beige','Beige marmor'],['sk-rosso','Rosso Levanto']];
for(const [k,v] of Object.entries(SINK_STONES))if(!STONES[k])STONES[k]={...SOLID,...v};

/* Specs. Sizes in metres from the product pages (W x D x H). shape: 'rrect' (rounded rectangle, r = corner radius) or 'ellipse'.
 * wall: rim thickness; depth: basin depth from the top; round: 0 flat basin bottom .. 1 bowl; surf: 'polished'|'honed'|'hewn'|'organic';
 * org: irregularity of organic stones; hew: hand-hewn relief (m); flutes / splash / divider / offset for special models. */
export const SINKS={
  10858:{n:'Håndhugget Travertinservant Oval 70×40',W:.70,D:.41,H:.15,shape:'rrect',r:.14,inner:'ellipse',wall:.07,depth:.10,round:.9,surf:'hewn',hew:.018,stone:'sk-travertin',drain:'stone'},
  10827:{n:'Håndhugget Travertinservant 70×40',W:.70,D:.41,H:.15,shape:'rrect',r:.02,wall:.05,depth:.10,round:.25,surf:'hewn',hew:.02,stone:'sk-travertin',drain:'stone'},
  10780:{n:'Arabescato marmorservant 60×40',W:.60,D:.40,H:.17,shape:'rrect',r:.01,wall:.03,depth:.13,round:.2,surf:'honed',stone:'sk-arabescato',drain:'ball'},
  10768:{n:'Carrara Monolitt marmorservant 60×40',W:.60,D:.40,H:.17,shape:'rrect',r:.01,wall:.035,depth:.12,round:.25,surf:'honed',stone:'sk-carrara',drain:'stone',flutes:{period:.03,amp:.006},splash:{h:.17,holes:3}},
  10719:{n:'Viola petit marmorservant 45×20',W:.45,D:.20,H:.20,shape:'rrect',r:.006,wall:.02,depth:.16,round:.15,surf:'honed',stone:'sk-viola',drain:'stone',divider:.11},
  10709:{n:'Viola Monolitt marmorservant 60×40',W:.60,D:.40,H:.17,shape:'rrect',r:.01,wall:.035,depth:.12,round:.25,surf:'honed',stone:'sk-viola',drain:'stone',flutes:{period:.03,amp:.006},splash:{h:.17,holes:2}},
  10706:{n:'Soller beige marmorservant',W:.60,D:.40,H:.15,shape:'ellipse',wall:.03,depth:.12,round:1,surf:'organic',org:.06,stone:'sk-beige',drain:'chrome'},
  8864:{n:'Massiv servant i Travertin',W:1.015,D:.415,H:.22,shape:'rrect',r:.008,inner:'rrect',iW:.42,iD:.30,ir:.03,offset:-.22,depth:.12,round:.3,surf:'honed',stone:'sk-travertin',drain:'chrome',top:true},
  8751:{n:'Servant i Belgian blue-kalksten',W:.55,D:.40,H:.30,shape:'rrect',r:.008,wall:.035,depth:.26,round:.1,surf:'honed',stone:'sk-belgian',drain:'chrome'},
  8750:{n:'Servant i Bottocino-marmor',W:.45,D:.30,H:.15,shape:'rrect',r:.008,wall:.025,depth:.12,round:.1,surf:'polished',stone:'sk-botticino',drain:'chrome'},
  8749:{n:'Servant i Arabescato-marmor',W:.938,D:.501,H:.16,shape:'rrect',r:.008,wall:.03,depth:.13,round:.12,surf:'honed',stone:'sk-arabescato',drain:'chrome'},
  8720:{n:'Servant i sort marmor',W:.72,D:.46,H:.16,shape:'rrect',r:.008,wall:.03,depth:.13,round:.12,surf:'honed',stone:'sk-nero',drain:'chrome'},
  8679:{n:'Servant i Carrara-marmor',W:.50,D:.355,H:.16,shape:'rrect',r:.008,wall:.025,depth:.13,round:.12,surf:'honed',stone:'sk-carrara',drain:'chrome'},
  583:{n:'Stenvask i beige marmor',W:.50,D:.35,H:.12,shape:'rrect',r:.01,inner:'ellipse',wall:.04,depth:.08,round:1,surf:'polished',stone:'sk-beige',drain:'chrome'},
  576:{n:'Lavabo Mio',W:.43,D:.43,H:.15,shape:'ellipse',wall:.025,depth:.12,round:1,surf:'organic',org:.015,stone:'sk-grey',drain:'chrome'},
  575:{n:'Lavabo Mallorca',W:.50,D:.40,H:.15,shape:'ellipse',wall:.035,depth:.11,round:1,surf:'organic',org:.07,hew:.012,stone:'sk-beige',drain:'chrome'},
  574:{n:'Lavabo Samira',W:.55,D:.52,H:.14,shape:'ellipse',wall:.03,depth:.11,round:1,surf:'organic',org:.06,stone:'sk-grey',drain:'chrome'},
  573:{n:'Lavabo Madera',W:.60,D:.40,H:.15,shape:'ellipse',wall:.04,depth:.09,round:1,surf:'organic',org:.12,hew:.01,stone:'sk-petrified',drain:'chrome'},
  571:{n:'Lavabo Rocco',W:.45,D:.40,H:.15,shape:'rrect',r:.12,wall:.035,depth:.11,round:1,surf:'organic',org:.06,hew:.014,stone:'sk-greyveined',drain:'chrome'},
  569:{n:'Lavabo Rio Negro',W:.50,D:.35,H:.12,shape:'rrect',r:.01,inner:'ellipse',wall:.04,depth:.08,round:1,surf:'polished',stone:'sk-black',drain:'chrome'},
  568:{n:'Lavabo Murcia',W:.60,D:.40,H:.15,shape:'ellipse',wall:.03,depth:.11,round:1,surf:'organic',org:.05,stone:'sk-green',drain:'chrome'},
  567:{n:'Lavabo Canou',W:.85,D:.45,H:.14,shape:'ellipse',wall:.03,depth:.10,round:1,surf:'organic',org:.06,stone:'sk-grey',drain:'chrome',approx:true},
  565:{n:'Lavabo Vato',W:.40,D:.40,H:.15,shape:'ellipse',wall:.025,depth:.13,round:.2,surf:'honed',stone:'sk-beige',drain:'chrome'},
  564:{n:'Lavabo Vesuv',W:.40,D:.40,H:.12,shape:'rrect',r:.01,wall:.04,depth:.09,round:.35,surf:'hewn',hew:.016,stone:'sk-black',drain:'chrome',hewTopOnly:false},
  562:{n:'Lavabo Zona',W:.46,D:.33,H:.135,shape:'rrect',r:.1,wall:.02,depth:.11,round:.6,surf:'polished',stone:'sk-white',drain:'chrome'}
};
export const sinkIds=()=>Object.keys(SINKS).map(Number);

/* ---------------- noise ---------------- */
function hash(i,s){let h=Math.imul(i|0,374761393)^Math.imul(s|0,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
function pnoise1(t,period,seed){const i=Math.floor(t),f=t-i,u=f*f*(3-2*f),a=hash(((i%period)+period)%period,seed),b=hash((((i+1)%period)+period)%period,seed);return a+(b-a)*u;}
function fbm1(t,period,seed){let s=0,amp=.5,tot=0,x=t,p=period;for(let o=0;o<3;o++){s+=amp*pnoise1(x,p,seed+o*17);tot+=amp;amp*=.5;x*=2;p*=2;}return s/tot;}
function noise2(x,y,seed){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash(xi*7919+yi,seed),b=hash((xi+1)*7919+yi,seed),c=hash(xi*7919+yi+1,seed),d=hash((xi+1)*7919+yi+1,seed);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}

/* ---------------- contours: N points by arc length, same start (right middle) and direction for every ring ---------------- */
function contour(shape,a,b,r,N){
  const out=new Array(N);
  if(shape==='ellipse'||a<=1e-5||b<=1e-5){
    for(let j=0;j<N;j++){const t=j/N*Math.PI*2;out[j]=[a*Math.cos(t),b*Math.sin(t),Math.cos(t),Math.sin(t)];}
    return out;
  }
  r=Math.max(0,Math.min(r,a,b));
  const ex=a-r,ez=b-r,seg=[];
  // right edge (going +z), corner, front edge (-x), corner, left edge (-z), corner, back edge (+x), corner; start at (a,0)
  seg.push(['l',[a,0],[a,ez]],['c',[ex,ez],0],['l',[ex,b],[-ex,b]],['c',[-ex,ez],1],['l',[-a,ez],[-a,-ez]],['c',[-ex,-ez],2],['l',[-ex,-b],[ex,-b]],['c',[ex,-ez],3],['l',[a,-ez],[a,0]]);
  const lens=seg.map(s=>s[0]==='l'?Math.hypot(s[2][0]-s[1][0],s[2][1]-s[1][1]):Math.PI*r/2),L=lens.reduce((x,y)=>x+y,0)||1;
  for(let j=0;j<N;j++){
    let d=j/N*L,k=0;while(k<seg.length-1&&d>lens[k]){d-=lens[k];k++;}
    const s=seg[k],f=lens[k]?d/lens[k]:0;
    if(s[0]==='l'){const x=s[1][0]+(s[2][0]-s[1][0])*f,z=s[1][1]+(s[2][1]-s[1][1])*f;const nx=Math.abs(x)>=a-1e-6?Math.sign(x):0,nz=Math.abs(z)>=b-1e-6?Math.sign(z):0;out[j]=[x,z,nx,nz];}
    else{const t=(s[2]+f)*Math.PI/2;out[j]=[s[1][0]+r*Math.cos(t),s[1][1]+r*Math.sin(t),Math.cos(t),Math.sin(t)];}
  }
  return out;
}

/* ---------------- geometry ---------------- */
function sinkGeometry(sp){
  const N=sp.flutes?512:(sp.surf==='organic'?192:256);
  const {W,D,H}=sp,a=W/2,b=D/2,bev=Math.min(.006,H*.05);
  const iW=sp.iW||W-2*sp.wall,iD=sp.iD||D-2*sp.wall,ia=iW/2,ib=iD/2,ishape=sp.inner||sp.shape,ir=sp.ir!=null?sp.ir:Math.max(0,(sp.r||0)-sp.wall);
  const cx=sp.offset||0,bot=H-sp.depth,rc=Math.min(sp.depth*.95,Math.min(ia,ib)*sp.round,(H-bev-bot)*.97); // never curve above the rim
  // profile rings: {kind,a,b,r,y,cx,shape}
  const R=[];
  R.push({k:'c0',a:0,b:0,r:0,y:0,cx:0,shape:sp.shape});
  R.push({k:'ob',a:a-bev,b:b-bev,r:Math.max(0,(sp.r||0)-bev),y:0,cx:0,shape:sp.shape});
  R.push({k:'ow',a,b,r:sp.r||0,y:bev,cx:0,shape:sp.shape});
  for(let i=1;i<=6;i++)R.push({k:'ow',a,b,r:sp.r||0,y:bev+(H-2*bev)*i/7,cx:0,shape:sp.shape});
  R.push({k:'ow',a,b,r:sp.r||0,y:H-bev,cx:0,shape:sp.shape});
  R.push({k:'ot',a:a-bev,b:b-bev,r:Math.max(0,(sp.r||0)-bev),y:H,cx:0,shape:sp.shape});
  R.push({k:'it',a:ia+bev,b:ib+bev,r:ir+bev,y:H,cx,shape:ishape});
  R.push({k:'iw',a:ia,b:ib,r:ir,y:H-bev,cx,shape:ishape});
  const wallBottom=bot+rc;
  for(let i=1;i<=3;i++)R.push({k:'iw',a:ia,b:ib,r:ir,y:H-bev-(H-bev-wallBottom)*i/3,cx,shape:ishape});
  for(let i=1;i<=8;i++){const ph=i/8*Math.PI/2,off=rc*(1-Math.cos(ph));R.push({k:'ib',a:Math.max(0,ia-off),b:Math.max(0,ib-off),r:Math.max(0,ir-off),y:bot+rc*(1-Math.sin(ph)),cx,shape:ishape});}
  R.push({k:'c1',a:0,b:0,r:0,y:bot,cx,shape:ishape});
  const seed=(sp.W*1000+sp.D*100)|0,pos=new Float32Array(R.length*N*3);
  R.forEach((ring,ri)=>{
    const C=contour(ring.shape,ring.a,ring.b,ring.r,N);
    for(let j=0;j<N;j++){
      let [x,z,nx,nz]=C[j],y=ring.y;
      const t=j/N;
      if(sp.surf==='organic'){
        // irregular outline (same for every ring, so the stone stays coherent) and a wavy rim
        const m=1+sp.org*(fbm1(t*6,6,seed)-.5)*2;x*=m;z*=m;
        if(ring.k==='ot'||ring.k==='it'||ring.k==='iw'&&ri===R.findIndex(q=>q.k==='iw'))y+=H*.25*sp.org/.06*(fbm1(t*4,4,seed+9)-.5)*.6;
      }
      if((sp.surf==='hewn'||sp.hew)&&(ring.k==='ow'||ring.k==='ot'||ring.k==='ob')){
        // hand-hewn: chiselled relief on the outside and the top edge
        const amp=sp.hew||.015,n=noise2(t*N*.18,y*45,seed+3)*.7+noise2(t*N*.5,y*120,seed+5)*.3,L=Math.hypot(nx,nz)||1;
        const d=amp*(n-.35)*(ring.k==='ow'?1:.7);x+=nx/L*d;z+=nz/L*d;
        if(ring.k==='ot')y-=amp*.6*noise2(t*N*.3,1,seed+11);
      }
      if(sp.flutes&&ring.k==='ow'&&nz>.9&&ring.y>bev&&ring.y<H-bev){
        // fluted front: vertical grooves
        const g=.5+.5*Math.cos(2*Math.PI*x/sp.flutes.period);z-=sp.flutes.amp*(1-g);
      }
      const p=(ri*N+j)*3;pos[p]=x+ring.cx;pos[p+1]=y;pos[p+2]=z;
    }
  });
  const idx=[];
  for(let ri=0;ri<R.length-1;ri++)for(let j=0;j<N;j++){
    const a0=ri*N+j,a1=ri*N+(j+1)%N,b0=(ri+1)*N+j,b1=(ri+1)*N+(j+1)%N;idx.push(a0,b0,a1,a1,b0,b1);
  }
  let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
  // make sure normals point out of the stone (check a vertex on the outer wall at +x)
  const owi=R.findIndex(q=>q.k==='ow')+2,nrm=g.attributes.normal;
  if(nrm.getX(owi*N)<0){for(let i=0;i<idx.length;i+=3){const t=idx[i+1];idx[i+1]=idx[i+2];idx[i+2]=t;}g.setIndex(idx);g.computeVertexNormals();}
  boxUV(g,sp);
  return g;
}
/* texture coordinates: project along the dominant normal axis, in metres / texture period */
function boxUV(g,sp){
  const p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2),s=1/T*1.6,o=(sp.W*7.3)%1;
  for(let i=0;i<p.count;i++){
    const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));let u,v;
    if(ay>=ax&&ay>=az){u=p.getX(i);v=p.getZ(i);}else if(ax>=az){u=p.getZ(i);v=p.getY(i);}else{u=p.getX(i);v=p.getY(i);}
    uv[i*2]=u*s+o;uv[i*2+1]=v*s+o*.7;
  }
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
}

/* ---------------- materials ---------------- */
const matCache=new Map();
function dataTex(arr,N,srgb){const t=new THREE.DataTexture(new Uint8Array(arr.buffer),N,N,THREE.RGBAFormat);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.needsUpdate=true;return t;}
function runGen(id,N){return new Promise((res,rej)=>{const g=generateStone(id,N);const step=()=>{try{const t0=performance.now();let r;do{r=g.next();}while(!r.done&&performance.now()-t0<8);if(r.done)res(r.value);else setTimeout(step,0);}catch(e){rej(e);}};step();});}
/* Colour from the product's own photograph: a patch of clean stone cut from Stenhuset's original product photo
 * (assets/products/<id>/tex.jpg). The generated texture still supplies the surface relief (normal map). */
const PHOTO_PATCH=.24; // metres of stone the photo patch covers (approx.)
function photoTexture(id,done){
  const t=new THREE.TextureLoader().load(new URL('./assets/products/'+id+'/tex.jpg',import.meta.url).href,()=>done(t),undefined,()=>done(null));
  t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;t.anisotropy=8;
  const k=T/1.6/PHOTO_PATCH;t.repeat.set(k,k);return t;
}
export function sinkMaterial(sp,onReady){
  const key=sp.stone+'|'+sp.surf+'|'+(sp.photo||'');
  if(matCache.has(key)){const m=matCache.get(key);if(m.userData.ready)onReady&&setTimeout(onReady,0);else if(onReady)m.userData.cbs.push(onReady);return m;}
  const st=STONES[sp.stone],base=new THREE.Color(`rgb(${st.c0.join(',')})`);
  const polished=sp.surf==='polished'||sp.surf==='organic';
  const m=new THREE.MeshPhysicalMaterial({color:base,roughness:polished?.18:sp.surf==='hewn'?.85:.45,metalness:0,clearcoat:polished?.5:.05,clearcoatRoughness:.15,envMapIntensity:.9});
  m.userData={ready:false,cbs:onReady?[onReady]:[]};matCache.set(key,m);
  const photo=sp.photo?new Promise(res=>photoTexture(sp.photo,res)):Promise.resolve(null);
  Promise.all([runGen(sp.stone,typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches?512:1024),photo]).then(([d,pt])=>{
    m.color.set('#ffffff');m.map=pt||dataTex(d.albedo,d.N,true);m.normalMap=dataTex(d.normal,d.N,false);
    const ns=(sp.surf==='hewn'?1.4:.6)*(pt?.6:1);m.normalScale.set(ns,ns);m.userData.photo=!!pt;
    m.needsUpdate=true;m.userData.ready=true;m.userData.cbs.splice(0).forEach(f=>f());
  }).catch(e=>console.warn('Stenvask: tekstur feilet',e));
  return m;
}
const chrome=()=>new THREE.MeshStandardMaterial({color:'#d9dcdf',metalness:1,roughness:.18});
const darkHole=()=>new THREE.MeshStandardMaterial({color:'#121212',roughness:.9});

/* ---------------- model ---------------- */
/* Returns a Group in metres, origin at the centre of the underside, front = +z. onReady is called when the stone texture is ready. */
export function buildSink(id,onReady){
  if(Number(id)===10827)return buildTravertin10827(onReady);
  const sp=SINKS[id];if(!sp)return null;
  const G=new THREE.Group(),mat=sinkMaterial({...sp,photo:id},onReady);
  const body=new THREE.Mesh(sinkGeometry(sp),mat);body.castShadow=body.receiveShadow=true;G.add(body);
  const bot=sp.H-sp.depth,cx=sp.offset||0;
  if(sp.drain==='ball'){const ball=new THREE.Mesh(new THREE.SphereGeometry(.03,32,16,0,Math.PI*2,0,Math.PI/2),mat);ball.position.set(cx,bot,0);G.add(ball);}
  else{
    const ring=new THREE.Mesh(new THREE.CylinderGeometry(.024,.024,.004,40),sp.drain==='stone'?mat:chrome());ring.position.set(cx,bot+.002,0);G.add(ring);
    const hole=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.0045,32),darkHole());hole.position.set(cx,bot+.0022,0);G.add(hole);
  }
  if(sp.divider){const t=.018,dv=new THREE.Mesh(new THREE.BoxGeometry(t,sp.depth-.02,sp.D-2*sp.wall),mat);dv.position.set(sp.W/2-sp.wall-sp.divider,bot+(sp.depth-.02)/2,0);dv.castShadow=true;G.add(dv);}
  if(sp.splash){
    const th=.025,sh=sp.splash.h,sg=new THREE.BoxGeometry(sp.W,sh,th);
    const s=new THREE.Mesh(sg,mat);s.position.set(0,sp.H+sh/2,-sp.D/2+th/2);s.castShadow=s.receiveShadow=true;G.add(s);
    const n=sp.splash.holes;
    for(let i=0;i<n;i++){
      const x=n===1?0:(i-(n-1)/2)*.13,hole=new THREE.Mesh(new THREE.CylinderGeometry(.013,.013,.004,24),darkHole());
      hole.rotation.x=Math.PI/2;hole.position.set(x,sp.H+sh*.62,-sp.D/2+th+.001);G.add(hole);
    }
  }
  G.userData={id,spec:sp};
  return G;
}

/* exported for offline geometry checks and for the other stone models (tables, countertops) */
export {sinkGeometry,boxUV};
