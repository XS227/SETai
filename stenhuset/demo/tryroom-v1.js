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
import * as MA from './tryroom-math-v1.js?v=6';
import {STONES,generateStone,T} from './stone-textures-v1.js';
import {createCoach} from './tryroom-coach-v1.js?v=1';

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
  views:[],cur:0,sel:-1,mark:null,brush:null,brushR:34,tab:'surf',frozen:false,fit:'contain',zoom:1,zoomApplied:1,zoomCaps:null,dzoom:1,track:null,matType:'floor',dark:false,xr:null,corr:[],pick:null,refMode:null,refPts:[],loupe:null,dockMin:false,perf:{},refineReq:null,hcSource:'',hc:1.4,hcAuto:true,hcMeasured:false,hcNote:'',pitch:20,autoBusy:false,aiBusy:false,live:true,autoSel:0,selKind:'manual',frozenR:null,lastError:null,
  gyro:{on:false,ref:null,now:null,fov:65},busy:0,msg:''
};
let coach=null,segMod=null,root,cv,ov,gl,P={},tex={},stream,video,raf=0,lumCtx,lumData,lumT=0,lumAvgFrame=.5,drag=null,photoInput,catalogP=null,xrMod=null;

/* ---------------------------------------------------------------- css + dom */
function injectCss(){
  if(document.getElementById('tr-css'))return;
  const s=document.createElement('style');s.id='tr-css';
  s.textContent=`
.tr-root{position:fixed;inset:0;z-index:2147483200;background:#111;color:#fff;font-family:var(--sans,system-ui,sans-serif);display:flex;flex-direction:column;overscroll-behavior:contain;-webkit-user-select:none;user-select:none}
.tr-root *{box-sizing:border-box}
.tr-stage{position:relative;flex:1;min-height:0;overflow:hidden}
.tr-video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#111}
.tr-stage canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}
.tr-top{position:absolute;left:0;right:0;top:0;z-index:5;display:flex;gap:10px;align-items:flex-start;padding:max(10px,env(safe-area-inset-top)) 12px 10px;pointer-events:none;background:linear-gradient(180deg,#000a,transparent)}
.tr-top>*{pointer-events:auto}
.tr-x{flex:none;width:44px;height:44px;border:0;background:#f7f5eee8;color:#242725;font-size:22px;cursor:pointer}
.tr-hint{flex:1;background:#000b;padding:10px 12px;font-size:13px;line-height:1.45}
.tr-hint b{color:#f0cf9a}
.tr-warn{color:#ffd9a0}
.tr-dock{flex:none;background:#1b1c1a;max-height:40vh;overflow:auto;padding:0 0 max(10px,env(safe-area-inset-bottom));border-top:1px solid #ffffff22}
.tr-tabs{display:flex;position:sticky;top:0;background:#1b1c1a;z-index:2}
.tr-tabs button{flex:1;border:0;background:transparent;color:#fff9;padding:13px 6px;font:700 11px/1 var(--sans,system-ui);letter-spacing:.1em;text-transform:uppercase;cursor:pointer;border-bottom:2px solid transparent;min-height:44px}
.tr-tabs button.on{color:#fff;border-bottom-color:#e8d3ae}
.tr-pane{padding:14px 14px 6px}
.tr-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
.tr-btn{border:1px solid #ffffff55;background:transparent;color:#fff;padding:12px 14px;font:700 12px/1 var(--sans,system-ui);letter-spacing:.08em;text-transform:uppercase;cursor:pointer;min-height:44px}
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
.tr-zoom{position:absolute;right:12px;top:50%;transform:translateY(-50%);z-index:6;display:flex;flex-direction:column;align-items:center;gap:6px;background:rgba(20,20,18,.55);border-radius:999px;padding:6px}
.tr-zoom[hidden]{display:none}
.tr-zoom button{width:44px;height:44px;border-radius:50%;border:0;background:#f7f5eee8;color:#242725;font:400 24px/1 var(--sans,system-ui);cursor:pointer}
.tr-zoom span{color:#fff;font:700 11px/1 var(--sans,system-ui);padding:2px 0}
.tr-dock.min{max-height:none}.tr-dock.min .tr-pane{display:none}
.tr-tabs .tr-min{flex:0 0 52px;font-size:16px;color:#fff}
.tr-busy{position:absolute;left:50%;top:84px;transform:translateX(-50%);z-index:6;background:#000c;padding:8px 14px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;display:none}
.tr-busy.on{display:block}
@media(min-width:900px){.tr-root{flex-direction:row}.tr-dock{width:380px;max-height:none;border-top:0;border-left:1px solid #ffffff22}}`;
  document.head.appendChild(s);
}
function buildRoot(){
  root=document.createElement('div');root.className='tr-root';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Prøv i mitt rom');
  root.innerHTML='<div class="tr-stage"><canvas class="tr-gl"></canvas><canvas class="tr-ov"></canvas>'+
    '<div class="tr-top"><button class="tr-x" data-act="close" aria-label="Avslutt og lukk kamera">✕</button><div class="tr-hint" aria-live="polite"></div></div>'+
    '<div class="tr-zoom" hidden><button type="button" data-act="zoom-in" aria-label="Zoom inn">+</button><span aria-live="polite">1×</span><button type="button" data-act="zoom-out" aria-label="Zoom ut">−</button></div>'+
    '<div class="tr-busy" role="status">Lager steinstruktur …</div><div class="tr-sheet"></div></div><div class="tr-dock" hidden></div>';
  document.body.appendChild(root);
  document.documentElement.style.overflow='hidden';
  cv=root.querySelector('.tr-gl');ov=root.querySelector('.tr-ov');
  coach=createCoach(root.querySelector('.tr-stage'));
  root.addEventListener('click',onClick);
  root.addEventListener('change',onChange);root.addEventListener('input',onChange);
  window.addEventListener('keydown',onKey);window.addEventListener('resize',resize);
}
const camLines=[];
function camLog(m){
  camLines.push(new Date().toLocaleTimeString('nb-NO')+' '+m);if(camLines.length>40)camLines.shift();console.log('[kamera]',m);
  try{sessionStorage.setItem('tr_cam_log',JSON.stringify({t:Date.now(),lines:camLines,err:!!S.camErr}));}catch(e){}
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
  const c=S.caps,ok=(c.xr||(c.cam&&c.secure));
  sheet().style.display='';dock().hidden=true;
  sheet().innerHTML=`<h2>Prøv i mitt rom</h2>
  <p>Se Stenhusets materialer på gulv og vegger i ditt eget rom. Rett mobilkameraet mot rommet og beveg deg rolig: gulv, vegger og møbler gjenkjennes automatisk, og materialet legges bare på gulv og vegg.</p>
  ${ok?'<button class="tr-btn pri" data-act="start" style="font-size:13px;padding:16px 26px;min-height:54px">Start</button>':'<p class="tr-warn">Denne enheten eller nettleseren støtter ikke kamera her. Åpne siden i Chrome på en Android-telefon, eller i Safari på iPhone, over https.</p>'}
  <p style="font-size:12px;color:#aaa49a;margin-top:18px">Alt skjer på din egen mobil. Bilder og video lastes ikke opp noe sted. Nettleseren spør om tillatelse til kameraet.</p>`;
  hint('Trykk Start for å åpne kameraet.');
  // log from the previous attempt (kept in sessionStorage): shown when it failed, or always with ?debug
  const dbg=/debug/.test(location.search);
  for(const [key,title] of [['tr_cam_log','Feilsøkingslogg fra forrige kameraforsøk'],['tr_ar_log','Feilsøkingslogg fra forrige AR-forsøk']]){
    try{
      const L=JSON.parse(sessionStorage.getItem(key)||'null');
      if(L&&Date.now()-L.t<20*60*1000&&L.lines&&L.lines.length&&(dbg||(key==='tr_cam_log'&&L.err))){
        sheet().insertAdjacentHTML('beforeend','<details open style="max-width:560px;margin-top:14px"><summary style="cursor:pointer;font-size:12px;color:#ffd9a0">'+title+'</summary><pre class="tr-logpre" style="white-space:pre-wrap;font:10.5px/1.4 monospace;background:#000a;padding:8px;color:#bfe9d0;margin:8px 0">'+esc(L.lines.join('\n'))+'</pre><button class="tr-btn" data-act="copy-log">Kopier loggen</button></details>');
      }
    }catch(e){}
  }
}

/* ---------------------------------------------------------------- GL */
const VS='attribute vec2 a;varying vec2 v_uv;void main(){v_uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}';
const PREC='#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
const FS_BG=PREC+`varying vec2 v_uv;uniform sampler2D u_bg;uniform vec2 u_cover;
void main(){vec2 t=(vec2(v_uv.x,1.-v_uv.y)-.5)*u_cover+.5;
 if(t.x<0.||t.x>1.||t.y<0.||t.y>1.){gl_FragColor=vec4(.07,.07,.07,1.);return;}
 gl_FragColor=vec4(texture2D(u_bg,t).rgb,1.);}`;
const MATFN=`uniform sampler2D u_tex;uniform vec2 u_tile;uniform float u_scale,u_rot,u_grid,u_bond,u_gw,u_T;uniform vec3 u_gcol;
float hh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 matColor(vec2 m,float mpp){
 float c=cos(u_rot),s=sin(u_rot);m=vec2(c*m.x-s*m.y,s*m.x+c*m.y);
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
 return col;}`;
/* manual surface: the customer marked four corners; Hinv maps canvas pixels to the surface's unit square */
const FS_SF=PREC+`uniform mat3 u_Hinv;uniform vec2 u_res,u_size,u_cover;uniform sampler2D u_mask,u_lum;uniform float u_avg,u_gain;`+MATFN+`
vec2 toUv(vec2 px){vec3 q=u_Hinv*vec3(px,1.);return q.xy/q.z;}
void main(){
 vec2 px=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);
 vec2 uv=toUv(px);vec2 uvx=toUv(px+vec2(1.,0.));vec2 uvy=toUv(px+vec2(0.,1.));
 float mpp=max(length((uvx-uv)*u_size),length((uvy-uv)*u_size));
 float edge=min(min(uv.x,1.-uv.x)*u_size.x,min(uv.y,1.-uv.y)*u_size.y)/max(mpp,1e-5);
 if(edge<-.5)discard;
 float alpha=smoothstep(-.5,1.5,edge);
 float hide=texture2D(u_mask,uv).r;alpha*=1.-smoothstep(.3,.7,hide);
 if(alpha<=.003)discard;
 vec3 col=matColor(uv*u_size-.5*u_size,mpp);
 vec2 vuv=(vec2(px.x/u_res.x,px.y/u_res.y)-.5)*u_cover+.5;
 float shade=clamp(texture2D(u_lum,vuv).r/max(u_avg,.04),.55,1.45);
 col*=mix(1.,shade,.85)*u_gain;
 gl_FragColor=vec4(col,alpha);}`;
/* automatic surface: every screen pixel is turned into a world ray (phone rotation R, pinhole camera) and intersected with the
 * floor plane (z = -H) or a vertical wall plane. The segmentation mask lives in the capture frame; the ray is rotated back into it. */
const FS_AUTO=wall=>PREC+(wall?'#define WALL\n':'')+`uniform mat3 u_R,u_RcT;uniform vec2 u_res,u_cover,u_vsize,u_c,u_P0,u_u;uniform float u_f,u_H,u_avg,u_gain,u_fade,u_hasD;uniform vec2 u_shift;uniform vec4 u_dRect;uniform sampler2D u_mask,u_user,u_lum,u_detail;`+MATFN+`
vec3 rayAt(vec2 px){vec2 vuv=(px/u_res-.5)*u_cover+.5;vec2 vp=vuv*u_vsize;return u_R*vec3((vp.x-u_c.x)/u_f,-(vp.y-u_c.y)/u_f,-1.);}
vec3 planeUV(vec3 d){
#ifdef WALL
 vec2 n=vec2(-u_u.y,u_u.x);float den=dot(n,d.xy);if(abs(den)<1e-3)return vec3(0.);
 float t=dot(n,u_P0)/den;if(t<=0.)return vec3(0.);
 vec3 P=d*t;float h=P.z+u_H;if(h<-.1||h>3.4)return vec3(0.);
 return vec3(dot(u_u,P.xy-u_P0),h,1.);
#else
 if(d.z>-.02)return vec3(0.);
 float t=-u_H/d.z;vec3 P=d*t;return vec3(P.xy,1.);
#endif
}
void main(){
 vec2 px=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);
 vec3 d=rayAt(px);vec3 q=planeUV(d);if(q.z<.5)discard;
 vec3 dd=u_RcT*d;float z=-dd.z;if(z<=.01)discard;
 vec2 mc=vec2(u_c.x+u_f*dd.x/z,u_c.y-u_f*dd.y/z)/u_vsize+u_shift; // + residual image motion found by visual tracking
 if(mc.x<0.||mc.x>1.||mc.y<0.||mc.y>1.)discard;
 float prob=texture2D(u_mask,mc).r;
 if(u_hasD>.5){vec2 qd=(mc-u_dRect.xy)/(u_dRect.zw-u_dRect.xy);if(qd.x>0.&&qd.x<1.&&qd.y>0.&&qd.y<1.){float e=min(min(qd.x,1.-qd.x),min(qd.y,1.-qd.y));prob=mix(prob,texture2D(u_detail,qd).r,smoothstep(0.,.08,e));}}
 vec4 usr=texture2D(u_user,mc);
 prob=max(prob,usr.g);
 float alpha=smoothstep(.42,.58,prob)*(1.-smoothstep(.3,.7,usr.r))*u_fade; // narrow edge on an edge-aware mask, faded when tracking is lost
 if(alpha<=.003)discard;
#ifndef WALL
 alpha*=1.-smoothstep(10.,22.,length(q.xy));
#endif
 vec3 q2=planeUV(rayAt(px+vec2(1.,0.)));vec3 q3=planeUV(rayAt(px+vec2(0.,1.)));
 float mpp=.01;if(q2.z>.5&&q3.z>.5)mpp=max(length(q2.xy-q.xy),length(q3.xy-q.xy));
 vec3 col=matColor(q.xy,mpp);
 vec2 vuv=(vec2(px.x/u_res.x,px.y/u_res.y)-.5)*u_cover+.5;
 float shade=clamp(texture2D(u_lum,vuv).r/max(u_avg,.04),.55,1.45);
 col*=mix(1.,shade,.85)*u_gain;
 gl_FragColor=vec4(col,alpha);}`;
function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
function program(fs){const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,VS));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.bindAttribLocation(p,0,'a');gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={};const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const info=gl.getActiveUniform(p,i);u[info.name]=gl.getUniformLocation(p,info.name);}return {p,u};}
function mkTex(){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
function setupGL(){
  gl=cv.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  if(!gl)throw new Error('WebGL mangler');
  P.bg=program(FS_BG);P.sf=program(FS_SF);P.floor=program(FS_AUTO(false));P.wall=program(FS_AUTO(true));
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
const busyUi=()=>{const b=root&&root.querySelector('.tr-busy');if(!b)return;b.textContent=S.aiBusy?'Analyserer rommet …':'Lager steinstruktur …';b.classList.toggle('on',S.busy>0||S.aiBusy);};

/* ---------------------------------------------------------------- views + coordinates */
const curView=()=>S.views[S.cur];
function source(){const v=curView();if(!v)return null;if(v.kind==='video')return video&&video.videoWidth?{w:video.videoWidth,h:video.videoHeight,el:video}:null;return {w:v.canvas.width,h:v.canvas.height,el:v.canvas};}
function cover(){
  const s=source();if(!s)return [1,1];
  const view=curView(),vid=view.kind==='video';
  return MA.coverFrac(cv.width,cv.height,s.w,s.h,vid&&S.fit==='fill',vid?(S.dzoom||1):1);
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
  if(view.kind==='video'){if(!S.frozen||bgKey!=='frozen'){if(video&&video.readyState>=2){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,video);if(!S.firstFrame){S.firstFrame=true;camLog('første kamerabilde tegnet: '+video.videoWidth+'x'+video.videoHeight);}}bgKey=S.frozen?'frozen':'live';}}
  else if(bgKey!==view){gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,view.canvas);bgKey=view;}
  gl.useProgram(P.bg.p);gl.uniform1i(P.bg.u.u_bg,0);const c=cover();gl.uniform2f(P.bg.u.u_cover,c[0],c[1]);
  gl.disable(gl.BLEND);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.enable(gl.BLEND);return true;
}
function bindMaterial(u,id){
  const plaster=STONES[id].kind==='plaster',grid=S.fmt!=='natural'&&!plaster,fmt=FORMATS.find(f=>f[0]===S.fmt);
  const t=getMaterial(id,grid);if(!t)return false;
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(u.u_tex,1);
  const tile=grid&&fmt[2]?fmt[2]:[.3,.3];gl.uniform2f(u.u_tile,tile[0],tile[1]);
  gl.uniform1f(u.u_scale,S.scale);gl.uniform1f(u.u_rot,S.rot*Math.PI/180);gl.uniform1f(u.u_grid,grid?1:0);gl.uniform1f(u.u_bond,S.bond?1:0);
  gl.uniform1f(u.u_gw,STONES[id].kind==='zellige'?.002:.003);gl.uniform1f(u.u_T,T);gl.uniform3fv(u.u_gcol,hex3(S.grout));
  return true;
}
function drawSurface(s,c){
  if(s.hidden)return;const m=surfaceH(s,c);if(!m)return;s._Hinv=m.Hi;s._H=m.H;
  const id=s.type==='floor'?S.floorId:S.wallId,u=P.sf.u;gl.useProgram(P.sf.p);
  if(!bindMaterial(u,id))return;
  if(!s.maskTex){s.maskTex=mkTex();s.maskDirty=true;}
  gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,s.maskTex);
  if(s.maskDirty){gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,s.mask);s.maskDirty=false;}
  gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,tex.lum);
  gl.uniform1i(u.u_mask,2);gl.uniform1i(u.u_lum,3);
  gl.uniformMatrix3fv(u.u_Hinv,false,new Float32Array(MA.transpose3(m.Hi)));
  gl.uniform2f(u.u_res,cv.width,cv.height);gl.uniform2f(u.u_size,s.w,s.h);gl.uniform2f(u.u_cover,c[0],c[1]);
  const avg=avgLum(s);s._avg=avg;gl.uniform1f(u.u_avg,avg);gl.uniform1f(u.u_gain,clamp(.5+avg*1.1,.55,1));
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}

/* ---- automatic surfaces (segmentation): rotation used for rendering, drawing, mask upload ---- */
function renderR(view){
  const a=view.auto;
  if(view.kind!=='video')return a.cap.R;
  if(S.frozen)return S.frozenR||a.cap.R;
  return (S.gyro.on&&S.gyro.now)?S.gyro.now:a.cap.R;
}
function drawAuto(view,c){
  const a=view.auto;if(!a)return;
  for(const sf of a.surfaces){
    if(sf.off)continue;
    const wall=sf.type==='wall',pr=wall?P.wall:P.floor,u=pr.u;gl.useProgram(pr.p);
    if(!bindMaterial(u,wall?S.wallId:S.floorId))continue;
    const cam=a.cap;
    gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,sf.maskTex);gl.uniform1i(u.u_mask,2);
    gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,sf.userTex);
    if(sf.userDirty){gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,sf.userCanvas);sf.userDirty=false;}
    gl.uniform1i(u.u_user,4);
    gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,tex.lum);gl.uniform1i(u.u_lum,3);
    gl.uniformMatrix3fv(u.u_R,false,new Float32Array(MA.transpose3(renderR(view))));
    gl.uniformMatrix3fv(u.u_RcT,false,new Float32Array(cam.R)); // uploading R row-major as column-major gives R^T in GLSL
    gl.uniform2f(u.u_res,cv.width,cv.height);gl.uniform2f(u.u_cover,c[0],c[1]);gl.uniform2f(u.u_vsize,cam.vw,cam.vh);gl.uniform2f(u.u_c,cam.cx,cam.cy);
    gl.uniform1f(u.u_f,cam.f);gl.uniform1f(u.u_H,a.Hc);
    if(wall){gl.uniform2f(u.u_P0,sf.p0[0],sf.p0[1]);gl.uniform2f(u.u_u,sf.u[0],sf.u[1]);}
    gl.uniform1f(u.u_avg,sf.avg);gl.uniform1f(u.u_gain,clamp(.5+sf.avg*1.1,.55,1));
    const vid=view.kind==='video';gl.uniform2f(u.u_shift,vid?TRK.shift[0]:0,vid?TRK.shift[1]:0);gl.uniform1f(u.u_fade,vid?TRK.fade:1);
    gl.activeTexture(gl.TEXTURE5);
    if(sf.detail&&sf.detail.tex){gl.bindTexture(gl.TEXTURE_2D,sf.detail.tex);const R=sf.detail.rect;gl.uniform4f(u.u_dRect,R[0],R[1],R[2],R[3]);gl.uniform1f(u.u_hasD,1);}
    else{gl.bindTexture(gl.TEXTURE_2D,sf.maskTex);gl.uniform1f(u.u_hasD,0);}
    gl.uniform1i(u.u_detail,5);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
}
/* ---- visual tracking between analyses (key frame = the analysed picture) ----
 * The gyro predicts rotation; the remaining image motion (sideways steps, gyro drift) is measured by matching a small grey image of
 * the live video against the key frame. The residual shifts the mask; a poor match fades the material out until it is found again. */
const TRK={shift:[0,0],fade:1,target:1,bad:0,n:0,score:1,lostAt:0,ctx:null,ms:0};
function grayOf(el,sw,sh,tw,th){
  if(!TRK.ctx){const c=document.createElement('canvas');TRK.ctx=c.getContext('2d',{willReadFrequently:true});}
  const c=TRK.ctx.canvas;if(c.width!==tw||c.height!==th){c.width=tw;c.height=th;}
  TRK.ctx.drawImage(el,0,0,sw,sh,0,0,tw,th);const d=TRK.ctx.getImageData(0,0,tw,th).data,g=new Uint8Array(tw*th);
  for(let i=0;i<tw*th;i++)g[i]=(d[i*4]*54+d[i*4+1]*183+d[i*4+2]*19)>>8;return g;
}
function predictShift(a,R){ // where the key frame's centre is now, from the gyro alone, in key-image pixels
  const cam=a.cap;if(!cam.gyro||!R)return [0,0];
  const ray=MA.pixelToWorldRay(cam.cx,cam.cy,cam.R,cam.cx,cam.cy,cam.f),p=MA.worldRayToPixel(ray,R,cam.cx,cam.cy,cam.f);if(!p)return [0,0];
  return [(p[0]-cam.cx)/cam.vw*a.kw,(p[1]-cam.cy)/cam.vh*a.kh];
}
function measureTrack(a,R){
  const t0=performance.now(),C=grayOf(video,video.videoWidth,video.videoHeight,a.kw,a.kh),pr=predictShift(a,R);
  const m=MA.trackShift(a.kgray,C,a.kw,a.kh,Math.round(pr[0]),Math.round(pr[1]),6,1);
  TRK.ms=performance.now()-t0;
  return {m,pr};
}
function trackTick(view,now){
  const a=view.auto;
  // nothing to track on (no key frame, frozen, or a plain surface without texture): rely on the gyro only, never fade
  if(view.kind!=='video'||!a||!a.kgray||a.ktex<8||S.frozen||!video||video.readyState<2){TRK.target=1;TRK.fade+=(1-TRK.fade)*.2;return;}
  if((++TRK.n)%3===0){
    const {m,pr}=measureTrack(a,renderR(view));TRK.score=m.score;
    if(m.score>=.6){
      const rx=(m.dx-pr[0])/a.kw,ry=(m.dy-pr[1])/a.kh; // residual motion the gyro does not explain
      TRK.shift[0]+=(-rx-TRK.shift[0])*.5;TRK.shift[1]+=(-ry-TRK.shift[1])*.5;TRK.bad=0;TRK.target=1;
      if(TRK.lostAt){TRK.lostAt=0;coach.set('done','Posisjonen er funnet igjen');}
    }else if(m.score<.45&&++TRK.bad>=3){
      TRK.target=0;if(!TRK.lostAt){TRK.lostAt=now;coach.set('hold','Beveg mobilen rolig – finner posisjonen igjen');}
    }
  }
  TRK.fade+=(TRK.target-TRK.fade)*.18;
  // lost for a while: take a new key frame (re-analyse) instead of showing a result that no longer fits
  if(TRK.lostAt&&now-TRK.lostAt>1500&&!S.autoBusy&&S.live&&segMod){TRK.lostAt=now;autoDetect(true);}
}
function frame(now){
  raf=requestAnimationFrame(frame);
  const view=curView();if(!view||!gl)return;
  try{
  followGyro();
  if(view.auto){trackTick(view,now);autoTick(now,view);}
  const c=cover();
  const src=source();if(src){if(view.kind==='video'&&!S.frozen)updateLum(now,false);else if(view.kind==='img'&&bgKey!==view)updateLum(0,true);}
  if(!drawBackground(view))return;
  drawAuto(view,c);
  view.surfaces.forEach(s=>drawSurface(s,c));
  drawOverlay(c);
  lowLightHint();
  }catch(err){
    if(!S.lastError){S.lastError=String(err&&err.message||err);console.error('Stenhuset prøv-i-rom:',err);hint('<span class="tr-warn">Teknisk feil i visningen: '+esc(S.lastError)+'</span>');}
  }
}
function lowLightHint(){
  const v=curView();if(!v||S.mark||S.msg)return;
  const land=MOBILE&&v.kind==='video'&&window.innerWidth>window.innerHeight;
  if(land&&!S.landShown){S.landShown=true;hint('<span class="tr-warn">Hold mobilen stående.</span> Gjenkjenning og perspektiv forutsetter stående format.');}
  if(!land)S.landShown=false;
  const dark=v.kind==='video'&&!S.frozen&&lumAvgFrame<.13;
  if(dark&&!S.dark)hint('<span class="tr-warn">Det er veldig mørkt.</span> Skru på lyset i rommet, ellers blir materialet vanskelig å vurdere.');
  S.dark=dark;
}

/* ---- overlay: outlines, handles, marking points, brush cursor */
function drawOverlay(c){
  const g=ov.getContext('2d'),W=ov.width,H=ov.height,d=W/ov.getBoundingClientRect().width||1;g.clearRect(0,0,W,H);
  const v=curView();
  v.surfaces.forEach((s,i)=>{
    if(s.hidden)return;const q=s.pts.map(p=>toCanvas(p,c)),on=i===S.sel&&S.selKind==='manual';
    g.lineWidth=(on?2.5:1.5)*d;g.strokeStyle=on?'#ffffff':'#ffffff99';g.setLineDash(on?[]:[8*d,6*d]);
    g.beginPath();q.forEach((p,k)=>k?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.stroke();g.setLineDash([]);
    if(on&&!S.brush)q.forEach(p=>{g.fillStyle='#fff';g.strokeStyle='#242725';g.lineWidth=2*d;g.beginPath();g.arc(p[0],p[1],11*d,0,7);g.fill();g.stroke();});
  });
  const au=v.auto;
  if(au&&au.preview){const age=performance.now()-au.t0;if(age<3200){const tl=toCanvas([0,0],c),br=toCanvas([1,1],c);g.globalAlpha=age<2200?1:1-(age-2200)/1000;g.drawImage(au.preview,tl[0],tl[1],br[0]-tl[0],br[1]-tl[1]);g.globalAlpha=1;}}
  if(S.mark){
    g.fillStyle='#e8d3ae';g.strokeStyle='#242725';g.lineWidth=2*d;
    const q=S.mark.pts.map(p=>toCanvas(p,c));
    g.strokeStyle='#e8d3ae';g.beginPath();q.forEach((p,k)=>k?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();
    q.forEach((p,k)=>{g.fillStyle='#e8d3ae';g.beginPath();g.arc(p[0],p[1],12*d,0,7);g.fill();g.fillStyle='#242725';g.font=(13*d)+'px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(String(k+1),p[0],p[1]);});
  }
  if(S.brush&&drag&&drag.kind==='brush'){g.strokeStyle=S.brush==='hide'?'#e8d3ae':'#9fd0ff';g.lineWidth=2*d;g.beginPath();g.arc(drag.x*d,drag.y*d,S.brushR*d,0,7);g.stroke();}
  // reference-length points
  if(S.refMode&&au)for(const q of S.refPts){const cn=[q[0]/au.cap.vw,q[1]/au.cap.vh],cp=toCanvas(cn,c);g.fillStyle='#e8a35f';g.beginPath();g.arc(cp[0],cp[1],9*d,0,7);g.fill();}
  if(S.refMode&&au&&S.refPts.length===2){const a0=toCanvas([S.refPts[0][0]/au.cap.vw,S.refPts[0][1]/au.cap.vh],c),a1=toCanvas([S.refPts[1][0]/au.cap.vw,S.refPts[1][1]/au.cap.vh],c);g.strokeStyle='#e8a35f';g.lineWidth=3*d;g.beginPath();g.moveTo(a0[0],a0[1]);g.lineTo(a1[0],a1[1]);g.stroke();}
  // magnifier above the finger while choosing a point
  if(S.loupe){
    const R=62*d,Z=2.4,fx=S.loupe.x*d,fy=S.loupe.y*d;let ly=fy-140*d;if(ly<R+6*d)ly=fy+140*d;
    g.save();g.beginPath();g.arc(fx,ly,R,0,7);g.clip();g.fillStyle='#111';g.fillRect(fx-R,ly-R,2*R,2*R);
    try{g.drawImage(cv,fx-R/Z,fy-R/Z,2*R/Z,2*R/Z,fx-R,ly-R,2*R,2*R);}catch(e){}
    g.restore();g.strokeStyle='#fff';g.lineWidth=3*d;g.beginPath();g.arc(fx,ly,R,0,7);g.stroke();
    g.strokeStyle=S.pick==='hide'?'#ff8a7a':'#e8d3ae';g.lineWidth=2*d;g.beginPath();g.moveTo(fx-12*d,ly);g.lineTo(fx+12*d,ly);g.moveTo(fx,ly-12*d);g.lineTo(fx,ly+12*d);g.stroke();
  }
}

/* ---------------------------------------------------------------- pointer: marking, dragging corners, brush */
function evPt(e){const r=ov.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];}
function bind(){
  if(ov._bound)return;ov._bound=true;
  const pts=new Map();let pinch=null;
  ov.addEventListener('pointerdown',e=>{
    pts.set(e.pointerId,[e.clientX,e.clientY]);
    if(pts.size===2){const [a,b]=[...pts.values()];pinch={d0:Math.hypot(a[0]-b[0],a[1]-b[1])||1,z0:zoomValue(),t:0};drag=null;}
  });
  ov.addEventListener('pointermove',e=>{
    if(!pts.has(e.pointerId))return;pts.set(e.pointerId,[e.clientX,e.clientY]);
    if(pinch&&pts.size>=2){const [a,b]=[...pts.values()],now=performance.now();if(now-pinch.t>90){pinch.t=now;setZoom(pinch.z0*Math.hypot(a[0]-b[0],a[1]-b[1])/pinch.d0);}}
  });
  const endPt=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=null;};
  ov.addEventListener('pointerup',endPt);ov.addEventListener('pointercancel',endPt);
  ov.addEventListener('pointerdown',e=>{
    if(e.isPrimary===false||pinch)return;
    if(!curView()||!source())return;
    const p=evPt(e),d=cv.width/ov.getBoundingClientRect().width,c=cover(),px=[p[0]*d,p[1]*d];
    ov.setPointerCapture(e.pointerId);
    if(S.pick||S.refMode){S.loupe={x:p[0],y:p[1]};drag={kind:'pick'};return;}
    if(S.mark){
      const n=toNorm(px,c);S.mark.pts.push(n);
      if(S.mark.pts.length===4)finishMark();else markHint();
      return;
    }
    const aSel=S.selKind==='auto'&&curView().auto&&curView().auto.surfaces[S.autoSel];
    if(S.brush&&(aSel||(S.selKind==='manual'&&S.sel>=0))){drag={kind:'brush',x:p[0],y:p[1],erase:S.brush==='show'};paintAny(px,p);return;}
    // pick a corner of the selected surface
    const s=S.selKind==='manual'?curView().surfaces[S.sel]:null;
    if(s&&!s.hidden){
      let best=-1,bd=44*d;s.pts.forEach((q,i)=>{const cp=toCanvas(q,c),dist=Math.hypot(cp[0]-px[0],cp[1]-px[1]);if(dist<bd){bd=dist;best=i;}});
      if(best>=0){drag={kind:'corner',i:best};return;}
    }
    // else select the surface under the finger
    const hit=curView().surfaces.findIndex(s=>!s.hidden&&inside(s,px,c));
    if(hit>=0){S.sel=hit;S.selKind='manual';renderDock();}
  });
  ov.addEventListener('pointermove',e=>{
    if(!drag||pinch)return;const p=evPt(e),d=cv.width/ov.getBoundingClientRect().width,c=cover(),px=[p[0]*d,p[1]*d];
    if(drag.kind==='corner'){const s=curView().surfaces[S.sel];if(!s)return;s.pts[drag.i]=toNorm(px,c);anchorPoint(s,drag.i);}
    else if(drag.kind==='brush'){drag.x=p[0];drag.y=p[1];paintAny(px,p);}
    else if(drag.kind==='pick'){S.loupe={x:p[0],y:p[1]};}
  });
  const end=()=>{if(drag&&drag.kind==='pick'&&S.loupe)commitPick();if(drag&&drag.kind==='brush')S.stroke=null;drag=null;S.loupe=null;};
  ov.addEventListener('pointerup',end);ov.addEventListener('pointercancel',end);
}
function inside(s,px,c){
  const q=s.pts.map(p=>toCanvas(p,c));let hit=false;
  for(let i=0,j=3;i<4;j=i++){if((q[i][1]>px[1])!==(q[j][1]>px[1])&&px[0]<(q[j][0]-q[i][0])*(px[1]-q[i][1])/(q[j][1]-q[i][1])+q[i][0])hit=!hit;}
  return hit;
}
function paintAny(px,p){if(S.selKind==='auto')paintAuto(px);else paint(px,p);}
/* auto surfaces: the brush paints in the capture frame (rotated back from the current view), so the correction stays in place */
function paintAuto(px){
  const v=curView(),a=v.auto,sf=a&&a.surfaces[S.autoSel];if(!sf)return;
  const q=capFromCanvas(a,v,px);if(!q)return;
  const c=cover(),dpr=cv.width/ov.getBoundingClientRect().width,rpx=S.brushR*dpr,rx=rpx/cv.width*c[0],ry=rpx/cv.height*c[1];
  if(!S.stroke)S.stroke=Date.now();
  const dab={src:'brush',ray:q.ray,r:[rx,ry],mode:S.brush,type:sf.type,key:sf.key||null,g:S.stroke};
  S.corr.push(dab);drawDab(a,dab);
}
function drawDab(a,dab){
  const n=capOfRay(a,dab.ray);if(!n)return;
  for(const sf of a.surfaces){
    if(sf.type!==dab.type)continue;
    const g=sf.userCanvas.getContext('2d');g.fillStyle=dab.mode==='hide'?'#ff0000':dab.mode==='add'?'#00ff00':'#000000';
    g.beginPath();g.ellipse(n[0]*256,n[1]*256,Math.max(1,dab.r[0]*256),Math.max(1,dab.r[1]*256),0,0,7);g.fill();sf.userDirty=true;
  }
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
  const s=newSurface(type,pts);curView().surfaces.push(s);S.sel=curView().surfaces.length-1;S.selKind='manual';S.matType=type;S.mark=null;S.msg='';
  S.tab='surf';hint('Flate lagt til. <b>Dra i hjørnene</b> for å justere. Oppgi gjerne reelle mål under «Flater» så skalaen blir riktig.');renderDock();
}

/* ---------------------------------------------------------------- dock UI */
const MATS=()=>(typeof window.getStudioMaterials==='function'?window.getStudioMaterials():[]);
function autoPane(v){
  const a=v&&v.auto;
  let h='<div class="tr-row"><button class="tr-btn pri" data-act="auto" '+(S.autoBusy?'disabled':'')+'>'+(S.autoBusy?'Analyserer …':a?'Finn flater på nytt':'Finn gulv og vegger automatisk')+'</button></div>';
  if(!a)return h+'<p style="font-size:12px;line-height:1.55;color:#aaa49a;margin:0 0 12px">Rett kameraet mot rommet og trykk. Bildet analyseres på mobilen din av en AI-modell (4 MB som lastes ned første gang, bildet sendes ikke noe sted). Gulv, vegger og møbler skilles fra hverandre.</p>';
  if(v.kind==='video')h+=`<label style="display:flex;gap:10px;align-items:center;font-size:12.5px;margin:0 0 6px"><input type="checkbox" data-live ${S.live?'checked':''}> Live-oppdatering: analyserer på nytt når du flytter kameraet</label><p style="font-size:11.5px;line-height:1.5;color:#aaa49a;margin:0 0 12px">Følger dreiing (bevegelsessensor) og bildebevegelse mellom analysene. Det er ikke full posisjonssporing: går du langt, analyseres rommet på nytt. Rettinger følger med.</p>`;
  h+=`<span class="tr-lbl">Rett opp med et trykk</span><div class="tr-row"><button class="tr-btn ${S.pick==='add'?'on':''}" data-act="pick-add">+ Velg flate</button><button class="tr-btn ${S.pick==='hide'?'on':''}" data-act="pick-hide">− Behold synlig</button><button class="tr-btn" data-act="undo" ${S.corr.length?'':'disabled'}>Angre</button><button class="tr-btn" data-act="refine">Finjuster området</button></div>`;
  if(S.pick)h+='<p style="font-size:11.5px;line-height:1.5;color:#e8d3ae;margin:-4px 0 12px">'+(S.pick==='add'?'Trykk på en liten flate som mangler materiale (for eksempel vegg mellom skap).':'Trykk på et objekt som skal vises foran materialet (vindu, teppe, radiator …).')+' Hold fingeren nede for forstørret visning.</p>';
  h+='<span class="tr-lbl">Funnet</span><div class="tr-row">'+(a.surfaces.length?a.surfaces.map((x,i)=>`<button class="tr-btn ${S.selKind==='auto'&&S.autoSel===i?'on':''}" data-asel="${i}">${x.name}${x.fallback?' (anslag)':''}</button>`).join(''):'<span style="font-size:12px;color:#ffd9a0">Ingen gulv eller vegg funnet</span>')+'</div>';
  h+=`<span class="tr-lbl">Kamerahøyde: ${S.hc.toFixed(2).replace('.',',')} m · ${S.hcSource==='ref'?'fra referansemål':S.hcAuto?esc(S.hcNote||'estimert'):'satt av deg'}</span><input type="range" min="60" max="200" value="${Math.round(S.hc*100)}" data-hc style="width:100%;margin-bottom:6px">`;
  h+='<div class="tr-row">'+(S.hcAuto?'':'<button class="tr-btn" data-act="hc-auto">Estimer automatisk</button>')+`<button class="tr-btn ${S.refMode?'on':''}" data-act="ref">Bruk kjent mål</button></div>`;
  if(S.refMode)h+=S.refPts.length<2?'<p style="font-size:11.5px;color:#e8d3ae;margin:-4px 0 12px">Trykk på to punkter på gulvet med kjent avstand, for eksempel kantene på en flis, et teppe eller en dør.</p>':`<div class="tr-row"><label style="display:flex;gap:8px;align-items:center;font-size:12.5px">Avstand <input class="tr-num" type="number" inputmode="decimal" min="10" max="2000" data-reflen placeholder="cm"> cm</label><button class="tr-btn pri" data-act="ref-apply">Bruk</button></div>`;
  h+=`<span class="tr-lbl">Synsfelt: ${S.gyro.fov}°</span><input type="range" min="50" max="85" value="${S.gyro.fov}" data-fov style="width:100%;margin-bottom:10px">`;
  if(!a.cap.gyro)h+=`<span class="tr-lbl">Kameravinkel nedover: ${S.pitch}°</span><input type="range" min="0" max="60" value="${S.pitch}" data-pitch style="width:100%;margin-bottom:10px">`;
  h+='<p style="font-size:11.5px;line-height:1.55;color:#aaa49a;margin:0 0 10px">Høyde og synsfelt styrer skala og perspektiv. De er anslag til du justerer dem selv.</p>';
  if(S.selKind==='auto'&&a.surfaces[S.autoSel])h+=`<span class="tr-lbl">Rett opp valgt flate</span><div class="tr-row"><button class="tr-btn ${S.brush==='hide'?'on':''}" data-act="brush-hide">Behold synlig</button><button class="tr-btn ${S.brush==='add'?'on':''}" data-act="brush-add">Legg til materiale</button><button class="tr-btn ${S.brush==='show'?'on':''}" data-act="brush-show">Viskelær</button><button class="tr-btn" data-act="brush-clear">Nullstill</button></div><label class="tr-lbl">Børstestørrelse</label><input type="range" min="14" max="80" value="${S.brushR}" data-brush-size style="width:100%;margin-bottom:12px">`;
  return h;
}
function renderDock(){
  const d=dock();d.hidden=false;sheet().style.display='none';
  const v=curView(),s=v&&v.surfaces[S.sel],tabs=[['surf','Flater'],['mat','Materiale'],['lay','Legging']];
  d.classList.toggle('min',!!S.dockMin);
  let h='<div class="tr-tabs" role="tablist">'+tabs.map(t=>`<button role="tab" aria-selected="${S.tab===t[0]}" class="${S.tab===t[0]&&!S.dockMin?'on':''}" data-tab="${t[0]}">${t[1]}</button>`).join('')+`<button class="tr-min" data-act="dock-min" aria-expanded="${!S.dockMin}" aria-label="${S.dockMin?'Vis kontrollpanelet':'Skjul kontrollpanelet'}">${S.dockMin?'▴':'▾'}</button></div><div class="tr-pane">`;
  if(S.tab==='surf'){
    h+=autoPane(v);
    h+='<span class="tr-lbl" style="margin-top:6px">Eller marker selv</span><div class="tr-row"><button class="tr-btn pri" data-act="mark-floor">+ Marker gulv</button><button class="tr-btn pri" data-act="mark-wall">+ Marker vegg</button>'+(S.mark?'<button class="tr-btn" data-act="mark-cancel">Avbryt</button>':'')+'</div>';
    if(v&&v.surfaces.length){
      h+='<span class="tr-lbl">Dine flater</span><div class="tr-row">'+v.surfaces.map((x,i)=>`<button class="tr-btn ${i===S.sel?'on':''}" data-sel="${i}">${x.type==='floor'?'Gulv':'Vegg'} ${i+1}</button>`).join('')+'</div>';
    }else h+='<p style="font-size:12px;line-height:1.55;color:#aaa49a;margin:0 0 12px">Marker fire hjørner av flaten hvis automatisk gjenkjenning ikke treffer.</p>';
    if(s&&S.selKind==='manual'){
      h+=`<span class="tr-lbl">Mål på valgt flate (for riktig skala)</span><div class="tr-row"><label>Bredde m <input class="tr-num" type="number" inputmode="decimal" min=".3" max="30" step=".1" data-dim="w" value="${s.w}"></label><label>${s.type==='floor'?'Dybde':'Høyde'} m <input class="tr-num" type="number" inputmode="decimal" min=".3" max="30" step=".1" data-dim="h" value="${s.h}"></label></div>
      <p style="font-size:11.5px;line-height:1.55;color:#aaa49a;margin:-4px 0 12px">Skalaen er et anslag til du oppgir målene selv. Mål fra kameraet er ikke nøyaktige, så bruk ikke dette som bestillingsmengde.</p>
      <span class="tr-lbl">Behold møbler og inventar synlig</span><div class="tr-row"><button class="tr-btn ${S.brush==='hide'?'on':''}" data-act="brush-hide">Børste: behold synlig</button><button class="tr-btn ${S.brush==='show'?'on':''}" data-act="brush-show">Viskelær</button><button class="tr-btn" data-act="brush-clear">Nullstill</button></div>
      <label class="tr-lbl" style="margin-top:0">Børstestørrelse</label><input type="range" min="14" max="80" value="${S.brushR}" data-brush-size style="width:100%;margin-bottom:12px">
      <p style="font-size:11.5px;line-height:1.55;color:#aaa49a;margin:0 0 12px">Mal over vask, toalett, møbler eller dusjglass som skal vises foran materialet. Dette gjøres for hånd, ikke automatisk.</p>
      <div class="tr-row"><button class="tr-btn" data-act="del-surface">Slett flate</button></div>`;
    }
    h+='<div class="tr-row">'+(v&&v.kind==='video'?`<button class="tr-btn ${S.frozen?'on':''}" data-act="freeze">${S.frozen?'Fortsett kamera':'Frys bilde'}</button><button class="tr-btn" data-act="fit">${S.fit==='fill'?'Vis hele bildet':'Fyll skjermen'}</button>`:'')+'<button class="tr-btn" data-act="save-image">Last ned bilde</button><button class="tr-btn pri" data-act="quote">Be om tilbud</button></div>';
    h+='<p style="font-size:10.5px;line-height:1.5;color:#8a857c;margin:6px 0 0">Systemsjekk: WebGL '+(gl?'ok':'nei')+' · bevegelsessensor '+(S.gyro.on?'ja':'nei')+' · video '+(source()?source().w+'×'+source().h:'–')+' · AI-modell '+(segMod&&segMod.isLoaded()?'lastet':'ikke lastet')+' · analyse '+(S.perf.seg??'–')+' ms, masker '+(S.perf.mask??'–')+' ms, detalj '+(S.perf.refine??'–')+' ms, sporing '+(TRK.ms?TRK.ms.toFixed(1):'–')+' ms (match '+TRK.score.toFixed(2)+')'+(S.lastError?' · feil: '+esc(S.lastError):'')+'</p>';
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
  if(t.dataset.tab){S.tab=t.dataset.tab;S.dockMin=false;renderDock();return;}
  if(t.dataset.asel!==undefined){S.autoSel=+t.dataset.asel;S.selKind='auto';const x=curView().auto.surfaces[S.autoSel];if(x)S.matType=x.type;renderDock();return;}
  if(t.dataset.sel!==undefined){S.sel=+t.dataset.sel;S.selKind='manual';const x=curView().surfaces[S.sel];if(x)S.matType=x.type;renderDock();return;}
  if(t.dataset.view!==undefined){switchView(+t.dataset.view);return;}
  if(t.dataset.matfor){S.matType=t.dataset.matfor;S.tab='mat';renderDock();return;}
  if(t.dataset.mat){if(t.dataset.for==='floor')S.floorId=t.dataset.mat;else S.wallId=t.dataset.mat;STONES[t.dataset.mat]&&getMaterial(t.dataset.mat,S.fmt!=='natural');renderDock();return;}
  if(t.dataset.rot){S.rot=+t.dataset.rot;renderDock();return;}
  if(t.dataset.grout){S.grout=t.dataset.grout;renderDock();return;}
  const a=t.dataset.act;if(!a)return;
  ({close,
    start:()=>((S.caps.xr&&/[?&]ar\b/.test(location.search))?startXR():startCamera()),
    'zoom-in':()=>setZoom(zoomValue()*1.25),'zoom-out':()=>setZoom(zoomValue()/1.25),
    auto:autoDetect,'hc-auto':()=>{S.hcAuto=true;S.hcMeasured=false;renderDock();autoDetect(false);},'brush-add':()=>{S.brush=S.brush==='add'?null:'add';brushHint();renderDock();},
    'dock-min':()=>{S.dockMin=!S.dockMin;renderDock();},
    'pick-add':()=>{S.pick=S.pick==='add'?null:'add';S.brush=null;S.refMode=null;renderDock();},
    'pick-hide':()=>{S.pick=S.pick==='hide'?null:'hide';S.brush=null;S.refMode=null;renderDock();},
    undo:undoCorrection,
    refine:()=>{const a=curView()&&curView().auto;if(!a){hint('Vent til rommet er analysert.');return;}const sf=a.surfaces[S.autoSel];let r=[.2,.25,.8,.75];if(sf&&sf.box){const b=sf.box,w=a.seg.w,h=a.seg.h;r=[b[0]/w-.08,b[1]/h-.06,(b[2]+1)/w+.08,(b[3]+1)/h+.06];}hint('Finjusterer '+(sf?sf.name.toLowerCase():'området')+' med en nærmere analyse …');refineAt(r,'valgt flate');},
    ref:()=>{S.refMode=S.refMode?null:'pts';S.refPts=[];S.pick=null;S.brush=null;renderDock();if(S.refMode)hint('Trykk på to punkter på gulvet med kjent avstand.');},
    'ref-apply':()=>{const el=root.querySelector('[data-reflen]');const cm=parseFloat(String(el&&el.value||'').replace(',','.'));if(!(cm>0)){hint('Skriv inn avstanden i cm.');return;}applyReference(cm);},
    'mark-floor':()=>startMark('floor'),'mark-wall':()=>startMark('wall'),
    'mark-cancel':()=>{S.mark=null;S.msg='';hint('Markering avbrutt.');renderDock();},
    'brush-hide':()=>{S.pick=null;S.brush=S.brush==='hide'?null:'hide';brushHint();renderDock();},
    'brush-show':()=>{S.brush=S.brush==='show'?null:'show';brushHint();renderDock();},
    'brush-clear':()=>{if(S.selKind==='auto'){S.corr=S.corr.filter(c=>c.src!=='brush');const a=curView().auto;if(a)applyCorrections(a);renderDock();return;}const s=curView().surfaces[S.sel];if(s){const g=s.mask.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,256,256);s.maskDirty=true;}},
    'del-surface':()=>{const v=curView();v.surfaces.splice(S.sel,1);S.sel=v.surfaces.length-1;S.brush=null;renderDock();},
    fit:()=>{S.fit=S.fit==='fill'?'contain':'fill';renderDock();},
    freeze:()=>{S.frozen=!S.frozen;S.frozenR=S.frozen&&S.gyro.now?S.gyro.now.slice():null;bgKey=null;if(!S.frozen)curView().surfaces.forEach(anchorRays);renderDock();},
    'save-image':saveImage,quote,'photo-retry-cam':startCamera,'copy-log':()=>{const el=root.querySelector('.tr-logpre');if(el&&navigator.clipboard)navigator.clipboard.writeText(el.textContent).then(()=>hint('Loggen er kopiert. Lim den inn i en melding til meg.')).catch(()=>hint('Kunne ikke kopiere. Ta et skjermbilde av loggen i stedet.'));},
  })[a]?.();
}
function onChange(e){
  const t=e.target;
  if(t.dataset.fmt!==undefined){S.fmt=t.value;STONES[S.floorId]&&getMaterial(S.floorId,S.fmt!=='natural');STONES[S.wallId]&&getMaterial(S.wallId,S.fmt!=='natural');return;}
  if(t.dataset.bond!==undefined){S.bond=t.checked;return;}
  if(t.dataset.live!==undefined){S.live=t.checked;return;}
  if(t.dataset.scale!==undefined){S.scale=clamp(+t.value/100,.5,2);return;}
  if(t.dataset.brushSize!==undefined){S.brushR=+t.value;return;}
  if(t.dataset.hc!==undefined||t.dataset.fov!==undefined||t.dataset.pitch!==undefined){
    if(t.dataset.hc!==undefined){S.hc=clamp(+t.value/100,.6,2);S.hcAuto=false;}
    if(t.dataset.fov!==undefined)S.gyro.fov=clamp(+t.value,50,85);
    if(t.dataset.pitch!==undefined)S.pitch=clamp(+t.value,0,60);
    updatePlanes();if(e.type==='change')renderDock();return;
  }
  if(t.dataset.dim){const s=curView().surfaces[S.sel];if(s){const v=clamp(parseFloat(String(t.value).replace(',','.'))||s[t.dataset.dim],.3,30);s[t.dataset.dim]=v;}}
}
function brushHint(){hint(S.brush?'<b>Børste</b>: mal over det som skal vises foran materialet. Bruk viskelær for å angre.':'Dra i hjørnene for å justere flaten.');}
function switchView(i){S.cur=i;S.sel=curView().surfaces.length?0:-1;S.selKind=curView().auto?'auto':'manual';bgKey=null;S.mark=null;S.brush=null;renderDock();hint('Bilde '+(i+1)+' av '+S.views.length+'. Samme materialvalg gjelder alle bilder.');if(!curView().auto)autoDetect(false);}

/* ---------------------------------------------------------------- automatic recognition (AI on the device) */
function maskTexture(prob,w,h){
  const u8=new Uint8Array(w*h);for(let i=0;i<u8.length;i++)u8[i]=Math.round(clamp(prob[i],0,1)*255);
  const t=mkTex();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,w,h,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,u8);return t;
}
function userLayer(){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,256,256);return c;}
function regionAvg(prob,lum){let sum=0,n=0;for(let i=0;i<prob.length;i++)if(prob[i]>.5){sum+=lum[i];n++;}return n>20?sum/n/255:.5;}
function disposeAuto(a){if(!a||!gl)return;for(const sf of a.surfaces){gl.deleteTexture(sf.maskTex);gl.deleteTexture(sf.userTex);if(sf.detail&&sf.detail.tex)gl.deleteTexture(sf.detail.tex);}}
function setMask(tex,arr,w,h){
  const u8=new Uint8Array(w*h);for(let i=0;i<u8.length;i++)u8[i]=Math.round(clamp(arr[i],0,1)*255);
  gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,w,h,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,u8);
}
function wallPlanesFor(seg,cam,Hc){
  const {w,h}=seg;
  const fp=(gx,gy)=>{const p=MA.pixelFloorPoint(gx/w*cam.vw,gy/h*cam.vh,cam.R,cam.cx,cam.cy,cam.f,Hc);return p&&Math.hypot(p[0],p[1])<30?p:null;};
  const fb=()=>{const f0=MA.pixelToWorldRay(cam.vw/2,cam.vh/2,cam.R,cam.cx,cam.cy,cam.f),hd=Math.hypot(f0[0],f0[1])||1;return {p0:[f0[0]/hd*3.5,f0[1]/hd*3.5],u:[-f0[1]/hd,f0[0]/hd]};};
  const r=MA.wallPlanes3(seg,fp,fb);r.planes=r.planes.slice(0,8);return r;
}
/* Masks: probability of floor/wall times "not a protected object" (window, door, curtain, sofa, table, rug, radiator, plant,
 * bath/sink/toilet/shower, mirror ...), kept by confidence and coherence (no area share), enlarged edge-aware to twice the grid. */
function buildAuto(seg,cam,silent,snap){
  const t0=performance.now(),{w,h,gw,gh}=seg,now=performance.now(),a={seg,cap:cam,Hc:S.hc,surfaces:[],born:now,t0:silent?-1e9:now,snap,detail:null};
  const low=p=>{const o=new Float32Array(w*h);for(let i=0;i<w*h;i++)o[i]=p[i]*(1-seg.protect[i]);return o;};
  const up=l=>MA.jointBilateralUpsample(l,w,h,seg.guide,gw,gh);
  const mk=(type,lowP,extra)=>{const hi=up(lowP);const sf={type,lowBase:lowP,base:hi,final:hi,maskTex:maskTexture(hi,gw,gh),userCanvas:userLayer(),userTex:mkTex(),userDirty:true,avg:regionAvg(lowP,seg.lum),detail:null,...extra};return sf;};
  const fk=MA.keepConfident(low(seg.floor),w,h);
  const fkeep=fk.regions.filter(r=>r.keep);
  if(fkeep.length)a.surfaces.push(mk('floor',fk.prob,{name:'Gulv',box:fkeep.reduce((b,r)=>[Math.min(b[0],r.box[0]),Math.min(b[1],r.box[1]),Math.max(b[2],r.box[2]),Math.max(b[3],r.box[3])],[w,h,0,0])}));
  const res=wallPlanesFor(seg,cam,a.Hc),lab=res.labels,wl=low(seg.wall);
  res.planes.forEach((pl,i)=>{
    const prob=new Float32Array(w*h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      let near=false;
      for(let dy=-1;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<w&&yy<h&&lab[yy*w+xx]===pl.comp){near=true;break;}}
      if(!near)continue;
      if(pl.cols&&pl.cols[x]!==pl.sub&&pl.cols[Math.max(0,x-1)]!==pl.sub&&pl.cols[Math.min(w-1,x+1)]!==pl.sub)continue;
      prob[y*w+x]=wl[y*w+x];
    }
    a.surfaces.push(mk('wall',prob,{name:'Vegg '+(i+1)+(pl.borrowed?' (del)':''),key:pl.key,p0:pl.p0,u:pl.u,fallback:pl.fallback,box:pl.box}));
  });
  const pv=document.createElement('canvas');pv.width=w;pv.height=h;const g=pv.getContext('2d'),im=g.createImageData(w,h);
  for(let i=0;i<w*h;i++){if(seg.protect[i]>.5)im.data.set([220,90,80,90],i*4);else if(seg.floor[i]>.5)im.data.set([70,150,255,120],i*4);else if(seg.cls[i]===0)im.data.set([255,170,60,120],i*4);}
  g.putImageData(im,0,0);a.preview=pv;
  // key frame for visual tracking
  a.kw=96;a.kh=Math.max(32,Math.round(96*cam.vh/cam.vw));a.kgray=snap?grayOf(snap,snap.width,snap.height,a.kw,a.kh):null;
  if(a.kgray){let m=0,q=0;for(const v of a.kgray){m+=v;q+=v*v;}m/=a.kgray.length;a.ktex=Math.sqrt(Math.max(0,q/a.kgray.length-m*m));} // texture in the key frame
  applyCorrections(a);
  S.perf.mask=Math.round(performance.now()-t0);
  return a;
}
/* ---- corrections (survive a new analysis because they are stored as directions in the room, not as pixels) ---- */
function capOfRay(a,ray){const cam=a.cap,p=MA.worldRayToPixel(ray,cam.R,cam.cx,cam.cy,cam.f);return p?[p[0]/cam.vw,p[1]/cam.vh]:null;}
function capFromCanvas(a,v,px){
  const c=cover(),cam=a.cap,vn=toNorm(px,c),d=MA.pixelToWorldRay(vn[0]*cam.vw,vn[1]*cam.vh,renderR(v),cam.cx,cam.cy,cam.f);
  const pc=MA.worldRayToPixel(d,cam.R,cam.cx,cam.cy,cam.f);if(!pc)return null;
  const sh=v.kind==='video'?TRK.shift:[0,0],n=[pc[0]/cam.vw+sh[0],pc[1]/cam.vh+sh[1]];
  return {n,ray:MA.pixelToWorldRay(n[0]*cam.vw,n[1]*cam.vh,cam.R,cam.cx,cam.cy,cam.f)};
}
function sampleHi(arr,gw,gh,nx,ny){const x=Math.min(gw-1,Math.max(0,Math.floor(nx*gw))),y=Math.min(gh-1,Math.max(0,Math.floor(ny*gh)));return arr[y*gw+x];}
function wallOwner(a,lx){ // which wall surface owns grid column lx
  let best=-1,bd=1e9;
  a.surfaces.forEach((sf,i)=>{if(sf.type!=='wall'||!sf.box)return;const b=sf.box,d=lx<b[0]?b[0]-lx:lx>b[2]?lx-b[2]:0;const cdist=d*1000+Math.abs(lx-(b[0]+b[2])/2);if(cdist<bd){bd=cdist;best=i;}});
  return best;
}
function applyCorrections(a){
  const {w,h,gw,gh,cls,guide}=a.seg,hideL=new Float32Array(w*h),addL={floor:new Float32Array(w*h),wall:new Float32Array(w*h)};
  let nh=0,na=0;
  for(const c of S.corr){
    if(c.src!=='point')continue;const n=capOfRay(a,c.ray);if(!n||n[0]<0||n[0]>1||n[1]<0||n[1]>1)continue;
    const gx=n[0]*w,gy=n[1]*h,rr=MA.regionAt(cls,w,h,gx,gy,Math.floor(w*h*.5));
    if(c.kind==='hide'&&(rr.cls===0||rr.cls===3)){ // tapped the wall/floor itself: keep a small spot visible, not the whole surface
      for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++){if(x*x+y*y>9)continue;const X=Math.floor(gx)+x,Y=Math.floor(gy)+y;if(X>=0&&Y>=0&&X<w&&Y<h)hideL[Y*w+X]=1;}nh++;continue;
    }
    const tgt=c.kind==='hide'?hideL:addL[c.type];for(let i=0;i<w*h;i++)if(rr.mask[i])tgt[i]=1;c.kind==='hide'?nh++:na++;
  }
  a.hideHi=nh?MA.jointBilateralUpsample(hideL,w,h,guide,gw,gh):null;
  a.addHi={floor:na?MA.jointBilateralUpsample(addL.floor,w,h,guide,gw,gh):null,wall:na?MA.jointBilateralUpsample(addL.wall,w,h,guide,gw,gh):null};
  // a point added to a small piece of floor/wall that the analysis had no surface for yet: create it
  if(na&&!a.surfaces.some(sf=>sf.type==='floor')&&addL.floor.some(v=>v>0)){const z=new Float32Array(w*h);a.surfaces.unshift({type:'floor',name:'Gulv',lowBase:z,base:new Float32Array(gw*gh),final:null,maskTex:maskTexture(z,w,h),userCanvas:userLayer(),userTex:mkTex(),userDirty:true,avg:.5,detail:null,box:[0,0,w,h]});}
  for(const [si,sf] of a.surfaces.entries()){
    const out=new Float32Array(gw*gh),add=a.addHi[sf.type];
    for(let y=0;y<gh;y++){const lx0=0;for(let x=0;x<gw;x++){
      const i=y*gw+x;let v=sf.base[i];
      if(add&&add[i]>0){const own=sf.type==='floor'||wallOwner(a,Math.floor(x/gw*w))===si;if(own)v=Math.max(v,add[i]);}
      if(a.hideHi)v*=1-a.hideHi[i];
      out[i]=v;}}
    sf.final=out;setMask(sf.maskTex,out,gw,gh);
  }
  // brush strokes, replayed into this analysis
  for(const sf of a.surfaces){const g=sf.userCanvas.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,256,256);sf.userDirty=true;}
  for(const c of S.corr)if(c.src==='brush')drawDab(a,c);
  composeDetail(a);
}
/* ---- local detail analysis: a second, closer analysis of the chosen area from the ORIGINAL camera picture (with context) ---- */
async function refineAt(rect,why){
  const v=curView(),a=v&&v.auto;if(!a||!a.snap||S.refining||!segMod)return;
  S.refining=true;S.aiBusy=true;busyUi();
  try{
    rect=[clamp(rect[0],0,1),clamp(rect[1],0,1),clamp(rect[2],0,1),clamp(rect[3],0,1)];
    if(rect[2]-rect[0]<.05||rect[3]-rect[1]<.05)return;
    const W=a.snap.width,H=a.snap.height,t0=performance.now();
    const cs=await segMod.segmentRect(a.snap,rect[0]*W,rect[1]*H,(rect[2]-rect[0])*W,(rect[3]-rect[1])*H,MOBILE?512:640,()=>{});
    if(!root||curView().auto!==a)return; // a newer analysis replaced this one
    a.detail={rect,cs};composeDetail(a);
    S.perf.refine=Math.round(performance.now()-t0);camLog('detaljanalyse '+(why||'')+': '+S.perf.refine+' ms, utsnitt '+Math.round((rect[2]-rect[0])*W)+'x'+Math.round((rect[3]-rect[1])*H)+' px');
  }catch(e){camLog('detaljanalyse feilet: '+(e&&e.message||e));}
  finally{S.refining=false;S.aiBusy=false;busyUi();}
}
function composeDetail(a){
  if(!a.detail)return;const {rect,cs}=a.detail,{w,h,gw,gh}=cs,RW=rect[2]-rect[0],RH=rect[3]-rect[1];
  for(const [si,sf] of a.surfaces.entries()){
    const lowC=new Float32Array(w*h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=y*w+x,p=(sf.type==='floor'?cs.floor[i]:cs.wall[i])*(1-cs.protect[i]);
      const nx=rect[0]+(x+.5)/w*RW,ny=rect[1]+(y+.5)/h*RH;
      // keep walls/planes apart: only where this surface (incl. corrections) exists nearby in the whole-room result
      let m=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)m=Math.max(m,sampleHi(sf.final,a.seg.gw,a.seg.gh,nx+dx/a.seg.gw,ny+dy/a.seg.gh));
      lowC[i]=m>.15?p:0;
    }
    const hi=MA.jointBilateralUpsample(lowC,w,h,cs.guide,gw,gh),add=a.addHi&&a.addHi[sf.type];
    for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){
      const i=y*gw+x,nx=rect[0]+(x+.5)/gw*RW,ny=rect[1]+(y+.5)/gh*RH;
      if(add){const av=sampleHi(add,a.seg.gw,a.seg.gh,nx,ny);if(av>0&&(sf.type==='floor'||wallOwner(a,Math.floor(nx*a.seg.w))===si))hi[i]=Math.max(hi[i],av);}
      if(a.hideHi)hi[i]*=1-sampleHi(a.hideHi,a.seg.gw,a.seg.gh,nx,ny);
    }
    if(!sf.detail)sf.detail={tex:mkTex(),rect};sf.detail.rect=rect;setMask(sf.detail.tex,hi,gw,gh);
  }
}
/* camera height / field of view / pitch changed: refit the wall planes from the stored segmentation (cheap, no new AI run) */
function updatePlanes(){
  const v=curView(),a=v&&v.auto;if(!a)return;
  a.Hc=S.hc;a.cap.f=MA.focalPx(Math.max(a.cap.vw,a.cap.vh),S.gyro.fov);
  if(!a.cap.gyro)a.cap.R=MA.orientationMatrix(0,90-S.pitch,0);
  const res=wallPlanesFor(a.seg,a.cap,a.Hc);
  for(const sf of a.surfaces){if(sf.type!=='wall')continue;const pl=res.planes.find(x=>x.key===sf.key);if(pl){sf.p0=pl.p0;sf.u=pl.u;sf.fallback=pl.fallback;}}
}
/* ---- tap to choose: + include this (small) surface, - keep this object visible; with undo ---- */
function commitPick(){
  const v=curView(),a=v&&v.auto,dpr=cv.width/ov.getBoundingClientRect().width,px=[S.loupe.x*dpr,S.loupe.y*dpr];
  if(S.refMode){refPoint(px);return;}
  if(!a){hint('Vent til rommet er analysert.');return;}
  const q=capFromCanvas(a,v,px);if(!q||q.n[0]<0||q.n[0]>1||q.n[1]<0||q.n[1]>1)return;
  const c=a.seg.cls[Math.min(a.seg.h-1,Math.floor(q.n[1]*a.seg.h))*a.seg.w+Math.min(a.seg.w-1,Math.floor(q.n[0]*a.seg.w))];
  const type=c===3?'floor':c===0?'wall':S.matType;
  S.corr.push({src:'point',kind:S.pick,ray:q.ray,type,t:Date.now()});
  applyCorrections(a);
  hint(S.pick==='add'?'Tatt med som '+(type==='floor'?'gulv':'vegg')+'. Finjusterer kanten med en nærmere analyse …':'Holdes synlig. Finjusterer kanten med en nærmere analyse …');
  const half=.17,hy=half*a.cap.vw/a.cap.vh;
  S.refineReq={ray:q.ray,half};
  refineAt([q.n[0]-half,q.n[1]-hy,q.n[0]+half,q.n[1]+hy],'rundt punktet');
  renderDock();
}
function undoCorrection(){
  const last=S.corr[S.corr.length-1];if(!last){hint('Ingenting å angre.');return;}
  if(last.src==='brush'){const g=last.g;S.corr=S.corr.filter(c=>!(c.src==='brush'&&c.g===g));}else S.corr.pop();
  const a=curView()&&curView().auto;if(a)applyCorrections(a);hint('Angret.');renderDock();
}
/* ---- known reference length on the floor -> camera height (scale) ---- */
function refPoint(px){
  const v=curView(),a=v&&v.auto;if(!a)return;const q=capFromCanvas(a,v,px);if(!q)return;
  S.refPts.push([q.n[0]*a.cap.vw,q.n[1]*a.cap.vh]);if(S.refPts.length>2)S.refPts=S.refPts.slice(-2);
  hint(S.refPts.length<2?'Trykk på det andre punktet på gulvet.':'Skriv inn den virkelige avstanden mellom punktene under «Flater».');renderDock();
}
function applyReference(cm){
  const v=curView(),a=v&&v.auto;if(!a||S.refPts.length<2)return;
  const Hc=MA.heightFromReference(S.refPts[0],S.refPts[1],cm/100,a.cap.R,a.cap.cx,a.cap.cy,a.cap.f);
  if(!Hc||Hc<.3||Hc>3){hint('<span class="tr-warn">Kunne ikke bruke målet.</span> Velg to punkter som ligger på gulvet.');return;}
  S.hc=Hc;S.hcAuto=false;S.hcSource='ref';S.refMode=null;S.refPts=[];updatePlanes();
  hint('Skala satt fra referansemål: kamerahøyde '+Hc.toFixed(2).replace('.',',')+' m.');renderDock();
}
async function autoDetect(silent){
  silent=silent===true;
  const view=curView(),src=source();
  if(!view||!src||S.autoBusy){if(!silent&&!S.autoBusy)hint('Kameraet er ikke klart ennå.');return;}
  S.autoBusy=true;S.aiBusy=true;busyUi();if(!silent)renderDock();
  const status=m=>{if(!silent)hint('<b>'+esc(m)+'</b>');};
  try{
    segMod=segMod||await import('./tryroom-seg-v1.js?v=4');
    const useGyro=view.kind==='video'?(S.gyro.on&&!!S.gyro.now):!!view.capR;
    const R=view.kind==='video'?(useGyro?S.gyro.now.slice():MA.orientationMatrix(0,90-S.pitch,0)):(view.capR?view.capR.slice():MA.orientationMatrix(0,90-S.pitch,0));
    const snap=document.createElement('canvas');snap.width=src.w;snap.height=src.h;snap.getContext('2d').drawImage(src.el,0,0);
    const seg=await segMod.segment(snap,src.w,src.h,MOBILE?672:768,status);
    S.perf.seg=seg.ms;if(!silent)camLog('analyse: '+seg.ms+' ms, inndata '+(seg.input||[]).join('x')+(seg.letterbox?' (letterbox)':''));
    if(!root||!gl)return;
    const cam={R,cx:src.w/2,cy:src.h/2,f:MA.focalPx(Math.max(src.w,src.h),S.gyro.fov),vw:src.w,vh:src.h,gyro:useGyro};
    // camera height from the picture itself (floor line + ceiling line, assumed ceiling 2.5 m): adapts when you sit, stand or bend
    if(S.hcAuto){
      const est=MA.estimateCameraHeight(seg,cam,2.5);
      if(est&&est>.6&&est<2.4){S.hc=S.hcMeasured?S.hc*.5+est*.5:est;S.hcMeasured=true;S.hcNote='estimert fra gulv- og taklinje, antar takhøyde 2,5 m';}
      else S.hcNote=S.hcMeasured?'siste estimat':'standardverdi, ikke målt';
    }
    const na=buildAuto(seg,cam,silent,snap);
    // stale result: the camera has moved so much while the AI worked that the result can no longer be aligned -> discard it
    if(view.kind==='video'&&video&&video.readyState>=2&&na.kgray){
      const {m}=measureTrack(na,S.gyro.on?S.gyro.now:cam.R);
      if(m.score<.45){camLog('resultat forkastet: kameraet har flyttet seg for mye under analysen (match '+m.score.toFixed(2)+')');disposeAuto(na);S.lastAuto=0;return;}
    }
    const prev=view.auto;view.auto=na;disposeAuto(prev);TRK.shift=[0,0];TRK.bad=0;TRK.target=1;TRK.lostAt=0;
    // redo the last local detail analysis on the new picture (only for analyses the user started)
    if(S.refineReq&&!silent){const n=capOfRay(na,S.refineReq.ray);if(n){const hh=S.refineReq.half,hy=hh*cam.vw/cam.vh;setTimeout(()=>refineAt([n[0]-hh,n[1]-hy,n[0]+hh,n[1]+hy],'på nytt'),50);}}
    S.autoSel=silent?clamp(S.autoSel,0,Math.max(0,view.auto.surfaces.length-1)):0;S.selKind='auto';
    {const fl=view.auto.surfaces.some(x=>x.type==='floor'),nw=view.auto.surfaces.filter(x=>x.type==='wall').length;
     coach.chips([['Gulv',fl],[nw?nw+(nw>1?' vegger':' vegg'):'Vegger',nw>0]]);
     if(!fl&&!nw)coach.set('hold','Pek mot rommet, med godt lys');
     else if(!fl)coach.set('floor','Pek litt mer ned mot gulvet');
     else if(!nw)coach.set('up','Løft mobilen så veggen synes');
     else if(coach.step&&coach.step!=='done')coach.set('done','Gulv og vegger funnet');}
    if(!view.auto.surfaces.some(x=>x.type===S.matType))S.matType=view.auto.surfaces.some(x=>x.type==='floor')?'floor':'wall';
    if(!silent){
      const fl=view.auto.surfaces.some(x=>x.type==='floor'),nw=view.auto.surfaces.filter(x=>x.type==='wall').length,fb=view.auto.surfaces.some(x=>x.fallback);
      if(!fl&&!nw)hint('<span class="tr-warn">Fant verken gulv eller vegg.</span> Rett kameraet slik at gulv og vegg er tydelig i bildet, med godt lys, og trykk «Finn flater på nytt». Du kan også markere flaten selv.');
      else hint('<b>Fant '+(fl?'gulv':'')+(fl&&nw?' og ':'')+(nw?nw+(nw>1?' vegger':' vegg'):'')+'</b> ('+(seg.ms/1000).toFixed(1)+' s). Blått er gulv, oransje er vegg. Møbler og inventar holdes utenfor. Kamerahøyde: '+S.hc.toFixed(2).replace('.',',')+' m ('+(S.hcSource==='ref'?'fra referansemål':S.hcAuto?S.hcNote:'satt av deg')+').'+(fb?' <span class="tr-warn">Veggens plassering er et anslag fordi gulvlinjen ikke er synlig.</span>':'')+(useGyro?'':' <span class="tr-warn">Uten bevegelsessensor må du stille inn kameravinkelen selv.</span>'));
    }
  }catch(err){
    console.error('Stenhuset AI-gjenkjenning feilet',err);camLog('AI-FEIL: '+(err&&err.message||err));
    if(!silent)hint('<span class="tr-warn">Automatisk gjenkjenning feilet:</span> '+esc(err&&err.message||String(err))+'. Sjekk nettverket og prøv igjen, eller marker flaten selv.');
  }finally{S.autoBusy=false;S.aiBusy=false;S.lastAuto=performance.now();if(root){busyUi();renderDock();}}
}
/* live: re-analyse when the phone has turned noticeably or the result is old (never while frozen or after hand corrections) */
function autoTick(now,view){
  const a=view.auto;
  if(!S.live||S.autoBusy||S.refining||S.frozen||view.kind!=='video'||!a||!segMod||drag)return;
  if(now-(S.lastAuto||0)<2500)return;
  const turned=S.gyro.on&&S.gyro.now&&a.cap.gyro?MA.rotAngle(a.cap.R,S.gyro.now)>10*Math.PI/180:false;
  if(turned||now-a.born>7000)autoDetect(true);
}

/* ---------------------------------------------------------------- mode: camera */
async function startCamera(){
  S.mode='camera';
  try{
    if(!gl)setupGL();bind();
    // iOS requires a user gesture for motion permission
    if(S.caps.gyro&&typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){
      try{S.gyro.perm=await DeviceOrientationEvent.requestPermission();}catch(e){S.gyro.perm='denied';}
    }
    S.camErr=false;S.firstFrame=false;camLines.length=0;
    try{const pst=navigator.permissions&&await navigator.permissions.query({name:'camera'});if(pst){camLog('kameratillatelse: '+pst.state);if(pst.state==='denied'){const e=new Error('Kameraet er blokkert i nettleserens innstillinger');e.name='NotAllowedError';throw e;}}}catch(e){if(e&&e.name==='NotAllowedError')throw e;}
    camLog('start: '+navigator.userAgent.replace(/.*\(([^)]*)\).*Chrome\/([\d.]+).*/,'$1 Chrome $2')+(window.isSecureContext?'':' (IKKE https)'));
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1600},height:{ideal:1200},aspectRatio:{ideal:4/3}},audio:false});
    {const tr=stream.getVideoTracks()[0],se=tr&&tr.getSettings?tr.getSettings():{};camLog('kamera gitt: '+(tr?tr.label:'?')+' '+(se.width||'?')+'x'+(se.height||'?')+(se.zoom!=null?' zoom '+se.zoom:''));}
    await wideAngle(stream);
    camLog('zoom: '+(S.zoomCaps?'optisk '+S.zoomCaps.min+'–'+S.zoomCaps.max+', valgt '+S.zoom:'kun digital')+', synsfelt '+S.gyro.fov.toFixed(0)+'°');
    video=document.createElement('video');video.className='tr-video';video.playsInline=true;video.muted=true;video.autoplay=true;
    video.setAttribute('playsinline','');video.setAttribute('muted','');video.srcObject=stream;
    root.querySelector('.tr-stage').prepend(video);
    await Promise.race([video.play(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('video.play() svarte ikke innen 5 s')),5000))]);
    camLog('video spiller: '+video.videoWidth+'x'+video.videoHeight+' readyState '+video.readyState);
    setTimeout(()=>{
      if(!root||S.mode!=='camera'||S.firstFrame)return;
      camLog('INGEN bilder fra kameraet etter 4 s (readyState '+(video?video.readyState:'-')+', '+(video?video.videoWidth+'x'+video.videoHeight:'-')+')');
      cameraError('Kameraet viser ikke bilde','Kameraet startet, men det kommer ikke bilder. Lukk andre apper som bruker kameraet, og prøv igjen.',null);
    },4000);
    S.views=[{kind:'video',surfaces:[]}];S.cur=0;S.sel=-1;bgKey=null;
    startGyro();
    sheet().style.display='none';renderDock();
    hint('<b>Kamera er på.</b> Hold mobilen stående og vis gulv og vegger rolig. Rommet analyseres automatisk om et øyeblikk.'+(S.gyro.on?'':' <span class="tr-warn">Bevegelsessensor mangler eller er avslått: bildet følger ikke når du dreier mobilen. Bruk «Frys bilde» for å justere.</span>'));
    if(!raf)raf=requestAnimationFrame(frame);
    coach.set('hold','Hold mobilen stående og rolig mot rommet');
    root.querySelector('.tr-zoom').hidden=false;zoomLabel();
    setTimeout(()=>{if(root&&S.mode==='camera'&&!S.autoBusy&&!curView().auto)autoDetect(false);},900);
  }catch(err){
    camLog('FEIL: '+(err&&(err.name+': '+err.message)||err));
    const denied=err&&(err.name==='NotAllowedError'||err.name==='SecurityError');
    cameraError(denied?'Kameraet er blokkert for denne siden':'Fikk ikke tak i kameraet',denied?'Nettleseren har blokkert kameraet for setai.no, ofte fordi en tidligere forespørsel ble avvist. Slik slår du det på igjen:':'Kameraet eller grafikken kunne ikke startes. Lukk andre apper som bruker kameraet, og prøv igjen.',err,denied);
  }
}
function cameraError(title,text,err,denied){
  S.camErr=true;camLog('vist feilmelding: '+title);
  stopStream();stopGyro();
  if(!root)return;
  sheet().style.display='';dock().hidden=true;const z=root.querySelector('.tr-zoom');if(z)z.hidden=true;if(coach)coach.hide();
  sheet().innerHTML=`<h2>${esc(title)}</h2><p>${esc(text)}</p>${denied?'<ol style="font-size:13.5px;line-height:1.7;color:#ddd8cf;padding-left:20px;max-width:560px"><li>Trykk på ikonet til venstre for adressen (lås eller innstillinger).</li><li>Velg <b>Tillatelser</b> eller <b>Nettstedsinnstillinger</b>.</li><li>Sett <b>Kamera</b> til <b>Tillat</b>.</li><li>Kom tilbake hit og trykk «Prøv kameraet igjen».</li></ol><p style="font-size:12px;color:#aaa49a">Får du ikke valget, sjekk også at Chrome har lov til å bruke kameraet: Innstillinger på telefonen → Apper → Chrome → Tillatelser → Kamera.</p>':''}${err?`<p style="font-size:11px;color:#8a857c">Teknisk: ${esc(err.name+': '+err.message)}</p>`:''}
    <button class="tr-btn pri" data-act="photo-retry-cam" style="min-height:50px">Prøv kameraet igjen</button>
    <details style="max-width:560px;margin-top:16px"><summary style="cursor:pointer;font-size:12px;color:#ffd9a0">Feilsøkingslogg</summary><pre class="tr-logpre" style="white-space:pre-wrap;font:10.5px/1.4 monospace;background:#000a;padding:8px;color:#bfe9d0;margin:8px 0">${esc(camLines.join('\n'))}</pre><button class="tr-btn" data-act="copy-log">Kopier loggen</button></details>`;
  hint('Kamera ikke i bruk.');
}
const fovForZoom=(fov,zOld,zNew)=>2*Math.atan(Math.tan(fov*Math.PI/360)*zOld/zNew)*180/Math.PI;
async function wideAngle(st){
  S.track=null;S.zoomCaps=null;S.zoom=S.zoomApplied=1;S.dzoom=1;
  try{
    const t=st.getVideoTracks()[0],c=t.getCapabilities&&t.getCapabilities();S.track=t;
    if(c&&c.zoom&&c.zoom.max>c.zoom.min){
      S.zoomCaps={min:c.zoom.min,max:Math.min(c.zoom.max,4)};
      await t.applyConstraints({advanced:[{zoom:c.zoom.min}]});
      S.gyro.fov=Math.min(110,fovForZoom(S.gyro.fov,1,c.zoom.min)); // the 65 degree default is for 1x
      S.zoom=S.zoomApplied=c.zoom.min;
    }
  }catch(e){}
}
/* zoom: optical (camera zoom) when the phone allows it, otherwise digital (enlarges the picture on screen) */
let zoomBusy=false,zoomT=0;
const zoomValue=()=>S.zoomCaps?S.zoom:S.dzoom;
function zoomLabel(){const el=root&&root.querySelector('.tr-zoom span');if(el)el.textContent=String(Math.round(zoomValue()*10)/10).replace('.',',')+'×';}
async function setZoom(z){
  if(S.zoomCaps&&S.track){
    z=clamp(z,S.zoomCaps.min,S.zoomCaps.max);
    if(Math.abs(z-S.zoom)<.02){if(z<=S.zoomCaps.min+.01)hint('Dette er det videste kameraet kan vise.');return;}
    S.zoom=z;zoomLabel();
    if(zoomBusy)return;zoomBusy=true;
    for(;;){
      const target=S.zoom;
      try{await S.track.applyConstraints({advanced:[{zoom:target}]});S.gyro.fov=fovForZoom(S.gyro.fov,S.zoomApplied,target);S.zoomApplied=target;}catch(e){break;}
      if(S.zoom===target)break;
    }
    zoomBusy=false;
    // the picture itself changed: redo the analysis once the zoom has settled
    clearTimeout(zoomT);
    zoomT=setTimeout(()=>{const v=curView();if(root&&v&&v.kind==='video'){disposeAuto(v.auto);v.auto=null;v.surfaces=[];S.sel=-1;renderDock();autoDetect(false);}},600);
  }else{
    z=clamp(z,1,3);
    if(Math.abs(z-S.dzoom)<.01){if(z<=1.001)hint('Dette er hele kamerabildet. Mobilen kan ikke zoome lenger ut.');return;}
    S.dzoom=z;zoomLabel();
  }
}
function stopStream(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}if(video){video.srcObject=null;video.remove();video=null;}}
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
/* ---------------------------------------------------------------- mode: WebXR AR (separate module, loaded only when chosen) */
async function startXR(){
  try{
    xrMod=xrMod||await import('./tryroom-ar-v1.js?v=10');
    close(true);
    await xrMod.start({
      S,PREC,MATFN,FORMATS,GROUTS,STONES,generateStone,T,materials:MATS(),
      loadSeg:()=>import('./tryroom-seg-v1.js?v=4'),
      onEnd:info=>{
        if(!info||info.userEnd||info.quote)return;
        // the system (or an error) ended the AR session: come back to the start screen and show why
        open(true).then(()=>{showStart();hint('<span class="tr-warn">AR-økten ble avsluttet etter '+(info.seconds||0).toFixed(1)+' s uten at du valgte det.</span> Loggen under viser hvorfor.');});
      },
      onFallback:()=>{open(true).then(()=>startCamera());},
      onQuote:(info)=>{open(true).then(()=>{S.xr=info;S.floorId=info.floorId||S.floorId;S.wallId=info.wallId||S.wallId;quote();});}
    });
  }catch(e){
    console.warn('Stenhuset AR:',e);
    if(!root)await open(true);
    if(S.caps.cam&&S.caps.secure){hint('<span class="tr-warn">AR kunne ikke startes ('+esc(e&&e.message||'ukjent feil')+'). Bruker vanlig kamera i stedet.</span>');await startCamera();}
    else{showStart();hint('<span class="tr-warn">AR kunne ikke startes: '+esc(e&&e.message||'ukjent feil')+'</span>');}
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
function frameNow(){const v=curView(),c=cover();drawBackground(v);drawAuto(v,c);v.surfaces.forEach(s=>drawSurface(s,c));}
function catalog(){return catalogP||(catalogP=fetch('catalog-v1.json').then(r=>r.json()).catch(()=>null));}
async function quote(){
  const cat=await catalog(),mats=MATS();
  const used=[];const v=S.views.flatMap(x=>x.surfaces);
  const add=(type,id)=>{const m=mats.find(x=>x.id===id);if(!m)return;
    const same=v.filter(s=>s.type===type);const area=same.length?same.map(s=>s.w*s.h):null;
    const hits=cat?cat.products.filter(p=>p.n.toLowerCase().startsWith(m.name.toLowerCase())):[];
    used.push({type,m,hits,area});};
  const au=S.views.map(x=>x.auto).filter(Boolean).flatMap(a=>a.surfaces);
  if(v.some(s=>s.type==='floor')||au.some(s=>s.type==='floor')||(S.xr&&S.xr.floor))add('floor',S.floorId);
  if(v.some(s=>s.type==='wall')||au.some(s=>s.type==='wall')||(S.xr&&S.xr.wall))add('wall',S.wallId);
  if(!used.length){hint('<span class="tr-warn">Marker minst én flate først, så tar vi med materialet i forespørselen.</span>');return;}
  const lines=used.map(u=>{
    const link=u.hits.length===1?u.hits[0].u:u.hits.length>1?'flere varianter i butikken, velg format hos Stenhuset':'ingen sikker produktkobling funnet';
    const dims=u.area?' · flate oppgitt av kunde, ikke målt: ca. '+u.area.reduce((a,b)=>a+b,0).toFixed(1)+' m²':'';
    return (u.type==='floor'?'Gulv: ':'Vegg: ')+u.m.name+(u.hits.length===1?' (produkt-ID '+u.hits[0].id+')':'')+' – '+link+dims;
  });
  const label='Prøv i mitt rom – '+lines.join(' | ')+' | Innstillinger: '+(FORMATS.find(f=>f[0]===S.fmt)[1])+', legging '+S.rot+'°'+(S.bond?', forband':'')+'. Mengde må bekreftes med eget oppmål.';
  if(typeof window.addItem==='function')window.addItem({kind:'tryroom',id:'tryroom-'+Date.now(),label});
  try{localStorage.setItem('stenhuset_tryroom',JSON.stringify({floor:S.floorId,wall:S.wallId,fmt:S.fmt,rot:S.rot,bond:S.bond,grout:S.grout,scale:S.scale,saved:new Date().toISOString()}));}catch(e){}
  S.xr=null;close();
  if(typeof window.showContact==='function')window.showContact();
}

/* ---------------------------------------------------------------- open / close */
export async function open(skipStart){
  if(root)return;
  injectCss();buildRoot();
  S.caps=await detect();
  if(S.caps.xr&&/[?&]ar\b/.test(location.search)&&!xrMod)import('./tryroom-ar-v1.js?v=10').then(m=>{xrMod=m;}).catch(()=>{});
  if(!skipStart)showStart();
}
export function close(keepRoot){
  stopStream();stopGyro();cancelAnimationFrame(raf);raf=0;
  window.removeEventListener('keydown',onKey);window.removeEventListener('resize',resize);
  if(gl){const ext=gl.getExtension('WEBGL_lose_context');if(ext&&!keepRoot)ext.loseContext();}
  if(root){root.remove();root=null;}
  document.documentElement.style.overflow='';
  S.corr=[];S.pick=null;S.refMode=null;S.refPts=[];S.loupe=null;S.refineReq=null;TRK.shift=[0,0];TRK.fade=1;TRK.target=1;TRK.lostAt=0;
  gl=null;P={};tex={};matCache.clear();bgKey=null;S.views=[];S.mark=null;S.brush=null;S.frozen=false;S.sel=-1;S.msg='';drag=null;photoInput=null;
}
