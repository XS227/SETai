const LEAD_AGENT_ADMIN_TOKEN = 'change-me-in-production';

const OFFER_TEMPLATES = {
  bilvask:    { subject: 'Profesjonell nettside for din bilvask', cta: 'https://setai.no/tilbud/bilvask',
    message: 'Hei!\n\nVi har lagt merke til at dere ikke har en moderne nettside ennå.\n\nVi hjelper lokale bilvask-bedrifter med å få flere kunder via nett. Åpningstider, priser og bestilling — alt på ett sted.\n\nKan vi ta en kort prat?\n\nMvh\nKhabat — SETAEI' },
  frisor:     { subject: 'Mer kunder til din salong', cta: 'https://setai.no/tilbud',
    message: 'Hei!\n\nVi hjelper frisørsalonger med enkel online booking og nettsynlighet.\n\nIngen teknisk kompetanse kreves — vi setter opp alt.\n\nInteressert i en gratis demo?\n\nMvh\nKhabat — SETAEI' },
  restaurant: { subject: 'Få flere bordreservasjoner på nett', cta: 'https://setai.no/tilbud',
    message: 'Hei!\n\nVi hjelper restauranter med å ta imot reservasjoner og vise meny på nett.\n\nRask oppsett, lokalt fokus, ingen bindingstid.\n\nVil du høre mer?\n\nMvh\nKhabat — SETAEI' },
  klinikk:    { subject: 'Enkel timebestilling for din klinikk', cta: 'https://setai.no/tilbud',
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
function websiteText(row) {
  if (!row.has_website) return 'Ingen';
  const cms = (row.website_cms || '').toLowerCase();
  let badges = '';
  if      (cms === 'wordpress') badges += ' <span class="badge cms-wp">WP</span>';
  else if (cms === 'wix')       badges += ' <span class="badge cms-wix">Wix</span>';
  else if (cms === 'shopify')   badges += ' <span class="badge cms-shopify">Shopify</span>';
  if (row.website_has_ssl === 0 || row.website_has_ssl === '0') badges += ' <span class="badge no-ssl">No SSL</span>';
  return 'Ja' + badges;
}
function emailBadge(row) {
  return row.contact_email
    ? `<span class="badge email-yes" title="${row.contact_email}">${row.contact_email}</span>`
    : '<span class="badge email-no">No email</span>';
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
      <td>${row.company_name||''}</td><td>${row.org_number||''}</td><td>${row.industry_name||''}</td>
      <td>${row.city||''}</td><td>${row.registration_date||''}</td><td>${websiteText(row)}</td>
      <td>${emailBadge(row)}</td>
      <td>${row.lead_score ?? '-'}</td><td>${statusBadge(row.lead_status)}</td>
      <td class="actions">
        <button class="secondary" onclick="researchLead(${row.id})">Research</button>
        <button class="primary" onclick="genEmail(${row.id})">Generate draft</button>
        <button class="warn" onclick="updateStatus(${row.id},'approved')">Approve</button>
        <button class="danger" onclick="updateStatus(${row.id},'rejected')">Reject</button>
        <button class="secondary" onclick="updateStatus(${row.id},'contacted')">Mark contacted</button>
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
  const detail = document.getElementById('leadDetail');
  detail.innerHTML = '<div class="notice">Henter data fra nettside…</div>';
  try {
    const res = await api('research-lead.php', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({lead_id:id})});
    if (res.cached) {
      detail.innerHTML = `<div class="notice">Allerede researched nylig. E-post: ${res.email||'—'}</div>`;
    } else {
      const f = res.found || {};
      const w = res.website || {};
      const flags = w.flags || {};
      detail.innerHTML = `<div class="notice">
        <strong>Research fullført</strong> (score: ${res.score ?? '—'})<br>
        E-post: ${f.contact_email||'—'} &nbsp;|&nbsp; Tlf: ${f.contact_phone||'—'}<br>
        CMS: ${w.cms||'—'} &nbsp;|&nbsp; SSL: ${w.has_ssl ? '✓' : '✗'} &nbsp;|&nbsp;
        Mobiloptimert: ${flags.mobile_friendly ? '✓' : '✗'} &nbsp;|&nbsp; Booking: ${flags.has_booking ? '✓' : '✗'}
      </div>`;
    }
    loadLeads(getFilters());
  } catch(err) {
    detail.innerHTML = `<div class="notice">Research feilet: ${err.message}</div>`;
  }
}

async function genEmail(id){ const res = await api('generate-email.php', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({lead_id:id, tone:'vennlig'})}); document.getElementById('leadDetail').innerHTML = `<h4>${res.subject||''}</h4><pre>${res.body||''}</pre>`; loadLeads(getFilters()); }
async function updateStatus(id,status){ const res = await api('update-lead-status.php', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({lead_id:id,status})}); document.getElementById('leadDetail').innerHTML = `<pre>${JSON.stringify(res, null, 2)}</pre>`; loadLeads(getFilters()); }

async function fetchBrreg(){
  const btn = document.getElementById('fetchBrreg');
  const detail = document.getElementById('leadDetail');
  const original = btn.textContent;
  btn.disabled = true; btn.textContent = 'Henter…';
  detail.innerHTML = '<div class="notice">Henter data fra Brreg…</div>';
  try {
    const payload={from_date:document.getElementById('fromDate').value,to_date:document.getElementById('toDate').value};
    const res=await api('brreg-fetch.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    detail.innerHTML = `<div class="notice">Importert ${res.imported||0} nye leads. ${res.existing||0} fantes fra før.${res.used_fallback_filtering ? ' (Fallback-filtrering aktiv)' : ''}</div><pre>${JSON.stringify(res.new_leads||[],null,2)}</pre>`;
    await loadLeads(getFilters());
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
    if (res.ok) { document.getElementById('leadDetail').innerHTML = `<div class="notice">Import fullført: lagret ${res.saved||0} leads fra ${file.name}.</div>`; loadLeads(getFilters()); return; }
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
  document.getElementById('offerSubject').value    = '';
  document.getElementById('offerMessage').value    = '';
  document.getElementById('offerCta').value        = '';
  document.getElementById('offerConfirm').checked  = false;
  document.getElementById('modalStatus').textContent = '';
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

  if (!subject || !message) { statusEl.textContent = 'Emne og melding er påkrevd.'; return; }
  if (!confirmed)           { statusEl.textContent = 'Bekreft at utsendingen er gjennomgått.'; return; }

  const btn = document.getElementById('modalSend');
  btn.disabled = true; btn.textContent = 'Sender…';
  statusEl.textContent = '';

  try {
    const res = await api('send-offers.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({subject, message, cta_link, lead_ids: [...selectedIds]})
    });
    statusEl.innerHTML = `<span style="color:var(--success)">Sendt til ${res.sent} mottaker(e).${res.skipped ? ` ${res.skipped} hoppet over.` : ''}${res.failed ? ` ${res.failed} feilet.` : ''}</span>`;
    selectedIds.clear();
    updateBulkBar();
    loadLeads(getFilters());
  } catch (err) {
    statusEl.innerHTML = `<span style="color:var(--danger)">Feil: ${err.message}</span>`;
  } finally {
    btn.disabled = false; btn.textContent = 'Send';
  }
}

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

// --- Sendte tilbud tab ---
async function loadSentOffers() {
  document.getElementById('sent-offers').style.display = 'block';
  try {
    const res  = await api('list-sent-offers.php');
    const rows = res.rows || [];
    document.getElementById('sentOffersRows').innerHTML = rows.length ? rows.map(r => {
      let status = r.send_status;
      if (r.clicked_at) status = 'clicked';
      else if (r.opened_at) status = 'opened';
      const statusColor = status === 'clicked' ? 'var(--success)' : status === 'opened' ? 'var(--primary)' : status === 'failed' ? 'var(--danger)' : 'var(--muted)';
      const smtpDetail = r.last_error ? `<br><small style="color:var(--danger)">${r.last_error}</small>` : (r.smtp_response === 'OK' ? '' : '');
      return `<tr>
        <td>${r.company_name || '—'}</td>
        <td>${r.email || '—'}</td>
        <td>${r.subject || ''}</td>
        <td>${r.sent_at || ''}</td>
        <td>${r.opened_at || '—'}</td>
        <td>${r.clicked_at || '—'}</td>
        <td><span style="font-weight:600;color:${statusColor}">${status}</span>${smtpDetail}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="7" style="color:var(--muted)">Ingen sendte tilbud ennå.</td></tr>';
  } catch (err) {
    document.getElementById('sentOffersRows').innerHTML = `<tr><td colspan="7" style="color:var(--danger)">Feil: ${err.message}</td></tr>`;
  }
}

document.getElementById('tabSentOffers').addEventListener('click', (e) => {
  e.preventDefault();
  loadSentOffers();
  document.getElementById('sent-offers').scrollIntoView({behavior: 'smooth'});
});

// --- Test email ---
document.getElementById('btnSendTestEmail').addEventListener('click', async () => {
  const btn    = document.getElementById('btnSendTestEmail');
  const status = document.getElementById('testEmailStatus');
  const to      = document.getElementById('testTo').value.trim();
  const subject = document.getElementById('testSubject').value.trim();
  const message = document.getElementById('testMessage').value.trim();
  if (!to || !subject || !message) { status.innerHTML = '<span style="color:var(--danger)">Fyll inn alle felt.</span>'; return; }
  btn.disabled = true; btn.textContent = 'Sender…'; status.textContent = '';
  try {
    const res = await api('send-test-email.php', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({to_email:to, subject, message})});
    status.innerHTML = res.ok
      ? `<span style="color:var(--success)">Testmail sendt til ${to}. ${res.response_ms}ms via ${res.smtp_host||'SMTP'}</span>`
      : `<span style="color:var(--danger)">Feil: ${res.error} (${res.response_ms}ms)</span>`;
  } catch(err) {
    status.innerHTML = `<span style="color:var(--danger)">Feil: ${err.message}</span>`;
  } finally {
    btn.disabled = false; btn.textContent = 'Send testmail';
  }
});

// --- Init ---
document.getElementById('fetchBrreg').addEventListener('click', fetchBrreg);
document.getElementById('importCsv').addEventListener('click', importCsv);
setDefaultDates();
populateFilterOptions();
loadLeads();

window.researchLead = researchLead;
window.genEmail     = genEmail;
window.updateStatus = updateStatus;
