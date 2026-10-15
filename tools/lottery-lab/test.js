'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),LAB=require('../../LotteryLab/engine.js'),NUM=require('../../LotteryLab/numerology.js');
const root=process.env.LOTTERY_LAB_ROOT||path.resolve(__dirname,'../..');
for(const [folder,odds,next] of [['Lotto',5379616,['2026-10-17','2026-10-24']],['Vikinglotto',61357560,['2026-10-21','2026-10-28']]]){
 const h=JSON.parse(fs.readFileSync(path.join(root,folder,'history.json'))),c=h.config,allRows=LAB.validate(h.draws,c),rows=allRows.filter(r=>r.date<='2026-10-15'),a=JSON.parse(fs.readFileSync(path.join(root,folder,'analysis.json'))),f=JSON.parse(fs.readFileSync(path.join(root,folder,'forecasts.json'))),model=LAB.fit(rows,c);
 assert.equal(LAB.combinations(c),odds);assert.deepEqual(LAB.nextDates(c,rows,new Date('2026-10-15T04:00:00Z')),next);
 assert.equal(LAB.beforeDeadline(next[0],new Date(next[0]+'T15:59:59Z')),true);assert.equal(LAB.beforeDeadline(next[0],new Date(next[0]+'T16:00:00Z')),false);
 // After the autumn DST change Oslo is UTC+1, not UTC+2.
 assert.equal(LAB.beforeDeadline('2026-10-28',new Date('2026-10-28T16:59:59Z')),true);assert.equal(LAB.beforeDeadline('2026-10-28',new Date('2026-10-28T17:00:00Z')),false);
 assert.throws(()=>LAB.validateLine({main:Array(c.k).fill(1),special:c.special?[1]:[]},c));
 for(const m of ['ai1','ai2','calendar','unseen','sumroot','uniform']){
  const r=LAB.proposal(rows,next[0],c,m,model);LAB.validateLine(r,c);assert.deepEqual(r,LAB.proposal(rows,next[0],c,m));
  const fabricatedFuture={...rows.at(-1),date:next[0],main:Array.from({length:c.k},(_,i)=>c.n-i).sort((a,b)=>a-b)};
  // Target and future results must not affect the earlier registered selection.
  assert.deepEqual(r,LAB.proposal([...rows,fabricatedFuture],next[0],c,m));
  if(m==='unseen')assert.equal(rows.some(x=>x.main.join(',')===r.main.join(',')),false);
  if(m==='sumroot')assert.equal(LAB.reduce(r.main.reduce((a,b)=>a+b,0)),r.targetRoot);
 }
 assert.equal(a.count,allRows.length);assert.equal(a.through,allRows.at(-1).date);
 assert.ok(Math.abs(a.rootNull.reduce((a,b)=>a+b,0)-1)<1e-9);assert.ok(Math.abs(a.totalRootNull.reduce((a,b)=>a+b,0)-1)<1e-9);
 for(const k of ['main','extra','total'])assert.equal(a.roots.reduce((s,r)=>s+r[k],0),allRows.length);
 for(const date of next){const saved=f.forecasts.find(x=>x.date===date);assert.ok(saved);assert.ok(new Date(saved.createdAt)<new Date(date+'T16:00:00Z'));assert.equal(saved.rows.length,6);for(const r of saved.rows){assert.equal(r.asOf,saved.asOf);LAB.validateLine(r,c);}}
 for(const saved of f.forecasts){assert.ok(saved.asOf<saved.date);const prior=allRows.filter(r=>r.date<=saved.asOf),trained=LAB.fit(prior,c);for(const line of saved.rows)assert.deepEqual(line,LAB.proposal(prior,saved.date,c,line.method,trained));}
 for(const birthday of ['1984-11-22','2000-01-01','1999-09-09']){const p=NUM.profile(birthday,next[0],'Khabat'),line=LAB.personal(p,c);LAB.validateLine(line,c);assert.equal(line.reasons.length,c.k);assert.deepEqual(line.main,[...line.reasons.map(r=>r.number)].sort((a,b)=>a-b));assert.equal(p.year,NUM.reduce(NUM.reduce(+birthday.slice(8))+NUM.reduce(+birthday.slice(5,7))+NUM.reduce(2026)));}
 const result=rows.at(-1),same={main:result.main.slice(),special:result.special.slice()};assert.equal(LAB.score(same,result,c).main,c.k);
 if(c.special){assert.equal(LAB.score(same,result,c).special,1);LAB.validateLine({main:[1,2,3,4,5,6],special:[3]},c);}else{const bonusLine={main:[result.bonus[0],...result.main.slice(1)].sort((a,b)=>a-b),special:[]};assert.equal(LAB.score(bonusLine,result,c).main,6);assert.equal(LAB.score(bonusLine,result,c).bonus,1);assert.equal(same.special.length,0);}
 console.log(folder+': valid source, odds, deadlines/DST, deterministic methods, no future-result leakage, roots, ledger and personal mapping');
}
for(const file of ['engine.js','app.js','numerology.js','preview-access.js'])new vm.Script(fs.readFileSync(path.resolve(__dirname,'../../LotteryLab',file),'utf8'),{filename:file});
console.log('All JavaScript parses.');
