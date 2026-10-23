/* Photo gallery + product sheet (PDF) for every product with original photos in assets/products/products-v1.json.
 * 10827 keeps its own hand-made view (product-10827-v1.js); the others reuse that layout with their own data. */
import * as P10827 from './product-10827-v1.js?v=2';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data=null;
const load=()=>data||(data=fetch(new URL('./assets/products/products-v1.json',import.meta.url)).then(r=>r.json()).then(d=>new Map(d.products.map(p=>[p.id,p]))));
const TABLES=new Set([10801,10753,10747,10635,10630,10625,10619,10612,10606]);
export async function has(id){return Number(id)===10827||(await load()).has(Number(id));}
export async function open({id,product,on3D,onAdd}={}){
  id=Number(id);
  if(id===10827)return P10827.open({product,on3D,onAdd});
  const p=(await load()).get(id);if(!p)throw new Error('Ingen produktdata for '+id);
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
  return view;
}
export const close=P10827.close;
