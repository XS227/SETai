const api = (path, options={}) => fetch(`api/${path}`, options).then(r=>r.json());

function statusBadge(status='new'){ return `<span class="badge status-${status}">${status}</span>`; }
function websiteText(row){ return row.has_website ? (row.website_url || 'Ja') : 'Ingen'; }

async function loadLeads(){
  const res = await api('list-leads.php');
  const tbody = document.getElementById('leadRows');
  tbody.innerHTML = (res.leads||[]).map(row => `
    <tr>
      <td>${row.company_name||''}</td><td>${row.org_number||''}</td><td>${row.industry_name||''}</td>
      <td>${row.city||''}</td><td>${row.registration_date||''}</td><td>${websiteText(row)}</td>
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
}

async function researchLead(id){
  const res = await api('research-lead.php', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({lead_id:id})});
  document.getElementById('leadDetail').innerHTML = `<pre>${JSON.stringify(res, null, 2)}</pre>`;
  loadLeads();
}

async function genEmail(id){
  const res = await api('generate-email.php', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({lead_id:id, tone:'vennlig'})});
  document.getElementById('leadDetail').innerHTML = `<h4>${res.subject||''}</h4><pre>${res.body||''}</pre>`;
  loadLeads();
}

async function updateStatus(id,status){
  const res = await api('update-lead-status.php', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({lead_id:id,status})});
  document.getElementById('leadDetail').innerHTML = `<pre>${JSON.stringify(res, null, 2)}</pre>`;
  loadLeads();
}

async function fetchBrreg(){
  const payload={from_date:document.getElementById('fromDate').value,to_date:document.getElementById('toDate').value};
  const res=await api('brreg-fetch.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  document.getElementById('leadDetail').innerHTML = `<pre>${JSON.stringify(res,null,2)}</pre>`;
  loadLeads();
}

async function importCsv(){
  const input = document.getElementById('csvFile');
  const file = input.files[0];
  if (!file) return alert('Velg CSV- eller XLSX-fil');

  try {
    const rows = await parseImportFile(file);
    if (!rows.length) {
      document.getElementById('leadDetail').innerHTML = '<div class="notice">Ingen rader funnet i filen.</div>';
      return;
    }

    const leads = rows.map(normalizeLeadRow).filter((row) => row.org_number || row.company_name);
    if (!leads.length) {
      document.getElementById('leadDetail').innerHTML = '<div class="notice">Kunne ikke tolke kolonner. Sjekk at filen inneholder Brreg-felter.</div>';
      return;
    }

    const source = file.name.toLowerCase().endsWith('.xlsx') ? 'xlsx_upload' : 'csv_upload';
    const res=await api('save-lead.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bulk:leads,source})});
    if (res.ok) {
      document.getElementById('leadDetail').innerHTML = `<div class="notice">Import fullført: lagret ${res.saved||0} leads fra ${file.name}.</div>`;
      loadLeads();
      return;
    }
    document.getElementById('leadDetail').innerHTML = `<div class="notice">Import feilet: ${res.error || 'ukjent feil'}</div><pre>${JSON.stringify(res,null,2)}</pre>`;
  } catch (err) {
    document.getElementById('leadDetail').innerHTML = `<div class="notice">Import feilet: ${err.message || err}</div>`;
  }
}

function normalizeHeader(header=''){
  return header.toString().trim().toLowerCase().replace(/\s+/g,'_');
}

function normalizeLeadRow(row={}){
  const normalized = {};
  Object.entries(row).forEach(([key, value]) => {
    normalized[normalizeHeader(key)] = (value ?? '').toString().trim();
  });

  return {
    company_name: normalized.company_name || normalized.navn || normalized.foretaksnavn || '',
    org_number: normalized.org_number || normalized.organisasjonsnummer || '',
    organization_form: normalized.organization_form || normalized.organisasjonsform || normalized.organisasjonsform_beskrivelse || '',
    industry_name: normalized.industry_name || normalized.naering || normalized.naeringskode_beskrivelse || normalized.naeringsbeskrivelse || '',
    city: normalized.city || normalized.forretningsadresse_poststed || normalized.poststed || '',
    county: normalized.county || normalized.fylke || '',
    registration_date: normalized.registration_date || normalized.registreringsdatoenhetsregisteret || normalized.registreringsdato || ''
  };
}

async function parseImportFile(file){
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.xlsx')) {
    if (!window.XLSX) throw new Error('XLSX-bibliotek ikke lastet.');
    const buffer = await file.arrayBuffer();
    const workbook = window.XLSX.read(buffer, {type:'array'});
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) return [];
    return window.XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {defval:''});
  }

  if (lowerName.endsWith('.csv')) {
    const text = await file.text();
    const rows = text.trim().split(/\r?\n/).map(r=>r.split(','));
    const headers = (rows.shift() || []).map(h=>h.trim());
    return rows.filter((cols) => cols.some((v) => v && v.trim())).map(cols => Object.fromEntries(headers.map((h,i)=>[h, (cols[i]||'').trim()])));
  }

  throw new Error('Ugyldig filtype. Støtter kun .csv og .xlsx');
}

document.getElementById('fetchBrreg').addEventListener('click',fetchBrreg);
document.getElementById('importCsv').addEventListener('click',importCsv);
loadLeads();
window.researchLead = researchLead;
window.genEmail = genEmail;
window.updateStatus = updateStatus;
