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
const ui = Object.fromEntries(['key','key-state','toggle','generate','copy','clear','status','address','copy-address'].map(id => [id,document.getElementById(id)]));
let currentKey = '';
let currentAddress = '';
let revealed = false;
function render() {
  ui.address.textContent = currentAddress || 'Adressen din vises her';
  ui['copy-address'].disabled = !currentAddress;
  ui.key.textContent = currentKey ? (revealed ? currentKey : '•••• •••• •••• •••• •••• •••• •••• ••••') : 'Nøkkelen din vises her';
  ui['key-state'].textContent = currentKey ? '64 tegn · gyldig nøkkelområde' : 'Klar til å generere';
  ui.toggle.textContent = revealed ? 'Skjul nøkkel' : 'Vis nøkkel';
  ui.toggle.setAttribute('aria-pressed',String(revealed));
  for (const id of ['copy','clear','toggle']) ui[id].disabled = !currentKey;
}
ui.generate.addEventListener('click', () => {
  try {
    const nextKey = generatePrivateKey(globalThis.crypto, currentKey);
    const nextAddress = LocalWalletCrypto.deriveAddress(nextKey);
    currentKey = nextKey;
    currentAddress = nextAddress;
    revealed = false;
    render();
    ui.status.textContent = 'Ny nøkkel og tilhørende wallet-adresse generert.';
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
ui['copy-address'].addEventListener('click', async () => {
  try {
    if (!currentAddress) return;
    await navigator.clipboard.writeText(currentAddress);
    ui.status.textContent = 'Wallet-adressen er kopiert.';
  } catch { ui.status.textContent = 'Kopiering ble blokkert. Marker adressen og kopier den manuelt.'; }
});
function clearKey() { currentKey = ''; currentAddress = ''; revealed = false; render(); }
ui.clear.addEventListener('click', () => { clearKey(); ui.status.textContent = 'Nøkkelen og adressen er fjernet fra siden. Eventuell kopi på utklippstavlen beholdes.'; });
window.addEventListener('pagehide', clearKey);
document.addEventListener('visibilitychange', () => { if(document.hidden) { revealed = false; render(); } });
if (!globalThis.isSecureContext || !globalThis.crypto?.getRandomValues || typeof LocalWalletCrypto === 'undefined') {
  ui.generate.disabled = true;
  ui.status.textContent = 'Sikker generering er utilgjengelig. Last siden på nytt via HTTPS i en oppdatert nettleser.';
}
