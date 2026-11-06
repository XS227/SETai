#!/usr/bin/env node
'use strict';
/* SETAEI Forskning: pre-registration log (append-only, hash-chained).
 * Each run registers the rows for the NEXT draw of each game BEFORE it happens, using only past data.
 * An entry is immutable: entry.hash = sha256(prev + "\n" + JSON.stringify(entry.reg)).
 * The scoring is done afterwards (in the page / by score()), never by editing an entry. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const DEADLINE_HOUR_OSLO = 12; // nothing is registered for a draw day after 12:00 Oslo time
const ZERO = '0'.repeat(64);
const FILES = {
  keno: ['Keno/draws.json', 'Keno/preregistered.json'],
  lotto: ['forskning/data/lotto.json', 'forskning/data/lotto-prereg.json'],
  eurojackpot: ['forskning/data/eurojackpot.json', 'forskning/data/eurojackpot-prereg.json'],
};
const PROTOCOL = {
  version: 1,
  text: 'Radene lagres før trekningen og kan ikke endres: hver oppføring er koblet til forrige med en SHA-256-kjede. '
    + 'Treff telles mot hypergeometrisk forventning. Primær hypotese (én test, α = 0,05, tosidig): '
    + 'numerologi etter dato gir flere treff enn tilfeldighet på det høyeste nivået (Keno nivå 10, Lotto 7 av 7, EuroJackpot 5 hovedtall). '
    + 'Alt annet er utforskende og vurderes med Holm-korreksjon over hele familien. Ingen oppføringer slettes eller omskrives.',
  primary: { keno: ['numerology', 'k10'], lotto: ['numerology', 'main7'], eurojackpot: ['numerology', 'main5'] },
};

function sha(prev, reg) { return crypto.createHash('sha256').update(prev + '\n' + JSON.stringify(reg)).digest('hex'); }

function verifyChain(entries) {
  let prev = ZERO;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.prev !== prev || e.hash !== sha(prev, e.reg)) return { ok: false, brokenAt: i };
    if (i && entries[i - 1].reg.date >= e.reg.date) return { ok: false, brokenAt: i, reason: 'dates out of order' };
    prev = e.hash;
  }
  return { ok: true, length: entries.length, head: prev };
}

function osloNow(now) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(now).reduce((o, x) => (o[x.type] = x.value, o), {});
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}

/* Returns {status, ...}. Pure apart from reading/writing the two files under `base`. */
function register(game, { base, now, engine, dryRun }) {
  const [dataRel, logRel] = FILES[game], dataPath = path.join(base, dataRel), logPath = path.join(base, logRel);
  const draws = JSON.parse(fs.readFileSync(dataPath, 'utf8')).draws;
  const last = draws[draws.length - 1].date, target = engine.nextDrawDate(game, last), t = osloNow(now);
  let log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8'))
    : { game, protocol: PROTOCOL, entries: [] };
  const chain = verifyChain(log.entries);
  if (!chain.ok) return { status: 'ERROR', game, reason: 'hash chain broken at ' + chain.brokenAt };
  if (log.entries.some((e) => e.reg.date === target)) return { status: 'EXISTS', game, target };
  if (log.entries.length && log.entries[log.entries.length - 1].reg.date > target) return { status: 'ERROR', game, reason: 'target older than newest entry' };
  if (target < t.date) return { status: 'STALE', game, target, last, reason: `data ends ${last}; draw ${target} already happened, not registered` };
  if (target === t.date && t.hour >= DEADLINE_HOUR_OSLO) return { status: 'TOO_LATE', game, target, reason: `after ${DEADLINE_HOUR_OSLO}:00 Oslo on the draw day` };
  const reg = {
    game, date: target, registeredAt: now.toISOString(), lastDrawInData: last, engine: engine.VERSION,
    rows: engine.buildRows(game, draws, target),
  };
  const entry = { reg, prev: chain.head || ZERO, hash: sha(chain.head || ZERO, reg) };
  if (!dryRun) {
    log.entries.push(entry);
    const tmp = logPath + '.tmp';
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(log), 'utf8');
    fs.renameSync(tmp, logPath);
  }
  return { status: 'REGISTERED', game, target, hash: entry.hash };
}

function main(argv) {
  const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
  const base = path.resolve(arg('base', path.join(__dirname, '..')));
  const engine = require(path.resolve(arg('engine', path.join(base, 'forskning/engine.js'))));
  const now = arg('now') ? new Date(arg('now')) : new Date();
  const games = arg('game', 'all') === 'all' ? Object.keys(FILES) : [arg('game')];
  let bad = 0;
  for (const g of games) {
    let r; try { r = register(g, { base, now, engine, dryRun: argv.includes('--dry-run') }); } catch (e) { r = { status: 'ERROR', game: g, reason: e.message }; }
    console.log(JSON.stringify(r));
    if (r.status === 'ERROR' || r.status === 'STALE') bad = 1;
  }
  process.exitCode = bad;
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { register, verifyChain, sha, ZERO, PROTOCOL, FILES };
