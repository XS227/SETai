'use strict';
(() => {
  const $=id=>document.getElementById(id);
  const panel=$('watch-tool'),input=$('watch-input'),start=$('watch-start');
  const refresh=$('watch-refresh'),pause=$('watch-pause'),clear=$('watch-clear');
  const auto=$('watch-auto'),interval=$('watch-interval'),sort=$('watch-sort');
  const direction=$('watch-direction'),body=$('watch-rows'),status=$('watch-status');
  const rpc='https://ethereum-rpc.publicnode.com',token='0xdAC17F958D2ee523a2206206994597C13D831ec7';
  const collator=new Intl.Collator('nb-NO',{numeric:true,sensitivity:'base'});
  let entries=[],ascending=false,busy=false,epoch=0,timer=null,controller=null;
  const active=()=>!panel.hidden&&!document.hidden;
  function units(amount,asset){
    const [whole,fraction='']=amount.split('.'),decimals=asset==='eth'?18:6;
    return BigInt(whole)*10n**BigInt(decimals)+BigInt(fraction.padEnd(decimals,'0'));
  }
  function parse(text){
    const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),parsed=[],seen=new Set();
    if(!lines.length)throw new Error('Lim inn minst én offentlig wallet-adresse.');
    for(const [index,line] of lines.entries()){
      const parts=line.split(';');
      if(parts.length>2)throw new Error('Linje '+(index+1)+': bruk «Navn;adresse» eller bare adressen.');
      const name=parts.length===2?parts[0].trim():'Wallet '+(index+1),raw=parts.at(-1).trim();
      if(!name||name.length>60)throw new Error('Linje '+(index+1)+': navnet må ha 1–60 tegn.');
      let address;try{address=LocalWalletBalance.normalizeAddress(raw)}catch{throw new Error('Linje '+(index+1)+': ugyldig offentlig Ethereum-adresse eller kontrollsum.');}
      const normalized=address.toLowerCase();
      if(seen.has(normalized))continue;
      seen.add(normalized);parsed.push({name,address});
      if(parsed.length>100)throw new Error('Listen kan inneholde maksimalt 100 forskjellige adresser.');
    }
    return parsed;
  }
  function render(){
    const sorted=entries.slice().sort((a,b)=>{
      let result;
      if(sort.value==='eth'||sort.value==='usdt'){
        const left=a[sort.value],right=b[sort.value],lReady=left.phase==='ready',rReady=right.phase==='ready';
        if(lReady!==rReady)return lReady?-1:1;
        if(!lReady)result=0;else{
          const l=units(left.amount,sort.value),r=units(right.amount,sort.value);
          result=l<r?-1:l>r?1:0;
        }
      }else if(sort.value==='createdAt')result=a.createdAt-b.createdAt;
      else result=collator.compare(a[sort.value],b[sort.value]);
      return (ascending?result:-result)||collator.compare(a.name,b.name);
    });
    const fragment=document.createDocumentFragment();
    for(const entry of sorted){
      const row=document.createElement('tr');
      for(const [i,value] of [entry.name,entry.address,...['eth','usdt'].map(asset=>
        entry[asset].phase==='ready'?entry[asset].amount+' '+asset.toUpperCase():
        entry[asset].phase==='loading'?'Henter …':'Ukjent'),
        entry.checkedAt?new Date(entry.checkedAt).toLocaleString('nb-NO'):'—'].entries()){
        const cell=document.createElement(i===0?'th':'td');if(i===0)cell.scope='row';
        cell.textContent=value;row.append(cell);
      }
      fragment.append(row);
    }
    body.replaceChildren(fragment);$('watch-empty').hidden=entries.length>0;
    $('watch-count').textContent=entries.length+' / 100 adresser';
    direction.textContent=ascending?'↑ Stigende':'↓ Synkende';
    direction.setAttribute('aria-label',ascending?'Stigende. Bytt til synkende sortering.':'Synkende. Bytt til stigende sortering.');
    start.disabled=refresh.disabled=busy;refresh.disabled=busy||!entries.length;
    input.disabled=busy;pause.disabled=!busy&&!timer&&!auto.checked;clear.disabled=!entries.length&&!input.value;
    $('watch-mode').textContent=auto.checked
      ? active()?'Automatisk oppdatering er på mens denne fanen er synlig.':'Automatisk oppdatering er pauset mens fanen er skjult.'
      : 'Automatisk oppdatering er av.';
  }
  function cancel(){
    epoch++;clearTimeout(timer);timer=null;controller?.abort();controller=null;busy=false;
    for(const entry of entries)for(const asset of ['eth','usdt']){
      if(entry[asset].phase==='loading')entry[asset]={phase:'error'};
    }
  }
  function schedule(){
    clearTimeout(timer);timer=null;
    if(auto.checked&&entries.length&&active()&&!busy){
      timer=setTimeout(()=>{timer=null;void fetchAll();},Number(interval.value)*1000);
    }
    render();
  }
  async function fetchChunk(chunk,job){
    const calls=[
      {jsonrpc:'2.0',id:1,method:'eth_chainId',params:[]},
      {jsonrpc:'2.0',id:2,method:'eth_call',params:[{to:token,data:'0x313ce567'},'latest']}
    ];
    chunk.forEach((entry,i)=>{
      entry.eth=entry.usdt={phase:'loading'};
      calls.push({jsonrpc:'2.0',id:3+i*2,method:'eth_getBalance',params:[entry.address,'latest']});
      calls.push({jsonrpc:'2.0',id:4+i*2,method:'eth_call',params:[{
        to:token,data:'0x70a08231'+entry.address.slice(2).toLowerCase().padStart(64,'0')
      },'latest']});
    });
    render();
    const requestController=new AbortController();controller=requestController;
    const timeout=setTimeout(()=>requestController.abort(),15000);
    try{
      const response=await fetch(rpc,{method:'POST',headers:{'Content-Type':'application/json'},
        credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',
        signal:requestController.signal,body:JSON.stringify(calls)});
      if(!response.ok)throw new Error('RPC utilgjengelig');
      const data=await response.json();if(job!==epoch)return;
      if(!Array.isArray(data)||data.length!==calls.length)throw new Error('Ugyldig svar');
      const byId=new Map(data.map(item=>[item?.id,item]));
      if(byId.size!==calls.length||calls.some(call=>!byId.has(call.id)))throw new Error('Ugyldige svar-IDer');
      const chain=byId.get(1),decimals=byId.get(2);
      if(chain?.jsonrpc!=='2.0'||chain.error||chain.result!=='0x1')throw new Error('Feil nettverk');
      const tokenValid=decimals?.jsonrpc==='2.0'&&!decimals.error&&
        /^0x[0-9a-f]{64}$/i.test(decimals.result)&&BigInt(decimals.result)===6n;
      chunk.forEach((entry,i)=>{
        for(const [asset,id] of [['eth',3+i*2],['usdt',4+i*2]]){
          const reply=byId.get(id);
          try{
            if(reply?.jsonrpc!=='2.0'||reply.error||(asset==='usdt'&&
              (!tokenValid||!/^0x[0-9a-f]{64}$/i.test(reply.result))))throw new Error('Ukjent');
            entry[asset]={phase:'ready',amount:LocalWalletBalance.formatUnits(reply.result,asset==='eth'?18:6)};
          }catch{entry[asset]={phase:'error'};}
        }
        entry.checkedAt=Date.now();
      });
    }catch{
      if(job===epoch)for(const entry of chunk){entry.eth={phase:'error'};entry.usdt={phase:'error'};}
    }finally{clearTimeout(timeout);if(controller===requestController)controller=null;}
  }
  async function fetchAll(){
    if(busy||!entries.length||!active())return;
    clearTimeout(timer);timer=null;const job=++epoch;busy=true;render();
    for(let i=0;i<entries.length;i+=5){
      if(job!==epoch)return;
      status.textContent='Henter saldo: '+i+' / '+entries.length+' adresser …';
      await fetchChunk(entries.slice(i,i+5),job);
      if(job!==epoch)return;
      if(i+5<entries.length)await new Promise(resolve=>setTimeout(resolve,250));
    }
    if(job!==epoch)return;busy=false;
    const missing=entries.filter(e=>['eth','usdt'].some(asset=>e[asset].phase!=='ready')).length;
    status.textContent=missing?missing+' adresser har ukjent saldo. Prøv «Oppdater nå».':
      'ETH- og USDT-saldo er oppdatert '+new Date().toLocaleTimeString('nb-NO')+'.';
    schedule();
  }
  start.addEventListener('click',()=>{
    let parsed;try{parsed=parse(input.value)}catch(error){status.textContent=error.message;return;}
    cancel();
    const previous=new Map(entries.map(entry=>[entry.address.toLowerCase(),entry]));
    entries=parsed.map(item=>{
      const old=previous.get(item.address.toLowerCase());
      return old?{...old,...item}:{...item,createdAt:Date.now(),checkedAt:null,eth:{phase:'idle'},usdt:{phase:'idle'}};
    });
    render();void fetchAll();
  });
  refresh.addEventListener('click',()=>void fetchAll());
  pause.addEventListener('click',()=>{auto.checked=false;cancel();render();status.textContent='Automatisk oppdatering er stoppet.';});
  clear.addEventListener('click',()=>{cancel();entries=[];input.value='';render();status.textContent='Adresselisten er tømt.';});
  input.addEventListener('input',()=>{clear.disabled=!entries.length&&!input.value;});
  auto.addEventListener('change',()=>{
    if(!auto.checked){clearTimeout(timer);timer=null;render();}
    else if(!busy&&entries.length&&active())void fetchAll();else schedule();
  });
  interval.addEventListener('change',schedule);
  sort.addEventListener('change',()=>{ascending=['name','address'].includes(sort.value);render();});
  direction.addEventListener('click',()=>{ascending=!ascending;render();});
  function visibility(){
    if(!active()){cancel();render();return;}
    if(auto.checked&&entries.length)void fetchAll();else render();
  }
  new MutationObserver(visibility).observe(panel,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',visibility);
  window.addEventListener('pagehide',()=>{cancel();entries=[];input.value='';render();});
  render();
})();