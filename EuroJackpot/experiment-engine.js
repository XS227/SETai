(function(root){
'use strict';
const E=typeof module!=='undefined'?require('./engine.js'):root.EJ;
const N=typeof module!=='undefined'?require('./numerology.js'):root.EJ_NUMEROLOGY;
const VERSION='personal-date-prize-v1';
function amountRoot(amount){
 if(!Number.isSafeInteger(amount)||amount<=0)throw Error('Use a positive prize amount in whole currency units.');
 return N.reduce(amount);
}
function combination(birth,date,name,ownNumber,amount,currency='EUR'){
 const p=N.profile(birth,date,name),own=ownNumber||p.life;
 if(!Number.isInteger(own)||own<1||own>50)throw Error('Your number must be a whole number from 1 to 50.');
 const pr=amountRoot(amount),out=new Map(),stars=new Map();
 const factors=[{value:own,label:'Your number'},{value:p.year,label:'Personal year'},{value:p.month,label:'Personal month'},{value:p.day,label:'Personal day'},{value:pr,label:'Prize amount in '+currency+' · digit root'}];
 function add(map,value,label,max,k){const n=((value-1)%max)+1;if(map.size>=k&&!map.has(n))return;if(!map.has(n))map.set(n,{number:n,sources:[]});map.get(n).sources.push(label+(n!==value?` (${value} → ${n})`:''));}
 for(const x of factors)add(out,x.value,x.label,50,5);
 for(let i=0;i<factors.length;i++)for(let j=i+1;j<factors.length;j++)if(out.size<5)add(out,factors[i].value+factors[j].value,factors[i].label+' + '+factors[j].label,50,5);
 for(let i=1;out.size<5;i++)add(out,own+p.day+pr+i,'Your number + personal day + prize digit root + '+i,50,5);
 add(stars,N.reduce(p.day+pr),'Personal day + prize digit root, reduced',12,2);
 add(stars,N.reduce(own+p.year),'Your number + personal year, reduced',12,2);
 for(let i=1;stars.size<2;i++)add(stars,p.day+pr+i,'Personal day + prize digit root + '+i,12,2);
 const reasons=[...out.values()].sort((a,b)=>a.number-b.number),starReasons=[...stars.values()].sort((a,b)=>a.number-b.number);
 return {date,main:reasons.map(x=>x.number),stars:starReasons.map(x=>x.number),reasons,starReasons,profile:p,ownNumber:own,amount,currency,premiumRoot:pr,version:VERSION};
}
function winnerCounts(rows){return [{label:'None',count:rows.filter(r=>r.jackpotWinningRows===0).length},{label:'One',count:rows.filter(r=>r.jackpotWinningRows===1).length},{label:'Multiple',count:rows.filter(r=>r.jackpotWinningRows>1).length},{label:'Unknown',count:rows.filter(r=>r.jackpotWinningRows===null).length}];}
function hypergeom(pool,picked,drawn,hits){return E.choose(picked,hits)*E.choose(pool-picked,drawn-hits)/E.choose(pool,drawn);}
function announcementFor(data,date){
 return (data.announcedPots||[]).filter(a=>a.drawDate===date&&Number.isFinite(a.amountEUR)&&a.amountEUR>0&&Number.isFinite(Date.parse(a.observedAt))&&E.deadlineStatus(date,new Date(a.observedAt))!=='Norwegian ticket deadline has passed').sort((a,b)=>a.observedAt.localeCompare(b.observedAt)).at(-1)||null;
}
function historicalStars(stars,date){
 const n=E.pool(date),out=[];
 for(const value of stars){const mapped=((value-1)%n)+1;if(!out.includes(mapped))out.push(mapped);}
 for(let i=1;out.length<2;i++){const value=((stars[0]+stars[1]+i-1)%n)+1;if(!out.includes(value))out.push(value);}
 return out.sort((a,b)=>a-b);
}
function backtest(rows,birth,name='',beforeDate='9999-12-31',mode='personal',data={},ownNumber=null){
 let eligible=rows.filter(r=>r.date>=birth&&r.date<beforeDate),omitted=0;
 if(mode==='combined'){const prior=eligible;eligible=prior.filter(r=>announcementFor(data,r.date));omitted=prior.length-eligible.length;}
 const observed=Array(6).fill(0),expected=Array(6).fill(0),starObserved=Array(3).fill(0),starExpected=Array(3).fill(0),results=[];
 for(const r of eligible){
  const ann=mode==='combined'?announcementFor(data,r.date):null;
  const p=ann?combination(birth,r.date,name,ownNumber,Math.round(ann.amountEUR)):N.row(birth,r.date,name);
  p.stars=historicalStars(p.stars,r.date);
  const main=p.main.filter(n=>r.main.includes(n)).length,stars=p.stars.filter(n=>r.stars.includes(n)).length;
  observed[main]++;starObserved[stars]++;
  for(let k=0;k<6;k++)expected[k]+=hypergeom(50,5,5,k);
  for(let k=0;k<3;k++)starExpected[k]+=hypergeom(E.pool(r.date),2,2,k);
  results.push({date:r.date,main,stars,rowMain:p.main,rowStars:p.stars});
 }
 const count=results.length,totalMain=results.reduce((s,r)=>s+r.main,0),totalStars=results.reduce((s,r)=>s+r.stars,0);
 const expectedStars=eligible.reduce((s,r)=>s+4/E.pool(r.date),0);
 const random=E.rng(0x20261011),simulations=[];
 // A fixed-size exploration: 200 independent controls, without adjusting the user's rule.
 if(count){for(let i=0;i<200;i++){let hits=0;for(const r of eligible){const picked=E.sample(Array(50).fill(1),5,random);hits+=picked.filter(n=>r.main.includes(n)).length;}simulations.push(hits/count);}}
 simulations.sort((a,b)=>a-b);
 return {count,omitted,results,observed,expected,starObserved,starExpected,meanMain:count?totalMain/count:null,meanStars:count?totalStars/count:null,expectedMeanMain:.5,expectedMeanStars:count?expectedStars/count:null,
  controlLow:simulations[Math.floor(simulations.length*.025)]??null,controlHigh:simulations[Math.min(simulations.length-1,Math.floor(simulations.length*.975))]??null,simulations:simulations.length,
  jackpotHits:results.filter(r=>r.main===5&&r.stars===2).length,mode};
}
const api={VERSION,amountRoot,combination,winnerCounts,hypergeom,announcementFor,historicalStars,backtest};
if(typeof module!=='undefined')module.exports=api;else root.EJ_EXPERIMENT=api;
})(typeof window!=='undefined'?window:globalThis);
