#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const EJ=require('./engine.js'),directory=process.argv[2]||__dirname;
function load(name,key){const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(directory,name),'utf8'),ctx,{timeout:2000});return ctx.window[key];}
const history=load('history.js','EJ_HISTORY'),rows=EJ.validate(history.draws),now=new Date();
const file=path.join(directory,'proposals.js');
let data=fs.existsSync(file)?load('proposals.js','EJ_PROPOSALS'):{forecasts:[],version:EJ.VERSION};
if(!Array.isArray(data.forecasts))throw Error('Invalid proposal archive');
const model=EJ.fit(rows);
for(const date of EJ.nextDates(now,rows)){
  // Never represent a late generated row as a pre-draw prediction.
  if(EJ.deadlineStatus(date,now)==='Spillefristen er passert')continue;
  for(const mode of ['model','uniform']){
    if(data.forecasts.some(f=>f.date===date&&f.mode===mode&&f.version===EJ.VERSION))continue;
    const predictions=[0,1].map(v=>EJ.proposal(rows,date,mode,v,model));
    if(JSON.stringify(predictions[0].main)===JSON.stringify(predictions[1].main)&&JSON.stringify(predictions[0].stars)===JSON.stringify(predictions[1].stars)){
      predictions[1]=EJ.proposal(rows,date,mode,2,model);
    }
    data.forecasts.push({date,mode,asOf:rows.at(-1).date,version:EJ.VERSION,createdAt:now.toISOString(),rows:predictions});
  }
}
// Preserve previously registered rows. Append realized hits, without changing the prediction.
for(const forecast of data.forecasts){
  const actual=rows.find(r=>r.date===forecast.date);
  if(actual&&!forecast.result)forecast.result={main:actual.main,stars:actual.stars,hits:forecast.rows.map(r=>({main:r.main.filter(n=>actual.main.includes(n)).length,stars:r.stars.filter(n=>actual.stars.includes(n)).length}))};
}
data.updatedAt=now.toISOString();
fs.writeFileSync(file+'.tmp','window.EJ_PROPOSALS='+JSON.stringify(data)+';\n');fs.renameSync(file+'.tmp',file);
console.log(JSON.stringify({saved:file,forecasts:data.forecasts.length,next:EJ.nextDates(now,rows)}));
