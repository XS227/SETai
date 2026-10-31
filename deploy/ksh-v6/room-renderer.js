import * as T from 'three';
import {OrbitControls} from './vendor/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from './vendor/examples/jsm/loaders/GLTFLoader.js';
import {RoundedBoxGeometry} from './vendor/examples/jsm/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from './vendor/examples/jsm/environments/RoomEnvironment.js';
const asset=new URL('./assets/',import.meta.url).href;
const C=window.KSHRoom;
export class RoomRenderer{
 constructor(host,onSelect,onStatus,options={}){
  this.host=host;this.onSelect=onSelect;this.status=onStatus;this.cache=new Map();this.mode='3d';this.frame=0;
  try{this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch{this.is3D=false;this.mode='plan';return;}
  this.is3D=true;const r=this.renderer;r.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.15;r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;host.append(r.domElement);
  this.scene=new T.Scene();this.scene.background=new T.Color('#e8e2d8');
  const pmrem=new T.PMREMGenerator(r),env=new RoomEnvironment();this.environment=pmrem.fromScene(env,.04);this.scene.environment=this.environment.texture;env.dispose();pmrem.dispose();
  this.eye=new T.PerspectiveCamera(42,1,.05,100);this.controls=new OrbitControls(this.eye,r.domElement);this.controls.target.set(0,.8,0);this.controls.maxPolarAngle=Math.PI/2-.04;this.controls.minDistance=2;this.controls.maxDistance=22;this.controls.addEventListener('change',()=>this.draw());
  this.scene.add(new T.HemisphereLight(0xeef2ff,0x796b59,1.05));
  this.sun=new T.DirectionalLight(0xfff1d9,3.3);this.sun.position.set(3,6,4);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.1,far:30});this.sun.shadow.bias=-.0002;this.sun.shadow.normalBias=.025;this.sun.shadow.radius=4;this.scene.add(this.sun);
  this.room=new T.Group();this.objects=new T.Group();this.scene.add(this.room,this.objects);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.reset();
  const ray=new T.Raycaster();let down;
  r.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);r.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const b=r.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),this.eye);const hits=ray.intersectObjects(this.objects.children,true);let o=hits[0]?.object;while(o&&!o.userData.itemId)o=o.parent;if(o)this.onSelect(o.userData.itemId);});
  r.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.is3D=false;this.mode='plan';this.setMode('plan');this.status('3D ble avbrutt. Mål og budsjett er bevart i plantegningen.');});
  if(!options.skipChair)new GLTFLoader().load(asset+'chair/modern_arm_chair_01.gltf',g=>{this.chair=g.scene;this.chair.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});this.objectKey='';if(this.state)this.update(this.state);this.status('3D · skannet lenestol lastet');},undefined,()=>this.status('Lenestolen kunne ikke lastes. En enkel målmodell vises.'));
 }
 texture(file,repeat=[1,1],color=false){const key=file+repeat+color;if(this.cache.has(key))return this.cache.get(key);const t=new T.TextureLoader().load(asset+file,()=>this.draw(),undefined,()=>this.status('En overflate kunne ikke lastes. Priser og mål fungerer fortsatt.'));t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());if(color)t.colorSpace=T.SRGBColorSpace;this.cache.set(key,t);return t;}
 plaster(color,w,h){return new T.MeshStandardMaterial({color,map:this.texture('painted_plaster_wall_diff_1k.jpg',[w/2,h/2],true),normalMap:this.texture('painted_plaster_wall_nor_gl_1k.jpg',[w/2,h/2]),normalScale:new T.Vector2(.2,.2),roughness:.94,envMapIntensity:.35});}
 box(group,w,h,d,x,y,z,mat,round=.025){const m=new T.Mesh(round?new RoundedBoxGeometry(w,h,d,2,Math.min(round,w/3,h/3,d/3)):new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;group.add(m);return m;}
 clear(group){group.traverse(o=>{if((o.isMesh||o.isLine)&&!o.userData.shared){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});group.clear();}
 buildRoom(s){this.clear(this.room);const w=s.width,l=s.length,h=s.height,m=C.materials[s.floor];let mat;
  if(s.floor==='oak'){const rep=[w/2,l/2];mat=new T.MeshStandardMaterial({map:this.texture(m.image,rep,true),normalMap:this.texture('wood_floor_nor_gl_1k.jpg',rep),roughnessMap:this.texture('wood_floor_arm_1k.jpg',rep),roughness:1,normalScale:new T.Vector2(.35,.35)});}
  else{mat=new T.MeshStandardMaterial({map:this.texture(m.image,[w/m.size[0],l/m.size[1]],true),roughness:.72,envMapIntensity:.65});const offset=s.pattern==='offset';const gx=.003/m.size[0],gy=.003/m.size[1];mat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`\n#ifdef USE_MAP\n vec2 tileUV=vMapUv; ${offset?'tileUV.x += mod(floor(tileUV.y),2.0)*0.5;':''}\n vec4 sampledDiffuseColor=texture2D(map,tileUV); vec2 edge=min(fract(tileUV),1.0-fract(tileUV)); float grout=1.0-smoothstep(0.0,0.012,min(edge.x/${gx.toFixed(6)},edge.y/${gy.toFixed(6)})-0.5); sampledDiffuseColor.rgb=mix(sampledDiffuseColor.rgb,vec3(0.32,0.29,0.25),grout); diffuseColor*=sampledDiffuseColor;\n#endif`);};mat.customProgramCacheKey=()=>s.floor+offset;}
  const floor=new T.Mesh(new T.PlaneGeometry(w,l),mat);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;this.room.add(floor);
  const wm=this.plaster(C.walls[s.wall].color,w,h);this.box(this.room,w,h,.14,0,h/2,-l/2-.07,wm,0);
  this.box(this.room,.14,h,l,-w/2-.07,h/2,0,this.plaster(C.walls[s.wall].color,l,h),0);
  const skirting=new T.MeshStandardMaterial({color:'#ded5c6',roughness:.7});this.box(this.room,w,.09,.02,0,.045,-l/2+.01,skirting);this.box(this.room,.02,.09,l,-w/2+.01,.045,0,skirting);
  // A tall framed opening on the rear wall gives depth without an unrelated backdrop photograph.
  const frame=new T.MeshStandardMaterial({color:'#67513a',roughness:.6});const glass=new T.MeshStandardMaterial({color:'#dce6e6',emissive:'#a6b8c0',emissiveIntensity:.16,roughness:.14,metalness:.1});
  this.box(this.room,w*.28,h*.65,.025,-w*.22,h*.55,-l/2+.025,glass,.01);
  for(const x of [-w*.36,-w*.08])this.box(this.room,.035,h*.67,.045,x,h*.55,-l/2+.045,frame,.005);
  for(const y of [h*.215,h*.885])this.box(this.room,w*.28,.035,.045,-w*.22,y,-l/2+.045,frame,.005);
 }
 buildObjects(s){this.clear(this.objects);
  for(const i of s.items){const g=new T.Group();g.userData.itemId=i.id;g.position.set(i.x,0,i.z);g.rotation.y=-i.rotation*Math.PI/180;const [w,h,d]=i.size;
   if(i.type==='chair'&&this.chair){const model=this.chair.clone(true);model.traverse(o=>{if(o.isMesh)o.userData.shared=true;});const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());model.position.set(-center.x,-box.min.y,-center.z);const wrap=new T.Group();wrap.add(model);wrap.scale.set(w/size.x,h/size.y,d/size.z);g.add(wrap);}
   else {const fabric=new T.MeshStandardMaterial({color:C.finishes[i.finish],roughness:.92});const wood=new T.MeshStandardMaterial({color:'#877052',roughness:.48,map:this.texture('wood_floor_diff_1k.jpg',[1,1],true)});const dark=new T.MeshStandardMaterial({color:'#3a3026',roughness:.5});
    if(['sofa','chair'].includes(i.type)){this.box(g,w*.92,h*.17,d*.88,0,h*.26,0,dark);const n=i.type==='sofa'?3:1;for(let j=0;j<n;j++){this.box(g,w*.8/n-.015,h*.19,d*.71,-w*.4+(j+.5)*w*.8/n,h*.47,d*.06,fabric,.07);const back=this.box(g,w*.8/n-.015,h*.49,d*.2,-w*.4+(j+.5)*w*.8/n,h*.72,-d*.34,fabric,.07);back.rotation.x=-.1;}for(const x of [-w*.45,w*.45])this.box(g,w*.12,h*.48,d*.88,x,h*.49,0,fabric,.06);for(const x of [-w*.4,w*.4])for(const z of [-d*.35,d*.35])this.box(g,.055,h*.2,.055,x,h*.1,z,wood);}
    else if(['table','dining'].includes(i.type)){this.box(g,w,.07,d,0,h-.035,0,wood,.035);for(const x of [-w*.39,w*.39])for(const z of [-d*.35,d*.35])this.box(g,.055,h-.07,.055,x,(h-.07)/2,z,wood);}
    else if(i.type==='bed'){this.box(g,w,h*.25,d,0,h*.24,0,wood);this.box(g,w*.98,h*.23,d*.94,0,h*.47,.02,fabric,.09);this.box(g,w,h*.9,.1,0,h*.5,-d*.46,fabric,.055);for(const x of [-w*.25,w*.25])this.box(g,w*.4,.15,d*.22,x,h*.65,-d*.28,fabric,.075);}
    else{this.box(g,w,h*.8,d,0,h*.6,0,wood);for(const x of [-w*.4,w*.4])this.box(g,.05,h*.2,d*.8,x,h*.1,0,dark);for(const x of [-w/6,w/6])this.box(g,.004,h*.71,.004,x,h*.6,d/2+.003,dark,.001);}
   }
   if(i.id===s.selected){const points=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2],[-w/2,0,-d/2]].map(a=>new T.Vector3(a[0],.012,a[2]));const outline=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:'#94734e'}));g.add(outline);}
   this.objects.add(g);
  }
 }
 update(s){this.state=s;if(this.is3D){const rk=JSON.stringify([s.width,s.length,s.height,s.wall,s.floor,s.pattern]);if(rk!==this.roomKey){this.buildRoom(s);this.roomKey=rk;}const ok=JSON.stringify([s.items.map(({price,...visual})=>visual),s.selected,!!this.chair]);if(ok!==this.objectKey){this.buildObjects(s);this.objectKey=ok;}this.sun.intensity=s.daylight==='day'?3.3:.7;this.sun.color.set(s.daylight==='day'?'#fff1d9':'#ffbd7a');this.renderer.toneMappingExposure=s.daylight==='day'?1.15:.85;this.draw();}if(this.mode!=='3d')this.renderAlternative();}
 draw(){if(!this.is3D||this.mode!=='3d'||this.frame)return;this.frame=requestAnimationFrame(()=>{this.frame=0;this.renderer.render(this.scene,this.eye);});}
 resize(){if(!this.is3D)return;const w=this.host.clientWidth,h=this.host.clientHeight;this.renderer.setSize(w,h,false);this.eye.aspect=w/h;this.eye.updateProjectionMatrix();this.draw();}
 reset(){if(!this.is3D)return;const scale=Math.max(this.state?.width||5,this.state?.length||4)/5;this.eye.position.set(4.8*scale,3.3*scale,6.4*scale);this.controls.target.set(0,.85,0);this.controls.update();}
 view(){if(!this.is3D)return;this.eye.position.set(.001,10,.001);this.controls.target.set(0,0,0);this.controls.update();}
 setMode(mode){this.mode=mode==='3d'&&!this.is3D?'plan':mode;if(this.renderer)this.renderer.domElement.hidden=this.mode!=='3d';this.host.querySelector('.r6-alternative')?.remove();if(this.mode==='3d'){this.resize();this.draw();}else this.renderAlternative();}
 renderAlternative(){if(!this.state)return;const s=this.state,m=C.materials[s.floor];this.host.querySelector('.r6-alternative')?.remove();const wrap=document.createElement('div');wrap.className='r6-alternative';
  if(this.mode==='photo'){const img=document.createElement('img');img.src=asset+(m.photo||m.image);img.alt=m.name+(m.photo?' – leverandørens miljøfoto':' – produktets overflate');wrap.append(img);const p=document.createElement('p');p.textContent='Produktfoto · '+m.name+' · viser ikke rommets mål eller møbelvalg';wrap.append(p);}
  else{const scale=70,w=s.width*scale,l=s.length*scale,pad=36;const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${w+pad*2} ${l+pad*2}`);svg.setAttribute('role','img');svg.setAttribute('aria-label','Målfast plantegning. Møbler kan velges i møbelpanelet.');svg.innerHTML=`<rect x="${pad}" y="${pad}" width="${w}" height="${l}" fill="#ded5c7" stroke="#4c443a" stroke-width="3"/><text x="${w/2+pad}" y="23" text-anchor="middle" fill="#4c443a" font-size="13">${s.width} × ${s.length} m</text>`;
   for(const i of s.items){const group=document.createElementNS(svg.namespaceURI,'g');group.setAttribute('transform',`translate(${pad+w/2+i.x*scale} ${pad+l/2+i.z*scale}) rotate(${i.rotation})`);group.innerHTML=`<rect x="${-i.size[0]*scale/2}" y="${-i.size[2]*scale/2}" width="${i.size[0]*scale}" height="${i.size[2]*scale}" rx="3" fill="${C.finishes[i.finish]}" stroke="${i.id===s.selected?'#7b492e':'#847969'}" stroke-width="${i.id===s.selected?3:1}"/>`;group.style.cursor='pointer';group.addEventListener('click',()=>this.onSelect(i.id));svg.append(group);}wrap.append(svg);
  }this.host.append(wrap);
 }
}
