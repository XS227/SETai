/* KASHI V2 review: client-side marketplace prototype. No server calls, no payments. */
(() => {
'use strict';
const D = window.KDATA, V = window.KASHI_V || '';
const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[m]));

/* ---------- storage ---------- */
const read = (k, d) => { try { return JSON.parse(localStorage.getItem('kashiV2:' + k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem('kashiV2:' + k, JSON.stringify(v)); } catch { /* private mode */ } };
const S = {};
function loadState() {
  Object.assign(S, {basket: read('basket', {}), orders: read('orders', []), quotes: read('quotes', []), applications: read('applications', []),
    samples: read('samples', []), favs: read('favs', []), compare: read('compare', []), custom: read('custom', []), hidden: read('hiddenProducts', []),
    rate: Number(read('rate', 15)), profile: read('profile', {}), addresses: read('addresses', []), projects: read('projects', []), team: read('team', []),
    company: read('company', {}), prospects: read('prospects', []), audit: read('audit', []), lang: read('lang', 'EN'), seeded: read('seeded', false)});
}
loadState();
const keep = (...keys) => keys.forEach(k => save(k === 'hidden' ? 'hiddenProducts' : k, S[k]));

/* ---------- language ---------- */
const missing = window.__missing = new Set();
function t(s, vars) {
  let out = s;
  if (S.lang !== 'EN') { const d = window.KI18N[S.lang]; if (d[s] != null) out = d[s]; else missing.add(S.lang + '|' + s); }
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
  return out;
}
// Some browsers ship without Icelandic locale data: German number formatting matches Icelandic.
const hasIS = Intl.NumberFormat.supportedLocalesOf('is-IS').length > 0;
const IS_NAMES = {IS: 'Ísland', NO: 'Noregur', TR: 'Tyrkland', IR: 'Íran', IT: 'Ítalía'};
const locale = () => ({EN: 'en-GB', NO: 'nb-NO', IS: hasIS ? 'is-IS' : 'de-DE', FA: 'fa-IR'}[S.lang]);
const num = (n, d = 0) => Number(n).toLocaleString(locale(), {maximumFractionDigits: d});
const fmt = n => num(Math.round(n)) + ' ISK';
const date = s => new Date(s).toLocaleDateString(locale(), {day: 'numeric', month: S.lang === 'IS' && !hasIS ? 'numeric' : 'short', year: 'numeric'});
let regions;
const country = code => { if (!/^[A-Z]{2}$/.test(code || '')) return code || ''; if (S.lang === 'IS' && !hasIS) { if (IS_NAMES[code]) return IS_NAMES[code]; } try { regions = regions?.lang === S.lang ? regions : {lang: S.lang, n: new Intl.DisplayNames([locale()], {type: 'region'})}; return regions.n.of(code); } catch { return code; } };

/* ---------- catalogue ---------- */
const all = () => D.products.concat(S.custom);
const visible = () => all().filter(p => !S.hidden.includes(p.id));
const get = id => all().find(p => p.id === Number(id));
const seller = name => D.sellers.find(s => s.name === name);
const sw = (p, cls = '') => `<span class="swatch ${cls}" data-thumb="${p.id}" role="img" aria-label="${esc(p.name)}"></span>`;
const thumbs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { thumbs.unobserve(e.target); paint(e.target); } }), {rootMargin: '300px'});
function paint(el) { const p = get(el.dataset.thumb); if (p) el.style.backgroundImage = `url(${KTex.thumb(p)})`; }

/* ---------- pricing ---------- */
const VAT = .24;
function quantity(p, area, waste = 10) {
  const need = area * (1 + waste / 100), boxes = Math.ceil(need / p.box - 1e-9), m2 = +(boxes * p.box).toFixed(2), net = Math.round(m2 * p.price);
  return {need, boxes, m2, net, vat: Math.round(net * VAT), gross: net + Math.round(net * VAT)};
}
const lines = () => Object.entries(S.basket).map(([id, area]) => { const p = get(id); return p && area > 0 ? {p, area: Number(area), ...quantity(p, Number(area), 0)} : null; }).filter(Boolean);
const sum = (a, k) => a.reduce((s, x) => s + x[k], 0);

/* ---------- small UI ---------- */
function toast(msg, href, label) {
  const el = $('#toast'); el.innerHTML = `<span>${esc(msg)}</span>${href ? `<a href="${href}">${esc(label)} →</a>` : ''}`;
  el.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('show'), 3200);
}
const head = (eyebrow, title, text = '', side = '') => `<div class="page-head rv"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${text ? `<p>${text}</p>` : ''}</div>${side}</div>`;
const sec = (eyebrow, title, side = '', text = '') => `<div class="section-head rv"><div><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${text ? `<p>${text}</p>` : ''}</div>${side}</div>`;
const btn = (href, label, cls = 'pill') => `<a class="${cls}" href="${href}">${label}</a>`;
const empty = (title, text, href, label) => `<div class="empty rv"><div class="empty-art"><i></i><i></i><i></i><i></i></div><h3>${title}</h3><p>${text}</p>${href ? btn(href, label) : ''}</div>`;
const field = (label, name, o = {}) => `<label class="f">${label}${o.type === 'textarea'
  ? `<textarea name="${name}" maxlength="${o.max || 1500}" ${o.req ? 'required' : ''} placeholder="${o.ph || ''}">${esc(o.value || '')}</textarea>`
  : o.options ? `<select name="${name}" ${o.req ? 'required' : ''}>${o.options.map(([v, l]) => `<option value="${esc(v)}" ${v === o.value ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`
  : `<input name="${name}" type="${o.type || 'text'}" maxlength="${o.max || 160}" ${o.req ? 'required' : ''} ${o.min != null ? `min="${o.min}"` : ''} ${o.step ? `step="${o.step}"` : ''} ${o.pattern ? `pattern="${o.pattern}"` : ''} placeholder="${o.ph || ''}" value="${esc(o.value ?? '')}">`}</label>`;
const countryOptions = () => [['', t('Select country or territory')]].concat(D.countries.map(c => [c, country(c)]).sort((a, b) => a[1].localeCompare(b[1], locale())));
const mailto = (subject, body) => 'mailto:post@setai.no?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
const newId = p => p + '-' + Date.now().toString(36).toUpperCase();
const STATUS = ['Sample — not paid', 'Confirmed', 'Preparing', 'Shipped', 'Delivered'];
const isFav = id => S.favs.includes(id), inCmp = id => S.compare.includes(id);

function card(p) {
  return `<article class="product rv">
  <div class="product-media"><a href="#product/${p.id}" aria-label="${esc(p.name)}">${sw(p)}</a><span class="tag">${t('Sample')}</span>
    <button class="icon fav ${isFav(p.id) ? 'on' : ''}" data-act="fav" data-id="${p.id}" aria-pressed="${isFav(p.id)}" aria-label="${t('Save')} ${esc(p.name)}">♥</button>
    <button class="quick" data-act="room" data-id="${p.id}">${t('See in 3D room')} ↗</button></div>
  <div class="product-info"><div class="meta">${esc(p.vendor)} · ${t(p.type)}</div><h3><a href="#product/${p.id}">${esc(p.name)}</a></h3>
    <div class="meta">${p.size} · ${t(p.finish)}</div><div class="price">${fmt(p.price)} <small>/ m²</small></div>
    <div class="product-buttons"><button class="pill" data-act="add" data-id="${p.id}">${t('Add to basket')}</button><button class="outline ${inCmp(p.id) ? 'on' : ''}" data-act="cmp" data-id="${p.id}" aria-pressed="${inCmp(p.id)}">${t('Compare')}</button></div></div></article>`;
}
const grid = list => `<div class="product-grid">${list.map(card).join('')}</div>`;

/* ---------- 3D room (one instance, moved between pages) ---------- */
const room = {api: null, el: null, loading: null, cfg: null, target: 'floor'};
function roomCfg() {
  if (!room.cfg) room.cfg = Object.assign({floor: 5, wall: 1, room: 'living', width: 4, length: 5, day: .5, view: 'close'}, read('room', {}));
  if (!get(room.cfg.floor)) room.cfg.floor = 5; if (!get(room.cfg.wall)) room.cfg.wall = 1;
  return room.cfg;
}
function setRoom(patch) {
  Object.assign(roomCfg(), patch); save('room', room.cfg);
  if (room.api) { const p = {...patch}; if (p.floor) p.floor = get(p.floor); if (p.wall) p.wall = get(p.wall); room.api.set(p); }
}
function mountRoom(slot) {
  if (!room.el) { room.el = document.createElement('div'); room.el.className = 'room-stage'; room.el.innerHTML = '<div class="room-loading"><span></span></div><div class="room-hint"></div>'; }
  slot.replaceChildren(room.el);
  $('.room-hint', room.el).textContent = t('Drag to look around · tap a surface to change it');
  if (room.api || room.loading) return;
  $('.room-loading', room.el).classList.remove('done');
  room.loading = import('./room.js?v=' + V).then(m => {
    const c = roomCfg();
    room.api = m.createRoom(room.el, {...c, floor: get(c.floor), wall: get(c.wall), onPick: kind => { room.target = kind; paintStudio(); $('.tabbar [data-target].on')?.scrollIntoView({block: 'nearest', behavior: 'smooth'}); }});
    $('.room-loading', room.el).classList.add('done');
  }).catch(err => {
    console.error(err);
    $('.room-loading', room.el).innerHTML = `<p>${t('The 3D room could not start. It needs WebGL and an internet connection.')}</p>`;
  }).finally(() => { room.loading = null; });
}
function paintStudio() {
  const box = $('#studioControls'); if (!box) return;
  const c = roomCfg(), f = get(c.floor), w = get(c.wall), area = c.width * c.length, q = quantity(f, area, 10);
  const wallArea = (c.width + c.length) * 2.4, qw = quantity(w, wallArea, 10), cur = c[room.target];
  const keepScroll = $('.chips', box)?.scrollTop || 0;
  box.innerHTML = `<div class="tabbar">${['floor', 'wall'].map(k => `<button class="${room.target === k ? 'on' : ''}" data-act="target" data-target="${k}"><small>${t(k === 'floor' ? 'Floor' : 'Walls')}</small><b>${esc(get(c[k]).name)}</b></button>`).join('')}</div>
  <div class="chips">${visible().map(p => `<button class="chip ${p.id === cur ? 'on' : ''}" data-act="tile" data-id="${p.id}" aria-pressed="${p.id === cur}">${sw(p)}<b>${esc(p.name)}</b></button>`).join('')}</div>
  <div class="sliders"><label>${t('Width')} <b>${num(c.width, 1)} m</b><input type="range" data-range="width" min="2" max="9" step=".5" value="${c.width}"></label><label>${t('Length')} <b>${num(c.length, 1)} m</b><input type="range" data-range="length" min="2.5" max="12" step=".5" value="${c.length}"></label></div>
  <dl class="sumlist"><div><dt>${t('Floor')} · ${num(q.m2, 2)} m²</dt><dd>${fmt(q.gross)}</dd></div><div><dt>${t('Two walls')} · ${num(qw.m2, 2)} m²</dt><dd>${fmt(qw.gross)}</dd></div><div class="grand"><dt>${t('Material estimate incl. VAT')}</dt><dd>${fmt(q.gross + qw.gross)}</dd></div></dl>
  <p class="fine">${t('Includes 10 % waste, rounded to whole boxes. Delivery and installation are not included.')}</p>
  <div class="row"><button class="pill" data-act="addroom">${t('Add both to basket')}</button><button class="outline" data-act="quoteroom">${t('Request a quote')}</button></div>`;
  $$('[data-thumb]', box).forEach(paint); $('.chips', box).scrollTop = keepScroll;
  $$('[data-act=roomtype]').forEach(b => b.classList.toggle('on', b.dataset.room === c.room));
  $$('[data-act=view]').forEach(b => b.classList.toggle('on', b.dataset.view === c.view));
  const day = $('#day'); if (day) day.value = c.day * 100;
}

/* ---------- charts ---------- */
function bars(entries) {
  const max = Math.max(1, ...entries.map(e => e[1]));
  return `<div class="bars">${entries.map(([label, v]) => `<div class="bar-row"><span>${esc(label)}</span><i><b style="--w:${v / max * 100}%"></b></i><em>${fmt(v)}</em></div>`).join('')}</div>`;
}

/* ---------- demo data so the workspaces have something to show ---------- */
function seed(force) {
  if (S.seeded && !force && S.prospects.length) return;
  if (S.seeded && !force) { if (S.orders.some(o => o.demo)) force = true; else return; }
  const day = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  const o = (i, ago, status, items) => ({id: 'DEMO-' + (1040 + i), demo: true, date: day(ago), rate: 15, status, items: items.map(([id, qty]) => { const p = get(id); return {name: p.name, vendor: p.vendor, qty, total: Math.round(p.price * qty)}; })});
  S.orders = S.orders.filter(x => !x.demo).concat([o(1, 24, 'Delivered', [[2, 25.92], [9, 12.96]]), o(2, 17, 'Delivered', [[1, 17.28]]), o(3, 11, 'Shipped', [[3, 34.56], [6, 4]]), o(4, 5, 'Preparing', [[7, 48.96], [4, 7.92]]), o(5, 2, 'Confirmed', [[12, 21.6]]), o(6, 1, 'Sample — not paid', [[5, 9.6], [8, 14.4]])]);
  S.quotes = S.quotes.filter(x => !x.demo).concat([
    {demo: true, id: 'DEMO-Q1', createdAt: day(3), product: 'Basalt Graphite', area: 140, country: 'IS', details: 'Demo: entrance hall and stairs for a small office.'},
    {demo: true, id: 'DEMO-Q2', createdAt: day(1), product: 'Ivory Vein', area: 62, country: 'NO', details: 'Demo: two bathrooms, delivery in spring.'}]);
  S.applications = S.applications.filter(x => !x.demo).concat([{demo: true, id: 'DEMO-A1', createdAt: day(4), company: 'Demo Keramik AS', country: 'NO', city: 'Bergen', products: 'Wall tiles', status: 'Pending review'}]);
  S.prospects = S.prospects.filter(x => !x.demo).concat([['Demo Stein AS', 'NO', 'Oslo', 'Identified'], ['Demo Flis AS', 'NO', 'Bergen', 'Contacted'], ['Demo Naturstein AS', 'NO', 'Trondheim', 'Meeting'], ['Demo Flísar ehf.', 'IS', 'Reykjavík', 'Identified'], ['Demo Steinn ehf.', 'IS', 'Akureyri', 'Agreement sent']].map(([company, c, city, stage]) => ({demo: true, company, country: c, city, stage})));
  S.seeded = true; keep('orders', 'quotes', 'applications', 'prospects', 'seeded');
}

/* ---------- pages ---------- */
const pages = {};

pages.home = () => {
  const newest = visible().slice().sort((a, b) => b.added - a.added).slice(0, 4);
  return `<section class="hero rv"><div class="hero-copy"><div class="eyebrow">${t('Norway · Iceland · global sourcing')}</div>
    <h1>${t('Beautiful surfaces.')}<br><em>${t('One marketplace.')}</em></h1>
    <p>${t('Discover tiles, stone and architectural materials from independent sellers. Compare, design and order through KASHI.')}</p>
    <div class="row">${btn('#market', t('Explore marketplace') + ' ↗')}${btn('#studio', t('Open 3D studio'), 'outline')}</div>
    <ul class="hero-stats"><li><b data-count="${visible().length}">0</b>${t('sample surfaces')}</li><li><b data-count="${D.sellers.length}">0</b>${t('sample sellers')}</li><li><b data-count="3">0</b>${t('3D room types')}</li></ul></div>
  <div class="hero-show" id="heroShow">${D.looks.slice(0, 4).map((l, i) => `<button class="slide ${i ? '' : 'on'}" data-act="look" data-look="${l.id}"><img src="img/look-${l.id}.jpg?v=${V}" alt="${t(l.name)}" ${i ? 'loading="lazy"' : ''}><span><small>${t('3D concept render')}</small><b>${t(l.name)}</b><em>${t('Open this room')} ↗</em></span></button>`).join('')}<div class="dots">${[0, 1, 2, 3].map(i => `<button data-act="slide" data-i="${i}" class="${i ? '' : 'on'}" aria-label="${i + 1}"></button>`).join('')}</div></div></section>
  <div class="marquee" aria-hidden="true"><div>${visible().concat(visible()).map(p => `<a href="#product/${p.id}" tabindex="-1">${sw(p)}<span>${esc(p.name)}</span></a>`).join('')}</div></div>
  <section class="guide rv"><div><div class="eyebrow">${t('Smart discovery')}</div><h2>${t('Tell us about your space.')}</h2><p>${t('Rule-based search in the sample catalogue, not AI.')}</p></div>
    <form id="guideForm">${field(t('What are you looking for?'), 'query', {ph: t('For example: light porcelain tiles for my bathroom'), max: 300})}<div class="quickpicks">${[['bathroom', 'Bathroom'], ['kitchen', 'Kitchen'], ['living', 'Living room'], ['outdoor', 'Outdoor']].map(([v, l]) => `<label><input type="radio" name="room" value="${v}"><span>${t(l)}</span></label>`).join('')}</div>
    <div class="cols">${field(t('Look'), 'tone', {options: [['', t('Any')], ['Light', t('Light')], ['Warm', t('Warm')], ['Grey', t('Grey')], ['Dark', t('Dark')], ['Colour', t('Colour')]]})}${field(t('Area (m²)'), 'area', {type: 'number', min: 1, step: '0.1', value: 12})}${field(t('Budget (ISK, excl. VAT)'), 'budget', {type: 'number', min: 1})}${field(t('Delivery city or country'), 'destination', {max: 120})}</div>
    <button class="pill">${t('Find my materials')} →</button></form><div id="guideOut" class="guide-out" aria-live="polite"></div></section>
  <section class="section">${sec('01 · ' + t('Collections'), t('Find your surface.'), btn('#market', t('All products') + ' ↗', 'outline'))}
    <div class="cats">${[['Porcelain', 2], ['Natural stone', 1], ['Ceramic', 6], ['', 3]].map(([type, id]) => `<a class="cat rv" href="#market?type=${encodeURIComponent(type)}">${sw(get(id))}<span><b>${t(type || 'All collections')}</b><small>${t('{n} surfaces', {n: num(visible().filter(p => !type || p.type === type).length)})}</small></span></a>`).join('')}</div></section>
  <section class="section">${sec('02 · ' + t('New in'), t('Selected materials'), btn('#market?sort=new', t('See all new') + ' ↗', 'outline'))}${grid(newest)}</section>
  <section class="section">${sec('03 · ' + t('Inspiration'), t('Rooms to start from'), btn('#inspiration', t('All rooms') + ' ↗', 'outline'))}<div class="looks">${D.looks.slice(3).map(lookCard).join('')}</div></section>
  <section class="section">${sec('04 · ' + t('How it works'), t('From idea to order'))}<ol class="steps">${[['Discover', 'Filter by material, tone, format and seller.'], ['Visualise', 'Try floor and wall together in a lit 3D room.'], ['Calculate', 'Get whole boxes, waste and VAT up front.'], ['Order or ask', 'Check out a sample order or request a quote.']].map(([a, b], i) => `<li class="rv"><span>${num(i + 1)}</span><h3>${t(a)}</h3><p>${t(b)}</p></li>`).join('')}</ol></section>
  <section class="section">${sec('05 · ' + t('Journal'), t('Material knowledge'), btn('#journal', t('All articles') + ' ↗', 'outline'))}<div class="journal">${D.articles.slice(0, 3).map(articleCard).join('')}</div></section>
  <section class="seller-banner rv"><div><div class="eyebrow">${t('Partnerships')}</div><h2>${t('Your products. Our marketplace.')}</h2><p>${t('Reach new customers with a digital storefront, product catalogue and order management. Keep your own brand and prices.')}</p><div class="row">${btn('#founding', t('Founding Partners 2026'))}${btn('#apply', t('Become a seller'), 'outline')}</div></div>
    <div class="statlist"><div class="stat"><small>${t('Buyers pay')}</small><b>0 NOK</b></div><div class="stat"><small>${t(introOpen() ? 'Intro year until 31 Dec 2026' : 'Annual seller fee')}</small><b>${nok(introOpen() ? OFFER.intro : OFFER.standard)}</b></div><div class="stat"><small>${t('Standard annual fee')}</small><b>${nok(OFFER.standard)}</b></div></div></section>`;
};
const lookCard = l => `<button class="look rv" data-act="look" data-look="${l.id}"><img src="img/look-${l.id}.jpg?v=${V}" alt="${t(l.name)}" loading="lazy"><span><b>${t(l.name)}</b><small>${esc(get(l.floor).name)} + ${esc(get(l.wall).name)}</small></span></button>`;
const articleCard = a => `<a class="article rv" href="#journal/${a.slug}"><div><img src="img/${a.img}.jpg" alt="" loading="lazy"></div><small>${t(a.cat)} · ${t('{n} min read', {n: num(a.min)})}</small><h3>${t(a.title)}</h3><p>${t(a.lead)}</p></a>`;

/* rule-based matching of a free-text wish in EN, NO, IS and FA (not AI) */
const RULES = {
  type: [['Porcelain', /porcelain|porselen|porcel[æa]n|postulín|پرسلان|پرسلن/i], ['Natural stone', /natural stone|naturstein|travertin|limestone|marble stone|náttúrustein|تراورتن|سنگ/i], ['Ceramic', /ceramic|keramikk|keramik|سرامیک/i]],
  tone: [['Light', /light|beige|white|lys|hvit|ljós|hvít|روشن|سفید|کرم/i], ['Dark', /dark|black|mørk|svart|dökk|svart|تیره|مشکی/i], ['Grey', /gr[ae]y|grå|grár|خاکستری/i], ['Warm', /warm|varm|hlý|گرم/i], ['Colour', /green|blue|colou?r|grønn|blå|grænn|blár|سبز|آبی|رنگ/i]],
  room: [['bathroom', /bath|\bbad(et|erom|erommet)?\b|baðherb|حمام/i], ['kitchen', /kitchen|kjøkken|eldhús|آشپزخانه/i], ['outdoor', /outdoor|terrace|utendørs|\bute|úti|فضای باز|تراس/i], ['living', /living|stue|stofa|پذیرایی|نشیمن/i]]
};
function match(text) {
  const q = text.toLowerCase().normalize('NFKC'), pick = k => RULES[k].find(r => r[1].test(q))?.[0] || '', words = q.split(/[\s,.;]+/).filter(w => w.length > 2);
  return {type: pick('type'), tone: pick('tone'), room: pick('room'), score: p => words.filter(w => [p.name, p.type, p.finish, p.style].join(' ').toLowerCase().includes(w)).length};
}

/* marketplace */
const F = {q: '', type: '', vendor: '', tone: '', finish: '', room: '', max: 20000, sort: ''};
function filtered() {
  const q = F.q.toLowerCase();
  const list = visible().filter(p => (!q || [p.name, p.type, t(p.type), p.vendor, p.size, p.finish, p.tone].join(' ').toLowerCase().includes(q))
    && (!F.type || p.type === F.type) && (!F.vendor || p.vendor === F.vendor) && (!F.tone || p.tone === F.tone) && (!F.finish || p.finish === F.finish)
    && (!F.room || p.rooms.includes(F.room)) && p.price <= F.max);
  const by = {low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price, new: (a, b) => b.added - a.added, name: (a, b) => a.name.localeCompare(b.name)}[F.sort];
  return by ? list.sort(by) : list;
}
function paintMarket() {
  const list = filtered();
  $('#results').innerHTML = list.length ? grid(list) : empty(t('No matching products'), t('Try fewer filters or ask sellers for a quote.'), '#quote', t('Request a quote'));
  $('#resultCount').textContent = t('{n} surfaces', {n: num(list.length)});
  const active = ['type', 'vendor', 'tone', 'finish', 'room', 'q'].filter(k => F[k]);
  $('#activeFilters').innerHTML = active.map(k => `<button data-act="unfilter" data-key="${k}">${esc(k === 'q' || k === 'vendor' ? F[k] : t(ROOMS[F[k]] || F[k]))} ×</button>`).join('') + (active.length ? `<button data-act="reset">${t('Clear all')}</button>` : '');
  $('#maxOut').textContent = fmt(F.max);
  decorate($('#results'));
}
const ROOMS = {bathroom: 'Bathroom', kitchen: 'Kitchen', living: 'Living room', outdoor: 'Outdoor'};
pages.market = (arg, query) => {
  if ([...query.keys()].length) Object.assign(F, {q: '', type: '', vendor: '', tone: '', finish: '', room: '', max: 20000, sort: ''}, ...['q', 'type', 'vendor', 'tone', 'finish', 'room', 'sort'].filter(k => query.has(k)).map(k => ({[k]: query.get(k)})));
  const uniq = k => [...new Set(visible().map(p => p[k]))];
  const sel = (k, label, options) => `<label class="f">${label}<select data-filter="${k}"><option value="">${t('All')}</option>${options.map(([v, l]) => `<option value="${esc(v)}" ${F[k] === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  return head(t('Sample catalogue'), t('Marketplace'), t('Prices per m², excluding VAT and delivery.'))
    + `<div class="market"><aside class="filters" id="filters"><label class="f">${t('Search')}<input type="search" data-filter="q" value="${esc(F.q)}" placeholder="${t('Name, brand, material…')}"></label>
    ${sel('type', t('Material'), uniq('type').map(v => [v, t(v)]))}${sel('room', t('Room'), Object.entries(ROOMS).map(([v, l]) => [v, t(l)]))}${sel('tone', t('Look'), uniq('tone').map(v => [v, t(v)]))}${sel('finish', t('Finish'), uniq('finish').map(v => [v, t(v)]))}${sel('vendor', t('Seller'), uniq('vendor').map(v => [v, v]))}
    <label class="f">${t('Max price per m²')} <b id="maxOut"></b><input type="range" data-filter="max" min="6000" max="20000" step="500" value="${F.max}"></label></aside>
    <div><div class="toolbar"><button class="outline filter-toggle" data-act="filters">${t('Filters')}</button><b id="resultCount"></b><div id="activeFilters" class="active-filters"></div>
    <select data-filter="sort" aria-label="${t('Sort')}">${[['', 'Recommended'], ['new', 'Newest'], ['low', 'Price: low to high'], ['high', 'Price: high to low'], ['name', 'Name']].map(([v, l]) => `<option value="${v}" ${F.sort === v ? 'selected' : ''}>${t(l)}</option>`).join('')}</select></div><div id="results"></div></div></div>`;
};

/* product detail */
pages.product = id => {
  const p = get(id); if (!p || S.hidden.includes(p.id)) return pages.missing();
  S.recent = [p.id, ...read('recent', []).filter(x => x !== p.id)].slice(0, 5); save('recent', S.recent);
  const similar = visible().filter(x => x.id !== p.id && (x.type === p.type || x.tone === p.tone)).slice(0, 4), s = seller(p.vendor);
  const recent = S.recent.slice(1).map(get).filter(Boolean);
  return `<nav class="crumbs"><a href="#market">${t('Marketplace')}</a> / <a href="#market?type=${encodeURIComponent(p.type)}">${t(p.type)}</a> / <span>${esc(p.name)}</span></nav>
  <div class="pdp"><div class="pdp-media rv"><div class="zoom" id="zoom">${sw(p)}</div><div class="views"><button class="on" data-act="zoomview" data-scale="cover">${t('Surface')}</button><button data-act="zoomview" data-scale="200%">${t('Close-up')}</button><button data-act="zoomview" data-scale="40%">${t('Layout')}</button></div></div>
  <div class="pdp-info rv"><div class="eyebrow">${esc(p.vendor)} · ${t('Sample')}</div><h1>${esc(p.name)}</h1><div class="price big">${fmt(p.price)} <small>/ m² · ${t('excl. VAT')}</small></div>
    <dl class="specs">${[['Material', t(p.type)], ['Format', p.size], ['Finish', t(p.finish)], ['Coverage per box', num(p.box, 2) + ' m²'], ['Intended rooms', p.rooms.map(r => t(ROOMS[r])).join(', ')], ['Slip and frost rating', t('Pending verification')], ['Test report and CE declaration', t('Pending verification')]].map(([k, v]) => `<div><dt>${t(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>
    <form id="calcForm" class="calc" data-id="${p.id}"><h3>${t('Calculate your order')}</h3><div class="cols">${field(t('Area (m²)'), 'area', {type: 'number', min: .1, step: '0.1', value: 12, req: true})}${field(t('Waste allowance'), 'waste', {options: [['5', '5 %'], ['10', '10 %'], ['15', '15 %']], value: '10'})}</div><div id="calcOut" aria-live="polite"></div>
      <div class="row"><button class="pill">${t('Add to basket')}</button><button type="button" class="outline" data-act="room" data-id="${p.id}">${t('See in 3D room')}</button></div></form>
    <div class="row links"><button data-act="fav" data-id="${p.id}" class="${isFav(p.id) ? 'on' : ''}">♥ ${t('Save')}</button><button data-act="cmp" data-id="${p.id}" class="${inCmp(p.id) ? 'on' : ''}">⇄ ${t('Compare')}</button><button data-act="sample" data-id="${p.id}">◧ ${t('Request sample')}</button><button data-act="quote" data-id="${p.id}">✎ ${t('Request a quote')}</button></div>
    ${s ? `<a class="sellerline" href="#seller-profile/${s.slug}"><span class="mono">${s.mono}</span><span><b>${s.name}</b><small>${country(s.code)} · ${t('example lead time {n} days', {n: num(s.lead)})}</small></span><em>→</em></a>` : ''}</div></div>
  <section class="section">${sec(t('Similar'), t('You may also like'))}${grid(similar)}</section>
  ${recent.length ? `<section class="section">${sec(t('History'), t('Recently viewed'))}${grid(recent.slice(0, 4))}</section>` : ''}`;
};
function paintCalc() {
  const f = $('#calcForm'); if (!f) return;
  const p = get(f.dataset.id), a = Math.max(0, Number(f.area.value) || 0), q = quantity(p, a, Number(f.waste.value));
  $('#calcOut').innerHTML = `<dl class="sumlist"><div><dt>${t('Boxes')}</dt><dd>${num(q.boxes)} · ${num(q.m2, 2)} m²</dd></div><div><dt>${t('Excl. VAT')}</dt><dd>${fmt(q.net)}</dd></div><div><dt>${t('VAT 24 %')}</dt><dd>${fmt(q.vat)}</dd></div><div class="grand"><dt>${t('Total')}</dt><dd>${fmt(q.gross)}</dd></div></dl>`;
}

pages.favorites = () => {
  const list = S.favs.map(get).filter(Boolean), smp = S.samples.map(get).filter(Boolean);
  return head(t('Your selection'), t('Saved surfaces'), t('Stored in this browser only.'))
    + (list.length ? grid(list) : empty(t('Nothing saved yet'), t('Tap the heart on a product to keep it here.'), '#market', t('Explore marketplace')))
    + `<section class="section">${sec(t('Samples'), t('Sample box'), '', t('Up to five surfaces. Review version: nothing is shipped.'))}${smp.length ? `<div class="panel">${smp.map(p => `<div class="line">${sw(p, 'mini')}<div><a href="#product/${p.id}"><b>${esc(p.name)}</b></a><small>${esc(p.vendor)}</small></div><button data-act="unsample" data-id="${p.id}" aria-label="${t('Remove')}">×</button></div>`).join('')}<div class="row">${btn(mailto('KASHI sample request', smp.map(p => '- ' + p.name + ' (' + p.size + ')').join('\n') + '\n\nName:\nAddress:'), t('Ask about samples by email'))}</div></div>` : `<p class="muted">${t('No samples selected.')}</p>`}</section>`;
};

pages.compare = () => {
  const list = S.compare.map(get).filter(Boolean);
  if (!list.length) return head(t('Side by side'), t('Compare')) + empty(t('Nothing to compare'), t('Choose up to four surfaces in the marketplace.'), '#market', t('Explore marketplace'));
  const row = (label, f) => `<tr><th>${t(label)}</th>${list.map(p => `<td>${f(p)}</td>`).join('')}</tr>`;
  return head(t('Side by side'), t('Compare'), t('Up to four surfaces.'), `<button class="outline" data-act="clearcmp">${t('Clear all')}</button>`)
    + `<div class="panel tablewrap rv"><table class="cmp"><tr><th></th>${list.map(p => `<td><a href="#product/${p.id}">${sw(p)}<b>${esc(p.name)}</b></a></td>`).join('')}</tr>
    ${row('Price per m²', p => fmt(p.price))}${row('Material', p => t(p.type))}${row('Format', p => p.size)}${row('Finish', p => t(p.finish))}${row('Look', p => t(p.tone))}${row('Intended rooms', p => p.rooms.map(r => t(ROOMS[r])).join(', '))}${row('Seller', p => esc(p.vendor))}${row('12 m² incl. VAT and 10 % waste', p => `<b>${fmt(quantity(p, 12).gross)}</b>`)}
    <tr><th></th>${list.map(p => `<td><button class="pill" data-act="add" data-id="${p.id}">${t('Add to basket')}</button><button class="textbtn" data-act="cmp" data-id="${p.id}">${t('Remove')}</button></td>`).join('')}</tr></table></div>`;
};

pages.studio = () => head(t('3D studio'), t('Design your room'), t('A live, lit room. Choose a room, swap floor and wall surfaces and move the daylight.'))
  + `<div class="studio"><div class="studio-main"><div class="segment">${[['living', 'Living room'], ['bathroom', 'Bathroom'], ['kitchen', 'Kitchen']].map(([v, l]) => `<button data-act="roomtype" data-room="${v}">${t(l)}</button>`).join('')}</div><div id="roomSlot"></div>
  <div class="studio-bar"><div class="segment">${[['close', 'Inside'], ['perspective', 'Room'], ['front', 'Front'], ['left', 'Side'], ['top', 'Top']].map(([v, l]) => `<button data-act="view" data-view="${v}">${t(l)}</button>`).join('')}</div><label class="day">☀ ${t('Daylight')}<input type="range" id="day" data-range="day" min="0" max="100"></label><button class="outline" data-act="snap">⤓ ${t('Save image')}</button><button class="outline" data-act="share">⛓ ${t('Copy link')}</button></div></div>
  <aside class="panel" id="studioControls"></aside></div><p class="fine">${t('Visual preview only. Real patterns, colours and sizes depend on manufacturer samples.')}</p>
  <section class="section">${sec(t('Presets'), t('Rooms to start from'))}<div class="looks">${D.looks.map(lookCard).join('')}</div></section>`;

pages.inspiration = () => head(t('Inspiration'), t('Rooms to start from'), t('3D concept renders made with the sample surfaces. Open any room and make it yours.'))
  + `<div class="looks big">${D.looks.map(lookCard).join('')}</div><section class="section">${sec(t('Interiors'), t('Mood references'), '', t('Photographs for mood only. They do not show KASHI products or projects.'))}<div class="photos">${['living', 'dining', 'lounge', 'bedroom', 'exterior'].map(n => `<img class="rv" src="img/${n}.jpg" alt="" loading="lazy">`).join('')}</div></section>`;

/* sellers */
pages.partners = () => {
  const approved = S.applications.filter(a => a.status === 'Approved');
  return head(t('Partner pipeline'), t('Brands & sellers'), t('Listings require approval and signed commercial agreements.'), btn('#apply', t('Become a seller')))
    + `<div class="sellers">${D.sellers.map(s => { const list = visible().filter(p => p.vendor === s.name); return `<a class="seller-card rv" href="#seller-profile/${s.slug}"><div class="mosaic">${list.slice(0, 3).map(p => sw(p)).join('')}</div><div><span class="mono">${s.mono}</span><h3>${s.name}</h3><small>${s.city}, ${country(s.code)} · ${t('Sample seller')}</small><p>${t(s.about)}</p><b>${t('{n} surfaces', {n: num(list.length)})} →</b></div></a>`; }).join('')}</div>
    <div class="two section"><div class="panel rv"><h3>${t('Potential suppliers')}</h3><p class="muted">${t('Not onboarded. No products are offered on their behalf.')}</p>${D.prospects.map(s => `<div class="line"><span class="mono">${s.mono}</span><div><b>${s.name}</b><small>${t(s.state)}</small></div></div>`).join('')}<div class="row">${btn('../catalog/', t('Supplier discovery catalogue') + ' ↗', 'outline')}</div></div>
    <div class="panel rv"><h3>${t('Seller directory')}</h3><p class="muted">${t('Applications saved in this browser. Approve them in the admin review.')}</p>${S.applications.length ? `<input class="search" data-dir type="search" placeholder="${t('Filter by company, city or country')}">` : ''}<div id="directory"></div><p class="muted">${t('{n} approved in this review', {n: num(approved.length)})}</p></div></div>`;
};
function paintDirectory(q = '') {
  const el = $('#directory'); if (!el) return;
  const list = S.applications.filter(a => [a.company, a.city, country(a.country)].join(' ').toLowerCase().includes(q.toLowerCase()));
  el.innerHTML = list.length ? list.map(a => `<div class="line"><span class="mono">${esc((a.company || '?')[0])}</span><div><b>${esc(a.company)}</b><small>${esc(a.city || '')}${a.city ? ', ' : ''}${esc(country(a.country))}</small></div><span class="badge">${t(a.status || 'Pending review')}</span></div>`).join('') : `<p class="muted">${t('No applications yet.')}</p>`;
}
pages['seller-profile'] = slug => {
  const s = D.sellers.find(x => x.slug === slug); if (!s) return pages.missing();
  const list = visible().filter(p => p.vendor === s.name);
  return `<nav class="crumbs"><a href="#partners">${t('Brands & sellers')}</a> / <span>${s.name}</span></nav><div class="profile rv"><div class="mosaic">${list.slice(0, 4).map(p => sw(p)).join('')}</div><div><span class="mono">${s.mono}</span><h1>${s.name}</h1><p>${t(s.about)}</p><dl class="specs"><div><dt>${t('Location')}</dt><dd>${s.city}, ${country(s.code)}</dd></div><div><dt>${t('Example lead time')}</dt><dd>${t('{n} days', {n: num(s.lead)})}</dd></div><div><dt>${t('Verification')}</dt><dd>${t('Sample seller, not a real company listing')}</dd></div></dl><button class="pill" data-act="quoteseller" data-name="${s.name}">${t('Request a quote')}</button></div></div><section class="section">${sec(t('Catalogue'), t('{n} surfaces', {n: num(list.length)}))}${grid(list)}</section>`;
};

pages.apply = () => head(t('Seller onboarding'), t('Become a seller'), t('Join the marketplace and keep your own brand, catalogue and prices.'), btn('#founding', t('Founding Partners 2026'), 'outline'))
  + `<div class="two wide-left"><form id="applyForm" class="panel rv" novalidate><ol class="progress">${['Company', 'Delivery', 'Products'].map((l, i) => `<li class="${i ? '' : 'on'}">${t(l)}</li>`).join('')}</ol>
  <p class="msg">${t('Review version: use fictitious company information. Selecting a country is not approval to trade.')}</p>
  <fieldset data-step="0">${field(t('Company name'), 'company', {req: true})}${field(t('Business registration number'), 'registration', {req: true})}<div class="cols">${field(t('Country'), 'country', {options: countryOptions(), req: true})}${field(t('City'), 'city', {req: true})}${field(t('Postal code'), 'postalCode')}</div>${field(t('Website'), 'website', {type: 'url', ph: 'https://'})}${field(t('Business email'), 'email', {type: 'email', req: true})}</fieldset>
  <fieldset data-step="1" hidden>${field(t('Delivery regions (countries or cities)'), 'deliveryRegions', {req: true})}<div class="cols">${field(t('Currency (ISO code)'), 'currency', {req: true, pattern: '[A-Za-z]{3}', max: 3, value: 'ISK'})}${field(t('Typical lead time (days)'), 'lead', {type: 'number', min: 1})}</div></fieldset>
  <fieldset data-step="2" hidden>${field(t('Products and categories'), 'products', {type: 'textarea', req: true})}<label class="check"><input type="checkbox" required name="accept"> <span>${t('I understand this is a review version and no application is sent.')}</span></label></fieldset>
  <div class="row"><button type="button" class="outline" data-act="step" data-dir="-1" hidden>${t('Back')}</button><button type="button" class="pill" data-act="step" data-dir="1">${t('Continue')}</button><button class="pill" hidden id="applySend">${t('Save application')}</button></div></form>
  <div><div class="panel rv"><h3>${t('How it works')}</h3><ol class="timeline">${['Apply and verify business identity.', 'Agree commission and fulfilment terms.', 'Publish the approved catalogue.', 'Receive and fulfil orders.', 'Reconcile sales, returns and commission.'].map(x => `<li>${t(x)}</li>`).join('')}</ol></div>
  <div class="panel rv"><h3>${t('Earnings example')}</h3><label>${t('Monthly sales')} <b id="earnOut"></b><input type="range" data-range="earn" min="100000" max="10000000" step="100000" value="1500000"></label><dl class="sumlist" id="earnList"></dl><p class="fine">${t('The commission rate is not decided. This is only a calculation example.')}</p></div></div></div>`;
function paintEarn(v = 1500000) { const el = $('#earnList'); if (!el) return; $('#earnOut').textContent = fmt(v); el.innerHTML = `<div><dt>${t('Commission')} (${num(S.rate)} %)</dt><dd>${fmt(v * S.rate / 100)}</dd></div><div class="grand"><dt>${t('Seller share before other fees')}</dt><dd>${fmt(v * (1 - S.rate / 100))}</dd></div>`; }

pages.quote = () => {
  const pre = read('quoteDraft', {});
  return head(t('Projects and large quantities'), t('Request a quote'), t('For large quantities, custom sizes or complete projects.'))
    + `<div class="two wide-left"><form id="quoteForm" class="panel rv">${field(t('Product or project'), 'product', {req: true, value: pre.product, ph: t('Which material are you looking for?')})}<div class="cols">${field(t('Area (m²)'), 'area', {type: 'number', min: 1, step: '0.1', req: true, value: pre.area})}${field(t('Delivery country'), 'country', {options: countryOptions(), value: 'IS', req: true})}${field(t('Needed by'), 'when', {type: 'date'})}</div>
  <div class="cols">${field(t('Your name'), 'name', {req: true})}${field(t('Email'), 'email', {type: 'email', req: true})}</div>${field(t('Project details'), 'details', {type: 'textarea', value: pre.details})}<button class="pill">${t('Save quote request')}</button><div id="quoteMsg" aria-live="polite"></div></form>
  <div><div class="panel rv"><h3>${t('One request. Multiple sellers.')}</h3><p>${t('KASHI can route your request to eligible sellers, compare offers and keep the transaction in the platform.')}</p><p class="msg">${t('This review version stores the form in your browser. No seller receives it.')}</p></div><div class="panel rv"><h3>${t('Want a real answer now?')}</h3><p>${t('Send your question to the KASHI team from your own email app.')}</p>${btn('#contact', t('Contact the team'), 'outline')}</div></div></div>`;
};

/* basket and checkout */
pages.basket = () => {
  const l = lines();
  if (!l.length) return head(t('Your order'), t('Basket')) + empty(t('Your basket is empty'), t('Add surfaces from the marketplace or the 3D studio.'), '#market', t('Explore marketplace'));
  const vendors = [...new Set(l.map(x => x.p.vendor))];
  return head(t('Your order'), t('Basket'), t('Multi-seller order · no live payment.'), btn('#market', t('Continue shopping'), 'outline'))
    + `<div class="two wide-left"><div>${vendors.map(v => `<div class="panel rv"><h3>${esc(v)}</h3>${l.filter(x => x.p.vendor === v).map(x => `<div class="line">${sw(x.p, 'mini')}<div><a href="#product/${x.p.id}"><b>${esc(x.p.name)}</b></a><small>${fmt(x.p.price)}/m² · ${t('{n} boxes', {n: num(x.boxes)})} · ${num(x.m2, 2)} m²</small></div><label class="qty"><input type="number" min="0.1" max="10000" step="0.1" value="${x.area}" data-qty="${x.p.id}" aria-label="${t('Area (m²)')}"> m²</label><b class="amt">${fmt(x.net)}</b><button data-act="remove" data-id="${x.p.id}" aria-label="${t('Remove')} ${esc(x.p.name)}">×</button></div>`).join('')}</div>`).join('')}</div>
  <div class="panel summary rv"><h3>${t('Order summary')}</h3><dl class="sumlist"><div><dt>${t('Excl. VAT')}</dt><dd>${fmt(sum(l, 'net'))}</dd></div><div><dt>${t('VAT 24 %')}</dt><dd>${fmt(sum(l, 'vat'))}</dd></div><div><dt>${t('Delivery')}</dt><dd>${t('Quoted by seller')}</dd></div><div class="grand"><dt>${t('Total')}</dt><dd>${fmt(sum(l, 'gross'))}</dd></div></dl><p class="fine">${t('{n} seller(s). Quantities are rounded up to whole boxes.', {n: num(vendors.length)})}</p>${btn('#checkout', t('Go to checkout') + ' →')}</div></div>`;
};
pages.checkout = () => {
  const l = lines(); if (!l.length) return pages.basket();
  return head(t('Checkout preview'), t('Complete your sample order'), t('No payment is taken and no goods are shipped.'))
    + `<div class="two wide-left"><form id="checkoutForm" class="panel rv" novalidate><ol class="progress">${['Details', 'Delivery', 'Review'].map((x, i) => `<li class="${i ? '' : 'on'}">${t(x)}</li>`).join('')}</ol>
  <p class="msg">${t('Use fictitious details. They stay in your browser.')}</p>
  <fieldset data-step="0"><div class="cols">${field(t('Your name'), 'name', {req: true})}${field(t('Email'), 'email', {type: 'email', req: true})}</div>${field(t('Customer type'), 'customer', {options: [['private', t('Private')], ['business', t('Business')]]})}</fieldset>
  <fieldset data-step="1" hidden>${field(t('Address'), 'address', {req: true})}<div class="cols">${field(t('Postal code'), 'postalCode', {req: true})}${field(t('City'), 'city', {req: true})}${field(t('Country'), 'country', {options: countryOptions(), value: 'IS', req: true})}</div>${field(t('Delivery method'), 'method', {options: [['curb', t('Kerbside delivery')], ['pickup', t('Collect from seller')]]})}</fieldset>
  <fieldset data-step="2" hidden><div id="review"></div><label class="check"><input type="checkbox" required name="accept"> <span>${t('I understand that this is a sample order with no payment.')}</span></label></fieldset>
  <div class="row"><button type="button" class="outline" data-act="step" data-dir="-1" hidden>${t('Back')}</button><button type="button" class="pill" data-act="step" data-dir="1">${t('Continue')}</button><button class="pill" hidden id="applySend">${t('Place sample order')}</button></div></form>
  <div class="panel summary rv"><h3>${t('Order summary')}</h3>${l.map(x => `<div class="line">${sw(x.p, 'mini')}<div><b>${esc(x.p.name)}</b><small>${num(x.m2, 2)} m²</small></div><b class="amt">${fmt(x.net)}</b></div>`).join('')}<dl class="sumlist"><div><dt>${t('VAT 24 %')}</dt><dd>${fmt(sum(l, 'vat'))}</dd></div><div class="grand"><dt>${t('Total')}</dt><dd>${fmt(sum(l, 'gross'))}</dd></div></dl></div></div>`;
};
const timeline = status => `<ol class="track">${STATUS.map((s, i) => `<li class="${i <= Math.max(0, STATUS.indexOf(status)) ? 'on' : ''}">${t(i ? s : 'Received')}</li>`).join('')}</ol>`;
pages.orders = highlight => {
  const mine = S.orders.filter(o => !o.demo).slice().reverse(), quotes = S.quotes.filter(q => !q.demo).slice().reverse();
  return head(t('Your activity'), t('Orders and quotes'), t('Stored in this browser only.'))
    + (highlight ? `<div class="success rv"><span>✓</span><div><h3>${t('Sample order saved')}</h3><p>${esc(highlight)} · ${t('No purchase or payment was made.')}</p></div></div>` : '')
    + (mine.length ? mine.map(o => `<div class="panel order rv"><div class="order-head"><div><b>${esc(o.id)}</b><small>${date(o.date)}</small></div><span class="badge">${t(o.status)}</span><b>${fmt(sum(o.items, 'total'))} <small>${t('excl. VAT')}</small></b></div>${timeline(o.status)}<p class="muted">${o.items.map(i => `${esc(i.name)} · ${num(i.qty, 2)} m²`).join(' — ')}</p><button class="textbtn" data-act="reorder" data-id="${esc(o.id)}">${t('Add these to basket again')}</button></div>`).join('') : empty(t('No orders yet'), t('Place a sample order to follow its status here.'), '#market', t('Explore marketplace')))
    + `<section class="section">${sec(t('Quotes'), t('Your quote requests'))}${quotes.length ? quotes.map(q => `<div class="panel order rv"><div class="order-head"><div><b>${esc(q.product)}</b><small>${date(q.createdAt)} · ${num(q.area, 1)} m² · ${esc(country(q.country))}</small></div><span class="badge">${t(q.reply ? 'Offer received' : 'Waiting for sellers')}</span></div>${q.details ? `<p class="muted">${esc(q.details)}</p>` : ''}${q.reply ? `<p class="msg"><b>${fmt(q.reply.price)}/m²</b> · ${t('{n} days', {n: num(q.reply.days)})} · ${esc(q.reply.vendor)}</p>` : `<p class="fine">${t('Tip: open the seller workspace to answer your own request and see the full flow.')}</p>`}</div>`).join('') : `<p class="muted">${t('No quote requests yet.')}</p>`}</section>`;
};

/* seller workspace and admin */
let sellerName = read('sellerName', 'Nord Surface'), sellerTab = 'overview';
const items = (vendor) => S.orders.flatMap(o => o.items.map(i => ({...i, order: o}))).filter(i => !vendor || i.vendor === vendor);
const money = list => { const gross = sum(list, 'total'), fee = list.reduce((s, i) => s + Math.round(i.total * i.order.rate / 100), 0); return {gross, fee, net: gross - fee}; };
const kpis = list => `<div class="kpis">${list.map(([l, v]) => `<div class="kpi rv"><small>${l}</small><strong>${v}</strong></div>`).join('')}</div>`;
const ledger = list => list.length ? `<div class="tablewrap"><table><thead><tr>${['Order', 'Date', 'Seller / product', 'Value', 'Commission', 'Status'].map(h => `<th>${t(h)}</th>`).join('')}</tr></thead><tbody>${list.slice().reverse().map(i => `<tr><td>${esc(i.order.id)}</td><td>${date(i.order.date)}</td><td>${esc(i.vendor)} / ${esc(i.name)}</td><td>${fmt(i.total)}</td><td>${fmt(i.total * i.order.rate / 100)} <small>(${num(i.order.rate)} %)</small></td><td><select data-status="${esc(i.order.id)}" aria-label="${t('Status')}">${STATUS.map(s => `<option value="${s}" ${s === i.order.status ? 'selected' : ''}>${t(s)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${t('No orders yet.')}</p>`;
const demoBar = () => `<div class="demobar"><span>${t('Review workspace with demo data. No login and no real accounts.')}</span><button data-act="seed">${t('Reload demo data')}</button><button data-act="wipe">${t('Delete all my local data')}</button></div>`;
pages.seller = () => {
  seed();
  const list = items(sellerName), m = money(list), prods = all().filter(p => p.vendor === sellerName);
  const per = prods.map(p => [p.name, sum(list.filter(i => i.name === p.name), 'total')]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
  const open = S.quotes.filter(q => !q.reply);
  let body = '';
  if (sellerTab === 'overview') body = `<div class="two"><div class="panel rv"><h3>${t('Sales by product')}</h3>${per.length ? bars(per) : `<p class="muted">${t('No orders yet.')}</p>`}</div><div class="panel rv"><h3>${t('To do')}</h3><ul class="todo"><li><b>${num(new Set(list.filter(i => i.order.status !== 'Delivered').map(i => i.order.id)).size)}</b> ${t('open orders')}<button data-act="stab" data-tab="orders">→</button></li><li><b>${num(open.length)}</b> ${t('quote requests to answer')}<button data-act="stab" data-tab="quotes">→</button></li><li><b>${num(prods.filter(p => !S.hidden.includes(p.id)).length)}</b> ${t('published products')}<button data-act="stab" data-tab="catalogue">→</button></li></ul></div></div>`;
  if (sellerTab === 'orders') body = `<div class="panel">${ledger(list)}</div>`;
  if (sellerTab === 'quotes') body = open.length || S.quotes.length ? S.quotes.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(q => `<div class="panel order"><div class="order-head"><div><b>${esc(q.product)}</b><small>${date(q.createdAt)} · ${num(q.area, 1)} m² · ${esc(country(q.country))}</small></div><span class="badge">${t(q.reply ? 'Offer sent' : 'Open')}</span></div><p class="muted">${esc(q.demo ? t(q.details) : q.details)}</p>${q.reply ? `<p class="msg"><b>${fmt(q.reply.price)}/m²</b> · ${t('{n} days', {n: num(q.reply.days)})} · ${esc(q.reply.vendor)}</p>` : `<form class="reply" data-reply="${esc(q.id)}">${field(t('Price per m² (ISK)'), 'price', {type: 'number', min: 1, req: true})}${field(t('Delivery days'), 'days', {type: 'number', min: 1, req: true})}<button class="pill">${t('Send offer')}</button></form>`}</div>`).join('') : `<p class="muted">${t('No quote requests yet.')}</p>`;
  if (sellerTab === 'catalogue') body = `<div class="two wide-left"><div class="panel tablewrap"><table><thead><tr>${['Product', 'Material', 'Price per m²', 'Published'].map(h => `<th>${t(h)}</th>`).join('')}</tr></thead><tbody>${prods.map(p => `<tr><td><span class="cell">${sw(p, 'mini')}${esc(p.name)}</span></td><td>${t(p.type)}</td><td>${fmt(p.price)}</td><td><label class="switch"><input type="checkbox" data-publish="${p.id}" ${S.hidden.includes(p.id) ? '' : 'checked'} aria-label="${t('Published')} ${esc(p.name)}"><span></span></label></td></tr>`).join('')}</tbody></table></div>
    <form id="productForm" class="panel"><h3>${t('Add a sample product')}</h3>${field(t('Product name'), 'name', {req: true, max: 60})}<div class="cols">${field(t('Material'), 'type', {options: ['Porcelain', 'Natural stone', 'Ceramic'].map(v => [v, t(v)])})}${field(t('Surface'), 'style', {options: [['stone', t('Stone')], ['marble', t('Marble')], ['concrete', t('Concrete')], ['travertine', t('Travertine')], ['clay', t('Clay')], ['plain', t('Glaze')]]})}</div><div class="cols">${field(t('Format'), 'format', {options: ['60x60', '30x60', '60x120', '80x80', '10x30'].map(v => [v, v.replace('x', ' × ') + ' cm'])})}${field(t('Colour'), 'color', {type: 'color', value: '#b8a58c'})}${field(t('Price per m² (ISK)'), 'price', {type: 'number', min: 100, req: true, value: 8900})}</div><button class="pill">${t('Publish to sample catalogue')}</button></form></div>`;
  if (sellerTab === 'company') body = sellerCompany(sellerName);
  if (sellerTab === 'team') body = teamBox(sellerName, ['Catalogue editor', 'Order handler', 'Finance viewer']);
  if (sellerTab === 'membership') body = sellerMembership();
  if (sellerTab === 'catalogue') body += `<form id="csvForm" class="panel"><h3>${t('Import from CSV')}</h3><p class="fine">name, type, format, price, colour — Nordic Oak, Porcelain, 20x120, 9900, #a98f6e</p>${field(t('CSV rows'), 'csv', {type: 'textarea', req: true, max: 8000})}<button class="outline">${t('Import')}</button></form>`;
  return head(t('Seller workspace · review'), esc(sellerName), '', `<div class="row"><select data-seller aria-label="${t('Seller')}">${D.sellers.map(s => `<option ${s.name === sellerName ? 'selected' : ''}>${s.name}</option>`).join('')}</select>${btn('#admin', t('Admin review') + ' ↗', 'outline')}</div>`) + demoBar()
    + kpis([[t('Sample sales excl. VAT'), fmt(m.gross)], [t('Commission'), fmt(m.fee)], [t('Seller share before other fees'), fmt(m.net)]])
    + `<div class="tabs">${[['overview', 'Overview'], ['orders', 'Orders'], ['quotes', 'Quotes'], ['catalogue', 'Catalogue'], ['company', 'Company'], ['team', 'Team'], ['membership', 'Membership']].map(([k, l]) => `<button class="${sellerTab === k ? 'on' : ''}" data-act="stab" data-tab="${k}">${t(l)}</button>`).join('')}</div>${body}`;
};
/* ---------- founding partner offer ---------- */
// Terms from FOUNDING-PARTNERS-2026.md. Display only: eligibility and billing belong on a server.
const OFFER = {standard: 12000, intro: 6000, deadline: '2026-12-31'};
const today = () => { const d = new Date(); return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map(n => String(n).padStart(2, '0')).join('-'); };
const introOpen = () => today() <= OFFER.deadline;
const nok = n => num(n) + ' NOK';
const offerCards = () => `<div class="two offer"><div class="panel rv ${introOpen() ? 'featured' : ''}"><span class="badge">${t(introOpen() ? 'Open until 31 December 2026' : 'Introductory offer closed')}</span><h3>${t('Founding Partner')}</h3><div class="amount">${introOpen() ? nok(OFFER.intro) : '—'}</div><p>${t('Introductory annual fee, 50 % off, for sellers joining by 31 December 2026.')}</p>${btn('#apply', t('Become a seller'))}</div>
  <div class="panel rv"><span class="badge">${t('Standard')}</span><h3>${t('Seller membership')}</h3><div class="amount">${nok(OFFER.standard)}</div><p>${t('Standard annual seller fee.')}</p></div></div>`;
pages.founding = () => head(t('Founding Partners 2026'), t('Be found. Be chosen. Sell more.'), t('Keep your own brand, catalogue and prices while buyers discover you through KASHI. Buyers use KASHI free of charge.'))
  + offerCards()
  + `<div class="two section"><div class="panel rv"><h3>${t('What sellers get')}</h3><ul class="ticks">${['Your own seller profile and catalogue', 'You set your own prices', 'Quote requests and orders in one panel', 'Guided product discovery for buyers', 'Active marketing and search optimisation planned from 2027'].map(x => `<li>${t(x)}</li>`).join('')}</ul></div>
  <div class="panel rv"><h3>${t('Not yet decided')}</h3><ul class="ticks open">${['Commission rate and what it is calculated on', 'Whether the discount continues on renewal', 'VAT, billing dates, payment and refunds', 'Contract terms'].map(x => `<li>${t(x)}</li>`).join('')}</ul><p class="msg">${t('Draft offer, subject to final approval. Nothing is billed in this review version.')}</p></div></div>`;

/* ---------- shared panel helpers (role previews, local data only) ---------- */
const audit = (action, detail = '') => { S.audit = [{at: new Date().toISOString(), action, detail: String(detail).slice(0, 120)}, ...S.audit].slice(0, 60); keep('audit'); };
const tabs = (items, current, act) => `<div class="tabs">${items.map(([k, l]) => `<button class="${current === k ? 'on' : ''}" data-act="${act}" data-tab="${k}">${t(l)}</button>`).join('')}</div>`;
const previewBar = () => `<div class="demobar"><span>${t('Role preview. No sign-in and no access control: everything stays in this browser. Use fictitious details.')}</span><a href="#login">${t('Switch role')}</a><button data-act="wipe">${t('Delete all my local data')}</button></div>`;
const rows = (list, render, none) => list.length ? list.map(render).join('') : `<p class="muted">${t(none)}</p>`;
const del = (kind, i) => `<button data-act="drop" data-kind="${kind}" data-i="${i}" aria-label="${t('Remove')}">×</button>`;

pages.login = () => head(t('Sign in'), t('Your KASHI panel'), t('One identity per person, with access to the organisations you belong to.'))
  + `<div class="two"><div class="panel rv"><h3>${t('Sign in')}</h3><button class="pill vipps" disabled>${t('Vipps Login — not connected yet')}</button><p class="fine">${t('Vipps Login is planned as the primary sign-in in Norway. It needs a KASHI agreement with Vipps and a secure server. Other countries will get suitable alternatives.')}</p></div>
  <div class="panel rv"><h3>${t('Preview a panel')}</h3>${[['account', 'Private buyer', 'Saved surfaces, projects, quotes and orders'], ['pro', 'Professional buyer', 'Project folders, quantities and team'], ['seller', 'Seller', 'Catalogue, orders, team and membership'], ['admin', 'Platform staff', 'In the real product, by invitation only']].map(([h, a, b]) => `<a class="line" href="#${h}"><div><b>${t(a)}</b><small>${t(b)}</small></div><em>→</em></a>`).join('')}</div></div>`;

let accountTab = 'overview';
pages.account = () => {
  const P = S.profile;
  let body = '';
  if (accountTab === 'overview') body = kpis([[t('Saved surfaces'), num(S.favs.length)], [t('Quote requests'), num(S.quotes.filter(q => !q.demo).length)], [t('Orders'), num(S.orders.filter(o => !o.demo).length)]])
    + `<div class="panel">${[['favorites', 'Saved surfaces'], ['orders', 'Orders and quotes'], ['pro', 'Room projects'], ['studio', '3D studio']].map(([h, l]) => `<a class="line" href="#${h}"><div><b>${t(l)}</b></div><em>→</em></a>`).join('')}</div>`;
  if (accountTab === 'profile') body = `<form id="profileForm" class="panel narrow">${field(t('Your name'), 'name', {req: true, value: P.name})}${field(t('Email'), 'email', {type: 'email', req: true, value: P.email})}${field(t('Country'), 'country', {options: countryOptions(), value: P.country || 'NO', req: true})}<button class="pill">${t('Save')}</button></form>`;
  if (accountTab === 'addresses') body = `<div class="two"><div class="panel"><h3>${t('Addresses')}</h3>${rows(S.addresses, (a, i) => `<div class="line"><div><b>${esc(a.label)}</b><small>${esc(a.address)}, ${esc(a.postalCode)} ${esc(a.city)}, ${esc(country(a.country))}</small></div>${del('addresses', i)}</div>`, 'No addresses yet.')}</div>
    <form id="addressForm" class="panel">${field(t('Label'), 'label', {req: true, ph: t('Home')})}${field(t('Address'), 'address', {req: true})}<div class="cols">${field(t('Postal code'), 'postalCode', {req: true})}${field(t('City'), 'city', {req: true})}</div>${field(t('Country'), 'country', {options: countryOptions(), value: 'NO', req: true})}<button class="pill">${t('Add address')}</button></form></div>`;
  if (accountTab === 'support') body = `<div class="panel narrow"><h3>${t('Support')}</h3><div class="row">${btn('#faq', t('Questions and answers'), 'outline')}${btn('#contact', t('Contact the team'))}</div></div>`;
  return head(t('Buyer account · preview'), P.name ? esc(P.name) : t('My account')) + previewBar() + tabs([['overview', 'Overview'], ['profile', 'Profile'], ['addresses', 'Addresses'], ['support', 'Support']], accountTab, 'atab') + body;
};

const ROLES = ['Catalogue editor', 'Order handler', 'Finance viewer', 'Designer', 'Purchaser'];
const teamBox = (key, roles) => `<div class="two"><div class="panel"><h3>${t('Team')}</h3>${rows(S.team.filter(m => m.org === key), m => `<div class="line"><span class="mono">${esc(m.name[0] || '?')}</span><div><b>${esc(m.name)}</b><small>${t(m.role)}</small></div>${del('team', S.team.indexOf(m))}</div>`, 'No team members yet.')}</div>
  <form class="panel" data-team="${esc(key)}">${field(t('Name'), 'name', {req: true, max: 60})}${field(t('Role'), 'role', {options: roles.map(r => [r, t(r)])})}<button class="pill">${t('Add team member')}</button><p class="fine">${t('No invitation is sent in this preview.')}</p></form></div>`;

let proTab = 'projects';
pages.pro = () => {
  const prods = visible();
  const projects = S.projects.map((pr, i) => {
    const l = pr.lines.map(x => ({...x, p: get(x.id)})).filter(x => x.p).map(x => ({...x, ...quantity(x.p, x.area)}));
    return `<div class="panel rv"><div class="order-head"><div><h3>${esc(pr.name)}</h3><small>${esc(pr.city)}</small></div><b>${fmt(sum(l, 'gross'))} <small>${t('incl. VAT')}</small></b></div>
    ${l.length ? `<div class="tablewrap"><table><thead><tr>${['Product', 'Seller', 'Area (m²)', 'Boxes', 'Total'].map(h => `<th>${t(h)}</th>`).join('')}<th></th></tr></thead><tbody>${l.map((x, k) => `<tr><td><a href="#product/${x.p.id}">${esc(x.p.name)}</a></td><td>${esc(x.p.vendor)}</td><td>${num(x.area, 1)}</td><td>${num(x.boxes)} · ${num(x.m2, 2)} m²</td><td>${fmt(x.gross)}</td><td><button data-act="dropline" data-i="${i}" data-k="${k}" aria-label="${t('Remove')}">×</button></td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${t('No surfaces in this project yet.')}</p>`}
    <form class="reply" data-line="${i}">${field(t('Product'), 'product', {options: prods.map(p => [String(p.id), p.name])})}${field(t('Area (m²)'), 'area', {type: 'number', min: .1, step: '0.1', req: true})}<button class="outline">${t('Add to project')}</button></form>
    <div class="row"><button class="pill" data-act="projectquote" data-i="${i}" ${l.length ? '' : 'disabled'}>${t('Request a quote')}</button><button class="outline" data-act="projectbasket" data-i="${i}" ${l.length ? '' : 'disabled'}>${t('Add to basket')}</button><button class="textbtn" data-act="drop" data-kind="projects" data-i="${i}">${t('Delete project')}</button></div></div>`;
  });
  const body = proTab === 'team' ? teamBox('pro', ['Designer', 'Purchaser', 'Finance viewer'])
    : `<form id="projectForm" class="panel reply">${field(t('Project name'), 'name', {req: true, max: 60})}${field(t('City'), 'city', {req: true, max: 60})}<button class="pill">${t('Create project')}</button></form>${projects.length ? projects.join('') : empty(t('No projects yet'), t('Create a project to collect surfaces and quantities.'))}`;
  return head(t('Professional buyer · preview'), t('Project workspace'), t('For architects, designers, contractors and developers.'), `<div class="row">${btn('#compare', t('Compare'), 'outline')}${btn('#orders', t('Purchase history'), 'outline')}</div>`) + previewBar() + tabs([['projects', 'Projects'], ['team', 'Team']], proTab, 'ptab') + body;
};

const sellerCompany = name => {
  const c = S.company[name] || {showrooms: []};
  return `<div class="two"><form id="companyForm" class="panel"><h3>${t('Store profile')}</h3>${field(t('Organisation number'), 'orgnr', {value: c.orgnr, max: 40})}${field(t('Website'), 'website', {type: 'url', value: c.website, ph: 'https://'})}${field(t('Shipping and returns'), 'shipping', {type: 'textarea', value: c.shipping})}<h3>${t('Wholesale')}</h3><div class="cols">${field(t('Minimum order (m²)'), 'moq', {type: 'number', min: 0, value: c.moq})}${field(t('Delivery days'), 'lead', {type: 'number', min: 0, value: c.lead})}</div>${field(t('Distribution markets'), 'markets', {value: c.markets})}<button class="pill">${t('Save')}</button></form>
  <div><div class="panel"><h3>${t('Showrooms')}</h3>${rows(c.showrooms || [], (r, i) => `<div class="line"><div><b>${esc(r.city)}</b><small>${esc(country(r.country))}</small></div>${del('showroom', i)}</div>`, 'No showrooms yet.')}</div><form id="showroomForm" class="panel"><div class="cols">${field(t('City'), 'city', {req: true})}${field(t('Country'), 'country', {options: countryOptions(), value: 'NO', req: true})}</div><button class="outline">${t('Add showroom')}</button></form></div></div>`;
};
const sellerMembership = () => `${offerCards()}<div class="panel"><h3>${t('Membership and invoices')}</h3><div class="line"><div><b>${t('Status')}</b></div><span class="badge">${t('Not active')}</span></div><div class="line"><div><b>${t('Invoices')}</b><small>${t('No invoices. Billing is not active.')}</small></div></div></div>`;

/* CSV: name,type,format,price,colour — header row optional. */
function importCsv(text, vendor) {
  let added = 0, skipped = 0;
  for (const line of text.split(/\r?\n/).map(x => x.trim()).filter(Boolean).slice(0, 101)) {
    if (/^name\s*[,;]/i.test(line)) continue;
    const [name, type, format, price, color] = line.split(/\s*[,;]\s*/), m = /^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)$/i.exec(format || '');
    const kind = ['Porcelain', 'Natural stone', 'Ceramic'].find(k => k.toLowerCase() === String(type).toLowerCase());
    if (added >= 50 || !name || !kind || !m || +m[1] < 5 || +m[1] > 240 || +m[2] < 5 || +m[2] > 240 || !(+price >= 100) || (color && !/^#[0-9a-f]{6}$/i.test(color))) { skipped++; continue; }
    addProduct({name, type: kind, style: kind === 'Natural stone' ? 'stone' : kind === 'Ceramic' ? 'plain' : 'concrete', w: +m[1], h: +m[2], price: +price, color: color || '#b8a58c', vendor}); added++;
  }
  return {added, skipped};
}
function addProduct(v) {
  const id = Math.max(100, ...S.custom.map(p => p.id)) + 1, area = v.w * v.h / 1e4;
  S.custom.push({id, name: v.name.trim().slice(0, 60) || 'Sample', type: v.type, style: v.style, color: v.color, w: v.w, h: v.h, size: v.w + ' × ' + v.h + ' cm', price: Math.max(100, Math.round(v.price)), vendor: v.vendor, finish: v.style === 'plain' ? 'Glazed' : 'Matt', tone: 'Colour', rooms: ['living'], box: +(Math.ceil(1 / area) * area).toFixed(2), added: id});
  keep('custom'); return id;
}

/* admin: partner pipeline with invented demo prospects. Real leads must never be shipped in this public page. */
const STAGES = ['Identified', 'Contacted', 'Meeting', 'Agreement sent', 'Signed', 'Rejected', 'Withdrawn'];
let adminRole = 'owner', adminTab = 'overview', stageFilter = '', countryFilter = '';
const ADMIN_TABS = {owner: ['overview', 'applications', 'pipeline', 'money', 'audit'], admin: ['overview', 'applications', 'pipeline', 'audit'], staff: ['pipeline']};
const TAB_NAMES = {overview: 'Overview', applications: 'Applications', pipeline: 'Partner pipeline', money: 'Commission and membership', audit: 'Audit log'};
const pipeline = () => {
  const list = S.prospects.map((p, i) => ({...p, i})).filter(p => (!stageFilter || p.stage === stageFilter) && (!countryFilter || p.country === countryFilter));
  const opts = (values, current, label) => `<option value="">${t('All')}</option>${values.map(v => `<option value="${v}" ${v === current ? 'selected' : ''}>${esc(label(v))}</option>`).join('')}`;
  return `<p class="msg">${t('Demo companies only. Real prospects and contacts belong in a private, signed-in CRM.')}</p><div class="stages">${STAGES.slice(0, 5).map(s => `<div><b>${num(S.prospects.filter(p => p.stage === s).length)}</b><small>${t(s)}</small></div>`).join('')}</div>
  <div class="panel"><div class="cols"><label class="f">${t('Stage')}<select data-pfilter="stage">${opts(STAGES, stageFilter, t)}</select></label><label class="f">${t('Country')}<select data-pfilter="country">${opts([...new Set(S.prospects.map(p => p.country))], countryFilter, country)}</select></label></div>
  ${rows(list, p => `<div class="line"><div><b>${esc(p.company)}</b><small>${esc(p.city)}, ${esc(country(p.country))} · ${t('Unverified')}</small></div><select data-stage="${p.i}" aria-label="${t('Stage')} ${esc(p.company)}">${STAGES.map(s => `<option value="${s}" ${s === p.stage ? 'selected' : ''}>${t(s)}</option>`).join('')}</select></div>`, 'No prospects match.')}</div>
  <form id="prospectForm" class="panel reply">${field(t('Company name'), 'company', {req: true, max: 60})}${field(t('City'), 'city', {req: true, max: 60})}${field(t('Country'), 'country', {options: countryOptions(), value: 'NO', req: true})}<button class="outline">${t('Add prospect')}</button></form>`;
};
pages.admin = () => {
  seed();
  const allowed = ADMIN_TABS[adminRole]; if (!allowed.includes(adminTab)) adminTab = allowed[0];
  const list = items(), m = money(list);
  let body = '';
  if (adminTab === 'overview') body = kpis([[t('Sample marketplace volume'), fmt(m.gross)], [t('Estimated KASHI commission'), fmt(m.fee)], [t('Seller share before other fees'), fmt(m.net)]])
    + `<div class="two"><div class="panel rv"><h3>${t('Volume by seller')}</h3>${bars(D.sellers.map(s => [s.name, sum(items(s.name), 'total')]))}</div><div class="panel rv"><h3>${t('Marketplace')}</h3><dl class="sumlist">${[['Sellers', D.sellers.length], ['Products', visible().length], ['Countries', new Set(D.sellers.map(s => s.code)).size], ['Applications', S.applications.length]].map(([k, v]) => `<div><dt>${t(k)}</dt><dd>${num(v)}</dd></div>`).join('')}</dl></div></div>
    <div class="panel rv"><div class="order-head"><h3>${t('Order ledger')}</h3><button class="outline" data-act="csv">⤓ CSV</button></div>${ledger(list)}</div>`;
  if (adminTab === 'applications') body = `<div class="panel"><h3>${t('Seller applications')}</h3>${rows(S.applications, (a, i) => `<div class="line"><span class="mono">${esc((a.company || '?')[0])}</span><div><b>${esc(a.company)}</b><small>${esc(a.city || '')} ${esc(country(a.country))} · ${esc(a.demo ? t(a.products) : a.products)}${a.offer?.eligible ? ' · ' + t('Founding Partner') : ''}</small></div><span class="badge">${t(a.status || 'Pending review')}</span><button class="outline" data-act="decide" data-i="${i}" data-value="Approved">${t('Approve')}</button><button class="outline" data-act="decide" data-i="${i}" data-value="Rejected">${t('Reject')}</button></div>`, 'No applications yet.')}</div>`;
  if (adminTab === 'pipeline') body = pipeline();
  if (adminTab === 'money') body = `<div class="two"><div class="panel"><h3>${t('Commission simulator')}</h3><p>${t('The commission rate is not decided. Test a rate for future sample orders; existing orders keep theirs.')}</p><label>${t('Rate')}: <b id="rateText">${num(S.rate)} %</b><input type="range" min="1" max="30" value="${S.rate}" data-range="rate"></label><p id="rateExample"></p></div><div class="panel"><h3>${t('Seller membership')}</h3><dl class="sumlist"><div><dt>${t('Standard')}</dt><dd>${nok(OFFER.standard)}</dd></div><div><dt>${t('Founding Partner')}</dt><dd>${nok(OFFER.intro)}</dd></div></dl>${btn('#founding', t('See the offer'), 'outline')}</div></div>`;
  if (adminTab === 'audit') body = `<div class="panel"><h3>${t('Audit log')}</h3>${rows(S.audit, a => `<div class="line"><div><b>${t(a.action)}</b><small>${esc(a.detail)}</small></div><small>${date(a.at)}</small></div>`, 'No events yet.')}</div>`;
  return head(t('Admin workspace · review'), t('Marketplace control centre'), t('Not an authenticated admin area.'), `<div class="row"><select data-role aria-label="${t('Role')}">${[['owner', 'Owner'], ['admin', 'Administrator'], ['staff', 'Sales, support and marketing']].map(([v, l]) => `<option value="${v}" ${v === adminRole ? 'selected' : ''}>${t(l)}</option>`).join('')}</select>${btn('#seller', t('Seller view') + ' ↗', 'outline')}</div>`) + demoBar() + tabs(allowed.map(k => [k, TAB_NAMES[k]]), adminTab, 'adtab') + body;
};

function paintRate() { const el = $('#rateExample'); if (el) { $('#rateText').textContent = num(S.rate) + ' %'; el.textContent = t('On {sales} of eligible sales: {fee} commission, {net} seller share, before other fees.', {sales: fmt(100000), fee: fmt(1000 * S.rate), net: fmt(1000 * (100 - S.rate))}); } }

/* editorial and information */
pages.journal = slug => {
  if (!slug) return head(t('Journal'), t('Material knowledge'), t('Editorial drafts, to be reviewed for technical accuracy before launch.')) + `<div class="journal">${D.articles.map(articleCard).join('')}</div>`;
  const a = D.articles.find(x => x.slug === slug); if (!a) return pages.missing();
  return `<article class="story"><nav class="crumbs"><a href="#journal">${t('Journal')}</a> / <span>${t(a.cat)}</span></nav><h1>${t(a.title)}</h1><p class="lead">${t(a.lead)}</p><img src="img/${a.img}.jpg" alt="">${a.body.map(([h, p]) => `<h2>${t(h)}</h2><p>${t(p)}</p>`).join('')}<p class="fine">${t('Editorial draft. Verify requirements with the manufacturer and installer. Photograph for mood only.')}</p><div class="row">${btn('#studio', t('Open 3D studio'))}${btn('#market', t('Explore marketplace'), 'outline')}</div></article><section class="section">${sec(t('Read next'), t('More from the journal'))}<div class="journal">${D.articles.filter(x => x !== a).map(articleCard).join('')}</div></section>`;
};
pages.about = () => head(t('Our story'), t('Materials with meaning.'), t('KASHI is a developing marketplace concept for tiles and surfaces, starting in Norway and Iceland.'))
  + `<img class="wide rv" src="img/dining.jpg" alt=""><p class="fine">${t('Photograph for mood only.')}</p><div class="cats three section">${[['Made for the north', 'Practical formats, clear project pricing and material choices for homes and professional projects.'], ['Transparent sourcing', 'We intend to disclose origin, manufacturer, specifications, availability and confirmed lead times.'], ['Not yet trading', 'Company registration, supplier agreements and payment approval are still in progress. Nothing can be bought here.']].map(([h, p]) => `<div class="panel rv"><h3>${t(h)}</h3><p>${t(p)}</p></div>`).join('')}</div>
  <section class="section">${sec(t('Trust and documentation'), t('What we will show before we sell'), '', t('We never display a mark or certificate we do not hold.'))}<div class="panel rv">${['Test reports to EN 14411', 'CE marking and Declaration of Performance', 'Slip and frost ratings', 'Company registration and VAT number', 'Manufacturer quality systems', 'Origin and traceability'].map(x => `<div class="line"><div><b>${t(x)}</b></div><span class="badge">${t('Pending verification')}</span></div>`).join('')}</div></section>`;
pages.faq = () => head(t('Help'), t('Questions and answers')) + `<div class="faq">${D.faq.map(([q, a]) => `<details class="rv"><summary>${t(q)}</summary><p>${t(a)}</p></details>`).join('')}</div><div class="row section">${btn('#contact', t('Contact the team'))}</div>`;
pages.contact = () => head(t('Start a conversation'), t("Let's shape your space."), t('Home renovation, development or wholesale supply? Tell us what you need.'))
  + `<div class="two wide-left"><form id="contactForm" class="panel rv"><div class="cols">${field(t('Your name'), 'name', {req: true})}${field(t('Project type'), 'type', {options: [['Private renovation', t('Private renovation')], ['Contractor / B2B', t('Contractor / business')], ['Wholesale', t('Wholesale')], ['Seller partnership', t('Seller partnership')], ['Other', t('Other')]]})}</div>${field(t('Message'), 'message', {type: 'textarea', req: true})}<button class="pill">${t('Open in my email app')} →</button><p class="fine">${t('The message is prepared in your own email app. You decide whether to send it.')}</p><div id="contactMsg" aria-live="polite"></div></form>
  <div class="panel rv"><h3>${t('Contacts')}</h3><div class="line"><div><b>${t('Email')}</b><small><a href="mailto:post@setai.no">post@setai.no</a></small></div></div><div class="line"><div><b>${country('NO')} · Khabat Setaei</b><small dir="ltr"><a href="https://wa.me/4741227175" rel="noopener">WhatsApp +47 412 27 175</a></small></div></div><div class="line"><div><b>${country('IS')} · Mohammad Moghadam</b><small dir="ltr"><a href="tel:+3547863108">+354 786 3108</a></small></div></div><p class="fine">${t('Contacts for the planned business. Icelandic company registration is pending.')}</p></div></div>`;
pages.privacy = () => head(t('Privacy'), t('Your data stays with you')) + `<div class="story"><h2>${t('What is stored')}</h2><p>${t('Basket, saved products, comparisons, forms, sample orders, language and room settings are kept in your browser only.')}</p><h2>${t('Third parties')}</h2><p>${t('Fonts load from Google Fonts and the 3D engine from the jsDelivr network. Those services receive normal technical request data such as your IP address.')}</p><h2>${t('Delete')}</h2><p>${t('You can erase everything this site has stored at any time.')}</p><button class="pill" data-act="wipe">${t('Delete all my local data')}</button></div>`;
pages.missing = () => head('404', t('Page not found')) + empty(t('This surface does not exist'), t('The page may have moved.'), '#home', t('Back to start'));

/* ---------- router ---------- */
const safeDecode = s => { try { return decodeURIComponent(s); } catch { return s; } };
let route = '';
function render(scroll = true) {
  const hash = location.hash.slice(1) || 'home', [path, qs] = hash.split('?'), [name, arg] = path.split('/');
  const page = Object.hasOwn(pages, name) ? name : 'missing';
  if (name === 'studio' && qs) { // shared room link
    const q = new URLSearchParams(qs), c = roomCfg();
    for (const k of ['floor', 'wall', 'width', 'length', 'day']) if (q.has(k) && Number.isFinite(+q.get(k))) c[k] = +q.get(k);
    if (['living', 'bathroom', 'kitchen'].includes(q.get('room'))) c.room = q.get('room');
    c.width = Math.min(9, Math.max(2, c.width)); c.length = Math.min(12, Math.max(2.5, c.length)); c.day = Math.min(1, Math.max(0, c.day));
    setRoom({...roomCfg()}); history.replaceState(null, '', '#studio');
  }
  const main = $('#main');
  main.innerHTML = `<div class="page" data-page="${page}">${pages[page](safeDecode(arg || ''), new URLSearchParams(qs || ''))}</div>`;
  route = page;
  if (page === 'market') paintMarket();
  if (page === 'product') paintCalc();
  if (page === 'studio') { mountRoom($('#roomSlot')); paintStudio(); }
  if (page === 'partners') paintDirectory();
  if (page === 'apply') paintEarn();
  if (page === 'admin') paintRate();
  decorate(main); chrome();
  const h1 = $('h1', main); document.title = (page === 'home' || !h1 ? 'KASHI — ' + t('Surface marketplace') : h1.textContent + ' — KASHI') + ' | V2';
  if (scroll) window.scrollTo({top: 0, behavior: 'instant'});
}
const refresh = () => { const y = scrollY; render(false); $$('#main .rv').forEach(e => e.classList.add('in')); scrollTo({top: y, behavior: 'instant'}); };

/* reveal on scroll, lazy thumbnails, count-up, hero rotation */
const reveal = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); } }), {rootMargin: '0px 0px -40px'});
function decorate(root) {
  $$('[data-thumb]', root).forEach(el => { if (!el.style.backgroundImage) thumbs.observe(el); });
  $$('.rv', root).forEach((el, i) => { el.style.setProperty('--d', (i % 4) * 70 + 'ms'); reveal.observe(el); });
  $$('[data-count]', root).forEach(el => { const to = +el.dataset.count, t0 = performance.now(); const step = now => { const k = Math.min(1, (now - t0) / 900); el.textContent = num(Math.round(to * k)); if (k < 1 && el.isConnected) requestAnimationFrame(step); }; requestAnimationFrame(step); });
}
let slideI = 0;
function slide(i) { const s = $$('#heroShow .slide'); if (!s.length) return; slideI = (i + s.length) % s.length; s.forEach((e, k) => e.classList.toggle('on', k === slideI)); $$('#heroShow .dots button').forEach((e, k) => e.classList.toggle('on', k === slideI)); }
setInterval(() => { if (route === 'home' && !document.hidden && !matchMedia('(prefers-reduced-motion: reduce)').matches && !$('#heroShow:hover')) slide(slideI + 1); }, 4800);

/* header, footer and floating compare bar */
function chrome() {
  const count = Object.values(S.basket).filter(n => n > 0).length, favs = S.favs.length;
  $('#count').textContent = num(count); $('#count').hidden = !count;
  $('#favCount').textContent = num(favs); $('#favCount').hidden = !favs;
  $$('#nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href').slice(1) === route));
  const bar = $('#cmpbar'), list = S.compare.map(get).filter(Boolean);
  bar.classList.toggle('show', list.length > 0 && !['compare', 'checkout', 'studio'].includes(route));
  bar.innerHTML = `<div>${list.map(p => sw(p, 'mini')).join('')}</div><span>${t('{n} of 4 to compare', {n: num(list.length)})}</span><a class="pill" href="#compare">${t('Compare')}</a><button data-act="clearcmp" aria-label="${t('Clear all')}">×</button>`;
  $$('[data-thumb]', bar).forEach(paint);
}
function shell() {
  const rtl = S.lang === 'FA'; document.documentElement.lang = S.lang === 'NO' ? 'nb' : S.lang.toLowerCase(); document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  $('#notice').textContent = t('V2 review · Illustrative products, sellers and prices · No real orders or payments');
  $('#nav').innerHTML = [['market', 'Marketplace'], ['studio', '3D studio'], ['inspiration', 'Inspiration'], ['partners', 'Brands & sellers'], ['journal', 'Journal'], ['quote', 'Request a quote']].map(([h, l]) => `<a href="#${h}">${t(l)}</a>`).join('') + `<a class="mobile-only" href="#apply">${t('Sell on KASHI')}</a><a class="mobile-only" href="#login">${t('Sign in')}</a><a class="mobile-only" href="#founding">${t('Founding Partners 2026')}</a><a class="mobile-only" href="#orders">${t('Orders and quotes')}</a><a class="mobile-only" href="#contact">${t('Contact')}</a>`;
  $('#search').placeholder = t('Search surfaces…'); $('#sellLink').textContent = t('Sell on KASHI'); $('#loginLink').setAttribute('aria-label', t('Sign in')); $('#loginLink').title = t('Sign in'); $('#basketLabel').textContent = t('Basket'); $('#favLabel').setAttribute('aria-label', t('Saved surfaces'));
  const col = (title, links) => `<div><h4>${t(title)}</h4>${links.map(([h, l]) => `<a href="${h}">${t(l)}</a>`).join('')}</div>`;
  $('#footer').innerHTML = `<div class="foot-brand"><div class="logo">KASHI<span>.</span></div><p>${t('Connecting makers. Connecting markets. Creating spaces.')}</p></div>
    ${col('Shop', [['#market', 'Marketplace'], ['#studio', '3D studio'], ['#inspiration', 'Inspiration'], ['#favorites', 'Saved surfaces'], ['#orders', 'Orders and quotes']])}
    ${col('Sellers', [['#founding', 'Founding Partners 2026'], ['#apply', 'Become a seller'], ['#partners', 'Brands & sellers'], ['#login', 'Sign in'], ['#seller', 'Seller workspace'], ['#admin', 'Admin review']])}
    ${col('KASHI', [['#about', 'About'], ['#journal', 'Journal'], ['#faq', 'Questions and answers'], ['#contact', 'Contact'], ['#privacy', 'Privacy']])}
    <p class="legal">${t('Review prototype · No payments processed.')} © ${new Date().getFullYear()} KASHI · ${country('NO')} · ${country('IS')}</p>`;
}

/* ---------- actions ---------- */
function add(id, area = 1) { S.basket[id] = +(((Number(S.basket[id]) || 0) + area).toFixed(2)); keep('basket'); chrome(); const b = $('#basketBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
function toggle(btnEl, on) { $$(`[data-act="${btnEl.dataset.act}"][data-id="${btnEl.dataset.id}"]`).forEach(b => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); }
function askQuote(draft) { save('quoteDraft', draft); location.hash = 'quote'; }
function openLook(id) { const l = D.looks.find(x => x.id === id); setRoom({floor: l.floor, wall: l.wall, room: l.room, view: 'close'}); if (route === 'studio') { paintStudio(); $('#roomSlot').scrollIntoView({behavior: 'smooth', block: 'center'}); } else location.hash = 'studio'; }
function stepForm(form, dir) {
  const sets = $$('fieldset', form), cur = sets.findIndex(s => !s.hidden), next = Math.max(0, Math.min(sets.length - 1, cur + dir));
  if (dir > 0 && ![...sets[cur].elements].every(e => e.reportValidity())) return;
  sets.forEach((s, i) => { s.hidden = i !== next; }); $$('.progress li', form).forEach((li, i) => li.classList.toggle('on', i <= next));
  $('[data-dir="-1"]', form).hidden = !next; $('[data-dir="1"]', form).hidden = next === sets.length - 1; $('#applySend', form).hidden = next !== sets.length - 1;
  if (form.id === 'checkoutForm' && next === 2) { const v = Object.fromEntries(new FormData(form)); $('#review').innerHTML = `<dl class="specs">${[['Your name', v.name], ['Email', v.email], ['Address', `${v.address}, ${v.postalCode} ${v.city}, ${country(v.country)}`], ['Delivery method', t(v.method === 'pickup' ? 'Collect from seller' : 'Kerbside delivery')]].map(([k, x]) => `<div><dt>${t(k)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl>`; }
}
const actions = {
  add(el) { const p = get(el.dataset.id); add(p.id, p.box); toast(t('{name}: one box added', {name: p.name}), '#basket', t('Basket')); },
  fav(el) { const id = +el.dataset.id, on = !isFav(id); S.favs = on ? [...S.favs, id] : S.favs.filter(x => x !== id); keep('favs'); toggle(el, on); chrome(); toast(t(on ? 'Saved' : 'Removed'), on ? '#favorites' : null, t('Saved surfaces')); if (route === 'favorites') refresh(); },
  cmp(el) { const id = +el.dataset.id; if (!inCmp(id) && S.compare.length >= 4) return toast(t('You can compare up to four surfaces')); const on = !inCmp(id); S.compare = on ? [...S.compare, id] : S.compare.filter(x => x !== id); keep('compare'); toggle(el, on); chrome(); if (route === 'compare') refresh(); },
  clearcmp() { S.compare = []; keep('compare'); $$('[data-act=cmp]').forEach(b => b.classList.remove('on')); chrome(); if (route === 'compare') refresh(); },
  room(el) { const p = get(el.dataset.id); setRoom({floor: p.id, room: p.rooms.find(r => r !== 'outdoor') || 'living'}); room.target = 'floor'; location.hash = 'studio'; },
  sample(el) { const id = +el.dataset.id; if (S.samples.includes(id)) return toast(t('Already in your sample box'), '#favorites', t('Open')); if (S.samples.length >= 5) return toast(t('The sample box holds five surfaces'), '#favorites', t('Open')); S.samples.push(id); keep('samples'); toast(t('Added to your sample box'), '#favorites', t('Open')); },
  unsample(el) { S.samples = S.samples.filter(x => x !== +el.dataset.id); keep('samples'); refresh(); },
  quote(el) { const p = get(el.dataset.id); askQuote({product: p.name, area: $('#calcForm [name=area]')?.value || ''}); },
  quoteseller(el) { askQuote({product: el.dataset.name}); },
  quoteroom() { const c = roomCfg(); askQuote({product: get(c.floor).name + ' + ' + get(c.wall).name, area: c.width * c.length, details: `${t(ROOMS[c.room])} ${c.width} × ${c.length} m`}); },
  addroom() { const c = roomCfg(), area = c.width * c.length; add(c.floor, quantity(get(c.floor), area).m2); add(c.wall, quantity(get(c.wall), (c.width + c.length) * 2.4).m2); toast(t('Floor and walls added'), '#basket', t('Basket')); },
  target(el) { room.target = el.dataset.target; paintStudio(); },
  tile(el) { setRoom({[room.target]: +el.dataset.id}); paintStudio(); },
  roomtype(el) { setRoom({room: el.dataset.room}); paintStudio(); },
  view(el) { setRoom({view: el.dataset.view}); paintStudio(); },
  snap() { if (!room.api) return toast(t('The 3D room is still loading')); const a = document.createElement('a'); a.download = 'kashi-room.png'; a.href = room.api.snapshot(); a.click(); },
  share() { const c = roomCfg(), url = location.origin + location.pathname + '#studio?' + new URLSearchParams({room: c.room, floor: c.floor, wall: c.wall, width: c.width, length: c.length, day: c.day}); navigator.clipboard?.writeText(url).then(() => toast(t('Link copied')), () => prompt(t('Copy link'), url)); },
  look(el) { openLook(el.dataset.look); },
  slide(el) { slide(+el.dataset.i); },
  zoomview(el) { $('#zoom .swatch').style.backgroundSize = el.dataset.scale; $$('.views button').forEach(b => b.classList.toggle('on', b === el)); },
  filters() { $('#filters').classList.toggle('open'); },
  unfilter(el) { F[el.dataset.key] = ''; const c = $(`[data-filter="${el.dataset.key}"]`); if (c) c.value = ''; paintMarket(); },
  reset() { Object.assign(F, {q: '', type: '', vendor: '', tone: '', finish: '', room: '', max: 20000, sort: ''}); history.replaceState(null, '', '#market'); render(false); },
  remove(el) { delete S.basket[el.dataset.id]; keep('basket'); refresh(); },
  reorder(el) { const o = S.orders.find(x => x.id === el.dataset.id); o?.items.forEach(i => { const p = all().find(x => x.name === i.name); if (p) add(p.id, i.qty); }); location.hash = 'basket'; },
  step(el) { stepForm(el.closest('form'), +el.dataset.dir); },
  stab(el) { sellerTab = el.dataset.tab; refresh(); },
  seed() { seed(true); refresh(); toast(t('Demo data reloaded')); },
  wipe() { if (!confirm(t('Delete everything this site has stored in this browser?'))) return; try { Object.keys(localStorage).filter(k => k.startsWith('kashiV2:') && k !== 'kashiV2:lang').forEach(k => localStorage.removeItem(k)); } catch { /* ignore */ } loadState(); S.seeded = true; keep('seeded'); room.cfg = null; sellerName = 'Nord Surface'; adminRole = 'owner'; refresh(); toast(t('Local data deleted')); },
  decide(el) { const a = S.applications[+el.dataset.i]; a.status = el.dataset.value; keep('applications'); audit(el.dataset.value, a.company); refresh(); },
  atab(el) { accountTab = el.dataset.tab; refresh(); },
  ptab(el) { proTab = el.dataset.tab; refresh(); },
  adtab(el) { adminTab = el.dataset.tab; refresh(); },
  drop(el) { const k = el.dataset.kind, i = +el.dataset.i; if (k === 'projects' && !confirm(t('Delete project') + '?')) return; if (k === 'showroom') { S.company[sellerName].showrooms.splice(i, 1); keep('company'); } else if (['addresses', 'team', 'projects'].includes(k)) { S[k].splice(i, 1); keep(k); } refresh(); },
  dropline(el) { S.projects[+el.dataset.i].lines.splice(+el.dataset.k, 1); keep('projects'); refresh(); },
  projectquote(el) { const pr = S.projects[+el.dataset.i], l = pr.lines.filter(x => get(x.id)); askQuote({product: pr.name, area: +sum(l, 'area').toFixed(1), details: pr.city + '\n' + l.map(x => `${get(x.id).name}: ${x.area} m²`).join('\n')}); },
  projectbasket(el) { S.projects[+el.dataset.i].lines.forEach(x => { const p = get(x.id); if (p) add(p.id, quantity(p, x.area).m2); }); location.hash = 'basket'; },
  csv() { const safe = v => { let s = String(v); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }; const rows = [['order', 'date', 'seller', 'product', 'm2', 'value_isk', 'rate', 'status']].concat(items().map(i => [i.order.id, i.order.date, i.vendor, i.name, i.qty, i.total, i.order.rate, i.order.status])); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + rows.map(r => r.map(safe).join(',')).join('\n')], {type: 'text/csv'})); a.download = 'kashi-sample-orders.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); },
  menu() { const open = document.body.classList.toggle('menu-open'); $('#menuBtn').setAttribute('aria-expanded', open); },
  top() { scrollTo({top: 0, behavior: 'smooth'}); }
};
document.addEventListener('click', e => {
  if (e.target.closest('#nav a')) document.body.classList.remove('menu-open');
  const el = e.target.closest('[data-act]'); if (el && Object.hasOwn(actions, el.dataset.act)) actions[el.dataset.act](el);
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.filter) { F[el.dataset.filter] = el.dataset.filter === 'max' ? +el.value : el.value; paintMarket(); }
  if (el.closest('#calcForm')) paintCalc();
  const r = el.dataset.range;
  if (r === 'day') setRoom({day: el.value / 100});
  if (r === 'width' || r === 'length') { el.parentNode.querySelector('b').textContent = num(el.value, 1) + ' m'; }
  if (r === 'earn') paintEarn(+el.value);
  if (r === 'rate') { S.rate = +el.value; keep('rate'); paintRate(); }
  if (el.hasAttribute('data-dir') && el.matches('input')) paintDirectory(el.value);
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.range === 'width' || el.dataset.range === 'length') { setRoom({[el.dataset.range]: +el.value}); paintStudio(); }
  if (el.dataset.qty) { const v = Math.max(.1, Math.min(10000, Number(el.value) || 1)); S.basket[el.dataset.qty] = +v.toFixed(2); keep('basket'); refresh(); }
  if (el.dataset.status) { const o = S.orders.find(x => x.id === el.dataset.status); if (o) { o.status = el.value; keep('orders'); audit('Order status changed', o.id + ': ' + t(el.value)); toast(t('Status updated')); refresh(); } }
  if (el.dataset.publish) { const id = +el.dataset.publish; S.hidden = el.checked ? S.hidden.filter(x => x !== id) : [...S.hidden, id]; keep('hidden'); audit(el.checked ? 'Published' : 'Hidden from marketplace', get(id)?.name); toast(t(el.checked ? 'Published' : 'Hidden from marketplace')); }
  if (el.hasAttribute('data-seller')) { sellerName = el.value; save('sellerName', sellerName); refresh(); }
  if (el.dataset.pfilter) { if (el.dataset.pfilter === 'stage') stageFilter = el.value; else countryFilter = el.value; refresh(); }
  if (el.dataset.stage) { const p = S.prospects[+el.dataset.stage]; p.stage = el.value; keep('prospects'); audit('Prospect stage changed', p.company + ': ' + t(el.value)); refresh(); }
  if (el.hasAttribute('data-role')) { adminRole = el.value; refresh(); }
  if (el.dataset.range === 'rate') audit('Commission rate changed', el.value + ' %');
  if (el.id === 'language') { S.lang = el.value; keep('lang'); shell(); refresh(); }
});
document.addEventListener('submit', e => {
  const f = e.target; e.preventDefault();
  if (f.id === 'searchForm') { const q = f.q.value.trim(); Object.assign(F, {q, type: '', vendor: '', tone: '', finish: '', room: '', max: 20000}); f.reset(); if (location.hash === '#market') render(); else location.hash = 'market'; return; }
  if (f.matches('#applyForm, #checkoutForm')) { // Enter on an earlier step moves forward
    if (!$('[data-dir="1"]', f).hidden) return stepForm(f, 1);
    const bad = [...f.elements].find(x => x.willValidate && !x.checkValidity());
    if (bad) { const i = $$('fieldset', f).findIndex(s => s.contains(bad)), cur = $$('fieldset', f).findIndex(s => !s.hidden); if (i >= 0 && i !== cur) stepForm(f, i - cur); bad.reportValidity(); return; }
  }
  const v = Object.fromEntries(new FormData(f));
  if (f.id === 'calcForm') { const p = get(f.dataset.id), q = quantity(p, Number(v.area), Number(v.waste)); add(p.id, q.m2); toast(t('{name}: {n} boxes added', {name: p.name, n: num(q.boxes)}), '#basket', t('Basket')); }
  if (f.id === 'applyForm') { delete v.accept; S.applications.push({id: newId('A'), createdAt: new Date().toISOString(), status: 'Pending review', ...v, offer: {at: new Date().toISOString(), eligible: introOpen(), standard: OFFER.standard, intro: OFFER.intro}}); keep('applications'); $('#main .page').innerHTML = head(t('Seller onboarding'), t('Application saved')) + `<div class="success"><span>✓</span><div><h3>${esc(v.company)}</h3><p>${t('Saved in this browser. Nothing was submitted to KASHI.')}</p></div></div><div class="row">${btn('#admin', t('Review it in admin'))}${btn('#partners', t('See the directory'), 'outline')}</div>`; scrollTo({top: 0}); }
  if (f.id === 'checkoutForm') { const l = lines(); if (!l.length) return; const order = {id: newId('K'), date: new Date().toISOString().slice(0, 10), rate: S.rate, status: STATUS[0], items: l.map(x => ({name: x.p.name, vendor: x.p.vendor, qty: x.m2, total: x.net}))}; S.orders.push(order); S.basket = {}; keep('orders', 'basket'); location.hash = 'orders/' + order.id; }
  if (f.id === 'quoteForm') { S.quotes.push({id: newId('Q'), createdAt: new Date().toISOString(), ...v}); keep('quotes'); save('quoteDraft', {}); f.reset(); $('#quoteMsg').innerHTML = `<div class="success"><span>✓</span><div><h3>${t('Request saved')}</h3><p>${t('Saved in this browser. Nothing was submitted to KASHI.')}</p><a href="#orders">${t('See your requests')} →</a></div></div>`; }
  if (f.id === 'contactForm') { const href = mailto('KASHI — ' + v.type, v.message + '\n\n' + v.name); location.href = href; $('#contactMsg').innerHTML = `<p class="msg">${t('If nothing opened, write to {email}.', {email: '<a href="' + esc(href) + '">post@setai.no</a>'})}</p>`; }
  if (f.id === 'guideForm') {
    const area = Number(v.area) || 0, budget = Number(v.budget) || 0, m = match(v.query || ''), room = v.room || m.room, tone = v.tone || m.tone;
    const list = visible().filter(p => (!m.type || p.type === m.type) && (!room || p.rooms.includes(room)) && (!tone || p.tone === tone) && (!budget || p.price * (area || 1) <= budget)).sort((a, b) => m.score(b) - m.score(a) || a.price - b.price);
    const understood = [m.type, ROOMS[room], tone].filter(Boolean).map(x => t(x)), dest = (v.destination || '').trim();
    const notes = [understood.length ? t('Understood: {list}.', {list: understood.join(', ')}) : '', dest ? t('Delivery to {place} is not verified.', {place: dest}) : t('Add a delivery city to your request later.'), area ? '' : t('Add area to estimate material cost.')].filter(Boolean).join(' ');
    $('#guideOut').innerHTML = (list.length ? `<p>${t('{n} sample matches. Suitability, stock, freight and installation need confirmation.', {n: num(list.length)})} ${esc(notes)}</p><div class="matches">${list.slice(0, 4).map(p => `<a href="#product/${p.id}">${sw(p)}<b>${esc(p.name)}</b><small>${area ? fmt(quantity(p, area).gross) + ' · ' + t('incl. VAT') : fmt(p.price) + '/m²'}</small></a>`).join('')}</div>` : `<p>${t('No matches. Change the criteria or request a quote.')} ${esc(notes)}</p>`) + `<div class="row">${btn('#quote', t('Request a quote'), 'outline')}${btn('#studio', t('Open 3D studio'), 'outline')}</div>`;
    $$('[data-thumb]', $('#guideOut')).forEach(paint);
  }
  if (f.id === 'productForm') { const [w, h] = v.format.split('x').map(Number), id = addProduct({...v, w, h, price: +v.price, color: /^#[0-9a-f]{6}$/i.test(v.color) ? v.color : '#b8a58c', vendor: sellerName}); refresh(); toast(t('Product published'), '#product/' + id, t('Open')); }
  if (f.id === 'csvForm') { const r = importCsv(v.csv, sellerName); if (r.added) refresh(); toast(t('{added} imported, {skipped} skipped', {added: num(r.added), skipped: num(r.skipped)})); }
  if (f.id === 'profileForm') { S.profile = v; keep('profile'); refresh(); toast(t('Saved')); }
  if (f.id === 'addressForm') { S.addresses.push(v); keep('addresses'); refresh(); }
  if (f.id === 'projectForm') { S.projects.unshift({...v, lines: []}); keep('projects'); refresh(); }
  if (f.dataset.line) { const pr = S.projects[+f.dataset.line]; pr.lines.push({id: +v.product, area: +v.area}); keep('projects'); refresh(); }
  if (f.dataset.team) { S.team.push({org: f.dataset.team, name: v.name.trim() || '?', role: v.role}); keep('team'); refresh(); }
  if (f.id === 'companyForm') { S.company[sellerName] = {showrooms: [], ...S.company[sellerName], ...v}; keep('company'); toast(t('Saved')); }
  if (f.id === 'showroomForm') { const c = S.company[sellerName] ||= {showrooms: []}; (c.showrooms ||= []).push(v); keep('company'); refresh(); }
  if (f.id === 'prospectForm') { S.prospects.push({...v, stage: 'Identified'}); keep('prospects'); audit('Prospect added', v.company); refresh(); }
  if (f.dataset.reply) { const q = S.quotes.find(x => x.id === f.dataset.reply); if (q) { q.reply = {price: +v.price, days: +v.days, vendor: sellerName}; keep('quotes'); refresh(); toast(t('Offer sent')); } }
});
window.addEventListener('hashchange', () => { document.body.classList.remove('menu-open'); render(); });
window.addEventListener('scroll', () => { document.body.classList.toggle('scrolled', scrollY > 30); $('#toTop').classList.toggle('show', scrollY > 900); }, {passive: true});

/* quotes saved by the earlier review build have no id */
S.quotes.forEach((q, i) => { q.id ||= 'Q-OLD' + i; });
S.applications.forEach(a => { a.status ||= 'Pending review'; });
if (!window.KI18N[S.lang] && S.lang !== 'EN') S.lang = 'EN';
$('#language').value = S.lang;
shell(); render();
window.KASHI_APP = {pages: Object.keys(pages), state: S, products: all};
})();
