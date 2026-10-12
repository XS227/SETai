(function(root){
 'use strict';
 const E=typeof module!=='undefined'?require('./engine.js'):root.EJ;
 const VERSION='unseen-main-and-full-v1';
 const key=nums=>[...nums].sort((a,b)=>a-b).join(',');
 function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
 function proposal(rows,date){
  const d=new Date(date+'T12:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(+d)||d.toISOString().slice(0,10)!==date||![2,5].includes(d.getUTCDay()))throw Error('Ugyldig trekningsdato.');
  const prior=rows.filter(r=>r.date<date);
  if(!prior.length)throw Error('Ingen historikk før denne datoen.');
  const mainSeen=new Set(prior.map(r=>key(r.main))),fullSeen=new Set(prior.map(r=>key(r.main)+'|'+key(r.stars))),n=E.pool(date);
  const mainTotal=E.choose(50,5),starTotal=E.choose(n,2),asOf=prior.at(-1).date;
  if(mainSeen.size>=mainTotal)throw Error('Ingen ubrukte hovedtallsett gjenstår.');
  const random=E.rng(hash(VERSION+'|'+date+'|'+asOf+'|'+prior.length));
  for(let attempt=1;attempt<=10000;attempt++){
   const main=E.sample(Array(50).fill(1),5,random);
   if(mainSeen.has(key(main)))continue;
   const stars=E.sample(Array(n).fill(1),2,random);
   if(fullSeen.has(key(main)+'|'+key(stars)))continue;
   return {date,main,stars,asOf,version:VERSION,checkedDraws:prior.length,excludedMainSets:mainSeen.size,excludedFullRows:fullSeen.size,excludedCurrentRows:mainSeen.size*starTotal,selectionRowsRemaining:(mainTotal-mainSeen.size)*starTotal,starPairOccurrences:prior.filter(r=>key(r.stars)===key(stars)).length,chance:1/(mainTotal*starTotal),attempts:attempt};
  }
  throw Error('Kunne ikke finne en ny kombinasjon i dette forsøket.');
 }
 const API={VERSION,proposal};
 if(typeof module!=='undefined')module.exports=API;else root.EJ_EXCLUSION=API;
})(typeof window!=='undefined'?window:globalThis);
