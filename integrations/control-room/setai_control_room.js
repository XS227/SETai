(()=>{'use strict';
const $=id=>document.getElementById(id);
const number=new Intl.NumberFormat('nb-NO');
const NS='http://www.w3.org/2000/svg';
const known=[
  {id:'setaei',name:'SETAEI',domain:'setai.no',abbr:'ST',tone:'gold',google:true,website:'https://setai.no/',desc:'Byrå · SEO, AI og markedsføring'},
  {id:'bilvaskexpress',name:'Bilvaskexpress AS',domain:'bilvaskexpress.no',abbr:'BV',tone:'blue',google:true,website:'https://bilvaskexpress.no/',desc:'Bilvask · Lokal synlighet'},
  {id:'somi',name:'SOMI Klinikken',domain:'somiklinikken.no',abbr:'SO',tone:'',google:false,website:'https://somiklinikken.no/',desc:'Klinikk · SEO og organisk synlighet'},
  {id:'volla',name:'Volla Byggmester',domain:'vollabyggmester.no',abbr:'VO',tone:'',google:false,website:'https://vollabyggmester.no/',desc:'Bygg · Lokal SEO'},
  {id:'styrk',name:'STYRK Karriere',domain:'styrk-karriere.no',abbr:'SK',tone:'',google:false,website:'https://styrk-karriere.no/',desc:'Karriere · SEO og innhold'}
];
const state={view:'overview',days:30,client:'setaei',profile:'',loaded:{},loading:false};
function el(tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n}
function add(parent,...children){for(const c of children)if(c)parent.appendChild(c);return parent}
function fmt(v){return Number.isFinite(Number(v))&&v!==null&&v!==undefined?number.format(Number(v)):'—'}
function sum(o,keys){let total=0,found=false;for(const k of keys){if(Object.prototype.hasOwnProperty.call(o||{},k)){found=true;total+=Number(o[k])||0}}return found?total:null}
function statusBadge(text,kind){return el('span','state '+kind,text)}
function setText(id,text){$(id).textContent=String(text)}
function labelFor(v){return({overview:'Oversikt',clients:'Kunder',seo:'SEO Intelligence',google:'Google Business',leads:'Leads & salg',projects:'Prosjekter',systems:'Systemer'})[v]||'Oversikt'}
function changeView(view){if(!document.querySelector('[data-panel="'+view+'"]'))view='overview';state.view=view;for(const p of document.querySelectorAll('[data-panel]'))p.hidden=p.dataset.panel!==view;
  for(const a of document.querySelectorAll('[data-view]')){let active=a.dataset.view===view;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')}
  setText('crumb-current',labelFor(view));$('sidebar').classList.remove('open');$('menu-toggle').setAttribute('aria-expanded','false');
  document.title='SETAEI Control Room — '+labelFor(view);if(view==='google')renderGoogle();window.scrollTo({top:0,behavior:'instant'});
}
function fromHash(){changeView((location.hash||'#overview').slice(1))}
function sourceCounts(){const out={ok:0,error:0};for(const c of ['setaei','bilvaskexpress']){const d=state.loaded[c];if(!d||!d.locations?.length)continue;for(const s of d.statuses||[])if(s.status==='ok')out.ok++;else if(s.status==='error')out.error++}return out}
function renderOverview(){
  let count=0,latest=[];for(const c of ['setaei','bilvaskexpress']){const d=state.loaded[c];if(d?.locations){count+=d.locations.length;if(d.updated_at)latest.push(d.updated_at)}}
  setText('kpi-profiles',latest.length?count:'—');setText('kpi-profiles-sub',latest.length?'SETAEI + Bilvaskexpress, hver profil separat':'Venter på API-svar');
  const s=sourceCounts();setText('kpi-sources',latest.length?s.ok+' OK':'—');setText('kpi-sources-sub',latest.length?(s.error?s.error+' kilde(r) med feil':'Ingen API-feil for valgt profil'):'Ytelse · søkeord · anmeldelser');
  setText('kpi-updated',latest.length?latest.sort().reverse()[0].slice(0,16).replace('T',' ')+' UTC':'—');
  const customers=$('overview-customers');customers.replaceChildren();for(const c of known){
    const row=el('a','customer-row');row.href=c.google?'#google':'#seo';row.addEventListener('click',()=>{if(c.google)state.client=c.id});
    const icon=el('span','customer-avatar '+c.tone,c.abbr);const mid=el('div');add(mid,el('span','customer-title',c.name),el('small','customer-caption',c.desc));
    const right=el('span','customer-right');const d=state.loaded[c.id];let badge=c.google?(d?.locations?.length?statusBadge('Google koblet','ok'):d?.error?statusBadge('Kontroller tilgang','error'):statusBadge('Venter på synk','awaiting')):statusBadge('SEO rapport','legacy');add(right,badge,el('span','', '↗'));add(row,icon,mid,right);customers.appendChild(row);
  }
  const sources=$('overview-sources');sources.replaceChildren();const any=latest.length>0;const err=s.error>0;
  add(sources,sourceRow('Google Business Profile',any?(err?'Delvis tilgjengelig':'Svar fra API'):'Kontrolleres',any?(err?'awaiting':'ok'):'awaiting'),
    sourceRow('Search Console-rapport','Eksisterende rapport','legacy'),sourceRow('Lead Agent','Separat tilgang','legacy'));
  setText('sync-indicator',any?'Google-data oppdatert':'Google-data kontrolleres');
}
function sourceRow(name,stateText,kind){const row=el('div','source-row');add(row,el('span','',name),statusBadge(stateText,kind));return row}
function clientCard(c){const d=state.loaded[c.id];const card=el('article','client-card');const top=el('div','client-card-top');
  add(top,el('span','customer-avatar '+c.tone,c.abbr),c.google?(d?.locations?.length?statusBadge('Google koblet','ok'):statusBadge(d?.error?'Google-feil':'Ikke bekreftet','awaiting')):statusBadge('SEO historikk','legacy'));card.append(top);
  add(card,el('h2','',c.name),el('p','',c.desc+' · '+c.domain));
  const actions=el('div','client-links');const google=c.google;const seo=el('a','mini-link','SEO →');seo.href='#seo';actions.append(seo);
  if(google){const gb=el('a','mini-link','Google Business →');gb.href='#google';gb.addEventListener('click',()=>{state.client=c.id;state.profile=''});actions.append(gb)}
  const page=el('a','mini-link','Nettside ↗');page.href=c.website;page.target='_blank';page.rel='noopener';actions.append(page);
  card.appendChild(actions);
  if(d?.locations?.length){card.append(el('p','quiet',d.locations.length+' Google-profil(er) · sist synkronisert '+(d.updated_at||'ukjent')))}
  return card;
}
function renderClients(){const query=($('client-search').value||'').trim().toLowerCase();const list=$('client-cards');list.replaceChildren();for(const c of known.filter(x=>(x.name+' '+x.domain+' '+x.desc).toLowerCase().includes(query)))list.append(clientCard(c));
  if(!list.childElementCount)list.append(el('p','quiet','Ingen kunder samsvarer med søket.'))}
function shownClient(){return state.loaded[state.client]}
function selectedProfile(){const d=shownClient();return d?.locations?.find(l=>l.id===d.selected)}
function setWarning(v){const p=$('google-warning');p.replaceChildren(el('span','', 'ⓘ'),el('span','',v));}
function blankGoogle(message){for(const id of ['g-search','g-maps','g-website','g-calls'])setText(id,'—');$('google-chart').replaceChildren(el('p','quiet',message));$('google-actions').replaceChildren();$('google-keywords').replaceChildren();$('google-sources').replaceChildren();setText('google-stamp','');setText('keyword-period','Månedlige søkeord');setWarning(message)}
function svgNode(tag,attrs={}){const n=document.createElementNS(NS,tag);for(const [key,val] of Object.entries(attrs))n.setAttribute(key,String(val));return n}
function renderChart(trend){const host=$('google-chart');host.replaceChildren();const rows=(trend||[]).filter(x=>x&&x.date).slice(-90);
  const series=[
    {keys:['BUSINESS_IMPRESSIONS_DESKTOP_SEARCH','BUSINESS_IMPRESSIONS_MOBILE_SEARCH'],color:'#e0af79'},
    {keys:['BUSINESS_IMPRESSIONS_DESKTOP_MAPS','BUSINESS_IMPRESSIONS_MOBILE_MAPS'],color:'#77a9d3'}
  ].map(s=>({color:s.color,points:rows.map(r=>sum(r,s.keys))}));
  const numbers=series.flatMap(s=>s.points).filter(v=>v!==null);
  if(!numbers.length){host.append(el('p','quiet','Google returnerte ikke daglige Search-/Maps-verdier for denne perioden.'));return}
  const svg=svgNode('svg',{viewBox:'0 0 830 300',role:'img','aria-label':'Daglige Search- og Maps-visninger'});const W=830,H=300,L=52,R=22,T=16,B=34,iw=W-L-R,ih=H-T-B;const max=Math.max(1,...numbers);
  for(let i=0;i<=4;i++){const y=T+ih*(1-i/4);svg.append(svgNode('line',{x1:L,y1:y,x2:W-R,y2:y,class:'grid-line'}));const tick=svgNode('text',{x:L-12,y:y+4,fill:'#718295','font-size':11,'text-anchor':'end'});tick.textContent=String(Math.round(max*i/4));svg.append(tick)}
  for(const seriesItem of series){let points=[];function flush(){if(points.length){svg.append(svgNode('polyline',{points:points.join(' '),stroke:seriesItem.color,'stroke-width':3,fill:'none','stroke-linecap':'round','stroke-linejoin':'round'}));points=[]}}
    seriesItem.points.forEach((val,i)=>{if(val===null){flush();return}const x=L+(rows.length<=1?iw/2:i*iw/(rows.length-1));const y=T+ih-(val/max)*ih;points.push(x.toFixed(2)+','+y.toFixed(2))});flush()}
  if(rows.length){for(const [x,txt,anch] of [[L,rows[0].date.slice(5),'start'],[W-R,rows[rows.length-1].date.slice(5),'end']]){const label=svgNode('text',{x,y:H-7,fill:'#718295','font-size':11,'text-anchor':anch});label.textContent=txt;svg.append(label)}}
  host.append(svg);
}
function renderGoogle(){const c=state.client||'setaei';$('google-client').value=c;const d=shownClient();const prof=$('google-profile');
  if(!d){prof.replaceChildren(new Option('Venter på Google API',''));blankGoogle('Henter Google-data.');return}
  if(d.error){prof.replaceChildren(new Option('Ingen profiler',''));blankGoogle('Kunne ikke hente privat Google API: '+d.error+'. Logg inn i Google-tilkobling hvis økten har utløpt.');return}
  if(!d.locations?.length){prof.replaceChildren(new Option('Ikke bekreftet',''));blankGoogle('Google har ikke returnert en autorisert profil for '+(c==='setaei'?'SETAEI':'Bilvaskexpress')+'.');return}
  const ids=d.locations.map(x=>x.id);const active=ids.includes(state.profile)?state.profile:d.selected||ids[0];prof.replaceChildren(...d.locations.map(x=>new Option(x.title+' · '+x.id.split('/').pop(),x.id)));prof.value=active;
  const current=d.selected===active?d:null;
  if(!current){setWarning('Laster valgt Google-profil …');loadGoogle(c,active);return}
  const note=[];if(d.locations.length>1)note.push(d.locations.length+' profiler er funnet. Tallene vises per profil, ikke summert, fordi profilene kan være duplikater.');
  if(d.statuses?.some(s=>s.status==='error'))note.push('En eller flere Google-datakilder svarer med feil; se datakildestatus.');
  if(!note.length)note.push('Ekte Google API-data. Visninger og klikk er ikke bekreftede kundehenvendelser.');
  setWarning(note.join(' '));
  const ss=d.summary||{};setText('g-search',fmt(sum(ss,['BUSINESS_IMPRESSIONS_DESKTOP_SEARCH','BUSINESS_IMPRESSIONS_MOBILE_SEARCH'])));setText('g-maps',fmt(sum(ss,['BUSINESS_IMPRESSIONS_DESKTOP_MAPS','BUSINESS_IMPRESSIONS_MOBILE_MAPS'])));
  setText('g-website',fmt(ss.WEBSITE_CLICKS));setText('g-calls',fmt(ss.CALL_CLICKS));renderChart(d.trend);
  const a=$('google-actions');a.replaceChildren();for(const [label,k] of [['Veibeskrivelser','BUSINESS_DIRECTION_REQUESTS'],['Nettsideklikk','WEBSITE_CLICKS'],['Telefonklikk','CALL_CLICKS']])a.append(sourceRow(label,fmt(ss[k]),'legacy'));
  setText('google-stamp',d.updated_at?'Sist oppdatert '+d.updated_at+' UTC · '+active:'Synkroniseringstid ikke tilgjengelig');
  setText('keyword-period',d.keyword_period?'Måned '+d.keyword_period+' · Søkeordvisninger, ikke Google-rangering':'Ingen månedsdata tilgjengelig');
  const kw=$('google-keywords');kw.replaceChildren();if(!d.keywords?.length){const tr=el('tr');const td=el('td','quiet','Google returnerte ingen søkeord for valgt måned.');td.colSpan=2;tr.append(td);kw.append(tr)}else for(const k of d.keywords.slice(0,100)){const tr=el('tr');const val=k.value!==null?fmt(k.value):(k.threshold!==null?'< '+fmt(k.threshold):'—');add(tr,el('td','',k.keyword),el('td','',val));kw.append(tr)}
  const st=$('google-sources');st.replaceChildren();if(!d.statuses?.length)st.append(el('span','quiet','Ingen kildestatus mottatt.'));else for(const x of d.statuses)st.append(sourceRow(x.source,x.status==='ok'?'OK':('Feil · '+(x.detail||'')),x.status==='ok'?'ok':'error'));
  const original=$('google-original');original.href='/seo/google/dashboard'+(c==='bilvaskexpress'?'?client=bilvaskexpress':'');
}
async function loadGoogle(client,profile){const u=new URL('/seo/google/api/dashboard',location.origin);u.searchParams.set('client',client);u.searchParams.set('days',String(state.days));if(profile)u.searchParams.set('location',profile);
  try{const res=await fetch(u,{credentials:'same-origin',cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);const data=await res.json();if(!data||!Array.isArray(data.locations))throw Error('Ugyldig API-svar');state.loaded[client]=data;if(client===state.client)state.profile=data.selected||''}
  catch(e){state.loaded[client]={error:e.message||'Ukjent feil',locations:[]}}
}
async function refresh(){if(state.loading)return;state.loading=true;setText('sync-indicator','Henter Google-data …');
  const wanted=state.client,profile=state.profile;await Promise.all([
    loadGoogle('setaei',wanted==='setaei'?profile:null),
    loadGoogle('bilvaskexpress',wanted==='bilvaskexpress'?profile:null)]);
  state.loading=false;renderOverview();renderClients();if(state.view==='google')renderGoogle();setText('shell-status','tilkoblet');
}
async function checkHealth(){try{const r=await fetch('/seo/google/health',{cache:'no-store'});const d=await r.json();if(!r.ok||d.service!=='setaei-google-business-profile-oauth'||d.status!=='up')throw Error('Feil status');
  setText('health-state','Operativ');$('health-state').className='big-state ok';setText('health-detail','Autentiseringstjenesten svarer korrekt. Ikke en test av hele VPS-en.')}
  catch(e){setText('health-state','Kontroller tilkobling');$('health-state').className='big-state error';setText('health-detail','Google OAuth helsesjekk kunne ikke bekreftes.')}}
function renderSystems(){const c=$('system-sources');c.replaceChildren();for(const client of known.filter(x=>x.google)){const d=state.loaded[client.id];c.append(sourceRow(client.name+' Google Business',d?.locations?.length?'Profiler hentet':d?.error?'API-feil':'Venter på tilgang',d?.locations?.length?'ok':d?.error?'error':'awaiting'))}
  c.append(sourceRow('Search Console','Eksisterende historikk','legacy'));c.append(sourceRow('Lead Agent','Egen tjeneste','legacy'));c.append(sourceRow('Google Reviews API','Se datakildestatus','awaiting'))}
function bootstrap(){window.addEventListener('hashchange',fromHash);fromHash();$('reload-button').addEventListener('click',()=>{refresh();checkHealth()});$('menu-toggle').addEventListener('click',()=>{const open=$('sidebar').classList.toggle('open');$('menu-toggle').setAttribute('aria-expanded',String(open))});
  $('client-search').addEventListener('input',renderClients);$('google-client').addEventListener('change',e=>{state.client=e.target.value;state.profile='';renderGoogle()});
  $('google-profile').addEventListener('change',e=>{state.profile=e.target.value;loadGoogle(state.client,state.profile).then(()=>renderGoogle())});
  for(const b of document.querySelectorAll('[data-days]'))b.addEventListener('click',()=>{state.days=Number(b.dataset.days);for(const x of document.querySelectorAll('[data-days]'))x.classList.toggle('active',x===b);refresh()});
  renderClients();renderSystems();refresh().then(renderSystems);checkHealth();
  for(const a of document.querySelectorAll('a[href="#google"]'))a.addEventListener('click',()=>{if(state.view==='google')renderGoogle()});
}
document.addEventListener('DOMContentLoaded',bootstrap);
})();