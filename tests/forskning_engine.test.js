'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const E = require(path.join(root, 'forskning/engine.js'));
const NEW = require(path.join(root, 'Keno/numerology.js'));
const OLD = require('./fixtures/keno-numerology-v1.frozen.js');
const keno = JSON.parse(fs.readFileSync(path.join(root, 'Keno/draws.json'), 'utf8')).draws;

test('Keno numerology wrapper is identical to frozen v1 (all dates, k 2..10, with/without birth)', () => {
  for (const d of keno) for (let k = 2; k <= 10; k++) {
    assert.deepEqual(NEW.row(d.date, k), OLD.row(d.date, k), d.date + ' k' + k);
    if (k % 4 === 2) assert.deepEqual(NEW.row(d.date, k, '1980-05-17'), OLD.row(d.date, k, '1980-05-17'));
  }
});

// Reference implementations copied from the pre-refactor Keno/app.js
const ref = {
  hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0},
  rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}},
};
function refRandom(key,k){const r=ref.rng(ref.hash(key)),a=[];for(let i=1;i<=70;i++)a.push(i);for(let i=0;i<k;i++){const j=i+Math.floor(r()*(70-i));[a[i],a[j]]=[a[j],a[i]]}return a.slice(0,k).sort((x,y)=>x-y)}
function refCounts(ds){const c=new Array(71).fill(0);ds.forEach(d=>d.numbers.forEach(n=>c[n]++));return c}
function refHot(archive,k,lb){const c=refCounts(archive.slice(-lb)),n=[];for(let i=1;i<=70;i++)n.push(i);return n.sort((a,b)=>c[b]-c[a]||a-b).slice(0,k).sort((a,b)=>a-b)}
function refGap(archive,k){const g=new Array(71).fill(archive.length);for(let i=archive.length-1;i>=0;i--)archive[i].numbers.forEach(n=>{if(g[n]===archive.length)g[n]=archive.length-1-i});const n=[];for(let i=1;i<=70;i++)n.push(i);return n.sort((a,b)=>g[b]-g[a]||a-b).slice(0,k).sort((a,b)=>a-b)}

test('shared random/hot/gap rows match the old Keno page logic', () => {
  for (let i = 400; i < keno.length; i += 97) {
    const past = keno.slice(0, i), arr = past.map(d => d.numbers), date = keno[i].date;
    for (const k of [2, 5, 10]) {
      assert.deepEqual(E.randomRow('ctrl' + date, k, 70), refRandom('ctrl' + date, k));
      assert.deepEqual(E.hotRow(arr, k, 90, 70), refHot(past, k, 90));
      assert.deepEqual(E.gapRow(arr, k, 70), refGap(past, k));
    }
  }
});

test('buildRows uses only draws before the target date and is deterministic', () => {
  const iso = '2026-11-07', a = E.buildRows('keno', keno, iso), b = E.buildRows('keno', keno.concat([{date: '2026-12-01', numbers: keno[0].numbers}]), iso);
  assert.deepEqual(a, b);
  for (const s of E.STRATEGIES) for (let k = 2; k <= 10; k++) {
    const r = a[s]['k' + k]; assert.equal(r.length, k); assert.equal(new Set(r).size, k); assert.ok(r.every(n => n >= 1 && n <= 70));
  }
});

test('numerology rows are valid for Lotto (34) and EuroJackpot (50 + 12)', () => {
  const L = E.numerology(34, 'x'), M = E.numerology(50, 'x'), S = E.numerology(12, 'x');
  for (let y = 2016; y <= 2026; y++) for (let m = 1; m <= 12; m++) for (const d of [1, 9, 17, 28]) {
    const iso = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const l = L.row(iso, 7).numbers, mm = M.row(iso, 5).numbers, ss = S.row(iso, 2).numbers;
    assert.equal(new Set(l).size, 7); assert.ok(l.every(n => n >= 1 && n <= 34));
    assert.equal(new Set(mm).size, 5); assert.ok(mm.every(n => n >= 1 && n <= 50));
    assert.equal(new Set(ss).size, 2); assert.ok(ss.every(n => n >= 1 && n <= 12));
  }
});

test('Holm: known example and monotone, capped at 1', () => {
  const adj = E.holm([0.01, 0.04, 0.03, 0.005]);
  // sorted: .005*4=.02, .01*3=.03, .03*2=.06, .04*1=.04 -> running max .02,.03,.06,.06
  assert.deepEqual(adj.map(x => +x.toFixed(4)), [0.03, 0.06, 0.06, 0.02]);
  assert.equal(E.holm([0.9, 0.8])[0], 1);
});

test('hypergeometric moments: Keno level 10 expectation 2.857', () => {
  const st = E.hyper({k: 10, pool: 70, drawn: 20});
  assert.ok(Math.abs(st.e - 2.857142857) < 1e-6);
  assert.ok(Math.abs(st.v - 10 * (2/7) * (5/7) * 60 / 69) < 1e-9);
});

test('scoreEntries: hand-checkable hits', () => {
  const draws = [{date: '2026-01-01', numbers: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]}];
  const entries = [{reg: {date: '2026-01-01', rows: {numerology: {k2: [1, 70]}, hot: {k2: [1, 2]}, gap: {k2: [60, 70]}, random: {k2: [3, 71 - 1]}, fixed: {k2: [1, 2]}}}}];
  const cells = E.scoreEntries('keno', entries, draws);
  const get = (s) => cells.find(c => c.strategy === s && c.slot === 'k2');
  assert.equal(get('numerology').mean, 1); assert.equal(get('hot').mean, 2); assert.equal(get('gap').mean, 0);
});

test('backtestAll runs on real Keno data, Holm >= raw p, family size 81', () => {
  const cells = E.backtestAll('keno', keno, 'all');
  assert.equal(cells.length, 9 * (3 + 3 + 3)); // 9 levels × (numerology, random, fixed + 3 hot + 3 cold)
  for (const c of cells) { assert.ok(c.holm >= c.p - 1e-12); assert.ok(c.n > 4000); }
});
