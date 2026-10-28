'use strict';
(() => {
  const $=id=>document.getElementById(id);
  const prefix=$('vanity-prefix'),count=$('vanity-count'),start=$('vanity-start');
  const stop=$('vanity-stop'),clear=$('vanity-clear'),toggle=$('vanity-reveal');
  const status=$('vanity-status'),body=$('vanity-rows'),sort=$('vanity-sort');
  const direction=$('vanity-direction'),progress=$('vanity-progress');
  let worker=null,entries=[],serial=0,reveal=false,ascending=false;
  const collator=new Intl.Collator('nb-NO',{numeric:true,sensitivity:'base'});
  const workerChoice=$('vanity-workers');
  const hardware=Math.max(1,Number(navigator.hardwareConcurrency)||2);
  // Users may request many logical jobs, but browser CPU workers remain bounded.
  // Values > physical cap are queued work units, never pretend 1000 active threads.
  const choices=[1,2,4,8,16,32,64,128,256,500,1000];
  const maximum=Math.min(32,Math.max(8,hardware*4));
  const recommended=Math.min(8,Math.max(1,hardware-1));
  for(const n of choices){
    const option=document.createElement('option');
    option.value=String(n);
    option.textContent=n<=maximum
      ? n+' aktive arbeider'+(n===1?'':'e')
      : n+' søkejobber · maks '+maximum+' aktive';
    workerChoice.append(option);
  }
  workerChoice.value=String(choices.filter(n=>n<=recommended).at(-1));
  $('vanity-parallel-help').textContent='Denne enheten rapporterer '+hardware+' CPU-tråder. Du kan velge opptil 1 000 søkejobber per runde, men høyst '+
    maximum+' ekte Web Workers kan være aktive samtidig. Resten fordeles i kø. Flere jobber betyr ikke automatisk høyere fart eller 1 000 CPU-tråder.';
  let keyPromise=null,nextCounter=0n,runEpoch=0,lastRun=null;
  const allMatches=new Set();
  const visible=()=>!document.hidden&&!$('vanity-tool').hidden;
  const formatDuration=seconds=>{
    if(seconds===null||!Number.isFinite(seconds))return 'Beregner …';
    if(seconds<0)return 'Beregner …';
    if(seconds>=31557600*1000)return 'Over 1 000 år';
    let n=Math.ceil(seconds);
    const y=Math.floor(n/31557600);n%=31557600;
    const d=Math.floor(n/86400);n%=86400;
    const h=Math.floor(n/3600);n%=3600;
    const m=Math.floor(n/60),sec=n%60;
    if(y)return y+' år '+d+' d';
    if(d)return d+' d '+h+' t';
    if(h)return h+' t '+String(m).padStart(2,'0')+' min';
    return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
  };
  const fmtN=n=>new Intl.NumberFormat('nb-NO').format(n);
  const calcEstimate=(prefixLength,remaining,speed)=>{
    if(!(speed>0)&&remaining>0)return null;
    if(remaining<=0)return 0;
    const required=16n**BigInt(prefixLength)*BigInt(remaining);
    // bigint to Number overflows for extreme prefixes. Translate log10 safely.
    const estimate=Number(required)/speed;
    return Number.isFinite(estimate)?estimate:Infinity;
  };
  function paintEta(run,now){
    const left=Math.max(0,run.target-run.found);
    const seconds=Math.max(0.001,((run.ended||now)-run.started)/1000);
    const rate=run.attempts/seconds;
    // Recalibrate only when fresh work completes; between results the display
    // counts down each second rather than drifting upward on a stalled batch.
    if(run.attempts>0 && run.etaSampleAttempts!==run.attempts){
      run.etaSampleAttempts=run.attempts;
      run.etaSampleTime=now;
      run.etaSampleSeconds=calcEstimate(run.prefix.length,left,rate);
    }
    const eta=run.etaSampleSeconds===undefined?null:
      Math.max(0,run.etaSampleSeconds-(now-run.etaSampleTime)/1000);
    $('vanity-eta').textContent=run.ended?(left===0?'Ferdig':'Stoppet'):formatDuration(eta);
    $('vanity-eta-label').textContent=run.prefix?'ESTIMERT RESTTID · VARIERER MED FLAKS':'ESTIMERT RESTTID';
    $('vanity-eta-note').textContent=run.ended?
      (left===0?'Alle ønskede wallets er generert.':'Genereringen er stoppet.'):
      (run.attempts===0?'Måler faktisk hastighet …':
        'Gjennomsnittlig anslag basert på '+fmtN(Math.ceil(16**Math.min(run.prefix.length,9)))+
        (run.prefix.length>9?' eller flere':'')+
        ' forventede forsøk per treff og målt hastighet. Ingen garantert sluttid.');
  }
  let etaTicker=null;
  function updateTicker(){
    if(etaTicker!==null)return;
    etaTicker=setInterval(()=>{
      if(worker)paintRun(true);
      else{clearInterval(etaTicker);etaTicker=null;}
    },1000);
  }
  function stopTicker(){if(etaTicker!==null){clearInterval(etaTicker);etaTicker=null;}}
  function getSessionKey(){
    if(!keyPromise)keyPromise=crypto.subtle.generateKey({name:'HMAC',hash:'SHA-256',length:256},false,['sign']);
    return keyPromise;
  }
  function paintRun(force=false){
    const run=lastRun;
    if(!run||(!visible()&&!force))return;
    const now=performance.now();
    if(!force&&now-run.painted<250)return;
    run.painted=now;
    progress.max=run.target;progress.value=run.found;
    $('vanity-attempts').textContent=new Intl.NumberFormat('nb-NO').format(run.attempts);
    const seconds=Math.max(.001,((run.ended||now)-run.started)/1000);
    $('vanity-speed').textContent=new Intl.NumberFormat('nb-NO',{maximumFractionDigits:0}).format(run.attempts/seconds)+' forsøk/s';
    const wavePosition=run.jobsFinished%run.requestedJobs;
    $('vanity-engine').textContent=run.slots.length+' av maks '+run.maxWorkers+
      ' aktive CPU-arbeidere · '+run.requestedJobs+' søkejobber per runde · '+wavePosition+
      '/'+run.requestedJobs+' jobber fullført i gjeldende runde';
    paintEta(run,now);
    $('vanity-session').textContent=new Intl.NumberFormat('nb-NO').format(nextCounter)+' forsøksnumre reservert i denne økten';
    status.textContent=run.found+' / '+run.target+' nye wallets'+(run.prefix?' med 0x'+run.prefix.toUpperCase()+'…':'')+
      (run.ended?' generert.':' funnet. Søket kjører '+(document.hidden||$('vanity-tool').hidden?'i bakgrunnen':'lokalt')+' …');
    if(run.dirty){run.dirty=false;render();}
  }
  function assign(slot,run){
    if(worker!==run||slot.pending)return;
    // Avoid reserving thousands of extra candidates if no prefix was selected.
    const reserved=run.slots.reduce((sum,s)=>sum+(s.pending?s.pending.count:0),0);
    const needed=run.target-run.found-reserved;
    if(!run.prefix&&needed<=0)return;
    const size=run.prefix?1000:Math.min(1000,Math.max(1,Math.ceil(needed/Math.max(1,run.slots.length))));
    if(nextCounter+BigInt(size)>(1n<<128n)){stopWork('Øktens forsøksrom er brukt opp. Last siden på nytt.');return;}
    const first=nextCounter;nextCounter+=BigInt(size);
    slot.pending={first:first.toString(),count:size};
    run.jobsStarted++;
    slot.instance.postMessage({type:'batch',first:first.toString(),count:size});
  }

  function render(){
    const values=entries.slice().sort((a,b)=>{
      const compared=sort.value==='address'?collator.compare(a.address,b.address):a.id-b.id;
      return (ascending?compared:-compared)||b.id-a.id;
    });
    const fragment=document.createDocumentFragment();
    for(const entry of values){
      const row=document.createElement('tr');
      const numberCell=document.createElement('th');
      numberCell.scope='row';numberCell.textContent=String(entry.id);
      const addressCell=document.createElement('td');
      const link=document.createElement('a');
      link.href='https://etherscan.io/address/'+entry.address;
      link.target='_blank';
      link.rel='noopener noreferrer';
      link.referrerPolicy='no-referrer';
      link.className='vanity-etherscan-link';
      link.textContent=entry.address;
      link.title='Vis offentlig wallet-adresse på Etherscan (ny fane)';
      link.setAttribute('aria-label','Åpne offentlig wallet-adresse '+entry.address+' på Etherscan i ny fane');
      addressCell.append(link);
      const keyCell=document.createElement('td');
      keyCell.className='vanity-secret-cell';
      keyCell.textContent=reveal?entry.key:'•••••••• · skjult';
      row.append(numberCell,addressCell,keyCell);
      fragment.append(row);
    }
    body.replaceChildren(fragment);
    $('vanity-results').hidden=entries.length===0;
    $('vanity-stored').textContent=entries.length+' / 500 wallets i denne økten';
    direction.textContent=ascending?'↑ Stigende':'↓ Synkende';
    toggle.textContent=reveal?'Skjul privatnøkler':'Vis privatnøkler';
    toggle.setAttribute('aria-pressed',String(reveal));toggle.disabled=!entries.length;
    clear.disabled=!entries.length&&!worker;stop.disabled=!worker;
    start.disabled=!!worker||!globalThis.isSecureContext||!globalThis.crypto?.getRandomValues||!globalThis.Worker||!globalThis.crypto?.subtle;
    prefix.disabled=count.disabled=workerChoice.disabled=!!worker;
  }
  function stopWork(message){
    runEpoch++;
    const run=worker;
    if(run){
      run.ended=performance.now();
      for(const slot of run.slots)slot.instance.terminate();
      worker=null;paintRun(true);stopTicker();
    }
    render();
    if(message)status.textContent=message;
  }
  function forget(){
    stopWork();for(const entry of entries)entry.key='';
    entries=[];lastRun=null;reveal=false;progress.value=0;$('vanity-attempts').textContent='0';$('vanity-speed').textContent='0 forsøk/s';
    $('vanity-eta').textContent='–';$('vanity-eta-note').textContent='Start et søk for å beregne resttid.';render();
    status.textContent='Listen er tømt.';
  }
  function updateEstimate(){
    const chosen=prefix.value.trim().replace(/^0x/i,'').toUpperCase();
    prefix.value=chosen;
    if(!chosen){
      $('vanity-estimate').textContent='Ingen prefiksfilter: nye tilfeldige wallets lages direkte. Skriv 1–40 tegn for å velge starten på adressen.';
      return;
    }
    if(!/^[0-9A-F]{1,40}$/.test(chosen)){
      $('vanity-estimate').textContent='Bruk 1–40 tegn fra 0–9 og A–F. Du kan også lime inn prefikset med 0x foran.';
      return;
    }
    const attempts=16n**BigInt(chosen.length),target=BigInt(count.value);
    const number=new Intl.NumberFormat('nb-NO');
    $('vanity-estimate').textContent=chosen.length+' tegn valgt · 0x'+chosen+'…'+
      ' · I snitt '+number.format(attempts)+' forsøk per treff. For '+target+
      ' wallets: i snitt '+number.format(attempts*target)+' forsøk.'+
      (chosen.length>=8?' Lange prefikser kan være praktisk uoppnåelige. Velg gjerne ett treff eller et kortere prefiks.':'')+
      ' Dette er et gjennomsnitt, ikke en garanti. Du kan stoppe når som helst.';
  }
  prefix.addEventListener('input',updateEstimate);
  count.addEventListener('change',updateEstimate);
  start.addEventListener('click',async()=>{
    if(worker)return;
    const chosen=prefix.value.trim().replace(/^0x/i,'').toLowerCase(),target=Number(count.value);
    if(chosen&&!/^[0-9a-f]{1,40}$/.test(chosen)){
      status.textContent='Skriv 1–40 tegn fra 0–9 og A–F, eller la feltet stå tomt.';prefix.focus();return;
    }
    const requestedJobs=Number(workerChoice.value);
    if(![1,10,100,500].includes(target)||!choices.includes(requestedJobs))return;
    const threads=Math.min(requestedJobs,maximum);
    const epoch=++runEpoch,run={epoch,prefix:chosen,target,requestedJobs,maxWorkers:maximum,
      jobsStarted:0,jobsFinished:0,found:0,attempts:0,
      started:performance.now(),ended:0,painted:0,dirty:true,slots:[]};
    worker=lastRun=run;reveal=false;render();updateTicker();paintEta(run,performance.now());
    status.textContent='Starter '+threads+' ekte arbeidere med '+requestedJobs+' søkejobber i kø …';
    try{
      const secret=await getSessionKey();
      if(worker!==run||epoch!==runEpoch)return;
      for(let i=0;i<threads;i++){
        const instance=new Worker('vanity-worker-v4.js'),slot={instance,pending:null};
        run.slots.push(slot);
        instance.onmessage=event=>{
          if(worker!==run||epoch!==runEpoch)return;
          const message=event.data||{};
          if(message.type==='error'){stopWork(message.message);return;}
          if(message.type==='ready'){assign(slot,run);return;}
          if(message.type!=='batch'||message.first!==slot.pending?.first||message.processed!==slot.pending.count)return;
          slot.pending=null;run.attempts+=message.processed;run.jobsFinished++;
          for(const entry of message.matches){
            if(run.found>=run.target)break;
            const address=entry.address.toLowerCase();
            if(allMatches.has(address))continue;
            allMatches.add(address);run.found++;
            entries.unshift({...entry,id:++serial});
            if(entries.length>500)entries.pop().key='';
            run.dirty=true;
          }
          paintRun();
          if(run.found>=run.target){stopWork(run.found+' nye wallets er klare.');return;}
          assign(slot,run);
        };
        instance.onerror=()=>{if(worker===run)stopWork('En arbeider stoppet. Beholdte treff er fortsatt tilgjengelige. Start igjen for å fortsette med nye forsøksnumre.');};
        instance.postMessage({type:'init',key:secret,prefix:chosen});
      }
      paintRun(true);
    }catch{
      if(worker===run)stopWork('Generatoren kunne ikke starte. Bruk en oppdatert nettleser via HTTPS.');
    }
  });
  stop.addEventListener('click',()=>stopWork('Genereringen er stoppet. Wallets som allerede er vist, beholdes.'));
  clear.addEventListener('click',forget);
  toggle.addEventListener('click',()=>{reveal=!reveal;render();});
  sort.addEventListener('change',()=>{ascending=sort.value==='address';render();});
  direction.addEventListener('click',()=>{ascending=!ascending;render();});
  function hideKeys(){
    reveal=false;
    // Tab switches no longer terminate the search. Render once to conceal any shown keys.
    render();
    paintRun(true);
  }
  document.addEventListener('visibilitychange',()=>{hideKeys();});
  $('tool-vanity').addEventListener('click',()=>{paintRun(true);render();});
  new MutationObserver(hideKeys).observe($('vanity-tool'),{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('resume',()=>{paintRun(true);render();});
  window.addEventListener('pagehide',()=>{forget();keyPromise=null;nextCounter=0n;allMatches.clear();});
  render();
})();
