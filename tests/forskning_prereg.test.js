'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), os = require('os'), path = require('path');
const root = path.join(__dirname, '..');
const P = require(path.join(root, 'scripts/forskning_prereg.js'));
const E = require(path.join(root, 'forskning/engine.js'));

function sandbox() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'prereg-'));
  for (const [data] of Object.values(P.FILES)) { fs.mkdirSync(path.dirname(path.join(d, data)), { recursive: true }); fs.copyFileSync(path.join(root, data), path.join(d, data)); }
  return d;
}
const last = (d, g) => JSON.parse(fs.readFileSync(path.join(d, P.FILES[g][0]), 'utf8')).draws.at(-1).date;

test('next draw dates: Keno daily, Lotto Saturday, EuroJackpot Tue/Fri', () => {
  assert.equal(E.nextDrawDate('keno', '2026-11-05'), '2026-11-06');
  assert.equal(E.nextDrawDate('lotto', '2026-10-31'), '2026-11-07');
  assert.equal(E.nextDrawDate('eurojackpot', '2026-11-03'), '2026-11-06');
  assert.equal(E.nextDrawDate('eurojackpot', '2026-11-06'), '2026-11-10');
});

test('registers before the draw, is idempotent, and chains entries', () => {
  const d = sandbox(), now = new Date('2026-11-06T03:30:00Z');
  const a = P.register('keno', { base: d, now, engine: E });
  assert.equal(a.status, 'REGISTERED'); assert.equal(a.target, '2026-11-06');
  assert.equal(P.register('keno', { base: d, now, engine: E }).status, 'EXISTS');
  const log = JSON.parse(fs.readFileSync(path.join(d, P.FILES.keno[1]), 'utf8'));
  assert.equal(log.entries.length, 1); assert.equal(log.entries[0].prev, P.ZERO);
  assert.equal(log.entries[0].reg.lastDrawInData, last(d, 'keno'));
  assert.deepEqual(log.entries[0].reg.rows, E.buildRows('keno', JSON.parse(fs.readFileSync(path.join(d, P.FILES.keno[0]), 'utf8')).draws, '2026-11-06'));
  assert.ok(P.verifyChain(log.entries).ok);
});

test('refuses stale data and the draw-day deadline', () => {
  const d = sandbox();
  assert.equal(P.register('keno', { base: d, now: new Date('2026-11-09T03:30:00Z'), engine: E }).status, 'STALE');
  assert.equal(P.register('keno', { base: d, now: new Date('2026-11-06T12:30:00Z'), engine: E }).status, 'TOO_LATE'); // 13:30 Oslo
  assert.equal(P.register('keno', { base: d, now: new Date('2026-11-06T10:30:00Z'), engine: E }).status, 'REGISTERED'); // 11:30 Oslo
});

test('tampering with an entry breaks the chain and blocks further registration', () => {
  const d = sandbox(), now = new Date('2026-11-06T03:30:00Z');
  P.register('lotto', { base: d, now, engine: E });
  const lp = path.join(d, P.FILES.lotto[1]), log = JSON.parse(fs.readFileSync(lp, 'utf8'));
  assert.equal(log.entries[0].reg.date, '2026-11-07');
  log.entries[0].reg.rows.numerology.main7 = [1, 2, 3, 4, 5, 6, 7];
  fs.writeFileSync(lp, JSON.stringify(log));
  assert.equal(P.verifyChain(log.entries).ok, false);
  assert.equal(P.register('lotto', { base: d, now, engine: E }).status, 'ERROR');
});

test('EuroJackpot entry has main and stars rows with right sizes', () => {
  const d = sandbox(), r = P.register('eurojackpot', { base: d, now: new Date('2026-11-06T03:30:00Z'), engine: E });
  assert.equal(r.status, 'REGISTERED'); assert.equal(r.target, '2026-11-06');
  const e = JSON.parse(fs.readFileSync(path.join(d, P.FILES.eurojackpot[1]), 'utf8')).entries[0];
  for (const s of E.STRATEGIES) { assert.equal(e.reg.rows[s].main5.length, 5); assert.equal(e.reg.rows[s].stars2.length, 2); }
});

test('a second day chains onto the first', () => {
  const d = sandbox();
  P.register('lotto', { base: d, now: new Date('2026-11-06T03:30:00Z'), engine: E });
  // simulate Saturday draw arriving in data
  const dp = path.join(d, P.FILES.lotto[0]), doc = JSON.parse(fs.readFileSync(dp, 'utf8'));
  doc.draws.push({ date: '2026-11-07', main: [1, 2, 3, 4, 5, 6, 7] }); fs.writeFileSync(dp, JSON.stringify(doc));
  assert.equal(P.register('lotto', { base: d, now: new Date('2026-11-08T03:30:00Z'), engine: E }).target, '2026-11-14');
  const log = JSON.parse(fs.readFileSync(path.join(d, P.FILES.lotto[1]), 'utf8'));
  assert.equal(log.entries.length, 2); assert.equal(log.entries[1].prev, log.entries[0].hash); assert.ok(P.verifyChain(log.entries).ok);
});
