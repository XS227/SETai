/* Stenhuset "Prøv i mitt rom": automatic recognition of floor, walls and everything else (inventory) in the camera picture.
 * Model: SegFormer-B0 fine-tuned on ADE20K (150 classes), int8-quantised ONNX (4.4 MB), self-hosted in ./models/.
 * Runtime: ONNX Runtime Web (WASM), loaded from jsDelivr on first use. The picture never leaves the device; only the model and
 * the runtime library are downloaded.
 * Licence note: the SegFormer weights are released by NVIDIA under a non-commercial research licence. Fine for this demo; a
 * commercial launch needs a licence from NVIDIA or a permissively licensed replacement model. */
import {postprocess2,majority3,letterbox,cropResample,cropNearest,PROTECT_IDS} from './tryroom-math-v1.js?v=6';

const ORT_BASE='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';
const MODEL_URL=new URL('models/segformer-b0-ade-q.onnx',import.meta.url).href;
const MEAN=[.485,.456,.406],STD=[.229,.224,.225];
export const CLASS={wall:0,floor:3,ceiling:5};

let ortP=null,sessP=null;
function loadOrt(){
  if(window.ort)return Promise.resolve(window.ort);
  return ortP||(ortP=new Promise((res,rej)=>{
    const s=document.createElement('script');s.src=ORT_BASE+'ort.min.js';
    s.onload=()=>window.ort?res(window.ort):rej(new Error('ONNX Runtime lastet, men ikke tilgjengelig'));
    s.onerror=()=>{ortP=null;rej(new Error('Kunne ikke laste ONNX Runtime fra nettverket'));};
    document.head.appendChild(s);
  }));
}
async function fetchModel(onStatus){
  const r=await fetch(MODEL_URL);if(!r.ok)throw new Error('Fant ikke modellfilen ('+r.status+')');
  const total=+r.headers.get('content-length')||4418863;
  if(!r.body||!r.body.getReader)return new Uint8Array(await r.arrayBuffer());
  const rd=r.body.getReader(),chunks=[];let got=0;
  for(;;){const {done,value}=await rd.read();if(done)break;chunks.push(value);got+=value.length;onStatus&&onStatus('Laster analysemodell … '+Math.min(99,Math.round(got/total*100))+' %');}
  const buf=new Uint8Array(got);let o=0;for(const c of chunks){buf.set(c,o);o+=c.length;}return buf;
}
export function loadModel(onStatus){
  if(sessP)return sessP;
  sessP=(async()=>{
    onStatus&&onStatus('Laster analysemodell …');
    const [ort,bytes]=await Promise.all([loadOrt(),fetchModel(onStatus)]);
    ort.env.wasm.wasmPaths=ORT_BASE;ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;
    onStatus&&onStatus('Starter modellen …');
    return ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
  })();
  sessP.catch(()=>{sessP=null;});
  return sessP;
}
export const isLoaded=()=>!!sessP;

/* source: <video> or <canvas> with pixel size sw x sh. long: length of the longer input side (multiple of 32).
 * The input keeps the picture's aspect ratio (SegFormer accepts any size that is a multiple of 32), so a portrait phone frame is
 * not squashed into a square. If that fails, a square input is used WITH letterboxing (never stretched) and the result is
 * cropped back to the picture. Returns on the logits grid (input/4): {w,h,cls,floor,wall,protect,lum}, plus a grey guide image
 * at twice that resolution {guide,gw,gh} for edge-aware mask upsampling. No blurring of the probabilities. */
function inputSize(sw,sh,long){
  const r=Math.min(sw,sh)/Math.max(sw,sh),short=Math.max(256,Math.round(long*r/32)*32);
  return sw>=sh?[long,short]:[short,long];
}
async function runOnce(sess,source,sx,sy,sw,sh,W,H,box){
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d',{willReadFrequently:true});
  g.fillStyle='#000';g.fillRect(0,0,W,H);
  if(box)g.drawImage(source,sx,sy,sw,sh,box.ox,box.oy,box.w,box.h);else g.drawImage(source,sx,sy,sw,sh,0,0,W,H);
  const px=g.getImageData(0,0,W,H).data,n=W*H,data=new Float32Array(3*n);
  for(let i=0;i<n;i++){
    data[i]=(px[i*4]/255-MEAN[0])/STD[0];data[n+i]=(px[i*4+1]/255-MEAN[1])/STD[1];data[2*n+i]=(px[i*4+2]/255-MEAN[2])/STD[2];
  }
  const out=await sess.run({pixel_values:new window.ort.Tensor('float32',data,[1,3,H,W])});
  return {L:out.logits||out[Object.keys(out)[0]],px,W,H};
}
/* Analyse the region (sx,sy,sw,sh) of source (pixels). Whole picture: segment(source,w,h,long). */
export async function segmentRect(source,sx,sy,sw,sh,long,onStatus){
  const sess=await loadModel(onStatus);
  onStatus&&onStatus('Analyserer rommet …');
  await new Promise(r=>setTimeout(r,30)); // let the status text paint
  const t0=performance.now();
  let [W,H]=inputSize(sw,sh,long),res,box=null;
  try{res=await runOnce(sess,source,sx,sy,sw,sh,W,H,null);}
  catch(e){
    console.warn('Stenhuset: ikke-kvadratisk input feilet, bruker kvadrat med letterbox',e);
    W=H=384;box=letterbox(sw,sh,384);res=await runOnce(sess,source,sx,sy,sw,sh,W,H,box);
  }
  const [,C,h0,w0]=res.L.dims;
  let seg=postprocess2(res.L.data,C,h0,w0,CLASS.wall,CLASS.floor,PROTECT_IDS),w=w0,h=h0,px=res.px,PW=W,PH=H,pox=0,poy=0;
  if(box){ // crop the letterboxed square back to the picture (inverse mapping), on the same grid density
    const q=w0/W,tw=Math.max(8,Math.round(box.w*q)),th=Math.max(8,Math.round(box.h*q)),x0=box.ox*q,y0=box.oy*q,cw=box.w*q,ch=box.h*q;
    seg={cls:cropNearest(seg.cls,w0,h0,x0,y0,cw,ch,tw,th),floor:cropResample(seg.floor,w0,h0,x0,y0,cw,ch,tw,th),wall:cropResample(seg.wall,w0,h0,x0,y0,cw,ch,tw,th),protect:cropResample(seg.protect,w0,h0,x0,y0,cw,ch,tw,th)};
    w=tw;h=th;PW=box.w;PH=box.h;pox=box.ox;poy=box.oy;
  }
  seg.w=w;seg.h=h;
  seg.cls=majority3(seg.cls,w,h); // the class map is only used for geometry (wall/floor lines, regions); masks are not blurred
  // grey guide image (twice the grid resolution) from the analysed pixels, for edge-aware upsampling
  const gw=w*2,gh=h*2,guide=new Uint8Array(gw*gh),lum=new Uint8Array(w*h);
  const pix=(x,y)=>{const X=Math.min(W-1,Math.max(0,Math.round(pox+x))),Y=Math.min(H-1,Math.max(0,Math.round(poy+y))),p=(Y*W+X)*4;return .2126*px[p]+.7152*px[p+1]+.0722*px[p+2];};
  for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){
    const fx=(x+.5)/gw*PW,fy=(y+.5)/gh*PH,dx=PW/gw/3,dy=PH/gh/3;
    guide[y*gw+x]=(pix(fx-dx,fy-dy)+pix(fx+dx,fy-dy)+pix(fx-dx,fy+dy)+pix(fx+dx,fy+dy))/4;
  }
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)lum[y*w+x]=pix((x+.5)/w*PW,(y+.5)/h*PH);
  seg.guide=guide;seg.gw=gw;seg.gh=gh;seg.lum=lum;seg.ms=Math.round(performance.now()-t0);seg.input=[W,H];seg.letterbox=!!box;
  return seg;
}
export const segment=(source,sw,sh,long,onStatus)=>segmentRect(source,0,0,sw,sh,long,onStatus);
