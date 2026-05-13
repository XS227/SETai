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
  if (!input.files[0]) return alert('Velg CSV-fil');
  const text = await input.files[0].text();
  const rows = text.trim().split(/\r?\n/).map(r=>r.split(','));
  const headers = rows.shift().map(h=>h.trim());
  const leads = rows.map(cols => Object.fromEntries(headers.map((h,i)=>[h.trim(), (cols[i]||'').trim()])));
  const res=await api('save-lead.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bulk:leads,source:'csv_upload'})});
  document.getElementById('leadDetail').innerHTML = `<pre>${JSON.stringify(res,null,2)}</pre>`;
  loadLeads();
}

document.getElementById('fetchBrreg').addEventListener('click',fetchBrreg);
document.getElementById('importCsv').addEventListener('click',importCsv);
loadLeads();
window.researchLead = researchLead;
window.genEmail = genEmail;
window.updateStatus = updateStatus;
