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
const ui = Object.fromEntries(['key','key-state','toggle','generate','copy','clear','status'].map(id => [id,document.getElementById(id)]));
let currentKey = '';
let revealed = false;
function render() {
  ui.key.textContent = currentKey ? (revealed ? currentKey : '•••• •••• •••• •••• •••• •••• •••• ••••') : 'Nøkkelen din vises her';
  ui['key-state'].textContent = currentKey ? '64 tegn · gyldig nøkkelområde' : 'Klar til å generere';
  ui.toggle.textContent = revealed ? 'Skjul nøkkel' : 'Vis nøkkel';
  ui.toggle.setAttribute('aria-pressed',String(revealed));
  for (const id of ['copy','clear','toggle']) ui[id].disabled = !currentKey;
}
ui.generate.addEventListener('click', () => {
  try {
    currentKey = generatePrivateKey(globalThis.crypto, currentKey);
    revealed = false;
    render();
    ui.status.textContent = 'Ny nøkkel generert. Trykk «Vis nøkkel» eller kopier den.';
  } catch (error) { ui.status.textContent = error.message; }
});
ui.toggle.addEventListener('click', () => { revealed = !revealed; render(); });
ui.copy.addEventListener('click', async () => {
  try {
    if (!currentKey) return;
    await navigator.clipboard.writeText(currentKey);
    ui.status.textContent = 'Nøkkel kopiert. Den ligger nå på enhetens utklippstavle.';
  } catch { ui.status.textContent = 'Kopiering ble blokkert. Vis nøkkelen og kopier den manuelt.'; }
});
function clearKey() { currentKey = ''; revealed = false; render(); }
ui.clear.addEventListener('click', () => { clearKey(); ui.status.textContent = 'Nøkkelen er fjernet fra siden. Eventuell kopi på utklippstavlen beholdes.'; });
window.addEventListener('pagehide', clearKey);
document.addEventListener('visibilitychange', () => { if(document.hidden) { revealed = false; render(); } });
if (!globalThis.isSecureContext || !globalThis.crypto?.getRandomValues) {
  ui.generate.disabled = true;
  ui.status.textContent = 'Åpne siden via HTTPS i en nettleser med Web Crypto-støtte.';
}
