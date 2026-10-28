'use strict';
(() => {
  const $=id=>document.getElementById(id);
  const prefix=$('vanity-prefix'),count=$('vanity-count'),start=$('vanity-start');
  const stop=$('vanity-stop'),clear=$('vanity-clear'),toggle=$('vanity-reveal');
  const status=$('vanity-status'),body=$('vanity-rows'),sort=$('vanity-sort');
  const direction=$('vanity-direction'),progress=$('vanity-progress');
  let worker=null,entries=[],serial=0,reveal=false,ascending=false;
  const collator=new Intl.Collator('nb-NO',{numeric:true,sensitivity:'base'});
  function exactAmount(amount,asset){
    const decimals=asset==='eth'?18:6;
    const [whole,fraction='']=amount.split('.');
    return BigInt(whole)*10n**BigInt(decimals)+BigInt(fraction.padEnd(decimals,'0'));
  }
  function balanceInput(entry,asset){
    const cell=document.createElement('td'),input=document.createElement('input');
    input.type='text';input.inputMode='decimal';input.autocomplete='off';
    input.className='vanity-balance-input';input.dataset.asset=asset;
    input.maxLength=80;input.placeholder='Ukjent';
    input.value=entry[asset]??'';input.disabled=!!worker;
    input.setAttribute('aria-label',asset.toUpperCase()+'-saldo for '+entry.name+' (manuell oppføring)');
    input.addEventListener('input',()=>input.setCustomValidity(''));
    input.addEventListener('change',()=>{
      const raw=input.value.trim().replace(',','.');
      const decimals=asset==='eth'?18:6;
      if(raw&&!new RegExp('^[0-9]{1,60}(?:\\.[0-9]{1,'+decimals+'})?$').test(raw)){
        input.setCustomValidity('Bruk et positivt tall eller 0, med maksimalt '+decimals+' desimaler. La feltet stå tomt for ukjent saldo.');
        input.reportValidity();return;
      }
      entry[asset]=raw?raw.replace(/^0+(?=[0-9])/,''):null;
      render();
    });
    cell.append(input);return cell;
  }
  function render(){
    const values=entries.slice().sort((a,b)=>{
      let compared;
      if(sort.value==='eth'||sort.value==='usdt'){
        const left=a[sort.value],right=b[sort.value];
        if((left!==null)!==(right!==null))return left!==null?-1:1;
        if(left===null)compared=0;
        else{
          const l=exactAmount(left,sort.value),r=exactAmount(right,sort.value);
          compared=l<r?-1:l>r?1:0;
        }
      }else compared=sort.value==='date'?a.id-b.id:collator.compare(a[sort.value],b[sort.value]);
      return (ascending?compared:-compared)||b.id-a.id;
    });
    const fragment=document.createDocumentFragment();
    for(const entry of values){
      const row=document.createElement('tr');
      for(const [i,value]of [entry.name,entry.address,reveal?entry.key:'•••••••• · skjult',new Date(entry.createdAt).toLocaleString('nb-NO')].entries()){
        const cell=document.createElement(i===0?'th':'td');
        if(i===0)cell.scope='row';
        cell.textContent=value;row.append(cell);
      }
      row.append(balanceInput(entry,'eth'),balanceInput(entry,'usdt'));
      fragment.append(row);
    }
    body.replaceChildren(fragment);$('vanity-empty').hidden=entries.length>0;
    $('vanity-stored').textContent=entries.length+' / 500 wallets i denne økten';
    direction.textContent=ascending?'↑ Stigende':'↓ Synkende';
    toggle.textContent=reveal?'Skjul privatnøkler':'Vis privatnøkler';
    toggle.setAttribute('aria-pressed',String(reveal));toggle.disabled=!entries.length;
    clear.disabled=!entries.length&&!worker;stop.disabled=!worker;
    start.disabled=!!worker||!globalThis.isSecureContext||!globalThis.crypto?.getRandomValues||!globalThis.Worker;
    prefix.disabled=count.disabled=!!worker;
  }
  function stopWork(message){
    worker?.terminate();worker=null;render();
    if(message)status.textContent=message;
  }
  function forget(){
    stopWork();for(const entry of entries)entry.key='';
    entries=[];reveal=false;progress.value=0;render();
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
  start.addEventListener('click',()=>{
    if(worker)return;
    const chosen=prefix.value.trim().replace(/^0x/i,'').toLowerCase(),target=Number(count.value);
    if(chosen&&!/^[0-9a-f]{1,40}$/.test(chosen)){
      status.textContent='Skriv 1–40 tegn fra 0–9 og A–F, eller la feltet stå tomt.';
      prefix.focus();return;
    }
    if(![1,10,100,500].includes(target))return;
    reveal=false;progress.max=target;progress.value=0;
    try{
      worker=new Worker('vanity-worker-v2.js');
      const active=worker;
      worker.onmessage=event=>{
        if(worker!==active)return;
        const message=event.data;
        if(message.type==='error'){stopWork(message.message);return;}
        if(!['progress','done'].includes(message.type))return;
        for(const entry of message.entries){
          entries.unshift({...entry,id:++serial,name:'Wallet '+serial,eth:null,usdt:null});
          if(entries.length>500)entries.pop().key='';
        }
        progress.value=message.found;
        $('vanity-attempts').textContent=new Intl.NumberFormat('nb-NO').format(message.attempts);
        status.textContent=message.found+' / '+target+' nye wallets'+(chosen?' med 0x'+chosen.toUpperCase()+'…':'')+
          (message.type==='done'?' er klare.':' funnet. Genererer lokalt …');
        if(message.type==='done')stopWork();else render();
      };
      worker.onerror=()=>stopWork('Genereringen kunne ikke starte. Last siden på nytt og prøv igjen.');
      worker.postMessage({prefix:chosen,count:target});
      $('vanity-attempts').textContent='0';
      status.textContent='Genererer '+target+' nye wallets lokalt'+(chosen?' med prefiks 0x'+chosen.toUpperCase()+'…':'')+' …';
      render();
    }catch{stopWork('Nettleseren kunne ikke starte generatoren. Bruk en oppdatert nettleser via HTTPS.');}
  });
  stop.addEventListener('click',()=>stopWork('Genereringen er stoppet. Wallets som allerede er vist, beholdes.'));
  clear.addEventListener('click',forget);
  toggle.addEventListener('click',()=>{reveal=!reveal;render();});
  sort.addEventListener('change',()=>{ascending=['name','address'].includes(sort.value);render();});
  direction.addEventListener('click',()=>{ascending=!ascending;render();});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){reveal=false;if(worker)stopWork('Genereringen er stoppet fordi siden ble lagt i bakgrunnen. Viste wallets beholdes.');else render();}
  });
  $('tool-vanity').addEventListener('click',()=>render());
  for(const name of ['generate','lookup','binary','process','reverse']){
    $('tool-'+name).addEventListener('click',()=>{reveal=false;stopWork();});
  }
  new MutationObserver(()=>{if($('vanity-tool').hidden){reveal=false;stopWork();}}).observe($('vanity-tool'),{attributes:true,attributeFilter:['hidden']});
  window.addEventListener('pagehide',forget);
  render();
})();
