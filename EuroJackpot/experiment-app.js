'use strict';
(function(){
const $=id=>document.getElementById(id),X=EJ_EXPERIMENT,N=EJ_NUMEROLOGY,fmt=n=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:2}).format(n),compact=n=>new Intl.NumberFormat('nb-NO',{notation:'compact',maximumFractionDigits:1}).format(n);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Intl.DateTimeFormat('nb-NO',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Oslo'}).format(new Date(s+'T12:00:00Z'));
let data,config=null,lastTest=null,tableLimit=30,autoPot=false;
function subset(){return data.draws.filter(r=>$('chart-year').value==='all'||r.date.startsWith($('chart-year').value));}
function download(name,content,type='application/json'){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function barChart(id,items,title,second=false){
 const W=600,H=290,L=53,R=18,T=25,B=48,max=Math.max(1,...items.flatMap(x=>[x.value,x.expected||0]))*1.12,barW=(W-L-R)/items.length,x=i=>L+(i+.5)*barW,y=v=>H-B-v/max*(H-T-B);
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>`;
 for(let k=0;k<=4;k++){const v=max*k/4,yy=y(v);svg+=`<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" stroke="#30373e"/><text x="${L-9}" y="${yy+4}" text-anchor="end">${compact(v)}</text>`;}
 items.forEach((v,i)=>{
  const bw=barW*(second?.27:.55),xx=x(i),bars=second?[[v.value,xx-bw-2,'#bddacf'],[v.expected,xx+2,'#fb955d']]:[[v.value,xx-bw/2,'#bddacf']];
  for(const [n,bx,color] of bars)svg+=`<rect x="${bx}" y="${y(n)}" width="${bw}" height="${H-B-y(n)}" rx="3" fill="${color}"><title>${esc(v.label)}: ${fmt(n)}</title></rect>`;
  svg+=`<text x="${xx}" y="${H-B+25}" text-anchor="middle">${esc(v.label)}</text>${second?'':`<text class="value" x="${xx}" y="${y(v.value)-8}" text-anchor="middle">${fmt(v.value)}</text>`}`;
 });
 $(id).innerHTML=svg+'</svg>'+(second?'<div class="legend"><span>Din regel · observert</span><span>Tilfeldig · forventet</span></div>':'');
}
function lineChart(id,rows,key,title){
 const W=600,H=290,L=58,R=18,T=25,B=45,values=rows.map(key),present=values.filter(v=>v!==null&&Number.isFinite(v)),max=Math.max(1,...present)*1.08,x=i=>L+i/Math.max(1,rows.length-1)*(W-L-R),y=v=>H-B-v/max*(H-T-B);
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>`;
 for(let k=0;k<5;k++){const v=max*k/4,yy=y(v);svg+=`<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" stroke="#30373e"/><text x="${L-8}" y="${yy+4}" text-anchor="end">${compact(v)}</text>`;}
 let segment='';
 for(let i=0;i<values.length;i++){
  const v=values[i];if(v===null||!Number.isFinite(v)){if(segment)svg+=`<path d="${segment}" fill="none" stroke="#bddacf" stroke-width="1.7"/>`;segment='';continue;}
  segment+=(segment?'L':'M')+x(i).toFixed(2)+','+y(v).toFixed(2)+' ';
 }
 if(segment)svg+=`<path d="${segment}" fill="none" stroke="#bddacf" stroke-width="1.7"/>`;
 values.forEach((v,i)=>{if(v!==null&&Number.isFinite(v))svg+=`<circle cx="${x(i)}" cy="${y(v)}" r="3.2" fill="#bddacf" opacity=".65" data-index="${i}"><title>${date(rows[i].date)}: ${fmt(v)}</title></circle>`;});
 for(const i of [...new Set([0,Math.floor((rows.length-1)/2),rows.length-1])])if(rows[i])svg+=`<text x="${x(i)}" y="${H-12}" text-anchor="${i===0?'start':i===rows.length-1?'end':'middle'}">${esc(date(rows[i].date))}</text>`;
 $(id).innerHTML=svg+'</svg>';
 $(id).querySelectorAll('[data-index]').forEach(c=>c.addEventListener('pointerenter',()=>{const i=Number(c.dataset.index);$('trend-note').textContent=date(rows[i].date)+': '+fmt(values[i])+' · '+title;}));
 return present.length;
}
function renderCharts(){
 const rows=subset(),counts=X.winnerCounts(rows),unknown=counts.at(-1).count;
 barChart('winner-chart',counts.filter((x,i)=>i<3||x.count).map(x=>({label:x.label,value:x.count})),'Antall trekninger etter førstepremievinnerrekker');
 $('winner-note').textContent=fmt(rows.length)+' trekninger · '+fmt(unknown)+' ukjente vinnerfelt. «Flere» betyr minst to vinnerrekker. Ingen av kategoriene er det samme som antall personer.';
 const metric=$('trend-metric').value,select=$('trend-metric'),title=select.options[select.selectedIndex].text;
 const getter=r=>metric==='jackpot'?r.jackpotTotalPaidEUR:metric==='second'?r.prizes[1].paidPerWinningRowEUR:metric==='third'?r.prizes[2].paidPerWinningRowEUR:metric==='stake'?r.stakeEUR:r.jackpotWinningRows;
 const n=lineChart('trend-chart',rows,getter,title);$('trend-note').textContent=fmt(n)+' tilgjengelige datapunkter av '+fmt(rows.length)+'. Tomme beløpsfelt er ikke fylt med anslag. Hele den valgte tidsserien vises.';
}
function balls(row){return '<div class="balls">'+row.main.map(n=>`<span class="ball">${n}</span>`).join('')+'<span>+</span>'+row.stars.map(n=>`<span class="ball star">${n}</span>`).join('')+'</div>';}
function reasons(row){return [...row.reasons.map(x=>({x,star:false})),...row.starReasons.map(x=>({x,star:true}))].map(({x,star})=>`<li><strong>${star?'Stjernetall ':''}${x.number}</strong>: ${esc(x.sources.join(' · '))}</li>`).join('');}
function prefillPot(){
 const ann=X.announcementFor(data,$('draw-date').value);
 if(ann&&$('currency').value==='EUR'){$('pot').value=Math.round(ann.amountEUR);autoPot=true;$('pot-source').textContent='Offisiell annonsert pott: '+fmt(ann.amountEUR)+' EUR · Registrert '+new Intl.DateTimeFormat('nb-NO',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Oslo'}).format(new Date(ann.observedAt))+' (norsk tid).';}
 else{if(autoPot)$('pot').value='';autoPot=false;$('pot-source').textContent='Ingen tidsstemplet forhåndspott for denne datoen/valutaen. Du kan skrive et beløp selv; det merkes som brukeroppgitt og brukes ikke som historisk fasit.';}
}
function renderPersonal(){
 const r=N.row(config.birth,config.date,config.name),p=r.profile;
 $('personal-output').hidden=false;$('personal-balls').innerHTML=balls(r);$('personal-reasons').innerHTML=reasons(r);
 $('personal-factors').innerHTML=[['Personlig år',p.year],['Personlig måned',p.month],['Personlig dag',p.day],['Livsvei',p.life],['Fødselsdag',p.birthday],...(p.expression?[['Navnetall',p.expression]]:[])].map(([l,n])=>`<span>${l}: ${n}</span>`).join('');
 if(config.amount){
  const c=X.combination(config.birth,config.date,config.name,config.own,config.amount,config.currency);config.combined=c;
  $('combined-balls').innerHTML=balls(c);$('combined-factors').textContent=`Ditt tall ${c.ownNumber} · Premiebeløp ${fmt(config.amount)} ${config.currency} → sifferrot ${c.premiumRoot}. ${config.announced?'Beløpet er registrert fra operatør før trekningen.':'Beløpet er brukeroppgitt; forhåndsstatus er ikke uavhengig dokumentert.'}`;
  $('combined-reasons').innerHTML=reasons(c);$('combined-detail').hidden=false;
 }else{config.combined=null;$('combined-balls').textContent='Legg inn en kjent forhåndspott for å beregne denne hypotesen.';$('combined-factors').textContent='Ingen premie er gjettet eller hentet fra et framtidig resultat.';$('combined-detail').hidden=true;}
 $('save-plan').disabled=false;
}
function renderTest(){
 if(!config)return;
 const t=X.backtest(subset(),config.birth,config.name,config.date,$('test-mode').value,data,config.own);lastTest=t;tableLimit=30;
 $('test-prompt').hidden=!!t.count;$('test-output').hidden=!t.count;
 if(!t.count){$('test-prompt').textContent=t.mode==='combined'?`Ingen testtrekninger med en tidsstemplet forhåndspott ennå. ${fmt(t.omitted)} historiske trekninger utelates fordi bare etterpåbeløp er tilgjengelige. Nye registrerte potter kan brukes etter at trekningen har funnet sted.`:'Ingen tilgjengelige trekninger etter fødselsdatoen og før den valgte datoen.';return;}
 $('test-n').textContent=fmt(t.count);$('test-main').textContent=fmt(t.meanMain);$('test-stars').textContent=fmt(t.meanStars);$('test-jackpot').textContent=fmt(t.jackpotHits);
 barChart('main-test-chart',t.observed.map((v,i)=>({label:i+' rette',value:v,expected:t.expected[i]})),'Hovedtallstreff: observert og tilfeldig forventning',true);
 barChart('star-test-chart',t.starObserved.map((v,i)=>({label:i+' rette',value:v,expected:t.starExpected[i]})),'Stjernetallstreff: observert og tilfeldig forventning',true);
 $('test-note').textContent=`Tilfeldig forventning: 0,50 hovedtall og ${fmt(t.expectedMeanStars)} stjernetall per trekning. ${t.simulations} tilfeldige kontrollforsøk ga et 95 % simuleringsintervall på ${fmt(t.controlLow)}–${fmt(t.controlHigh)} hovedtallstreff per trekning. Dette er beskrivende utforskning, ikke en bekreftet fordel eller en korrigert signifikanstest.`;
 renderTestTable();
}
function renderTestTable(){
 if(!lastTest)return;const rs=lastTest.results.slice().reverse();$('test-table').innerHTML=rs.slice(0,tableLimit).map(r=>`<tr><td>${date(r.date)}</td><td>${r.main}</td><td>${r.stars}</td></tr>`).join('');$('test-more').hidden=tableLimit>=rs.length;
}
function submit(event){
 event.preventDefault();$('form-error').hidden=true;if(!$('experiment-form').reportValidity())return;
 try{
  const birth=$('birth').value,selected=$('draw-date').value,name=$('name').value.trim(),own=$('own-number').value?Number($('own-number').value):null,amount=$('pot').value?Number($('pot').value):null,currency=$('currency').value;
  N.parseDate(birth);N.parseDate(selected);if(![2,5].includes(new Date(selected+'T12:00:00Z').getUTCDay())||selected<'2012-03-23')throw Error('Velg en tirsdag eller fredag fra starten i 2012.');
  if(name&&!N.nameNumber(name))throw Error('Navnetall krever bokstaver A–Z, Æ, Ø eller Å. Du kan la navnet stå tomt.');
  if(own!==null&&(!Number.isInteger(own)||own<1||own>50))throw Error('Ditt tall må være 1–50.');
  if(amount!==null)X.amountRoot(amount);
  N.profile(birth,selected,name);
  const ann=X.announcementFor(data,selected);config={birth,date:selected,name,own,amount,currency,announced:ann&&currency==='EUR'&&amount===Math.round(ann.amountEUR)?ann:null,createdAt:new Date().toISOString()};
  renderPersonal();renderTest();
 }catch(e){$('form-error').hidden=false;$('form-error').textContent=e.message;config=null;$('save-plan').disabled=true;$('personal-output').hidden=true;$('test-output').hidden=true;}
}
function savePlan(){
 if(!config)return;
 const row=N.row(config.birth,config.date,config.name),forward=EJ.deadlineStatus(config.date,new Date())!=='Spillefristen er passert'&&config.date>data.draws.at(-1).date;
 const record={version:X.VERSION,recordedAt:config.createdAt,registration:'Lokalt lagret oppsett; ikke uavhengig tidsverifisert',forwardCandidate:forward,inputs:{birthDate:config.birth,name:config.name,ownNumber:config.own,drawDate:config.date,potAmount:config.amount,currency:config.currency},announcement:config.announced,historyAsOf:data.draws.at(-1).date,personalRow:row,combinedRow:config.combined,notes:['Personopplysninger lagres bare i denne nedlastede filen.','Oppsett for tidligere eller avsluttede trekninger er retrospektive, ikke forhåndsregistrerte.','Valuta, avrunding og regelversjon skal holdes faste gjennom forsøket.']};
 download('EuroJackpot-forsok-'+config.date+'.json',JSON.stringify(record,null,2));
}
function renderCases(){
 $('cases').innerHTML=data.cases.map(c=>{
  let cycles='';if(c.birthDay&&c.birthMonth){const d=N.parseDate(c.drawDate),year=N.reduce(N.reduce(c.birthDay)+N.reduce(c.birthMonth)+N.reduce(d.year)),month=N.reduce(year+N.reduce(d.month)),day=N.reduce(month+d.day);cycles=`<div class="chips"><span>Personlig år ${year}</span><span>Måned ${month}</span><span>Dag ${day}</span></div><p class="small">Sykluser beregnet for trekningsdatoen fra kjent dag/måned. Livsvei beregnes ikke uten fødselsår.</p>`;}
  return `<article class="card"><div class="casehead"><span class="eyebrow">${date(c.drawDate)}</span><span class="pill">${c.sameBirthday?'Egen bursdag':'Annen kobling'}</span></div><div class="case-amount">${fmt(c.prizeNOK)} kr</div><p>${esc(c.prizeClass)} · ${esc(c.region||c.country)}</p><h3>${esc(c.relation)}</h3><p class="small">${c.birthDay?'Kjent dag/måned: '+c.birthDay+'.'+c.birthMonth+'.':'Vinnerens bursdag er ukjent.'} Fødselsår: ${c.birthYear||'ukjent'}. ${c.age?'Oppgitt alder: '+c.age+'.':''}</p>${cycles}<p class="small">Faktisk gevinst i NOK → sifferrot ${N.reduce(c.prizeNOK)}. Dette beløpet var kjent etter trekningen.</p><p class="small">${esc(c.notes)}</p><a href="${esc(c.sourceUrl)}" target="_blank" rel="noopener">Les kilden ↗</a><p class="small" style="margin-top:12px">${esc(c.quality)}</p></article>`;
 }).join('');
}
function init(){try{
 data=window.EJ_RESEARCH;if(!data?.draws?.length)throw Error('Premiedata er ikke tilgjengelige.');
 EJ.validate(data.draws.map(r=>({date:r.date,main:r.main,stars:r.stars})));
 $('n-draws').textContent=fmt(data.draws.length);$('n-cases').textContent=fmt(data.cases.length);$('n-pots').textContent=fmt(data.announcedPots.length);
 [...new Set(data.draws.map(r=>r.date.slice(0,4)))].reverse().forEach(y=>{const o=document.createElement('option');o.value=y;o.textContent=y;$('chart-year').append(o);});
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Oslo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));$('birth').max=`${parts.year}-${parts.month}-${parts.day}`;
 $('draw-date').value=EJ.nextDates(new Date(),data.draws)[0];prefillPot();renderCharts();renderCases();
 $('source-stamp').textContent='997 var antall trekninger ved oppstart. Nå '+fmt(data.draws.length)+' trekninger · Oppdatert '+new Intl.DateTimeFormat('nb-NO',{timeZone:'Europe/Oslo',dateStyle:'long',timeStyle:'short'}).format(new Date(data.fetchedAt))+' (norsk tid). Alle beløp i tidsserien er EUR; norske vinnerhistorier viser NOK separat.';
 $('announcement-ledger').innerHTML='<strong>Registrerte forhåndspotter</strong><ul>'+data.announcedPots.map(a=>`<li>${date(a.drawDate)}: ${fmt(a.amountEUR)} EUR · Registrert ${esc(a.observedAt)} · <a href="${esc(a.sourceUrl)}" target="_blank" rel="noopener">Operatørkilde</a></li>`).join('')+'</ul><p>'+esc(data.announcementStatus)+'</p>';
 $('chart-year').addEventListener('change',()=>{renderCharts();renderTest();});$('trend-metric').addEventListener('change',renderCharts);$('experiment-form').addEventListener('submit',submit);$('draw-date').addEventListener('change',prefillPot);$('currency').addEventListener('change',prefillPot);$('pot').addEventListener('input',()=>{autoPot=false;$('pot-source').textContent='Brukeroppgitt beløp. Bare samsvar med en registrert operatørpott kan bekreftes som offisiell forhåndsinformasjon.';});$('test-mode').addEventListener('change',renderTest);$('save-plan').addEventListener('click',savePlan);$('test-more').addEventListener('click',()=>{tableLimit+=50;renderTestTable();});
 $('export-data').addEventListener('click',()=>download('EuroJackpot-eksperimentdata.json',JSON.stringify(data,null,2)));
 $('export-csv').addEventListener('click',()=>{
  const header=['dato','h1','h2','h3','h4','h5','s1','s2','omsetning_EUR','forstepremie_vinnerrekker','forstepremie_utbetalt_totalt_EUR','andrepremie_per_rekke_EUR','tredjepremie_per_rekke_EUR'];
  const rs=data.draws.map(r=>[r.date,...r.main,...r.stars,r.stakeEUR,r.jackpotWinningRows,r.jackpotTotalPaidEUR,r.prizes[1].paidPerWinningRowEUR,r.prizes[2].paidPerWinningRowEUR].map(x=>x??'').join(','));download('EuroJackpot-trekninger-premier.csv','\uFEFF'+header.join(',')+'\n'+rs.join('\n'),'text/csv;charset=utf-8');
 });
}catch(e){$('load-error').hidden=false;$('load-error').textContent='Kunne ikke laste eksperimentet: '+e.message;}}
init();
})();
