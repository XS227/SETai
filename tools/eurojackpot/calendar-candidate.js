'use strict';
// Exploratory candidate. No demonstrated increase in jackpot probability.
const crypto=require('node:crypto');
const VERSION='calendar-dayroot-400-v1';
const root=n=>1+(n-1)%9;
function propose(rows,date){
 const target=new Date(date+'T12:00:00Z');
 if(!Number.isFinite(+target)||target.toISOString().slice(0,10)!==date||![2,5].includes(target.getUTCDay()))throw Error('Invalid draw date');
 const cutoff=new Date(target);cutoff.setUTCDate(cutoff.getUTCDate()-7);
 const cutoffDate=cutoff.toISOString().slice(0,10),prior=rows.filter(r=>r.date<=cutoffDate);
 if(!prior.length)throw Error('No prior history');
 if(date<'2022-03-25')throw Error('Candidate supports current 12-star regime only');
 const wanted=root(target.getUTCDate());
 const out={date,asOf:prior.at(-1).date,cutoffDate,version:VERSION,main:[],stars:[]};
 for(const [field,n,k] of [['main',50,5],['stars',12,2]]){
  const eligible=field==='stars'?prior.filter(r=>r.date>='2022-03-25'):prior;
  const matching=eligible.slice(-400).filter(r=>root(Number(r.date.slice(-2)))===wanted);
  const scored=Array.from({length:n},(_,i)=>{
   const number=i+1,base=eligible.reduce((s,r)=>s+Number(r[field].includes(number)),0)/eligible.length;
   const count=matching.reduce((s,r)=>s+Number(r[field].includes(number)),0);
   const score=(count+20*base)/(matching.length+20);
   const tie=Number(crypto.createHash('sha256').update(`extended-v1|${date}|${field}|${number}`).digest().readBigUInt64BE(0))/2**64;
   return {number,score,tie};
  }).sort((a,b)=>b.score-a.score||b.tie-a.tie);
  out[field]=scored.slice(0,k).map(v=>v.number).sort((a,b)=>a-b);
 }
 return out;
}
module.exports={VERSION,propose};
if(require.main===module){
 const fs=require('node:fs'),vm=require('node:vm'),context={window:{}};
 vm.runInNewContext(fs.readFileSync(process.argv[2],'utf8'),context);
 console.log(JSON.stringify(process.argv.slice(3).map(d=>propose(context.window.EJ_HISTORY.draws,d)),null,2));
}
