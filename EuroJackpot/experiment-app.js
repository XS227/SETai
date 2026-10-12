'use strict';
(function(){
const $=id=>document.getElementById(id),X=EJ_EXPERIMENT,N=EJ_NUMEROLOGY,fmt=n=>new Intl.NumberFormat('en-GB',{maximumFractionDigits:2}).format(n),compact=n=>new Intl.NumberFormat('en-GB',{notation:'compact',maximumFractionDigits:1}).format(n);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Oslo'}).format(new Date(s+'T12:00:00Z'));
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
 $(id).innerHTML=svg+'</svg>'+(second?'<div class="legend"><span>Your rule · observed</span><span>Random · expected</span></div>':'');
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
 barChart('winner-chart',counts.filter((x,i)=>i<3||x.count).map(x=>({label:x.label,value:x.count})),'Draw counts by jackpot-winning lines');
 $('winner-note').textContent=fmt(rows.length)+' draws · '+fmt(unknown)+' unknown winner fields. Multiple means at least two winning lines. These categories do not count individual people.';
 const metric=$('trend-metric').value,select=$('trend-metric'),title=select.options[select.selectedIndex].text;
 const getter=r=>metric==='jackpot'?r.jackpotTotalPaidEUR:metric==='second'?r.prizes[1].paidPerWinningRowEUR:metric==='third'?r.prizes[2].paidPerWinningRowEUR:metric==='stake'?r.stakeEUR:r.jackpotWinningRows;
 const n=lineChart('trend-chart',rows,getter,title);$('trend-note').textContent=fmt(n)+' available data points out of '+fmt(rows.length)+'. Missing amounts are not estimated. The complete selected time series is shown.';
}
function balls(row){return '<div class="balls">'+row.main.map(n=>`<span class="ball">${n}</span>`).join('')+'<span>+</span>'+row.stars.map(n=>`<span class="ball star">${n}</span>`).join('')+'</div>';}
function reasons(row){return [...row.reasons.map(x=>({x,star:false})),...row.starReasons.map(x=>({x,star:true}))].map(({x,star})=>`<li><strong>${star?'Euro number ':''}${x.number}</strong>: ${esc(x.sources.join(' · '))}</li>`).join('');}
function prefillPot(){
 const ann=X.announcementFor(data,$('draw-date').value);
 if(ann&&$('currency').value==='EUR'){$('pot').value=Math.round(ann.amountEUR);autoPot=true;$('pot-source').textContent='Official announced pot: '+fmt(ann.amountEUR)+' EUR · Recorded '+new Intl.DateTimeFormat('en-GB',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Oslo'}).format(new Date(ann.observedAt))+' (Norwegian time).';}
 else{if(autoPot)$('pot').value='';autoPot=false;$('pot-source').textContent='No time-stamped pre-draw pot is available for this date/currency. You may enter an amount; it is labelled user-entered and is not treated as historical pre-draw evidence.';}
}
function renderPersonal(){
 const r=N.row(config.birth,config.date,config.name),p=r.profile;
 $('personal-output').hidden=false;$('personal-balls').innerHTML=balls(r);$('personal-reasons').innerHTML=reasons(r);
 $('personal-factors').innerHTML=[['Personal year',p.year],['Personal month',p.month],['Personal day',p.day],['Life path',p.life],['Birthday',p.birthday],...(p.expression?[['Name number',p.expression]]:[])].map(([l,n])=>`<span>${l}: ${n}</span>`).join('');
 if(config.amount){
  const c=X.combination(config.birth,config.date,config.name,config.own,config.amount,config.currency);config.combined=c;
  $('combined-balls').innerHTML=balls(c);$('combined-factors').textContent=`Your number ${c.ownNumber} · Prize amount ${fmt(config.amount)} ${config.currency} → digit root ${c.premiumRoot}. ${config.announced?'The amount was recorded from the operator before the draw.':'The amount is user-entered; its pre-draw availability is not independently verified.'}`;
  $('combined-reasons').innerHTML=reasons(c);$('combined-detail').hidden=false;
 }else{config.combined=null;$('combined-balls').textContent='Enter a known announced pre-draw pot to calculate this hypothesis.';$('combined-factors').textContent='No prize amount is guessed or taken from a future result.';$('combined-detail').hidden=true;}
 $('save-plan').disabled=false;
}
function renderTest(){
 if(!config)return;
 const t=X.backtest(subset(),config.birth,config.name,config.date,$('test-mode').value,data,config.own);lastTest=t;tableLimit=30;
 $('test-prompt').hidden=!!t.count;$('test-output').hidden=!t.count;
 if(!t.count){$('test-prompt').textContent=t.mode==='combined'?`No test draws with a time-stamped pre-draw pot yet. ${fmt(t.omitted)} historical draws are omitted because only post-draw amounts are available. Registered pots become eligible after their draw takes place.`:'No available draws fall between the birthday and chosen date.';return;}
 $('test-n').textContent=fmt(t.count);$('test-main').textContent=fmt(t.meanMain);$('test-stars').textContent=fmt(t.meanStars);$('test-jackpot').textContent=fmt(t.jackpotHits);
 barChart('main-test-chart',t.observed.map((v,i)=>({label:i+' matches',value:v,expected:t.expected[i]})),'Main-number matches: observed and random expectation',true);
 barChart('star-test-chart',t.starObserved.map((v,i)=>({label:i+' matches',value:v,expected:t.starExpected[i]})),'Euro-number matches: observed and random expectation',true);
 $('test-note').textContent=`Random expectation: 0.50 main-number and ${fmt(t.expectedMeanStars)} Euro-number matches per draw. ${t.simulations} random controls gave a central 95% simulation interval of ${fmt(t.controlLow)}–${fmt(t.controlHigh)} main-number matches per draw. This is descriptive exploration, not a confirmed advantage or a corrected significance test.`;
 renderTestTable();
}
function renderTestTable(){
 if(!lastTest)return;const rs=lastTest.results.slice().reverse();$('test-table').innerHTML=rs.slice(0,tableLimit).map(r=>`<tr><td>${date(r.date)}</td><td>${r.main}</td><td>${r.stars}</td></tr>`).join('');$('test-more').hidden=tableLimit>=rs.length;
}
function submit(event){
 event.preventDefault();$('form-error').hidden=true;if(!$('experiment-form').reportValidity())return;
 try{
  const birth=$('birth').value,selected=$('draw-date').value,name=$('name').value.trim(),own=$('own-number').value?Number($('own-number').value):null,amount=$('pot').value?Number($('pot').value):null,currency=$('currency').value;
  N.parseDate(birth);N.parseDate(selected);if(![2,5].includes(new Date(selected+'T12:00:00Z').getUTCDay())||selected<'2012-03-23')throw Error('Choose a Tuesday or Friday from the start of EuroJackpot in 2012.');
  if(name&&!N.nameNumber(name))throw Error('Name numbers use letters A–Z, Æ, Ø or Å. You may leave the name blank.');
  if(own!==null&&(!Number.isInteger(own)||own<1||own>50))throw Error('Your number must be 1–50.');
  if(amount!==null)X.amountRoot(amount);
  N.profile(birth,selected,name);
  const ann=X.announcementFor(data,selected);config={birth,date:selected,name,own,amount,currency,announced:ann&&currency==='EUR'&&amount===Math.round(ann.amountEUR)?ann:null,createdAt:new Date().toISOString()};
  renderPersonal();renderTest();
 }catch(e){$('form-error').hidden=false;$('form-error').textContent=e.message;config=null;$('save-plan').disabled=true;$('personal-output').hidden=true;$('test-output').hidden=true;}
}
function savePlan(){
 if(!config)return;
 const row=N.row(config.birth,config.date,config.name),forward=EJ.deadlineStatus(config.date,new Date())!=='Norwegian ticket deadline has passed'&&config.date>data.draws.at(-1).date;
 const record={version:X.VERSION,recordedAt:config.createdAt,registration:'Locally saved setup; not independently time-verified',forwardCandidate:forward,inputs:{birthDate:config.birth,name:config.name,ownNumber:config.own,drawDate:config.date,potAmount:config.amount,currency:config.currency},announcement:config.announced,historyAsOf:data.draws.at(-1).date,personalRow:row,combinedRow:config.combined,notes:['Personal details are stored only in this downloaded file.','Setups for past or closed draws are retrospective, not pre-registered.','Currency, rounding and rule version must remain fixed throughout the experiment.']};
 download('EuroJackpot-experiment-'+config.date+'.json',JSON.stringify(record,null,2));
}
function renderCases(){
 $('cases').innerHTML=data.cases.map(c=>{
  let cycles='';if(c.birthDay&&c.birthMonth){const d=N.parseDate(c.drawDate),year=N.reduce(N.reduce(c.birthDay)+N.reduce(c.birthMonth)+N.reduce(d.year)),month=N.reduce(year+N.reduce(d.month)),day=N.reduce(month+d.day);cycles=`<div class="chips"><span>Personal year ${year}</span><span>Month ${month}</span><span>Day ${day}</span></div><p class="small">Cycles use the known birth day/month and draw date. Life path is not calculated without a birth year.</p>`;}
  return `<article class="card"><div class="casehead"><span class="eyebrow">${date(c.drawDate)}</span><span class="pill">${c.sameBirthday?'Own birthday':'Other connection'}</span></div><div class="case-amount">${fmt(c.prizeNOK)} NOK</div><p>${esc(c.prizeClass)} · ${esc(c.region||c.country)}</p><h3>${esc(c.relation)}</h3><p class="small">${c.birthDay?'Known day/month: '+c.birthDay+'.'+c.birthMonth+'.':'The winner’s birthday is unknown.'} Birth year: ${c.birthYear||'unknown'}. ${c.age?'Reported age: '+c.age+'.':''}</p>${cycles}<p class="small">Actual prize in NOK → digit root ${N.reduce(c.prizeNOK)}. This amount became known after the draw.</p><p class="small">${esc(c.notes)}</p><a href="${esc(c.sourceUrl)}" target="_blank" rel="noopener">Read the source ↗</a><p class="small" style="margin-top:12px">${esc(c.quality)}</p></article>`;
 }).join('');
}
function init(){try{
 data=window.EJ_RESEARCH;if(!data?.draws?.length)throw Error('Prize data is unavailable.');
 EJ.validate(data.draws.map(r=>({date:r.date,main:r.main,stars:r.stars})));
 data={...data,cases:data.cases.map(c=>({...c,...(window.EJ_CASE_EN?.[c.id]||{})})),announcementStatus:'Only time-stamped operator announcements are treated as pre-draw pots. Missing announcements are not reconstructed from result-file payouts.'};
 $('n-draws').textContent=fmt(data.draws.length);$('n-cases').textContent=fmt(data.cases.length);$('n-pots').textContent=fmt(data.announcedPots.length);
 [...new Set(data.draws.map(r=>r.date.slice(0,4)))].reverse().forEach(y=>{const o=document.createElement('option');o.value=y;o.textContent=y;$('chart-year').append(o);});
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Oslo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));$('birth').max=`${parts.year}-${parts.month}-${parts.day}`;
 $('draw-date').value=EJ.nextDates(new Date(),data.draws)[0];prefillPot();renderCharts();renderCases();
 $('source-stamp').textContent='997 draws were available at launch. Now '+fmt(data.draws.length)+' draws · Updated '+new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Oslo',dateStyle:'long',timeStyle:'short'}).format(new Date(data.fetchedAt))+' (Norwegian time). Time-series amounts are EUR; Norwegian winner stories show NOK separately.';
 $('announcement-ledger').innerHTML='<strong>Registered pre-draw pots</strong><ul>'+data.announcedPots.map(a=>`<li>${date(a.drawDate)}: ${fmt(a.amountEUR)} EUR · Recorded ${esc(a.observedAt)} · <a href="${esc(a.sourceUrl)}" target="_blank" rel="noopener">Operator source</a></li>`).join('')+'</ul><p>'+esc(data.announcementStatus)+'</p>';
 $('chart-year').addEventListener('change',()=>{renderCharts();renderTest();});$('trend-metric').addEventListener('change',renderCharts);$('experiment-form').addEventListener('submit',submit);$('draw-date').addEventListener('change',prefillPot);$('currency').addEventListener('change',prefillPot);$('pot').addEventListener('input',()=>{autoPot=false;$('pot-source').textContent='User-entered amount. Only a match with a registered operator announcement can be verified as official pre-draw information.';});$('test-mode').addEventListener('change',renderTest);$('save-plan').addEventListener('click',savePlan);$('test-more').addEventListener('click',()=>{tableLimit+=50;renderTestTable();});
 $('export-data').addEventListener('click',()=>download('EuroJackpot-research-data.json',JSON.stringify(data,null,2)));
 $('export-csv').addEventListener('click',()=>{
  const header=['date','h1','h2','h3','h4','h5','s1','s2','stakes_EUR','jackpot_winning_lines','jackpot_total_paid_EUR','second_prize_per_line_EUR','third_prize_per_line_EUR'];
  const rs=data.draws.map(r=>[r.date,...r.main,...r.stars,r.stakeEUR,r.jackpotWinningRows,r.jackpotTotalPaidEUR,r.prizes[1].paidPerWinningRowEUR,r.prizes[2].paidPerWinningRowEUR].map(x=>x??'').join(','));download('EuroJackpot-draws-prizes.csv','\uFEFF'+header.join(',')+'\n'+rs.join('\n'),'text/csv;charset=utf-8');
 });
}catch(e){$('load-error').hidden=false;$('load-error').textContent='Unable to load the experiment: '+e.message;}}
init();
})();
