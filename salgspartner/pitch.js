(() => {
  'use strict';
  const body = document.body;
  const params = new URLSearchParams(location.search);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---------- Visning: partner / kunde ----------
  function setView(v, push) {
    body.dataset.view = v;
    $$('.pt-seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    if (push) {
      const u = new URL(location.href);
      if (v === 'kunde') u.searchParams.set('visning', 'kunde'); else u.searchParams.delete('visning');
      history.replaceState(null, '', u);
    }
  }
  setView(params.get('visning') === 'kunde' ? 'kunde' : 'partner', false);
  $$('.pt-seg button').forEach(b => b.addEventListener('click', () => setView(b.dataset.view, true)));
  $$('.pt-partner-link').forEach(b => b.addEventListener('click', () => { setView('partner', true); window.scrollTo({ top: 0 }); }));

  // Personlig hilsen fra selgeren: ?fra=Navn&kunde=Bedrift (kun tekst, aldri HTML)
  const clean = s => (s || '').replace(/[<>]/g, '').trim().slice(0, 60);
  const fra = clean(params.get('fra')), kunde = clean(params.get('kunde'));
  const greet = $('#pt-greeting');
  if (greet && (fra || kunde)) {
    greet.hidden = false;
    $('#pt-greet-text').textContent = (fra ? 'Anbefalt av ' : '') + fra + (fra && kunde ? ' · ' : '') + (kunde ? 'til ' + kunde : '');
  }

  // ---------- Reveal ----------
  const reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
    reveals.forEach(el => io.observe(el));
  } else reveals.forEach(el => el.classList.add('in'));

  // ---------- Pakke-synk (matrise + guide bruker eksisterende .package-tab) ----------
  const names = ['Gnist', 'Nordlys', 'Supernova'];
  let current = 'Nordlys';
  function markColumn(name) {
    current = name;
    $$('.pt-matrix [data-col]').forEach(c => c.classList.toggle('on', c.dataset.col === name));
  }
  $$('.package-tab').forEach(b => b.addEventListener('click', () => markColumn(b.dataset.package)));
  markColumn(current);
  $$('.pt-matrix thead th[data-col]').forEach(th => th.addEventListener('click', () => {
    const tab = $('.package-tab[data-package="' + th.dataset.col + '"]'); if (tab) tab.click();
  }));

  // ---------- Behovsguide ----------
  const needs = $$('.pt-need');
  const meter = $('.pt-meter'), fill = $('.pt-meter i'), knob = $('.pt-meter b');
  const out = { name: $('#pt-rec-name'), text: $('#pt-rec-text'), btn: $('#pt-rec-btn') };
  const texts = {
    Gnist: 'Et tydelig førsteinntrykk med de viktigste sidene og et kontaktskjema. Kan utvides senere når behovene vokser.',
    Nordlys: 'Flere tjenestesider, landingssider og innholdssystem, med booking eller CRM koblet på etter avtale.',
    Supernova: 'En større plattform med nettbutikk, kundeportal eller automatisering. Omfanget skreddersys sammen med SETAEI.'
  };
  function guide() {
    const score = needs.reduce((s, n) => s + (n.getAttribute('aria-pressed') === 'true' ? Number(n.dataset.w) : 0), 0);
    const rec = score <= 1 ? 'Gnist' : score <= 4 ? 'Nordlys' : 'Supernova';
    const pos = 10 + Math.min(score, 9) / 9 * 80;
    fill.style.width = pos + '%'; knob.style.left = pos + '%';
    out.name.textContent = rec;
    out.text.textContent = texts[rec];
    out.btn.dataset.package = rec;
    out.btn.firstChild.textContent = 'Se ' + rec + ' i praksis ';
  }
  needs.forEach(n => n.addEventListener('click', () => { n.setAttribute('aria-pressed', String(n.getAttribute('aria-pressed') !== 'true')); guide(); }));
  if (out.btn) out.btn.addEventListener('click', e => {
    e.preventDefault();
    const tab = $('.package-tab[data-package="' + out.btn.dataset.package + '"]'); if (tab) tab.click();
    const ex = $('#pakkeeksempler'); if (ex) ex.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  });
  if (needs.length) guide();

  // ---------- Rangering ----------
  const nf = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const MAXPOS = 45;
  const pct = p => Math.min(100, Math.max(0, (p - 1) / (MAXPOS - 1) * 100));
  function renderRankings(data) {
    const grid = $('#pt-rank-grid'); if (!grid) return;
    grid.replaceChildren();
    data.items.forEach((it, i) => {
      const card = document.createElement('article'); card.className = 'pt-rank'; card.setAttribute('data-reveal', ''); card.style.setProperty('--d', (i * .08) + 's');
      const gain = Math.round(it.from - it.to);
      const el = (tag, cls, txt) => { const x = document.createElement(tag); if (cls) x.className = cls; if (txt != null) x.textContent = txt; return x; };
      card.append(el('div', 'who', it.who), el('div', 'kw', '«' + it.kw + '»'));
      const nums = el('div', 'nums');
      nums.append(el('span', 'from', '#' + nf.format(it.from)), el('span', 'to', '#' + nf.format(it.from)), el('span', 'gain', '+' + gain + ' plasser'));
      card.append(nums);
      const track = el('div', 'pt-track'); track.setAttribute('aria-hidden', 'true');
      const zone = el('div', 'zone'); const f = el('i', 'dot f'); const t = el('i', 'dot t'); const line = el('i', 'line');
      f.style.setProperty('--f', pct(it.from) + '%'); t.style.setProperty('--f', pct(it.from) + '%');
      line.style.left = pct(it.to) + '%'; line.style.width = (pct(it.from) - pct(it.to)) + '%'; line.style.opacity = 0;
      track.append(zone, line, f, t);
      card.append(track);
      const scale = el('div', 'pt-scale'); scale.setAttribute('aria-hidden', 'true'); scale.append(el('span', '', '#1'), el('span', '', 'Side 1 til #10'), el('span', '', '#' + MAXPOS));
      card.append(scale, el('p', 'when', it.when + ' · ' + it.stats));
      grid.append(card);
      const animate = () => {
        const target = it.to, start = performance.now(), dur = reduce ? 1 : 1600;
        t.style.setProperty('--f', pct(it.to) + '%'); line.style.opacity = 1; line.style.transition = 'opacity 1s';
        const num = card.querySelector('.to');
        (function step(now) {
          const k = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - k, 3);
          num.textContent = '#' + nf.format(it.from + (target - it.from) * e);
          if (k < 1) requestAnimationFrame(step);
        })(start);
      };
      if ('IntersectionObserver' in window && !reduce) {
        const o = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { setTimeout(animate, 250 + i * 150); o.disconnect(); } }), { threshold: .5 });
        o.observe(card);
      } else { card.classList.add('in'); animate(); }
    });
    const up = $('#pt-updated'); if (up) up.textContent = 'Siste uttrekk fra ' + data.source + ': ' + data.updated;
    const note = $('#pt-rank-note'); if (note) note.textContent = data.note;
    $$('#pt-rank-grid [data-reveal]').forEach(el => { if (reduce || !('IntersectionObserver' in window)) el.classList.add('in'); else { const o2 = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); o2.unobserve(e.target); } }), { threshold: .12 }); o2.observe(el); } });
  }
  fetch('/salgspartner/rankings.json?v=20261028', { cache: 'no-cache' }).then(r => r.ok ? r.json() : Promise.reject()).then(renderRankings).catch(() => {
    const g = $('#pt-rank-grid'); if (g) g.textContent = 'Rangeringene kunne ikke lastes. Se resultatene på setai.no/seo/.';
  });

  // ---------- Kundereise ----------
  const journey = $('.pt-journey');
  if (journey) {
    const steps = $$('li', journey);
    const run = () => {
      steps.forEach((s, i) => setTimeout(() => s.classList.add('on'), reduce ? 0 : i * 320));
      journey.style.setProperty('--p', '90%');
    };
    if ('IntersectionObserver' in window && !reduce) {
      const o = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { run(); o.disconnect(); } }), { threshold: .3 });
      o.observe(journey);
    } else run();
  }

  // ---------- Hero-visning: lett parallax ----------
  const stack = $('.pt-stack');
  if (stack && !reduce) {
    $$('.pt-win', stack).forEach(w => w.classList.add('pt-float'));
  }

  // ---------- Kundelenke (selgerverktøy) ----------
  const nameIn = $('#pt-link-name'), custIn = $('#pt-link-cust'), linkOut = $('#pt-link-out'), copyBtn = $('#pt-link-copy'), copied = $('#pt-copied');
  function buildLink() {
    const u = new URL(location.origin + location.pathname);
    u.searchParams.set('visning', 'kunde');
    if (clean(nameIn.value)) u.searchParams.set('fra', clean(nameIn.value));
    if (clean(custIn.value)) u.searchParams.set('kunde', clean(custIn.value));
    linkOut.value = u.toString();
  }
  if (nameIn) {
    [nameIn, custIn].forEach(i => i.addEventListener('input', buildLink)); buildLink();
    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(linkOut.value); copied.textContent = 'Lenken er kopiert. Send den til kunden.'; }
      catch (e) { linkOut.select(); copied.textContent = 'Marker og kopier lenken manuelt.'; }
    });
  }
})();
