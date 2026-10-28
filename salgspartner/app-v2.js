(() => {
  'use strict';
  const packages = {
    Gnist: { base: 20000n, icon: '✳', kicker: 'GNIST / DEN FØRSTE GODE STARTEN', title: 'Et førsteinntrykk\nsom åpner dører.', description: 'En skreddersydd nettside for gründere og små bedrifter. Begynn med det viktigste og utvid løsningen når behovene vokser.', features: ['Skreddersydd design og tydelig budskap', 'Mobiltilpasset nettside og kontaktskjema', 'Rom for flere sider og funksjoner etter avtale'] },
    Nordlys: { base: 75000n, icon: '✦', kicker: 'NORDLYS / FOR BEDRIFTER I VEKST', title: 'En nettside som jobber\nlike hardt som bedriften.', description: 'En større bedriftsnettside med tjenestesider, innholdssystem og avtalte integrasjoner for booking eller CRM.', features: ['Design og innhold tilpasset bedriften', 'Tjenestesider og landingssider', 'Booking eller CRM etter avtale'] },
    Supernova: { base: 200000n, icon: '✹', kicker: 'SUPERNOVA / FOR DE STORE AMBISJONENE', title: 'Når en stor idé\nfortjener en større scene.', description: 'En digital plattform med nettbutikk, kundeportal eller automatisering. Omfang og integrasjoner skreddersys i dialog med SETAEI.', features: ['Digital strategi og en skreddersydd plattform', 'Nettbutikk eller kundeportal etter avtale', 'Integrasjoner og automatisering etter avtale'] }
  };
  const state = { package: 'Nordlys', price: 75000n };
  const minPrice = 20000n;
  const formatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
  const format = amount => formatter.format(amount);
  const formatCents = cents => format(cents / 100n) + (cents % 100n ? ',' + (cents % 100n).toString().padStart(2, '0') : '') + ' kr';
  const control = document.getElementById('price-control');
  const input = document.getElementById('sale-price');
  const error = document.getElementById('price-error');
  const circumference = 2 * Math.PI * 201;
  const offerCTA = document.getElementById('offer-cta');
  let dragging = null;
  function render(keepInput = false) {
    if (!keepInput) input.value = format(state.price);
    const digits = state.price.toString().length;
    input.style.fontSize = digits > 9 ? 'clamp(18px, 3vw, 28px)' : '';
    const fraction = Number((state.price - minPrice) % 100000n) / 100000;
    const angle = fraction * 360;
    document.getElementById('dial-knob').setAttribute('transform', 'rotate(' + angle + ' 250 250)');
    const fill = document.getElementById('dial-fill');
    fill.style.strokeDasharray = String(circumference);
    fill.style.strokeDashoffset = String(circumference * (1 - fraction));
    control.setAttribute('aria-valuenow', state.price.toString());
    control.setAttribute('aria-valuetext', format(state.price) + ' kroner. Ingen øvre prisgrense.');
    document.getElementById('commission-value').textContent = formatCents(state.price * 30n);
    document.getElementById('setaei-value').textContent = formatCents(state.price * 70n);
    document.getElementById('active-package').textContent = state.package;
    const jump = document.getElementById('examples-jump'); jump.replaceChildren(document.createTextNode('Se ' + state.package + ' i praksis ')); const down = document.createElement('span'); down.setAttribute('aria-hidden', 'true'); down.textContent = '↓'; jump.appendChild(down);
    document.getElementById('price-minus').disabled = state.price <= minPrice;
    document.getElementById('price-note').textContent = format(packages[state.package].base) + ' kr er et veiledende utgangspunkt for ' + state.package + ', ikke en fastpris. Salgsprisen er etter kunderabatt. Provisjonen følger faktisk innbetalt beløp.';
    offerCTA.replaceChildren(document.createTextNode('La oss selge ' + state.package + ' '));
    const arrow = document.createElement('span'); arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '↗'; offerCTA.appendChild(arrow);
    document.getElementById('chosen-quote').textContent = state.package + ' · ønsket salgspris ' + format(state.price) + ' kr eks. mva. · din provisjon ' + formatCents(state.price * 30n);
  }
  function setPrice(price, keepInput = false) { state.price = price < minPrice ? minPrice : price; error.textContent = ''; render(keepInput); }
  function selectPackage(name) {
    if (state.package !== name) state.price = packages[name].base;
    state.package = name;
    document.querySelectorAll('.package-tab').forEach(button => { const active = button.dataset.package === name; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    document.querySelectorAll('[data-examples]').forEach(group => { group.hidden = group.dataset.examples !== name; });
    document.getElementById('examples-package').textContent = name.toUpperCase();
    const data = packages[name];
    document.getElementById('solution-symbol').textContent = data.icon;
    document.getElementById('solution-kicker').textContent = data.kicker;
    const title = document.getElementById('solution-title'); title.replaceChildren();
    data.title.split('\n').forEach((text, index) => { if (index) title.appendChild(document.createElement('br')); title.appendChild(document.createTextNode(text)); });
    document.getElementById('solution-description').textContent = data.description;
    const features = document.getElementById('solution-features'); features.replaceChildren();
    data.features.forEach(text => { const li = document.createElement('li'); li.textContent = text; features.appendChild(li); });
    error.textContent = ''; render();
  }
  document.querySelectorAll('.package-tab').forEach(button => button.addEventListener('click', () => selectPackage(button.dataset.package)));
  document.getElementById('price-plus').addEventListener('click', () => setPrice(state.price + 1000n));
  document.getElementById('price-minus').addEventListener('click', () => setPrice(state.price - 1000n));
  function parseInput() { const value = input.value.replace(/[\s\u00a0\u202f]/g, ''); return /^\d+$/.test(value) ? BigInt(value) : null; }
  input.addEventListener('input', () => { const value = parseInput(); if (value !== null && value >= minPrice) setPrice(value, true); });
  input.addEventListener('change', () => { const value = parseInput(); if (value === null || value < minPrice) { render(); error.textContent = 'Skriv inn en pris fra 20 000 kr. Det er ingen øvre grense.'; } else setPrice(value); });
  input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); input.blur(); } });
  // A relative rotary control: each complete turn adds 100 000 kr, with no upper bound.
  function pointerAngle(event) { const r = control.getBoundingClientRect(); return Math.atan2(event.clientY - r.top - r.height / 2, event.clientX - r.left - r.width / 2) * 180 / Math.PI; }
  control.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault(); control.focus({ preventScroll: true }); control.setPointerCapture(event.pointerId);
    dragging = { id: event.pointerId, last: pointerAngle(event), total: 0, price: state.price };
    control.classList.add('dragging');
  });
  control.addEventListener('pointermove', event => {
    if (!dragging || event.pointerId !== dragging.id) return;
    const angle = pointerAngle(event); let delta = angle - dragging.last;
    if (delta > 180) delta -= 360; if (delta < -180) delta += 360;
    dragging.last = angle; dragging.total += delta;
    const steps = Math.round(dragging.total / 360 * 100);
    const proposed = dragging.price + BigInt(steps) * 1000n;
    if (proposed < minPrice) { dragging.price = minPrice; dragging.total = 0; }
    setPrice(proposed);
  });
  function stopDragging(event) { if (dragging && event.pointerId === dragging.id) { dragging = null; control.classList.remove('dragging'); if (control.hasPointerCapture(event.pointerId)) control.releasePointerCapture(event.pointerId); } }
  control.addEventListener('pointerup', stopDragging);
  control.addEventListener('pointercancel', stopDragging);
  control.addEventListener('lostpointercapture', () => { dragging = null; control.classList.remove('dragging'); });
  control.addEventListener('keydown', event => {
    let step = event.shiftKey ? 10000n : 1000n;
    if (['ArrowRight', 'ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); setPrice(state.price + (event.key === 'PageUp' ? 10000n : step)); }
    else if (['ArrowLeft', 'ArrowDown', 'PageDown'].includes(event.key)) { event.preventDefault(); setPrice(state.price - (event.key === 'PageDown' ? 10000n : step)); }
    else if (event.key === 'Home') { event.preventDefault(); setPrice(packages[state.package].base); }
  });
  document.getElementById('back-to-wheel').addEventListener('click', () => { document.getElementById('pakker').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); document.querySelector('.package-tab.active').focus({ preventScroll: true }); });
  render();

  const dialog = document.getElementById('partner-dialog');
  const form = document.getElementById('partner-form');
  const status = document.getElementById('form-status');
  const submit = document.getElementById('form-submit');
  const success = document.getElementById('form-success');
  let trigger = null;
  let submitting = false;
  document.querySelectorAll('.js-open-contact').forEach(button => button.addEventListener('click', () => {
    trigger = button;
    document.querySelector('.site-nav').classList.remove('menu-open');
    const menu = document.querySelector('.brand-menu-toggle'); if (menu) { menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Åpne meny'); }
    if (!submitting) {
      if (!success.hidden) { success.hidden = true; form.hidden = false; status.textContent = ''; }
      document.getElementById('partner-package').value = state.package;
    }
    render(); dialog.showModal(); document.body.style.overflow = 'hidden';
  }));
  document.querySelectorAll('.dialog-close, .dialog-done').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => { const r = dialog.getBoundingClientRect(); if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close(); });
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; if (trigger) trigger.focus(); });
  document.getElementById('customer-email-confirmed').addEventListener('change', event => { event.target.setCustomValidity(''); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const customerConfirmation = document.getElementById('customer-email-confirmed');
    customerConfirmation.setCustomValidity(customerConfirmation.checked ? '' : 'Du må bekrefte at kunden har ønsket et forslag på e-post.');
    if (submitting || !form.reportValidity()) return;
    submitting = true; submit.disabled = true; status.textContent = 'Sender kundereferansen …';
    const data = new FormData(form);
    const payload = { name: String(data.get('name') || '').trim(), company: String(data.get('company') || '').trim(), email: String(data.get('email') || '').trim(), phone: String(data.get('phone') || '').trim(), website: String(data.get('website') || ''), customer_company: String(data.get('customer_company') || '').trim(), customer_contact_name: String(data.get('customer_contact_name') || '').trim(), customer_contact_phone: String(data.get('customer_contact_phone') || '').trim(), customer_email_confirmed: customerConfirmation.checked, source: 'salgspartner-jul-2026', message: 'Kundereferanse til SETAEI.\nPakke: ' + data.get('package') + '\nØnsket salgspris: ' + format(state.price) + ' kr eks. mva.\nProvisjonseksempel: ' + formatCents(state.price * 30n) + '\n\n' + String(data.get('message') || '').trim() };
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('/api/homepage-contact.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
      const result = await response.json();
      if (!response.ok || !result.ok) { if (response.status === 400 && typeof result.error === 'string') throw new Error(result.error); if (response.status === 429) throw new Error('Mange henvendelser er sendt fra nettverket ditt. Prøv igjen senere, eller kontakt SETAEI på WhatsApp.'); throw new Error('Meldingen kunne ikke bekreftes sendt. Prøv igjen, eller kontakt SETAEI på WhatsApp.'); }
      form.hidden = true; success.hidden = false; success.querySelector('button').focus(); form.reset();
    } catch (error) { status.textContent = error.name === 'AbortError' ? 'Vi fikk ikke bekreftet sendingen i tide. Kontakt SETAEI på WhatsApp før du prøver igjen.' : (error instanceof TypeError || error instanceof SyntaxError ? 'Vi fikk ikke kontakt med serveren. Prøv igjen, eller kontakt SETAEI på WhatsApp.' : error.message); }
    finally { clearTimeout(timeout); submitting = false; submit.disabled = false; }
  });
  document.getElementById('partner-package').addEventListener('change', () => { const name = document.getElementById('partner-package').value; document.getElementById('chosen-quote').textContent = (name === 'Alle pakker' ? 'Pakke avklares' : name) + ' · ønsket salgspris ' + format(state.price) + ' kr eks. mva. · din provisjon ' + formatCents(state.price * 30n); });
  document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => { const lang = button.dataset.lang; if (lang === 'no') return; try { localStorage.setItem('setaei-lang', lang); } catch (_) {} window.location.assign(lang === 'en' ? '/en/' : '/?lang=fa'); }));
  if (Date.now() >= Date.parse('2026-12-01T00:00:00+01:00')) { document.querySelector('.campaign-strip').textContent = 'Julekampanjen er avsluttet. Kontakt SETAEI for gjeldende tilbud og partnervilkår.'; document.querySelector('.offer-deadline').textContent = 'Kampanjen gjaldt avtaler inngått før 1. desember 2026.'; }
})();
