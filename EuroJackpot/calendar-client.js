(function(root){'use strict';
 const VERSION='calendar-dayroot-400-v1',digitRoot=n=>1+(n-1)%9;
 async function proposal(rows,date){
  const t=new Date(date+'T12:00:00Z');if(!Number.isFinite(+t)||t.toISOString().slice(0,10)!==date||date<'2022-03-25'||![2,5].includes(t.getUTCDay()))throw Error('Invalid draw date for the calendar candidate.');
  const cutoff=new Date(t);cutoff.setUTCDate(cutoff.getUTCDate()-7);const cutoffDate=cutoff.toISOString().slice(0,10),prior=rows.filter(r=>r.date<=cutoffDate);if(!prior.length)throw Error('No eligible history.');
  const apiCrypto=root.crypto||globalThis.crypto;if(!apiCrypto?.subtle)throw Error('Secure browser cryptography is unavailable.');
  const wanted=digitRoot(t.getUTCDate()),out={date,asOf:prior.at(-1).date,cutoffDate,version:VERSION,main:[],stars:[]};
  for(const [field,n,k] of [['main',50,5],['stars',12,2]]){
   const eligible=field==='stars'?prior.filter(r=>r.date>='2022-03-25'):prior,matching=eligible.slice(-400).filter(r=>digitRoot(Number(r.date.slice(-2)))===wanted);
   const scored=await Promise.all(Array.from({length:n},async(_,i)=>{
    const number=i+1,base=eligible.filter(r=>r[field].includes(number)).length/eligible.length,count=matching.filter(r=>r[field].includes(number)).length;
    const bytes=await apiCrypto.subtle.digest('SHA-256',new TextEncoder().encode(`extended-v1|${date}|${field}|${number}`));
    return {number,score:(count+20*base)/(matching.length+20),tie:Number(new DataView(bytes).getBigUint64(0))/2**64};
   }));
   out[field]=scored.sort((a,b)=>b.score-a.score||b.tie-a.tie).slice(0,k).map(x=>x.number).sort((a,b)=>a-b);
  }return out;
 }
 const API={VERSION,proposal};if(typeof module!=='undefined')module.exports=API;else root.EJ_CALENDAR=API;
})(typeof window!=='undefined'?window:globalThis);
