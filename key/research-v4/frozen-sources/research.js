'use strict';
/*
 * Scientific, bounded, controlled-key experiment for SETAEI.
 * This NEVER receives or searches user wallet private keys.
 * Cohort: fresh deterministic synthetic secp256k1 key/address pairs independent of ridge training.
 * Three preregistered tests: ridge model accuracy; address ranking vs true key closeness;
 * single-key-bit flip avalanche.
 */
module.exports = function createResearchAgent({fs,path,crypto,vm,wallet,dataDirectory}) {
 const FILE=path.join(dataDirectory,'research-v1.json');
 const N=BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
 const ROOT='/var/www/setai/key';
 const experiment={
  version:'research-v1.0',
  methodology:'independent synthetic holdout; predetermined fixed cohorts; exact known-key labels',
  phases:[{id:'model',target:1200,label:'160→256 ridge-model: key-bit prediction vs random guessing'},
          {id:'ranking',target:1200,label:'Choose higher address overlap, then test true key-bit proximity'},
          {id:'avalanche',target:256,label:'Change 1 true key bit and measure changed Ethereum-address bits'}]
 };
 const sandbox={crypto:crypto.webcrypto,TextEncoder,Uint8Array,ArrayBuffer,DataView};
 sandbox.LocalWalletBalance={normalizeAddress:a=>a};
 sandbox.globalThis=sandbox;vm.createContext(sandbox);
 for(const name of ['model-experiment-v5.js','guess-experiment-v5.js'])
  vm.runInContext(fs.readFileSync(path.join(ROOT,name),'utf8'),sandbox,{filename:name});
 const guess=vm.runInContext('LocalWalletGuess',sandbox);
 const format=s=>s.toString(16).padStart(64,'0');
 const key=(phase,i,tag)=>format((BigInt('0x'+crypto.createHash('sha256')
   .update('SETAEI-research-fixed-holdout-v1|'+phase+'|'+i+'|'+tag).digest('hex'))%(N-1n))+1n);
 const bitMatch=(a,b)=>{
  let count=0;
  for(let i=0;i<a.length;i++){
   let bits=(parseInt(a[i],16)^parseInt(b[i],16));
   for(let j=0;j<4;j++)count+=((bits>>j)&1)?0:1;
  }
  return count;
 };
 const zero=()=>({count:0,sum:0,sumSquare:0});
 function append(stat,value){stat.count++;stat.sum+=value;stat.sumSquare+=value*value;}
 function summarize(stat){
  if(!stat?.count)return null;
  const n=stat.count,mean=stat.sum/n;
  const variance=n>1?Math.max(0,(stat.sumSquare-stat.sum*stat.sum/n)/(n-1)):null;
  const standardError=variance===null?null:Math.sqrt(variance/n);
  return {n,mean,sd:variance===null?null:Math.sqrt(variance),
    ci95:standardError===null?null:[mean-1.96*standardError,mean+1.96*standardError]};
 }
 function newState(){
  return {version:experiment.version,state:'running',phase:'model',done:0,
   started:new Date().toISOString(),updated:new Date().toISOString(),lastError:null,
   totals:{modelMatch:zero(),randomMatch:zero(),modelMinusRandom:zero(),
     selectionMinusRandom:zero(),selectedKeyMatch:zero(),selectedAddressMatch:zero(),
     randomKeyMatch:zero(),keyAddressCov:zero(),
     avalancheAddressMatch:zero(),avalancheSecretMatch:zero()},lastCheckpoint:Date.now()};
 }
 let state;
 try {
  state=JSON.parse(fs.readFileSync(FILE,'utf8'));
  if(state.version!==experiment.version || !experiment.phases.some(p=>p.id===state.phase))
   throw Error('Old schema');
 }catch{state=newState();}
 if(state.state==='running'){
  // Resume automatically after service restart; persist only aggregate counters.
  state.updated=new Date().toISOString();
 }
 let timer=null;
 function store(){
  state.updated=new Date().toISOString();
  const out={...state};delete out.lastCheckpoint;
  const tmp=FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(out),{mode:0o600});fs.renameSync(tmp,FILE);
  state.lastCheckpoint=Date.now();
 }
 function data(){
  const t=state.totals;
  return {study:experiment.version,state:state.state,phase:state.phase,
    completed:state.done,target:experiment.phases.find(p=>p.id===state.phase)?.target||0,
    started:state.started,updated:state.updated,error:state.lastError,
    measures:{
      predictedPrivateKeyBits:summarize(t.modelMatch),
      randomPrivateKeyBits:summarize(t.randomMatch),
      modelMinusRandomKeyBits:summarize(t.modelMinusRandom),
      selectedPrivateKeyBits:summarize(t.selectedKeyMatch),
      unselectedRandomPrivateKeyBits:summarize(t.randomKeyMatch),
      addressRankingGainKeyBits:summarize(t.selectionMinusRandom),
      selectedAddressBits:summarize(t.selectedAddressMatch),
      oneBitFlipAddressBitsUnchanged:summarize(t.avalancheAddressMatch),
      oneBitFlipKeyBitsUnchanged:summarize(t.avalancheSecretMatch)
    },phases:experiment.phases.map(p=>({id:p.id,label:p.label,target:p.target})),
    evidenceRule:'A positive signal is only preliminary if the locked model-minus-random 95% paired interval is strictly above 0. Any such signal requires replication on a fresh independent holdout before claiming improvement.',
    limitation:'Synthetic keys only. No real wallet private key is sent or recovered. Ethereum addresses do not reveal the full public point needed by discrete-log methods.'};
 }
 function doOne(){
  const i=state.done,t=state.totals,phase=state.phase;
  if(phase==='model'){
   const secret=key('model',i,'truth');
   const address=wallet.deriveAddress(secret);
   const predicted=guess.predictCandidate(address);
   const baseline=key('model',i,'random');
   const x=bitMatch(predicted,secret),y=bitMatch(baseline,secret);
   append(t.modelMatch,x);append(t.randomMatch,y);append(t.modelMinusRandom,x-y);
  }else if(phase==='ranking'){
   const secret=key('ranking',i,'truth'),address=wallet.deriveAddress(secret).toLowerCase();
   const a=key('ranking',i,'A'),b=key('ranking',i,'B');
   const first=wallet.deriveAddress(a).toLowerCase(),second=wallet.deriveAddress(b).toLowerCase();
   const ov1=bitMatch(first.slice(2),address.slice(2));
   const ov2=bitMatch(second.slice(2),address.slice(2));
   const selected=ov1>=ov2?a:b,random=a;
   const keyBits=bitMatch(selected,secret),randomBits=bitMatch(random,secret);
   append(t.selectedKeyMatch,keyBits);append(t.randomKeyMatch,randomBits);
   append(t.selectionMinusRandom,keyBits-randomBits);append(t.selectedAddressMatch,Math.max(ov1,ov2));
  }else if(phase==='avalanche'){
   const secret=key('avalanche',i,'truth'),address=wallet.deriveAddress(secret).toLowerCase();
   const flip=1n<<BigInt(i);
   const changed=(BigInt('0x'+secret)^flip);
   if(changed<=0n||changed>=N)throw Error('Synthetic scalar out of range');
   const altered=format(changed),newAddress=wallet.deriveAddress(altered).toLowerCase();
   append(t.avalancheAddressMatch,bitMatch(address.slice(2),newAddress.slice(2)));
   append(t.avalancheSecretMatch,bitMatch(secret,altered));
  }
  state.done++;
  const target=experiment.phases.find(x=>x.id===phase).target;
  if(state.done>=target){
   const next=experiment.phases[experiment.phases.findIndex(x=>x.id===phase)+1];
   if(next){state.phase=next.id;state.done=0;}else{state.state='completed';}
   store();
  }
 }
 function tick(){
  timer=null;
  if(state.state!=='running')return;
  try{
   const begin=performance.now();
   while(state.state==='running'&&performance.now()-begin<16){
    doOne();
   }
   if(Date.now()-state.lastCheckpoint>5000)store();
  }catch(err){state.state='error';state.lastError=String(err.message).slice(0,160);store();}
  if(state.state==='running')schedule();
 }
 function schedule(){if(timer!==null)clearTimeout(timer);timer=setTimeout(tick,450);timer.unref?.();}
 function pause(){if(timer!==null){clearTimeout(timer);timer=null;}if(state.state==='running'){state.state='paused';store();}return data();}
 function resume(){
  if(state.state==='completed')return data();
  if(state.state==='error')throw Error('Study failed; do not silently reset it');
  if(state.state!=='running'){state.state='running';store();}schedule();return data();
 }
 function shutdown(){if(state.state==='running')store();if(timer!==null)clearTimeout(timer);}
 if(state.state==='running')schedule();
 return {data,pause,resume,shutdown};
};
