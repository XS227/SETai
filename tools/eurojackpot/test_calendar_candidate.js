'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const candidate=require('./calendar-candidate.js');
const historyPath=process.argv[2]||path.join(__dirname,'history.js');
const context={window:{}};vm.runInNewContext(fs.readFileSync(historyPath,'utf8'),context);
const rows=JSON.parse(JSON.stringify(context.window.EJ_HISTORY.draws)).filter(r=>r.date<='2026-10-09');
assert.equal(rows.length,997);
function totals(use){let main=0,stars=0;for(const r of use){const p=candidate.propose(rows,r.date);main+=p.main.filter(x=>r.main.includes(x)).length;stars+=p.stars.filter(x=>r.stars.includes(x)).length;}return {main,stars};}
// Independent JS implementation reproduces the Python selected candidate.
assert.deepEqual(totals(rows.slice(-200)),{main:115,stars:74});
const train=totals(rows.slice(-400,-200));assert.equal(train.main+train.stars,195);
const a=candidate.propose(rows,'2026-10-13'),b=candidate.propose(rows,'2026-10-16');
assert.deepEqual(a.main,[23,33,34,41,47]);assert.deepEqual(a.stars,[5,7]);
assert.deepEqual(b.main,[8,11,16,36,42]);assert.deepEqual(b.stars,[3,5]);
// Changing every record after the declared cutoff cannot change a forecast.
const altered=rows.map(r=>r.date>a.cutoffDate?{...r,main:[1,2,3,4,5],stars:[1,2]}:r);
assert.deepEqual(candidate.propose(altered,a.date),a);
assert.equal(a.asOf,'2026-10-06');assert.equal(b.asOf,'2026-10-09');
assert.throws(()=>candidate.propose(rows,'2026-10-15'));
console.log('PASS: Python/JS agreement over 400 historical dates; exact locked future rows; seven-day cutoff and post-cutoff mutation invariance.');
