'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const gate=$('gate'),dash=$('dashboard'),form=$('login-form'),code=$('access-code'),message=$('login-error'),unlock=$('unlock');
 const TOKEN_KEY='setai-agent-dashboard-view-session';
 let session=sessionStorage.getItem(TOKEN_KEY)||'',pending=false,before=null,trend=[],poll=null,liveTimer=null;
 let audit=null,lastPayload=null;
 const fmt=(n,digits=0)=>Number(n).toLocaleString('nb-NO',{minimumFractionDigits:digits,maximumFractionDigits:digits});
 const time=value=>{if(!value)return '—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleString('nb-NO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit'});};
 const labels={running:'Pågår',paused:'Pauset',completed:'Fullført',idle:'Inaktiv',found:'Treff',error:'Feil',exhausted:'Avsluttet'};
 const $text=(id,value)=>{$(id).textContent=value};
 function statusLabel(id,state){
  const el=$(id);el.textContent=labels[state]||state||'Ukjent';el.className=id==='wallet-badge'||id==='research-badge'?'pill':'status-chip';
  if(state==='paused'||state==='completed'||state==='error')el.classList.add(state);
 }
 function hide(){
  dash.hidden=true;gate.hidden=false;session='';sessionStorage.removeItem(TOKEN_KEY);trend=[];before=null;
  if(poll){clearInterval(poll);poll=null;}if(liveTimer){clearTimeout(liveTimer);liveTimer=null;}
 }
 async function api(endpoint,method='GET',body){
  const r=await fetch('/key/api/dashboard/'+endpoint,{method,credentials:'same-origin',cache:'no-store',headers:{
    ...(session?{Authorization:'Bearer '+session}:{}),
    ...(method==='POST'?{'Content-Type':'application/json'}:{})
  },body:body?JSON.stringify(body):undefined});
  let v;try{v=await r.json();}catch{throw Error('Ugyldig svar fra serveren');}
  if(!r.ok){const e=new Error(v.error||'HTTP '+r.status);e.code=r.status;throw e;}
  return v;
 }
 function series(wallet){
  const current=BigInt(wallet.attempts||'0'),now=Date.now();
  trend.push({time:now,attempts:current});
  trend=trend.filter(x=>now-x.time<=65000).slice(-30);
  const points=trend.map((v,i)=>{
    const first=trend[0].attempts,last=trend[trend.length-1].attempts;
    const diff=last-first;
    const y=diff===0n?100:100-((Number(v.attempts-first)/Number(diff))*78);
    return [i/(Math.max(1,trend.length-1))*598+1,Number.isFinite(y)?y:100].join(',');
  });
  $('wallet-trend-line').setAttribute('points',points.join(' '));
  const increase=current-trend[0].attempts;
  $text('wallet-trend-summary',fmt(increase)+' nye forsøk');
 }
 function stat(id,entry,description){
  if(!entry||typeof entry.mean!=='number'){$text(id,'Ikke målt');return;}
  const diff=entry.mean,ci=entry.ci95;
  const ciStr=Array.isArray(ci)&&ci.length===2?' · 95 % KI '+fmt(ci[0],2)+' til '+fmt(ci[1],2):'';
  $text(id,description+': '+(diff>0?'+':'')+fmt(diff,2)+' bit'+ciStr);
 }
 function render(v){
  lastPayload=v;
  const w=v.wallet||{},r=v.research||{},sv=v.server||{};
  $text('wallet-attempts',fmt(w.attempts||0));
  $text('wallet-speed',fmt(w.liveSpeed||0));
  $text('wallet-speed-note',w.state==='running'?'Nåværende hastighet':'Ingen aktivitet nå · siste måling '+fmt(w.lastMeasuredSpeed||0)+'/s');
  statusLabel('wallet-badge',w.state);statusLabel('wallet-status',w.state);
  $text('wallet-updated','Lagret '+time(w.updated));
  $text('wallet-prefix',w.prefixPreview?'0x'+w.prefixPreview:'—');
  $text('wallet-length',w.prefixLength?fmt(w.prefixLength)+' hex-tegn':'—');
  $text('wallet-started',time(w.started));
  $text('wallet-stored',time(w.updated));
  $text('wallet-description',w.statusExplanation||'Ingen aktiv jobb.');
  series(w);
  $text('research-tests',fmt(r.done||0));
  $text('research-total','av '+fmt(r.total||0));
  statusLabel('research-badge',r.state);statusLabel('research-status',r.state);
  const total=r.total||1,done=r.done||0,pct=Math.max(0,Math.min(100,done/total*100));
  $text('research-progress-label',fmt(pct,1)+' %');$('research-progress-fill').style.width=pct+'%';
  const m=r.measures||{};
  stat('model-result',m.modelMinusRandomKeyBits,'Forskjell fra tilfeldig');
  stat('ranking-result',m.addressRankingGainKeyBits,'Gevinst ved adresserangering');
  const a=m.oneBitFlipAddressBitsUnchanged;
  $text('avalanche-result',a?'I snitt '+fmt(a.mean,2)+'/160 adressebiter uendret':'Ikke målt');
  $text('model-count',fmt(m.modelMinusRandomKeyBits?.n||0)+' / 1 200');
  $text('ranking-count',fmt(m.addressRankingGainKeyBits?.n||0)+' / 1 200');
  $text('avalanche-count',fmt(a?.n||0)+' / 256');
  const mci=m.modelMinusRandomKeyBits?.ci95;
  const rci=m.addressRankingGainKeyBits?.ci95;
  let conclusion='';
  if(r.state==='completed'){
    const improvements=[mci,rci].some(x=>Array.isArray(x)&&x[0]>0);
    conclusion=improvements?
      'Forskningen er fullført. Et mulig signal krever uavhengig replikasjon før det kan kalles en forbedring.':
      'Alle testene er fullført. Ingen statistisk dokumentert forbedring av privatnøkkelgjetting mot tilfeldig søk.';
  }else if(r.state==='running')conclusion='Eksperimentene kjører. Eventuelle tidlige resultater er foreløpige.';
  else if(r.state==='paused')conclusion='Forskningsagenten er pauset. Ingen nye tester utføres.';
  else conclusion='Forskningen er '+(labels[r.state]||r.state||'ukjent').toLowerCase()+'.';
  $text('research-conclusion',conclusion);
  if(audit){
    const fresh=audit.cohorts.fresh;
    $text('research-tests',fmt(audit.uniqueControlledTrials));
    $text('research-total',fmt(audit.originalTrials)+' opprinnelige + '+fmt(audit.newIndependentTrials)+' ferske tester');
    statusLabel('research-badge','completed');statusLabel('research-status','completed');
    $text('research-progress-label','100 %');$('research-progress-fill').style.width='100%';
    stat('model-result',fresh.model,'AI minus tilfeldig');
    stat('ranking-result',fresh.ranking,'Gevinst ved adresserangering');
    stat('avalanche-result',fresh.avalanche,'Endrede adressebiter av 160');
    $text('model-count',fmt(fresh.model.n)+' / '+fmt(fresh.model.n));
    $text('ranking-count',fmt(fresh.ranking.n)+' / '+fmt(fresh.ranking.n));
    $text('avalanche-count',fmt(fresh.avalanche.n)+' / '+fmt(fresh.avalanche.n));
    $text('research-conclusion',audit.conclusion);
    $text('research-audit-note','Ny uavhengig kontrollrunde 24. oktober 2026. Alle ni opprinnelige summer/kvadratsummer er reprodusert. Den gamle gjenkjøringen telles ikke som nye data. 95 % Student-t-KI på testpar; Holm-justerte p-verdier i rapporten.');
  }
  $text('memory-value',fmt(sv.processRssMiB||0));
  $text('memory-limit','av '+fmt(sv.memoryLimitMiB||0)+' MiB maks');
  $text('resource-cpu',fmt(sv.cpuQuotaPercent||0)+' %');
  $text('resource-load',fmt(sv.load1m||0,2));
  $text('resource-status',labels[sv.state]||'Online');
  $text('resource-time',time(v.timestamp));
  $text('connection-label','Tilkoblet');
 }
 async function refresh(){
  if(pending||!session||document.hidden)return;
  pending=true;
  try{render(await api('status'));}catch(e){
    if(e.code===401){hide();message.textContent='Økten er utløpt. Tast kode på nytt.';}
    else $text('connection-label','Frakoblet · prøver igjen');
  }finally{pending=false;}
 }
 function show(){gate.hidden=true;dash.hidden=false;message.textContent='';refresh();if(poll)clearInterval(poll);poll=setInterval(refresh,5000);}
 form.addEventListener('submit',async(e)=>{
  e.preventDefault();const input=code.value.trim();
  if(!/^\d{3}$/.test(input)){message.textContent='Skriv en tresifret kode.';return;}
  unlock.disabled=true;message.textContent='Kontrollerer kode …';
  try{const x=await api('unlock','POST',{code:input});session=x.session;sessionStorage.setItem(TOKEN_KEY,session);code.value='';show();}
  catch(e){message.textContent=e.message;}
  finally{unlock.disabled=false;}
 });
 $('logout').addEventListener('click',()=>{if(session)void api('logout','POST').catch(()=>{});hide();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&session)refresh();});
 fetch('/key/research-v4/analysis.json',{cache:'no-store',credentials:'omit'})
  .then(response=>{if(!response.ok)throw new Error('Rapport utilgjengelig');return response.json();})
  .then(data=>{
    if(data.schema!=='setai-experiment-audit-v1'||data.studyId!=='20261024T142456Z'||!Object.values(data.checks||{}).every(Boolean))throw new Error('Ugyldig revisjon');
    audit=data;if(lastPayload)render(lastPayload);
  }).catch(()=>{$text('research-audit-note','Den reviderte analysen kunne ikke lastes. Tallene over viser den opprinnelige kjøringen. Åpne rapportlenken for den daterte kontrollrunden.');});
 if(session){gate.hidden=true;dash.hidden=false;show();}
})();
