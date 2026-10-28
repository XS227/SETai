'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),zlib=require('node:zlib');
const ROOT=__dirname,protocol=JSON.parse(fs.readFileSync(path.join(ROOT,'protocol.json'),'utf8'));
const cohortSeed=protocol.freshSeedHex;
for(const record of protocol.sourceHashes){const bytes=fs.readFileSync(path.join(ROOT,'frozen-sources',record.name));if(crypto.createHash('sha256').update(bytes).digest('hex')!==record.sha256)throw Error('Frozen source hash differs: '+record.name);}
const sandbox={Uint8Array,ArrayBuffer,DataView,TextEncoder,crypto:crypto.webcrypto};sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(ROOT,'frozen-sources/crypto-public-v1.js'),'utf8'),sandbox);const wallet=sandbox.LocalWalletCrypto;
const modelSandbox={crypto:crypto.webcrypto,TextEncoder,Uint8Array,ArrayBuffer,DataView,LocalWalletBalance:{normalizeAddress:a=>a}};modelSandbox.globalThis=modelSandbox;vm.createContext(modelSandbox);
for(const name of ['model-experiment-v5.js','guess-experiment-v5.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,'frozen-sources',name),'utf8'),modelSandbox);
const guess=vm.runInContext('LocalWalletGuess',modelSandbox);
const ORDER=BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141'),hex=k=>k.toString(16).padStart(64,'0');
const oldKey=(phase,i,role)=>hex((BigInt('0x'+crypto.createHash('sha256').update('SETAEI-research-fixed-holdout-v1|'+phase+'|'+i+'|'+role).digest('hex'))%(ORDER-1n))+1n);
function freshKey(phase,i,role){
 for(let retry=0;retry<128;retry++){
  const value=crypto.createHmac('sha256',Buffer.from(cohortSeed,'hex')).update('SETAEI-audit-v1|'+phase+'|'+i+'|'+role+'|'+retry).digest('hex');
  const k=BigInt('0x'+value);if(k>0n&&k<ORDER)return value;
 }
 throw Error('Synthetic rejection sampling exhausted');
}
const BITS=[0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4];
function match(a,b){let n=0;for(let i=0;i<a.length;i++)n+=4-BITS[parseInt(a[i],16)^parseInt(b[i],16)];return n;}
function one(cohort,phase,index){
 const makeKey=cohort==='replay'?oldKey:freshKey;
 const before=performance.now(),timestampUtc=new Date().toISOString();
 const secret=makeKey(phase,index,'truth'),address=wallet.deriveAddress(secret).toLowerCase();
 let row={cohort,phase,index,timestampUtc};
 if(phase==='model'){
  const predicted=guess.predictCandidate(address),baseline=makeKey(phase,index,'random');
  const modelBits=match(predicted,secret),randomBits=match(baseline,secret);
  row={...row,modelBits,randomBits,difference:modelBits-randomBits,modelExact:predicted===secret,randomExact:baseline===secret};
 }else if(phase==='ranking'){
  const a=makeKey(phase,index,'A'),b=makeKey(phase,index,'B');
  const first=wallet.deriveAddress(a).toLowerCase(),second=wallet.deriveAddress(b).toLowerCase();
  const firstAddressBits=match(first.slice(2),address.slice(2)),secondAddressBits=match(second.slice(2),address.slice(2));
  const selected=firstAddressBits>=secondAddressBits?a:b;
  const selectedKeyBits=match(selected,secret),baselineKeyBits=match(a,secret);
  row={...row,firstAddressBits,secondAddressBits,selectedAddressBits:Math.max(firstAddressBits,secondAddressBits),selectedKeyBits,baselineKeyBits,difference:selectedKeyBits-baselineKeyBits,selectedExact:selected===secret};
 }else{
  const bit=cohort==='replay'?index:index%256,changed=BigInt('0x'+secret)^(1n<<BigInt(bit));
  if(changed<=0n||changed>=ORDER)throw Error('Synthetic flipped scalar invalid; no silent exclusion allowed');
  const altered=hex(changed),newAddress=wallet.deriveAddress(altered).toLowerCase();
  const addressBitsUnchanged=match(address.slice(2),newAddress.slice(2));
  row={...row,flippedBit:bit,keyBitsUnchanged:match(secret,altered),addressBitsUnchanged,addressBitsChanged:160-addressBitsUnchanged};
 }
 row.executionMs=performance.now()-before;return row;
}

const expected=zlib.gunzipSync(fs.readFileSync(path.join(ROOT,'trials.jsonl.gz'))).toString().trim().split('\n').map(JSON.parse);
let mismatch=0;const started=performance.now();
for(const row of expected){const result=one(row.cohort,row.phase,row.index);for(const key of Object.keys(row)){if(['timestampUtc','executionMs'].includes(key))continue;if(result[key]!==row[key]){mismatch++;break;}}}
console.log(JSON.stringify({verifiedRows:expected.length,mismatch,wallSeconds:(performance.now()-started)/1000,scope:'Metric reconstruction only. Original timestamps and execution durations are not recreated.'}));if(mismatch)process.exitCode=1;
