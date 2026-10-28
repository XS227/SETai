'use strict';
/* Server search uses PUBLIC elliptic curve point only. Client private scalar NEVER leaves browser.
   Save secret offline yourself before starting. Browser stores only job read capability.
*/
(() => {
 const $=id=>document.getElementById(id);
 const start=$('server-agent-start'),make=$('server-agent-create'),saveBox=$('server-agent-saved');
 const input=$('server-agent-code'),panel=$('server-agent-panel'),state=$('server-agent-status');
 const progress=$('server-agent-progress'),stop=$('server-agent-stop'),resume=$('server-agent-resume');
 const output=$('server-agent-secret'),recovery=$('server-agent-recovery');
 const reveal=$('server-agent-reveal'),privateOutput=$('server-agent-private');
 if(![start,make,saveBox,input,panel,state,progress,stop,resume,output,recovery,reveal,privateOutput].every(Boolean))return;
 const STORAGE='setai-public-key-agent-job-v1', N=BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
 let master='',job=null,last=null,pollTimer=null,busy=false;
 const fmt=n=>new Intl.NumberFormat('nb-NO').format(n);
 const api=async(url,method='GET',auth='',data)=>{
  const response=await fetch('/key/api/'+url,{method,headers:{
    ...(auth?{'Authorization':'Bearer '+auth}:{}),
    ...(method==='POST'?{'Content-Type':'application/json'}:{})
   },body:data?JSON.stringify(data):undefined,cache:'no-store',credentials:'same-origin'});
  const message=await response.json();
  if(!response.ok)throw Error(message.error||'Serverfeil ('+response.status+')');
  return message;
 };
 const error=e=>{state.textContent=e.message||'Noe gikk galt.';};
 function draw(s){
  last=s;
  panel.open=true;
  const found=s.state==='found';
  $('server-agent-found').hidden=!found;
  if(found){
    $('server-agent-found-address').textContent=s.foundAddress;
    $('server-agent-found-link').href='https://etherscan.io/address/'+s.foundAddress;
    $('server-agent-found-index').textContent=fmt(s.foundIndex);
  }
  const begun=Date.parse(s.started),seconds=Math.max(1,(Date.now()-begun)/1000),rate=Number(s.attempts)/seconds;
  progress.textContent='Status: '+s.state+' · forsøk: '+fmt(s.attempts)+
   ' · '+new Intl.NumberFormat('nb-NO',{maximumFractionDigits:0}).format(rate)+' forsøk/s siden start.';
  $('server-agent-estimate').textContent=(rate>0&&s.state==='running')
   ?'Gjennomsnittstid til ett treff med dette prefikset: omtrent '+
     approximateETA(Number((16n**BigInt(s.prefix.length))),rate)+
     '. Dette er bare et sannsynlighetsanslag.'
   :'Vent på målte forsøk for et tidsanslag.';
  stop.disabled=s.state!=='running';resume.disabled=s.state!=='paused';
  state.textContent=found?'Treff funnet! Bruk den lokalt lagrede startnøkkelen for å avlede privatnøkkelen.':
    s.state==='running'?'▶ Søket kjører på VPS-en etter 0x'+s.prefix+'. Trykk Pause når du trenger serverressursene til noe annet.':
    s.state==='paused'?'⏸ Søket er pauset. CPU-søk er stoppet og fremdriften lagret. Trykk Play for å fortsette fra forsøk '+fmt(s.attempts)+'.':
    'Jobbstatus: '+s.state;
 }
 function approximateETA(tries,rate){
  const secs=tries/rate;
  if(!Number.isFinite(secs))return 'ekstremt lang tid';
  if(secs>31557600)return (secs/31557600).toFixed(1)+' år';
  if(secs>86400)return (secs/86400).toFixed(1)+' døgn';
  if(secs>3600)return (secs/3600).toFixed(1)+' timer';
  if(secs>60)return (secs/60).toFixed(1)+' minutter';
  return Math.round(secs)+' sekunder';
 }
 async function refresh(){
  if(!job)return;
  try{
   const s=await api('jobs/'+job.id,'GET',job.access);
   draw(s);
   if(s.state==='found'||s.state==='paused'||s.state==='exhausted'||s.state==='error')clearInterval(pollTimer),pollTimer=null;
  }catch(e){error(e);}
 }
 function polling(){
  if(pollTimer!==null)clearInterval(pollTimer);
  pollTimer=setInterval(()=>{if(!document.hidden)refresh()},8000);
 }
 make.addEventListener('click',()=>{
  try{
   if(typeof LocalWalletCrypto?.derivePublicKey!=='function'||typeof generatePrivateKey!=='function')throw Error('Kryptobiblioteket er ikke tilgjengelig.');
   master=generatePrivateKey();
   output.textContent=master;
   $('server-agent-secret-box').hidden=false;
   saveBox.checked=false;
   $('server-agent-secret-warning').textContent='Lagre denne private startnøkkelen på en trygg måte FØR du starter. Uten den kan ingen – heller ikke serveren – gi deg privatnøkkelen for et treff.';
   state.textContent='Ny lokal privat startnøkkel generert. Serveren har ikke mottatt den.';
  }catch(e){error(e);}
 });
 $('server-agent-copy').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(master);state.textContent='Startnøkkelen ble kopiert. Lagre den sikkert; den må ikke deles.';}
  catch{state.textContent='Kunne ikke kopiere. Lagre startnøkkelen manuelt.';}
 });
 start.addEventListener('click',async()=>{
  if(busy)return;
  const prefix=$('vanity-prefix').value.trim().toLowerCase().replace(/^0x/,'');
  if(!/^[0-9a-f]{1,40}$/.test(prefix)){state.textContent='Skriv et prefiks i feltet ovenfor, for eksempel 123 eller abc.';return;}
  if(!master||!saveBox.checked){state.textContent='Opprett og lagre startnøkkelen først, og bekreft at du har en sikker kopi.';return;}
  const code=input.value.trim();
  if(!/^[a-f0-9]{48}$/.test(code)){state.textContent='Skriv inn serverens tilgangskode for å starte en bakgrunnsjobb.';return;}
  busy=true;start.disabled=true;
  try{
   const publicKey=LocalWalletCrypto.derivePublicKey(master);
   const s=await api('jobs','POST',code,{prefix,publicKey});
   job={id:s.id,access:s.access};
   localStorage.setItem(STORAGE,JSON.stringify(job));input.value='';
   draw(s);polling();start.textContent='En serverjobb er opprettet';
  }catch(e){error(e);}
  finally{busy=false;start.disabled=false;}
 });
 stop.addEventListener('click',async()=>{
  try{if(!job)return;draw(await api('jobs/'+job.id+'/stop','POST',job.access));}
  catch(e){error(e);}
 });
 resume.addEventListener('click',async()=>{
  try{if(!job)return;draw(await api('jobs/'+job.id+'/resume','POST',job.access));polling();}
  catch(e){error(e);}
 });
 reveal.addEventListener('click',()=>{
  try{
   if(!last||last.state!=='found'||!last.foundAddress)throw Error('Ingen ferdig jobb.');
   const text=recovery.value.trim().replace(/^0x/,'').toLowerCase();
   if(!/^[0-9a-f]{64}$/.test(text))throw Error('Startnøkkelen må inneholde 64 hex-tegn.');
   const secret=BigInt('0x'+text);
   if(secret<=0n||secret>=N)throw Error('Ugyldig privat startnøkkel.');
   const child=(secret+BigInt(last.foundIndex))%N;
   if(!child)throw Error('Avledet nøkkel er ugyldig.');
   const childKey=child.toString(16).padStart(64,'0');
   const derived=LocalWalletCrypto.deriveAddress(childKey);
   if(derived.toLowerCase()!==last.foundAddress.toLowerCase())throw Error('Nøkkelen stemmer ikke med adressen. Kontroller startnøkkelen.');
   privateOutput.textContent=childKey;
   $('server-agent-private-box').hidden=false;
   recovery.value='';
   state.textContent='Nøkkelen ble korrekt rekonstruert LOKALT og bekreftet mot wallet-adressen. Serveren mottok ingen privatnøkkel.';
  }catch(e){error(e);}
 });
 window.addEventListener('pagehide',()=>{
  master='';output.textContent='';recovery.value='';privateOutput.textContent='';
  $('server-agent-private-box').hidden=true;
  if(pollTimer!==null)clearInterval(pollTimer);
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 try{
  const saved=JSON.parse(localStorage.getItem(STORAGE)||'null');
  if(saved&&/^[a-f0-9]{32}$/.test(saved.id)&&/^[a-f0-9]{64}$/.test(saved.access)){
   job=saved;void refresh();polling();
  }
 }catch{}
})();
