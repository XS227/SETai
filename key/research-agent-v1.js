'use strict';
/* Bounded research study UI; never reads, collects or transmits wallet secret keys. */
(()=>{
 const $=id=>document.getElementById(id);
 const required=['research-agent-panel','research-agent-state','research-agent-counter',
  'research-agent-progress','research-agent-phase','research-agent-model','research-agent-ranking',
  'research-agent-avalanche','research-agent-assessment','research-agent-code',
  'research-agent-pause','research-agent-play','research-agent-feedback'];
 if(!required.every(id=>$(id)))return;
 const storageKey='setai-public-key-agent-job-v1';
 const status=$('research-agent-state'),count=$('research-agent-counter');
 const progress=$('research-agent-progress'),phase=$('research-agent-phase');
 const pause=$('research-agent-pause'),play=$('research-agent-play');
 const feedback=$('research-agent-feedback');
 const model=$('research-agent-model'),ranking=$('research-agent-ranking');
 const avalanche=$('research-agent-avalanche'),assessment=$('research-agent-assessment');
 const number=(n,decimals=2)=>Number(n).toLocaleString('nb-NO',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
 const confidence=stat=>stat?.ci95&&stat.n>=2?' (95 % KI: '+number(stat.ci95[0])+' til '+number(stat.ci95[1])+')':'';
 let last=null;
 async function request(url,method='GET',secret=''){
  const res=await fetch('/key/api/research/'+url,{method,cache:'no-store',headers:secret?{Authorization:'Bearer '+secret}:undefined,credentials:'same-origin'});
  const v=await res.json();
  if(!res.ok)throw Error(v.error||'HTTP '+res.status);
  return v;
 }
 function authenticate(){
  const code=$('research-agent-code').value.trim();
  if(code)return code;
  try{
   const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
   if(saved&&/^[a-f0-9]{64}$/.test(saved.access))return saved.access;
  }catch{}
  return '';
 }
 function update(s){
  last=s;
  const stages=s.phases||[];
  const current=stages.find(p=>p.id===s.phase)||{target:s.target,label:s.phase};
  const total=stages.reduce((a,b)=>a+b.target,0);
  const done=stages.slice(0,Math.max(0,stages.findIndex(p=>p.id===s.phase)))
    .reduce((a,b)=>a+b.target,0)+(s.completed||0);
  const labels={running:'● Pågår',paused:'⏸ Pauset',completed:'✓ Ferdig',error:'Feil'};
  status.textContent=labels[s.state]||s.state;
  count.textContent=number(done,0)+' / '+number(total,0)+' tester';
  progress.max=total;progress.value=Math.min(total,done);
  phase.textContent=(s.state==='completed'?'Alle planlagte tester er gjennomført. ':
    'Tester nå: '+current.label+' · '+number(s.completed||0,0)+' / '+number(s.target||0,0)+'. ');
  pause.disabled=s.state!=='running';play.disabled=s.state!=='paused';
  const data=s.measures||{},m=data.modelMinusRandomKeyBits,r=data.addressRankingGainKeyBits,a=data.oneBitFlipAddressBitsUnchanged;
  model.textContent=m?((m.mean>=0?'+':'')+number(m.mean)+' nøkkelbiter'+confidence(m)):'Ikke målt ennå';
  ranking.textContent=r?((r.mean>=0?'+':'')+number(r.mean)+' nøkkelbiter'+confidence(r)):'Ikke målt ennå';
  avalanche.textContent=a?number(a.mean)+' / 160 biter ('+number(a.mean/160*100,1)+' %)':'Ikke målt ennå';
  if(s.state==='error')assessment.textContent='Agenten stoppet på grunn av feil: '+(s.error||'ukjent');
  else if(s.state==='completed'){
   const positive=!!(m&&m.ci95&&m.ci95[0]>0);
   assessment.textContent=positive?
    'Foreløpig statistisk signal i modelltesten. Dette er IKKE bekreftet forbedring: må replikeres på nye uavhengige holdout-data.':
    'Ingen dokumentert modellforbedring over tilfeldige 50 % i denne forhåndsbestemte testen. Neste idé må testes med ny uavhengig protokoll.';
  }else{
   assessment.textContent='Måler modell vs. tilfeldig baseline, adresserangering og avalanche med kjente syntetiske nøkler. Ikke mål for en bestemt privatnøkkel.';
  }
 }
 async function refresh(){
  try{update(await request('status'));}catch(e){feedback.textContent='Kan ikke lese status: '+e.message;}
 }
 async function action(name){
  const secret=authenticate();
  if(!secret){feedback.textContent='Skriv serverens tilgangskode. Alternativt brukes jobbtilgangen automatisk dersom du allerede har startet en serverjobb på denne enheten.';return;}
  pause.disabled=true;play.disabled=true;feedback.textContent='Sender '+name+' …';
  try{
   const s=await request(name,'POST',secret);
   update(s);feedback.textContent=(name==='pause'?'Forskningsarbeidet er pauset.':'Forskningsarbeidet fortsetter fra lagret testnummer.');
   $('research-agent-code').value='';
  }catch(e){feedback.textContent='Kunne ikke '+name+': '+e.message;if(last)update(last);}
 }
 pause.addEventListener('click',()=>action('pause'));
 play.addEventListener('click',()=>action('resume'));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 setInterval(()=>{if(!document.hidden)refresh();},12000);
 void refresh();
})();
