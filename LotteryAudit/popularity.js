(function(root){'use strict';
 // Shared-jackpot avoidance. Every row has exactly the same chance of being drawn.
 // What differs is how many other players picked it, which decides how many people split a jackpot.
 const VERSION='lottery-popularity-v1';
 const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;};
 const rng=seed=>{let a=seed;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};};
 const GAMES={
  lotto:{name:'Lotto',n:34,k:7,secondary:0},
  vikinglotto:{name:'Vikinglotto',n:48,k:6,secondary:5},
  eurojackpot:{name:'EuroJackpot',n:50,k:5,secondary:12}
 };

 // Assumed relative popularity of each number (mean 1). Birthday numbers, 7 and 11 are over-picked
 // in published studies of lottery choices; 13 is under-picked. These factors are assumptions until
 // the empirical estimate (popularity.json) supports them.
 function priorWeights(n){
  return normalise(Array.from({length:n},(_,i)=>{
   const x=i+1;let w=x<=12?1.3:x<=31?1.2:.8;
   if(x===7)w*=1.25;if(x===3||x===11)w*=1.1;if(x===13)w*=.9;
   return w;
  }));
 }
 function normalise(w){const m=w.reduce((a,x)=>a+x,0)/w.length;return w.map(x=>x/m);}

 // Pattern factors people favour on a coupon: runs, evenly spaced picks, only birthday numbers.
 function patternFactor(main,n){
  const a=[...main].sort((x,y)=>x-y);let f=1,run=1,best=1;
  for(let i=1;i<a.length;i++){run=a[i]-a[i-1]===1?run+1:1;best=Math.max(best,run);}
  if(best>=3)f*=1.2;
  const gaps=a.slice(1).map((x,i)=>x-a[i]);
  if(a.length>=4&&gaps.every(g=>g===gaps[0]))f*=1.3;
  if(n>31&&a.every(x=>x<=31))f*=1.15;
  return f;
 }
 // Popularity index: geometric mean of number weights, times pattern factor. 1 is a typical random row.
 function rowIndex(main,weights){
  const g=Math.exp(main.reduce((s,x)=>s+Math.log(weights[x-1]),0)/main.length);
  return g*patternFactor(main,weights.length);
 }
 function sampleRow(n,k,random){const p=Array.from({length:n},(_,i)=>i+1);for(let i=0;i<k;i++){const j=i+Math.floor(random()*(n-i)),t=p[i];p[i]=p[j];p[j]=t;}return p.slice(0,k).sort((a,b)=>a-b);}

 // Baseline over random rows: mean index and the 25th percentile used as the selection cut-off.
 function baseline(weights,k,seed=1,samples=4000){
  const random=rng(seed),v=[];
  for(let i=0;i<samples;i++)v.push(rowIndex(sampleRow(weights.length,k,random),weights));
  v.sort((a,b)=>a-b);
  return {mean:v.reduce((a,x)=>a+x,0)/v.length,q25:v[Math.floor(v.length*.25)],q10:v[Math.floor(v.length*.1)]};
 }
 const overlap=(a,b)=>a.filter(x=>b.includes(x)).length;

 // Pick `count` rows from the least popular quartile, preferring rows that overlap each other least.
 function generate(game,weights,count,seed){
  const c=GAMES[game],random=rng(hash(VERSION+'|'+game+'|'+seed)),base=baseline(weights,c.k);
  const pool=[];let guard=0;
  while(pool.length<300&&guard++<200000){const r=sampleRow(c.n,c.k,random),idx=rowIndex(r,weights);if(idx<=base.q25)pool.push({main:r,idx});}
  const rows=[];
  while(rows.length<count&&pool.length){
   let bestI=0,bestScore=Infinity;
   for(let i=0;i<pool.length;i++){
    const worst=rows.length?Math.max(...rows.map(r=>overlap(r.main,pool[i].main))):0;
    const score=worst*10+pool[i].idx;
    if(score<bestScore){bestScore=score;bestI=i;}
   }
   rows.push(pool.splice(bestI,1)[0]);
  }
  return rows.map(r=>({main:r.main,index:r.idx,sharing:r.idx/base.mean,secondary:c.secondary?pickSecondary(c.secondary,random):[]}));
 }
 // Secondary numbers (Viking number, euro numbers): players favour 7, so skip it where a choice exists.
 function pickSecondary(pool,random){
  const take=pool===12?2:1,out=[];
  while(out.length<take){const x=1+Math.floor(random()*pool);if(!out.includes(x)&&!(x===7&&pool>7&&random()<.7))out.push(x);}
  return out.sort((a,b)=>a-b);
 }
 const API={VERSION,GAMES,priorWeights,normalise,patternFactor,rowIndex,baseline,generate,sampleRow,overlap,hash,rng};
 if(typeof module!=='undefined')module.exports=API;else root.LotteryPopularity=API;
})(typeof window!=='undefined'?window:globalThis);
