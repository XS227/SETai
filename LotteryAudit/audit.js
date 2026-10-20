(function(root){'use strict';
 // Randomness audit for lottery archives. Every p-value comes from a Monte Carlo
 // null: simulated fair draws with the same pool, draw size and length as the archive.
 const VERSION='lottery-audit-v1';
 function hash(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;}
 function rng(seed){let a=seed;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
 function drawK(n,k,random){const pool=Array.from({length:n},(_,i)=>i+1);for(let i=0;i<k;i++){const j=i+Math.floor(random()*(n-i)),t=pool[i];pool[i]=pool[j];pool[j]=t;}return pool.slice(0,k);}
 function simulate(T,n,k,random){return Array.from({length:T},()=>drawK(n,k,random));}

 // Descriptive statistics of one series (list of draws, each an array of k numbers from 1..n).
 function stats(nums,n,k){
  const T=nums.length,counts=Array(n).fill(0);let overlap=0,sum=0,sum2=0;
  for(let t=0;t<T;t++){
   const r=nums[t];let s=0;for(const x of r){counts[x-1]++;s+=x;}
   sum+=s;sum2+=s*s;
   if(t>0){const prev=nums[t-1];for(const x of r)if(prev.includes(x))overlap++;}
  }
  const e=T*k/n;let chi=0;for(const c of counts)chi+=(c-e)*(c-e)/(e*(1-k/n));
  const mean=sum/T;
  return {chi,overlap:T>1?overlap/(T-1):0,sumMean:mean,sumVar:sum2/T-mean*mean};
 }

 // Walk-forward predictors. Each returns probabilities that sum to k, using earlier draws only.
 const MIN_HISTORY=60;
 function makePredictor(kind,n,k){
  const counts=Array(n).fill(0),last=Array(n).fill(-1),win=[];let t=0;const p0=k/n;
  function norm(w){let s=0;for(const v of w)s+=v;return w.map(v=>Math.min(.98,Math.max(.002,v*k/s)));}
  return {
   predict(){
    if(kind==='freq')return norm(counts.map(c=>(c+30*p0)/(t+30)));
    if(kind==='recent'){const w=Array(n).fill(0);for(const r of win)for(const x of r)w[x-1]++;return norm(w.map(c=>(c+10*p0)/(win.length+10)));}
    return norm(last.map(l=>{const gap=l<0?t:t-1-l;return p0*(1+.3*Math.max(-1,Math.min(3,gap*p0-1)));}));
   },
   update(r){for(const x of r){counts[x-1]++;last[x-1]=t;}win.push(r);if(win.length>50)win.shift();t++;}
  };
 }
 function logLossImprovement(nums,n,k,kind){
  const pred=makePredictor(kind,n,k),p0=k/n,base=-(p0*Math.log(p0)+(1-p0)*Math.log(1-p0));
  let total=0,m=0;
  for(let t=0;t<nums.length;t++){
   if(t>=MIN_HISTORY){
    const p=pred.predict(),hit=new Set(nums[t]);let loss=0;
    for(let i=0;i<n;i++)loss-=hit.has(i+1)?Math.log(p[i]):Math.log(1-p[i]);
    total+=base-loss/n;m++;
   }
   pred.update(nums[t]);
  }
  return m?total/m:0;
 }
 const PREDICTORS=[['freq','Long-run frequency'],['recent','Last 50 draws (hot numbers)'],['due','Overdue numbers (gap)']];

 const TESTS=[
  {id:'chi',label:'Number frequencies are uniform',sided:'high',about:'Chi-square on how often each number was drawn.'},
  {id:'overlap',label:'No memory between consecutive draws',sided:'both',about:'Average count of numbers repeated from the previous draw.'},
  {id:'sumMean',label:'Draw sums centred as expected',sided:'both',about:'Mean of the sum of the drawn numbers.'},
  {id:'sumVar',label:'Draw sums spread as expected',sided:'both',about:'Variance of the sum of the drawn numbers.'}
 ];
 function pValue(obs,sims,sided){
  const B=sims.length,ge=sims.filter(x=>x>=obs).length,le=sims.filter(x=>x<=obs).length;
  if(sided==='high')return (1+ge)/(B+1);
  return Math.min(1,2*Math.min((1+ge)/(B+1),(1+le)/(B+1)));
 }
 function holm(ps){
  const idx=ps.map((p,i)=>[p,i]).sort((a,b)=>a[0]-b[0]),out=Array(ps.length);let run=0;
  idx.forEach(([p,i],r)=>{run=Math.max(run,Math.min(1,p*(ps.length-r)));out[i]=run;});
  return out;
 }

 // series: {game, name, n, k, nums}. Returns raw tests; correction is applied across the whole audit.
 function auditSeries(series,opts={}){
  const B=opts.B||1000,Bwf=opts.Bwf||150,{n,k,nums}=series,T=nums.length;
  const random=rng(hash(VERSION+'|'+series.game+'|'+series.name+'|'+T));
  const obs=stats(nums,n,k),sims={chi:[],overlap:[],sumMean:[],sumVar:[]};
  for(let b=0;b<B;b++){const s=stats(simulate(T,n,k,random),n,k);for(const key in sims)sims[key].push(s[key]);}
  const tests=TESTS.map(d=>({id:d.id,label:d.label,about:d.about,observed:obs[d.id],nullMean:sims[d.id].reduce((a,x)=>a+x,0)/B,p:pValue(obs[d.id],sims[d.id],d.sided)}));
  if(T>MIN_HISTORY+40){
   for(const [kind,label] of PREDICTORS){
    const o=logLossImprovement(nums,n,k,kind),null_=[];
    for(let b=0;b<Bwf;b++)null_.push(logLossImprovement(simulate(T,n,k,random),n,k,kind));
    tests.push({id:'wf-'+kind,label:'Strategy: '+label,about:'Walk-forward log-loss improvement over a flat guess (positive = better than random).',observed:o,nullMean:null_.reduce((a,x)=>a+x,0)/Bwf,p:pValue(o,null_,'high'),perDraw:true});
   }
  }
  return {game:series.game,name:series.name,n,k,draws:T,from:series.from||null,to:series.to||null,tests};
 }
 // Combine results of all series and apply Holm correction across every test.
 function summarise(results){
  const all=[];for(const r of results)for(const t of r.tests)all.push(t);
  const adj=holm(all.map(t=>t.p));all.forEach((t,i)=>{t.pAdj=adj[i];});
  const raw=all.filter(t=>t.p<.05).length,corrected=all.filter(t=>t.pAdj<.05).length;
  return {tests:all.length,expectedByChance:all.length*.05,rawSignificant:raw,correctedSignificant:corrected,
   verdict:corrected===0?'No test survives multiple-testing correction. The archives are consistent with fair, independent draws and no strategy beats a flat guess.':'At least one test survives correction. Check the data source and rules before drawing conclusions.'};
 }
 const API={VERSION,hash,rng,drawK,simulate,stats,logLossImprovement,auditSeries,summarise,holm,pValue,TESTS,PREDICTORS};
 if(typeof module!=='undefined')module.exports=API;else root.LotteryAudit=API;
})(typeof window!=='undefined'?window:globalThis);
