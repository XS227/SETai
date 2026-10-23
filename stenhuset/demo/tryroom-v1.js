/* Stenhuset showroom: "Prøv i mitt rom".
 * Loaded on demand (dynamic import) when the customer opens the feature. Runs 100 % in the browser; no image leaves the device.
 *
 * Three honest modes (they are NOT the same technology):
 *  1. Kamera (alle mobiler): live video + graphics layer. The customer marks floor/wall corners by hand; the material is drawn
 *     with the correct perspective (homography) and, where the phone has a gyroscope, follows ROTATION of the phone.
 *     It does not track sideways movement. No AI, no automatic surface detection.
 *  2. Live AR (WebXR, supported Android Chrome only): points are placed on real surfaces with hit-test; see tryroom-xr-v1.js.
 *  3. Guidede bilder: a few still photos of the room, each edited with the same marking tools and the same material choice.
 *     The result is separate edited images, not a reconstructed 3D model.
 * Inventory (sink, sofa ...) is kept visible with a manual "keep visible" brush painted in the surface's own coordinates. */
import * as MA from './tryroom-math-v1.js';
import {STONES,generateStone,T} from './stone-textures-v1.js';

const MOBILE=typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches;
const NTEX=MOBILE?512:1024;
const GROUTS=[['Lys grå','#cfc9bd'],['Hvit','#f1eee8'],['Sand','#c2b49c'],['Antrasitt','#3b3d3c']];
const FORMATS=[['natural','Naturlig leggemønster',null],['30x30','30 × 30 cm',[.3,.3]],['30x60','30 × 60 cm',[.3,.6]],['60x60','60 × 60 cm',[.6,.6]],['10x10','10 × 10 cm',[.1,.1]]];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const hex3=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const S={
  mode:null,caps:null,floorId:'bastide-beige',wallId:'carrara-c',
  fmt:'natural',rot:0,bond:false,grout:GROUTS[0][1],scale:1,
  views:[],cur:0,sel:-1,mark:null,brush:null,brushR:34,tab:'surf',frozen:false,matType:'floor',dark:false,xr:null,
  gyro:{on:false,ref:null,now:null,fov:65},busy:0,msg:''
};
let root,cv,ov,gl,P={},tex={},stream,video,raf=0,lumCtx,lumData,lumT=0,lumAvgFrame=.5,drag=null,photoInput,catalogP=null,xrMod=null;

/* ---------------------------------------------------------------- css + dom */
function injectCss(){
  if(document.getElementById('tr-css'))return;
  const s=document.createElement('style');s.id='tr-css';
  s.textContent=`
.tr-root{position:fixed;inset:0;z-index:2147483200;background:#111;color:#fff;font-family:var(--sans,system-ui,sans-serif);display:flex;flex-direction:column;overscroll-behavior:contain;-webkit-user-select:none;user-select:none}
.tr-root *{box-sizing:border-box}
.tr-stage{position:relative;flex:1;min-height:0;overflow:hidden}
.tr-stage canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}
.tr-top{position:absolute;left:0;right:0;top:0;z-index:5;display:flex;gap:10px;align-items:flex-start;padding:max(10px,env(safe-area-inset-top)) 12px 10px;pointer-events:none;background:linear-gradient(180deg,#000a,transparent)}
.tr-top>*{pointer-events:auto}
.tr-x{flex:none;width:44px;height:44px;border:0;background:#f7f5eee8;color:#242725;font-size:22px;cursor:pointer}
.tr-hint{flex:1;background:#000b;padding:10px 12px;font-size:13px;line-height:1.45}
.tr-hint b{color:#f0cf9a}
.tr-warn{color:#ffd9a0}
.tr-dock{flex:none;background:#1b1c1a;max-height:46vh;overflow:auto;padding:0 0 max(10px,env(safe-area-inset-bottom));border-top:1px solid #ffffff22}
.tr-tabs{display:flex;position:sticky;top:0;background:#1b1c1a;z-index:2}
.tr-tabs button{flex:1;border:0;background:transparent;color:#fff9;padding:13px 6px;font:700 11px/1 var(--sans,system-ui);letter-spacing:.1em;text-transform:uppercase;cursor:pointer;border-bottom:2px solid transparent;min-height:44px}
.tr-tabs button.on{color:#fff;border-bottom-color:#e8d3ae}
.tr-pane{padding:14px 14px 6px}
.tr-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
.tr-btn{border:1px solid #ffffff55;background:transparent;color:#fff;padding:11px 14px;font:700 11px/1 var(--sans,system-ui);letter-spacing:.08em;text-transform:uppercase;cursor:pointer;min-height:44px}
.tr-btn.pri{background:#f0e9de;color:#242725;border-color:#f0e9de}
.tr-btn.on{background:#fff;color:#242725}
.tr-btn:disabled{opacity:.4}
.tr-btn:focus-visible,.tr-x:focus-visible,.tr-tabs button:focus-visible,.tr-card:focus-visible{outline:3px solid #e8a35f;outline-offset:2px}
.tr-lbl{font:700 10px/1 var(--sans,system-ui);letter-spacing:.14em;text-transform:uppercase;opacity:.7;margin:4px 0 8px;display:block}
.tr-strip{display:flex;gap:10px;overflow-x:auto;padding:4px 2px 12px;scrollbar-width:none}
.tr-strip::-webkit-scrollbar{display:none}
.tr-card{flex:none;width:76px;border:3px solid transparent;background:none;color:#fff;padding:0;cursor:pointer;text-align:center;font-size:10px}
.tr-card span.sw{display:block;width:100%;aspect-ratio:1;background:var(--slab)}
.tr-card em{display:block;font-style:normal;margin-top:5px;line-height:1.25;opacity:.85}
.tr-card.on{border-color:#fff}
.tr-sel{width:100%;min-height:44px;background:#2a2b29;color:#fff;border:1px solid #ffffff44;padding:8px;font:inherit}
.tr-num{width:88px;min-height:44px;background:#2a2b29;color:#fff;border:1px solid #ffffff44;padding:8px;font:inherit}
.tr-grout{display:flex;gap:8px}
.tr-grout button{width:44px;height:44px;border:3px solid transparent;padding:0;cursor:pointer}
.tr-grout button.on{border-color:#fff}
.tr-sheet{position:absolute;inset:0;z-index:8;background:#141513f2;overflow:auto;padding:max(70px,calc(env(safe-area-inset-top) + 60px)) 18px 28px}
.tr-sheet h2{font:400 clamp(28px,7vw,40px)/1.15 var(--serif,Georgia,serif);margin:0 0 10px}
.tr-sheet p{font-size:14px;line-height:1.65;color:#ddd8cf;max-width:560px}
.tr-opt{display:block;width:100%;max-width:560px;text-align:left;border:1px solid #ffffff44;background:#ffffff0d;color:#fff;padding:16px;margin:0 0 12px;cursor:pointer;font:inherit}
.tr-opt strong{display:block;font-size:15px;margin-bottom:5px}
.tr-opt span{font-size:12.5px;line-height:1.55;color:#cfc9bf;display:block}
.tr-opt small{display:inline-block;background:#e8d3ae;color:#242725;padding:3px 7px;margin-left:8px;font:700 9px/1 var(--sans,system-ui);letter-spacing:.1em;text-transform:uppercase;vertical-align:middle}
.tr-opt:disabled{opacity:.45;cursor:default}
.tr-thumbs{display:flex;gap:8px;overflow-x:auto;margin:14px 0}
.tr-thumbs img,.tr-thumbs canvas{height:84px;width:auto;border:2px solid transparent;flex:none}
.tr-thumbs .on{border-color:#fff}
.tr-busy{position:absolute;left:50%;top:84px;transform:translateX(-50%);z-index:6;background:#000c;padding:8px 14px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;display:none}
.tr-busy.on{display:block}
@media(min-width:900px){.tr-root{flex-direction:row}.tr-dock{width:380px;max-height:none;border-top:0;border-left:1px solid #ffffff22}}`;
  document.head.appendChild(s);
}
function buildRoot(){
  root=document.createElement('div');root.className='tr-root';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Prøv i mitt rom');
  root.innerHTML='<div class="tr-stage"><canvas class="tr-gl"></canvas><canvas class="tr-ov"></canvas>'+
    '<div class="tr-top"><button class="tr-x" data-act="close" aria-label="Avslutt og lukk kamera">✕</button><div class="tr-hint" aria-live="polite"></div></div>'+
    '<div class="tr-busy" role="status">Lager steinstruktur …</div><div class="tr-sheet"></div></div><div class="tr-dock" hidden></div>';
  document.body.appendChild(root);
  document.documentElement.style.overflow='hidden';
  cv=root.querySelector('.tr-gl');ov=root.querySelector('.tr-ov');
  root.addEventListener('click',onClick);
  root.addEventListener('change',onChange);root.addEventListener('input',onChange);
  window.addEventListener('keydown',onKey);window.addEventListener('resize',resize);
}
const sheet=()=>root.querySelector('.tr-sheet'),dock=()=>root.querySelector('.tr-dock'),hint=h=>{root.querySelector('.tr-hint').innerHTML=h;};
const onKey=e=>{if(e.key==='Escape')close();};

/* ---------------------------------------------------------------- capabilities + start */
async function detect(){
  const c={cam:!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia),secure:window.isSecureContext,xr:false,
    gyro:'DeviceOrientationEvent' in window,ios:/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)};
  try{c.xr=!!(navigator.xr&&await navigator.xr.isSessionSupported('immersive-ar'));}catch(e){}
  return c;
}
function showStart(){
  const c=S.caps;
  sheet().style.display='';dock().hidden=true;
  sheet().innerHTML=`<h2>Prøv i mitt rom</h2>
  <p>Se Stenhusets materialer på gulv og vegger i ditt eget rom. Alt skjer på din egen enhet. Bilder og video lastes ikke opp noe sted.</p>
  <button class="tr-opt" data-act="start-xr" ${c.xr?'':'disabled'}><strong>Live AR <small>Beta</small></strong><span>${c.xr?'Materialet festes til gulv og vegg i rommet mens du beveger deg. Støttet på denne enheten. Ikke testet på alle mobiler ennå.':'Ikke tilgjengelig her. Krever WebXR AR (Chrome på en ARCore-støttet Android-telefon). iPhone og iPad støtter ikke dette i nettleseren.'}</span></button>
  <button class="tr-opt" data-act="start-cam" ${c.cam&&c.secure?'':'disabled'}><strong>Kamera og markering</strong><span>Du ser rommet i kameraet og markerer gulv eller vegg ved å trykke på fire hjørner. Materialet vises i riktig perspektiv og følger med når du dreier mobilen, men ikke når du går sidelengs. Flaten gjenkjennes ikke automatisk.${c.cam&&c.secure?'':' Krever kamera og sikker (https) tilkobling.'}</span></button>
  <button class="tr-opt" data-act="start-photo"><strong>Ta bilder av rommet</strong><span>Vi veileder deg gjennom noen bilder av rommet. Du markerer flatene i hvert bilde, og samme materialvalg brukes i alle. Resultatet er ferdige bilder du kan lagre og sende, ikke en 3D-modell av rommet.</span></button>
  <p style="font-size:12px;color:#aaa49a">Tips: god belysning, hold mobilen stående, og ha gulv og vegger tydelig i bildet.</p>`;
  hint('Velg hvordan du vil prøve materialene.');
}

/* ---------------------------------------------------------------- GL */
const VS='attribute vec2 a;varying vec2 v_uv;void main(){v_uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}';
const PREC='#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
const FS_BG=PREC+`varying vec2 v_uv;uniform sampler2D u_bg;uniform vec2 u_cover;
void main(){vec2 t=(vec2(v_uv.x,1.-v_uv.y)-.5)*u_cover+.5;
 if(t.x<0.||t.x>1.||t.y<0.||t.y>1.){gl_FragColor=vec4(.07,.07,.07,1.);return;}
 gl_FragColor=vec4(texture2D(u_bg,t).rgb,1.);}`;
const FS_SF=PREC+`uniform mat3 u_Hinv;uniform vec2 u_res,u_size,u_cover,u_tile;uniform sampler2D u_tex,u_mask,u_lum;
uniform float u_scale,u_rot,u_grid,u_bond,u_avg,u_gain,u_gw,u_T;uniform vec3 u_gcol;
float hh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec2 toUv(vec2 px){vec3 q=u_Hinv*vec3(px,1.);return q.xy/q.z;}
void main(){
 vec2 px=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);
 vec2 uv=toUv(px);
 vec2 uvx=toUv(px+vec2(1.,0.));vec2 uvy=toUv(px+vec2(0.,1.));
 float mpp=max(length((uvx-uv)*u_size),length((uvy-uv)*u_size));
 float edge=min(min(uv.x,1.-uv.x)*u_size.x,min(uv.y,1.-uv.y)*u_size.y)/max(mpp,1e-5);
 if(edge<-.5)discard;
 float alpha=smoothstep(-.5,1.5,edge);
 float hide=texture2D(u_mask,uv).r;alpha*=1.-smoothstep(.3,.7,hide);
 if(alpha<=.003)discard;
 vec2 m=uv*u_size-.5*u_size;float c=cos(u_rot),s=sin(u_rot);m=vec2(c*m.x-s*m.y,s*m.x+c*m.y);
 vec2 p=m/u_scale;vec3 col;
 if(u_grid>.5){
  vec2 t=p/u_tile;float row=floor(t.y);t.x+=u_bond*.5*mod(row,2.);
  vec2 id=floor(t);vec2 f=fract(t);
  vec2 d2=min(f,1.-f)*u_tile;float d=min(d2.x,d2.y);
  vec2 off=vec2(hh(id),hh(id+7.3))*u_T;
  col=texture2D(u_tex,(p+off)/u_T).rgb*(.97+.06*hh(id+3.1));
  float aa=max(mpp*.75,.0004);
  col*=mix(.9,1.,smoothstep(u_gw*.5,u_gw*.5+.005,d));
  col=mix(u_gcol,col,smoothstep(u_gw*.5-aa,u_gw*.5+aa,d));
 }else{col=texture2D(u_tex,p/u_T).rgb;}
 vec2 vuv=(vec2(px.x/u_res.x,px.y/u_res.y)-.5)*u_cover+.5;
 float lum=texture2D(u_lum,vuv).r;
 float shade=clamp(lum/max(u_avg,.04),.55,1.45);
 col*=mix(1.,shade,.85)*u_gain;
 gl_FragColor=vec4(col,alpha);}`;
function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
function program(fs){const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,VS));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.bindAttribLocation(p,0,'a');gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={};const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const info=gl.getActiveUniform(p,i);u[info.name]=gl.getUniformLocation(p,info.name);}return {p,u};}
function mkTex(){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
function setupGL(){
  gl=cv.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  if(!gl)throw new Error('WebGL mangler');
  P.bg=program(FS_BG);P.sf=program(FS_SF);
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  tex.bg=mkTex();tex.lum=mkTex();
  gl.bindTexture(gl.TEXTURE_2D,tex.lum);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
  lumData=new Uint8Array(32*32).fill(128);gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,32,32,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,lumData);
  lumCtx=document.createElement('canvas');lumCtx.width=lumCtx.height=32;lumCtx=lumCtx.getContext('2d',{willReadFrequently:true});
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  resize();
  if(typeof ResizeObserver==='function')new ResizeObserver(resize).observe(cv.parentElement);
}
function resize(){
  if(!cv)return;const d=Math.min(window.devicePixelRatio||1,MOBILE?1.5:2),r=cv.getBoundingClientRect();
  cv.width=Math.max(2,Math.round(r.width*d));cv.height=Math.max(2,Math.round(r.height*d));ov.width=cv.width;ov.height=cv.height;
  if(gl)gl.viewport(0,0,cv.width,cv.height);
}

/* ---- materials: procedural stone textures (same generator as the 3D showroom). Flat variant = no joints, for own tile grid. */
const matCache=new Map();
function getMaterial(id,flat){
  const key=id+(flat?'~f':'');if(matCache.has(key))return matCache.get(key).tex||null;
  const rec={tex:null,loading:true};matCache.set(key,rec);
  let sid=id;
  if(flat&&STONES[id].kind!=='plaster'){sid=id+'~flat';if(!STONES[sid])STONES[sid]={...STONES[id],jw:0,bevel:0,jitter:0};}
  S.busy++;busyUi();
  const g=generateStone(sid,NTEX);
  const step=()=>{
    try{
      const t0=performance.now();let r;do{r=g.next();}while(!r.done&&performance.now()-t0<10);
      if(!r.done){setTimeout(step,0);return;}
      const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,NTEX,NTEX,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(r.value.albedo.buffer));
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      const an=gl.getExtension('EXT_texture_filter_anisotropic');if(an)gl.texParameterf(gl.TEXTURE_2D,an.TEXTURE_MAX_ANISOTROPY_EXT,4);
      rec.tex=t;rec.loading=false;S.busy--;busyUi();
    }catch(e){console.warn('Stenhuset: tekstur feilet',e);rec.loading=false;S.busy--;busyUi();}
  };
  step();return null;
}
const busyUi=()=>{const b=root&&root.querySelector('.tr-busy');if(b)b.classList.toggle('on',S.busy>0);};

/* ---------------------------------------------------------------- views + coordinates */
const curView=()=>S.views[S.cur];
function source(){const v=curView();if(!v)return null;if(v.kind==='video')return video&&video.videoWidth?{w:video.videoWidth,h:video.videoHeight,el:video}:null;return {w:v.canvas.width,h:v.canvas.height,el:v.canvas};}
function cover(){
  const s=source();if(!s)return [1,1];
  const cw=cv.width,ch=cv.height,view=curView(),sc=view.kind==='video'?Math.max(cw/s.w,ch/s.h):Math.min(cw/s.w,ch/s.h);
  return [cw/(s.w*sc),ch/(s.h*sc)];
}
const toCanvas=(n,c)=>[((n[0]-.5)/c[0]+.5)*cv.width,((n[1]-.5)/c[1]+.5)*cv.height];
const toNorm=(px,c)=>[((px[0]/cv.width)-.5)*c[0]+.5,((px[1]/cv.height)-.5)*c[1]+.5];

/* ---------------------------------------------------------------- surfaces */
function newSurface(type,pts){
  const m=document.createElement('canvas');m.width=m.height=256;const g=m.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,256,256);
  const s={type,pts,w:type==='floor'?3:3,h:type==='floor'?3:2.4,mask:m,maskTex:null,maskDirty:true,rays:null};
  anchorRays(s);return s;
}
/* gyro: remember where each point points in the world, so the surface can follow rotation */
function pxToVideo(n){const s=source();return [n[0]*s.w,n[1]*s.h];}
function camParams(){const s=source();return {cx:s.w/2,cy:s.h/2,f:MA.focalPx(Math.max(s.w,s.h),S.gyro.fov)};}
function anchorPoint(s,i){
  if(!S.gyro.on||!S.gyro.now||curView().kind!=='video')return;
  const {cx,cy,f}=camParams(),v=pxToVideo(s.pts[i]);
  s.rays=s.rays||[];s.rays[i]=MA.pixelToWorldRay(v[0],v[1],S.gyro.now,cx,cy,f);
}
function anchorRays(s){if(S.gyro.on&&S.gyro.now&&curView()&&curView().kind==='video')for(let i=0;i<4;i++)anchorPoint(s,i);}
function followGyro(){
  const v=curView();if(!v||v.kind!=='video'||!S.gyro.on||!S.gyro.now||S.frozen)return;
  const s0=source();if(!s0)return;const {cx,cy,f}=camParams();
  for(const s of v.surfaces){
    if(!s.rays||s.rays.length<4)continue;
    const out=s.rays.map(r=>MA.worldRayToPixel(r,S.gyro.now,cx,cy,f));
    s.hidden=out.some(p=>!p);
    if(!s.hidden)s.pts=out.map(p=>[p[0]/s0.w,p[1]/s0.h]);
  }
}
function surfaceH(s,c){
  const q=s.pts.map(p=>toCanvas(p,c)),H=MA.squareToQuad(q);if(!H)return null;
  const Hi=MA.invert3(H);if(!Hi)return null;return {H,Hi};
}
function avgLum(s){
  let sum=0,n=0;const q=s.pts,H=MA.squareToQuad(q);if(!H)return lumAvgFrame;
  for(let a=1;a<7;a++)for(let b=1;b<7;b++){
    const p=MA.project(H,a/7,b/7),x=clamp(Math.floor(p[0]*32),0,31),y=clamp(Math.floor(p[1]*32),0,31);sum+=lumData[y*32+x];n++;
  }
  return n?sum/n/255:lumAvgFrame;
}

/* ---------------------------------------------------------------- frame */
function updateLum(now,force){
  if(!force&&now-lumT<250)return;lumT=now;
  const s=source();if(!s)return;
  try{lumCtx.drawImage(s.el,0,0,32,32);const d=lumCtx.getImageData(0,0,32,32).data;let t=0;
    for(let i=0;i<1024;i++){const l=(.2126*d[i*4]+.7152*d[i*4+1]+.0722*d[i*4+2]);lumData[i]=l;t+=l;}
    lumAvgFrame=t/1024/255;
    gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,tex.lum);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,32,32,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,lumData);
  }catch(e){}
}
let bgKey=null;
function drawBackground(view){
  const s=source();if(!s){gl.clearColor(.07,.07,.07,1);gl.clear(gl.COLOR_BUFFER_BIT);return false;}
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex.bg);
  if(view.kind==='video'){if(!S.frozen||bgKey!=='frozen'){if(video.readyState>=2)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,video);bgKey=S.frozen?'frozen':'live';}}
  else if(bgKey!==view){gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,view.canvas);bgKey=view;}
  gl.useProgram(P.bg.p);gl.uniform1i(P.bg.u.u_bg,0);const c=cover();gl.uniform2f(P.bg.u.u_cover,c[0],c[1]);
  gl.disable(gl.BLEND);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.enable(gl.BLEND);return true;
}
function drawSurface(s,c){
  if(s.hidden)return;const m=surfaceH(s,c);if(!m)return;s._Hinv=m.Hi;s._H=m.H;
  const id=s.type==='floor'?S.floorId:S.wallId,plaster=STONES[id].kind==='plaster',grid=S.fmt!=='natural'&&!plaster,fmt=FORMATS.find(f=>f[0]===S.fmt);
  const t=getMaterial(id,grid);if(!t)return;
  const u=P.sf.u;gl.useProgram(P.sf.p);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,t);
  if(!s.maskTex){s.maskTex=mkTex();s.maskDirty=true;}
  gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,s.maskTex);
  if(s.maskDirty){gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,s.mask);s.maskDirty=false;}
  gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,tex.lum);
  gl.uniform1i(u.u_tex,1);gl.uniform1i(u.u_mask,2);gl.uniform1i(u.u_lum,3);
  gl.uniformMatrix3fv(u.u_Hinv,false,new Float32Array(MA.transpose3(m.Hi)));
  gl.uniform2f(u.u_res,cv.width,cv.height);gl.uniform2f(u.u_size,s.w,s.h);gl.uniform2f(u.u_cover,c[0],c[1]);
  const tile=grid&&fmt[2]?fmt[2]:[.3,.3];gl.uniform2f(u.u_tile,tile[0],tile[1]);
  gl.uniform1f(u.u_scale,S.scale);gl.uniform1f(u.u_rot,S.rot*Math.PI/180);gl.uniform1f(u.u_grid,grid?1:0);gl.uniform1f(u.u_bond,S.bond?1:0);
  const avg=avgLum(s);s._avg=avg;gl.uniform1f(u.u_avg,avg);gl.uniform1f(u.u_gain,clamp(.5+avg*1.1,.55,1));
  gl.uniform1f(u.u_gw,STONES[id].kind==='zellige'?.002:.003);gl.uniform1f(u.u_T,T);gl.uniform3fv(u.u_gcol,hex3(S.grout));
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}
function frame(now){
  raf=requestAnimationFrame(frame);
  const view=curView();if(!view||!gl)return;
  followGyro();
  const c=cover();
  const src=source();if(src){if(view.kind==='video'&&!S.frozen)updateLum(now,false);else if(view.kind==='img'&&bgKey!==view)updateLum(0,true);}
  if(!drawBackground(view))return;
  view.surfaces.forEach(s=>drawSurface(s,c));
  drawOverlay(c);
  lowLightHint();
}
function lowLightHint(){
  const v=curView();if(!v||S.mark||S.msg)return;
  const dark=v.kind==='video'&&!S.frozen&&lumAvgFrame<.13;
  if(dark&&!S.dark)hint('<span class="tr-warn">Det er veldig mørkt.</span> Skru på lyset i rommet, ellers blir materialet vanskelig å vurdere.');
  S.dark=dark;
}

/* ---- overlay: outlines, handles, marking points, brush cursor */
function drawOverlay(c){
  const g=ov.getContext('2d'),W=ov.width,H=ov.height,d=W/ov.getBoundingClientRect().width||1;g.clearRect(0,0,W,H);
  const v=curView();
  v.surfaces.forEach((s,i)=>{
    if(s.hidden)return;const q=s.pts.map(p=>toCanvas(p,c)),on=i===S.sel;
    g.lineWidth=(on?2.5:1.5)*d;g.strokeStyle=on?'#ffffff':'#ffffff99';g.setLineDash(on?[]:[8*d,6*d]);
    g.beginPath();q.forEach((p,k)=>k?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.stroke();g.setLineDash([]);
    if(on&&!S.brush)q.forEach(p=>{g.fillStyle='#fff';g.strokeStyle='#242725';g.lineWidth=2*d;g.beginPath();g.arc(p[0],p[1],11*d,0,7);g.fill();g.stroke();});
  });
  if(S.mark){
    g.fillStyle='#e8d3ae';g.strokeStyle='#242725';g.lineWidth=2*d;
    const q=S.mark.pts.map(p=>toCanvas(p,c));
    g.strokeStyle='#e8d3ae';g.beginPath();q.forEach((p,k)=>k?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();
    q.forEach((p,k)=>{g.fillStyle='#e8d3ae';g.beginPath();g.arc(p[0],p[1],12*d,0,7);g.fill();g.fillStyle='#242725';g.font=(13*d)+'px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(String(k+1),p[0],p[1]);});
  }
  if(S.brush&&drag&&drag.kind==='brush'){g.strokeStyle=S.brush==='hide'?'#e8d3ae':'#9fd0ff';g.lineWidth=2*d;g.beginPath();g.arc(drag.x*d,drag.y*d,S.brushR*d,0,7);g.stroke();}
}

/* ---------------------------------------------------------------- pointer: marking, dragging corners, brush */
function evPt(e){const r=ov.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];}
function bind(){
  if(ov._bound)return;ov._bound=true;
  ov.addEventListener('pointerdown',e=>{
    if(!curView()||!source())return;
    const p=evPt(e),d=cv.width/ov.getBoundingClientRect().width,c=cover(),px=[p[0]*d,p[1]*d];
    ov.setPointerCapture(e.pointerId);
    if(S.mark){
      const n=toNorm(px,c);S.mark.pts.push(n);
      if(S.mark.pts.length===4)finishMark();else markHint();
      return;
    }
    if(S.brush&&S.sel>=0){drag={kind:'brush',x:p[0],y:p[1],erase:S.brush==='show'};paint(px,p);return;}
    // pick a corner of the selected surface
    const s=curView().surfaces[S.sel];
    if(s&&!s.hidden){
      let best=-1,bd=44*d;s.pts.forEach((q,i)=>{const cp=toCanvas(q,c),dist=Math.hypot(cp[0]-px[0],cp[1]-px[1]);if(dist<bd){bd=dist;best=i;}});
      if(best>=0){drag={kind:'corner',i:best};return;}
    }
    // else select the surface under the finger
    const hit=curView().surfaces.findIndex(s=>!s.hidden&&inside(s,px,c));
    if(hit>=0){S.sel=hit;renderDock();}
  });
  ov.addEventListener('pointermove',e=>{
    if(!drag)return;const p=evPt(e),d=cv.width/ov.getBoundingClientRect().width,c=cover(),px=[p[0]*d,p[1]*d];
    if(drag.kind==='corner'){const s=curView().surfaces[S.sel];s.pts[drag.i]=toNorm(px,c);anchorPoint(s,drag.i);}
    else if(drag.kind==='brush'){drag.x=p[0];drag.y=p[1];paint(px,p);}
  });
  const end=()=>{drag=null;};
  ov.addEventListener('pointerup',end);ov.addEventListener('pointercancel',end);
}
function inside(s,px,c){
  const q=s.pts.map(p=>toCanvas(p,c));let hit=false;
  for(let i=0,j=3;i<4;j=i++){if((q[i][1]>px[1])!==(q[j][1]>px[1])&&px[0]<(q[j][0]-q[i][0])*(px[1]-q[i][1])/(q[j][1]-q[i][1])+q[i][0])hit=!hit;}
  return hit;
}
function paint(px,cssPt){
  const s=curView().surfaces[S.sel];if(!s||!s._Hinv)return;
  const d=cv.width/ov.getBoundingClientRect().width,r=S.brushR*d;
  const uvAt=(x,y)=>{const q=MA.apply3(s._Hinv,[x,y,1]);return [q[0]/q[2],q[1]/q[2]];};
  const a=uvAt(px[0],px[1]),bx=uvAt(px[0]+r,px[1]),by=uvAt(px[0],px[1]+r);
  const ru=Math.hypot(bx[0]-a[0],by[0]-a[0]),rv=Math.hypot(bx[1]-a[1],by[1]-a[1]);
  if(a[0]<-.2||a[0]>1.2||a[1]<-.2||a[1]>1.2||!isFinite(ru+rv))return;
  const g=s.mask.getContext('2d');g.fillStyle=drag.erase?'#000':'#fff';g.beginPath();g.ellipse(a[0]*256,a[1]*256,Math.max(1,ru*256),Math.max(1,rv*256),0,0,7);g.fill();s.maskDirty=true;
}
function startMark(type){
  if(!curView())return;S.mark={type,pts:[]};S.brush=null;S.msg='mark';markHint();renderDock();
}
function markHint(){
  const t=S.mark.type==='floor'?'gulvet':'veggen',n=S.mark.pts.length;
  hint('<b>Marker '+t+'</b>: trykk på hjørne '+Math.min(4,n+1)+' av 4. Velg fire punkter som er hjørner i en rektangulær flate, for eksempel der gulvet møter veggene.');
}
function finishMark(){
  const type=S.mark.type;let pts=S.mark.pts;
  const px=pts.map(p=>[p[0]*1000,p[1]*1000]);let o=MA.orderQuad(px);
  if(!MA.isConvexQuad(o)){S.mark.pts=[];S.msg='';hint('<span class="tr-warn">Punktene danner ikke en gyldig flate.</span> Prøv igjen, og trykk på fire hjørner rundt flaten.');return;}
  pts=o.map(p=>[p[0]/1000,p[1]/1000]);
  const s=newSurface(type,pts);curView().surfaces.push(s);S.sel=curView().surfaces.length-1;S.matType=type;S.mark=null;S.msg='';
  S.tab='surf';hint('Flate lagt til. <b>Dra i hjørnene</b> for å justere. Oppgi gjerne reelle mål under «Flater» så skalaen blir riktig.');renderDock();
}

/* ---------------------------------------------------------------- dock UI */
const MATS=()=>(typeof window.getStudioMaterials==='function'?window.getStudioMaterials():[]);
function renderDock(){
  const d=dock();d.hidden=false;sheet().style.display='none';
  const v=curView(),s=v&&v.surfaces[S.sel],tabs=[['surf','Flater'],['mat','Materiale'],['lay','Legging']];
  let h='<div class="tr-tabs" role="tablist">'+tabs.map(t=>`<button role="tab" aria-selected="${S.tab===t[0]}" class="${S.tab===t[0]?'on':''}" data-tab="${t[0]}">${t[1]}</button>`).join('')+'</div><div class="tr-pane">';
  if(S.tab==='surf'){
    h+='<div class="tr-row"><button class="tr-btn pri" data-act="mark-floor">+ Marker gulv</button><button class="tr-btn pri" data-act="mark-wall">+ Marker vegg</button>'+(S.mark?'<button class="tr-btn" data-act="mark-cancel">Avbryt</button>':'')+'</div>';
    if(v&&v.surfaces.length){
      h+='<span class="tr-lbl">Dine flater</span><div class="tr-row">'+v.surfaces.map((x,i)=>`<button class="tr-btn ${i===S.sel?'on':''}" data-sel="${i}">${x.type==='floor'?'Gulv':'Vegg'} ${i+1}</button>`).join('')+'</div>';
    }else h+='<p style="font-size:12.5px;line-height:1.6;color:#cfc9bf;margin:0 0 12px">Ingen flater ennå. Det finnes ingen automatisk flategjenkjenning i denne versjonen. Du markerer flaten selv ved å trykke på fire hjørner.</p>';
    if(s){
      h+=`<span class="tr-lbl">Mål på valgt flate (for riktig skala)</span><div class="tr-row"><label>Bredde m <input class="tr-num" type="number" inputmode="decimal" min=".3" max="30" step=".1" data-dim="w" value="${s.w}"></label><label>${s.type==='floor'?'Dybde':'Høyde'} m <input class="tr-num" type="number" inputmode="decimal" min=".3" max="30" step=".1" data-dim="h" value="${s.h}"></label></div>
      <p style="font-size:11.5px;line-height:1.55;color:#aaa49a;margin:-4px 0 12px">Skalaen er et anslag til du oppgir målene selv. Mål fra kameraet er ikke nøyaktige, så bruk ikke dette som bestillingsmengde.</p>
      <span class="tr-lbl">Behold møbler og inventar synlig</span><div class="tr-row"><button class="tr-btn ${S.brush==='hide'?'on':''}" data-act="brush-hide">Børste: behold synlig</button><button class="tr-btn ${S.brush==='show'?'on':''}" data-act="brush-show">Viskelær</button><button class="tr-btn" data-act="brush-clear">Nullstill</button></div>
      <label class="tr-lbl" style="margin-top:0">Børstestørrelse</label><input type="range" min="14" max="80" value="${S.brushR}" data-brush-size style="width:100%;margin-bottom:12px">
      <p style="font-size:11.5px;line-height:1.55;color:#aaa49a;margin:0 0 12px">Mal over vask, toalett, møbler eller dusjglass som skal vises foran materialet. Dette gjøres for hånd, ikke automatisk.</p>
      <div class="tr-row"><button class="tr-btn" data-act="del-surface">Slett flate</button></div>`;
    }
    h+='<div class="tr-row">'+(v&&v.kind==='video'?`<button class="tr-btn ${S.frozen?'on':''}" data-act="freeze">${S.frozen?'Fortsett kamera':'Frys bilde'}</button>`:'')+'<button class="tr-btn" data-act="save-image">Last ned bilde</button><button class="tr-btn pri" data-act="quote">Be om tilbud</button></div>';
    if(S.views.length>1)h+='<span class="tr-lbl">Bilder</span><div class="tr-thumbs">'+S.views.map((x,i)=>`<button data-view="${i}" style="border:0;padding:0;background:none"><canvas class="${i===S.cur?'on':''}" data-thumb="${i}" width="120" height="84"></canvas></button>`).join('')+'</div>';
  }else if(S.tab==='mat'){
    const type=S.matType,cur=type==='floor'?S.floorId:S.wallId;
    h+=`<div class="tr-row"><button class="tr-btn ${type==='floor'?'on':''}" data-matfor="floor">Gulv</button><button class="tr-btn ${type==='wall'?'on':''}" data-matfor="wall">Vegg</button></div><span class="tr-lbl">Stenhusets materialer · ${type==='floor'?'gulv':'vegg'}</span><div class="tr-strip">`+
      MATS().filter(m=>type==='wall'||!m.plaster).map(m=>`<button class="tr-card ${m.id===cur?'on':''}" data-mat="${m.id}" data-for="${type}" aria-label="${esc(m.name)}"><span class="sw" style="--slab:${m.pattern}"></span><em>${esc(m.name)}</em></button>`).join('')+'</div>'+
      '<p style="font-size:11.5px;line-height:1.55;color:#aaa49a;margin:0 0 8px">Overflatene er Stenhusets materialer gjengitt som digitale teksturer. Årer og farge varierer i virkeligheten fra plate til plate. Be om fysisk prøve.</p>';
  }else{
    const plaster=STONES[S.floorId].kind==='plaster';
    h+=`<span class="tr-lbl">Flisformat</span><select class="tr-sel" data-fmt>${FORMATS.map(f=>`<option value="${f[0]}" ${S.fmt===f[0]?'selected':''}>${f[1]}</option>`).join('')}</select>
    <span class="tr-lbl" style="margin-top:14px">Leggeretning</span><div class="tr-row">${[0,45,90].map(a=>`<button class="tr-btn ${S.rot===a?'on':''}" data-rot="${a}">${a}°</button>`).join('')}<label style="display:flex;gap:8px;align-items:center;font-size:12px"><input type="checkbox" data-bond ${S.bond?'checked':''}> Forband</label></div>
    <span class="tr-lbl">Fugefarge</span><div class="tr-grout">${GROUTS.map(g=>`<button class="${S.grout===g[1]?'on':''}" data-grout="${g[1]}" style="background:${g[1]}" aria-label="Fuge ${g[0]}" title="${g[0]}"></button>`).join('')}</div>
    <span class="tr-lbl" style="margin-top:14px">Størrelse på mønsteret</span><input type="range" min="50" max="200" value="${Math.round(S.scale*100)}" data-scale style="width:100%">
    <p style="font-size:11.5px;line-height:1.55;color:#aaa49a">Fliseformat og fuge gjelder egne fliser. «Naturlig leggemønster» bruker materialets eget mønster.</p>`;
  }
  h+='</div>';d.innerHTML=h;
  d.querySelectorAll('[data-thumb]').forEach(c=>{const x=S.views[+c.dataset.thumb];if(x&&x.canvas){const g=c.getContext('2d');g.drawImage(x.canvas,0,0,120,84);}});
}
function onClick(e){
  const t=e.target.closest('button');if(!t)return;
  if(t.dataset.tab){S.tab=t.dataset.tab;renderDock();return;}
  if(t.dataset.sel!==undefined){S.sel=+t.dataset.sel;const x=curView().surfaces[S.sel];if(x)S.matType=x.type;renderDock();return;}
  if(t.dataset.view!==undefined){switchView(+t.dataset.view);return;}
  if(t.dataset.matfor){S.matType=t.dataset.matfor;S.tab='mat';renderDock();return;}
  if(t.dataset.mat){if(t.dataset.for==='floor')S.floorId=t.dataset.mat;else S.wallId=t.dataset.mat;STONES[t.dataset.mat]&&getMaterial(t.dataset.mat,S.fmt!=='natural');renderDock();return;}
  if(t.dataset.rot){S.rot=+t.dataset.rot;renderDock();return;}
  if(t.dataset.grout){S.grout=t.dataset.grout;renderDock();return;}
  const a=t.dataset.act;if(!a)return;
  ({close,
    'start-cam':startCamera,'start-photo':startPhotos,'start-xr':startXR,
    'mark-floor':()=>startMark('floor'),'mark-wall':()=>startMark('wall'),
    'mark-cancel':()=>{S.mark=null;S.msg='';hint('Markering avbrutt.');renderDock();},
    'brush-hide':()=>{S.brush=S.brush==='hide'?null:'hide';brushHint();renderDock();},
    'brush-show':()=>{S.brush=S.brush==='show'?null:'show';brushHint();renderDock();},
    'brush-clear':()=>{const s=curView().surfaces[S.sel];if(s){s.mask.getContext('2d').fillRect(0,0,256,256);s.maskDirty=true;}},
    'del-surface':()=>{const v=curView();v.surfaces.splice(S.sel,1);S.sel=v.surfaces.length-1;S.brush=null;renderDock();},
    freeze:()=>{S.frozen=!S.frozen;bgKey=null;if(!S.frozen)curView().surfaces.forEach(anchorRays);renderDock();},
    'save-image':saveImage,quote,'photos-done':photosDone,'photo-take':()=>photoInput.click(),'photo-redo':redoPhoto,'photo-retry-cam':startCamera,'photo-fallback':startPhotos
  })[a]?.();
}
function onChange(e){
  const t=e.target;
  if(t.dataset.fmt!==undefined){S.fmt=t.value;STONES[S.floorId]&&getMaterial(S.floorId,S.fmt!=='natural');STONES[S.wallId]&&getMaterial(S.wallId,S.fmt!=='natural');return;}
  if(t.dataset.bond!==undefined){S.bond=t.checked;return;}
  if(t.dataset.scale!==undefined){S.scale=clamp(+t.value/100,.5,2);return;}
  if(t.dataset.brushSize!==undefined){S.brushR=+t.value;return;}
  if(t.dataset.dim){const s=curView().surfaces[S.sel];if(s){const v=clamp(parseFloat(String(t.value).replace(',','.'))||s[t.dataset.dim],.3,30);s[t.dataset.dim]=v;}}
}
function brushHint(){hint(S.brush?'<b>Børste</b>: mal over det som skal vises foran materialet. Bruk viskelær for å angre.':'Dra i hjørnene for å justere flaten.');}
function switchView(i){S.cur=i;S.sel=curView().surfaces.length?0:-1;bgKey=null;S.mark=null;S.brush=null;renderDock();hint('Bilde '+(i+1)+' av '+S.views.length+'. Samme materialvalg gjelder alle bilder.');}

/* ---------------------------------------------------------------- mode: camera */
async function startCamera(){
  S.mode='camera';
  try{
    if(!gl)setupGL();bind();
    // iOS requires a user gesture for motion permission
    if(S.caps.gyro&&typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){
      try{S.gyro.perm=await DeviceOrientationEvent.requestPermission();}catch(e){S.gyro.perm='denied';}
    }
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
    video=document.createElement('video');video.playsInline=true;video.muted=true;video.srcObject=stream;
    await video.play();
    S.views=[{kind:'video',surfaces:[]}];S.cur=0;S.sel=-1;bgKey=null;
    startGyro();
    sheet().style.display='none';renderDock();
    hint('<b>Kamera er på.</b> Hold mobilen stående og vis gulv og vegger rolig. Trykk <b>+ Marker gulv</b> og trykk så på fire hjørner.'+(S.gyro.on?'':' <span class="tr-warn">Bevegelsessensor mangler eller er avslått: bildet følger ikke når du dreier mobilen. Bruk «Frys bilde» for å justere.</span>'));
    if(!raf)raf=requestAnimationFrame(frame);
  }catch(err){
    stopStream();
    const denied=err&&(err.name==='NotAllowedError'||err.name==='SecurityError');
    sheet().style.display='';dock().hidden=true;
    sheet().innerHTML=`<h2>${denied?'Kameraet er ikke tillatt':'Fikk ikke tak i kameraet'}</h2><p>${denied?'Du har avslått kameratilgang. Slå den på i nettleserens innstillinger for siden og prøv igjen, eller ta bilder av rommet i stedet.':'Kameraet er ikke tilgjengelig akkurat nå (det kan være i bruk i en annen app). Prøv igjen, eller ta bilder av rommet i stedet.'}</p>
    <button class="tr-opt" data-act="photo-retry-cam"><strong>Prøv kameraet igjen</strong></button><button class="tr-opt" data-act="photo-fallback"><strong>Ta bilder av rommet</strong><span>Fungerer uten live kamera.</span></button>`;
    hint('Kamera ikke i bruk.');
  }
}
function stopStream(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}if(video){video.srcObject=null;}}
/* gyro: relative rotation only. Needs portrait orientation. */
let orientHandler=null;
function startGyro(){
  S.gyro.on=false;S.gyro.now=null;
  if(!S.caps.gyro||S.gyro.perm==='denied')return;
  orientHandler=e=>{
    if(e.alpha==null||e.beta==null||e.gamma==null)return;
    S.gyro.now=MA.orientationMatrix(e.alpha,e.beta,e.gamma);S.gyro.on=true;
  };
  window.addEventListener('deviceorientation',orientHandler);
}
function stopGyro(){if(orientHandler)window.removeEventListener('deviceorientation',orientHandler);orientHandler=null;S.gyro.on=false;S.gyro.now=null;}

/* ---------------------------------------------------------------- mode: guided photos */
const PHOTO_STEPS=['Oversiktsbilde fra døren','Bilde mot motsatt vegg eller vindu','Bilde mot venstre vegg','Bilde mot høyre vegg'];
const BLUR_MIN=40;
function startPhotos(){
  S.mode='photo';
  try{if(!gl)setupGL();bind();}catch(e){sheet().innerHTML='<h2>Enheten støtter ikke dette</h2><p>WebGL mangler, så materialene kan ikke vises i nettleseren her.</p>';return;}
  stopStream();stopGyro();
  S.views=[];S.cur=0;S.sel=-1;
  if(!photoInput){photoInput=document.createElement('input');photoInput.type='file';photoInput.accept='image/*';photoInput.setAttribute('capture','environment');photoInput.style.display='none';root.appendChild(photoInput);photoInput.addEventListener('change',onPhoto);}
  photoGuide();
  if(!raf)raf=requestAnimationFrame(frame);
}
function photoGuide(extra){
  dock().hidden=true;sheet().style.display='';
  const n=S.views.length,step=PHOTO_STEPS[n]||'Ekstra bilde av områder som mangler';
  sheet().innerHTML=`<h2>Ta bilder av rommet</h2>
  <p>Bildene lagres bare på enheten din og lastes ikke opp. Ta bildene stående og la hvert bilde overlappe litt med det forrige. Gulv og vegger skal være tydelig synlige.</p>
  <p><strong style="color:#f0cf9a">Bilde ${n+1}: ${step}</strong></p>${extra||''}
  <div class="tr-thumbs">${S.views.map((v,i)=>`<canvas data-pthumb="${i}" width="120" height="84"></canvas>`).join('')}</div>
  <div class="tr-row"><button class="tr-btn pri" data-act="photo-take">${n?'Ta neste bilde':'Ta bilde'}</button>${n?`<button class="tr-btn" data-act="photo-redo">Ta siste på nytt</button>`:''}${n>=PHOTO_STEPS.length?'<button class="tr-btn pri" data-act="photos-done">Fortsett til materialer</button>':''}${n&&n<PHOTO_STEPS.length?'<button class="tr-btn" data-act="photos-done">Fortsett med '+n+' bilde'+(n>1?'r':'')+'</button>':''}</div>
  <p style="font-size:12px;color:#aaa49a">${n>=PHOTO_STEPS.length?'Du kan ta flere bilder av områder som mangler. Vi kan ikke måle dekningen automatisk, så sjekk selv at alle vegger du vil endre er med.':'Fire bilder er et utgangspunkt. Ta flere hvis rommet er stort eller har kriker og kroker.'}</p>`;
  sheet().querySelectorAll('[data-pthumb]').forEach(c=>c.getContext('2d').drawImage(S.views[+c.dataset.pthumb].canvas,0,0,120,84));
  hint('Veiledet fotografering: bilde '+(n+1));
}
async function onPhoto(){
  const f=photoInput.files&&photoInput.files[0];photoInput.value='';if(!f)return;
  try{
    const bmp=await createImageBitmap(f,{imageOrientation:'from-image'}).catch(()=>createImageBitmap(f));
    const sc=Math.min(1,1600/Math.max(bmp.width,bmp.height)),c=document.createElement('canvas');c.width=Math.round(bmp.width*sc);c.height=Math.round(bmp.height*sc);
    c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);if(bmp.close)bmp.close();
    const blur=blurScore(c);
    S.views.push({kind:'img',canvas:c,surfaces:[],blur});
    if(blur<BLUR_MIN)photoGuide('<p class="tr-warn">Det siste bildet ser uskarpt ut. Hold mobilen stødig, eller trykk «Ta siste på nytt».</p>');
    else photoGuide();
  }catch(e){photoGuide('<p class="tr-warn">Kunne ikke lese bildet. Prøv igjen.</p>');}
}
function blurScore(c){
  const w=320,h=Math.max(8,Math.round(320*c.height/c.width)),t=document.createElement('canvas');t.width=w;t.height=h;const g=t.getContext('2d');g.drawImage(c,0,0,w,h);
  const d=g.getImageData(0,0,w,h).data,gray=new Float32Array(w*h);for(let i=0;i<w*h;i++)gray[i]=.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2];
  return MA.laplacianVariance(gray,w,h);
}
function redoPhoto(){S.views.pop();photoGuide();}
function photosDone(){
  if(!S.views.length){photoGuide('<p class="tr-warn">Ta minst ett bilde først.</p>');return;}
  S.cur=0;S.sel=-1;bgKey=null;sheet().style.display='none';renderDock();
  hint('Trykk <b>+ Marker gulv</b> eller <b>+ Marker vegg</b> og deretter på fire hjørner i bildet. Bytt bilde nederst. Materialvalget er felles.');
}

/* ---------------------------------------------------------------- mode: WebXR AR (separate module, loaded only when chosen) */
async function startXR(){
  try{
    xrMod=xrMod||await import('./tryroom-xr-v1.js?v=1');
    close(true);
    await xrMod.start({
      stoneId:()=>S.floorId,wallId:()=>S.wallId,materials:MATS(),STONES,generateStone,T,
      onEnd:()=>{},
      onQuote:(info)=>{open(true).then(()=>{S.xr=info;S.floorId=info.floorId||S.floorId;S.wallId=info.wallId||S.wallId;quote();});}
    });
  }catch(e){
    console.warn('Stenhuset AR:',e);
    if(!root)await open(true);
    showStart();hint('<span class="tr-warn">AR kunne ikke startes: '+esc(e&&e.message||'ukjent feil')+'</span> Bruk kamera eller bilder i stedet.');
  }
}

/* ---------------------------------------------------------------- save + quote */
function saveImage(){
  const v=curView();if(!v||!gl)return;
  try{
    frameNow();
    cv.toBlob(b=>{if(!b)return;const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='stenhuset-mitt-rom.png';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);},'image/png');
    hint('Bildet er lagret på enheten din. Legg det ved e-posten når du ber om tilbud.');
  }catch(e){hint('<span class="tr-warn">Kunne ikke lagre bildet.</span>');}
}
function frameNow(){const v=curView(),c=cover();drawBackground(v);v.surfaces.forEach(s=>drawSurface(s,c));}
function catalog(){return catalogP||(catalogP=fetch('catalog-v1.json').then(r=>r.json()).catch(()=>null));}
async function quote(){
  const cat=await catalog(),mats=MATS();
  const used=[];const v=S.views.flatMap(x=>x.surfaces);
  const add=(type,id)=>{const m=mats.find(x=>x.id===id);if(!m)return;
    const same=v.filter(s=>s.type===type);const area=same.length?same.map(s=>s.w*s.h):null;
    const hits=cat?cat.products.filter(p=>p.n.toLowerCase().startsWith(m.name.toLowerCase())):[];
    used.push({type,m,hits,area});};
  if(v.some(s=>s.type==='floor')||(S.xr&&S.xr.floor))add('floor',S.floorId);
  if(v.some(s=>s.type==='wall')||(S.xr&&S.xr.wall))add('wall',S.wallId);
  if(!used.length){hint('<span class="tr-warn">Marker minst én flate først, så tar vi med materialet i forespørselen.</span>');return;}
  const lines=used.map(u=>{
    const link=u.hits.length===1?u.hits[0].u:u.hits.length>1?'flere varianter i butikken, velg format hos Stenhuset':'ingen sikker produktkobling funnet';
    const dims=u.area?' · flate oppgitt av kunde, ikke målt: ca. '+u.area.reduce((a,b)=>a+b,0).toFixed(1)+' m²':'';
    return (u.type==='floor'?'Gulv: ':'Vegg: ')+u.m.name+(u.hits.length===1?' (produkt-ID '+u.hits[0].id+')':'')+' – '+link+dims;
  });
  const label='Prøv i mitt rom – '+lines.join(' | ')+' | Innstillinger: '+(FORMATS.find(f=>f[0]===S.fmt)[1])+', legging '+S.rot+'°'+(S.bond?', forband':'')+'. Mengde må bekreftes med eget oppmål.';
  if(typeof window.addItem==='function')window.addItem({kind:'tryroom',id:'tryroom-'+Date.now(),label});
  try{localStorage.setItem('stenhuset_tryroom',JSON.stringify({floor:S.floorId,wall:S.wallId,fmt:S.fmt,rot:S.rot,bond:S.bond,grout:S.grout,scale:S.scale,saved:new Date().toISOString()}));}catch(e){}
  close();
  if(typeof window.showContact==='function')window.showContact();
}

/* ---------------------------------------------------------------- open / close */
export async function open(skipStart){
  if(root)return;
  injectCss();buildRoot();
  S.caps=await detect();
  if(!skipStart)showStart();
}
export function close(keepRoot){
  stopStream();stopGyro();cancelAnimationFrame(raf);raf=0;
  window.removeEventListener('keydown',onKey);window.removeEventListener('resize',resize);
  if(gl){const ext=gl.getExtension('WEBGL_lose_context');if(ext&&!keepRoot)ext.loseContext();}
  if(root){root.remove();root=null;}
  document.documentElement.style.overflow='';
  gl=null;P={};tex={};matCache.clear();bgKey=null;S.views=[];S.mark=null;S.brush=null;S.frozen=false;S.sel=-1;S.msg='';drag=null;photoInput=null;
}
