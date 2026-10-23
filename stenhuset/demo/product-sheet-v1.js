/* Photo gallery + product sheet (PDF) for every product with original photos in assets/products/products-v1.json.
 * 10827 keeps its own hand-made view (product-10827-v1.js); the others reuse that layout with their own data. */
import * as P10827 from './product-10827-v1.js?v=2';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data=null;
const load=()=>data||(data=fetch(new URL('./assets/products/products-v1.json',import.meta.url)).then(r=>r.json()).then(d=>new Map(d.products.map(p=>[p.id,p]))));
const TABLES=new Set([10801,10753,10747,10635,10630,10625,10619,10612,10606]);
export async function has(id){return Number(id)===10827||(await load()).has(Number(id));}
/* Share card for social media: 1080×1350 (Instagram / Facebook portrait), original photo, name, size, Stenhuset logo */
async function shareCard(p){
  const W=await import('./watermark-v1.js?v=1'),im=new Image();
  im.src=new URL('./'+p.photos[0].f,import.meta.url).href;await im.decode();
  const c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d');
  x.fillStyle='#faf7f0';x.fillRect(0,0,1080,1350);
  const ph=1010,s=Math.max(1080/im.naturalWidth,ph/im.naturalHeight),w=im.naturalWidth*s,h=im.naturalHeight*s;
  x.save();x.beginPath();x.rect(0,0,1080,ph);x.clip();x.drawImage(im,(1080-w)/2,(ph-h)/2,w,h);x.restore();
  const f=Object.fromEntries(p.fields),size=f['Størrelse']||f['Mål']||'';
  x.fillStyle='#302e28';x.font='52px Georgia, serif';x.textBaseline='alphabetic';
  let name=p.n;while(x.measureText(name).width>990&&name.length>10)name=name.slice(0,-2);if(name!==p.n)name=name.trimEnd()+'…';
  x.fillText(name,48,ph+92);
  x.fillStyle='#716a60';x.font='26px Arial, sans-serif';x.fillText([size,f.Overflate].filter(Boolean).join('  ·  ').slice(0,60),48,ph+140);
  x.font='22px Arial, sans-serif';x.fillText('Se i 3D og last ned produktark på stenhuset.no',48,ph+282);
  await W.stamp(c,{corner:'br',size:.27,tone:'dark',url:false});
  return W.toBlob(c,'image/jpeg',.9);
}
function addShare(d,id,p){
  const box=d.querySelector('.sh10827-buttons');if(!box||!p||!p.photos.length)return;
  const b=document.createElement('button');b.className='sh10827-btn';b.type='button';b.textContent='Del produktet ↗';box.append(b);
  const msg=d.querySelector('.sh10827-message');
  b.onclick=async()=>{
    const url=new URL('./del.php?p='+id,import.meta.url).href;
    try{
      const blob=await shareCard(p),file=new File([blob],'stenhuset-'+id+'.jpg',{type:'image/jpeg'});
      if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:p.n,text:p.n+' – Stenhuset',url});return;}
      if(navigator.share){await navigator.share({title:p.n,url});return;}
      const W=await import('./watermark-v1.js?v=1');W.download(blob,'stenhuset-'+id+'.jpg');
      try{await navigator.clipboard.writeText(url);}catch(_){}
      if(msg)msg.textContent='Bildet er lastet ned og lenken er kopiert.';
    }catch(e){if(e&&e.name==='AbortError')return;if(msg)msg.textContent='Kunne ikke dele: '+(e&&e.message||e);}
  };
}
export async function open({id,product,on3D,onAdd}={}){
  id=Number(id);
  const all=await load().catch(()=>new Map());
  if(id===10827){const v=P10827.open({product,on3D,onAdd});addShare(v.dialog,id,all.get(id));return v;}
  const p=all.get(id);if(!p)throw new Error('Ingen produktdata for '+id);
  const base=new URL('./',import.meta.url).href,pdfName='Stenhuset_'+id+'_Produktark.pdf';
  const media=p.photos.map((ph,i)=>({src:base+ph.f,label:i===0?'Helhet':'Bilde '+(i+1),alt:ph.alt}));
  const view=P10827.open({product:{id,n:p.n,u:p.url,p:p.price},media,pdf:base+'assets/products/'+id+'/'+pdfName,on3D,onAdd});
  const d=view.dialog,f=Object.fromEntries(p.fields),size=f['Størrelse']||f['Mål']||'';
  d.querySelector('.sh10827-kicker').textContent=(TABLES.has(id)?'Marmorbord og pidestaller':'Stenvasker')+(f.Materiale?' / '+f.Materiale:'');
  d.querySelector('.sh10827-desc').textContent=p.intro||'';
  d.querySelector('.sh10827-btn.pdf')?.setAttribute('download',pdfName);
  const rows=[['Mål',size],['Materiale',f.Materiale],['Farge',f.Farge],['Overflate',f.Overflate],['Sluk',f.Sluk],['Armaturhull',f.Armaturhull],['Vekt',f.Vekt],['Bruksområde',f['Bruksområde']]].filter(r=>r[1]);
  d.querySelector('dl').innerHTML=rows.map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd></div>').join('');
  const det=d.querySelectorAll('details');
  if(det[1])det[1].querySelector('p').textContent=f.Vedlikehold||f.Behandling||'Rengjør med pH-nøytralt vaskemiddel.';
  if(det[0]&&f.Merk)det[0].querySelector('p').textContent=f.Merk;
  const foot=d.querySelector('.sh10827-footer span');if(foot)foot.textContent='STENHUSET · PRODUKT '+id;
  addShare(d,id,p);
  return view;
}
export const close=P10827.close;
