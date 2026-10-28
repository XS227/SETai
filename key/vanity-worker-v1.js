'use strict';
importScripts('crypto-address-v2.js');
self.onmessage = event => {
  self.onmessage = null;
  const {prefix,count} = event.data || {};
  if (typeof prefix !== 'string' || !/^(?:[0-9a-f]{4})?$/.test(prefix) ||
      ![1,10,100,500].includes(count)) {
    postMessage({type:'error',message:'Velg 1, 10, 100 eller 500 og eventuelt fire heksadesimale tegn.'});return;
  }
  const order=BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
  const bytes=new Uint8Array(32), seen=new Set();
  let attempts=0,found=0,lastUpdate=performance.now(),pending=[];
  try {
    while(found<count){
      crypto.getRandomValues(bytes);
      const key=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
      const scalar=BigInt('0x'+key);
      if(scalar===0n||scalar>=order||seen.has(key))continue;
      const address=LocalWalletCrypto.deriveAddress(key);attempts++;
      if(!prefix||address.slice(2,6).toLowerCase()===prefix){
        seen.add(key);found++;
        pending.push({key,address,createdAt:Date.now()});
      }
      if(performance.now()-lastUpdate>250||found===count){
        postMessage({type:found===count?'done':'progress',attempts,found,entries:pending});
        pending=[];lastUpdate=performance.now();
      }
    }
  }catch{postMessage({type:'error',message:'Genereringen stoppet på grunn av en nettleserfeil. Prøv igjen.'});}
  finally{bytes.fill(0);seen.clear();self.close();}
};
