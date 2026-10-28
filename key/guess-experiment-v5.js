'use strict';
const LocalWalletGuess = (() => {
  function predictCandidate(address) {
    const normalized = LocalWalletBalance.normalizeAddress(address);
    const bytes = normalized.slice(2).match(/../g).map(byte => parseInt(byte,16));
    const input = bytes.flatMap(byte => Array.from({length:8},(_,i)=>(byte>>(7-i))&1));
    const model = LocalWalletGuessModel;
    if(model.meanX.length!==160||model.meanY.length!==256||model.weights.length!==160)throw new Error('Modellen kunne ikke lastes.');
    const bits = Array.from({length:256},(_,j)=>{
      let score=model.meanY[j];
      for(let i=0;i<160;i++)score+=((input[i]*2-1)-model.meanX[i])*model.weights[i][j];
      return score>=0?1:0;
    });
    let candidate='';
    for(let i=0;i<256;i+=4)candidate+=(bits[i]*8+bits[i+1]*4+bits[i+2]*2+bits[i+3]).toString(16);
    return candidate;
  }
  function testAddress(address) {
    const target=LocalWalletBalance.normalizeAddress(address);
    const candidate=predictCandidate(target);
    try {
      const derivedAddress=LocalWalletCrypto.deriveAddress(candidate);
      return {target,candidate,derivedAddress,match:target.toLowerCase()===derivedAddress.toLowerCase()};
    } catch { return {target,candidate,derivedAddress:null,match:false}; }
  }
  function matchingBits(a,b) {
    let count=0;
    for(let i=0;i<64;i++){
      let xor=parseInt(a[i],16)^parseInt(b[i],16);
      for(let bit=0;bit<4;bit++)count+=((xor>>bit)&1)===0?1:0;
    }
    return count;
  }
  return {predictCandidate,testAddress,matchingBits};
})();
