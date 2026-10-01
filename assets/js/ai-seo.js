const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('on')}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
document.getElementById('aiSeoForm').addEventListener('submit',async e=>{
e.preventDefault();
const btn=e.target.querySelector('.submit'),msg=document.getElementById('formMsg');
btn.disabled=true;btn.textContent='Sender…';msg.textContent='';
const site=document.getElementById('siteurl').value.trim(),goal=document.getElementById('goal').value.trim();
try{
const r=await fetch('/api/homepage-contact.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
name:document.getElementById('name').value,
company:document.getElementById('company').value,
email:document.getElementById('email').value,
message:'AI-SEO forespørsel\nNettside: '+(site||'Ikke oppgitt')+'\n\nMål / utfordring:\n'+(goal||'Ikke oppgitt'),
source:'ai-seo',
website:document.getElementById('hp').value,
website_status:site?'Har nettside':'Ikke oppgitt'
})});
const data=await r.json();
if(!r.ok||!data.ok)throw new Error(data.error||'Kunne ikke sende');
msg.style.color='#7fd6a3';msg.textContent='Takk — forespørselen er sendt.';e.target.reset();
}catch(err){msg.style.color='#ef9a8f';msg.textContent=err.message||'Kunne ikke sende akkurat nå.'}
btn.disabled=false;btn.textContent='Få en AI-SEO gjennomgang →';
});