(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const journey = $('#reisen'), stage = $('#stage'), chapters = $$('.chapter'), steps = $$('[data-go]');
  const play = $('#playTour'), label = $('#playLabel'), icon = $('.play-icon');
  let frame = 0, current = -1, playing = false, started = 0, startP = 0, autoFrame = 0;
  const themes = ['#f8f0e3', innerWidth < 651 ? '#fff4e2' : '#403a2d', '#f8f0e3', '#fff5e9'];
  function travel() { return Math.max(1, journey.offsetHeight - innerHeight); }
  function progress() { return clamp(-journey.getBoundingClientRect().top / travel()); }
  function top() { return journey.getBoundingClientRect().top + scrollY; }
  function update() {
    frame = 0;
    $('#header').classList.toggle('scrolled', scrollY > 40);
    if (reduced.matches) {
      chapters.forEach(c => { c.hidden = false; c.removeAttribute('aria-hidden'); c.inert = false; });
      return;
    }
    const p = progress();
    const unit = p * 4;
    const active = Math.min(3, Math.floor(unit));
    const local = Math.min(1, unit - active);
    // The first and last thirds hold the copy still; transitions happen near chapter boundaries.
    const fade = active < 3 ? clamp((local - .76) / .24) : 0;
    const smooth = fade * fade * (3 - 2 * fade);
    chapters.forEach((chapter, i) => {
      const visible = i === active || (i === active + 1 && fade > 0);
      chapter.hidden = !visible;
      chapter.style.opacity = i === active ? '1' : String(smooth);
      chapter.style.zIndex = i === active + 1 ? '2' : '1';
      chapter.setAttribute('aria-hidden', String(i !== active));
      chapter.inert = i !== active;
      if (!visible) return;
      const own = i === active ? local : 0;
      $('.scene-photo img', chapter).style.transform = `scale(${1.045 + own * .035}) translate3d(${(own - .5) * -1.8}%,${own * -.9}%,0)`;
      $('.kinetic', chapter).style.transform = `translate3d(${(own - .5) * -3}vw,0,0)`;
      $('.scene-copy', chapter).style.transform = `translate3d(0,${own * -8}px,0)`;
    });
    if (current !== active) {
      current = active;
      steps.forEach((button, i) => i === active ? button.setAttribute('aria-current', 'step') : button.removeAttribute('aria-current'));
      stage.style.color = active === 1 ? (innerWidth >= 651 ? '#403a2d' : '#fff4e2') : themes[active];
    }
    $('#storyProgress').style.width = `${p * 100}%`;
  }
  function request() { if (!frame) frame = requestAnimationFrame(update); }
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', () => { current = -1; request(); }, { passive: true });
  reduced.addEventListener('change', () => { stop(); current = -1; request(); });
  function stop() {
    playing = false;
    cancelAnimationFrame(autoFrame);
    play.setAttribute('aria-pressed', 'false'); label.textContent = 'Spill presentasjonen'; icon.textContent = '▷';
  }
  function animate(now) {
    if (!playing) return;
    const p = clamp(startP + (now - started) / 24000);
    scrollTo({ top: top() + travel() * p, behavior: 'instant' });
    if (p >= 1) { stop(); return; }
    autoFrame = requestAnimationFrame(animate);
  }
  play.addEventListener('click', () => {
    if (playing) { stop(); return; }
    if (reduced.matches) return;
    startP = progress() >= .98 ? 0 : progress(); started = performance.now(); playing = true;
    play.setAttribute('aria-pressed', 'true'); label.textContent = 'Pause'; icon.textContent = 'Ⅱ';
    autoFrame = requestAnimationFrame(animate);
  });
  ['wheel', 'touchstart', 'pointerdown'].forEach(type => addEventListener(type, e => { if (playing && !play.contains(e.target)) stop(); }, { passive: true }));
  addEventListener('keydown', e => { if (['Escape','ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key)) stop(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  steps.forEach(button => button.addEventListener('click', () => {
    stop(); scrollTo({ top: top() + travel() * (Number(button.dataset.go) + .12) / 4, behavior: reduced.matches ? 'instant' : 'smooth' });
  }));
  // Native dialogs keep keyboard focus inside the overlay and restore it to the opener.
  const menu = $('#menu'), toggle = $('#menuToggle');
  function openDialog(dialog) { stop(); dialog.showModal(); document.body.classList.add('dialog-open'); }
  function closeDialog(dialog) { dialog.close(); document.body.classList.remove('dialog-open'); }
  toggle.addEventListener('click', () => { openDialog(menu); toggle.setAttribute('aria-expanded', 'true'); });
  $('#menuClose').addEventListener('click', () => closeDialog(menu));
  menu.addEventListener('close', () => { toggle.setAttribute('aria-expanded', 'false'); document.body.classList.remove('dialog-open'); });
  $$('a', menu).forEach(a => a.addEventListener('click', () => closeDialog(menu)));
  menu.addEventListener('click', e => { if (e.target === menu && e.clientX < menu.getBoundingClientRect().left) closeDialog(menu); });
  const lightbox = $('#lightbox'), gallery = $$('.gallery-item');
  let imageIndex = 0;
  function setImage(i) {
    imageIndex = (i + gallery.length) % gallery.length;
    const item = gallery[imageIndex];
    $('#lightboxImage').src = `assets/${item.dataset.image}.webp`;
    $('#lightboxImage').alt = item.dataset.label;
    $('#lightboxCaption').textContent = `${String(imageIndex + 1).padStart(2, '0')} / ${gallery.length} — ${item.dataset.label}`;
  }
  gallery.forEach((item, i) => item.addEventListener('click', () => { setImage(i); openDialog(lightbox); }));
  $('#closeLightbox').addEventListener('click', () => closeDialog(lightbox));
  $('#previousImage').addEventListener('click', () => setImage(imageIndex - 1));
  $('#nextImage').addEventListener('click', () => setImage(imageIndex + 1));
  lightbox.addEventListener('close', () => document.body.classList.remove('dialog-open'));
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeDialog(lightbox); });
  lightbox.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') setImage(imageIndex - 1); if (e.key === 'ArrowRight') setImage(imageIndex + 1); });
  const arrival = $('#arrival'), departure = $('#departure'), form = $('#bookingForm');
  function localDate(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  arrival.min = localDate(new Date());
  function dates() {
    departure.setCustomValidity('');
    const first = new Date(`${arrival.value || arrival.min}T12:00:00`); first.setDate(first.getDate() + 1);
    departure.min = localDate(first);
    if (departure.value && departure.value <= arrival.value) departure.setCustomValidity('Avreise må være etter ankomst.');
  }
  arrival.addEventListener('input', dates); departure.addEventListener('input', dates); dates();
  form.addEventListener('submit', e => {
    e.preventDefault(); dates(); if (!form.reportValidity()) return;
    const lines = ['Hei Stenhuset,', '', 'Jeg ønsker et tilbud på opphold i huset på Mallorca.', '', `Navn: ${$('#guestName').value.trim()}`, `E-post: ${$('#guestEmail').value.trim()}`, `Ankomst: ${arrival.value}`, `Avreise: ${departure.value}`, `Antall gjester: ${$('#guests').value}`, '', 'Vennlig hilsen', $('#guestName').value.trim()];
    const url = 'mailto:info@stenhuset.no?subject=' + encodeURIComponent('Forespørsel om opphold – Bo i Stenhuset') + '&body=' + encodeURIComponent(lines.join('\n'));
    location.href = url;
    $('#formNote').textContent = 'Forespørselen er klargjort i e-postprogrammet ditt. Send e-posten derfra. Hvis programmet ikke åpnet, kontakt info@stenhuset.no.';
  });
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('revealed'); observer.unobserve(entry.target); } }), { threshold: .08 });
    $$('.house-heading,.house-pair,.section-heading,.booking-copy,.materials h2').forEach(el => { el.classList.add('reveal-ready'); observer.observe(el); });
  }
  update();
})();
