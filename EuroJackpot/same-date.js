(function(root){
 'use strict';
 function today(now=new Date(),timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
 }
 function report(rows,date){
  const parsed=new Date(date+'T12:00:00Z'),year=Number(date.slice(0,4));
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(+parsed)||parsed.toISOString().slice(0,10)!==date||year<2012||year>2100)throw Error('Choose a valid date between 2012 and 2100.');
  if(!rows.length)throw Error('The archive is empty.');
  const first=rows[0].date,last=rows.at(-1).date,index=new Map(rows.map(r=>[r.date,r]));
  const entries=[];
  for(let y=year-1;y>=Number(first.slice(0,4));y--){
   const key=`${y}-${date.slice(5)}`,d=new Date(key+'T12:00:00Z'),draw=index.get(key);
   const status=d.toISOString().slice(0,10)!==key?'invalid-date':key<first?'not-started':key>last?'not-covered':draw?'draw':'no-draw';
   entries.push({year:y,date:key,status,draw:draw||null});
  }
  return {date,first,last,entries,matches:entries.filter(r=>r.status==='draw').length};
 }
 const API={today,report};
 if(typeof module!=='undefined')module.exports=API;else root.EJ_SAME_DATE=API;
})(typeof window!=='undefined'?window:globalThis);
