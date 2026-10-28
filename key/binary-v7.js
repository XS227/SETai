'use strict';
const LocalWalletBinary = (() => {
  function rowsForHex(hex) {
    if(!/^[0-9a-f]+$/i.test(hex))throw new Error('Bruk bare heksadesimale tegn: 0–9 og a–f.');
    return Array.from(hex,(character,index)=>({position:index+1,hex:character,binary:parseInt(character,16).toString(2).padStart(4,'0'),firstBit:index*4+1,lastBit:index*4+4}));
  }
  function describe(input) {
    const value=input.trim().replace(/^0x/i,'0x');
    const raw=value.replace(/^0x/,'');
    if(/^[0-9a-f]{64}$/i.test(raw)){
      const key=raw.toLowerCase();
      const address=LocalWalletCrypto.deriveAddress(key);
      return {kind:'key',keyRows:rowsForHex(key),address,addressRows:rowsForHex(address.slice(2))};
    }
    if(/^0x[0-9a-f]{40}$/i.test(value)){
      const address=LocalWalletBalance.normalizeAddress(value);
      return {kind:'address',keyRows:[],address,addressRows:rowsForHex(address.slice(2))};
    }
    throw new Error('Lim inn en testnøkkel på 64 heksadesimale tegn, eller en wallet-adresse på 0x + 40 tegn.');
  }
  return {rowsForHex,describe};
})();
