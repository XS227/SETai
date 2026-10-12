'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path'),dataDir=fs.existsSync(__dirname+'/history.js')?__dirname:path.resolve(__dirname,'../../EuroJackpot');
const EJ=require(dataDir+'/engine.js');const ctx={window:{}};vm.runInNewContext(fs.readFileSync(dataDir+'/history.js','utf8'),ctx);const rows=EJ.validate(JSON.parse(JSON.stringify(ctx.window.EJ_HISTORY.draws))).filter(r=>r.date<='2026-10-09');
assert.equal(rows.length,997);assert.equal(rows[0].date,'2012-03-23');assert.deepEqual(rows.at(-1),{date:'2026-10-09',main:[18,38,41,43,46],stars:[7,10]});
assert.equal(EJ.combinations,139838160);assert.equal(EJ.odds(5,2),1/139838160);
let sum=0;for(let m=0;m<=5;m++)for(let s=0;s<=2;s++)sum+=EJ.odds(m,s);assert.ok(Math.abs(sum-1)<1e-12);
assert.deepEqual(EJ.nextDates(new Date('2026-10-11T23:04:31Z'),rows),['2026-10-13','2026-10-16']);
assert.deepEqual(EJ.nextDates(new Date('2026-10-13T18:01:00Z'),rows),['2026-10-13','2026-10-16']);
assert.deepEqual(EJ.nextDates(new Date('2026-10-13T22:01:00Z'),rows),['2026-10-16','2026-10-20']);
assert.deepEqual(EJ.nextDates(new Date('2026-10-13T18:01:00Z'),rows.concat({date:'2026-10-13'})),['2026-10-16','2026-10-20']);
assert.equal(EJ.deadlineStatus('2026-10-13',new Date('2026-10-13T16:59:59Z')),'Norwegian ticket deadline: 19:00');
assert.equal(EJ.deadlineStatus('2026-10-13',new Date('2026-10-13T17:00:00Z')),'Norwegian ticket deadline has passed');
assert.equal(EJ.deadlineStatus('2026-10-27',new Date('2026-10-27T17:59:59Z')),'Norwegian ticket deadline: 19:00');
assert.equal(EJ.deadlineStatus('2026-10-27',new Date('2026-10-27T18:00:00Z')),'Norwegian ticket deadline has passed');
assert.equal(EJ.pool('2014-10-03'),8);assert.equal(EJ.pool('2014-10-10'),10);assert.equal(EJ.pool('2022-03-18'),10);assert.equal(EJ.pool('2022-03-25'),12);
assert.throws(()=>EJ.validate([{date:'2026-10-09',main:[1,1,2,3,4],stars:[1,2]}]));
assert.throws(()=>EJ.validate([{date:'2026-10-08',main:[1,2,3,4,5],stars:[1,2]}]));
const model=EJ.fit(rows);assert.equal(model.evaluation.count,200);assert.equal(model.evaluation.from,'2024-11-12');
assert.ok(Math.abs(model.main.reduce((a,x)=>a+x,0)-5)<1e-9);assert.ok(Math.abs(model.stars.reduce((a,x)=>a+x,0)-2)<1e-9);
for(const p of [...model.main,...model.stars])assert.ok(p>0&&p<1);
for(const mode of ['model','uniform'])for(let v=0;v<100;v++){
 const p=EJ.proposal(rows,'2026-10-13',mode,v,model);assert.equal(new Set(p.main).size,5);assert.equal(new Set(p.stars).size,2);assert.ok(p.main.every(x=>x>=1&&x<=50));assert.ok(p.stars.every(x=>x>=1&&x<=12));assert.equal(p.asOf,'2026-10-09');assert.equal(p.chance,1/EJ.combinations);
}
// A later draw must not affect a proposal calculated for an earlier date.
const earlier=rows.slice(0,500),date=rows[500].date;
assert.deepEqual(EJ.proposal(earlier,date,'model'),EJ.proposal(rows,date,'model'));
const f=EJ.frequency(rows,'stars');assert.equal(f[10].eligible,rows.filter(r=>r.date>='2022-03-25').length);assert.equal(f[0].eligible,997);
assert.ok(f[10].expected<f[0].expected);
console.log('PASS: exact odds, complete data, schedule/DST, rule changes, valid proposals, no future-data use, and exposure-adjusted frequencies.');
console.log(JSON.stringify(model.evaluation));
