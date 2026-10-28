'use strict';
/* Separate verifiable ADDRESS output bits from secret KEY bits.
   Research tests only new, synthetic locally generated keypairs.
   Accumulated statistics are not weights and are not evidence of key recovery. */
(() => {
  const $=id=>document.getElementById(id);
  const input=$('lookup-address'),run=$('guess-check'),demo=$('guess-demo');
  const keyPanel=$('guess-bit-lab'),keyGrid=$('guess-bit-grid');
  const addressPanel=$('guess-address-lab'),addressGrid=$('guess-address-grid');
  const benchmark=$('guess-benchmark'),report=$('guess-benchmark-result');
  if(![input,run,demo,keyPanel,keyGrid,addressPanel,addressGrid,benchmark,report].every(Boolean))return;
  const addressFormat=/^0x[\da-f]{40}$/i, keyFormat=/^[\da-f]{64}$/i;
  const toBits=hex=>[...hex.toLowerCase().replace(/^0x/,'')].flatMap(ch=>parseInt(ch,16).toString(2).padStart(4,'0').split(''));
  const matching=(a,b)=>{const A=toBits(a),B=toBits(b);let c=0;for(let i=0;i<A.length;i++)c+=A[i]===B[i];return c;};
  let demoPair=null,working=false;
  const secureOrder=BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
  const makeKey=()=>generatePrivateKey();
  const pct=(score,total)=>(100*score/total).toFixed(2);
  function renderRows(element,predicted,correct,rows){
    const prediction=toBits(predicted),actual=correct?toBits(correct):null;
    let total=0;
    const f=document.createDocumentFragment();
    for(let group=0;group<rows;group++){
      const row=document.createElement('div');row.className='guess-bit-row';
      const index=document.createElement('span');index.className='guess-bit-index';
      index.textContent=String(group*16+1).padStart(3,'0')+'–'+String((group+1)*16).padStart(3,'0');
      const chips=document.createElement('div');chips.className='guess-bit-cells';
      let rowScore=0;
      for(let bit=0;bit<16;bit++){
        const n=group*16+bit;
        const chip=document.createElement('span');
        const good=actual===null?null:prediction[n]===actual[n];
        if(good){total++;rowScore++;}
        chip.className='guess-bit-chip '+(good===null?'unknown':good?'correct':'incorrect');
        chip.textContent=prediction[n];
        chip.title='Bit '+(n+1)+': beregnet '+prediction[n]+
          (good===null?', hemmelig fasit ukjent':', oppgitt '+actual[n]+(good?' · lik':' · ulik'));
        chips.appendChild(chip);
      }
      const hits=document.createElement('span');hits.className='guess-bit-hits';
      hits.textContent=actual?rowScore+'/16':'—';
      row.append(index,chips,hits);f.appendChild(row);
    }
    element.replaceChildren(f);
    return total;
  }
  function drawAddress(target,derived){
    if(!addressFormat.test(target)||!addressFormat.test(derived)){addressPanel.hidden=true;return;}
    const score=renderRows(addressGrid,derived,target,10);
    $('guess-address-count').textContent=score+' av 160 adressebiter stemmer · '+pct(score,160)+' %';
    $('guess-address-meter').style.width=pct(score,160)+'%';
    $('guess-address-explanation').textContent=
      'Grønn = samme bit i begge adresser. Grå = forskjellig bit. Dette måler ADRESSEN, ikke hvor mange privatnøkkelbiter som er riktige. Rundt 80/160 er normalt også ved uavhengige tilfeldige adresser.';
    addressPanel.hidden=false;
  }
  function drawKey(candidate,truth){
    if(!keyFormat.test(candidate)){keyPanel.hidden=true;return;}
    const score=renderRows(keyGrid,candidate,truth,16);
    if(truth){
      $('guess-bit-count').textContent=score+' / 256 bekreftet riktige nøkkelbiter · '+pct(score,256)+' %';
      $('guess-bit-legend').textContent='Grønn = bekreftet riktig · Grå = bekreftet feil';
      $('guess-bit-progress').style.width=pct(score,256)+'%';
      $('guess-bit-note').textContent='Privatnøkkel sammenlignet med en kjent testfasit bare i denne økten. Ingen hemmelige nøkler lagres i forskningsresultatene.';
    }else{
      $('guess-bit-count').textContent='Privatnøkkelbiter: ukjent fasit';
      $('guess-bit-legend').textContent='Nøytral = ukjent · kan ikke avgjøres fra kun wallet-adressen';
      $('guess-bit-progress').style.width='0%';
      $('guess-bit-note').textContent='Grønne adressebiter ovenfor er IKKE bevis på riktige nøkkelbiter. For denne målingen trengs en kjent testprivatnøkkel.';
    }
    keyPanel.hidden=false;
  }
  function update(){
    const candidate=$('guess-candidate').textContent.trim();
    if($('guess-result').hidden||!keyFormat.test(candidate)){keyPanel.hidden=true;addressPanel.hidden=true;return;}
    const target=$('guess-target').textContent.trim();
    const derived=$('guess-address').textContent.trim();
    let truth=null;
    if(demoPair&&demoPair.address.toLowerCase()===target.toLowerCase())truth=demoPair.key;
    else if(typeof currentKey==='string'&&currentKey&&typeof currentAddress==='string'&&
        currentAddress.toLowerCase()===target.toLowerCase())truth=currentKey;
    drawAddress(target,derived);
    drawKey(candidate,truth);
    // Only the synthetic demo pair is shared with the hologram lab (in memory, same page); never a user-entered address.
    const demoTruth=demoPair&&truth===demoPair.key;
    document.dispatchEvent(new CustomEvent('setai:truth',{detail:demoTruth?{key:demoPair.key,address:demoPair.address}:null}));
  }
  run.addEventListener('click',update);
  input.addEventListener('input',()=>{addressPanel.hidden=true;keyPanel.hidden=true;});
  demo.addEventListener('click',()=>{
    try{
      const key=makeKey(),address=LocalWalletCrypto.deriveAddress(key);
      demoPair={key,address};
      input.value=address;input.dispatchEvent(new Event('input',{bubbles:true}));run.click();
    }catch(err){$('guess-status').textContent='Kunne ikke opprette kjent testpar: '+err.message;}
  });
  window.addEventListener('pagehide',()=>{demoPair=null;addressGrid.replaceChildren();keyGrid.replaceChildren();});

  const fmt=x=>Number(x).toFixed(2);
  function correlation(a,b){
    const n=a.length;
    let ax=0,by=0;
    for(let i=0;i<n;i++){ax+=a[i];by+=b[i];}
    ax/=n;by/=n;
    let xy=0,xx=0,yy=0;
    for(let i=0;i<n;i++){const u=a[i]-ax,v=b[i]-by;xy+=u*v;xx+=u*u;yy+=v*v;}
    return xx&&yy?xy/Math.sqrt(xx*yy):0;
  }
  benchmark.addEventListener('click',async()=>{
    if(working)return;
    working=true;benchmark.disabled=true;
    const n=1000, addr=[],key=[],randomAddr=[],avalanche=[];
    let complete=0;
    report.textContent='Forskningskontroll: 0 / '+n+' nye syntetiske testpar …';
    try{
      for(let batch=0;batch<n;batch+=20){
        for(let j=0;j<20;j++){
          const secret=makeKey(),target=LocalWalletCrypto.deriveAddress(secret);
          const prediction=LocalWalletGuess.predictCandidate(target);
          const calculated=LocalWalletCrypto.deriveAddress(prediction);
          addr.push(matching(target,calculated));
          key.push(matching(secret,prediction));
          randomAddr.push(matching(target,LocalWalletCrypto.deriveAddress(makeKey())));
          if(prediction===secret)complete++;
          if(batch+j<250){
            const mask=1n << BigInt(crypto.getRandomValues(new Uint32Array(1))[0]%256);
            const flip=BigInt('0x'+secret)^mask;
            if(flip>0n&&flip<secureOrder)
              avalanche.push(matching(target,LocalWalletCrypto.deriveAddress(flip.toString(16).padStart(64,'0'))));
          }
        }
        if(batch%200===180)report.textContent='Forskningskontroll: '+(batch+20)+' / '+n+' …';
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      const sum=values=>values.reduce((a,b)=>a+b,0);
      const addressRate=100*sum(addr)/(160*n),randomRate=100*sum(randomAddr)/(160*n);
      const keyRate=100*sum(key)/(256*n),rho=correlation(addr,key);
      const avalancheRate=avalanche.length?100*sum(avalanche)/(160*avalanche.length):null;
      // Save only totals and run counts, never any keys, addresses or predictions.
      let log={runs:0,pairs:0,addressMatches:0,randomAddressMatches:0,keyMatches:0,exact:0};
      try{const saved=JSON.parse(localStorage.getItem('setai-key-research-aggregate-v2')||'null');
        if(saved&&Number.isFinite(saved.pairs)&&saved.pairs>=0&&saved.pairs<1e9)log=saved;
      }catch{}
      log.runs++;log.pairs+=n;log.addressMatches+=sum(addr);
      log.randomAddressMatches+=sum(randomAddr);log.keyMatches+=sum(key);log.exact+=complete;
      try{localStorage.setItem('setai-key-research-aggregate-v2',JSON.stringify(log));}catch{}
      report.textContent='Ny blindtest ('+n+' par): modell-adresse '+fmt(addressRate)+' %, tilfeldig-adresse '+
        fmt(randomRate)+' %, riktige nøkkelbiter '+fmt(keyRate)+' %, sammenheng r='+rho.toFixed(3)+
        ', 1-bit-endring: '+fmt(avalancheRate)+' % like adressebiter. Hele nøkler: '+complete+'/'+n+
        '. Akkumulert: '+log.pairs.toLocaleString('nb-NO')+
        ' testpar i denne nettleseren. Bare aggregerte målinger lagres lokalt; modellen blir ikke omtrent til en riktig nøkkel av gjentatte 50 %-treff.';
    }catch(e){report.textContent='Forskningskontrollen kunne ikke fullføres: '+e.message;}
    finally{working=false;benchmark.disabled=false;}
  });
})();
