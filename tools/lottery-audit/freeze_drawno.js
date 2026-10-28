#!/usr/bin/env node
'use strict';
// Registers the fixed "drawNo*9, step 5" candidate (found by method_search.js) for upcoming EuroJackpot draws.
// Rule: h = latest draw dated at least 7 days before the target; main numbers = (9*(h+1) + 5*j) mod 50 + 1, j = 0..4.
// Registered rows are never rewritten. Usage: node freeze_drawno.js [webroot | EuroJackpot directory]
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const target=process.argv[2]||'/var/www/setai',dir=fs.existsSync(path.join(target,'EuroJackpot/history.js'))?path.join(target,'EuroJackpot'):target;
const EJ=require(path.join(dir,'engine.js'));
const VERSION='drawno-9-5-v1',MULT=9,STEP=5,N=50,K=5,LAG_DAYS=7;
const dayNum=s=>Math.floor(Date.parse(s+'T12:00:00Z')/864e5);
const mod=(a,n)=>((a%n)+n)%n;
function candidate(rows,date){
 let h=-1;for(let u=0;u<rows.length;u++)if(rows[u].date<date&&dayNum(rows[u].date)<=dayNum(date)-LAG_DAYS)h=u;
 if(h<0)throw Error('No archive at least 7 days before '+date);
 const main=[];for(let j=0;main.length<K&&j<3*K;j++){const x=mod(MULT*(h+1)+STEP*j,N)+1;if(!main.includes(x))main.push(x);}
 return {main:main.sort((a,b)=>a-b),featureCutoff:rows[h].date,drawNumber:h+1};
}
if(require.main===module){
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(dir,'history.js'),'utf8'),ctx,{timeout:2000});
 const rows=EJ.validate(ctx.window.EJ_HISTORY.draws),now=new Date(),file=path.join(dir,'drawno-forecasts.json');
 const data=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{
  version:VERSION,
  rule:'Main numbers = (9 x draw number + 5 x j) mod 50 + 1 for j = 0..4, where draw number counts archived draws up to the latest one dated at least 7 days before the target. No Euro numbers are proposed.',
  protocol:'Found by hindsight search on 20 October 2026 (tools/lottery-audit/method_search.js). Evaluated only on draws registered before they happen. Expected main-number matches by chance: 0.5 per draw, 25 +/- 4.5 over 50 draws.',
  forecasts:[]};
 let added=0;
 for(const date of EJ.nextDates(now,rows)){
  if(EJ.deadlineStatus(date,now)==='Norwegian ticket deadline has passed')continue;
  if(data.forecasts.some(f=>f.date===date))continue;
  const c=candidate(rows,date);
  data.forecasts.push({date,version:VERSION,createdAt:now.toISOString(),asOf:c.featureCutoff,featureCutoff:c.featureCutoff,fitLabelDate:null,informationKnownThrough:rows.at(-1).date,drawNumber:c.drawNumber,
   rows:[{date,version:VERSION,main:c.main,stars:[]}]});added++;
 }
 for(const f of data.forecasts){
  const actual=rows.find(r=>r.date===f.date);
  if(actual&&!f.result)f.result={main:actual.main,hits:f.rows.map(r=>({main:r.main.filter(n=>actual.main.includes(n)).length}))};
 }
 fs.writeFileSync(file+'.tmp',JSON.stringify(data,null,2)+'\n');fs.renameSync(file+'.tmp',file);fs.chmodSync(file,0o644);
 console.log(JSON.stringify({saved:file,added,total:data.forecasts.length}));
}
module.exports={candidate,VERSION};
