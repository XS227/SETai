'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const rows = $('wallet-history-rows');
  const panel = $('wallet-history');
  const generateButton = $('generate-100');
  const tableButton = $('show-wallet-history');
  const revealButton = $('reveal-wallet-keys');
  const retryButton = $('retry-wallet-balances');
  const clearButton = $('clear-wallet-history');
  const status = $('batch-status');
  const rpc = 'https://ethereum-rpc.publicnode.com';
  const token = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
  let entries = [], serial = 0, epoch = 0, running = false, reveal = false;
  let controller = null;
  const waitFrame = () => new Promise(resolve => setTimeout(resolve, 0));
  const supported = globalThis.isSecureContext && globalThis.crypto?.getRandomValues &&
    typeof LocalWalletCrypto !== 'undefined' && typeof LocalWalletBalance !== 'undefined';
  function renderHistory() {
    const fragment = document.createDocumentFragment();
    for (const entry of entries) {
      const row = document.createElement('tr');
      const number = document.createElement('th');
      number.scope = 'row'; number.textContent = String(entry.id); row.append(number);
      for (const value of [entry.address, reveal ? entry.key : '•••••••• · skjult',
        ...['eth','usdt'].map(asset => entry[asset].phase === 'ready'
          ? entry[asset].amount + (asset === 'eth' ? ' ETH' : ' USDT')
          : entry[asset].phase === 'error' ? 'Ukjent · prøv igjen'
          : entry[asset].phase === 'loading' ? 'Henter …' : 'Venter …'),
        entry.checkedAt ? new Date(entry.checkedAt).toLocaleTimeString('nb-NO') : '—']) {
        const cell = document.createElement('td');
        cell.textContent = value; row.append(cell);
      }
      fragment.append(row);
    }
    rows.replaceChildren(fragment);
    $('wallet-history-empty').hidden = entries.length > 0;
    $('wallet-history-count').textContent = entries.length + ' / 100 wallets';
    tableButton.textContent = (panel.hidden ? 'Vis' : 'Skjul') + ' siste 100 (' + entries.length + ')';
    tableButton.setAttribute('aria-expanded', String(!panel.hidden));
    revealButton.textContent = reveal ? 'Skjul privatnøkler' : 'Vis privatnøkler';
    revealButton.setAttribute('aria-pressed', String(reveal));
    revealButton.disabled = !entries.length;
    clearButton.disabled = !entries.length && !running;
    retryButton.disabled = running || !entries.some(e => ['eth','usdt'].some(a => e[a].phase !== 'ready'));
    generateButton.disabled = !supported || running;
    ui.generate.disabled = !supported || running;
    $('batch-progress').hidden = !running;
  }
  function addEntry(key, address) {
    entries.unshift({id:++serial, key, address, eth:{phase:'pending'}, usdt:{phase:'pending'}, checkedAt:null});
    if (entries.length > 100) { entries.pop().key = ''; }
  }
  function forget() {
    epoch++; controller?.abort(); controller = null; running = false; reveal = false;
    for (const entry of entries) entry.key = '';
    entries = []; rows.replaceChildren(); renderHistory();
  }
  async function checkChunk(chunk, job) {
    const calls = [
      {jsonrpc:'2.0',id:1,method:'eth_chainId',params:[]},
      {jsonrpc:'2.0',id:2,method:'eth_call',params:[{to:token,data:'0x313ce567'},'latest']}
    ];
    chunk.forEach((entry,i) => {
      entry.eth = {phase:'loading'}; entry.usdt = {phase:'loading'};
      calls.push({jsonrpc:'2.0',id:3+i*2,method:'eth_getBalance',params:[entry.address,'latest']});
      calls.push({jsonrpc:'2.0',id:4+i*2,method:'eth_call',params:[{
        to:token,data:'0x70a08231'+entry.address.slice(2).toLowerCase().padStart(64,'0')
      },'latest']});
    });
    renderHistory();
    const requestController = new AbortController();
    controller = requestController;
    const timeout = setTimeout(() => requestController.abort(),15000);
    try {
      const response = await fetch(rpc,{method:'POST',headers:{'Content-Type':'application/json'},
        credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',
        signal:requestController.signal,body:JSON.stringify(calls)});
      if (!response.ok) throw new Error('RPC utilgjengelig');
      const data = await response.json();
      if (job !== epoch) return;
      if (!Array.isArray(data) || data.length !== calls.length) throw new Error('Ugyldig RPC-svar');
      const byId = new Map(data.map(item => [item?.id,item]));
      if (byId.size !== calls.length || calls.some(call => !byId.has(call.id))) throw new Error('Ugyldige svar-IDer');
      const chain = byId.get(1), decimals = byId.get(2);
      if (chain?.jsonrpc !== '2.0' || chain.error || chain.result !== '0x1') throw new Error('Feil nettverk');
      const validToken = decimals?.jsonrpc === '2.0' && !decimals.error &&
        /^0x[0-9a-f]{64}$/i.test(decimals.result) && BigInt(decimals.result) === 6n;
      chunk.forEach((entry,i) => {
        for (const [asset,id] of [['eth',3+i*2],['usdt',4+i*2]]) {
          const result = byId.get(id);
          try {
            if (result?.jsonrpc !== '2.0' || result.error || (asset === 'usdt' &&
              (!validToken || !/^0x[0-9a-f]{64}$/i.test(result.result)))) throw new Error('Ukjent saldo');
            entry[asset] = {phase:'ready',amount:LocalWalletBalance.formatUnits(result.result,asset==='eth'?18:6)};
          } catch { entry[asset] = {phase:'error'}; }
        }
        entry.checkedAt = Date.now();
      });
    } catch {
      if (job === epoch) for (const entry of chunk) {
        entry.eth = {phase:'error'}; entry.usdt = {phase:'error'};
      }
    } finally {
      clearTimeout(timeout);
      if (controller === requestController) controller = null;
    }
  }
  async function checkBalances(job) {
    const pending = entries.filter(e => ['eth','usdt'].some(a => e[a].phase !== 'ready'));
    for (let i=0;i<pending.length;i+=5) {
      if (job !== epoch) return;
      status.textContent = 'Henter saldo: '+i+' / '+pending.length+' wallets …';
      await checkChunk(pending.slice(i,i+5),job);
      if (job !== epoch) return;
      $('batch-progress').value = Math.min(i+5,pending.length);
      $('batch-progress').max = pending.length;
      renderHistory();
      if (i+5<pending.length) await new Promise(resolve => setTimeout(resolve,250));
    }
    if (job !== epoch) return;
    running = false;
    const current = entries.find(entry => entry.address === currentAddress);
    if (current && !balanceController) {
      const asset = current[selectedAsset];
      balanceState = asset.phase === 'ready'
        ? {phase:'ready',amount:asset.amount,usd:asset.amount==='0'?0:null,quote:null,time:timeText()}
        : {phase:'error'};
      render();
    }
    const errors = entries.filter(e => ['eth','usdt'].some(a => e[a].phase !== 'ready')).length;
    status.textContent = entries.length+' wallets i listen. '+(errors
      ? errors+' har ukjent saldo. Trykk «Prøv saldo på nytt».'
      : 'ETH- og USDT-saldo er hentet.');
    renderHistory();
  }
  generateButton.addEventListener('click',async () => {
    if (running || !supported) return;
    const job = ++epoch; running = true; reveal = false; renderHistory();
    try {
      // Yield between groups so the page stays responsive on mobile.
      for (let i=0;i<100;i++) {
        if (job !== epoch) return;
        let key, attempts = 0;
        do {
          if (++attempts > 128) throw new Error('Kunne ikke lage en unik nøkkel.');
          key = generatePrivateKey(globalThis.crypto,currentKey);
        } while (entries.some(entry => entry.key === key));
        addEntry(key,LocalWalletCrypto.deriveAddress(key));
        if (i%5===4) {
          status.textContent = 'Genererer: '+(i+1)+' / 100 …';
          $('batch-progress').max = 100; $('batch-progress').value = i+1;
          renderHistory(); await waitFrame();
        }
      }
      if (job !== epoch) return;
      cancelBalance(); currentKey = entries[0].key; currentAddress = entries[0].address;
      revealed = false; balanceState = {phase:'idle'}; render();
      ui.status.textContent = '100 nye wallets generert. Den nyeste vises over; se alle i tabellen.';
    } catch (error) {
      if (job !== epoch) return;
      running = false; status.textContent = error.message; renderHistory(); return;
    }
    await checkBalances(job);
  });
  document.addEventListener('wallet-generated',event => {
    if (running) return;
    const {key,address} = event.detail;
    addEntry(key,address); reveal = false; running = true;
    renderHistory(); void checkBalances(++epoch);
  });
  tableButton.addEventListener('click',() => {
    panel.hidden = !panel.hidden;
    if (panel.hidden) reveal = false;
    renderHistory();
  });
  revealButton.addEventListener('click',() => { reveal = !reveal; renderHistory(); });
  clearButton.addEventListener('click',() => {
    forget(); status.textContent = 'Listen er tømt. Enkeltgeneratoren tømmes med «Fjern nøkkel».';
  });
  retryButton.addEventListener('click',() => {
    if (running) return; running = true; renderHistory(); void checkBalances(++epoch);
  });
  document.addEventListener('visibilitychange',() => {
    if (document.hidden) { reveal = false; renderHistory(); }
  });
  window.addEventListener('pagehide',() => {
    forget(); panel.hidden = true; renderHistory();
    status.textContent = 'Listen er tømt. Generer nye wallets for å starte igjen.';
  });
  renderHistory();
})();