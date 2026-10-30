'use strict';
/* SETAEI Experiment 02: deterministic, synthetic ten-target research only.
   No real wallet targets, private keys, scanning, or live agent operations. */
const $=q=>document.querySelector(q),BITS=160,NT=10;
let study=null,candidate=null,nextNumber=1,nextTarget=0;
function rng(seed){let s=seed>>>0;return()=>{s=(s+0x6d2b79f5)|0;let v=Math.imul(s^(s>>>15),1|s);v^=v+Math.imul(v^(v>>>7),61|v);return(v^(v>>>14))>>>0;};}
function addr(r){return Uint32Array.from({length:5},()=>r());}
function bit(a,i){return(a[i>>>5]>>>(i&31))&1;}
function pop(x){x-=((x>>>1)&0x55555555);x=(x&0x33333333)+((x>>>2)&0x33333333);return(Math.imul((x+(x>>>4))&0x0f0f0f0f,0x01010101)>>>24);}
function similarity(a,b){let n=0;for(let k=0;k<5;k++)n+=32-pop(a[k]^b[k]);return n;}
function prefix(a,b,p=12){for(let j=0;j<p;j++)if(bit(a,j)!==bit(b,j))return false;return true;}
function fmt(x){return Number(x).toLocaleString('nb-NO');}
function pct(x){return(100*x).toLocaleString('nb-NO',{maximumFractionDigits:2})+' %';}
function patternOf(t){const counts=Array.from({length:160},(_,j)=>t.reduce((s,a)=>s+bit(a,j),0));const positions=Array.from({length:160},(_,j)=>j).sort((a,b)=>Math.abs(counts[b]-5)-Math.abs(counts[a]-5)||a-b).slice(0,12);return{counts,positions,values:positions.map(j=>counts[j]>=5?1:0)};}
function gate(a,p,min){if(!min)return true;let total=0;for(let k=0;k<12;k++)total+=(bit(a,p.positions[k])===p.values[k])?1:0;return total>=min;}
function compare(a,t){const scores=t.map(x=>similarity(a,x)),max=Math.max(...scores);return{scores,max,index:scores.indexOf(max),hasPrefix:t.some(x=>prefix(a,x))};}
function theory(){const b=Array(161).fill(0);b[80]=1;for(let j=79;j>=0;j--)b[j]=b[j+1]*(j+1)/(160-j);for(let j=81;j<=160;j++)b[j]=b[j-1]*(161-j)/j;let norm=b.reduce((a,c)=>a+c,0),c=0,last=0;return b.map(x=>{c+=x/norm;const v=Math.pow(c,10);const density=v-last;last=v;return density;});}
const REFERENCE=theory();
function run(){const n=Number($('#n').value),seed=(Number($('#seed').value)>>>0)||227,threshold=Number($('#threshold').value);
 const tr=rng((seed^0xa751893b)>>>0),targets=Array.from({length:10},()=>addr(tr)),p=patternOf(targets),cr=rng((seed^0x6f09e667)>>>0);
 const hist=Array(161).fill(0);let accepted=0,allPrefix=0,keptPrefix=0,sum=0,keptSum=0,peak=0,first=null;
 const start=performance.now();
 for(let i=0;i<n;i++){let a=addr(cr);if(i===0)first=a;let m=compare(a,targets);hist[m.max]++;sum+=m.max;peak=Math.max(peak,m.max);if(m.hasPrefix)allPrefix++;
  if(gate(a,p,threshold)){accepted++;keptSum+=m.max;if(m.hasPrefix)keptPrefix++;}}
 study={n,seed,threshold,targets,p,hist,accepted,allPrefix,keptPrefix,sum,keptSum,peak,elapsed:performance.now()-start,time:new Date().toISOString(),first};candidate=first;nextNumber=1;nextTarget=0;render();}
function box(svg,x,y,w,h,col){return svg+'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="2" fill="'+col+'"/>';}
function renderHeat(){const h=$('#heatmap');h.replaceChildren();const label=document.createElement('div');label.className='heat-labels';label.innerHTML='<span>Lag / bit</span>'+Array.from({length:20},(_,i)=>'<span>'+(8*i+1)+'–'+(8*i+8)+'</span>').join('');h.append(label);
 const all=study.targets.concat([candidate]);for(let row=0;row<all.length;row++){const line=document.createElement('div');line.className='heatrow '+(row===10?'candidate':'target');const name=document.createElement('span');name.className='rowtitle';name.textContent=row===10?'KANDIDAT':'Mål '+String(row+1).padStart(2,'0');line.append(name);
 for(let j=0;j<160;j++){let cell=document.createElement('button');cell.type='button';cell.className='bit '+(row===10?(bit(all[row],j)?'one':'zero'):(bit(all[row],j)===bit(candidate,j)?'agree':'diff'));cell.style.border='0';cell.style.padding='0';cell.style.cursor='pointer';if(row===10&&study.p.positions.includes(j))cell.style.outline='1px solid #e9bd80';
 cell.title='Bit '+(j+1)+' = '+bit(all[row],j);cell.setAttribute('aria-label',name.textContent+' bit '+(j+1));cell.addEventListener('click',()=>{$('#bitnote').textContent=name.textContent+' · bit '+(j+1)+' · verdi '+bit(all[row],j)+' · 1-biter blant mål: '+study.p.counts[j]+'/10'+(study.p.positions.includes(j)?' · konsensusposisjon':'');});line.append(cell);}h.append(line);}
 const c=compare(candidate,study.targets),ok=gate(candidate,study.p,study.threshold);$('#candidateStatus').className='label '+(ok?'green':'red');$('#candidateStatus').textContent=ok?'MØNSTERPORT: AKSEPTERT':'MØNSTERPORT: AVVIST';$('#pattern').textContent=study.p.positions.map((j,i)=>(j+1)+':'+study.p.values[i]).join(' · ');$('#gatelabel').textContent='Portkrav: '+(study.threshold?study.threshold+'/12':'av');$('#best').textContent=c.max+' / 160 · mål '+(c.index+1);$('#bestnote').textContent='Kandidat '+fmt(nextNumber)+' · like biter mål 1–10: '+c.scores.join(' · ')+(c.hasPrefix?' · ett 12-bit prefikstreff':' · ingen 12-bit prefikstreff');}
function histogram(){let d=study,lo=78,hi=115,N=d.n,maximum=Math.max(1,...d.hist.slice(lo,hi+1),...REFERENCE.slice(lo,hi+1).map(v=>v*N))*1.12;let X=k=>46+(k-lo)/(hi-lo)*552,Y=v=>224-v/maximum*199,svg='';
 for(let i=0;i<5;i++){let v=maximum*i/4,y=Y(v);svg+='<line x1="46" y1="'+y+'" x2="600" y2="'+y+'" stroke="#314054"/><text x="3" y="'+(y+3)+'">'+Math.round(v)+'</text>';}
 for(let k=lo;k<=hi;k++){const w=552/(hi-lo)-3;svg=box(svg,X(k)-w/2,Y(d.hist[k]),w,Math.max(0,224-Y(d.hist[k])),'#d9a87a');}
 let path=REFERENCE.slice(lo,hi+1).map((v,i)=>(i?'L':'M')+X(lo+i).toFixed(2)+','+Y(v*N).toFixed(2)).join('');svg+='<path d="'+path+'" stroke="#6bd2e0" stroke-width="2.3" fill="none"/>';
 for(let k=80;k<=110;k+=5)svg+='<text x="'+(X(k)-9)+'" y="247">'+k+'</text>';svg+='<text x="360" y="14">Teori (turkis) · simulert (gull)</text>';$('#hist').innerHTML=svg;}
function bars(){let d=study,ret=d.allPrefix?d.keptPrefix/d.allPrefix:0,vs=[['Alle kandidater',1,'#63cddb'],['Akseptert',d.accepted/d.n,'#e3bb83'],['Prefikstreff beholdt',ret,'#9bdaa9']],svg='';
 vs.forEach((r,i)=>{let y=46+i*66;svg+='<text x="12" y="'+(y-11)+'">'+r[0]+'</text>';svg=box(svg,12,y,500,19,'#24364a');svg=box(svg,12,y,(500*r[1]).toFixed(2),19,r[2]);svg+='<text x="520" y="'+(y+14)+'">'+(r[1]*100).toFixed(1)+'%</text>';});
 svg+='<text x="12" y="249">Andeler er betinget av samme kandidater</text>';$('#cost').innerHTML=svg;}
function render(){let d=study;renderHeat();histogram();bars();$('#numCandidates').textContent=fmt(d.n);$('#acceptance').textContent=pct(d.accepted/d.n);$('#acceptedCount').textContent=fmt(d.accepted)+' av '+fmt(d.n);$('#bestAverage').textContent=(d.sum/d.n).toFixed(2).replace('.',',');$('#retention').textContent=d.allPrefix?pct(d.keptPrefix/d.allPrefix):'Ikke målbart';$('#retentionNote').textContent=fmt(d.keptPrefix)+' / '+fmt(d.allPrefix)+' 12-bit prefikstreff beholdt';
 $('#costnote').textContent='Kontroll: '+fmt(d.n*10)+' kandidat–mål-sammenligninger. Filterarm: '+fmt(d.accepted*10)+' etter porten. Portens kostnad kommer i tillegg. Høyere gjennomsnitt blant aksepterte kan skyldes seleksjon, ikke prediksjon.';
 $('#runstatus').textContent='Ferdig: '+fmt(d.n)+' syntetiske kandidater · '+fmt(d.accepted)+' akseptert · '+d.elapsed.toFixed(0)+' ms. '+d.time+' · Ingen live-agent berørt.';
 $('#log').innerHTML='<p><b>RUN:</b> ET02-'+d.seed+'-'+d.n+'-'+d.threshold+'<br><b>Datatype:</b> syntetisk (seed '+d.seed+')<br><b>Mål:</b> 10 × 160 bit<br><b>Primærendepunkt:</b> eksakt 160-bit treff per generert kandidat, forventet nær null<br><b>Sekundært:</b> 12-bit prefikstreff '+d.allPrefix+'; beholdt '+d.keptPrefix+'<br><b>Beste likhet:</b> '+d.peak+'/160<br><b>Konklusjon:</b> Simuleringen gir ingen dokumentasjon for gevinst på eksakt treff.</p>';}
$('#run').addEventListener('click',()=>{let b=$('#run');b.disabled=true;$('#runstatus').textContent='Simulerer…';setTimeout(()=>{try{run();}finally{b.disabled=false;}},20);});
$('#step').addEventListener('click',()=>{if(!study)run();const r=rng((study.seed^0x6f09e667)>>>0);for(let i=0;i<nextNumber;i++)addr(r);candidate=addr(r);nextNumber++;nextTarget=0;renderHeat();$('#stepFeedback').textContent='Ny kandidat valgt. Mønsterporten er evaluert. Test deretter mål 1–10.';});
$('#testNext').addEventListener('click',()=>{if(!study)run();if(nextTarget>=10){$('#stepFeedback').textContent='Ti mål er ferdig testet. Velg neste kandidat.';return;}
 if(!gate(candidate,study.p,study.threshold)){$('#stepFeedback').textContent='Porten avviste kandidaten. Kontrollarmen tester likevel alle ti mål for sammenligning.';return;}
 let i=nextTarget++,score=similarity(candidate,study.targets[i]);document.querySelectorAll('.heatrow').forEach((r,j)=>r.classList.toggle('strong',j===i));$('#stepFeedback').textContent='Mål '+(i+1)+'/10 · '+score+' av 160 like biter.';});
$('#export').addEventListener('click',()=>{if(!study)return;const d=study,out={schema_version:2,study_id:'SETAEI-ET02',data_type:'synthetic',seed:d.seed,time:d.time,targets:10,bits:160,candidates:d.n,threshold:d.threshold,gate_positions:d.p.positions.map(i=>i+1),accepted:d.accepted,prefix_matches:d.allPrefix,prefix_matches_filtered:d.keptPrefix,mean_best_similarity:d.sum/d.n,peak_similarity:d.peak,histogram:d.hist,theory:REFERENCE};const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='setaei-et02-'+d.seed+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);});
$('#run').click();
