/* Stenhuset logo as a watermark on every picture people download or share (showroom, "Prøv i mitt rom", product cards).
 * The logo file is dark brown on transparent; a white copy is made for photos, with a soft shadow so it reads on light
 * and dark stone alike. */
const LOGO=new URL('./assets/stenhuset-logo.png',import.meta.url).href;
let logoP=null;
export function logos(){
  return logoP||(logoP=new Promise(res=>{
    const im=new Image();im.crossOrigin='anonymous';
    im.onload=()=>{
      const w=document.createElement('canvas');w.width=im.naturalWidth;w.height=im.naturalHeight;
      const x=w.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#fff';x.fillRect(0,0,w.width,w.height);
      res({dark:im,white:w});
    };
    im.onerror=()=>res(null);im.src=LOGO;
  }));
}
/* Draws the logo (and "stenhuset.no") into a 2D canvas. corner: 'br' | 'bl' | 'tl'; size = logo width as a share of the picture */
export async function stamp(canvas,{corner='br',size=.22,tone='white',url=true}={}){
  const L=await logos(),x=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
  const m=Math.round(Math.min(W,H)*.04),lw=Math.round(Math.max(110,W*size)),src=L&&(tone==='white'?L.white:L.dark);
  const lh=src?Math.round(lw*src.height/src.width):0,fs=Math.max(11,Math.round(lw*.085));
  const block=lh+(url?fs*1.6:0),left=corner==='bl'||corner==='tl',top=corner==='tl';
  const x0=left?m:W-m-lw,y0=top?m:H-m-block;
  x.save();
  if(tone==='white'){x.shadowColor='rgba(0,0,0,.45)';x.shadowBlur=Math.max(4,lw*.04);x.shadowOffsetY=1;}
  if(src)x.drawImage(src,x0,y0,lw,lh);
  else{x.font='600 '+Math.round(lw*.16)+'px Georgia, serif';x.fillStyle=tone==='white'?'#fff':'#4e4340';x.textBaseline='top';x.fillText('Stenhuset',x0,y0);}
  if(url){x.font=fs+'px Arial, sans-serif';x.fillStyle=tone==='white'?'rgba(255,255,255,.92)':'#4e4340';x.textBaseline='top';
    x.textAlign=left?'left':'right';x.fillText('stenhuset.no',left?x0+2:x0+lw-2,y0+lh+fs*.45);}
  x.restore();
  return canvas;
}
/* Copy any canvas (also a WebGL canvas, read back in the same task as it was drawn) and stamp it */
export async function stampedCopy(src,opts){
  const c=document.createElement('canvas');c.width=src.width;c.height=src.height;c.getContext('2d').drawImage(src,0,0);
  return stamp(c,opts);
}
export const toBlob=(c,type='image/jpeg',q=.9)=>new Promise(res=>c.toBlob(res,type,q));
export function download(blob,name){
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);
}
