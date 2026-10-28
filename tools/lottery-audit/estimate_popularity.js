#!/usr/bin/env node
'use strict';
// Estimates which numbers players over-pick, from winner counts in the official archives, and
// writes LotteryAudit/popularity.json. Usage: node estimate_popularity.js [webroot]
const fs=require('fs'),path=require('path');
const root=process.argv[2]||'/var/www/setai';
const P=require(path.join(root,'LotteryAudit/popularity.js'));
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

function loadEurojackpot(){
 global.window={};new Function('window',read('EuroJackpot/research.js'))(global.window);
 return global.window.EJ_RESEARCH.draws.filter(d=>d.date>='2022-03-25'&&d.stakeEUR).map(d=>({
  date:d.date,main:d.main,stake:d.stakeEUR,tiers:Object.fromEntries(d.prizes.map(p=>[p.rank,p.winningRows]))}));
}
function loadNorsk(file){
 return JSON.parse(read(file)).draws.map(d=>({date:d.date,main:d.main,tiers:Object.fromEntries(d.prizes.map(p=>[p.id,p.winners]))}));
}
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};

// Highest prize tier whose median winner count is large enough to carry little Poisson noise.
function pickTier(draws){
 const ids=Object.keys(draws[0].tiers).map(Number).sort((a,b)=>a-b);
 for(const id of ids)if(median(draws.map(d=>d.tiers[id]||0))>=300)return id;
 return ids.at(-1);
}
// y = log(winners per unit of sales). EuroJackpot reports stakes; for the others, sales is proxied
// by the median winner count of the 25 surrounding draws, which removes jackpot-driven swings.
function response(draws,tier){
 const w=draws.map(d=>Math.max(1,d.tiers[tier]||0));
 return draws.map((d,t)=>{
  if(d.stake)return Math.log(w[t]/d.stake*1e6);
  const near=[];for(let j=Math.max(0,t-12);j<=Math.min(draws.length-1,t+12);j++)if(j!==t)near.push(w[j]);
  return Math.log(w[t]/median(near));
 });
}
function design(draws,n){return draws.map(d=>{const x=Array(n).fill(0);for(const v of d.main)x[v-1]=1;return x;});}

function solve(A,b){
 const n=b.length,M=A.map((r,i)=>[...r,b[i]]);
 for(let c=0;c<n;c++){
  let p=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;
  [M[c],M[p]]=[M[p],M[c]];
  for(let r=c+1;r<n;r++){const f=M[r][c]/M[c][c];for(let j=c;j<=n;j++)M[r][j]-=f*M[c][j];}
 }
 const x=Array(n).fill(0);
 for(let i=n-1;i>=0;i--){let s=M[i][n];for(let j=i+1;j<n;j++)s-=M[i][j]*x[j];x[i]=s/M[i][i];}
 return x;
}
function ridge(X,y,lambda){
 const n=X[0].length,m=y.length,xm=Array(n).fill(0);let ym=0;
 for(let t=0;t<m;t++){ym+=y[t]/m;for(let i=0;i<n;i++)xm[i]+=X[t][i]/m;}
 const A=Array.from({length:n},()=>Array(n).fill(0)),b=Array(n).fill(0);
 for(let t=0;t<m;t++)for(let i=0;i<n;i++){const xi=X[t][i]-xm[i];b[i]+=xi*(y[t]-ym);for(let j=0;j<n;j++)A[i][j]+=xi*(X[t][j]-xm[j]);}
 for(let i=0;i<n;i++)A[i][i]+=lambda;
 const beta=solve(A,b);
 return {beta,predict:x=>ym+x.reduce((s,v,i)=>s+(v-xm[i])*beta[i],0)};
}
const r2=(model,X,y)=>{const m=y.reduce((a,v)=>a+v,0)/y.length;let sse=0,sst=0;y.forEach((v,t)=>{sse+=(v-model.predict(X[t]))**2;sst+=(v-m)**2;});return 1-sse/sst;};
const corr=(a,b)=>{const n=a.length,ma=a.reduce((s,v)=>s+v,0)/n,mb=b.reduce((s,v)=>s+v,0)/n;let c=0,va=0,vb=0;for(let i=0;i<n;i++){c+=(a[i]-ma)*(b[i]-mb);va+=(a[i]-ma)**2;vb+=(b[i]-mb)**2;}return c/Math.sqrt(va*vb);};

function analyse(key,draws){
 const cfg=P.GAMES[key],n=cfg.n,tier=pickTier(draws),y=response(draws,tier),X=design(draws,n),T=draws.length;
 const prior=P.priorWeights(n),score=draws.map(d=>d.main.reduce((s,v)=>s+Math.log(prior[v-1]),0));
 // 1. Does the assumed popularity of the drawn numbers explain winner counts?
 const r=corr(score,y),random=P.rng(P.hash('perm|'+key));let ge=0;const B=5000,sh=[...y];
 for(let b=0;b<B;b++){for(let i=sh.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[sh[i],sh[j]]=[sh[j],sh[i]];}if(corr(score,sh)>=r)ge++;}
 const priorTest={r,p:(1+ge)/(B+1),n:T};
 // 2. Fit ridge on the first 60%, pick lambda on 60-80%, report R2 on the untouched last 20%.
 const a=Math.floor(T*.6),b=Math.floor(T*.8);let best=null;
 for(const lambda of [3,10,30,100,300,1000]){const m=ridge(X.slice(0,a),y.slice(0,a),lambda),v=r2(m,X.slice(a,b),y.slice(a,b));if(!best||v>best.v)best={lambda,v};}
 const holdout=r2(ridge(X.slice(0,b),y.slice(0,b),best.lambda),X.slice(b),y.slice(b));
 const full=ridge(X,y,best.lambda),empirical=P.normalise(full.beta.map(v=>Math.exp(v)));
 const empiricalOk=holdout>0.05;
 const bounded=empirical.map(v=>Math.min(1.6,Math.max(.6,v)));
 const source=empiricalOk?'empirical':priorTest.r>0&&priorTest.p<.05?'prior':'prior-unvalidated';
 return {game:cfg.name,key,draws:T,from:draws[0].date,to:draws.at(-1).date,tier,
  priorTest,empirical:{lambda:best.lambda,holdoutR2:holdout,accepted:empiricalOk,weights:empirical},
  source,priorSupported:priorTest.r>0&&priorTest.p<.05,
  weights:P.normalise(empiricalOk?bounded:prior)};
}

const games={
 lotto:analyse('lotto',loadNorsk('Lotto/history.json')),
 vikinglotto:analyse('vikinglotto',loadNorsk('Vikinglotto/history.json')),
 eurojackpot:analyse('eurojackpot',loadEurojackpot())
};
const out={version:P.VERSION,generatedAt:new Date().toISOString(),games};
fs.writeFileSync(path.join(root,'LotteryAudit/popularity.json'),JSON.stringify(out));
for(const g of Object.values(games))console.log(g.game,'tier',g.tier,'draws',g.draws,'prior r='+g.priorTest.r.toFixed(3),'p='+g.priorTest.p.toFixed(3),'holdout R2='+g.empirical.holdoutR2.toFixed(3),'->',g.source);
