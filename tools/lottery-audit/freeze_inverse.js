'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.resolve(process.argv[2]||'EuroJackpot'),E=require(path.join(dir,'engine.js')),I=require(path.join(dir,'inverse-engine.js'));
const read=(n,p='')=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8').trim().slice(p.length).replace(/;$/,''));
const history=E.validate(read('history.js','window.EJ_HISTORY=').draws),modelText=fs.readFileSync(path.join(dir,'inverse-model-20261020.json'),'utf8'),model=JSON.parse(modelText),file=path.join(dir,'inverse-forecasts.json'),now=new Date(),date=E.nextDates(now,history)[0];
if(E.deadlineStatus(date,now)==='Norwegian ticket deadline has passed')throw Error('Registration after deadline');
let data=fs.existsSync(file)?read('inverse-forecasts.json'):{version:I.VERSION,forecasts:[]};
if(!data.forecasts.some(f=>f.date===date)){
 if(model.fitLabelDate>=date)throw Error('Fit label must precede prospective target');
 const row=I.proposal(history,date,model);data.forecasts.push({date,version:I.VERSION,createdAt:now.toISOString(),asOf:row.asOf,featureCutoff:row.featureCutoff,fitLabelDate:row.fitLabelDate,informationKnownThrough:row.informationKnownThrough,modelSha256:crypto.createHash('sha256').update(modelText).digest('hex'),rows:[row],method:'Frozen quadratic coefficients fitted to the known 20 October answer. Features use a seven-day lag. Coefficients were learned after that feature cutoff; this is not a forecast registered a week early.',status:'Prospective experiment after an answer-fitted model; no demonstrated prediction advantage'});
 const text=JSON.stringify(data,null,2)+'\n';fs.writeFileSync(file+'.tmp',text,{mode:0o644});fs.renameSync(file+'.tmp',file);
}
fs.writeFileSync(path.join(dir,'inverse-forecasts.js'),'window.EJ_INVERSE_FORECASTS='+JSON.stringify(data)+';\n');
console.log(JSON.stringify(data.forecasts.find(f=>f.date===date)));
