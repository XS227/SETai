'use strict';
// secp256k1 subgroup order. Valid private scalars satisfy 1 <= k < N.
const ORDER = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
function generatePrivateKey(randomSource = globalThis.crypto, previous = '') {
  if (!globalThis.isSecureContext || !randomSource?.getRandomValues) {
    throw new Error('Sikker generering krever HTTPS og nettleserstøtte for Web Crypto.');
  }
  const bytes = new Uint8Array(32);
  try {
    for (let attempt = 0; attempt < 128; attempt++) {
      randomSource.getRandomValues(bytes);
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      const scalar = BigInt('0x' + hex);
      if (scalar > 0n && scalar < ORDER && hex !== previous) return hex;
    }
    throw new Error('Kunne ikke generere en gyldig nøkkel. Prøv igjen.');
  } finally { bytes.fill(0); }
}
const ids = ['key','key-state','toggle','generate','copy','clear','status','address','copy-address','balance','balance-quantity','balance-state','refresh-balance','balance-tag','balance-title','balance-note','balance-panel','tab-usdt','tab-eth','tool-generate','tool-lookup','generator-tool','lookup-tool','lookup-address','lookup-check','lookup-status','lookup-checked-address','lookup-usdt','lookup-usdt-quantity','lookup-eth','lookup-eth-quantity','lookup-total','lookup-price-note','guess-check','guess-status','guess-result','guess-model-stats','guess-candidate','guess-address','guess-verdict','guess-bits'];
const ui = Object.fromEntries(ids.map(id => [id,document.getElementById(id)]));
let currentKey = '', currentAddress = '', selectedAsset = 'usdt', selectedTool = 'generate';
let revealed = false;
let balanceState = {phase:'idle'}, balanceController = null, balanceRequestId = 0;
let lookupController = null, lookupRequestId = 0;
const timeText = () => new Date().toLocaleString('nb-NO');
function renderBalance() {
  const symbol = selectedAsset === 'usdt' ? 'USDT' : 'ETH';
  ui['balance-tag'].textContent = symbol + ' / USD';
  ui['balance-title'].textContent = selectedAsset === 'usdt' ? 'USDT-VERDI · ETHEREUM / ERC-20' : 'ETH-VERDI · ETHEREUM MAINNET';
  ui.balance.setAttribute('aria-label',symbol+'-verdi i USD');
  ui.balance.textContent = balanceState.phase === 'ready' ? LocalWalletBalance.formatUsd(balanceState.usd) : balanceState.phase === 'loading' ? 'Henter …' : '— USD';
  ui['balance-quantity'].textContent = balanceState.phase === 'ready' ? balanceState.amount+' '+symbol : 'Ingen saldo hentet.';
  ui['refresh-balance'].disabled = !currentAddress || balanceState.phase === 'loading';
  ui['balance-state'].textContent = balanceState.phase === 'ready' ? (balanceState.usd === null ? 'Saldo hentet. USD-kurs utilgjengelig. ' : 'Sjekket ') + balanceState.time : balanceState.phase === 'loading' ? 'Henter saldo og eventuell USD-kurs …' : balanceState.phase === 'error' ? 'Kunne ikke hente saldo. Trykk «Oppdater saldo» for å prøve igjen.' : 'Generer en nøkkel for å hente saldo.';
  const scope = selectedAsset === 'usdt' ? 'USDT (ERC-20) på Ethereum. USDT på TRON og andre nettverk inngår ikke.' : 'ETH på Ethereum. Andre tokens og nettverk inngår ikke.';
  const pricing = balanceState.quote ? ' Kurs fra CoinGecko: '+LocalWalletBalance.formatUsd(balanceState.quote.usd)+' per '+symbol+' ('+new Date(balanceState.quote.updatedAt*1000).toLocaleString('nb-NO')+').' : '';
  ui['balance-note'].textContent = scope+' Offentlig adresse sendes til PublicNode. USD er en estimert markedsverdi.'+pricing;
  ui['balance-panel'].setAttribute('aria-labelledby','tab-'+selectedAsset);
  for(const asset of ['usdt','eth']) {
    ui['tab-'+asset].setAttribute('aria-selected',String(asset===selectedAsset));
    ui['tab-'+asset].setAttribute('tabindex',asset===selectedAsset?'0':'-1');
  }
}
function cancelBalance() { balanceRequestId++; balanceController?.abort(); balanceController=null; }
async function refreshBalance() {
  cancelBalance();
  const address=currentAddress,asset=selectedAsset,requestId=balanceRequestId;
  if(!address) return;
  const controller=new AbortController();balanceController=controller;
  balanceState={phase:'loading'};renderBalance();
  const timer=setTimeout(()=>controller.abort(),15000);
  try {
    const result=await LocalWalletBalance.fetchValuedBalance(address,asset,controller.signal);
    if(requestId!==balanceRequestId||address!==currentAddress||asset!==selectedAsset)return;
    balanceState={phase:'ready',...result,time:timeText()};renderBalance();
  } catch {
    if(requestId!==balanceRequestId)return;
    balanceState={phase:'error'};renderBalance();
  } finally { clearTimeout(timer);if(requestId===balanceRequestId)balanceController=null; }
}
function selectAsset(asset) {
  if(selectedAsset===asset)return;
  cancelBalance();selectedAsset=asset;balanceState={phase:'idle'};renderBalance();
  if(currentAddress)void refreshBalance();
}
function render() {
  renderBalance();
  ui.address.textContent=currentAddress||'Adressen din vises her';
  ui['copy-address'].disabled=!currentAddress;
  ui.key.textContent=currentKey?(revealed?currentKey:'•••• •••• •••• •••• •••• •••• •••• ••••'):'Nøkkelen din vises her';
  ui['key-state'].textContent=currentKey?'64 tegn · gyldig nøkkelområde':'Klar til å generere';
  ui.toggle.textContent=revealed?'Skjul nøkkel':'Vis nøkkel';
  ui.toggle.setAttribute('aria-pressed',String(revealed));
  for(const id of ['copy','clear','toggle'])ui[id].disabled=!currentKey;
}
ui.generate.addEventListener('click',()=>{
  try {
    const nextKey=generatePrivateKey(globalThis.crypto,currentKey),nextAddress=LocalWalletCrypto.deriveAddress(nextKey);
    currentKey=nextKey;currentAddress=nextAddress;revealed=false;render();
    ui.status.textContent='Ny nøkkel og tilhørende wallet-adresse generert.';
    void refreshBalance();
  }catch(error){ui.status.textContent=error.message;}
});
ui.toggle.addEventListener('click',()=>{revealed=!revealed;render();});
ui.copy.addEventListener('click',async()=>{
  try{if(!currentKey)return;await navigator.clipboard.writeText(currentKey);ui.status.textContent='Nøkkel kopiert. Den ligger nå på enhetens utklippstavle.';}
  catch{ui.status.textContent='Kopiering ble blokkert. Vis nøkkelen og kopier den manuelt.';}
});
ui['copy-address'].addEventListener('click',async()=>{
  try{if(!currentAddress)return;await navigator.clipboard.writeText(currentAddress);ui.status.textContent='Wallet-adressen er kopiert.';}
  catch{ui.status.textContent='Kopiering ble blokkert. Marker adressen og kopier den manuelt.';}
});
function clearKey(){cancelBalance();balanceState={phase:'idle'};currentKey='';currentAddress='';revealed=false;render();}
ui.clear.addEventListener('click',()=>{clearKey();ui.status.textContent='Nøkkelen og adressen er fjernet fra siden. Eventuell kopi på utklippstavlen beholdes.';});
ui['refresh-balance'].addEventListener('click',refreshBalance);
function cancelLookup(){lookupRequestId++;lookupController?.abort();lookupController=null;ui['lookup-check'].disabled=false;}
function resetLookup(){
  cancelLookup();
  ui['guess-result'].hidden=true;
  ui['guess-candidate'].textContent='';ui['guess-address'].textContent='';ui['guess-verdict'].textContent='';ui['guess-bits'].textContent='';
  ui['guess-status'].textContent='Lim inn adressen over. Testen kjøres lokalt uten nettverkskall.';
  for(const asset of ['eth','usdt']){ui['lookup-'+asset].textContent='— USD';ui['lookup-'+asset+'-quantity'].textContent='— '+asset.toUpperCase();}
  ui['lookup-total'].textContent='— USD';ui['lookup-checked-address'].textContent='';
  ui['lookup-status'].textContent='Ingen adresse sjekket.';
  ui['lookup-price-note'].textContent='Estimert verdi i USD. Andre tokens og nettverk inngår ikke.';
}
async function checkAddress(){
  resetLookup();
  let address;
  try{address=LocalWalletBalance.normalizeAddress(ui['lookup-address'].value);}
  catch(error){ui['lookup-status'].textContent=error.message;return;}
  const requestId=lookupRequestId,controller=new AbortController();lookupController=controller;
  ui['lookup-address'].value=address;ui['lookup-checked-address'].textContent='Sjekker: '+address;
  ui['lookup-check'].disabled=true;ui['lookup-status'].textContent='Henter ETH, USDT og USD-verdi …';
  const timer=setTimeout(()=>controller.abort(),15000);
  try{
    const assets=['usdt','eth'];
    const results=await Promise.allSettled(assets.map(asset=>LocalWalletBalance.fetchBalance(address,asset,controller.signal)));
    if(requestId!==lookupRequestId)return;
    let quotes=null;
    if(results.some(result=>result.status==='fulfilled'&&result.value!=='0')){
      try{quotes=await LocalWalletBalance.fetchPrices(controller.signal);}catch{}
    }
    if(requestId!==lookupRequestId)return;
    let total=0,complete=true,balanceErrors=false,priceErrors=false;
    for(let i=0;i<assets.length;i++){
      const asset=assets[i],result=results[i];
      if(result.status!=='fulfilled'){
        ui['lookup-'+asset].textContent='— USD';ui['lookup-'+asset+'-quantity'].textContent='Saldo utilgjengelig';complete=false;balanceErrors=true;continue;
      }
      const amount=result.value,usd=LocalWalletBalance.usdValue(amount,quotes?.[asset]);
      ui['lookup-'+asset].textContent=LocalWalletBalance.formatUsd(usd);
      ui['lookup-'+asset+'-quantity'].textContent=amount+' '+asset.toUpperCase();
      if(usd===null){complete=false;priceErrors=true;}else total+=usd;
    }
    ui['lookup-total'].textContent=complete?LocalWalletBalance.formatUsd(total):'— USD';
    ui['lookup-status'].textContent=(balanceErrors?'Ufullstendig oppslag: én eller flere saldoer kunne ikke hentes. ':priceErrors?'Saldo hentet. USD-kurs utilgjengelig. ':'Saldo sjekket. ') + timeText();
    ui['lookup-checked-address'].textContent='Adresse: '+address;
    ui['lookup-price-note'].textContent='Sum gjelder bare ETH + USDT på Ethereum. '+(quotes?'USD-kurser fra CoinGecko, oppdatert '+new Date(Math.min(quotes.eth.updatedAt,quotes.usdt.updatedAt)*1000).toLocaleString('nb-NO')+'. Markedsverdien er et estimat.':complete?'Bekreftet nullsaldo gir $0.00 uten behov for valutakurs.':'Ingen total vises før alle saldoer og nødvendige USD-kurser er tilgjengelige.');
  }catch{
    if(requestId===lookupRequestId)ui['lookup-status'].textContent='Kunne ikke hente saldo. Prøv igjen.';
  }finally{clearTimeout(timer);if(requestId===lookupRequestId){lookupController=null;ui['lookup-check'].disabled=false;}}
}
function testModelGuess(){
  ui['guess-result'].hidden=true;
  try {
    if(typeof LocalWalletGuess==='undefined'||typeof LocalWalletGuessModel==='undefined')throw new Error('Den eksperimentelle modellen er utilgjengelig. Last siden på nytt.');
    const result=LocalWalletGuess.testAddress(ui['lookup-address'].value);
    ui['guess-candidate'].textContent=result.candidate;
    ui['guess-address'].textContent=result.derivedAddress||'Modellen ga en ugyldig nøkkelverdi.';
    ui['guess-verdict'].textContent=result.match?'ADRESSESAMSVAR: Gjetningen gir den oppgitte adressen.':'INGEN TREFF: Gjetningen gir ikke den oppgitte wallet-adressen.';
    if(currentKey&&result.target.toLowerCase()===currentAddress.toLowerCase()){
      const count=LocalWalletGuess.matchingBits(result.candidate,currentKey);
      ui['guess-bits'].textContent='Testnøkkel generert i denne økten: '+count+' av 256 biter riktige ('+(count/256*100).toFixed(2)+' %). Hele opprinnelige nøkkelen: '+(result.candidate===currentKey?'riktig.':'feil.');
    }else ui['guess-bits'].textContent='Antall riktige biter er ukjent: den ekte privatnøkkelen er ikke tilgjengelig for sammenligning.';
    ui['guess-result'].hidden=false;
    ui['guess-status'].textContent='Én modellgjetning testet lokalt. Ingen nøkler eller adresser ble sendt i denne testen.';
  }catch(error){ui['guess-status'].textContent=error.message;}
}
ui['guess-check'].addEventListener('click',testModelGuess);
if(typeof LocalWalletGuessModel!=='undefined')ui['guess-model-stats'].textContent='Ny modell trent på 700 testpar, kontrollert på 300 nye: '+(LocalWalletGuessModel.bit_accuracy*100).toFixed(2)+' % riktige enkeltbiter og '+LocalWalletGuessModel.full_key_matches+' av 300 hele nøkler. Tilfeldig bitgjetting: 50 %.';
ui['lookup-check'].addEventListener('click',checkAddress);
ui['lookup-address'].addEventListener('input',resetLookup);
ui['lookup-address'].addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();void checkAddress();}});
function selectTool(tool){
  if(selectedTool===tool)return;
  selectedTool=tool;revealed=false;render();
  if(tool==='generate'&&lookupController){resetLookup();ui['lookup-status'].textContent='Oppslaget ble avbrutt. Trykk «Sjekk saldo i $» for å prøve igjen.';}
  for(const item of ['generate','lookup']){
    ui['tool-'+item].setAttribute('aria-selected',String(item===tool));
    ui['tool-'+item].setAttribute('tabindex',item===tool?'0':'-1');
  }
  ui['generator-tool'].hidden=tool!=='generate';ui['lookup-tool'].hidden=tool!=='lookup';
}
function wireTabs(values,prefix,select){
  for(const item of values){
    ui[prefix+item].addEventListener('click',()=>select(item));
    ui[prefix+item].addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      const target=event.key==='Home'?values[0]:event.key==='End'?values.at(-1):values[(values.indexOf(item)+1)%values.length];
      select(target);ui[prefix+target].focus();
    });
  }
}
wireTabs(['usdt','eth'],'tab-',selectAsset);wireTabs(['generate','lookup'],'tool-',selectTool);
window.addEventListener('pagehide',()=>{clearKey();resetLookup();ui['lookup-address'].value='';});
document.addEventListener('visibilitychange',()=>{if(document.hidden){revealed=false;render();}});
render();resetLookup();
if(!globalThis.isSecureContext||!globalThis.crypto?.getRandomValues||typeof LocalWalletCrypto==='undefined'||typeof LocalWalletBalance==='undefined'){
  ui.generate.disabled=true;ui['lookup-check'].disabled=true;ui.status.textContent='Verktøyet er utilgjengelig. Last siden på nytt via HTTPS i en oppdatert nettleser.';
}
