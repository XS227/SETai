'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=fs.existsSync(__dirname+'/experiment-engine.js')?__dirname:path.resolve(__dirname,'../../EuroJackpot'),X=require(dir+'/experiment-engine.js'),E=require(dir+'/engine.js');
let ctx={window:{}};vm.runInNewContext(fs.readFileSync(dir+'/research.js','utf8'),ctx);const data=JSON.parse(JSON.stringify(ctx.window.EJ_RESEARCH));
assert.equal(data.draws.length>=997,true);const rows=data.draws.filter(r=>r.date<='2026-10-09'),counts=X.winnerCounts(rows);assert.deepEqual(counts.map(x=>x.count),[831,145,21,0]);
const last=rows.at(-1);assert.equal(last.jackpotWinningRows,0);assert.equal(last.jackpotTotalPaidEUR,0);assert.equal(last.prizes[0].reportedEUR,120000000);assert.equal(last.prizes[0].paidPerWinningRowEUR,null);assert.equal(last.prizes[1].winningRows,2);assert.equal(last.prizes[1].reportedEUR,11558578.6);assert.equal(last.stakeEUR,89134838);
assert.ok(rows.find(r=>r.date==='2023-01-13').supplementarySource);assert.ok(data.cases.every(c=>c.birthYear===null));assert.equal(data.cases.filter(c=>c.sameBirthday).length,2);
assert.equal(X.amountRoot(120000000),3);assert.throws(()=>X.amountRoot(0));assert.throws(()=>X.amountRoot(12.3));
for(let n=1;n<=50;n++)for(const amount of [1000000,120000000,3071270]){const r=X.combination('1984-01-15','2026-10-13','Åse Karin Steinsland',n,amount);assert.equal(new Set(r.main).size,5);assert.equal(new Set(r.stars).size,2);assert.ok(r.main.every(v=>v>=1&&v<=50));assert.ok(r.stars.every(v=>v>=1&&v<=12));assert.ok(r.main.includes(n));assert.ok(r.reasons.every(v=>v.sources.length));}
for(const date of ['2012-03-23','2020-09-11','2026-10-13']){const s=X.historicalStars([3,11],date);assert.equal(new Set(s).size,2);assert.ok(s.every(n=>n<=E.pool(date)));}
for(const n of [8,10,12]){let sum=0;for(let k=0;k<3;k++)sum+=X.hypergeom(n,2,2,k);assert.ok(Math.abs(sum-1)<1e-12);}
const t=X.backtest(rows,'1984-01-15','','2026-10-13');assert.equal(t.count,997);assert.equal(t.results.length,997);assert.equal(t.simulations,200);assert.ok(Math.abs(t.expected.reduce((s,x)=>s+x,0)-997)<1e-8);assert.ok(t.results.every(r=>r.rowStars.every(n=>n<=E.pool(r.date))));
const combined=X.backtest(rows,'1984-01-15','','2026-10-13','combined',data);assert.equal(combined.count,0);assert.equal(combined.omitted,997);
// A future announcement, or an amount only available after a draw, cannot enter the test.
const d='2026-10-09',late={drawDate:d,amountEUR:120000000,observedAt:'2026-10-09T19:01:00Z'};assert.equal(X.announcementFor({announcedPots:[late]},d),null);
const early={...late,observedAt:'2026-10-09T10:00:00Z'};assert.equal(X.announcementFor({announcedPots:[early]},d).amountEUR,120000000);
console.log('PASS: official 997-draw winner counts, 12-class prize fields, missing-field provenance, numerology rows, historical rules, baseline math, 200 controls, and no payout-to-forecast leakage.');
