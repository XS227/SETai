'use strict';
(() => {
  const $=id=>document.getElementById(id);
  const prefix=$('vanity-prefix'),count=$('vanity-count'),start=$('vanity-start');
  const stop=$('vanity-stop'),clear=$('vanity-clear'),toggle=$('vanity-reveal');
  const status=$('vanity-status'),body=$('vanity-rows'),sort=$('vanity-sort');
  const direction=$('vanity-direction'),progress=$('vanity-progress');
  let worker=null,entries=[],serial=0,reveal=false,ascending=false;
  const collator=new Intl.Collator('nb-NO',{numeric:true,sensitivity:'base'});
  function render(){
    const values=entries.slice().sort((a,b)=>{
      const compared=sort.value==='date'?a.id-b.id:collator.compare(a[sort.value],b[sort.value]);
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
  prefix.addEventListener('input',()=>{
    prefix.value=prefix.value.replace(/^0x/i,'').toUpperCase();
    $('vanity-estimate').textContent=prefix.value
      ? 'Fire valgte tegn krever i snitt 65 536 forsøk per treff. 500 treff krever i snitt ca. 32,8 millioner forsøk og kan ta lang tid. Du kan velge færre eller stoppe når som helst.'
      : 'Uten prefiks lages 500 nye tilfeldige wallets raskt. Med prefiks må generatoren prøve flere nøkler for hvert treff.';
  });
  start.addEventListener('click',()=>{
    if(worker)return;
    const chosen=prefix.value.trim().toLowerCase(),target=Number(count.value);
    if(chosen&&!/^[0-9a-f]{4}$/.test(chosen)){
      status.textContent='Skriv nøyaktig fire tegn: 0–9 og A–F, eller la feltet stå tomt.';
      prefix.focus();return;
    }
    if(![1,10,100,500].includes(target))return;
    reveal=false;progress.max=target;progress.value=0;
    try{
      worker=new Worker('vanity-worker-v1.js');
      const active=worker;
      worker.onmessage=event=>{
        if(worker!==active)return;
        const message=event.data;
        if(message.type==='error'){stopWork(message.message);return;}
        if(!['progress','done'].includes(message.type))return;
        for(const entry of message.entries){
          entries.unshift({...entry,id:++serial,name:'Wallet '+serial});
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
  sort.addEventListener('change',()=>{ascending=sort.value!=='date';render();});
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
