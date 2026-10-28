(() => {
  'use strict';
  const money = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
  const packageSelect = document.getElementById('calc-package');
  const countInput = document.getElementById('calc-count');
  function calculate() {
    const count = Number(countInput.value);
    const price = Number(packageSelect.value);
    document.getElementById('count-value').textContent = count + ' salg';
    document.getElementById('commission-value').textContent = money.format(count * price * 0.3) + ' kr';
    document.getElementById('calc-equation').textContent = count + ' × ' + money.format(price) + ' kr × 30 %';
  }
  packageSelect.addEventListener('change', calculate);
  countInput.addEventListener('input', calculate);
  calculate();

  const dialog = document.getElementById('partner-dialog');
  const form = document.getElementById('partner-form');
  const status = document.getElementById('form-status');
  const submit = document.getElementById('form-submit');
  const success = document.getElementById('form-success');
  let trigger = null;
  let submitting = false;
  function openDialog(button) {
    trigger = button;
    document.querySelector('.site-nav').classList.remove('menu-open');
    const menuToggle = document.querySelector('.brand-menu-toggle');
    if (menuToggle) { menuToggle.setAttribute('aria-expanded', 'false'); menuToggle.setAttribute('aria-label', 'Åpne meny'); }
    if (success.hidden && !submitting) {
      document.getElementById('partner-package').value = button.dataset.package || 'Alle pakker';
      if (button.dataset.intent) document.getElementById('partner-message').value = button.dataset.intent;
    }
    dialog.showModal();
    document.body.style.overflow = 'hidden';
  }
  document.querySelectorAll('.js-open-contact, .package-cta').forEach(button => button.addEventListener('click', () => openDialog(button)));
  document.querySelectorAll('.dialog-close, .dialog-done').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; if (trigger) trigger.focus(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || !form.reportValidity()) return;
    submitting = true;
    submit.disabled = true;
    status.textContent = 'Sender interessen din …';
    const data = new FormData(form);
    const payload = {
      name: String(data.get('name') || '').trim(),
      company: String(data.get('company') || '').trim(),
      email: String(data.get('email') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      website: String(data.get('website') || ''),
      source: 'salgspartner-jul-2026',
      message: 'Interesse for salgspartnerskap hos SETAEI.\nPakke: ' + data.get('package') + '\n\n' + String(data.get('message') || '').trim()
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('/api/homepage-contact.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: controller.signal
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        if (response.status === 429) throw new Error('Mange henvendelser er sendt fra nettverket ditt. Prøv igjen senere, eller kontakt SETAEI på WhatsApp.');
        throw new Error('Meldingen kunne ikke bekreftes sendt. Prøv igjen, eller kontakt SETAEI på WhatsApp.');
      }
      form.hidden = true;
      success.hidden = false;
      success.querySelector('button').focus();
      form.reset();
    } catch (error) {
      status.textContent = error.name === 'AbortError' ? 'Vi fikk ikke bekreftet sendingen i tide. Kontakt SETAEI på WhatsApp før du prøver igjen.' : (error instanceof TypeError || error instanceof SyntaxError ? 'Vi fikk ikke kontakt med serveren. Prøv igjen, eller kontakt SETAEI på WhatsApp.' : error.message);
    } finally {
      clearTimeout(timeout);
      submitting = false;
      submit.disabled = false;
    }
  });
  // The campaign is Norwegian; language controls open the corresponding main site.
  document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => {
    const lang = button.dataset.lang;
    if (lang === 'no') return;
    try { localStorage.setItem('setaei-lang', lang); } catch (_) { /* Optional preference. */ }
    window.location.assign(lang === 'en' ? '/en/' : '/?lang=fa');
  }));
  // Keep the campaign accurate after the Norwegian deadline, including cached visits.
  if (Date.now() >= Date.parse('2026-12-01T00:00:00+01:00')) {
    document.querySelector('.campaign-strip').textContent = 'Julekampanjen er avsluttet. Kontakt SETAEI for gjeldende tilbud og partnervilkår.';
    document.querySelectorAll('.package-cta').forEach(button => { button.textContent = 'Be om oppdatert tilbud ↗'; });
    document.querySelectorAll('.price-label').forEach(label => { label.textContent = 'Tidligere kampanjepris eks. mva.'; });
    document.querySelector('.offer-deadline').textContent = 'Denne kampanjen gjaldt salg inngått før 1. desember 2026.';
  }
})();
