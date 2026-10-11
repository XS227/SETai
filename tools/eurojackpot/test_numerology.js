'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=fs.existsSync(__dirname+'/numerology.js')?__dirname:path.resolve(__dirname,'../../EuroJackpot'),N=require(dir+'/numerology.js');
assert.equal(N.reduce(1984,true),22);assert.equal(N.reduce(22),4);assert.equal(N.reduce(33,true),33);
assert.deepEqual([N.profile('1984-01-15','2026-10-13').year,N.profile('1984-01-15','2026-10-13').month,N.profile('1984-01-15','2026-10-13').day,N.profile('1984-01-15','2026-10-13').life],[8,9,4,11]);
const tuesday=N.row('1984-01-15','2026-10-13'),friday=N.row('1984-01-15','2026-10-16');
assert.deepEqual(tuesday.main,[4,8,9,11,15]);assert.deepEqual(tuesday.stars,[4,11]);assert.equal(friday.profile.day,7);assert.notDeepEqual(tuesday.main,friday.main);
assert.deepEqual(tuesday,N.row('1984-01-15','2026-10-13'));
for(const invalid of ['2026-02-30','2025-02-29','0000-01-01','bad','1984-1-1'])assert.throws(()=>N.parseDate(invalid));
assert.throws(()=>N.row('2027-01-01','2026-10-13'));assert.throws(()=>N.profile('1984-01-15','2026-10-13','X'.repeat(201)));
assert.equal(N.nameNumber('Æ Ø Å'),3);assert.equal(N.nameNumber('Åse'),8);assert.equal(N.nameNumber('Yale','vowels'),6);assert.equal(N.nameNumber('Yale','consonants'),1);assert.equal(N.nameNumber('Byron','vowels'),4);
assert.equal(N.nameNumber('Jean-Luc'),N.nameNumber('JeanLuc'));assert.equal(N.nameNumber('فارسی'),0);
// Sweep many dates and names, including repeated core numbers and master numbers.
for(let year=1940;year<=2010;year+=2)for(let month=1;month<=12;month++)for(const day of [1,11,22,28]){
 const date=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
 for(const name of ['', 'Åse Karin Steinsland','Yvonne Yngve']){
  const r=N.row(date,'2026-10-13',name);assert.equal(r.main.length,5);assert.equal(r.stars.length,2);assert.equal(new Set(r.main).size,5);assert.equal(new Set(r.stars).size,2);
  assert.ok(r.main.every(n=>Number.isInteger(n)&&n>=1&&n<=50));assert.ok(r.stars.every(n=>Number.isInteger(n)&&n>=1&&n<=12));
  for(const c of [r.profile.year,r.profile.month,r.profile.day])assert.ok(r.main.includes(c),'Personal cycles remain present even when some are equal');
  assert.ok(r.reasons.every(x=>x.sources.length));assert.ok(r.starReasons.every(x=>x.sources.length));
 }
}
console.log('PASS: numerology cycles, master numbers, Norwegian letters/Y rule, date changes, collisions, valid explained 5+2 rows, and input validation.');
