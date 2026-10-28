'use strict';
importScripts('crypto-address-v2.js');
const SCALAR_ORDER=BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
const DOMAIN=new TextEncoder().encode('SETAEI-VANITY-1');
let sessionKey=null,prefix='',working=false;
self.onmessage=async event=>{
 const message=event.data||{};
 try{
  if(message.type==='init'){
   if(sessionKey||typeof message.prefix!=='string'||!/^[0-9a-f]{0,40}$/.test(message.prefix)||
      message.key?.type!=='secret'||message.key?.algorithm?.name!=='HMAC')throw new Error();
   sessionKey=message.key;prefix=message.prefix;postMessage({type:'ready'});return;
  }
  if(message.type!=='batch'||working||!sessionKey)throw new Error();
  const first=BigInt(message.first),count=message.count;
  if(first<0n||!Number.isInteger(count)||count<1||count>1000||first+BigInt(count)>1n<<128n)throw new Error();
  working=true;
  // Each counter is reserved once by the coordinator. HMAC keeps candidates unpredictable.
  const matches=[];
  for(let windowStart=0;windowStart<count;windowStart+=100){
    const windowSize=Math.min(100,count-windowStart);
    const candidates=await Promise.all(Array.from({length:windowSize},async(_,offset)=>{
      const input=new Uint8Array(32);input.set(DOMAIN);
      let index=first+BigInt(windowStart+offset);
      for(let i=31;i>=16;i--){input[i]=Number(index&255n);index>>=8n;}
      const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',sessionKey,input));
      input.fill(0);return bytes;
    }));
    try{
      for(let offset=0;offset<candidates.length;offset++){
        const bytes=candidates[offset];
        const key=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
        const scalar=BigInt('0x'+key);
        if(scalar===0n||scalar>=SCALAR_ORDER)continue;
        const address=LocalWalletCrypto.deriveAddress(key);
        if(address.slice(2).toLowerCase().startsWith(prefix))
          matches.push({key,address,createdAt:Date.now(),attemptIndex:(first+BigInt(windowStart+offset)).toString()});
      }
    }finally{for(const bytes of candidates)bytes.fill(0);}
  }
  working=false;postMessage({type:'batch',first:message.first,processed:count,matches});
 }catch{
  working=false;postMessage({type:'error',message:'Arbeideren kunne ikke fullføre. Stopp og start søket på nytt.'});
 }
};