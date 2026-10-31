/* SETAEI ET02 registered target display. Public address data only.
   This visualization does not generate or test cryptographic private keys,
   does not submit private data to the server and does not control the live agent. */
(async function(){
'use strict';
const root=document.getElementById('registered-targets');
if(!root)return;
const $=(sel)=>root.querySelector(sel);
const isAddress=s=>/^0x[0-9a-fA-F]{40}$/.test(s);
const bits=s=>Array.from(s.slice(2).toLowerCase(),h=>parseInt(h,16).toString(2).padStart(4,'0')).join('');
const distance=(a,b)=>{let d=0;for(let i=0;i<160;i++)d+=(a[i]!==b[i]);return d};
const registered=[];
try {
 const res=await fetch('../assets/registered-targets.json',{cache:'no-store'});
 if(!res.ok)throw Error('HTTP '+res.status);
 const doc=await res.json();
 if(doc.study!=='SETAEI-ET02'||!Array.isArray(doc.registered_targets)||doc.registered_targets.length!==9)throw Error('Ugyldig datasett');
 for(const t of doc.registered_targets){if(!isAddress(t.address))throw Error('Ugyldig adresse: '+t.id);registered.push({...t,bits:bits(t.address)});}
} catch(e) {
 $('#reg-status').textContent='Kan ikke hente registrerte forskningsmål: '+e.message;
 return;
}
let lastLocal=null;
function draw(){
 const rows=registered.map(x=>({...x,mode:'user-registered'}));
 if(lastLocal)rows.push({id:'R10',address:lastLocal,bits:bits(lastLocal),mode:'local-unpublished'});
 $('#reg-count').textContent=rows.length+' / 10';
 $('#reg-status').textContent=lastLocal?'Ni registrerte mål + én referanse bare i nettleseren.':'Ni registrerte adresser. Det opprinnelige tiende målet er ikke verifisert i tilgjengelig live-API.';
 const list=$('#registered-address-list');list.replaceChildren();
 for(let i=0;i<10;i++){
  const row=document.createElement('div');row.className='registered-entry';
  const label=document.createElement('span');label.className='label';label.textContent='LAG '+String(i+1).padStart(2,'0');
  const code=document.createElement('code');code.textContent=rows[i]?.address||'Referanse fra eksisterende forsøk ikke tilgjengelig';
  const chip=document.createElement('span');chip.className='label '+(i===9?'cyan':'green');chip.textContent=i===9?(lastLocal?'LOKALT VALGT':'MANGLER REFERANSE'):'REGISTRERT';
  row.append(label,code,chip);list.append(row);
 }
 const matrix=$('#registered-bit-matrix');matrix.replaceChildren();
 for(let i=0;i<10;i++){
   const group=document.createElement('div');group.className='reg-bitrow';group.setAttribute('role','group');group.setAttribute('aria-label','Bitmønster lag '+(i+1));
   const t=document.createElement('div');t.className='reg-row-label';t.textContent=i===9?'10 · '+(lastLocal?'lokalt':'venter'):'0'+(i+1);
   group.append(t);
   const body=document.createElement('div');body.className='reg-bits';group.append(body);
   for(let j=0;j<160;j++){
     const cell=document.createElement('span');cell.className='reg-bit '+(rows[i]?(rows[i].bits[j]==='1'?'reg-one':'reg-zero'):'reg-empty');cell.title='Lag '+(i+1)+' · bit '+(j+1)+': '+(rows[i]?.bits[j]||'–');
     body.append(cell);
   }
   matrix.append(group);
 }
 const n=rows.length;const count=Array.from({length:160},(_,i)=>rows.reduce((s,t)=>s+(t.bits[i]==='1'),0));
 let pairCount=0,total=0,min={value:161,a:0,b:0},max={value:-1,a:0,b:0};
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const d=distance(rows[i].bits,rows[j].bits);total+=d;pairCount++;if(d<min.value)min={value:d,a:i+1,b:j+1};if(d>max.value)max={value:d,a:i+1,b:j+1};}
 const fmt=num=>num.toLocaleString('nb-NO',{maximumFractionDigits:2});
 $('#reg-pairmean').textContent=pairCount?fmt(total/pairCount)+' / 160':'–';
 $('#reg-pairmin').textContent=pairCount?min.value+' (lag '+min.a+'–'+min.b+')':'–';
 $('#reg-pairmax').textContent=pairCount?max.value+' (lag '+max.a+'–'+max.b+')':'–';
 const cons=Math.max(1,n-1);
 const strongest=count.map((x,i)=>({position:i+1,ones:x,strength:Math.max(x,n-x)})).sort((a,b)=>b.strength-a.strength||a.position-b.position);
 const unanimous=count.filter(x=>x===0||x===n).length;
 $('#reg-consensus').textContent=unanimous+' / 160';
 $('#reg-topbits').textContent=strongest.slice(0,12).map(x=>'bit '+x.position+': '+x.ones+'/'+n+' énere').join(' · ');
 $('#reg-summary').textContent='Alle '+pairCount+' parvise sammenligninger er laget fra '+n+' offentlige 160-bits adresser. Under uavhengig uniform tilfeldig adressemodell forventes omtrent 80 ulike bit per par. Et lite utvalg på '+n+' adresser kan ha tilsynelatende sterke flertallsmønstre uten prediktiv verdi.';
 const csv=['layer,address,status',...rows.map((x,i)=>[i+1,x.address,x.mode].join(',')),...(n<10?['10,,unresolved']:[])].join('\n');
 $('#reg-export').onclick=()=>{
  const blob=new Blob([csv+'\n'],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='setaei-et02-public-address-targets.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
 };
}
$('#reg-apply').addEventListener('click',()=>{
 const raw=$('#reg-tenth').value.trim();
 if(raw&&!isAddress(raw)){ $('#reg-input-message').textContent='Ugyldig adresse. Format: 0x + 40 heksadesimale tegn.';return; }
 if(raw&&registered.some(t=>t.address.toLowerCase()===raw.toLowerCase())){$('#reg-input-message').textContent='Adressen er allerede registrert blant de ni.';return;}
 lastLocal=raw||null;
 $('#reg-input-message').textContent=raw?'Lag 10 er lagt til lokalt i denne nettleseren. Det er ikke lagret på VPS-en.':'Lokalt tiende lag er tømt.';
 draw();
});
draw();
})();
