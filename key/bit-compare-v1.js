'use strict';
/* Local educational bit comparison. Never infers bit correctness without a known key. */
(() => {
  const $ = id => document.getElementById(id);
  const input = $('lookup-address');
  const run = $('guess-check');
  const demo = $('guess-demo');
  const panel = $('guess-bit-lab');
  const grid = $('guess-bit-grid');
  const count = $('guess-bit-count');
  const legend = $('guess-bit-legend');
  const bar = $('guess-bit-progress');
  const note = $('guess-bit-note');
  const testButton = $('guess-benchmark');
  const testOutput = $('guess-benchmark-result');
  if (![input,run,demo,panel,grid,count,legend,bar,note,testButton,testOutput].every(Boolean)) return;
  let demonstration = null, testing = false;
  const keyHex = /^[0-9a-f]{64}$/i;
  const keyBits = value => Array.from(value.toLowerCase()).flatMap(
    hex => parseInt(hex,16).toString(2).padStart(4,'0').split('')
  );

  function draw(candidate, truth) {
    const predicted = keyBits(candidate);
    const actual = truth ? keyBits(truth) : null;
    let matched = 0;
    const fragment = document.createDocumentFragment();
    for (let group = 0; group < 16; group++) {
      const line = document.createElement('div');
      line.className = 'guess-bit-row';
      const index = document.createElement('span');
      index.className = 'guess-bit-index';
      index.textContent = String(group*16+1).padStart(3,'0') + '–' + String((group+1)*16).padStart(3,'0');
      const bits = document.createElement('div');
      bits.className = 'guess-bit-cells';
      let groupHits = 0;
      for (let j = 0; j < 16; j++) {
        const n = group*16+j;
        const chip = document.createElement('span');
        const right = actual === null ? null : predicted[n] === actual[n];
        if (right === true) { matched++; groupHits++; }
        chip.className = 'guess-bit-chip ' + (right === null ? 'unknown' : right ? 'correct' : 'incorrect');
        chip.textContent = predicted[n];
        chip.title = 'Bit ' + (n+1) + ': gjetning ' + predicted[n] +
          (right === null ? ', fasit ukjent' : ', fasit ' + actual[n] + (right ? ' (riktig)' : ' (feil)'));
        bits.appendChild(chip);
      }
      const hits = document.createElement('span');
      hits.className = 'guess-bit-hits';
      hits.textContent = actual ? groupHits+'/16' : '—';
      line.append(index,bits,hits);
      fragment.appendChild(line);
    }
    grid.replaceChildren(fragment);
    if (actual) {
      const percentage = (100*matched/256).toFixed(2);
      count.textContent = matched+' / 256 bekreftet riktige biter · '+percentage+' %';
      legend.textContent = 'Grønn = bekreftet riktig · Grå = bekreftet feil';
      bar.style.width = percentage+'%';
      note.textContent = 'Sammenlignet med en kjent testnøkkel kun i denne nettleserøkten. Dette viser ikke at modellen kan rekonstruere en ukjent privatnøkkel.';
      panel.setAttribute('data-verified','true');
    } else {
      count.textContent = '0 / 256 biter kan verifiseres uten fasit';
      legend.textContent = 'Nøytral = ikke mulig å klassifisere som riktig eller feil';
      bar.style.width = '0%';
      note.textContent = 'Du har oppgitt bare en offentlig adresse. Fasitnøkkelen er ukjent, og selv delvis riktige biter kan ikke påvises. Prøv «Test med kjent eksempel» for å se fargene.';
      panel.setAttribute('data-verified','false');
    }
    panel.hidden = false;
  }

  function updateAfterGuess() {
    const candidate = $('guess-candidate').textContent.trim();
    if ($('guess-result').hidden || !keyHex.test(candidate)) { panel.hidden=true; return; }
    const target = $('guess-target').textContent.trim().toLowerCase();
    let truth = null;
    if (demonstration && demonstration.address.toLowerCase() === target) {
      truth = demonstration.key;
    } else if (typeof currentKey === 'string' && currentKey && 
               typeof currentAddress === 'string' && currentAddress.toLowerCase()===target) {
      truth = currentKey;  // Only the key created by this page in this session.
    }
    draw(candidate, truth);
  }

  run.addEventListener('click', updateAfterGuess);
  input.addEventListener('input', () => { panel.hidden=true; });
  demo.addEventListener('click', () => {
    try {
      const key = generatePrivateKey();
      const address = LocalWalletCrypto.deriveAddress(key);
      demonstration = {key,address};
      input.value = address;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      run.click();
    } catch (e) { $('guess-status').textContent='Kunne ikke lage testpar: '+e.message; }
  });
  window.addEventListener('pagehide',()=>{ demonstration=null; grid.replaceChildren(); });

  // Strictly an out-of-sample evaluation, not live training or wallet recovery.
  testButton.addEventListener('click',async()=>{
    if (testing) return;
    testing=true;
    testButton.disabled=true;
    const n=1000, chunkSize=20;
    let hits=0, exact=0, attempts=0;
    testOutput.textContent='Genererer nye, uavhengige syntetiske testpar lokalt … 0 / '+n;
    try {
      while(attempts<n) {
        for(let j=0;j<chunkSize && attempts<n;j++) {
          const key=generatePrivateKey();
          const address=LocalWalletCrypto.deriveAddress(key);
          const predicted=LocalWalletGuess.predictCandidate(address);
          hits+=LocalWalletGuess.matchingBits(predicted,key);
          if(predicted===key)exact++;
          attempts++;
        }
        testOutput.textContent='Kontrollerer '+attempts+' / '+n+' testpar …';
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      const pct=(hits/(n*256)*100).toFixed(2);
      testOutput.textContent='Blindtest: '+n+' nye testpar · '+pct+' % riktige biter · '+exact+'/'+n+
        ' hele nøkler. Tilfeldig referanse: 50 %. Ingen opplæring eller serverlagring ble utført.';
    } catch(e) { testOutput.textContent='Testen stoppet ved '+attempts+'/'+n+': '+e.message; }
    finally {testing=false;testButton.disabled=false;}
  });
})();