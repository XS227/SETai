'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),os=require('node:os');
const ROOT='/var/www/setai/key',AGENT='/opt/setai-key-agent';
const started=new Date(),id=started.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
const OUT=path.join('/opt/setai-experiment-audit',id);fs.mkdirSync(OUT,{recursive:true,mode:0o700});
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const sources=['/opt/setai-key-agent/research.js',ROOT+'/crypto-public-v1.js',ROOT+'/crypto-address-v2.js',ROOT+'/model-experiment-v5.js',ROOT+'/guess-experiment-v5.js'];
const hashes=[];
for(const source of sources){const bytes=fs.readFileSync(source);const name=path.basename(source);fs.writeFileSync(path.join(OUT,name),bytes,{mode:0o600});hashes.push({source,name,sha256:sha(bytes),bytes:bytes.length,mtime:fs.statSync(source).mtime.toISOString()});}
const original=JSON.parse(fs.readFileSync(AGENT+'/data/research-v1.json','utf8'));
fs.writeFileSync(path.join(OUT,'original-research-state.json'),JSON.stringify(original),{mode:0o600});
const jobPath=fs.readdirSync(AGENT+'/data').find(n=>/^[0-9a-f]{32}\.json$/.test(n));
const live=JSON.parse(fs.readFileSync(path.join(AGENT,'data',jobPath),'utf8'));
const observation={capturedUtc:new Date().toISOString(),jobStartedUtc:live.started,checkpointUtc:live.updated,attempts:live.attempts,state:live.state,targetBits:live.prefix.length*4,stats:live.stats};
delete observation.stats.bestAddress;
fs.writeFileSync(path.join(OUT,'address-observation.json'),JSON.stringify(observation),{mode:0o600});
const cohortSeed=crypto.randomBytes(32).toString('hex');
const protocol={
 study:'SETAEI independent synthetic-key replication',version:'audit-v1',id,lockedAtUtc:new Date().toISOString(),
 originalCohort:{model:1200,ranking:1200,avalanche:256},freshCohort:{model:2000,ranking:2000,avalanche:512},
 freshSeedHex:cohortSeed,sourceHashes:hashes,
 primary:'Paired mean correct private-key bits: frozen ridge prediction minus independent random baseline.',
 secondary:['Paired mean key-bit benefit from choosing the more similar address of two candidates.','Mean changed address bits after one private-key bit flip; reference 80/160.'],
 inference:'Per-trial paired two-sided Student-t 95% CI; no treating 256 bits as independent subjects. Holm-adjusted p values across the three contrasts. No outcome-driven stopping.',
 fixedStop:'Exactly 2000, 2000 and 512 fresh trials. No model training, weight updates or target-wallet input.',
 exclusion:'Only a candidate scalar outside 1 <= k < secp256k1 order is rejected by deterministic rejection sampling.',
 timing:'Fresh and replay wall-clock UTC and monotonic elapsed times plus process CPU time are recorded. Original per-trial times are unavailable.',
 evidence:'Original deterministic replay is a reproducibility check, not a fresh replication. Fresh cohort uses a seed drawn after freezing current model files. The protocol is internally timestamped, not externally preregistered.',
 privacy:'Synthetic private keys exist only in process memory and are never written. No wallet balance/network requests. Public observation contains only aggregate Hamming-distance statistics.',
 limitations:['Original training keys are unavailable; explicit training/holdout set-overlap cannot be audited. Fresh seed generation is independent of the frozen training process.','Original individual rows and timestamps were not recorded; reconstructed rows must not be presented as original logs.','Observational point-stream samples are not controlled AI trials and will not be pooled with them.','Statistical consistency with randomness is not proof of cryptographic security or impossibility of future methods.']
};
const protocolBytes=JSON.stringify(protocol,null,2);
fs.writeFileSync(path.join(OUT,'protocol.json'),protocolBytes,{mode:0o600});
const protocolSha=sha(protocolBytes);
fs.writeFileSync(path.join(OUT,'protocol.sha256'),protocolSha+'\n',{mode:0o600});
const sandbox={Uint8Array,ArrayBuffer,DataView,TextEncoder,crypto:crypto.webcrypto};sandbox.globalThis=sandbox;
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(OUT,'crypto-public-v1.js'),'utf8'),sandbox);
const wallet=sandbox.LocalWalletCrypto;
const modelSandbox={crypto:crypto.webcrypto,TextEncoder,Uint8Array,ArrayBuffer,DataView,LocalWalletBalance:{normalizeAddress:a=>a}};modelSandbox.globalThis=modelSandbox;vm.createContext(modelSandbox);
for(const name of ['model-experiment-v5.js','guess-experiment-v5.js'])vm.runInContext(fs.readFileSync(path.join(OUT,name),'utf8'),modelSandbox);
const guess=vm.runInContext('LocalWalletGuess',modelSandbox);
const modelMeta=vm.runInContext('JSON.stringify(Object.fromEntries(Object.entries(LocalWalletGuessModel).filter(([k,v])=>!Array.isArray(v))))',modelSandbox);
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
const tasks=[];
for(const [cohort,counts]of [['replay',protocol.originalCohort],['fresh',protocol.freshCohort]])
 for(const [phase,count]of Object.entries(counts))for(let i=0;i<count;i++)tasks.push({cohort,phase,index:i});
const log=fs.openSync(path.join(OUT,'trials.jsonl'),'wx',0o600),begin=performance.now(),cpu=process.cpuUsage();
const phaseTimes={};let cursor=0;
console.log(JSON.stringify({event:'protocol_locked',out:OUT,protocolSha256:protocolSha,plannedRows:tasks.length}));
function tick(){
 const startTick=performance.now();
 try{
  while(cursor<tasks.length&&performance.now()-startTick<8){
   const task=tasks[cursor],label=task.cohort+'_'+task.phase;
   if(!phaseTimes[label])phaseTimes[label]={startedUtc:new Date().toISOString(),startMs:performance.now(),trials:0,cpuStart:process.cpuUsage()};
   const row=one(task.cohort,task.phase,task.index);fs.writeSync(log,JSON.stringify(row)+'\n');
   const time=phaseTimes[label];time.trials++;time.endedUtc=new Date().toISOString();time.wallMs=performance.now()-time.startMs;time.cpuMicros=process.cpuUsage(time.cpuStart);
   cursor++;
  }
  if(cursor<tasks.length){setTimeout(tick,92);return;}
  fs.fsyncSync(log);fs.closeSync(log);
  const end={id,startedUtc:started.toISOString(),endedUtc:new Date().toISOString(),wallMs:performance.now()-begin,cpuMicros:process.cpuUsage(cpu),rows:cursor,phaseTimes,protocolSha256:protocolSha,modelMetadata:JSON.parse(modelMeta),environment:{node:process.version,platform:process.platform,arch:process.arch,cpuModel:os.cpus()[0]?.model,cpuCount:os.cpus().length},trialLogSha256:sha(fs.readFileSync(path.join(OUT,'trials.jsonl')))};
  for(const value of Object.values(end.phaseTimes)){delete value.startMs;delete value.cpuStart;}
  fs.writeFileSync(path.join(OUT,'run.json'),JSON.stringify(end,null,2),{mode:0o600});
  console.log(JSON.stringify({event:'completed',out:OUT,rows:cursor,wallMs:end.wallMs,cpuMicros:end.cpuMicros,trialLogSha256:end.trialLogSha256}));
 }catch(error){try{fs.closeSync(log)}catch{};fs.writeFileSync(path.join(OUT,'ERROR.txt'),String(error.stack),{mode:0o600});console.error(error.stack);process.exitCode=1;}
}
setTimeout(tick,1);
