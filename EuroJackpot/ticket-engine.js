(function(root){'use strict';
 const E=typeof module!=='undefined'?require('./engine.js'):root.EJ,N=typeof module!=='undefined'?require('./numerology.js'):root.EJ_NUMEROLOGY,X=typeof module!=='undefined'?require('./exclusion.js'):root.EJ_EXCLUSION,P=typeof module!=='undefined'?require('./experiment-engine.js'):root.EJ_EXPERIMENT,C=typeof module!=='undefined'?require('./calendar-client.js'):root.EJ_CALENDAR;
 function defaults(){return [{kind:'ai',variant:0},{kind:'ai',variant:1},{kind:'personal'},{kind:'history'},{kind:'calendar'},{kind:'combined'},...Array.from({length:4},()=>({kind:'empty'}))];}
 function validateLine(main,stars){if(main.length!==5||stars.length!==2||new Set(main).size!==5||new Set(stars).size!==2||main.some(n=>!Number.isInteger(n)||n<1||n>50)||stars.some(n=>!Number.isInteger(n)||n<1||n>12))throw Error('Choose 5 distinct main numbers and 2 distinct Euro numbers.');return {main:[...main].sort((a,b)=>a-b),stars:[...stars].sort((a,b)=>a-b)};}
 function key(r){return r.main.join(',')+'|'+r.stars.join(',');}
 function uniqueCount(lines){return new Set(lines.filter(x=>x.row).map(x=>key(x.row))).size;}
 async function compile(slots,date,rows,model,personal={},options={}){
  return Promise.all(slots.map(async(slot,index)=>{
   const out={index,kind:slot.kind,row:null,title:'Add your own line',note:'Choose numbers or generate a random line.'};
   if(slot.kind==='ai'){
    const frozen=(options.proposals?.forecasts||[]).find(r=>r.date===date&&r.mode==='model'&&r.version===E.VERSION&&r.asOf<date);
    out.title=`AI selection ${slot.variant+1}`;out.row=frozen?.rows[slot.variant]||E.proposal(rows,date,'model',slot.variant,model);out.note=(frozen?'Registered before the draw':'Experimental local selection')+' · history through '+out.row.asOf;
   }else if(slot.kind==='history'){
    out.title='History filter';out.row=X.proposal(rows,date);out.note=`Five-main set unseen across ${out.row.checkedDraws} earlier draws · Euro pair previously drawn ${out.row.starPairOccurrences} times`;
   }else if(slot.kind==='calendar'){
    out.title='Calendar hypothesis';const frozen=(options.calendar?.forecasts||[]).find(r=>r.date===date&&r.version===C.VERSION&&r.asOf<date);
    try{out.row=frozen||await C.proposal(rows,date);out.note=(frozen?'Locked before the draw':'Exploratory calendar rule')+' · seven-day information lag';}catch(e){out.note=e.message;}
   }else if(slot.kind==='personal'){
    out.title='Personal numerology';if(personal.birthDate){out.row=N.row(personal.birthDate,date,personal.name||'');const p=out.row.profile;out.note=`Personal year ${p.year} · month ${p.month} · day ${p.day} · life path ${p.life}`;}else out.note='Add your birthday below to complete this line.';
   }else if(slot.kind==='combined'){
    out.title='Personal date + prize';if(personal.birthDate&&personal.amount){out.row=P.combination(personal.birthDate,date,personal.name||'',personal.own,personal.amount,personal.currency||'EUR');out.note=`Prize digit root ${out.row.premiumRoot} · ${personal.currency||'EUR'} · symbolic hypothesis`;}else out.note='Add your birthday and a known announced prize amount below.';
   }else if(slot.kind==='manual'){
    out.title='Your own selection';out.row={date,...validateLine(slot.main,slot.stars)};out.note='Selected on this device.';
   }return out;
  }));
 }
 const API={defaults,validateLine,uniqueCount,compile};if(typeof module!=='undefined')module.exports=API;else root.EJ_TICKET=API;
})(typeof window!=='undefined'?window:globalThis);
