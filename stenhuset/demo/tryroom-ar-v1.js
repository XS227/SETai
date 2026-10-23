/* Stenhuset "Prøv i mitt rom": Live AR + automatic recognition, combined.
 *
 * - WebXR gives true 6DoF tracking (phone position AND rotation, in metres) and hit-tests that measure the real floor height.
 * - WebXR Raw Camera Access ("camera-access", Chrome Android) hands us the camera picture; every second or so we copy a small
 *   version, run the on-device segmentation model (tryroom-seg-v1.js) and get floor / wall / everything-else masks.
 * - The masks are stored with the pose they were taken at. Each screen pixel is turned into a world ray, intersected with the
 *   floor plane or a fitted wall plane, projected back into the captured picture and masked there. So the material sticks to the
 *   room when you walk, and sofas, sinks, rugs etc. (which are not wall/floor in the mask) stay in front of it.
 * - Wall planes are fitted from the floor/wall boundary in the mask, in real world coordinates; inside corners give several planes.
 * Based on: W3C WebXR Raw Camera Access (XRView.camera, XRWebGLBinding.getCameraImage, image aligned with the view frustum) and the
 * three.js example webxr_ar_camera_access (per-frame getCameraImage). Rendering is plain WebGL, no three.js.
 * Not verified on a physical phone in this build. Needs Chrome on an ARCore-capable Android phone. */
import * as MA from './tryroom-math-v1.js?v=5';

const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const hex3=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const MOBILE=typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches;

const VS='attribute vec2 a;varying vec2 v_uv;void main(){v_uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}';
const FS_BLIT='precision mediump float;varying vec2 v_uv;uniform sampler2D u_cam;void main(){gl_FragColor=vec4(texture2D(u_cam,v_uv).rgb,1.);}';
const FS_AR=(PREC,MATFN,wall)=>PREC+(wall?'#define WALL\n':'')+`uniform mat4 u_invVP,u_VPcap;uniform vec3 u_o;uniform vec4 u_vp;uniform vec2 u_P0,u_u;uniform float u_floorY,u_gain;uniform sampler2D u_mask;`+MATFN+`
vec3 rayDir(vec2 fc){
 vec2 ndc=(fc-u_vp.xy)/u_vp.zw*2.-1.;
 vec4 n=u_invVP*vec4(ndc,-1.,1.);vec4 f=u_invVP*vec4(ndc,1.,1.);
 return normalize(f.xyz/f.w-n.xyz/n.w);}
vec3 planeUV(vec3 d,out vec3 P){
 P=u_o;
#ifdef WALL
 vec2 n=vec2(-u_u.y,u_u.x);float den=dot(n,d.xz);if(abs(den)<1e-3)return vec3(0.);
 float t=dot(n,u_P0-u_o.xz)/den;if(t<=0.)return vec3(0.);
 P=u_o+d*t;float h=P.y-u_floorY;if(h<-.1||h>3.4)return vec3(0.);
 return vec3(dot(u_u,P.xz-u_P0),h,1.);
#else
 if(d.y>-.02)return vec3(0.);
 float t=(u_floorY-u_o.y)/d.y;P=u_o+d*t;return vec3(P.xz,1.);
#endif
}
void main(){
 vec3 P;vec3 d=rayDir(gl_FragCoord.xy);vec3 q=planeUV(d,P);if(q.z<.5)discard;
 vec4 c=u_VPcap*vec4(P,1.);if(c.w<=0.)discard;
 vec2 nd=c.xy/c.w;if(abs(nd.x)>1.||abs(nd.y)>1.)discard;
 float prob=texture2D(u_mask,vec2(nd.x*.5+.5,.5-nd.y*.5)).r;
 float alpha=smoothstep(.42,.58,prob);if(alpha<=.003)discard;
#ifndef WALL
 alpha*=1.-smoothstep(9.,18.,length(P-u_o));
#endif
 vec3 P2;vec3 q2=planeUV(rayDir(gl_FragCoord.xy+vec2(1.,0.)),P2);vec3 P3;vec3 q3=planeUV(rayDir(gl_FragCoord.xy+vec2(0.,1.)),P3);
 float mpp=.01;if(q2.z>.5&&q3.z>.5)mpp=max(length(q2.xy-q.xy),length(q3.xy-q.xy));
 gl_FragColor=vec4(matColor(q.xy,mpp)*u_gain,alpha);}`;

/* Plane mode (no camera picture): ARCore hit-test hits decide what is floor, wall or furniture top, and are accumulated into a map. */
const FS_PL=(PREC,MATFN,wall)=>PREC+(wall?'#define WALL\n':'')+`uniform mat4 u_invVP;uniform vec3 u_o,u_mk;uniform vec4 u_vp;uniform vec2 u_n,u_s;uniform float u_floorY,u_gain,u_d,u_H,u_dok;uniform mat4 u_V;uniform sampler2D u_mask,u_depth;`+MATFN+`
vec3 rayDir(vec2 fc){
 vec2 ndc=(fc-u_vp.xy)/u_vp.zw*2.-1.;
 vec4 n=u_invVP*vec4(ndc,-1.,1.);vec4 f=u_invVP*vec4(ndc,1.,1.);
 return normalize(f.xyz/f.w-n.xyz/n.w);}
vec3 planeUV(vec3 d,out vec3 P){
 P=u_o;
#ifdef WALL
 float den=dot(u_n,d.xz);if(abs(den)<1e-3)return vec3(0.);
 float t=(u_d-dot(u_n,u_o.xz))/den;if(t<=0.)return vec3(0.);
 P=u_o+d*t;vec2 tg=vec2(-u_n.y,u_n.x);
 return vec3(dot(tg,P.xz),P.y-u_floorY,1.);
#else
 if(d.y>-.02)return vec3(0.);
 float t=(u_floorY-u_o.y)/d.y;P=u_o+d*t;return vec3(P.xz,1.);
#endif
}
void main(){
 vec3 P;vec3 d=rayDir(gl_FragCoord.xy);vec3 q=planeUV(d,P);if(q.z<.5)discard;
 float alpha;
#ifdef WALL
 alpha=smoothstep(0.,.12,q.x-u_s.x)*smoothstep(0.,.12,u_s.y-q.x)*smoothstep(-.03,.08,q.y)*smoothstep(0.,.15,u_H-q.y);
#else
 vec2 mu=(P.xz-u_mk.xy)/u_mk.z+.5;if(mu.x<0.||mu.x>1.||mu.y<0.||mu.y>1.)discard;
 vec2 mb=texture2D(u_mask,mu).rg;
 alpha=smoothstep(.3,.6,mb.r*(1.-mb.g))*(1.-smoothstep(9.,18.,length(P-u_o)));
#endif
 if(alpha<=.003)discard;
 // depth occlusion: where the measured depth is clearly nearer than this plane, something stands in front (furniture, curtain, person);
 // clearly farther = a recess (window). Depth values are metres along the view axis, packed in two 8-bit channels.
 if(u_dok>.5){
  float zv=-(u_V*vec4(P,1.)).z;
  vec2 sv=vec2((gl_FragCoord.x-u_vp.x)/u_vp.z,1.-(gl_FragCoord.y-u_vp.y)/u_vp.w);
  vec2 dd=texture2D(u_depth,sv).ra;
  float zm=(dd.x*255.+dd.y*255.*256.)/65535.*12.;
  if(zm>.15){float tol=.12+.07*zv;float diff=zv-zm;alpha*=1.-smoothstep(tol*.7,tol*1.5,diff);alpha*=1.-smoothstep(tol*2.5,tol*5.,-diff);}
  if(alpha<=.003)discard;
 }
 vec3 P2;vec3 q2=planeUV(rayDir(gl_FragCoord.xy+vec2(1.,0.)),P2);vec3 P3;vec3 q3=planeUV(rayDir(gl_FragCoord.xy+vec2(0.,1.)),P3);
 float mpp=.01;if(q2.z>.5&&q3.z>.5)mpp=max(length(q2.xy-q.xy),length(q3.xy-q.xy));
 gl_FragColor=vec4(matColor(q.xy,mpp)*u_gain,alpha);}`;

export async function start(opt){
  const {S,PREC,MATFN,FORMATS,GROUTS,STONES,generateStone,T,materials}=opt;
  const T0=performance.now(),logLines=[];let dbgEl=null,userEnd=false,quoteEnd=false;
  const log=m=>{
    const line=((performance.now()-T0)/1000).toFixed(1)+'s '+m;logLines.push(line);if(logLines.length>60)logLines.shift();console.log('[AR]',m);
    if(dbgEl)dbgEl.textContent=logLines.slice(-7).join('\n');
    try{sessionStorage.setItem('tr_ar_log',JSON.stringify({t:Date.now(),lines:logLines}));}catch(e){}
  };
  const onErr=e=>log('FEIL: '+(e.message||e.reason&&e.reason.message||e.reason||'ukjent'));
  window.addEventListener('error',onErr);window.addEventListener('unhandledrejection',onErr);
  log('start; '+navigator.userAgent.replace(/.*\(([^)]*)\).*Chrome\/([\d.]+).*/,'$1 Chrome $2'));
  if(!navigator.xr||!(await navigator.xr.isSessionSupported('immersive-ar')))throw new Error('Live AR støttes ikke på denne enheten.');

  /* ---------------- DOM overlay UI ---------------- */
  const ui=document.createElement('div');
  ui.style.cssText='position:fixed;inset:0;z-index:2147483300;font-family:var(--sans,system-ui,sans-serif);color:#fff;pointer-events:none';
  ui.innerHTML=`<style>
  .ar-b{pointer-events:auto;border:1px solid #ffffff66;background:#000b;color:#fff;padding:11px 12px;min-height:44px;font:700 10.5px/1 var(--sans,system-ui);letter-spacing:.08em;text-transform:uppercase}
  .ar-b.pri{background:#f0e9de;color:#242725;border-color:#f0e9de}.ar-b.on{background:#fff;color:#242725}
  .ar-top{position:absolute;left:10px;right:10px;top:max(10px,env(safe-area-inset-top));display:flex;gap:8px;align-items:flex-start}
  .ar-hint{flex:1;background:#000b;padding:10px 12px;font-size:13px;line-height:1.45;pointer-events:auto}
  .ar-bot{position:absolute;left:0;right:0;bottom:0;background:#000c;padding:8px 10px max(10px,env(safe-area-inset-bottom));pointer-events:auto;max-height:44vh;overflow:auto}
  .ar-row{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
  .ar-strip{display:flex;gap:8px;overflow-x:auto;margin-bottom:8px}
  .ar-c{flex:none;width:58px;border:3px solid transparent;background:none;color:#fff;font-size:9px;padding:0;pointer-events:auto}.ar-c.on{border-color:#fff}
  .ar-c i{display:block;aspect-ratio:1;background:var(--slab)}.ar-c em{display:block;font-style:normal;margin-top:3px;line-height:1.2}
  .ar-sel{pointer-events:auto;background:#2a2b29;color:#fff;border:1px solid #ffffff55;min-height:44px;padding:6px;font:inherit}
  .ar-g{display:flex;gap:6px}.ar-g button{width:36px;height:36px;border:3px solid transparent;padding:0;pointer-events:auto}.ar-g button.on{border-color:#fff}
  .ar-dbg{position:absolute;left:10px;right:10px;top:max(72px,calc(env(safe-area-inset-top) + 64px));margin:0;font:10px/1.35 monospace;color:#bfe9d0;background:#000a;padding:6px;max-height:24vh;overflow:hidden;white-space:pre-wrap;pointer-events:none}
  .ar-busy{position:absolute;left:50%;top:84px;transform:translateX(-50%);background:#000c;padding:7px 12px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;display:none}
  </style>
  <div class="ar-top"><button class="ar-b" data-x="end" aria-label="Avslutt AR">✕</button><div class="ar-hint" data-x="hint"></div></div>
  <pre class="ar-dbg" data-x="dbg"></pre>
  <div class="ar-busy" data-x="busy">Analyserer rommet …</div>
  <div class="ar-bot">
   <div class="ar-row"><button class="ar-b on" data-x="mf">Gulv</button><button class="ar-b" data-x="mw">Vegg</button>
     <button class="ar-b" data-x="redo">Analyser på nytt</button><button class="ar-b on" data-x="live">Live</button><button class="ar-b pri" data-x="quote">Be om tilbud</button><button class="ar-b" data-x="reset">Nullstill</button><button class="ar-b" data-x="cam" style="display:none">Bruk Live kamera</button><button class="ar-b" data-x="dbgt">Logg</button></div>
   <div class="ar-strip" data-x="strip"></div>
   <div class="ar-row"><select class="ar-sel" data-x="fmt"></select>
     ${[0,45,90].map(a=>`<button class="ar-b" data-rot="${a}">${a}°</button>`).join('')}
     <div class="ar-g" data-x="grout"></div>
     <label style="display:flex;gap:6px;align-items:center;font-size:11px;pointer-events:auto">Skala <input type="range" min="50" max="200" value="100" data-x="scale" style="width:90px"></label></div>
  </div>`;
  document.body.appendChild(ui);
  const $=k=>ui.querySelector('[data-x="'+k+'"]');
  const hint=h=>{$('hint').innerHTML=h;};
  dbgEl=$('dbg');dbgEl.textContent=logLines.join('\n');
  let matFor='floor';
  function renderUi(){
    $('strip').innerHTML=materials.filter(m=>matFor==='wall'||!m.plaster).map(m=>`<button class="ar-c ${m.id===(matFor==='floor'?S.floorId:S.wallId)?'on':''}" data-mat="${m.id}"><i style="--slab:${m.pattern}"></i><em>${esc(m.name)}</em></button>`).join('');
    $('mf').classList.toggle('on',matFor==='floor');$('mw').classList.toggle('on',matFor==='wall');
    $('fmt').innerHTML=FORMATS.map(f=>`<option value="${f[0]}" ${S.fmt===f[0]?'selected':''}>${f[1]}</option>`).join('');
    $('grout').innerHTML=GROUTS.map(g=>`<button data-grout="${g[1]}" class="${S.grout===g[1]?'on':''}" style="background:${g[1]}" aria-label="Fuge ${g[0]}"></button>`).join('');
    ui.querySelectorAll('[data-rot]').forEach(b=>b.classList.toggle('on',+b.dataset.rot===S.rot));
    $('live').classList.toggle('on',st.live);
  }

  /* ---------------- state ---------------- */
  const st={live:true,busy:false,lastEnd:0,cap:null,surfaces:[],floorSamples:[],floorY:null,floorLocked:false,flips:0,flip:false,frames:0,
            lost:false,force:false,t0:0,hasFloor:false,hasWall:false,seg:null,refitFor:null};

  /* ---------------- GL ---------------- */
  const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:2147483250';
  document.body.appendChild(canvas);
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,xrCompatible:true,preserveDrawingBuffer:false});
  if(!gl){ui.remove();canvas.remove();throw new Error('WebGL mangler');}
  const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Shader: '+gl.getShaderInfoLog(s));return s;};
  const program=fs=>{const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,VS));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.bindAttribLocation(p,0,'a');gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error('Program: '+gl.getProgramInfoLog(p));
    const u={};for(let i=0,n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i<n;i++){const inf=gl.getActiveUniform(p,i);u[inf.name]=gl.getUniformLocation(p,inf.name);}return {p,u};};
  let P;
  try{P={blit:program(FS_BLIT),floor:program(FS_AR(PREC,MATFN,false)),wall:program(FS_AR(PREC,MATFN,true)),pfloor:program(FS_PL(PREC,MATFN,false)),pwall:program(FS_PL(PREC,MATFN,true))};}
  catch(e){log('Shader/program: '+e.message);ui.remove();canvas.remove();window.removeEventListener('error',onErr);window.removeEventListener('unhandledrejection',onErr);throw e;}
  log('WebGL ok, shadere kompilert');
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  const mkTex=()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;};

  /* material textures (same procedural stone generator as the showroom) */
  const mats=new Map();
  function getMaterial(id,flat){
    const key=id+(flat?'~f':'');if(mats.has(key))return mats.get(key).tex||null;
    const rec={tex:null};mats.set(key,rec);
    let sid=id;if(flat&&STONES[id].kind!=='plaster'){sid=id+'~flat';if(!STONES[sid])STONES[sid]={...STONES[id],jw:0,bevel:0,jitter:0};}
    const N=MOBILE?512:1024,g=generateStone(sid,N);
    const step=()=>{
      try{
        const t0=performance.now();let r;do{r=g.next();}while(!r.done&&performance.now()-t0<8);
        if(!r.done){setTimeout(step,0);return;}
        const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,N,N,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(r.value.albedo.buffer));
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.generateMipmap(gl.TEXTURE_2D);
        rec.tex=t;
      }catch(e){console.warn('AR: tekstur feilet',e);}
    };
    step();return null;
  }
  function bindMaterial(u,id){
    const plaster=STONES[id].kind==='plaster',grid=S.fmt!=='natural'&&!plaster,fmt=FORMATS.find(f=>f[0]===S.fmt),t=getMaterial(id,grid);if(!t)return false;
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(u.u_tex,1);
    const tile=grid&&fmt[2]?fmt[2]:[.3,.3];gl.uniform2f(u.u_tile,tile[0],tile[1]);
    gl.uniform1f(u.u_scale,S.scale);gl.uniform1f(u.u_rot,S.rot*Math.PI/180);gl.uniform1f(u.u_grid,grid?1:0);gl.uniform1f(u.u_bond,S.bond?1:0);
    gl.uniform1f(u.u_gw,STONES[id].kind==='zellige'?.002:.003);gl.uniform1f(u.u_T,T);gl.uniform3fv(u.u_gcol,hex3(S.grout));return true;
  }

  /* camera readback target */
  let fbo=null,fboTex=null,fboW=0,fboH=0;
  function ensureFbo(W,H){
    if(fbo&&fboW===W&&fboH===H)return;
    if(fbo){gl.deleteFramebuffer(fbo);gl.deleteTexture(fboTex);}
    fboTex=mkTex();gl.bindTexture(gl.TEXTURE_2D,fboTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,W,H,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,fboTex,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Kamerabilde kunne ikke leses (framebuffer)');
    fboW=W;fboH=H;
  }

  /* ---------------- session ---------------- */
  let session,layer,ref,binding=null,hitSources=[];
  let ended=false;
  const cleanup=()=>{
    if(ended)return;ended=true;
    window.removeEventListener('error',onErr);window.removeEventListener('unhandledrejection',onErr);
    try{hitSources.forEach(h=>h.cancel());}catch(e){}
    ui.remove();canvas.remove();
    const x=gl.getExtension('WEBGL_lose_context');if(x)x.loseContext();
  };
  try{
    session=await navigator.xr.requestSession('immersive-ar',{requiredFeatures:['local'],optionalFeatures:['camera-access','hit-test','dom-overlay','plane-detection','anchors','depth-sensing'],domOverlay:{root:ui},depthSensing:{usagePreference:['cpu-optimized','gpu-optimized'],dataFormatPreference:['luminance-alpha','float32']}});
    log('økt startet; aktiverte funksjoner: '+(session.enabledFeatures?Array.from(session.enabledFeatures).join(', '):'(kan ikke leses)'));
    try{if(session.depthUsage)log('dybde: '+session.depthUsage+' / '+session.depthDataFormat);}catch(e){}
    session.addEventListener('end',()=>{
      const sec=(performance.now()-T0)/1000;
      log('økten avsluttet etter '+sec.toFixed(1)+' s '+(userEnd?'(valgt av bruker)':'(IKKE av bruker: systemet eller en feil)'));
      cleanup();opt.onEnd&&opt.onEnd({userEnd,quote:quoteEnd,seconds:sec,lines:logLines.slice()});
    });
    layer=new XRWebGLLayer(session,gl,{alpha:true});
    session.updateRenderState({baseLayer:layer});
    ref=await session.requestReferenceSpace('local');
    binding=typeof XRWebGLBinding!=='undefined'?new XRWebGLBinding(session,gl):null;
    log('referanserom ok; XRWebGLBinding '+(binding?'ja':'NEI'));
    try{
      const viewer=await session.requestReferenceSpace('viewer');
      // 5 columns x 8 rows of rays across the view; ARCore only answers where it has found a surface
      const rays=[];for(const yaw of [-18,-9,0,9,18])for(const pitch of [22,11,0,-10,-20,-30,-40,-50])rays.push([pitch,yaw]);
      hitSources=await Promise.all(rays.map(([pitch,yaw])=>{
        const pr=pitch*Math.PI/180,yr=yaw*Math.PI/180;
        return session.requestHitTestSource({space:viewer,offsetRay:new XRRay({x:0,y:0,z:0,w:1},{x:Math.sin(yr)*Math.cos(pr),y:Math.sin(pr),z:-Math.cos(yr)*Math.cos(pr),w:0})});
      }));
      log('hit-test: '+hitSources.length+' kilder');
    }catch(e){log('hit-test utilgjengelig: '+e.message);hitSources=[];}
  }catch(e){
    log('FEIL ved oppstart: '+(e&&e.name?e.name+': ':'')+(e&&e.message||e));
    try{if(session)await session.end();}catch(_){}
    cleanup();throw e;
  }

  /* ---------------- segmentation -> surfaces ---------------- */
  let segMod=null;
  const maskTexture=(prob,w,h)=>{const u8=new Uint8Array(w*h);for(let i=0;i<u8.length;i++)u8[i]=Math.round(clamp(prob[i],0,1)*255);
    const t=mkTex();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,w,h,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,u8);return t;};
  function dispose(list){for(const sf of list)gl.deleteTexture(sf.maskTex);}
  function currentFloorY(camY){if(st.floorSamples.length<8)return camY-1.45;const b=st.floorSamples.slice().sort((x,y)=>x-y);return b[Math.floor(b.length*.15)];}

  function fitPlanes(cap,floorY){
    const {w,h}=cap.seg,fp=(gx,gy)=>{
      const r=MA.ndcRay(cap.invVP,(gx/w)*2-1,1-(gy/h)*2),p=MA.rayFloorXZ(r.o,r.d,floorY);
      return p&&Math.hypot(p[0]-r.o[0],p[1]-r.o[2])<14?p:null;};
    const fb=()=>{const m=cap.cam,fx=-m[8],fz=-m[10],hd=Math.hypot(fx,fz)||1;return {p0:[m[12]+fx/hd*3.5,m[14]+fz/hd*3.5],u:[-fz/hd,fx/hd]};};
    return MA.wallPlanesGeneric(cap.seg,fp,fb);
  }
  const regionAvg=(prob,lum)=>{let s=0,n=0;for(let i=0;i<prob.length;i++)if(prob[i]>.5){s+=lum[i];n++;}return n>20?s/n/255:.5;};
  function buildSurfaces(cap,floorY){
    const {seg}=cap,{w,h}=seg,out=[];
    let nf=0;for(let i=0;i<seg.floor.length;i++)if(seg.floor[i]>.5)nf++;
    if(nf>.015*w*h)out.push({type:'floor',name:'Gulv',maskTex:maskTexture(seg.floor,w,h),avg:regionAvg(seg.floor,seg.lum)});
    const res=fitPlanes(cap,floorY),lab=res.labels;
    res.planes.forEach((pl,i)=>{
      const prob=new Float32Array(w*h);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        let near=false;for(let dy=-1;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<w&&yy<h&&lab[yy*w+xx]===pl.comp){near=true;break;}}
        if(!near)continue;
        if(pl.cols&&pl.cols[x]!==pl.sub&&pl.cols[Math.max(0,x-1)]!==pl.sub&&pl.cols[Math.min(w-1,x+1)]!==pl.sub)continue;
        prob[y*w+x]=seg.wall[y*w+x];
      }
      out.push({type:'wall',name:'Vegg '+(i+1),key:pl.key,p0:pl.p0,u:pl.u,fallback:pl.fallback,maskTex:maskTexture(prob,w,h),avg:regionAvg(prob,seg.lum)});
    });
    return out;
  }
  /* floor height changed after the picture was taken: refit planes only (no new AI run) */
  function refit(){
    if(!st.cap||st.busy)return;
    const res=fitPlanes(st.cap,st.floorY);
    for(const sf of st.surfaces){if(sf.type!=='wall')continue;const pl=res.planes.find(x=>x.key===sf.key);if(pl){sf.p0=pl.p0;sf.u=pl.u;sf.fallback=pl.fallback;}}
    st.cap.floorY=st.floorY;
  }

  /* take a camera picture this frame (the texture is only valid inside the frame callback), then analyse it asynchronously */
  function capture(frame,view,cam,camY){
    const asp=cam.width/cam.height,long=MOBILE?672:768;
    let W,H;if(cam.width>=cam.height){W=long;H=Math.max(256,Math.round(long/asp/32)*32);}else{H=long;W=Math.max(256,Math.round(long*asp/32)*32);}
    const tex=binding.getCameraImage(cam);if(!tex)return false;
    ensureFbo(W,H);
    gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.viewport(0,0,W,H);gl.disable(gl.BLEND);
    gl.useProgram(P.blit.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(P.blit.u.u_cam,0);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    const px=new Uint8Array(W*H*4);gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,px);
    gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer);
    const camM=Float32Array.from(view.transform.matrix),P4=Float32Array.from(view.projectionMatrix),V=MA.mat4Inv(camM),VP=MA.mat4Mul(P4,V);
    const cap={cam:camM,VP,invVP:MA.mat4Inv(VP),floorY:st.floorY,pos:[camM[12],camM[13],camM[14]],fwd:[-camM[8],-camM[9],-camM[10]]};
    // rows: readPixels is bottom-up; canvas row 0 = top of the picture (v=1) unless the orientation check found it inverted
    const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d'),im=g.createImageData(W,H);
    for(let y=0;y<H;y++){const src=(st.flip?y:(H-1-y))*W*4;im.data.set(px.subarray(src,src+W*4),y*W*4);}
    g.putImageData(im,0,0);
    analyse(c,W,H,cap);return true;
  }
  async function analyse(c,W,H,cap){
    st.busy=true;$('busy').style.display='block';
    try{
      log('analyserer bilde '+W+'x'+H+(st.flip?' (snudd)':''));
      segMod=segMod||await opt.loadSeg();
      const seg=await segMod.segment(c,W,H,MOBILE?672:768,m=>{if(!st.cap)hint('<b>'+esc(m)+'</b>');});
      if(ended)return;
      // orientation check: ceiling must be above floor in the picture; otherwise the camera texture is upside down
      let fy=0,fn=0,cy=0,cn=0;for(let y=0;y<seg.h;y++)for(let x=0;x<seg.w;x++){const k=seg.cls[y*seg.w+x];if(k===3){fy+=y;fn++;}else if(k===5){cy+=y;cn++;}}
      if(fn>20&&((cn>20&&fy/fn<cy/cn)||(cn<=20&&fy/fn/seg.h<.28))&&st.flips<2){
        st.flips++;st.flip=!st.flip;st.lastEnd=0;console.warn('AR: kamerabildet ser opp ned ut, snur og prøver på nytt');return;
      }
      log('analyse ferdig på '+seg.ms+' ms, inndata '+(seg.input||[]).join('x'));
      cap.seg=seg;
      const old=st.surfaces;st.surfaces=buildSurfaces(cap,cap.floorY);dispose(old);st.cap=cap;
      st.hasFloor=st.surfaces.some(s=>s.type==='floor');st.hasWall=st.surfaces.some(s=>s.type==='wall');
      const nw=st.surfaces.filter(s=>s.type==='wall').length,fb=st.surfaces.some(s=>s.fallback);
      if(!st.surfaces.length)hint('<span style="color:#ffd9a0">Fant verken gulv eller vegg.</span> Vis gulvet og veggene tydeligere, med godt lys.');
      else hint('<b>'+(st.hasFloor?'Gulv':'')+(st.hasFloor&&nw?' og ':'')+(nw?nw+(nw>1?' vegger':' vegg'):'')+' funnet</b> ('+(seg.ms/1000).toFixed(1)+' s). Gå rolig rundt: materialet holder seg på plass og oppdateres av seg selv.'+(fb?' <span style="color:#ffd9a0">Veggens plassering er et anslag.</span>':''));
    }catch(e){
      console.error('AR-analyse feilet',e);hint('<span style="color:#ffd9a0">Analysen feilet:</span> '+esc(e&&e.message||String(e)));
    }finally{st.busy=false;st.lastEnd=performance.now();$('busy').style.display='none';}
  }
  const angle=(a,b)=>Math.acos(clamp(a[0]*b[0]+a[1]*b[1]+a[2]*b[2],-1,1));

  /* ---------------- depth map (ARCore Depth API through WebXR depth-sensing) ---------------- */
  const DW=64,DH=112,dp={tex:mkTex(),data:new Uint8Array(DW*DH*2),ok:false,flip:0,calib:0,errs:[[],[],[],[]],last:0,tried:0,err:null};
  gl.bindTexture(gl.TEXTURE_2D,dp.tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  const FLIPS=[[0,0],[0,1],[1,0],[1,1]]; // [flipX, flipY] candidates for the view->depth coordinate mapping
  const dmap=(u,v,f)=>[FLIPS[f][0]?1-u:u,FLIPS[f][1]?1-v:v];
  function updateDepth(frame,view,time,inv,V,camPos){
    if(time-dp.last<90)return;dp.last=time;
    let di=null;try{di=frame.getDepthInformation(view);}catch(e){if(dp.err!==e.message){dp.err=e.message;log('dybde utilgjengelig: '+e.message);}dp.ok=false;return;}
    if(!di){dp.ok=false;return;}
    if(!dp.tried){dp.tried=1;log('dybdekart mottatt: '+di.width+'x'+di.height+' (meter/enhet '+di.rawValueToMeters+')');}
    // one-off calibration against the measured floor plane: which mapping from view coordinates gives depths that fit the floor?
    if(dp.calib<45&&pm.floorYPlane!=null){
      dp.calib++;
      for(let a=1;a<9;a++)for(let b=3;b<9;b++){
        const u=a/9,v=b/9,ray=MA.ndcRay(inv,u*2-1,1-v*2),hit=MA.rayFloorXZ(ray.o,ray.d,pm.floorYPlane);if(!hit)continue;
        const P=[hit[0],pm.floorYPlane,hit[1]],zv=-(V[2]*P[0]+V[6]*P[1]+V[10]*P[2]+V[14]);if(zv<.6||zv>4.5)continue;
        for(let f=0;f<4;f++){const [x,y]=dmap(u,v,f);let z=0;try{z=di.getDepthInMeters(x,y);}catch(e){}if(z>0)dp.errs[f].push(Math.abs(z-zv));}
      }
      if(dp.calib===45||dp.errs.every(e=>e.length>60)){
        const med=a=>{if(!a.length)return 99;const b=a.slice().sort((x,y)=>x-y);return b[b.length>>1];},m4=dp.errs.map(med);
        {const bi=m4.indexOf(Math.min(...m4));dp.flip=m4[bi]<m4[0]*.85?bi:0;}dp.calib=999;dp.bad=Math.min(...m4)>.6;if(dp.bad)log('dybdekartet passer ikke med gulvet (feil > 0,6 m): dybde-skjuling slått av');log('dybde-kalibrering (median feil m): '+m4.map(v=>v.toFixed(2)).join(' / ')+' -> valgt '+dp.flip);
      }
    }
    let k=0;
    for(let j=0;j<DH;j++)for(let i=0;i<DW;i++){
      const [x,y]=dmap((i+.5)/DW,(j+.5)/DH,dp.flip);let z=0;try{z=di.getDepthInMeters(x,y);}catch(e){}
      const code=z>0&&z<12?Math.round(z/12*65535):0;dp.data[k++]=code&255;dp.data[k++]=code>>8;
    }
    gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,dp.tex);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE_ALPHA,DW,DH,0,gl.LUMINANCE_ALPHA,gl.UNSIGNED_BYTE,dp.data);
    dp.ok=true;
  }

  /* ---------------- plane mode: accumulate ARCore hits ---------------- */
  const G=96,CELL=.12,pm={sig:-1,pcount:-1,planeT:0,floorYPlane:null,nh:0,nv:0,sem:null,cx:null,cz:null,floor:new Float32Array(G*G),block:new Float32Array(G*G),tex:null,dirty:false,lastUp:0,walls:[],nFloor:0,nBlock:0,nWallHits:0};
  pm.tex=mkTex();
  const cellOf=(x,z)=>[Math.floor((x-pm.cx)/CELL+G/2),Math.floor((z-pm.cz)/CELL+G/2)];
  function stamp(arr,x,z,r,v){
    if(pm.cx==null)return;const [ix,iz]=cellOf(x,z),rc=Math.ceil(r/CELL);
    for(let dz=-rc;dz<=rc;dz++)for(let dx=-rc;dx<=rc;dx++){
      const cx=ix+dx,cz=iz+dz;if(cx<0||cz<0||cx>=G||cz>=G)continue;
      const d=Math.hypot(dx,dz)*CELL;if(d>r)continue;
      const w=v*(1-Math.min(1,Math.max(0,(d-r*.55)/(r*.45)))),k=cz*G+cx;if(w>arr[k])arr[k]=w;
    }
    pm.dirty=true;
  }
  function wallSample(px,py,pz,nx,nz){
    const L=Math.hypot(nx,nz);if(L<.5)return;nx/=L;nz/=L;const d=nx*px+nz*pz;let best=null;
    for(const w of pm.walls){if(w.nx*nx+w.nz*nz>Math.cos(12*Math.PI/180)&&Math.abs(w.d-d)<.15){best=w;break;}}
    if(!best){if(pm.walls.length>=8)return;best={nx,nz,d,n:0,s0:1e9,s1:-1e9};pm.walls.push(best);}
    const k=best.n/(best.n+1);best.nx=best.nx*k+nx/(best.n+1);best.nz=best.nz*k+nz/(best.n+1);
    const nl=Math.hypot(best.nx,best.nz);best.nx/=nl;best.nz/=nl;best.d=best.d*k+d/(best.n+1);best.n++;
    const s=-best.nz*px+best.nx*pz;if(s<best.s0)best.s0=s;if(s>best.s1)best.s1=s;pm.nWallHits++;
  }
  function processHits(frame,m,camY){
    const horiz=[];
    for(const hs of hitSources){
      const r=frame.getHitTestResults(hs)[0];if(!r)continue;const hp=r.getPose(ref);if(!hp)continue;
      const h=hp.transform.matrix,px=h[12],py=h[13],pz=h[14],ny=h[5],dist=Math.hypot(px-m[12],py-m[13],pz-m[14]);
      if(ny>.9&&py<camY-.35){st.floorSamples.push(py);if(st.floorSamples.length>150)st.floorSamples.shift();horiz.push([px,py,pz,dist]);}
      else if(Math.abs(ny)<.3&&py>camY-1.6)wallSample(px,py,pz,h[4],h[6]);
    }
    const fy=st.floorY==null?camY-1.45:st.floorY;
    for(const [x,y,z,dist] of horiz){
      if(pm.cx==null&&Math.abs(y-fy)<.12){pm.cx=x;pm.cz=z;}
      if(Math.abs(y-fy)<.1)stamp(pm.floor,x,z,clamp(.1+.05*dist,.12,.4),1);
      else if(y>fy+.15&&y<fy+1.2)stamp(pm.block,x,z,.3,1); // a table top / sofa seat: furniture footprint, no floor material under it
    }
    pm.nFloor=0;for(let i=0;i<pm.floor.length;i++)if(pm.floor[i]>.5)pm.nFloor++;
    st.hasFloor=pm.nFloor>20;st.hasWall=pm.walls.some(w=>w.n>=8);
  }
  /* ARCore plane detection (XRFrame.detectedPlanes): real planes with polygons. Floor = lowest large horizontal plane,
   * furniture = higher horizontal planes, walls = vertical planes (pieces of the same wall are merged). */
  const polyArea=pts=>{let a=0;for(let i=0,j=pts.length-1;i<pts.length;j=i++)a+=pts[j][0]*pts[i][1]-pts[i][0]*pts[j][1];return Math.abs(a)/2;};
  function rasterPoly(arr,poly){
    if(pm.cx==null||poly.length<3)return;
    let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const q of poly){if(q[0]<x0)x0=q[0];if(q[0]>x1)x1=q[0];if(q[1]<z0)z0=q[1];if(q[1]>z1)z1=q[1];}
    const [ia,ja]=cellOf(x0,z0),[ib,jb]=cellOf(x1,z1);
    for(let j=Math.max(0,ja);j<=Math.min(G-1,jb);j++)for(let i=Math.max(0,ia);i<=Math.min(G-1,ib);i++){
      const x=(i+.5-G/2)*CELL+pm.cx,z=(j+.5-G/2)*CELL+pm.cz;let inside=false;
      for(let a=0,b=poly.length-1;a<poly.length;b=a++){
        if((poly[a][1]>z)!==(poly[b][1]>z)&&x<(poly[b][0]-poly[a][0])*(z-poly[a][1])/(poly[b][1]-poly[a][1])+poly[a][0])inside=!inside;
      }
      if(inside)arr[j*G+i]=1;
    }
  }
  function processPlanes(frame,m,camY,now){
    const set=frame.detectedPlanes;if(!set)return false;
    let sig=0,count=0;for(const pl of set){sig+=pl.lastChangedTime;count++;}
    if(count===0&&now-st.t0>6000)return false; // no planes found for a while: use the hit-test grid instead
    if(sig===pm.sig&&count===pm.pcount&&now-pm.planeT<1500){return true;}
    pm.sig=sig;pm.pcount=count;pm.planeT=now;
    const hor=[],ver=[];
    for(const pl of set){
      const pose=frame.getPose(pl.planeSpace,ref);if(!pose)continue;
      const M=pose.transform.matrix,poly=Array.from(pl.polygon||[]);if(poly.length<3)continue;
      const world=poly.map(q=>[M[0]*q.x+M[4]*q.y+M[8]*q.z+M[12],M[1]*q.x+M[5]*q.y+M[9]*q.z+M[13],M[2]*q.x+M[6]*q.y+M[10]*q.z+M[14]]);
      if(pl.semanticLabel&&!pm.sem)pm.sem=pl.semanticLabel;
      if(pl.orientation==='horizontal'||Math.abs(M[5])>.85){
        hor.push({y:M[13],xz:world.map(w=>[w[0],w[2]]),area:polyArea(poly.map(q=>[q.x,q.z])),label:pl.semanticLabel});
      }else if(pl.orientation==='vertical'||Math.abs(M[5])<.35){
        ver.push({M,world});
      }
    }
    pm.nh=hor.length;pm.nv=ver.length;
    // floor: lowest large horizontal plane below the phone
    // group horizontal planes by height; the floor is the height group with the largest total area (a phantom plane below a
    // glossy floor, or a bed/table top, is small compared with the real floor)
    const groups=[];
    for(const h of hor){
      if(h.y>=camY-.4||h.y<camY-2.5||h.area<.15)continue;
      let g=groups.find(g=>Math.abs(g.y-h.y)<.08);if(!g){g={y:h.y,area:0,sy:0,planes:[]};groups.push(g);}
      g.area+=h.area;g.sy+=h.y*h.area;g.y=g.sy/g.area;g.planes.push(h);
    }
    groups.sort((a,b)=>b.area-a.area);
    if(groups.length&&groups[0].area>.25){
      const f=groups[0];
      if(pm.floorYPlane==null||Math.abs(f.y-pm.floorYPlane)>.25){
        if(pm.floorYPlane!=null)log('gulv byttet: y='+f.y.toFixed(2)+' ('+f.area.toFixed(1)+' m², '+f.planes.length+' plan; var '+pm.floorYPlane.toFixed(2)+')');
        pm.floorYPlane=f.y;pm.cx=null; // re-centre the map on the new floor
      }else pm.floorYPlane+=(f.y-pm.floorYPlane)*.4;
      if(pm.cx==null){const big=f.planes.slice().sort((a,b)=>b.area-a.area)[0];let cx=0,cz=0;for(const q of big.xz){cx+=q[0];cz+=q[1];}pm.cx=cx/big.xz.length;pm.cz=cz/big.xz.length;}
    }
    if(pm.floorYPlane==null)return true;
    const fy=pm.floorYPlane;pm.floor.fill(0);pm.block.fill(0);
    for(const h of hor){
      if(Math.abs(h.y-fy)<.08)rasterPoly(pm.floor,h.xz);
      else if(h.y>fy+.15&&h.y<fy+1.3&&h.y<camY-.15&&h.area<4)rasterPoly(pm.block,h.xz);
    }
    pm.dirty=true;pm.nFloor=0;pm.nBlock=0;for(let i=0;i<pm.floor.length;i++){if(pm.floor[i]>.5)pm.nFloor++;if(pm.block[i]>.5)pm.nBlock++;}
    // walls: vertical planes, pieces of the same wall merged
    const walls=[];
    for(const v of ver){
      let nx=v.M[4],nz=v.M[6];const L=Math.hypot(nx,nz);if(L<.6)continue;nx/=L;nz/=L;
      let d=nx*v.M[12]+nz*v.M[14];
      let tgt=null;
      for(const w of walls){const dot=w.nx*nx+w.nz*nz;if(Math.abs(dot)>Math.cos(10*Math.PI/180)){const dd=dot>0?d:-d;if(Math.abs(w.d-dd)<.2){tgt=w;break;}}}
      if(!tgt){tgt={nx,nz,d,s0:1e9,s1:-1e9,n:99};walls.push(tgt);}
      for(const q of v.world){const s=-tgt.nz*q[0]+tgt.nx*q[2];if(s<tgt.s0)tgt.s0=s;if(s>tgt.s1)tgt.s1=s;}
    }
    pm.walls=walls;
    st.hasFloor=pm.nFloor>20;st.hasWall=walls.some(w=>w.s1-w.s0>.5);
    return true;
  }
  function uploadPm(now){
    if(!pm.dirty||now-pm.lastUp<180)return;pm.lastUp=now;pm.dirty=false;
    const u8=new Uint8Array(G*G*4);for(let i=0;i<G*G;i++){u8[i*4]=Math.round(clamp(pm.floor[i],0,1)*255);u8[i*4+1]=Math.round(clamp(pm.block[i],0,1)*255);u8[i*4+3]=255;}
    gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,pm.tex);gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,G,G,0,gl.RGBA,gl.UNSIGNED_BYTE,u8);
  }
  function depthUniforms(u,V){gl.uniformMatrix4fv(u.u_V,false,V);gl.uniform1f(u.u_dok,dp.ok&&dp.calib>=999&&!dp.bad?1:0);gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,dp.tex);gl.uniform1i(u.u_depth,5);}
  function drawPlanes(inv,m,vp,V){
    const gain=.82;
    if(pm.cx!=null&&pm.nFloor>20&&st.floorY!=null&&bindMaterialFor(P.pfloor,S.floorId)){
      const u=P.pfloor.u;gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,pm.tex);gl.uniform1i(u.u_mask,2);
      gl.uniformMatrix4fv(u.u_invVP,false,inv);gl.uniform3f(u.u_o,m[12],m[13],m[14]);gl.uniform4f(u.u_vp,vp.x,vp.y,vp.width,vp.height);
      gl.uniform3f(u.u_mk,pm.cx,pm.cz,G*CELL);gl.uniform1f(u.u_floorY,st.floorY);gl.uniform1f(u.u_gain,gain);depthUniforms(u,V);quad();
    }
    for(const w of pm.walls){
      if(w.n<8||w.s1-w.s0<.5||st.floorY==null||!bindMaterialFor(P.pwall,S.wallId))continue;
      const u=P.pwall.u;gl.uniformMatrix4fv(u.u_invVP,false,inv);gl.uniform3f(u.u_o,m[12],m[13],m[14]);gl.uniform4f(u.u_vp,vp.x,vp.y,vp.width,vp.height);
      gl.uniform2f(u.u_n,w.nx,w.nz);gl.uniform1f(u.u_d,w.d);gl.uniform2f(u.u_s,w.s0-.2,w.s1+.2);gl.uniform1f(u.u_H,2.5);
      gl.uniform1f(u.u_floorY,st.floorY);gl.uniform1f(u.u_gain,gain);depthUniforms(u,V);quad();
    }
  }
  function bindMaterialFor(pr,id){gl.useProgram(pr.p);return bindMaterial(pr.u,id);}

  /* ---------------- frame loop ---------------- */
  const quad=()=>gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  let lastSum=0,camSeen=0,camMissing=0,reported=false;
  function onFrame(time,frame){
    if(ended)return;
    session.requestAnimationFrame(onFrame);
    try{frameBody(time,frame);}catch(e){if(st.frameErr!==e.message){st.frameErr=e.message;log('FEIL i tegning: '+e.message);}}
  }
  function frameBody(time,frame){
    const pose=frame.getViewerPose(ref);
    gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    if(!pose){if(!st.lost){st.lost=true;hint('<b>Mistet sporing.</b> Beveg mobilen rolig og se mot noe med mønster eller kanter, og med godt lys.');}return;}
    if(st.lost){st.lost=false;hint('Sporing er tilbake.');}
    const view=pose.views[0],vp=layer.getViewport(view),m=view.transform.matrix,camY=m[13];
    st.frames++;if(!st.t0)st.t0=time;
    if(view.camera){camSeen++;if(camSeen===1)log('kamerabilde mottatt: '+view.camera.width+'x'+view.camera.height);}else camMissing++;
    if(!camSeen&&camMissing===60&&!reported){reported=true;log('INGEN kamerabilde (view.camera er null) etter 60 bilderuter');hint('<b>Plan-modus:</b> nettleseren gir ikke kamerabildet til AR, så AI-gjenkjenning er ikke mulig her. AR finner i stedet gulv og vegger selv: beveg mobilen rolig langs gulv og vegger så fylles flatene inn. Møbler og vinduer på veggen kan ikke utelukkes automatisk.');}
    if(time-lastSum>3000){lastSum=time;log('bilder='+st.frames+' kamera='+(view.camera?'ja':'nei')+' gulvprøver='+st.floorSamples.length+' gulvY='+(st.floorY==null?'-':st.floorY.toFixed(2))+' flater='+st.surfaces.length+' dybde='+(dp.ok?(dp.calib>=999?(dp.bad?'avvist':'på'):'kalibrerer'):'nei')+' planer(v/h)='+pm.nv+'/'+pm.nh+(pm.sem?' etikett='+pm.sem:'')+' gulvceller='+pm.nFloor+' møbelceller='+pm.nBlock+' vegger='+pm.walls.filter(w=>w.n>=8).length+(st.busy?' (analyserer)':''));}

    // floor / wall / furniture: ARCore plane detection when the browser grants it, otherwise a grid of hit-tests
    const havePlanes=frame.detectedPlanes!==undefined&&processPlanes(frame,m,camY,time);
    if(!havePlanes)processHits(frame,m,camY);
    const fy=havePlanes&&pm.floorYPlane!=null?pm.floorYPlane:currentFloorY(camY);
    const locked=havePlanes?pm.floorYPlane!=null:st.floorSamples.length>=8;
    if(locked&&!st.floorLocked){st.floorLocked=true;hint('Gulv målt: '+(camY-fy).toFixed(2)+' m under telefonen.'+(camSeen?' Analyserer rommet …':' Beveg mobilen rolig langs gulv og vegger, så fylles flatene inn.'));}
    if(st.floorY==null||(st.floorLocked&&Math.abs(fy-st.floorY)>.02)){st.floorY=fy;if(st.cap)refit();}else if(!st.floorLocked)st.floorY=fy;
    uploadPm(time);

    // schedule analysis: first one after tracking has settled, then when the phone has moved/turned or the result is old
    const cam=view.camera;
    if(cam&&binding&&!st.busy&&time-st.t0>900&&(st.floorLocked||time-st.t0>3000)&&performance.now()-st.lastEnd>1200){
      const c=st.cap,pos=[m[12],m[13],m[14]],fwd=[-m[8],-m[9],-m[10]];
      const moved=c?Math.hypot(pos[0]-c.pos[0],pos[1]-c.pos[1],pos[2]-c.pos[2]):1e9,turned=c?angle(fwd,c.fwd):1e9;
      if(!c||st.force||(st.live&&(moved>.35||turned>.22||performance.now()-st.lastEnd>7000))){
        st.force=false;
        try{capture(frame,view,cam,camY);}catch(e){console.error(e);hint('<span style="color:#ffd9a0">Kunne ikke lese kamerabildet:</span> '+esc(e.message));st.lastEnd=performance.now()+5000;}
      }
    }

    // draw
    gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer);gl.viewport(vp.x,vp.y,vp.width,vp.height);
    gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    const VPn=MA.mat4Mul(view.projectionMatrix,view.transform.inverse.matrix),inv=MA.mat4Inv(VPn);if(!inv)return;
    if(!st.cap||!st.surfaces.length){if(camMissing>60&&!camSeen){const Vm=view.transform.inverse.matrix;updateDepth(frame,view,time,inv,Vm,[m[12],m[13],m[14]]);drawPlanes(inv,m,vp,Vm);}return;}
    for(const sf of st.surfaces){
      const wall=sf.type==='wall',pr=wall?P.wall:P.floor,u=pr.u;gl.useProgram(pr.p);
      if(!bindMaterial(u,wall?S.wallId:S.floorId))continue;
      gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,sf.maskTex);gl.uniform1i(u.u_mask,2);
      gl.uniformMatrix4fv(u.u_invVP,false,inv);gl.uniformMatrix4fv(u.u_VPcap,false,st.cap.VP);
      gl.uniform3f(u.u_o,m[12],m[13],m[14]);gl.uniform4f(u.u_vp,vp.x,vp.y,vp.width,vp.height);
      gl.uniform1f(u.u_floorY,st.floorY);gl.uniform1f(u.u_gain,clamp(.5+sf.avg*1.1,.55,1));
      if(wall){gl.uniform2f(u.u_P0,sf.p0[0],sf.p0[1]);gl.uniform2f(u.u_u,sf.u[0],sf.u[1]);}
      quad();
    }
  }

  /* ---------------- UI actions ---------------- */
  hint('<b>Live AR med automatisk gjenkjenning.</b> Hold mobilen stående og vis gulv og vegger rolig. Rommet analyseres automatisk om et øyeblikk.');
  renderUi();
  ui.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.mat){if(matFor==='floor')S.floorId=b.dataset.mat;else S.wallId=b.dataset.mat;renderUi();return;}
    if(b.dataset.rot){S.rot=+b.dataset.rot;renderUi();return;}
    if(b.dataset.grout){S.grout=b.dataset.grout;renderUi();return;}
    switch(b.dataset.x){
      case 'end':userEnd=true;session.end().catch(()=>{});break;
      case 'reset':pm.floor.fill(0);pm.block.fill(0);pm.walls=[];pm.cx=null;pm.cz=null;pm.dirty=true;pm.sig=-1;pm.floorYPlane=null;st.floorSamples.length=0;st.floorLocked=false;st.floorY=null;hint('Nullstilt. Beveg mobilen rolig langs gulv og vegger.');break;
      case 'dbgt':dbgEl.style.display=dbgEl.style.display==='none'?'':'none';break;
      case 'cam':userEnd=true;session.end().catch(()=>{});setTimeout(()=>opt.onFallback&&opt.onFallback('bruker'),200);break;
      case 'mf':matFor='floor';renderUi();break;
      case 'mw':matFor='wall';renderUi();break;
      case 'live':st.live=!st.live;renderUi();break;
      case 'redo':st.force=true;st.lastEnd=0;hint('Analyserer på nytt …');break;
      case 'quote':{const info={floor:st.hasFloor,wall:st.hasWall,floorId:S.floorId,wallId:S.wallId};userEnd=true;quoteEnd=true;session.end().catch(()=>{});setTimeout(()=>opt.onQuote&&opt.onQuote(info),250);break;}
    }
  });
  ui.addEventListener('change',e=>{const t=e.target;if(t.dataset.x==='fmt')S.fmt=t.value;});
  ui.addEventListener('input',e=>{const t=e.target;if(t.dataset.x==='scale')S.scale=clamp(+t.value/100,.5,2);});
  session.requestAnimationFrame(onFrame);
  return {session};
}
