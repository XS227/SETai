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
const ids = ['key', 'key-state', 'toggle', 'generate', 'copy', 'clear', 'status', 'address', 'copy-address', 'balance', 'balance-quantity', 'balance-state', 'refresh-balance', 'balance-tag', 'balance-title', 'balance-note', 'balance-panel', 'tab-usdt', 'tab-eth', 'tool-generate', 'tool-lookup', 'generator-tool', 'lookup-tool', 'lookup-address', 'guess-check', 'guess-status', 'guess-result', 'guess-model-stats', 'guess-candidate', 'guess-address', 'guess-verdict', 'guess-bits', 'guess-target', 'tool-binary', 'binary-tool', 'binary-input', 'binary-toggle', 'binary-show', 'binary-use', 'binary-clear', 'binary-status', 'binary-result', 'binary-summary', 'binary-address', 'binary-key-section', 'binary-key-rows', 'binary-address-rows','tool-process','process-tool','tool-reverse','reverse-tool','tool-vanity','vanity-tool','tool-watch','watch-tool'];
const ui = Object.fromEntries(ids.map(id => [id,document.getElementById(id)]));
let currentKey = '', currentAddress = '', selectedAsset = 'usdt', selectedTool = 'generate';
let revealed = false;
let balanceState = {phase:'idle'}, balanceController = null, balanceRequestId = 0;
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
  ui['binary-use'].disabled=!currentKey;
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
    document.dispatchEvent(new CustomEvent('wallet-generated',{detail:{key:nextKey,address:nextAddress}}));
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
function clearKey(){clearBinary();cancelBalance();balanceState={phase:'idle'};currentKey='';currentAddress='';revealed=false;render();}
ui.clear.addEventListener('click',()=>{clearKey();ui.status.textContent='Nøkkelen og adressen er fjernet fra siden. Eventuell kopi på utklippstavlen beholdes.';});
ui['refresh-balance'].addEventListener('click',refreshBalance);
function resetGuess(){
  ui['guess-result'].hidden=true;
  for(const id of ['guess-target','guess-candidate','guess-address','guess-verdict','guess-bits'])ui[id].textContent='';
  ui['guess-status'].textContent='Klar til å teste adressen din.';
}
function testModelGuess(){
  ui['guess-result'].hidden=true;
  try {
    if(typeof LocalWalletGuess==='undefined'||typeof LocalWalletGuessModel==='undefined')throw new Error('Den eksperimentelle modellen er utilgjengelig. Last siden på nytt.');
    const result=LocalWalletGuess.testAddress(ui['lookup-address'].value);
    ui['guess-target'].textContent=result.target;
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
ui['lookup-address'].addEventListener('input',resetGuess);
ui['lookup-address'].addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();testModelGuess();}});
function fillBinaryTable(body,rows){
  const elements=rows.map(row=>{
    const tr=document.createElement('tr');
    const values=[row.position,row.hex,row.binary,row.firstBit+'–'+row.lastBit];
    for(let i=0;i<values.length;i++){
      const cell=document.createElement(i===0?'th':'td');
      if(i===0)cell.setAttribute('scope','row');
      cell.textContent=String(values[i]);tr.appendChild(cell);
    }
    return tr;
  });
  body.replaceChildren(...elements);
}
function clearBinary(){
  ui['binary-input'].value='';ui['binary-input'].type='password';
  ui['binary-toggle'].textContent='Vis inndata';ui['binary-toggle'].setAttribute('aria-pressed','false');
  ui['binary-key-rows'].replaceChildren();ui['binary-address-rows'].replaceChildren();
  ui['binary-summary'].textContent='';ui['binary-address'].textContent='';ui['binary-result'].hidden=true;
  ui['binary-status'].textContent='Binærvisningen er tømt.';
}
function showBinary(){
  ui['binary-result'].hidden=true;
  ui['binary-key-rows'].replaceChildren();ui['binary-address-rows'].replaceChildren();
  ui['binary-address'].textContent='';
  try{
    const result=LocalWalletBinary.describe(ui['binary-input'].value);
    fillBinaryTable(ui['binary-key-rows'],result.keyRows);
    fillBinaryTable(ui['binary-address-rows'],result.addressRows);
    ui['binary-key-section'].hidden=result.kind!=='key';
    ui['binary-summary'].textContent=result.kind==='key'?'64 nøkkeltegn × 4 = 256 biter. Adressen beregnes fra nøkkelen og har 40 tegn × 4 = 160 biter.':'40 adressetegn × 4 = 160 biter. Privatnøkkelen kan ikke vises fra adressen alene.';
    ui['binary-address'].textContent=result.address;
    ui['binary-result'].hidden=false;
    ui['binary-status'].textContent=result.kind==='key'?'64 nøkkelrader og 40 adresserader er klare.':'40 adresserader er klare.';
  }catch(error){ui['binary-status'].textContent=error.message;}
}
ui['binary-show'].addEventListener('click',showBinary);
ui['binary-use'].addEventListener('click',()=>{
  if(!currentKey){ui['binary-status'].textContent='Generer først en nøkkel i «Generer nøkkel»-fanen.';return;}
  ui['binary-input'].value=currentKey;showBinary();
});
ui['binary-clear'].addEventListener('click',clearBinary);
ui['binary-toggle'].addEventListener('click',()=>{
  const visible=ui['binary-input'].type==='password';
  ui['binary-input'].type=visible?'text':'password';
  ui['binary-toggle'].textContent=visible?'Skjul inndata':'Vis inndata';
  ui['binary-toggle'].setAttribute('aria-pressed',String(visible));
});
ui['binary-input'].addEventListener('input',()=>{
  ui['binary-result'].hidden=true;ui['binary-key-rows'].replaceChildren();ui['binary-address-rows'].replaceChildren();
  ui['binary-summary'].textContent='';ui['binary-address'].textContent='';ui['binary-status'].textContent='Trykk «Vis binært» for å lage tabellene.';
});
ui['binary-input'].addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();showBinary();}});
function selectTool(tool){
  if(selectedTool===tool)return;
  selectedTool=tool;revealed=false;
  if(tool!=='generate'&&balanceController){cancelBalance();balanceState={phase:'idle'};}
  render();
  for(const item of ['generate','vanity','watch','process','binary','reverse','lookup']){
    ui['tool-'+item].setAttribute('aria-selected',String(item===tool));
    ui['tool-'+item].setAttribute('tabindex',item===tool?'0':'-1');
  }
  ui['generator-tool'].hidden=tool!=='generate';ui['lookup-tool'].hidden=tool!=='lookup';ui['binary-tool'].hidden=tool!=='binary';ui['process-tool'].hidden=tool!=='process';ui['reverse-tool'].hidden=tool!=='reverse';ui['vanity-tool'].hidden=tool!=='vanity';ui['watch-tool'].hidden=tool!=='watch';
}
function wireTabs(values,prefix,select){
  for(const item of values){
    ui[prefix+item].addEventListener('click',()=>select(item));
    ui[prefix+item].addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      const target=event.key==='Home'?values[0]:event.key==='End'?values.at(-1):values[(values.indexOf(item)+(event.key==='ArrowLeft'?-1:1)+values.length)%values.length];
      select(target);ui[prefix+target].focus();
    });
  }
}
wireTabs(['usdt','eth'],'tab-',selectAsset);wireTabs(['generate','vanity','watch','process','binary','reverse','lookup'],'tool-',selectTool);
window.addEventListener('pagehide',()=>{clearKey();resetGuess();ui['lookup-address'].value='';});
document.addEventListener('visibilitychange',()=>{if(document.hidden){revealed=false;render();}});
render();resetGuess();
if(!globalThis.isSecureContext||!globalThis.crypto?.getRandomValues||typeof LocalWalletCrypto==='undefined'||typeof LocalWalletBalance==='undefined'){
  ui.generate.disabled=true;ui['guess-check'].disabled=true;ui.status.textContent='Verktøyet er utilgjengelig. Last siden på nytt via HTTPS i en oppdatert nettleser.';
}
