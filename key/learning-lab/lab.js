'use strict';
const $=id=>document.getElementById(id),names={learnable_permutation:'Lærbart mønster',independent_random:'Tilfeldig kontroll',fixed_hash:'Hash-kontroll',ethereum:'Tidligere syntetiske par'};
const descriptions={learnable_permutation:'Positiv kontroll: 16 biter fra læreordet er omstokket og eventuelt snudd, sammen med 64 støybiter. Her finnes et enkelt mønster modellen bør kunne lære.',independent_random:'Negativ kontroll: de 80 inputbitene er generert uavhengig av læreordet. Å lære treningsfeil betyr ikke nødvendigvis at modellen blir bedre på nye ord.',fixed_hash:'Læreordet hashes med SHA-256; de første 80 bitene blir input. Dette er et lite, kunstig 16-biters domene. Resultatet sier ikke om sikkerheten til wallet-nøkler.',ethereum:'Retrospektivt feilkart fra de samme 2 000 syntetiske Ethereum-parene i eksperimentanalysen. Dette er rekonstruksjon av tidligere tester, ikke nye forsøk. Modellen er frosset og trenes ikke med disse feilene.'};
let dataset,diagnostic,protocol,selected='learnable_permutation',position=0;
const pct=n=>(100*n).toLocaleString('nb-NO',{minimumFractionDigits:2,maximumFractionDigits:2})+' %';
const num=(n,d=2)=>n.toLocaleString('nb-NO',{minimumFractionDigits:d,maximumFractionDigits:d});
const sign=n=>(n>=0?'+':'−')+num(Math.abs(n));
const date=s=>new Date(s).toLocaleString('nb-NO',{timeZone:'Europe/Berlin',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function heatmap(c,n){
 const count=c.confusion[position],max=Math.max(1,...count.flat()),hex='0123456789ABCDEF';let html='<span class="axis">↓ / →</span>';
 for(const ch of hex)html+='<span class="axis">'+ch+'</span>';
 for(let a=0;a<16;a++){html+='<span class="axis">'+hex[a]+'</span>';for(let b=0;b<16;b++){const value=count[a][b],intensity=value?0.15+.8*Math.sqrt(value/max):.04;html+='<button type="button" class="'+(a===b?'diagonal':'')+'" style="background:rgba(158,210,108,'+intensity+')" data-truth="'+a+'" data-prediction="'+b+'" aria-label="Fasit '+hex[a]+', foreslått '+hex[b]+': '+value+' av '+n+'" aria-pressed="false"><span>'+value+'</span></button>';}}
 $('heatmap').innerHTML=html;$('cell-detail').textContent='Velg en rute. Tegn '+(position+1)+' · '+n.toLocaleString('nb-NO')+' kjente fasiter.';
 $('heatmap').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{$('heatmap').querySelectorAll('[aria-pressed=true]').forEach(b=>b.setAttribute('aria-pressed','false'));button.setAttribute('aria-pressed','true');const a=+button.dataset.truth,b=+button.dataset.prediction;$('cell-detail').textContent='Tegn '+(position+1)+' · Fasit '+hex[a]+' → foreslått '+hex[b]+' · '+count[a][b]+' / '+n+' ord · '+(a===b?'riktig tegn':'feil tegn');}));
 $('bit-errors').classList.toggle('dense',c.perBitErrors.length>64);
 $('bit-errors').innerHTML=c.perBitErrors.map((errors,i)=>'<div style="height:'+Math.max(2,80*errors/n)+'px" title="Bit '+(i+1)+': '+errors+' / '+n+' feil ('+pct(errors/n)+')"></div>').join('');
}
function curve(c){
 const rows=c.epochs,x=e=>48+e/24*630,y=a=>195-a*160;let svg='';
 for(const p of [0,.25,.5,.75,1]){svg+='<path d="M48 '+y(p)+' H678" stroke="#34443b" stroke-dasharray="3 6"/><text x="35" y="'+(y(p)+4)+'" fill="#aebcb3" text-anchor="end" font-size="11">'+p*100+'%</text>';}
 for(const e of [0,6,12,18,24])svg+='<text x="'+x(e)+'" y="216" fill="#aebcb3" text-anchor="middle" font-size="11">'+e+'</text>';
 svg+='<text x="678" y="230" fill="#aebcb3" text-anchor="end" font-size="10">Treningsepoke</text>';
 for(const [key,color] of [['training','#c3f87a'],['validation','#bbabfa']])svg+='<polyline fill="none" stroke="'+color+'" stroke-width="2.5" points="'+rows.map(r=>x(r.epoch)+','+y(r[key].bitAccuracy)).join(' ')+'"/>';
 svg+='<path d="M'+x(c.selectedEpoch)+' 24 V195" stroke="#e3e8db" stroke-dasharray="3 3" opacity=".5"/><text x="'+Math.min(595,x(c.selectedEpoch)+7)+'" y="18" fill="#e3e8db" font-size="11">Valgt: '+c.selectedEpoch+'</text>';$('curve').innerHTML=svg;
}
function renderSelection(){
 if(!dataset?.latest)return;const old=selected==='ethereum',c=old?diagnostic:dataset.latest.controls.find(r=>r.control===selected);if(!c){$('control-description').textContent='Feilkartet kunne ikke lastes. Prøv å laste siden på nytt.';return;}
 document.querySelectorAll('[data-control]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.control===selected)));
 $('control-description').textContent=descriptions[selected];const positions=old?64:4;position=Math.min(position,positions-1);$('position').innerHTML=Array.from({length:positions},(_,i)=>'<option value="'+i+'">'+(i+1)+' av '+positions+'</option>').join('');$('position').value=position;
 $('accuracy').textContent=pct(old?c.bitAccuracy:c.test.bitAccuracy);$('accuracy-detail').textContent=old?'2 000 tidligere testpar · 0 hele nøkler riktige':c.test.exactWords+' / '+c.test.n+' hele læreord riktige';
 $('curve-section').hidden=old;
 if(old){$('gain').textContent='+0,28 bit';$('interval').textContent='Tidligere paret 95 % KI: −0,22 til +0,77';$('before-after').textContent='Frosset modell';$('selection').textContent='Retrospektiv diagnostikk · ingen trening';$('interpretation').textContent='Ingen dokumentert fordel mot tilfeldig gjetting. Skjeve tegnfordelinger i dette kartet er beskrivelser, og validerer ikke en metode for å finne wallet-nøkler.';}
 else{$('gain').textContent=sign(c.versusRandom.mean)+' bit';$('interval').textContent='95 % KI: '+sign(c.versusRandom.ci95[0])+' til '+sign(c.versusRandom.ci95[1]);$('before-after').textContent=pct(c.test.previousBitAccuracy)+' → '+pct(c.test.bitAccuracy);$('selection').textContent='Valgt på validering · epoke '+c.selectedEpoch+' / 24';$('interpretation').textContent=selected==='learnable_permutation'?'Den lærbare kontrollen viser om feilrettingen virker på denne enkle oppgaven. Et godt resultat her er ikke dokumentasjon på at wallet-nøkler kan forutsies.':'Se særlig på testen: trening kan bli bedre uten at modellen slår tilfeldig gjetting på nye ord. Konfidensintervallet er en tilnærming beregnet per testord; daglige tall er utforskende.';curve(c);}
 $('diagnostic-note').textContent=old?'De samme 2 000 tidligere syntetiske parene telles ikke på nytt. Ingen virkelige wallet-mål eller saldoer inngår. Feilkartet brukes ikke som treningsdata.':'Testfeil vises for analyse. Neste runde starter fra modellen valgt med trenings- og valideringsdata, uten oppdateringer fra testfasit.';heatmap(c,old?c.n:c.test.n);
}
function render(){
 $('rounds').textContent=dataset.completedRounds+' / '+dataset.plannedRounds;$('state').textContent=dataset.state==='running'?'Kjører runde '+dataset.activeRound:dataset.state==='completed'?'Planen er fullført':'Ferdig med siste runde · venter til neste natt';
 if(dataset.state==='completed'){$('next-time').textContent='Fullført';$('schedule').textContent='Ingen flere planlagte forsøk';}
 $('code-hash').textContent=protocol.runnerSha256;$('updated').textContent='Sist publisert: '+date(dataset.updatedUtc)+' norsk tid · oppdateres hvert 15. sekund';
 $('round-badge').textContent='Runde '+(dataset.latest?.round||'—');
 $('history').innerHTML=dataset.rounds.map(r=>'<tr><td>'+r.round+'<span>'+escape(date(r.endedUtc))+' norsk tid</span></td>'+r.controls.map(c=>'<td>'+pct(c.test.bitAccuracy)+'<span>'+sign(c.versusRandom.mean)+' bit mot tilfeldig</span></td>').join('')+'<td>'+num(r.wallSeconds,2)+' s</td></tr>').join('');
 $('unique-count').textContent=(dataset.completedRounds*3072).toLocaleString('nb-NO')+' ulike læreord brukt totalt. Hver runde deler 3 072 ord i trening, validering og test. De tre kontrollene bruker samme ord, så 6 144 testloggrader per runde er 2 048 testord i tre betingelser.';
 const labels={splitDisjoint:'Ingen overlapp i rundens ordgrupper',testOpenedAfterSelection:'Modell valgt før testmåling',correctTestCounts:'Alle kontrollene har 2 048 testord',learningControlGeneralizes:'Lærbar kontroll over 95 % riktige biter',noWalletInputs:'Bare kunstige læreord som input'};
 if(dataset.latest){$('checks').innerHTML=Object.entries(dataset.latest.checks).map(([key,ok])=>'<li class="'+(ok?'ok':'fail')+'">'+(ok?'✓ ':'✕ ')+escape(labels[key]||key)+'</li>').join('');$('raw-download').href='runs/round-'+String(dataset.latest.round).padStart(2,'0')+'-test.jsonl';renderSelection();}
}
async function refresh(){try{const response=await fetch('latest.json',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);dataset=await response.json();$('load-error').hidden=true;render();}catch(err){$('load-error').textContent='Kunne ikke hente nye resultater. Siste viste data beholdes. '+err.message;$('load-error').hidden=false;}}
document.querySelectorAll('[data-control]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.control;position=0;renderSelection();}));$('position').addEventListener('change',e=>{position=+e.target.value;renderSelection();});
(async()=>{try{const responses=await Promise.all([fetch('protocol.json'),fetch('ethereum-diagnostic.json')]);for(const r of responses)if(!r.ok)throw Error('HTTP '+r.status);[protocol,diagnostic]=await Promise.all(responses.map(r=>r.json()));await refresh();setInterval(refresh,15000);}catch(err){$('load-error').textContent='Laben kunne ikke lastes: '+err.message;$('load-error').hidden=false;}})();
