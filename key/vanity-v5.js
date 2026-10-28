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
  const maximum=Math.min(8,hardware),recommended=Math.min(4,Math.max(1,hardware-1));
  for(const n of [1,2,4,8].filter(n=>n<=maximum)){
    const option=document.createElement('option');option.value=String(n);option.textContent=n+' arbeider'+(n===1?'':'e');workerChoice.append(option);
  }
  workerChoice.value=String([1,2,4,8].filter(n=>n<=maximum&&n<=recommended).at(-1));
  let keyPromise=null,nextCounter=0n,runEpoch=0,lastRun=null;
  const allMatches=new Set();
  const visible=()=>!document.hidden&&!$('vanity-tool').hidden;
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
    $('vanity-engine').textContent=run.slots.length+' arbeidere · opptil 100 kandidater per bolk';
    $('vanity-session').textContent=new Intl.NumberFormat('nb-NO').format(nextCounter)+' forsøksnumre reservert i denne økten';
    status.textContent=run.found+' / '+run.target+' nye wallets'+(run.prefix?' med 0x'+run.prefix.toUpperCase()+'…':'')+
      (run.ended?' generert.':' funnet. Søket kjører '+(document.hidden||$('vanity-tool').hidden?'i bakgrunnen':'lokalt')+' …');
    if(run.dirty){run.dirty=false;render();}
  }
  function assign(slot,run){
    if(worker!==run||slot.pending)return;
    const size=run.prefix?100:Math.min(100,Math.max(1,run.target-run.found));
    if(nextCounter+BigInt(size)>(1n<<128n)){stopWork('Øktens forsøksrom er brukt opp. Last siden på nytt.');return;}
    const first=nextCounter;nextCounter+=BigInt(size);
    slot.pending={first:first.toString(),count:size};
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
    body.replaceChildren(fragment);$('vanity-empty').hidden=entries.length>0;
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
      worker=null;paintRun(true);
    }
    render();
    if(message)status.textContent=message;
  }
  function forget(){
    stopWork();for(const entry of entries)entry.key='';
    entries=[];lastRun=null;reveal=false;progress.value=0;$('vanity-attempts').textContent='0';$('vanity-speed').textContent='0 forsøk/s';render();
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
    const threads=Number(workerChoice.value);
    if(![1,10,100,500].includes(target)||![1,2,4,8].includes(threads)||threads>maximum)return;
    const epoch=++runEpoch,run={epoch,prefix:chosen,target,found:0,attempts:0,started:performance.now(),ended:0,painted:0,dirty:true,slots:[]};
    worker=lastRun=run;reveal=false;render();
    status.textContent='Starter '+threads+' parallelle arbeidere …';
    try{
      const secret=await getSessionKey();
      if(worker!==run||epoch!==runEpoch)return;
      for(let i=0;i<threads;i++){
        const instance=new Worker('vanity-worker-v3.js'),slot={instance,pending:null};
        run.slots.push(slot);
        instance.onmessage=event=>{
          if(worker!==run||epoch!==runEpoch)return;
          const message=event.data||{};
          if(message.type==='error'){stopWork(message.message);return;}
          if(message.type==='ready'){assign(slot,run);return;}
          if(message.type!=='batch'||message.first!==slot.pending?.first||message.processed!==slot.pending.count)return;
          slot.pending=null;run.attempts+=message.processed;
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
