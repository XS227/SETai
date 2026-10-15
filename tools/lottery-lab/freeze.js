'use strict';
const fs=require('fs'),path=require('path'),LAB=require('../../LotteryLab/engine.js');
const root=process.env.LOTTERY_LAB_ROOT||path.resolve(__dirname,'../..'),methods=['ai1','ai2','calendar','unseen','sumroot','uniform'];
const write=(p,d)=>{fs.writeFileSync(p+'.tmp',JSON.stringify(d)+'\n',{mode:0o644});fs.renameSync(p+'.tmp',p);};
function sumRoots(n,k){const a=Array.from({length:k+1},()=>Array(n*k+1).fill(0));a[0][0]=1;for(let v=1;v<=n;v++)for(let j=k;j>0;j--)for(let s=n*k;s>=v;s--)a[j][s]+=a[j-1][s-v];const out=Array(9).fill(0);a[k].forEach((count,s)=>{if(count)out[LAB.reduce(s)-1]+=count/LAB.choose(n,k);});return out;}
for(const folder of ['Lotto','Vikinglotto']){
 const dir=path.join(root,folder),h=JSON.parse(fs.readFileSync(path.join(dir,'history.json'),'utf8')),c=h.config,rows=LAB.validate(h.draws,c),model=LAB.fit(rows,c),p=path.join(dir,'forecasts.json');let ledger=fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):{version:LAB.VERSION,forecasts:[]};
 const now=new Date();for(const f of ledger.forecasts){const actual=rows.find(r=>r.date===f.date);if(actual)f.result={...actual,hits:f.rows.map(line=>LAB.score(line,actual,c))};}
 for(const date of LAB.nextDates(c,rows,now))if(LAB.beforeDeadline(date,now)&&!ledger.forecasts.some(f=>f.date===date&&f.version===LAB.VERSION)){ledger.forecasts.push({date,version:LAB.VERSION,asOf:rows.at(-1).date,createdAt:now.toISOString(),rows:methods.map(m=>LAB.proposal(rows,date,c,m,model))});}
 ledger.updatedAt=now.toISOString();write(p,ledger);
 const frequencies=Array.from({length:c.n},(_,i)=>({number:i+1,count:rows.filter(r=>r.main.includes(i+1)).length})),specialFrequencies=Array.from({length:c.special},(_,i)=>({number:i+1,count:rows.filter(r=>r.special.includes(i+1)).length}));
 const roots=Array.from({length:9},(_,i)=>({root:i+1,main:0,extra:0,total:0})),rootNull=sumRoots(c.n,c.k);let totalNull=c.special?Array(9).fill(0):sumRoots(c.n,c.k+1),expectedDateMain=0,expectedDateTotal=0,dateMainMatches=0,dateTotalMatches=0;const groups=new Map(),fullGroups=new Map();
 if(c.special)for(let i=0;i<9;i++)for(let v=1;v<=c.special;v++)totalNull[LAB.reduce(i+1+v)-1]+=rootNull[i]/c.special;
 for(const r of rows){const m=r.main.reduce((a,b)=>a+b,0),extra=(c.special?r.special:r.bonus)[0],d=LAB.reduce([...r.date.replaceAll('-','')].reduce((a,b)=>a+ +b,0));roots[LAB.reduce(m)-1].main++;roots[LAB.reduce(extra)-1].extra++;roots[LAB.reduce(m+extra)-1].total++;dateMainMatches+=LAB.reduce(m)===d;dateTotalMatches+=LAB.reduce(m+extra)===d;expectedDateMain+=rootNull[d-1];expectedDateTotal+=totalNull[d-1];for(const [map,key] of [[groups,r.main.join(',')],[fullGroups,LAB.key(r)]]){if(!map.has(key))map.set(key,[]);map.get(key).push(r.date);}}
 const repeated=map=>Array.from(map,([numbers,dates])=>({numbers,dates,count:dates.length})).filter(x=>x.count>1).sort((a,b)=>b.count-a.count);
 const analysis={version:LAB.VERSION,through:rows.at(-1).date,count:rows.length,frequency:frequencies,specialFrequency:specialFrequencies,roots,rootNull,totalRootNull:totalNull,dateMainMatches,expectedDateMain,dateTotalMatches,expectedDateTotal,repeatedMain:repeated(groups),repeatedFull:repeated(fullGroups),evaluation:model.evaluation,disclaimer:'Exploratory archive summaries and retrospective Brier evaluation; no demonstrated prediction advantage. Root matches and sum views are related and do not independently validate predictions.'};
 write(path.join(dir,'analysis.json'),analysis);console.log(folder,rows.length,'draws; forecasts',ledger.forecasts.map(f=>f.date).join(', '),'main Brier',model.evaluation.mainBrier);
}
