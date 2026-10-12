(function(root){
 'use strict';
 const compareNumbers=(a,b)=>{for(let i=0;i<Math.min(a.length,b.length);i++)if(a[i]!==b[i])return a[i]-b[i];return a.length-b.length;};
 function analyze(rows){
  const groups={all7:new Map(),main5:new Map(),stars2:new Map()};
  for(const row of rows){
   const main=[...row.main].sort((a,b)=>a-b),stars=[...row.stars].sort((a,b)=>a-b);
   for(const [type,values] of [['all7',[main,stars]],['main5',[main]],['stars2',[stars]]]){
    const key=JSON.stringify(values),map=groups[type];
    if(!map.has(key))map.set(key,{main:type==='stars2'?[]:main,stars:type==='main5'?[]:stars,dates:[]});
    map.get(key).dates.push(row.date);
   }
  }
  const result={count:rows.length,from:rows[0]?.date||null,to:rows.at(-1)?.date||null};
  for(const [type,map] of Object.entries(groups)){
   const repeated=[...map.values()].filter(g=>g.dates.length>1).map(g=>({...g,count:g.dates.length,dates:[...g.dates].sort()})).sort((a,b)=>b.count-a.count||compareNumbers(a.main,b.main)||compareNumbers(a.stars,b.stars));
   result[type]={unique:map.size,repeatedCount:repeated.length,extraOccurrences:repeated.reduce((s,g)=>s+g.count-1,0),drawsInRepeats:repeated.reduce((s,g)=>s+g.count,0),repeated};
  }
  return result;
 }
 const API={analyze};
 if(typeof module!=='undefined')module.exports=API;else root.EJ_REPEATS=API;
})(typeof window!=='undefined'?window:globalThis);
