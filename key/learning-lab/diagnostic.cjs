'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const ROOT='/var/www/setai/key/research-v4', OUT=process.env.DIAGNOSTIC_OUTPUT||'/tmp/setai-ethereum-errors.json';
const protocol=JSON.parse(fs.readFileSync(path.join(ROOT,'protocol.json')));
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
for(const r of protocol.sourceHashes)if(sha(fs.readFileSync(path.join(ROOT,'frozen-sources',r.name)))!==r.sha256)throw Error('Frozen source differs');
const sb={Uint8Array,ArrayBuffer,DataView,TextEncoder,crypto:crypto.webcrypto};sb.globalThis=sb;vm.createContext(sb);vm.runInContext(fs.readFileSync(path.join(ROOT,'frozen-sources/crypto-public-v1.js'),'utf8'),sb);
const ms={Uint8Array,ArrayBuffer,DataView,TextEncoder,crypto:crypto.webcrypto,LocalWalletBalance:{normalizeAddress:a=>a}};ms.globalThis=ms;vm.createContext(ms);
for(const name of ['model-experiment-v5.js','guess-experiment-v5.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,'frozen-sources',name),'utf8'),ms);
const guess=vm.runInContext('LocalWalletGuess',ms),order=BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
function truth(i){for(let retry=0;retry<128;retry++){const h=crypto.createHmac('sha256',Buffer.from(protocol.freshSeedHex,'hex')).update('SETAEI-audit-v1|model|'+i+'|truth|'+retry).digest('hex');const k=BigInt('0x'+h);if(k>0n&&k<order)return h;}throw Error('Scalar');}
const n=2000,confusion=Array.from({length:64},()=>Array.from({length:16},()=>Array(16).fill(0))),perBitErrors=Array(256).fill(0);
const started=new Date().toISOString(),t=performance.now();let correct=0,exact=0;
for(let i=0;i<n;i++){
 const y=truth(i),pred=guess.predictCandidate(sb.LocalWalletCrypto.deriveAddress(y).toLowerCase());
 if(pred===y)exact++;
 for(let p=0;p<64;p++){const a=parseInt(y[p],16),b=parseInt(pred[p],16);confusion[p][a][b]++;for(let bit=0;bit<4;bit++){if(((a^b)>>(3-bit))&1)perBitErrors[p*4+bit]++;else correct++;}}
}
if(correct!==256568)throw Error('Aggregate differs from frozen cohort: '+correct);
const result={kind:'retrospective-synthetic-diagnostic',createdUtc:new Date().toISOString(),startedUtc:started,wallSeconds:(performance.now()-t)/1000,n,keyBits:256,hexPositions:64,correctBits:correct,bitAccuracy:correct/(n*256),meanCorrectBits:correct/n,exactKeys:exact,confusion,perBitErrors,source:'/key/research-v4/',sourceRunId:protocol.id,sourceModelSha256:protocol.sourceHashes.find(x=>x.name==='model-experiment-v5.js').sha256,scope:'Reconstruction of the SAME 2,000 previously inspected synthetic model-test pairs, not new trials. Aggregate errors only; no retraining, wallet input or balances. Do not infer usable key changes from confusion counts.',scriptSha256:sha(fs.readFileSync(__filename))};
fs.writeFileSync(OUT,JSON.stringify(result),{mode:0o644});console.log(JSON.stringify({n,correctBits:correct,exactKeys:exact,wallSeconds:result.wallSeconds}));

