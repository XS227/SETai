const LEAD_AGENT_ADMIN_TOKEN = (typeof window.LA_TOKEN !== 'undefined') ? window.LA_TOKEN : '0227';

const OFFER_TEMPLATES = {
  bilvask:    { subject: 'Profesjonell nettside for din bilvask', cta: 'https://setai.no/tilbud/bilvask',
    message: 'Hei!\n\nVi har lagt merke til at dere ikke har en moderne nettside ennå.\n\nVi hjelper lokale bilvask-bedrifter med å få flere kunder via nett. Åpningstider, priser og bestilling — alt på ett sted.\n\nKan vi ta en kort prat?\n\nMvh\nKhabat — SETAEI' },
  frisor:     { subject: 'Mer kunder til din salong', cta: 'https://setai.no/tilbud/frisor',
    message: 'Hei!\n\nVi hjelper frisørsalonger med enkel online booking og nettsynlighet.\n\nIngen teknisk kompetanse kreves — vi setter opp alt.\n\nInteressert i en gratis demo?\n\nMvh\nKhabat — SETAEI' },
  restaurant: { subject: 'Få flere bordreservasjoner på nett', cta: 'https://setai.no/tilbud/restaurant',
    message: 'Hei!\n\nVi hjelper restauranter med å ta imot reservasjoner og vise meny på nett.\n\nRask oppsett, lokalt fokus, ingen bindingstid.\n\nVil du høre mer?\n\nMvh\nKhabat — SETAEI' },
  klinikk:    { subject: 'Enkel timebestilling for din klinikk', cta: 'https://setai.no/tilbud/klinikk',
    message: 'Hei!\n\nVi hjelper klinikker med digital timebestilling og synlighet på nett.\n\nKlientene kan booke 24/7 — uten at du trenger å svare telefon.\n\nTa kontakt for en gratis gjennomgang!\n\nMvh\nKhabat — SETAEI' }
};

const api = (path, options={}) => {
  const headers = {
    ...(options.headers || {}),
    'X-Lead-Agent-Token': LEAD_AGENT_ADMIN_TOKEN
  };
  return fetch(`api/${path}`, {...options, headers}).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || `API-feil (${r.status})`);
    return data;
  });
};

function statusBadge(status='new'){ return `<span class="badge status-${status}">${status}</span>`; }
const CMS_BADGES = {
  wordpress:   ['cms-wp',          'WordPress'],
  wix:         ['cms-wix',         'Wix'],
  shopify:     ['cms-shopify',     'Shopify'],
  squarespace: ['cms-squarespace', 'Squarespace'],
  webflow:     ['cms-webflow',     'Webflow'],
  other:       ['cms-other',       'Custom CMS'],
};

function cmsBadge(cms) {
  const [cls, label] = CMS_BADGES[cms] || [];
  return cls ? `<span class="badge ${cls}">${label}</span>` : '';
}

function websiteText(row) {
  if (!row.has_website && !row.website_url) return '<span class="muted-text">Ingen nettside</span>';
  const cms = (row.website_cms || '').toLowerCase();
  let badges = cmsBadge(cms);
  if (row.website_has_ssl === 0 || row.website_has_ssl === '0') badges += ' <span class="badge no-ssl">No SSL</span>';
  return `<a href="${row.website_url}" target="_blank" rel="noopener" class="btn-link">Se nettside</a> ${badges}`;
}
function emailBadge(row) {
  if (row.contact_email) return `<span class="badge email-yes" title="${row.contact_email}">${row.contact_email}</span>`;
  if (!row.website_url && row.research_status === 'no_contact') return '<span class="badge needs-manual">Needs manual</span>';
  return '<span class="badge email-no">No email</span>';
}

// --- Selection state ---
const selectedIds = new Set();
let leadsData = [];

function updateBulkBar() {
  const bar = document.getElementById('bulkBar');
  const cnt = document.getElementById('selectedCount');
  if (selectedIds.size > 0) {
    bar.style.display = 'flex';
    cnt.textContent = selectedIds.size + ' valgt';
  } else {
    bar.style.display = 'none';
  }
}

// --- Load leads with optional filters ---
async function loadLeads(filters={}) {
  const params = new URLSearchParams();
  if (filters.industry)    params.set('industry',    filters.industry);
  if (filters.city)        params.set('city',        filters.city);
  if (filters.min_score)   params.set('min_score',   filters.min_score);
  if (filters.has_email)   params.set('has_email',   filters.has_email);
  if (filters.has_website) params.set('has_website', filters.has_website);

  const qs = params.toString() ? '?' + params.toString() : '';
  const res = await api('list-leads.php' + qs);
  leadsData = res.leads || [];
  const tbody = document.getElementById('leadRows');
  tbody.innerHTML = leadsData.map(row => `
    <tr>
      <td><input type="checkbox" class="lead-check" data-id="${row.id}" ${selectedIds.has(row.id) ? 'checked' : ''} /></td>
      <td><span class="lead-name" onclick="openPreview(${row.id})">${row.company_name||''}</span></td><td>${row.industry_name||''}</td>
      <td>${row.city||''}</td>
      <td>${websiteText(row)}</td>
      <td>${emailBadge(row)}</td>
      <td>${row.contact_phone ? row.contact_phone : '<span class="muted-text">Ingen tlf</span>'}</td>
      <td>${row.lead_score ?? '-'}</td><td>${statusBadge(row.lead_status)}</td>
      <td class="row-actions">
        <button class="primary btn-sm" onclick="genEmail(${row.id})">AI Offer</button>
        <select class="status-select" onchange="updateStatus(${row.id},this.value);this.value=''">
          <option value="">Status…</option>
          <option value="approved">Godkjenn</option>
          <option value="rejected">Avvis</option>
          <option value="contacted">Kontaktet</option>
        </select>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.lead-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = parseInt(cb.dataset.id);
      if (cb.checked) selectedIds.add(id); else selectedIds.delete(id);
      syncSelectAll();
      updateBulkBar();
    });
  });

  syncSelectAll();
  updateBulkBar();
}

function syncSelectAll() {
  const all = document.querySelectorAll('.lead-check');
  const chk = document.getElementById('selectAll');
  if (!all.length) { chk.checked = false; chk.indeterminate = false; return; }
  const checkedCount = [...all].filter(c => c.checked).length;
  chk.checked = checkedCount === all.length;
  chk.indeterminate = checkedCount > 0 && checkedCount < all.length;
}

document.getElementById('selectAll').addEventListener('change', function() {
  document.querySelectorAll('.lead-check').forEach(cb => {
    const id = parseInt(cb.dataset.id);
    cb.checked = this.checked;
    if (this.checked) selectedIds.add(id); else selectedIds.delete(id);
  });
  updateBulkBar();
});

// --- Filters ---
function getFilters() {
  return {
    industry:    document.getElementById('filterIndustry').value,
    city:        document.getElementById('filterCity').value,
    min_score:   document.getElementById('filterMinScore').value,
    has_email:   document.getElementById('filterHasEmail').checked   ? 'yes' : '',
    has_website: document.getElementById('filterHasWebsite').checked ? 'yes' : ''
  };
}

async function populateFilterOptions() {
  try {
    const res = await api('filter-options.php');
    const indSel  = document.getElementById('filterIndustry');
    const citySel = document.getElementById('filterCity');
    (res.industries || []).forEach(v => {
      const o = document.createElement('option'); o.value = v; o.textContent = v; indSel.appendChild(o);
    });
    (res.cities || []).forEach(v => {
      const o = document.createElement('option'); o.value = v; o.textContent = v; citySel.appendChild(o);
    });
  } catch(e) { /* non-critical */ }
}

document.getElementById('applyFilters').addEventListener('click', () => loadLeads(getFilters()));
document.getElementById('clearFilters').addEventListener('click', () => {
  document.getElementById('filterIndustry').value   = '';
  document.getElementById('filterCity').value       = '';
  document.getElementById('filterMinScore').value   = '';
  document.getElementById('filterHasEmail').checked   = false;
  document.getElementById('filterHasWebsite').checked = false;
  loadLeads();
});

// --- Lead actions ---
async function researchLead(id) {
  const previewOpen = document.getElementById('previewPanel').classList.contains('open');
  const detail = document.getElementById('leadDetail');
  if (!previewOpen) detail.innerHTML = '<div class="notice">Henter data fra nettside…</div>';
  // If preview is open, show inline progress at top of preview body
  if (previewOpen) {
    const body = document.getElementById('previewBody');
    if (body && !document.getElementById('previewResearching')) {
      const banner = document.createElement('div');
      banner.id = 'previewResearching';
      banner.className = 'notice';
      banner.style.marginBottom = '12px';
      banner.textContent = 'Henter data fra nettside…';
      body.prepend(banner);
    }
  }
  try {
    const res = await api('research-lead.php', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({lead_id:id})});
    await loadLeads(getFilters());
    loadStats();
    if (previewOpen) {
      openPreview(id);
    } else {
      const f = res.found || {};
      const w = res.website || {};
      detail.innerHTML = `<div class="notice">
        <strong>Research fullført</strong> (score: ${res.score ?? '—'}) — status: ${res.status || '—'}<br>
        E-post: ${f.contact_email||'—'} &nbsp;|&nbsp; Tlf: ${f.contact_phone||'—'} &nbsp;|&nbsp; CMS: ${w.cms||'—'}
      </div>`;
      openPreview(id);
    }
  } catch(err) {
    const banner = document.getElementById('previewResearching');
    if (banner) banner.textContent = `Research feilet: ${err.message}`;
    else detail.innerHTML = `<div class="notice">Research feilet: ${err.message}</div>`;
  }
}

async function genEmail(id) {
  openPreview(id);
  await previewGenDraft(id);
}
async function updateStatus(id, status) {
  if (!status) return;
  try {
    await api('update-lead-status.php', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({lead_id:id,status})});
    document.getElementById('leadDetail').innerHTML = `<div class="notice">Status oppdatert til <strong>${status}</strong>.</div>`;
    loadLeads(getFilters());
    loadStats();
  } catch(err) {
    document.getElementById('leadDetail').innerHTML = `<div class="notice">Feil: ${err.message}</div>`;
  }
}

async function fetchBrreg(){
  const btn = document.getElementById('fetchBrreg');
  const detail = document.getElementById('leadDetail');
  const original = btn.textContent;
  btn.disabled = true; btn.textContent = 'Henter…';
  detail.innerHTML = '<div class="notice">Henter data fra Brreg…</div>';
  try {
    const payload={from_date:document.getElementById('fromDate').value,to_date:document.getElementById('toDate').value};
    const res=await api('brreg-fetch.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const leads = res.new_leads || [];
    const withWebsite = leads.filter(l => l.has_website || l.website_url).length;
    const withoutWebsite = leads.length - withWebsite;
    const needResearch = leads.filter(l => !l.contact_email && (l.has_website || l.website_url)).length;
    detail.innerHTML = `<div class="notice">
      <strong>Brreg-import fullfort</strong>${res.used_fallback_filtering ? ' (Fallback-filtrering aktiv)' : ''}<br>
      Importert: <strong>${res.imported||0}</strong> nye leads &nbsp;&bull;&nbsp;
      Fantes fra for: <strong>${res.existing||0}</strong><br>
      Med nettside: <strong>${withWebsite}</strong> &nbsp;&bull;&nbsp;
      Uten nettside: <strong>${withoutWebsite}</strong> &nbsp;&bull;&nbsp;
      Trenger research: <strong>${needResearch}</strong>
    </div>`;
    await loadLeads(getFilters());
    autoResearchLeads(res.new_leads || []);
  } catch (err) {
    detail.innerHTML = `<div class="notice">Feil ved Brreg-import: ${err.message || err}</div>`;
  } finally {
    btn.disabled = false; btn.textContent = original;
  }
}

async function importCsv(){
  const input = document.getElementById('csvFile');
  const file = input.files[0];
  if (!file) return alert('Velg CSV- eller XLSX-fil');
  try {
    const rows = await parseImportFile(file);
    if (!rows.length) { document.getElementById('leadDetail').innerHTML = '<div class="notice">Ingen rader funnet i filen.</div>'; return; }
    const leads = rows.map(normalizeLeadRow).filter((row) => row.org_number || row.company_name);
    if (!leads.length) { document.getElementById('leadDetail').innerHTML = '<div class="notice">Kunne ikke tolke kolonner. Sjekk at filen inneholder Brreg-felter.</div>'; return; }
    const source = file.name.toLowerCase().endsWith('.xlsx') ? 'xlsx_upload' : 'csv_upload';
    const res=await api('save-lead.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bulk:leads,source})});
    if (res.ok) {
      const newLeads = res.new_leads || [];
      const skipped  = res.existing || 0;
      const needResearch = newLeads.filter(l => !l.contact_email && (l.has_website || l.website_url)).length;
      document.getElementById('leadDetail').innerHTML = `<div class="notice">
        <strong>Import fullført</strong> fra ${file.name}<br>
        Nye leads: <strong>${res.saved||0}</strong>${skipped ? ` &nbsp;·&nbsp; allerede fantes: <strong>${skipped}</strong>` : ''}${needResearch ? ` &nbsp;·&nbsp; trenger research: <strong>${needResearch}</strong>` : ''}
      </div>`;
      await loadLeads(getFilters());
      autoResearchLeads(newLeads);
      return;
    }
    document.getElementById('leadDetail').innerHTML = `<div class="notice">Import feilet: ${res.error || 'ukjent feil'}</div><pre>${JSON.stringify(res,null,2)}</pre>`;
  } catch (err) {
    document.getElementById('leadDetail').innerHTML = `<div class="notice">Import feilet: ${err.message || err}</div>`;
  }
}

function normalizeHeader(header=''){ return header.toString().trim().toLowerCase().replace(/\s+/g,'_'); }
function normalizeLeadRow(row={}){ const normalized = {}; Object.entries(row).forEach(([key, value]) => { normalized[normalizeHeader(key)] = (value ?? '').toString().trim(); }); return { company_name: normalized.company_name || normalized.navn || normalized.foretaksnavn || '', org_number: normalized.org_number || normalized.organisasjonsnummer || '', organization_form: normalized.organization_form || normalized.organisasjonsform || normalized.organisasjonsform_beskrivelse || '', industry_name: normalized.industry_name || normalized.naering || normalized.naeringskode_beskrivelse || normalized.naeringsbeskrivelse || '', city: normalized.city || normalized.forretningsadresse_poststed || normalized.poststed || '', county: normalized.county || normalized.fylke || '', registration_date: normalized.registration_date || normalized.registreringsdatoenhetsregisteret || normalized.registreringsdato || '' }; }
async function parseImportFile(file){ if (file.name.toLowerCase().endsWith('.xlsx')) { if (!window.XLSX) throw new Error('XLSX-bibliotek ikke lastet.'); const buffer = await file.arrayBuffer(); const workbook = window.XLSX.read(buffer, {type:'array'}); const firstSheet = workbook.SheetNames[0]; if (!firstSheet) return []; return window.XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {defval:''}); } if (file.name.toLowerCase().endsWith('.csv')) { const text = await file.text(); const rows = text.trim().split(/\r?\n/).map(r=>r.split(',')); const headers = (rows.shift() || []).map(h=>h.trim()); return rows.filter((cols) => cols.some((v) => v && v.trim())).map(cols => Object.fromEntries(headers.map((h,i)=>[h, (cols[i]||'').trim()]))); } throw new Error('Ugyldig filtype. Støtter kun .csv og .xlsx'); }

function setDefaultDates(){
  const from = document.getElementById('fromDate');
  const to   = document.getElementById('toDate');
  const today = new Date(), monthAgo = new Date();
  monthAgo.setDate(today.getDate() - 30);
  to.value   = today.toISOString().slice(0,10);
  from.value = monthAgo.toISOString().slice(0,10);
}

// --- Auto research after Brreg import ---
async function autoResearchLeads(leads) {
  if (!leads || !leads.length) return;
  const toResearch = leads.filter(l => l.id);
  if (!toResearch.length) return;

  // Inject a persistent progress card above the leads section
  let progWrap = document.getElementById('autoResearchProgress');
  if (!progWrap) {
    progWrap = document.createElement('div');
    progWrap.id = 'autoResearchProgress';
    progWrap.className = 'card';
    progWrap.style.cssText = 'margin-bottom:12px;padding:14px 18px';
    const leadsSection = document.getElementById('leads');
    leadsSection.parentNode.insertBefore(progWrap, leadsSection);
  }

  const results = { found_email: 0, found_website: 0, no_contact: 0, errors: 0 };
  let done = 0;

  for (const lead of toResearch) {
    const pct = Math.round((done / toResearch.length) * 100);
    progWrap.innerHTML = `
      <strong>Auto-research ${done}/${toResearch.length}</strong> — ${lead.company_name || '#' + lead.id}…
      <div class="progress-bar-wrap" style="margin:8px 0 0"><div class="progress-bar" style="width:${pct}%"></div></div>
    `;
    try {
      const res = await api('research-lead.php', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({lead_id: lead.id})
      });
      const st = res.cached ? (res.status || 'cached') : (res.status || 'no_contact');
      if (st === 'found_email')        results.found_email++;
      else if (st === 'found_website') results.found_website++;
      else                             results.no_contact++;
    } catch(e) { results.errors++; }
    done++;
    if (done % 5 === 0 || done === toResearch.length) await loadLeads(getFilters());
  }

  await loadLeads(getFilters());
  loadStats();
  progWrap.innerHTML = `
    <strong>Auto-research ferdig</strong> &mdash; ${done} av ${toResearch.length} leads prosessert<br>
    <span style="font-size:13px">
      E-post funnet: <strong style="color:var(--success)">${results.found_email}</strong> &nbsp;|&nbsp;
      Nettside funnet: <strong style="color:var(--primary)">${results.found_website}</strong> &nbsp;|&nbsp;
      Ingen kontakt: <strong style="color:var(--muted)">${results.no_contact}</strong>
      ${results.errors ? ` &nbsp;|&nbsp; Feil: <strong style="color:var(--danger)">${results.errors}</strong>` : ''}
    </span>
  `;
  setTimeout(() => { if (progWrap.parentNode) progWrap.parentNode.removeChild(progWrap); }, 60000);
}

// --- Bulk research ---
async function bulkResearch() {
  const ids = [...selectedIds];
  if (!ids.length) return;
  const detail = document.getElementById('leadDetail');
  const btn    = document.getElementById('btnResearchSelected');
  btn.disabled = true;

  const results = { found_email: 0, found_website: 0, no_contact: 0, errors: 0 };

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const lead = leadsData.find(l => l.id === id);
    const name = lead ? lead.company_name : `#${id}`;
    detail.innerHTML = `<div class="notice">Research ${i + 1}/${ids.length}: ${name}…</div>`;
    try {
      const res = await api('research-lead.php', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({lead_id:id})});
      const status = res.cached ? (res.status || 'cached') : (res.status || 'no_contact');
      if (status === 'found_email')   results.found_email++;
      else if (status === 'found_website') results.found_website++;
      else results.no_contact++;
    } catch(e) {
      results.errors++;
    }
  }

  loadLeads(getFilters());
  loadStats();
  btn.disabled = false;
  detail.innerHTML = `<div class="notice">
    <strong>Bulk research fullført — ${ids.length} leads</strong><br>
    E-post funnet: ${results.found_email} &nbsp;|&nbsp;
    Nettside funnet: ${results.found_website} &nbsp;|&nbsp;
    Ingen kontakt: ${results.no_contact}
    ${results.errors ? ` &nbsp;|&nbsp; Feil: ${results.errors}` : ''}
  </div>`;
}

// --- Send tilbud modal ---
function openSendModal() {
  const ids      = [...selectedIds];
  if (!ids.length) return;
  const selected  = leadsData.filter(l => ids.includes(l.id));
  const withEmail = selected.filter(l => l.contact_email && l.contact_email.includes('@'));
  const noEmail   = selected.filter(l => !l.contact_email || !l.contact_email.includes('@'));

  const recDiv = document.getElementById('modalRecipients');
  let html = `<p><strong>${withEmail.length}</strong> vil motta e-post. <strong>${noEmail.length}</strong> hoppes over (ingen e-post).</p>`;
  html += selected.map(l => {
    const warn = l.contact_email ? '' : ' <em style="color:var(--warning)">(ingen e-post)</em>';
    return `<div>${l.company_name || l.org_number}${warn}</div>`;
  }).join('');
  recDiv.innerHTML = html;

  const sendBtn = document.getElementById('modalSend');
  sendBtn.disabled = withEmail.length === 0;

  document.getElementById('offerTemplate').value   = '';
  document.getElementById('offerConfirm').checked  = false;
  document.getElementById('modalStatus').textContent = '';
  document.getElementById('sendProgress').style.display = 'none';
  document.getElementById('sendProgressBar').style.width = '0%';
  // Pre-fill from last generated draft if available
  const draft = window._lastDraft || {};
  document.getElementById('offerSubject').value = draft.subject || '';
  document.getElementById('offerMessage').value = draft.body    || '';
  document.getElementById('offerCta').value     = draft.cta_url || '';
  document.getElementById('modalOverlay').style.display = 'flex';
}

function closeSendModal() {
  document.getElementById('modalOverlay').style.display = 'none';
}

async function sendOffer() {
  const subject   = document.getElementById('offerSubject').value.trim();
  const message   = document.getElementById('offerMessage').value.trim();
  const cta_link  = document.getElementById('offerCta').value.trim();
  const confirmed = document.getElementById('offerConfirm').checked;
  const statusEl  = document.getElementById('modalStatus');
  const progressEl = document.getElementById('sendProgress');
  const progressBar = document.getElementById('sendProgressBar');
  const progressText = document.getElementById('sendProgressText');

  if (!subject || !message) { statusEl.textContent = 'Emne og melding er påkrevd.'; return; }
  if (!confirmed)           { statusEl.textContent = 'Bekreft at utsendingen er gjennomgått.'; return; }

  const btn = document.getElementById('modalSend');
  btn.disabled = true; btn.textContent = 'Sender…';
  statusEl.textContent = '';

  const MAX_BATCH = 10;
  const DELAY_MS  = 3000;
  const allIds    = [...selectedIds];

  // Split into batches of MAX_BATCH
  const batches = [];
  for (let i = 0; i < allIds.length; i += MAX_BATCH) batches.push(allIds.slice(i, i + MAX_BATCH));

  progressEl.style.display = 'block';
  progressBar.style.width  = '0%';

  const totals = { sent: 0, skipped: 0, failed: 0 };

  for (let b = 0; b < batches.length; b++) {
    progressText.textContent = `Sender batch ${b + 1} / ${batches.length}…`;
    progressBar.style.width  = Math.round((b / batches.length) * 100) + '%';
    try {
      const res = await api('send-offers.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({subject, message, cta_link, lead_ids: batches[b]})
      });
      totals.sent    += res.sent    || 0;
      totals.skipped += res.skipped || 0;
      totals.failed  += res.failed  || 0;
    } catch(err) {
      statusEl.innerHTML += `<br><span style="color:var(--danger)">Batch ${b + 1} feilet: ${err.message}</span>`;
    }
    if (b < batches.length - 1) {
      progressText.textContent = `Venter 3 s før neste batch…`;
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  progressBar.style.width  = '100%';
  progressText.textContent = 'Ferdig.';
  statusEl.innerHTML = `<span style="color:var(--success)">Sendt til <strong>${totals.sent}</strong> mottaker(e).${totals.skipped ? ` ${totals.skipped} hoppet over.` : ''}${totals.failed ? ` <span style="color:var(--danger)">${totals.failed} feilet.</span>` : ''}</span>`;
  btn.disabled = false; btn.textContent = 'Send';
  selectedIds.clear();
  updateBulkBar();
  loadLeads(getFilters());
  loadStats();
}

document.getElementById('btnResearchSelected').addEventListener('click', bulkResearch);
document.getElementById('btnSendTilbud').addEventListener('click', openSendModal);
document.getElementById('modalCancel').addEventListener('click', closeSendModal);
document.getElementById('modalSend').addEventListener('click', sendOffer);
document.getElementById('modalOverlay').addEventListener('click', (e) => { if (e.target === document.getElementById('modalOverlay')) closeSendModal(); });
document.getElementById('offerTemplate').addEventListener('change', function() {
  const tpl = OFFER_TEMPLATES[this.value];
  if (!tpl) return;
  document.getElementById('offerSubject').value = tpl.subject;
  document.getElementById('offerMessage').value = tpl.message;
  document.getElementById('offerCta').value     = tpl.cta;
});


// --- Stats bar ---
async function loadStats() {
  try {
    const res = await api('stats.php');
    const s = res.stats || {};
    document.getElementById('sTotal').textContent      = s.total        ?? '—';
    document.getElementById('sEmail').textContent      = s.with_email   ?? '—';
    document.getElementById('sWebsite').textContent    = s.with_website ?? '—';
    document.getElementById('sResearched').textContent = s.researched   ?? '—';
    document.getElementById('sReady').textContent      = s.ready        ?? '—';
    document.getElementById('sSent').textContent       = s.sent         ?? '—';
    document.getElementById('sOpened').textContent     = s.opened       ?? '—';
    document.getElementById('sClicked').textContent    = s.clicked      ?? '—';
  } catch(e) { /* non-critical */ }
}

// --- Preview panel ---
function openPreview(id) {
  const lead = leadsData.find(l => l.id === id);
  if (!lead) return;

  const flags    = (() => { try { return JSON.parse(lead.website_flags || '{}'); } catch(e) { return {}; } })();
  const resNotes = (() => { try { return JSON.parse(lead.research_notes || '{}'); } catch(e) { return {}; } })();
  const cms      = (lead.website_cms || '').toLowerCase();
  const siteStatus = resNotes.site_status || 'active';

  const sslBadge    = lead.website_url ? (lead.website_has_ssl == 1 ? '<span class="badge" style="background:#e2f8ec;color:#10613a">SSL ✓</span>' : '<span class="badge no-ssl">No SSL</span>') : '';
  const mobileBadge = flags.mobile_friendly ? '<span class="badge" style="background:#e7efff;color:#2754b7">Mobil</span>' : '';
  const bookingBadge = flags.has_booking    ? '<span class="badge" style="background:#f0ebff;color:#5b21b6">Booking</span>' : '';

  // Build detected issues list
  const issues = [];
  if (!lead.has_website && !lead.website_url) issues.push('Ingen nettside funnet');
  else if (siteStatus === 'parked') issues.push('Domenet er parkert — ingen aktiv nettside');
  else if (siteStatus === 'under_construction') issues.push('Siden er under utbygging');
  if (lead.website_url && lead.website_has_ssl != 1) issues.push('Mangler SSL (Google-rangering påvirkes)');
  if (cms && ['wordpress', 'wix'].includes(cms)) issues.push(`Bruker ${CMS_BADGES[cms]?.[1] || cms} — utdatert plattform`);
  if (lead.website_url && flags.has_booking === false) issues.push('Ingen online booking funnet');
  if (!lead.contact_email) issues.push('Ingen e-postadresse funnet');
  else if (/gmail\.|hotmail\.|yahoo\./i.test(lead.contact_email)) issues.push('Bruker gratis e-post (Gmail/Hotmail) — ikke profesjonelt');
  if (!lead.contact_phone) issues.push('Ingen telefon registrert');

  let html = `
    <div class="preview-section">
      <h4>Selskap</h4>
      <div class="preview-field" style="font-size:16px;font-weight:700">${lead.company_name || '—'}</div>
      <div class="preview-field" style="color:var(--muted);font-size:12px">
        ${lead.org_number ? 'Org.nr ' + lead.org_number : ''}${lead.organization_form ? ' · ' + lead.organization_form : ''}${lead.registration_date ? ' · Reg. ' + lead.registration_date : ''}
      </div>
      <div class="preview-field">${lead.industry_name || '—'}${lead.city ? ' · ' + lead.city : ''}</div>
      <div class="preview-field">Prioritet: <strong>${lead.lead_score ?? '—'}</strong> &nbsp; ${statusBadge(lead.lead_status)}</div>
    </div>

    <div class="preview-section">
      <h4>Kontakt</h4>
      <div class="preview-field">
        ${lead.contact_email ? `<a href="mailto:${lead.contact_email}">${lead.contact_email}</a>` : '<span style="color:var(--muted)">Ingen e-post funnet</span>'}
      </div>
      <div class="preview-field">
        ${lead.contact_phone ? `<a href="tel:${lead.contact_phone}">${lead.contact_phone}</a>` : '<span style="color:var(--muted)">Ingen telefon funnet</span>'}
      </div>
    </div>

    <div class="preview-section">
      <h4>Nettside</h4>
      <div class="preview-field">
        ${lead.website_url
          ? `<a href="${lead.website_url}" target="_blank" rel="noopener">${lead.website_url}</a>${siteStatus !== 'active' ? ` <span class="badge" style="background:#fff3dc;color:#916001;font-size:10px">${siteStatus}</span>` : ''}`
          : '<span style="color:var(--muted)">Ingen nettside registrert</span>'}
      </div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px">
        ${cmsBadge(cms)} ${sslBadge} ${mobileBadge} ${bookingBadge}
      </div>
    </div>`;

  if (issues.length) {
    html += `<div class="preview-section">
      <h4>Identifiserte behov</h4>
      ${issues.map(i => `<div class="preview-field" style="color:var(--warning);font-size:12px">▸ ${i}</div>`).join('')}
    </div>`;
  }

  if (lead.facebook_url || lead.instagram_url) {
    html += `<div class="preview-section">
      <h4>Sosiale medier</h4>
      ${lead.facebook_url  ? `<div class="preview-field"><a href="${lead.facebook_url}"  target="_blank" rel="noopener">Facebook</a></div>`  : ''}
      ${lead.instagram_url ? `<div class="preview-field"><a href="${lead.instagram_url}" target="_blank" rel="noopener">Instagram</a></div>` : ''}
    </div>`;
  }

  const guessedDomains = resNotes.guessed_domains || [];
  const foundDomain    = resNotes.found_domain || '';
  const searchHints    = resNotes.search_hints || [];
  if (lead.research_status || lead.researched_at || guessedDomains.length || searchHints.length) {
    html += `<div class="preview-section">
      <h4>Research</h4>
      ${lead.researched_at ? `<div class="preview-field" style="font-size:12px;color:var(--muted)">Sist researched: ${(lead.researched_at||'').slice(0,16)}</div>` : ''}
      ${lead.research_status ? `<div class="preview-field">Status: <strong>${lead.research_status}</strong></div>` : ''}
      ${guessedDomains.length ? `<div class="preview-field" style="font-size:12px;color:var(--muted)">Forsøkte domener: ${guessedDomains.join(', ')}</div>` : ''}
      ${foundDomain ? `<div class="preview-field" style="font-size:12px">Fant domene: <strong>${foundDomain}</strong></div>` : ''}
      ${searchHints.length ? `<div class="preview-field" style="font-size:12px">Søk: ${searchHints.map(h => `<a href="https://www.google.com/search?q=${encodeURIComponent(h)}" target="_blank" rel="noopener">${h}</a>`).join(' | ')}</div>` : ''}
    </div>`;
  }

  html += `<div class="preview-section">
    <h4>Handlinger</h4>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="secondary btn-sm" onclick="researchLead(${id})">Research</button>
      <button class="primary btn-sm" id="btnPreviewDraft" onclick="previewGenDraft(${id})">Generer AI Offer</button>
      ${lead.contact_email ? `<button class="warn btn-sm" onclick="quickSend(${id})">Send tilbud</button>` : ''}
    </div>
  </div>

  <div class="preview-section" id="previewDraftSection" style="display:none">
    <h4>E-postutkast</h4>
    <div class="preview-draft" id="previewDraftBody"></div>
    <div id="previewDraftActions" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px"></div>
  </div>`;

  document.getElementById('previewTitle').textContent = lead.company_name || 'Lead';
  document.getElementById('previewBody').innerHTML = html;
  document.getElementById('previewPanel').classList.add('open');
  document.getElementById('previewOverlay').classList.add('open');
}

function closePreview() {
  document.getElementById('previewPanel').classList.remove('open');
  document.getElementById('previewOverlay').classList.remove('open');
}

async function previewGenDraft(id) {
  const btn       = document.getElementById('btnPreviewDraft');
  const draftSec  = document.getElementById('previewDraftSection');
  if (btn) { btn.disabled = true; btn.textContent = 'Genererer…'; }
  try {
    const res = await api('generate-email.php', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({lead_id:id, tone:'vennlig'})});
    window._lastDraft = { subject: res.subject, body: res.body, cta_url: res.cta_url, draft_id: res.draft_id, ai_used: !!res.ai_used };
    renderDraftEditor(id, {
      draft_id: res.draft_id, subject: res.subject || '', body: res.body || '',
      cta_url: res.cta_url || '', ai_used: !!res.ai_used,
      sales_argument: res.sales_argument || ''
    });
    if (draftSec)  draftSec.style.display = 'block';
    loadLeads(getFilters());
    loadStats();
  } catch(err) {
    const draftBody = document.getElementById('previewDraftBody');
    if (draftBody) draftBody.textContent = `Feil: ${err.message}`;
    if (draftSec)  draftSec.style.display = 'block';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Regenerer AI Offer'; }
  }
}

function renderDraftEditor(leadId, d) {
  const draftBody = document.getElementById('previewDraftBody');
  const draftActs = document.getElementById('previewDraftActions');
  if (!draftBody || !draftActs) return;
  const lead = leadsData.find(l => l.id === leadId);
  const hasEmail = !!(lead?.contact_email);
  const bodyText = `Emne: ${d.subject}\n\n${d.body}`;
  const aiBadge = d.ai_used
    ? '<span class="badge" style="background:#e7efff;color:#2754b7;font-size:10px">AI</span>'
    : '<span class="badge" style="background:#f3f3f3;color:#666;font-size:10px">Mal</span>';
  const salesBlock = d.sales_argument
    ? `<div style="background:#fffaf0;border-left:3px solid #f0b020;padding:8px 12px;margin-bottom:10px;font-size:12px;color:#705100"><strong>Salgsargument:</strong> ${escapeHtml(d.sales_argument)}</div>`
    : '';
  draftBody.innerHTML = `
    ${salesBlock}
    <div style="margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;gap:8px">
      <span style="font-size:11px;color:var(--muted)">Utkast #${d.draft_id} ${aiBadge}</span>
      <button class="btn-link" id="btnDraftEditToggle" onclick="toggleDraftEdit(${leadId}, ${d.draft_id})">Rediger</button>
    </div>
    <div id="draftReadView" style="white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;background:#fafafa;border:1px solid #eee;padding:10px;border-radius:6px;font-size:13px">${escapeHtml(bodyText)}</div>
    <div id="draftEditView" style="display:none">
      <label style="font-size:11px;color:var(--muted);margin-top:6px;display:block">Emne</label>
      <input id="draftEditSubject" type="text" value="${escapeAttr(d.subject)}" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:13px" />
      <label style="font-size:11px;color:var(--muted);margin-top:8px;display:block">Melding</label>
      <textarea id="draftEditBody" rows="14" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:13px;font-family:ui-monospace,Menlo,Consolas,monospace">${escapeHtml(d.body)}</textarea>
      <label style="font-size:11px;color:var(--muted);margin-top:8px;display:block">CTA-lenke</label>
      <input id="draftEditCta" type="url" value="${escapeAttr(d.cta_url)}" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:13px" />
    </div>
  `;
  const mailtoLink = hasEmail
    ? `mailto:${encodeURIComponent(lead.contact_email)}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`
    : '';
  draftActs.innerHTML = `
    <button class="secondary btn-sm" id="btnCopyDraft" onclick='copyText(${JSON.stringify(bodyText)}, this)'>Kopier</button>
    ${hasEmail ? `<a class="secondary btn-sm" id="btnMailto" href="${mailtoLink}" target="_blank">Åpne i e-post</a>` : ''}
    <button class="secondary btn-sm" id="btnSaveDraft" onclick="saveDraftEdits(${leadId}, ${d.draft_id})" style="display:none">Lagre endringer</button>
    <a class="btn-link" href="drafts.html" target="_blank">Alle utkast</a>
    ${hasEmail
      ? `<button class="primary btn-sm" id="btnSendDraftNow" onclick="sendDraftNow(${d.draft_id}, ${leadId})">Send til ${lead.contact_email}</button>`
      : '<span style="color:var(--muted);font-size:12px">Ingen e-post — kan ikke sende</span>'}
  `;
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s){ return escapeHtml(s).replace(/\n/g,'&#10;'); }

function toggleDraftEdit(leadId, draftId) {
  const readView = document.getElementById('draftReadView');
  const editView = document.getElementById('draftEditView');
  const toggleBtn = document.getElementById('btnDraftEditToggle');
  const saveBtn   = document.getElementById('btnSaveDraft');
  if (!readView || !editView) return;
  const editing = editView.style.display !== 'none';
  if (editing) {
    editView.style.display = 'none';
    readView.style.display = 'block';
    if (toggleBtn) toggleBtn.textContent = 'Rediger';
    if (saveBtn)   saveBtn.style.display = 'none';
  } else {
    editView.style.display = 'block';
    readView.style.display = 'none';
    if (toggleBtn) toggleBtn.textContent = 'Avbryt';
    if (saveBtn)   saveBtn.style.display = 'inline-block';
  }
}

async function saveDraftEdits(leadId, draftId) {
  const subject = document.getElementById('draftEditSubject').value.trim();
  const body    = document.getElementById('draftEditBody').value.trim();
  const cta_url = document.getElementById('draftEditCta').value.trim();
  const saveBtn = document.getElementById('btnSaveDraft');
  if (!subject || !body) { alert('Emne og melding er påkrevd.'); return; }
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Lagrer…'; }
  try {
    await api('update-draft.php', {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({draft_id: draftId, subject, body, cta_link: cta_url})});
    window._lastDraft = { subject, body, cta_url, draft_id: draftId };
    renderDraftEditor(leadId, {draft_id: draftId, subject, body, cta_url, ai_used: !!(window._lastDraft?.ai_used), sales_argument: ''});
  } catch(e) {
    alert('Lagring feilet: ' + e.message);
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Lagre endringer'; }
  }
}

function copyText(text, btn) {
  const copy = () => {
    if (navigator.clipboard) return navigator.clipboard.writeText(text);
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(ta);
    return Promise.resolve();
  };
  copy().then(() => {
    if (btn) { const orig = btn.textContent; btn.textContent = 'Kopiert!'; setTimeout(() => { btn.textContent = orig; }, 1500); }
  });
}

async function sendDraftNow(draftId, leadId) {
  const btn = document.getElementById('btnSendDraftNow');
  if (btn) { btn.disabled = true; btn.textContent = 'Sender…'; }
  try {
    const res = await api('send-draft.php', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({draft_id: draftId})});
    if (res.ok) {
      if (btn) { btn.textContent = 'Sendt ✓'; btn.className = 'secondary btn-sm'; }
      loadStats();
      await loadLeads(getFilters());
      openPreview(leadId);
    } else {
      alert('Sendfeil: ' + (res.error || 'Ukjent feil'));
      if (btn) { btn.disabled = false; btn.textContent = 'Send nå'; }
    }
  } catch(e) {
    alert('Sendfeil: ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Send nå'; }
  }
}

function quickSend(id) {
  const lead = leadsData.find(l => l.id === id);
  if (!lead) return;
  selectedIds.clear(); selectedIds.add(id); updateBulkBar();
  openSendModal();
}

// --- Export leads CSV ---
async function exportLeads() {
  const filters = getFilters();
  const params  = new URLSearchParams();
  if (filters.industry)    params.set('industry',    filters.industry);
  if (filters.city)        params.set('city',        filters.city);
  if (filters.min_score)   params.set('min_score',   filters.min_score);
  if (filters.has_email)   params.set('has_email',   filters.has_email);
  if (filters.has_website) params.set('has_website', filters.has_website);

  try {
    const response = await fetch('api/export-leads.php?' + params.toString(), {
      headers: { 'X-Lead-Agent-Token': LEAD_AGENT_ADMIN_TOKEN }
    });
    if (!response.ok) throw new Error('Export feilet');
    const blob = await response.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'setaei-leads-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch(err) {
    alert('Export feilet: ' + err.message);
  }
}

// --- Init ---
function pageInit() {
  document.getElementById('fetchBrreg').addEventListener('click', fetchBrreg);
  document.getElementById('importCsv').addEventListener('click', importCsv);
  document.getElementById('btnExport').addEventListener('click', exportLeads);
  document.getElementById('previewClose').addEventListener('click', closePreview);
  document.getElementById('previewOverlay').addEventListener('click', closePreview);

  setDefaultDates();
  populateFilterOptions();
  loadLeads();
  loadStats();
}

if (typeof window.LA_READY !== 'undefined') {
  window.LA_READY.then(pageInit);
} else {
  document.addEventListener('DOMContentLoaded', pageInit);
}

window.researchLead    = researchLead;
window.genEmail        = genEmail;
window.updateStatus    = updateStatus;
window.bulkResearch    = bulkResearch;
window.openPreview     = openPreview;
window.closePreview    = closePreview;
window.previewGenDraft = previewGenDraft;
window.copyText        = copyText;
window.sendDraftNow    = sendDraftNow;
window.quickSend       = quickSend;
window.toggleDraftEdit = toggleDraftEdit;
window.saveDraftEdits  = saveDraftEdits;
