/* Stenhuset "Prøv i mitt rom": automatic recognition of floor, walls and everything else (inventory) in the camera picture.
 * Model: SegFormer-B0 fine-tuned on ADE20K (150 classes), int8-quantised ONNX (4.4 MB), self-hosted in ./models/.
 * Runtime: ONNX Runtime Web (WASM), loaded from jsDelivr on first use. The picture never leaves the device; only the model and
 * the runtime library are downloaded.
 * Licence note: the SegFormer weights are released by NVIDIA under a non-commercial research licence. Fine for this demo; a
 * commercial launch needs a licence from NVIDIA or a permissively licensed replacement model. */
import {postprocess,majority3,boxBlur3} from './tryroom-math-v1.js?v=4';

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
 * not squashed into a square. Returns {w,h,cls,floor,wall,lum,ms} on the logits grid (input/4). lum = brightness 0..255 per cell. */
function inputSize(sw,sh,long){
  const r=Math.min(sw,sh)/Math.max(sw,sh),short=Math.max(256,Math.round(long*r/32)*32);
  return sw>=sh?[long,short]:[short,long];
}
async function runOnce(sess,source,W,H){
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d',{willReadFrequently:true});
  g.drawImage(source,0,0,W,H);
  const px=g.getImageData(0,0,W,H).data,n=W*H,data=new Float32Array(3*n);
  for(let i=0;i<n;i++){
    data[i]=(px[i*4]/255-MEAN[0])/STD[0];data[n+i]=(px[i*4+1]/255-MEAN[1])/STD[1];data[2*n+i]=(px[i*4+2]/255-MEAN[2])/STD[2];
  }
  const out=await sess.run({pixel_values:new window.ort.Tensor('float32',data,[1,3,H,W])});
  return {L:out.logits||out[Object.keys(out)[0]],px,W,H};
}
export async function segment(source,sw,sh,long,onStatus){
  const sess=await loadModel(onStatus);
  onStatus&&onStatus('Analyserer rommet …');
  await new Promise(r=>setTimeout(r,30)); // let the status text paint
  const t0=performance.now();
  let [W,H]=inputSize(sw,sh,long),res;
  try{res=await runOnce(sess,source,W,H);}
  catch(e){console.warn('Stenhuset: ikke-kvadratisk input feilet, prøver kvadrat',e);W=H=384;res=await runOnce(sess,source,W,H);}
  const [,C,h,w]=res.L.dims;
  const seg=postprocess(res.L.data,C,h,w,CLASS.wall,CLASS.floor);
  // clean-up: majority vote removes speckle, a light blur softens mask edges
  seg.cls=majority3(seg.cls,w,h);seg.floor=boxBlur3(seg.floor,w,h);seg.wall=boxBlur3(seg.wall,w,h);
  const lum=new Uint8Array(w*h),kx=W/w,ky=H/h;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=((((y*ky+ky/2)|0)*W)+((x*kx+kx/2)|0))*4;lum[y*w+x]=.2126*res.px[p]+.7152*res.px[p+1]+.0722*res.px[p+2];}
  seg.lum=lum;seg.ms=Math.round(performance.now()-t0);seg.input=[W,H];
  return seg;
}
