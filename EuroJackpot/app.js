'use strict';
(function(){
const $=id=>document.getElementById(id), fmt=n=>new Intl.NumberFormat('nb-NO').format(n);
const dateFmt=(date,short=false)=>new Intl.DateTimeFormat('nb-NO',{timeZone:'Europe/Oslo',day:'numeric',month:short?'short':'long',year:'numeric'}).format(new Date(date+'T12:00:00Z'));
const weekday=date=>new Intl.DateTimeFormat('nb-NO',{timeZone:'Europe/Oslo',weekday:'long'}).format(new Date(date+'T12:00:00Z'));
const cap=s=>s[0].toUpperCase()+s.slice(1);
const balls=(nums,star=false)=>nums.map(n=>`<span class="ball ${star?'star':''}" aria-label="${star?'Stjernetall':'Hovedtall'} ${n}">${n}</span>`).join('');
let rows,model,visible=20,selected=1,personal=null,followToday=true;
function toast(msg){$('toast').textContent=msg;$('toast').hidden=false;setTimeout(()=>$('toast').hidden=true,2500);}
function personalMarkup(date){
 if(!personal)return '<div class="personal-row"><div class="rowlabel">Rekke 3 · Personlig numerologi</div><p class="personal-empty">Legg inn fødselsdatoen ovenfor for å få din personlige rekke til denne datoen.</p></div>';
 const r=EJ_NUMEROLOGY.row(personal.birthDate,date,personal.name),p=r.profile;
 const chips=[['Personlig år',p.year],['Personlig måned',p.month],['Personlig dag',p.day],['Livsvei',p.life],['Fødselsdag',p.birthday],...(p.expression?[['Navnetall',p.expression],['Sjeletall',p.soul],['Personlighet',p.personality]]:[])];
 const reasons=(items,star)=>items.map(x=>`<li><strong>${star?'Stjernetall ':''}${x.number}</strong>: ${x.sources.join(' · ')}</li>`).join('');
 return `<div class="personal-row"><div class="rowlabel">Rekke 3 · Dine numerologiske tall</div><div class="balls">${balls(r.main)}<span class="plus" aria-hidden="true">+</span>${balls(r.stars,true)}</div><div class="personal-numbers">${chips.map(([label,value])=>`<span>${label} <strong>${value}</strong></span>`).join('')}</div><details><summary>Se hvordan dine 7 tall er valgt</summary><ul class="personal-reasons">${reasons(r.reasons,false)}${reasons(r.starReasons,true)}</ul><p class="tiny">Like personlige tall deler én ball. Ledige plasser fylles med andre personlige tall eller forklarte summer. Summer over 50 tilpasses 1–50. Stjernetall tilpasses 1–12. Dette er utvalgsregler for rekken, ikke en prognose.</p></details></div>`;
}
function setupPersonal(){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Oslo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
 $('birth-date').max=`${parts.year}-${parts.month}-${parts.day}`;
 $('personal-form').addEventListener('submit',event=>{
  event.preventDefault();$('personal-error').hidden=true;
  if(!$('personal-form').reportValidity())return;
  try{
   const birthDate=$('birth-date').value,name=$('personal-name').value.trim();
   if(name&&!EJ_NUMEROLOGY.nameNumber(name))throw Error('Navnet må inneholde bokstaver A–Z, Æ, Ø eller Å. Du kan også la navnefeltet stå tomt.');
   for(const date of EJ.nextDates(new Date(),rows))EJ_NUMEROLOGY.row(birthDate,date,name);
   personal={birthDate,name};renderForecasts();toast('Din personlige rekke 3 er klar for begge datoene');
  }catch(e){personal=null;renderForecasts();$('personal-error').textContent=e.message;$('personal-error').hidden=false;}
 });
 $('personal-clear').addEventListener('click',()=>{personal=null;$('personal-form').reset();$('personal-error').hidden=true;renderForecasts();});
}
function renderForecasts(){
 const dates=EJ.nextDates(new Date(),rows),mode=$('mode').value;
 $('next-draws').innerHTML=dates.map((date,i)=>{
   const frozen=(window.EJ_PROPOSALS?.forecasts||[]).find(r=>r.date===date&&r.mode===mode&&r.version===EJ.VERSION&&r.asOf<date);
   const predictions=frozen?.rows||[0,1].map(v=>EJ.proposal(rows,date,mode,v,model));
   const snapshot=frozen?'Registrert på forhånd':'Lokalt beregnet · ikke registrert';
   return `<article class="card drawcard"><div class="drawhead"><div><div class="eyebrow">${cap(weekday(date))} · ${i===0?'Neste trekning':'Trekningen etter'}</div><h3>${dateFmt(date)}</h3><p>${EJ.deadlineStatus(date)}</p></div><span class="badge">${mode==='model'?'AI · eksperimentell':'Tilfeldig utvalg'}</span></div>${predictions.map((r,j)=>`<div class="rowlabel">Rekke ${j+1}</div><div class="balls">${balls(r.main)}<span class="plus" aria-hidden="true">+</span>${balls(r.stars,true)}</div>`).join('')}${personalMarkup(date)}<div class="drawfoot"><span>5+2: <strong>1 av ${fmt(EJ.combinations)}</strong><br>per rekke</span><button class="copy" data-date="${date}" type="button">Kopier tall</button></div><p class="forecast-note">Rekke 1–2: ${snapshot} · Historikk til ${dateFmt(predictions[0].asOf,true)}${personal?'<br>Rekke 3: beregnet lokalt for trekningsdatoen.':''}</p></article>`;
 }).join('');
 document.querySelectorAll('.copy').forEach(btn=>btn.addEventListener('click',async()=>{
  const date=btn.dataset.date, frozen=(window.EJ_PROPOSALS?.forecasts||[]).find(r=>r.date===date&&r.mode===mode&&r.version===EJ.VERSION),p=frozen?.rows||[0,1].map(v=>EJ.proposal(rows,date,mode,v,model));
  const nr=personal?EJ_NUMEROLOGY.row(personal.birthDate,date,personal.name):null;
  const str=dateFmt(date)+'\n'+p.map((r,i)=>'Rekke '+(i+1)+': '+r.main.join(' – ')+' + '+r.stars.join(' – ')).join('\n')+(nr?'\nRekke 3 (personlig numerologi): '+nr.main.join(' – ')+' + '+nr.stars.join(' – '):'')+'\nEksperimentelle / symbolske forslag. 5+2: 1 av '+fmt(EJ.combinations)+' per rekke.';
  try{await navigator.clipboard.writeText(str);toast('Tallene er kopiert');}catch{toast('Kopiering er ikke tilgjengelig i denne visningen.');}
 }));
}
function renderCalculator(){
 const n=Number($('row-count').value);
 if(!Number.isInteger(n)||n<1||n>EJ.combinations){$('row-count').setCustomValidity('Velg et heltall fra 1 til 139838160.');$('calculated-odds').textContent='Ugyldig antall';$('calc-percent').textContent='';return;}
 $('row-count').setCustomValidity('');
 const p=n/EJ.combinations;
 $('calculated-odds').textContent='1 av '+new Intl.NumberFormat('nb-NO',{maximumFractionDigits:2}).format(1/p);
 $('calc-percent').textContent=new Intl.NumberFormat('nb-NO',{minimumFractionDigits:8,maximumFractionDigits:8}).format(p*100)+' %';
}
function renderFrequency(){
 const key=$('number-type').value, f=EJ.frequency(rows,key,$('period').value);
 const min=Math.min(...f.map(x=>x.rate)),max=Math.max(...f.map(x=>x.rate));
 if(selected>f.length)selected=1;
 $('heatmap').innerHTML=f.map(x=>`<button class="heat" type="button" data-num="${x.number}" aria-pressed="${x.number===selected}" style="--heat:${.06+.25*(x.rate-min)/(max-min||1)}" aria-label="Tall ${x.number}, ${x.count} forekomster"><strong>${x.number}</strong><small>${x.count} trekk</small></button>`).join('');
 const x=f.find(r=>r.number===selected);
 $('number-detail').innerHTML=`<div><strong>${selected}</strong><span>Valgt ${key==='main'?'hovedtall':'stjernetall'}</span></div><div><strong>${fmt(x.count)} / ${fmt(x.eligible)}</strong><span>Forekomster / mulige trekninger</span></div><div><strong>${(x.rate*100).toLocaleString('nb-NO',{maximumFractionDigits:2})} %</strong><span>Historisk frekvens</span></div><div><strong>${x.last?dateFmt(x.last,true):'—'}</strong><span>Sist trukket i denne perioden</span></div>`;
 document.querySelectorAll('.heat').forEach(b=>b.addEventListener('click',()=>{selected=Number(b.dataset.num);renderFrequency();}));
}
function renderSameDate(){
 if(followToday)$('same-date').value=EJ_SAME_DATE.today();
 try{
  const result=EJ_SAME_DATE.report(rows,$('same-date').value);
  const label=new Intl.DateTimeFormat('nb-NO',{timeZone:'UTC',day:'numeric',month:'long'}).format(new Date(result.date+'T12:00:00Z'));
  const notes={'no-draw':'Ingen trekning på denne datoen','invalid-date':'Datoen finnes ikke dette året','not-started':'Før EuroJackpot startet','not-covered':'Historikken dekker ikke denne datoen ennå'};
  $('same-date-title').textContent=`${followToday?'I dag':'Valgt dato'} · ${label}`;
  $('same-date-summary').textContent=`${result.matches} tidligere ${result.matches===1?'trekning':'trekninger'} på nøyaktig samme dag og måned. Dagens dato følger din tidssone (${Intl.DateTimeFormat().resolvedOptions().timeZone}).`;
  $('same-date-body').innerHTML=result.entries.map(entry=>entry.draw?`<tr><td class="nowrap">${cap(weekday(entry.date))}<br>${dateFmt(entry.date,true)}</td><td><div class="balls">${balls(entry.draw.main)}</div></td><td><div class="balls">${balls(entry.draw.stars,true)}</div></td></tr>`:`<tr><td class="nowrap">${entry.status==='invalid-date'?entry.year:dateFmt(entry.date,true)}</td><td colspan="2" class="tiny">${notes[entry.status]}</td></tr>`).join('');
  $('same-date-empty').hidden=result.entries.length>0;
  $('same-date-error').hidden=true;
 }catch(e){$('same-date-body').innerHTML='';$('same-date-summary').textContent='';$('same-date-title').textContent='Historikk for samme dato';$('same-date-empty').hidden=true;$('same-date-error').textContent=e.message;$('same-date-error').hidden=false;}
}
function setupSameDate(){
 $('same-date').value=EJ_SAME_DATE.today();renderSameDate();
 $('same-date').addEventListener('change',()=>{followToday=false;renderSameDate();});
 $('same-date-today').addEventListener('click',()=>{followToday=true;renderSameDate();});
}
function archiveRows(){return rows.filter(r=>$('year').value==='all'||r.date.startsWith($('year').value)).slice().reverse();}
function renderArchive(){
 const data=archiveRows();
 $('archive-body').innerHTML=data.slice(0,visible).map(r=>`<tr><td class="nowrap">${dateFmt(r.date,true)}</td><td><div class="balls">${balls(r.main)}</div></td><td><div class="balls">${balls(r.stars,true)}</div></td></tr>`).join('');
 $('more').hidden=visible>=data.length;$('more').textContent=`Vis flere (${fmt(data.length-Math.min(visible,data.length))} igjen)`;
}
function exportCsv(){
 const data=archiveRows().reverse(),csv='dato,hovedtall1,hovedtall2,hovedtall3,hovedtall4,hovedtall5,stjernetall1,stjernetall2\n'+data.map(r=>[r.date,...r.main,...r.stars].join(',')).join('\n');
 const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='EuroJackpot-historikk-'+$('year').value+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function renderModel(){
 const e=model.evaluation, score=n=>Number.isFinite(n)?n.toFixed(6).replace('.',','):'—';
 $('model-scores').innerHTML=`<tr><td>Hovedtall</td><td>${score(e.main)}</td><td>${score(e.mainBaseline)}</td></tr><tr><td>Stjernetall</td><td>${score(e.stars)}</td><td>${score(e.starsBaseline)}</td></tr>`;
 $('model-verdict').textContent='Ingen dokumentert prediksjonsfordel. Små scoreforskjeller i denne testen gir ikke grunnlag for å love høyere vinnersjanse.';
 $('test-period').textContent=`${fmt(e.trainCount)} treningstrekninger · ${fmt(e.count)} testtrekninger · Testperiode ${dateFmt(e.from,true)}–${dateFmt(e.to,true)}. Brier-score, lavere er bedre.`;
}
function dataStatus(){
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Oslo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const op=Object.fromEntries(p.map(x=>[x.type,x.value]));
 const today=`${op.year}-${op.month}-${op.day}`;let d=new Date(today+'T12:00:00Z');
 // At 23:00 expect a result for today. Earlier in the day, use the previous draw.
 if(Number(op.hour)<23)d.setUTCDate(d.getUTCDate()-1);
 while(![2,5].includes(d.getUTCDay()))d.setUTCDate(d.getUTCDate()-1);
 const expected=d.toISOString().slice(0,10),last=rows.at(-1);
 $('data-status').textContent=last.date<expected?`Historikken mangler resultatet fra ${dateFmt(expected,true)}. Tallforslag bruker data til ${dateFmt(last.date,true)}.`:'Historikken er komplett fram til siste forventede trekning.';
}
async function refreshData(){
 if(!['http:','https:'].includes(location.protocol))return;
 try{
  const read=async(filename,prefix)=>{
   const response=await fetch(filename+'?refresh='+Date.now(),{cache:'no-store'});
   if(!response.ok)throw Error('Oppdateringen er ikke tilgjengelig.');
   const body=(await response.text()).trim();
   if(!body.startsWith(prefix))throw Error('Uventet dataformat.');
   return JSON.parse(body.slice(prefix.length).replace(/;\s*$/,''));
  };
  const data=await read('history.js','window.EJ_HISTORY='),fresh=EJ.validate(data.draws);
  if(fresh.length<rows.length||fresh.at(-1).date<rows.at(-1).date)throw Error('Utdatert datarespons.');
  const changed=fresh.length!==rows.length;
  rows=fresh;window.EJ_HISTORY=data;
  try{window.EJ_PROPOSALS=await read('proposals.js','window.EJ_PROPOSALS=');}catch{}
  if(changed){
   model=EJ.fit(rows);renderModel();renderFrequency();renderArchive();renderSameDate();
   $('draw-count').textContent=fmt(rows.length);$('latest-date').textContent=dateFmt(rows.at(-1).date,true);
   const last=rows.at(-1);$('last-result').innerHTML=`<div><div class="eyebrow">Siste resultat</div><strong>${dateFmt(last.date,true)}</strong></div><div class="balls">${balls(last.main)}<span class="plus">+</span>${balls(last.stars,true)}</div>`;
   const year=last.date.slice(0,4);if(!Array.from($('year').options).some(o=>o.value===year)){const o=document.createElement('option');o.value=year;o.textContent=year;$('year').append(o);}
  }
  $('source-stamp').textContent='Hentet '+new Intl.DateTimeFormat('nb-NO',{timeZone:'Europe/Oslo',dateStyle:'long',timeStyle:'short'}).format(new Date(data.fetchedAt))+' (norsk tid).';
  renderForecasts();dataStatus();
 }catch{$('data-status').textContent='Kunne ikke oppdatere akkurat nå. Viser siste lagrede historikk til '+dateFmt(rows.at(-1).date,true)+'.';}
}
function init(){
 try{
  rows=EJ.validate(window.EJ_HISTORY.draws);if(rows.length<100)throw Error('For lite historikk til modellen.');
  const last=rows.at(-1);$('draw-count').textContent=fmt(rows.length);$('latest-date').textContent=dateFmt(last.date,true);
  $('last-result').innerHTML=`<div><div class="eyebrow">Siste resultat</div><strong>${dateFmt(last.date,true)}</strong></div><div class="balls">${balls(last.main)}<span class="plus">+</span>${balls(last.stars,true)}</div>`;
  $('source-stamp').textContent='Hentet '+new Intl.DateTimeFormat('nb-NO',{timeZone:'Europe/Oslo',dateStyle:'long',timeStyle:'short'}).format(new Date(window.EJ_HISTORY.fetchedAt))+' (norsk tid).';
  $('snapshot-note').textContent=window.EJ_PROPOSALS?'Registrerte forslag fryses med dato, modellversjon og siste tilgjengelige resultat. De endres ikke når nye resultater kommer.':'Forslag i denne visningen beregnes lokalt. De er ikke registrert før trekningen og skal ikke brukes som dokumentasjon på tidligere prediksjon.';
  [...new Set(rows.map(r=>r.date.slice(0,4)))].reverse().forEach(y=>{const o=document.createElement('option');o.value=y;o.textContent=y;$('year').append(o);});
  const classes=[[5,2],[5,1],[5,0],[4,2],[4,1],[3,2],[4,0],[2,2],[3,1],[3,0],[1,2],[2,1]];
  $('odds-table').querySelector('tbody').innerHTML=classes.map(([m,s])=>`<tr><td>${m}+${s}</td><td>${fmt(Math.round(1/EJ.odds(m,s)))}</td></tr>`).join('');
  $('any-prize').textContent='En av disse premiegruppene: omtrent 1 av '+(1/classes.reduce((a,[m,s])=>a+EJ.odds(m,s),0)).toLocaleString('nb-NO',{maximumFractionDigits:1})+'.';
  model=EJ.fit(rows);renderModel();renderForecasts();renderCalculator();renderFrequency();renderArchive();dataStatus();setupPersonal();setupSameDate();
  $('mode').addEventListener('change',renderForecasts);$('row-count').addEventListener('input',renderCalculator);$('number-type').addEventListener('change',renderFrequency);$('period').addEventListener('change',renderFrequency);$('year').addEventListener('change',()=>{visible=20;renderArchive();});$('more').addEventListener('click',()=>{visible+=40;renderArchive();});$('export').addEventListener('click',exportCsv);
  setInterval(()=>{renderForecasts();dataStatus();if(followToday)renderSameDate();},60_000);
  setInterval(refreshData,300_000);
 }catch(e){$('error').hidden=false;$('error').textContent='Kunne ikke beregne forslagene: '+e.message;$('next-draws').innerHTML='';}
}
init();
})();
