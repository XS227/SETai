#!/usr/bin/env node
'use strict';
// "Find the method that would have produced the last 50 draws" experiment.
// For every target draw, each method may use only draws dated at least 7 days earlier plus the target's calendar date.
// Usage: node method_search.js [webroot] [B]
const fs=require('fs'),path=require('path');
const root=process.argv[2]||'/var/www/setai',B=Number(process.argv[3])||300;
const A=require(path.join(root,'LotteryAudit/audit.js'));
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const LAG_DAYS=7,LAST=50;

function loadGames(){
 global.window={};new Function('window',read('EuroJackpot/history.js'))(global.window);
 const nor=f=>JSON.parse(read(f)).draws.map(d=>({date:d.date,main:d.main}));
 return [
  {name:'EuroJackpot 5/50',n:50,k:5,draws:global.window.EJ_HISTORY.draws.map(d=>({date:d.date,main:d.main}))},
  {name:'Lotto 7/34',n:34,k:7,draws:nor('Lotto/history.json')},
  {name:'Vikinglotto 6/48',n:48,k:6,draws:nor('Vikinglotto/history.json')}
 ];
}
const dayNum=s=>Math.floor(Date.parse(s+'T12:00:00Z')/864e5);
const digitSum=x=>String(x).split('').reduce((a,c)=>a+ +c,0);
const root9=x=>1+(x-1)%9;
const mod=(a,n)=>((a%n)+n)%n;

// Prefix counts and last-seen indexes so that any window is O(n).
function prefix(nums,n){
 const T=nums.length,cnt=[new Int32Array(n)],last=[new Int32Array(n).fill(-1)];
 for(let t=0;t<T;t++){
  const c=Int32Array.from(cnt[t]),l=Int32Array.from(last[t]);
  for(const x of nums[t]){c[x-1]++;l[x-1]=t;}
  cnt.push(c);last.push(l);
 }
 return {cnt,last};
}
function topK(score,k){return Array.from(score,(s,i)=>[s,i]).sort((a,b)=>b[0]-a[0]||a[1]-b[1]).slice(0,k).map(x=>x[1]+1);}

// Build the method family. Each method: (ctx)=>k numbers. ctx = {n,k,date,h,prev,pre,nums}.
function buildMethods(n,k){
 const M=[];
 for(const w of [5,10,20,30,50,100,200,0])for(const dir of [1,-1])
  M.push({id:`freq w=${w||'all'} ${dir>0?'hot':'cold'}`,fam:'frequency',fn:c=>{const hi=c.h+1,lo=w?Math.max(0,hi-w):0;return topK(Array.from(c.pre.cnt[hi],(v,i)=>dir*(v-c.pre.cnt[lo][i])),k);}});
 for(const dir of [1,-1])M.push({id:`gap ${dir>0?'overdue':'recent'}`,fam:'gap',fn:c=>topK(Array.from(c.pre.last[c.h+1],l=>dir*(c.h-l)),k)});
 for(const lag of [0,1,2,3])for(let d=-Math.floor(n/2);d<=Math.floor(n/2);d++)
  M.push({id:`shift draw-${lag} by ${d}`,fam:'shift',fn:c=>{const p=c.nums[Math.max(0,c.h-lag)];return p.map(x=>mod(x-1+d,n)+1).filter((v,i,a)=>a.indexOf(v)===i);}});
 const feats={
  day:c=>+c.date.slice(8),month:c=>+c.date.slice(5,7),year:c=>digitSum(c.date.slice(0,4)),dateDigits:c=>digitSum(c.date.replaceAll('-','')),
  dayOfYear:c=>Math.floor((dayNum(c.date)-dayNum(c.date.slice(0,4)+'-01-01'))+1),prevSum:c=>c.prev.reduce((a,b)=>a+b,0),
  prevMax:c=>Math.max(...c.prev),prevMin:c=>Math.min(...c.prev),prevMid:c=>[...c.prev].sort((a,b)=>a-b)[Math.floor(k/2)],
  drawNo:c=>c.h+1,weekday:c=>new Date(c.date+'T12:00:00Z').getUTCDay(),prevDate:c=>digitSum(c.nums.length?c.prevDate:'0')
 };
 for(const [fname,f] of Object.entries(feats))for(let m=1;m<=9;m++)for(let a=1;a<=12;a++)
  M.push({id:`calc ${fname}*${m} step ${a}`,fam:'calculation',fn:c=>{const base=f(c)*m,out=[];for(let j=0;out.length<k&&j<3*k;j++){const x=mod(base+a*j,n)+1;if(!out.includes(x))out.push(x);}return out;}});
 for(const w of [20,50,0])for(const src of ['date','prevSum'])
  M.push({id:`numerology root(${src}) w=${w||'all'}`,fam:'numerology',fn:c=>{
   const r=src==='date'?root9(digitSum(c.date.replaceAll('-',''))):root9(c.prev.reduce((a,b)=>a+b,0)),hi=c.h+1,lo=w?Math.max(0,hi-w):0;
   const s=Array.from(c.pre.cnt[hi],(v,i)=>root9(i+1)===r?v-c.pre.cnt[lo][i]+1e-3:-1e9);return topK(s,k);}});
 return M;
}

// matches[m][j] for the last `count` targets.
function evaluate(nums,dates,n,k,methods,count){
 const T=nums.length,pre=prefix(nums,n),cut=[];
 let u=-1;for(let j=0;j<T;j++){while(u+1<T&&dayNum(dates[u+1])<=dayNum(dates[j])-LAG_DAYS)u++;cut.push(u);}
 const out=methods.map(()=>new Int8Array(count));
 for(let jj=0;jj<count;jj++){
  const j=T-count+jj,h=cut[j];if(h<0)continue;
  const actual=new Set(nums[j]),ctx={n,k,date:dates[j],h,prev:nums[h],prevDate:dates[h].replaceAll('-',''),pre,nums};
  for(let m=0;m<methods.length;m++){let hit=0;for(const x of methods[m].fn(ctx))if(actual.has(x))hit++;out[m][jj]=hit;}
 }
 return out;
}
const sum=(a,from=0,to=a.length)=>{let s=0;for(let i=from;i<to;i++)s+=a[i];return s;};

function runGame(g){
 const {n,k,draws}=g,dates=draws.map(d=>d.date),nums=draws.map(d=>d.main),methods=buildMethods(n,k);
 const mu=k*k/n,sd=Math.sqrt(k*(k/n)*(1-k/n)*((n-k)/(n-1)));
 const M=evaluate(nums,dates,n,k,methods,2*LAST);              // 100 targets: 50 for selection, 50 for test
 // 1. Hindsight: best method over the last 50 draws.
 const tot=M.map(r=>sum(r,LAST)),order=tot.map((v,i)=>i).sort((a,b)=>tot[b]-tot[a]);
 const best=order[0],lastDraw=M.filter(r=>r[2*LAST-1]>=3).length;
 // 2. How good would the best-of-all be by pure luck? Same search on simulated fair archives.
 const random=A.rng(A.hash('method-search|'+g.name)),maxes=[];
 for(let b=0;b<B;b++){
  const simNums=A.simulate(nums.length,n,k,random),m=evaluate(simNums,dates,n,k,methods,LAST);
  maxes.push(Math.max(...m.map(r=>sum(r))));
 }
 maxes.sort((a,b)=>a-b);
 const pBest=(1+maxes.filter(x=>x>=tot[best]).length)/(B+1);
 // 3. Honest tests: choose on earlier draws, score on later ones.
 const trainTot=M.map(r=>sum(r,0,LAST)),chosen=trainTot.indexOf(Math.max(...trainTot));
 const holdout=tot[chosen];
 let walk=0;
 for(let j=LAST;j<2*LAST;j++){let bi=0,bs=-1;for(let m=0;m<methods.length;m++){const s=sum(M[m],j-LAST,j);if(s>bs){bs=s;bi=m;}}walk+=M[bi][j];}
 const z=v=>(v-LAST*mu)/(sd*Math.sqrt(LAST));
 const pz=zz=>0.5*(1-erf(zz/Math.SQRT2));
 return {game:g.name,methods:methods.length,expected:LAST*mu,sdTotal:sd*Math.sqrt(LAST),
  best:{id:methods[best].id,family:methods[best].fam,total:tot[best],top5:order.slice(0,5).map(i=>[methods[i].id,tot[i]])},
  methodsHittingLastDraw3plus:lastDraw,
  luckyBest:{mean:maxes.reduce((a,x)=>a+x,0)/B,p95:maxes[Math.floor(B*.95)],p:pBest},
  holdout:{method:methods[chosen].id,trainTotal:trainTot[chosen],testTotal:holdout,z:z(holdout),p:pz(z(holdout))},
  walkForward:{total:walk,z:z(walk),p:pz(z(walk))}};
}
function erf(x){const t=1/(1+.3275911*Math.abs(x)),y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x);return x>=0?y:-y;}

// Same choose-on-50, test-on-next-50 procedure at every earlier non-overlapping position in the archive.
function rollingHoldouts(g){
 const {n,k}=g,methods=buildMethods(n,k),mu=k*k/n,sd=Math.sqrt(k*(k/n)*(1-k/n)*((n-k)/(n-1))),out=[];
 for(let skip=0;g.draws.length-skip>=LAST*2+LAST;skip+=LAST){
  const d=g.draws.slice(0,g.draws.length-skip),M=evaluate(d.map(x=>x.main),d.map(x=>x.date),n,k,methods,2*LAST);
  const train=M.map(r=>sum(r,0,LAST)),c=train.indexOf(Math.max(...train)),test=sum(M[c],LAST);
  out.push({to:d.at(-1).date,method:methods[c].id,train:train[c],test,z:(test-LAST*mu)/(sd*Math.sqrt(LAST))});
 }
 return out;
}
const results=loadGames().map(g=>({...runGame(g),rolling:rollingHoldouts(g)}));
fs.writeFileSync(path.join(root,'LotteryAudit/method-search.json'),JSON.stringify({generatedAt:new Date().toISOString(),lagDays:LAG_DAYS,targets:LAST,simulations:B,results}));
for(const r of results){
 console.log(`\n${r.game}: ${r.methods} methods, expected by chance ${r.expected.toFixed(1)} ± ${r.sdTotal.toFixed(1)} matches over ${LAST} draws`);
 console.log(`  Best in hindsight: "${r.best.id}" = ${r.best.total} matches (${r.best.family})`);
 console.log(`  Top 5:`,r.best.top5.map(x=>x.join(' = ')).join(' | '));
 console.log(`  Best-of-all on FAIR random draws: mean ${r.luckyBest.mean.toFixed(1)}, 95th pct ${r.luckyBest.p95}; p(real best by luck) = ${r.luckyBest.p.toFixed(3)}`);
 console.log(`  Methods scoring 3+ on the very last draw: ${r.methodsHittingLastDraw3plus} of ${r.methods}`);
 console.log(`  Chosen on earlier 50, scored on later 50: "${r.holdout.method}" train ${r.holdout.trainTotal} -> test ${r.holdout.testTotal} (z=${r.holdout.z.toFixed(2)}, p=${r.holdout.p.toFixed(3)})`);
 const zs=r.rolling.map(x=>x.z);
 console.log(`  Rolling holdouts at ${zs.length} positions: z =`,zs.map(z=>z.toFixed(1)).join(' '),`| mean ${(zs.reduce((a,x)=>a+x,0)/zs.length).toFixed(2)}, share with z>=2.6: ${zs.filter(z=>z>=2.6).length}/${zs.length}`);
 console.log(`  Walk-forward (re-pick best method before every draw): ${r.walkForward.total} (z=${r.walkForward.z.toFixed(2)}, p=${r.walkForward.p.toFixed(3)})`);
}
