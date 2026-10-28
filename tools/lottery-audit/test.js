#!/usr/bin/env node
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=process.argv[2]||'/var/www/setai';
const A=require(path.join(root,'LotteryAudit/audit.js')),P=require(path.join(root,'LotteryAudit/popularity.js'));

// Calibration: on genuinely fair simulated archives, about 5% of raw p-values must fall below 0.05.
{
 const random=A.rng(7);let low=0,total=0;
 for(let run=0;run<40;run++){
  const r=A.auditSeries({game:'sim'+run,name:'main',n:34,k:7,nums:A.simulate(300,34,7,random)},{B:200,Bwf:40});
  for(const t of r.tests){total++;if(t.p<.05)low++;assert(t.p>0&&t.p<=1,'p in (0,1]');}
 }
 const rate=low/total;console.log('false-positive rate on fair data:',rate.toFixed(3),'of',total);
 assert(rate<.12,'false-positive rate too high');
}
// Power: a rigged archive must be caught.
{
 const random=A.rng(9),nums=A.simulate(300,34,7,random).map(r=>random()<.3?[1,2,3,4,5,6,7]:r);
 const r=A.auditSeries({game:'rigged',name:'main',n:34,k:7,nums},{B:200,Bwf:40});
 assert(r.tests.find(t=>t.id==='chi').p<.01,'rigged frequencies must be detected');
 console.log('rigged archive detected, chi p =',r.tests.find(t=>t.id==='chi').p.toFixed(4));
}
assert.deepStrictEqual(A.holm([.01,.04,.03]).map(x=>+x.toFixed(2)),[.03,.06,.06]);

// Popularity generator.
for(const [key,c] of Object.entries(P.GAMES)){
 const w=P.priorWeights(c.n),rows=P.generate(key,w,6,'test');
 assert.strictEqual(rows.length,6);
 const base=P.baseline(w,c.k);
 for(const r of rows){
  assert.strictEqual(r.main.length,c.k);assert.strictEqual(new Set(r.main).size,c.k);
  assert(r.main.every(x=>x>=1&&x<=c.n),'range');assert(r.index<=base.q25+1e-9,'low-popularity quartile');
  assert.strictEqual(r.secondary.length,key==='eurojackpot'?2:key==='vikinglotto'?1:0);
 }
 assert.deepStrictEqual(rows.map(r=>r.main),P.generate(key,w,6,'test').map(r=>r.main),'deterministic per seed');
 console.log(c.name,'mean sharing of generated rows:',(rows.reduce((a,r)=>a+r.sharing,0)/rows.length).toFixed(2));
}
const pop=JSON.parse(fs.readFileSync(path.join(root,'LotteryAudit/popularity.json'),'utf8'));
for(const [key,g] of Object.entries(pop.games)){
 assert.strictEqual(g.weights.length,P.GAMES[key].n);
 assert(Math.abs(g.weights.reduce((a,x)=>a+x,0)/g.weights.length-1)<1e-9,'weights mean 1');
}
console.log('lottery-audit tests passed');
