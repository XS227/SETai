'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const DATA=process.env.LAB_DATA_DIR||'/var/lib/setai-learning-lab';
const PUBLIC=process.env.LAB_PUBLIC_DIR||'/var/www/setai/key/learning-lab';
const COUNTS={train:512,validation:512,test:2048},EPOCHS=24,ROUNDS=14,DIM=80,BITS=16;
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const timestamp=()=>new Date().toISOString();
function atomic(file,value){const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value),{mode:0o600});fs.renameSync(tmp,file);}
function pub(file,value){const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value),{mode:0o644});fs.renameSync(tmp,file);}
fs.mkdirSync(DATA,{recursive:true,mode:0o700});fs.mkdirSync(PUBLIC,{recursive:true});fs.mkdirSync(path.join(PUBLIC,'runs'),{recursive:true});
const hash=sha(fs.readFileSync(__filename));
const protocolPath=path.join(DATA,'protocol.json');
let protocol;
if(fs.existsSync(protocolPath)){
 protocol=JSON.parse(fs.readFileSync(protocolPath));
 if(protocol.runnerSha256!==hash)throw Error('Locked study code changed. Create a new study instead of silently modifying the experiment.');
}else{
 protocol={study:'SETAEI Error Learning Lab',version:'toy-error-lab-v1',lockedAtUtc:timestamp(),runnerSha256:hash,
  studySeed:crypto.randomBytes(32).toString('hex'),wordBits:BITS,featureBits:DIM,counts:COUNTS,epochs:EPOCHS,plannedRounds:ROUNDS,
  controls:['learnable_permutation','independent_random','fixed_hash'],nightlyTime:'03:15 Europe/Berlin',
  procedure:'Mistake-driven batch perceptron. Only incorrectly classified training bits contribute updates. A training word weight is 1 + fraction of its wrong bits. Select the earliest best validation epoch; open the test set once after selection.',
  split:'One seeded permutation of 65,536 synthetic 16-bit words. Each round reserves 3,072 disjoint words. No prior train/validation/test word reappears in another round.',
  inference:'Paired 95% normal-approximation CI on correct-bit differences per test word. Primary comparator is an independently generated random word. All daily estimates are exploratory; no real-wallet deployment or efficacy claim is permitted.',
  restart:'Per-round initial model snapshots remain fixed across retries. Interrupted attempts are recorded; only a published completed round advances the counter.',
  horizon:'14 scheduled rounds including pilot. No favorable-result early stopping, no extension based on results. A final review must include every completed and failed round.',
  privacy:'Four-hex-character toy words only. No wallet addresses, real private keys, funds, balance APIs or live-agent job data are inputs.',
  limits:'A successful learnable control only validates this pipeline. The fixed-hash control has a tiny exhaustive word space and is not a security proof. Current Ethereum model errors are described separately and are not training inputs here.'};
 atomic(protocolPath,protocol);
}
pub(path.join(PUBLIC,'protocol.json'),protocol);
const key=Buffer.from(protocol.studySeed,'hex');
function digest(tag){return crypto.createHmac('sha256',key).update(tag).digest();}
function bits(bytes,n){return Array.from({length:n},(_,i)=>((bytes[i>>3]>>(7-(i&7)))&1)?1:-1);}
function labels(word){return Array.from({length:BITS},(_,i)=>((word>>(BITS-1-i))&1)?1:-1);}
function hexBits(a){let value=0;for(const bit of a)value=value*2+(bit===1?1:0);return value.toString(16).padStart(4,'0').toUpperCase();}
function rng(tag){let block=Buffer.alloc(0),cursor=0,index=0;return n=>{
 let v,limit=Math.floor(4294967296/n)*n;
 do{if(cursor+4>block.length){block=digest(tag+'|'+index++);cursor=0;}v=block.readUInt32BE(cursor);cursor+=4;}while(v>=limit);
 return v%n;
};}
let pool;
const corpusPath=path.join(DATA,'corpus.json');
if(fs.existsSync(corpusPath))pool=JSON.parse(fs.readFileSync(corpusPath));
else{pool=Array.from({length:65536},(_,i)=>i);const random=rng('corpus-permutation');for(let i=pool.length-1;i>0;i--){const j=random(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}atomic(corpusPath,pool);}
const permutation=Array.from({length:BITS},(_,i)=>i),randomPerm=rng('feature-permutation');
for(let i=BITS-1;i>0;i--){const j=randomPerm(i+1);[permutation[i],permutation[j]]=[permutation[j],permutation[i]];}
const mask=bits(digest('feature-mask'),BITS);
function feature(control,word,index){
 if(control==='learnable_permutation'){
  const y=labels(word);return [...permutation.map((p,i)=>y[p]*mask[i]),...bits(digest('noise|'+word),DIM-BITS),1];
 }
 if(control==='independent_random')return [...bits(digest('independent-features|'+index),DIM),1];
 return [...bits(crypto.createHash('sha256').update('SETAEI-TOY-HASH|'+word.toString(16).padStart(4,'0')).digest(),DIM),1];
}
function predict(x,W){const y=[];for(let b=0;b<BITS;b++){let s=0;for(let f=0;f<=DIM;f++)s+=x[f]*W[f*BITS+b];y.push(s>=0?1:-1);}return y;}
function score(rows,W){let correct=0,exact=0;for(const r of rows){const pred=predict(r.x,W);let n=0;for(let b=0;b<BITS;b++)if(pred[b]===r.y[b])n++;correct+=n;if(n===BITS)exact++;}return {n:rows.length,correctBits:correct,bitAccuracy:correct/(rows.length*BITS),exactWords:exact};}
function train(rows,W){
 const gradient=new Float64Array(W.length);let wrongBits=0;
 for(const row of rows){
  const pred=predict(row.x,W),errors=pred.map((v,i)=>v!==row.y[i]);const wrong=errors.filter(Boolean).length;
  wrongBits+=wrong;const weight=1+wrong/BITS;
  for(let b=0;b<BITS;b++)if(errors[b]){const delta=weight*(row.y[b]-pred[b]);for(let f=0;f<=DIM;f++)gradient[f*BITS+b]+=row.x[f]*delta;}
 }
 for(let i=0;i<W.length;i++)W[i]+=.25*gradient[i]/rows.length;
 return wrongBits;
}
function summary(a){const n=a.length,mean=a.reduce((s,v)=>s+v,0)/n;const variance=a.reduce((s,v)=>s+(v-mean)**2,0)/(n-1),se=Math.sqrt(variance/n);return {n,mean,sd:Math.sqrt(variance),ci95:[mean-1.96*se,mean+1.96*se]};}
function matrix(rows,W){
 const positions=Array.from({length:4},()=>Array.from({length:16},()=>Array(16).fill(0)));
 for(const row of rows){const truth=row.word.toString(16).padStart(4,'0').toUpperCase(),prediction=hexBits(predict(row.x,W));for(let p=0;p<4;p++)positions[p][parseInt(truth[p],16)][parseInt(prediction[p],16)]++;}
 return positions;
}
function flushLatest(state){
 const completed=[];
 for(let i=1;i<=ROUNDS;i++){const file=path.join(PUBLIC,'runs','round-'+String(i).padStart(2,'0')+'.json');if(fs.existsSync(file))completed.push(JSON.parse(fs.readFileSync(file)));}
 pub(path.join(PUBLIC,'latest.json'),{study:protocol.study,version:protocol.version,protocolSha256:sha(JSON.stringify(protocol)),plannedRounds:ROUNDS,updatedUtc:timestamp(),state:state.activeRound?'running':completed.length>=ROUNDS?'completed':'waiting',activeRound:state.activeRound,completedRounds:completed.length,rounds:completed.map(r=>({round:r.round,startedUtc:r.startedUtc,endedUtc:r.endedUtc,wallSeconds:r.wallSeconds,controls:r.controls.map(c=>({control:c.control,selectedEpoch:c.selectedEpoch,test:c.test,versusRandom:c.versusRandom}))})),latest:completed.at(-1)||null});
}
const statePath=path.join(DATA,'state.json');let state=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath)):{nextRound:1,activeRound:null};
if(!state.activeRound&&state.nextRound>ROUNDS){flushLatest(state);console.log('Planned study completed; no extra testing.');process.exit(0);}
const round=state.activeRound||state.nextRound;
const published=path.join(PUBLIC,'runs','round-'+String(round).padStart(2,'0')+'.json');
if(fs.existsSync(published)){state.activeRound=null;state.nextRound=round+1;atomic(statePath,state);flushLatest(state);process.exit(0);}
state.activeRound=round;atomic(statePath,state);flushLatest(state);
const size=Object.values(COUNTS).reduce((s,v)=>s+v,0),words=pool.slice((round-1)*size,round*size);
if(words.length!==size||new Set(words).size!==size)throw Error('Corpus size or uniqueness failed.');
const runDir=path.join(DATA,'round-'+String(round).padStart(2,'0'));fs.mkdirSync(runDir,{recursive:true,mode:0o700});
const plan={round,lockedAtUtc:timestamp(),protocolSha256:sha(JSON.stringify(protocol)),wordIdsSha256:sha(JSON.stringify(words)),counts:COUNTS,studyCodeSha256:hash};
const planFile=path.join(runDir,'plan.json');
if(fs.existsSync(planFile))Object.assign(plan,JSON.parse(fs.readFileSync(planFile)));else atomic(planFile,plan);
const attemptsFile=path.join(runDir,'attempts.json');const attempts=fs.existsSync(attemptsFile)?JSON.parse(fs.readFileSync(attemptsFile)):[];attempts.push({attempt:attempts.length+1,startedUtc:timestamp()});atomic(attemptsFile,attempts);
const started=performance.now(),cpu=process.cpuUsage(),result={round,startedUtc:timestamp(),plan,controls:[],executionAttempt:attempts.length,toyWordsDistinct:size,realWalletInputs:0};
const log=[];
for(const control of protocol.controls){
 const rows=words.map((word,i)=>({word,index:(round-1)*size+i,x:feature(control,word,(round-1)*size+i),y:labels(word)}));
 const training=rows.slice(0,COUNTS.train),validation=rows.slice(COUNTS.train,COUNTS.train+COUNTS.validation),test=rows.slice(COUNTS.train+COUNTS.validation);
 const previousFile=path.join(DATA,'model-'+control+'.json');
 const initialFile=path.join(runDir,control+'-initial.json');
 let W=fs.existsSync(initialFile)?Float64Array.from(JSON.parse(fs.readFileSync(initialFile))):fs.existsSync(previousFile)?Float64Array.from(JSON.parse(fs.readFileSync(previousFile))):new Float64Array((DIM+1)*BITS);
 if(!fs.existsSync(initialFile))atomic(initialFile,Array.from(W));
 const previous=Float64Array.from(W),epochs=[{epoch:0,training:score(training,W),validation:score(validation,W)}];
 let chosen=Float64Array.from(W),chosenEpoch=0,best=epochs[0].validation.bitAccuracy;
 for(let e=1;e<=EPOCHS;e++){
  const trainedWrongBits=train(training,W),entry={epoch:e,trainedWrongBits,training:score(training,W),validation:score(validation,W)};epochs.push(entry);
  if(entry.validation.bitAccuracy>best){best=entry.validation.bitAccuracy;chosen=Float64Array.from(W);chosenEpoch=e;}
  atomic(path.join(runDir,control+'-checkpoint.json'),{epoch:e,selectedEpoch:chosenEpoch,weights:Array.from(W),chosen:Array.from(chosen),epochs});
 }
 const selectedUtc=timestamp(),modelHash=sha(JSON.stringify(Array.from(chosen)));
 atomic(path.join(runDir,control+'-selected.json'),{selectedUtc,modelHash,epoch:chosenEpoch,weights:Array.from(chosen)});
 // No test labels are used by training, epoch selection or the saved next-round model.
 atomic(previousFile,Array.from(chosen));
 const testOpenedUtc=timestamp(),diffRandom=[],diffPrevious=[],perBitErrors=Array(BITS).fill(0);
 let correct=0,exact=0,randomCorrect=0,oldCorrect=0;
 for(const row of test){
  const prediction=predict(row.x,chosen),old=predict(row.x,previous),baseline=bits(digest('random-baseline|'+control+'|'+row.index),BITS);
  let m=0,o=0,r=0;for(let b=0;b<BITS;b++){if(prediction[b]===row.y[b])m++;else perBitErrors[b]++;if(old[b]===row.y[b])o++;if(baseline[b]===row.y[b])r++;}
  correct+=m;randomCorrect+=r;oldCorrect+=o;if(m===BITS)exact++;
  diffRandom.push(m-r);diffPrevious.push(m-o);
  log.push({round,control,phase:'test',id:row.index,truthWord:row.word.toString(16).padStart(4,'0').toUpperCase(),prediction:hexBits(prediction),previousPrediction:hexBits(old),modelCorrectBits:m,previousCorrectBits:o,randomCorrectBits:r,measuredUtc:timestamp()});
 }
 const c={control,selectedEpoch:chosenEpoch,selectedUtc,testOpenedUtc,modelHash,epochs,test:{n:test.length,bitAccuracy:correct/(test.length*BITS),meanCorrectBits:correct/test.length,exactWords:exact,randomBitAccuracy:randomCorrect/(test.length*BITS),previousBitAccuracy:oldCorrect/(test.length*BITS)},versusRandom:summary(diffRandom),versusPrevious:summary(diffPrevious),perBitErrors,confusion:matrix(test,chosen)};
 result.controls.push(c);
}
result.endedUtc=timestamp();result.wallSeconds=(performance.now()-started)/1000;result.cpuMicros=process.cpuUsage(cpu);result.rawTestRows=log.length;
result.checks={splitDisjoint:new Set(words).size===size,testOpenedAfterSelection:result.controls.every(c=>c.testOpenedUtc>=c.selectedUtc),correctTestCounts:result.controls.every(c=>c.test.n===COUNTS.test),learningControlGeneralizes:result.controls[0].test.bitAccuracy>.95,noWalletInputs:result.realWalletInputs===0};
const raw=log.map(v=>JSON.stringify(v)).join('\n')+'\n';fs.writeFileSync(path.join(runDir,'test-rows.jsonl'),raw,{mode:0o600});result.rawLogSha256=sha(raw);
atomic(path.join(runDir,'result.json'),result);
fs.writeFileSync(path.join(PUBLIC,'runs','round-'+String(round).padStart(2,'0')+'-test.jsonl'),raw,{mode:0o644});
pub(published,result);
state.activeRound=null;state.nextRound=round+1;atomic(statePath,state);flushLatest(state);
console.log(JSON.stringify({round,wallSeconds:result.wallSeconds,checks:result.checks,controls:result.controls.map(c=>({control:c.control,epoch:c.selectedEpoch,accuracy:c.test.bitAccuracy,gain:c.versusRandom.mean,ci95:c.versusRandom.ci95}))}));

