'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
if(!globalThis.crypto)Object.defineProperty(globalThis,'crypto',{value:crypto.webcrypto});
const dir=path.resolve(process.argv[2]||'EuroJackpot'),read=(n,p='')=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8').trim().slice(p.length).replace(/;$/,'')),E=require(path.join(dir,'engine.js')),T=require(path.join(dir,'ticket-engine.js'));
const h=E.validate(read('history.js','window.EJ_HISTORY=').draws),f=read('proposals.js','window.EJ_PROPOSALS='),c=read('comparison-forecasts.json'),report=read('review-20261020.json');
assert.deepEqual(report.draw.main,[5,16,32,34,38]);assert.deepEqual(report.draw.stars,[8,9]);
const ai=report.lines.filter(l=>l.method.startsWith('AI selection'));assert.deepEqual(ai.map(l=>l.hits.category),['1+1','0+0']);assert.deepEqual(ai.map(l=>l.hits.grossEUR),[0,0]);assert.equal(report.modelAsOf,'2026-10-13');assert.equal(report.retrospective.methods.length,5);
for(const m of report.retrospective.methods){assert.equal(m.count,200);assert.ok(m.to<'2026-10-20');assert.equal(m.jackpots,0);assert.ok(m.current.asOf===undefined||m.current.asOf<'2026-10-20');}
for(const f of report.registeredForwardResults)assert.ok(f.registeredAt&&f.evidence!=='Reconstructed');
const saved=c.forecasts.find(f=>f.date==='2026-10-23');assert.ok(saved);assert.equal(saved.asOf,'2026-10-20');assert.equal(saved.rows.length,2);assert.equal(E.deadlineStatus(saved.date,new Date(saved.createdAt)),'Norwegian ticket deadline: 19:00');
const seed=crypto.createHash('sha256').update(c.version+'|'+saved.date+'|'+saved.entropy).digest().readUInt32LE(0);assert.equal(seed,saved.seed);
const random=E.rng(seed),used=new Set(f.forecasts.filter(x=>x.date===saved.date).flatMap(x=>x.rows.map(r=>r.main.join(',')+'|'+r.stars.join(',')))),reproduced=[];
while(reproduced.length<2){const r={date:saved.date,main:E.sample(Array(50).fill(1),5,random),stars:E.sample(Array(12).fill(1),2,random)},key=r.main.join(',')+'|'+r.stars.join(',');if(!used.has(key)){used.add(key);reproduced.push(r);}}
assert.deepEqual(reproduced,saved.rows);
(async()=>{
 const target='2026-10-23',rows=await T.compile(T.defaults(),target,h,E.fit(h),{},{proposals:f,comparisons:c,calendar:read('kandidat-20261012.json')});
 const shown=T.displayOrder(rows);assert.equal(shown.filter(l=>l.kind==='comparison'&&l.row).length,2);assert.ok(shown.findIndex(l=>!l.row)>=6);
 for(let i=0;i<2;i++){const original=f.forecasts.find(r=>r.date===target&&r.mode==='model').rows[i];assert.deepEqual(rows.find(l=>l.kind==='ai'&&l.title==='AI selection '+(i+1)).row,original);assert.deepEqual(rows.find(l=>l.kind==='comparison'&&l.title.endsWith(String(i+1))).row,saved.rows[i]);}
 for(const n of ['index.html','results.html','review-20261020.html']){const html=fs.readFileSync(path.join(dir,n),'utf8');assert.ok(html.includes('data-preview-locked'));assert.ok(html.includes('preview-access.js'));assert.ok(html.includes('2026-10-20'));assert.ok(html.includes('review-20261020'));assert.ok(!html.includes('through undefined'));}
 console.log('PASS: official result and no prizes; 200 earlier-draw replays; original AI records preserved; new uniform seed replay, pool bounds, duplicate rejection and ticket integration; gated result pages.');
})().catch(e=>{console.error(e);process.exitCode=1;});
