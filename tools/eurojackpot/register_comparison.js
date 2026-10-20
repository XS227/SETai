'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),E=require(path.resolve(process.argv[2]||'EuroJackpot','engine.js'));
const dir=path.resolve(process.argv[2]||'EuroJackpot'),file=path.join(dir,'comparison-forecasts.json');
const read=(n,p)=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8').trim().slice(p.length).replace(/;$/,''));
const history=E.validate(read('history.js','window.EJ_HISTORY=').draws),registered=read('proposals.js','window.EJ_PROPOSALS='),now=new Date(),date=E.nextDates(now,history)[0];
if(E.deadlineStatus(date,now)==='Norwegian ticket deadline has passed')throw Error('Registration deadline passed');
const data=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{version:'uniform-comparison-v1',forecasts:[]};
if(!data.forecasts.some(f=>f.date===date)){
 const entropy=crypto.randomBytes(16).toString('hex'),seed=crypto.createHash('sha256').update(data.version+'|'+date+'|'+entropy).digest().readUInt32LE(0),random=E.rng(seed);
 const used=new Set(registered.forecasts.filter(f=>f.date===date).flatMap(f=>f.rows.map(r=>r.main.join(',')+'|'+r.stars.join(',')))),rows=[];
 while(rows.length<2){const r={date,main:E.sample(Array(50).fill(1),5,random),stars:E.sample(Array(12).fill(1),2,random)},key=r.main.join(',')+'|'+r.stars.join(',');if(!used.has(key)){used.add(key);rows.push(r);}}
 data.forecasts.push({date,asOf:history.at(-1).date,createdAt:now.toISOString(),version:data.version,seed,entropy,rows,method:'Uniform sampling without replacement in each pool; reject complete combinations already registered for this target date. No outcome or frequency weighting.',status:'New prospective comparison; no demonstrated advantage'});
 const s=JSON.stringify(data,null,2)+'\n';fs.writeFileSync(file+'.tmp',s);fs.renameSync(file+'.tmp',file);
}
fs.writeFileSync(path.join(dir,'comparison-forecasts.js'),'window.EJ_COMPARISONS='+JSON.stringify(data)+';\n');
console.log(JSON.stringify(data.forecasts.find(f=>f.date===date)));
