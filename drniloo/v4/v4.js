(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
root.classList.remove('no-js');

/* ---------- split words (keeps <em>, <br>, spans) ---------- */
$$('[data-split]').forEach(el => {
 let i = 0;
 const walk = node => {
  [...node.childNodes].forEach(child => {
   if (child.nodeType === 3) {
    const frag = document.createDocumentFragment();
    child.textContent.split(/(\s+)/).forEach(part => {
     if (!part) return;
     if (/^\s+$/.test(part)) { frag.append(' '); return; }
     const w = document.createElement('span'); w.className = 'w';
     const s = document.createElement('span'); s.textContent = part; s.style.setProperty('--i', i++);
     w.append(s); frag.append(w);
    });
    child.replaceWith(frag);
   } else if (child.nodeType === 1 && child.tagName !== 'BR') walk(child);
  });
 };
 walk(el);
 el.classList.add('split');
});

/* manifesto words */
const mani = $('.manifesto p');
let maniWords = [];
if (mani) {
 const walkM = node => [...node.childNodes].forEach(child => {
  if (child.nodeType === 3) {
   const frag = document.createDocumentFragment();
   child.textContent.split(/(\s+)/).forEach(part => {
    if (!part) return;
    if (/^\s+$/.test(part)) { frag.append(' '); return; }
    const s = document.createElement('span'); s.className = 'word' + (node.tagName === 'EM' ? ' accent' : ''); s.textContent = part; frag.append(s);
   });
   child.replaceWith(frag);
  } else if (child.nodeType === 1) walkM(child);
 });
 walkM(mani);
 maniWords = $$('.word', mani);
}

/* ---------- loader ---------- */
const start = () => {
 if (root.classList.contains('is-loaded')) return;
 root.classList.add('is-loaded');
 setTimeout(() => $$('[data-split="load"], .reveal[data-load]').forEach(el => el.classList.add('in')), reduce ? 0 : 650);
};
if (reduce) start();
else { addEventListener('load', () => setTimeout(start, 500)); setTimeout(start, 2600); }

/* ---------- reveal ---------- */
if ('IntersectionObserver' in window) {
 const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {threshold: .15, rootMargin: '0px 0px -8% 0px'});
 $$('.reveal:not([data-load]), [data-split]:not([data-split="load"])').forEach(el => io.observe(el));
} else $$('.reveal, [data-split]').forEach(el => el.classList.add('in'));

/* ---------- scroll engine ---------- */
const header = $('.header');
const pins = $$('[data-progress]');
const parallax = $$('[data-speed]');
const track = $('.details-track');
const compactViewport = matchMedia('(max-width:960px)');
const catNav = $('.cat-nav');
let lastY = scrollY, ticking = false;
// Stable viewport height: mobile URL bars change innerHeight while scrolling, which made pinned scenes jump.
let VH = innerHeight, VW = innerWidth;
const vhProbe = document.createElement('div');
vhProbe.style.cssText = 'position:fixed;top:0;height:100svh;width:0;visibility:hidden;pointer-events:none';
document.body.append(vhProbe);
const readVH = () => { VH = vhProbe.offsetHeight || innerHeight; };
readVH();

function measure() {
 if (track) track.style.setProperty('--dist', (compactViewport.matches ? 0 : Math.max(0, track.scrollWidth - innerWidth)) + 'px');
}
function frame() {
 ticking = false;
 const y = scrollY, vh = VH;
 if (header) {
  header.classList.toggle('is-solid', y > 40);
  const menuOpen = $('.menu')?.open;
  header.classList.toggle('is-hidden', !menuOpen && y > lastY && y > 500);
 }
 lastY = y;
 if (catNav) document.body.classList.toggle('has-catnav', catNav.getBoundingClientRect().top <= 1);
 if (reduce) return;
 pins.forEach(el => {
  if (compactViewport.matches && el.dataset.progress !== 'view') return;
  const r = el.getBoundingClientRect();
  if (r.bottom < -vh || r.top > vh * 2) return;
  let p;
  if (el.dataset.progress === 'view') p = clamp((vh * .85 - r.top) / (r.height + vh * .2));
  else p = clamp(-r.top / Math.max(1, r.height - vh));
  const v = p.toFixed(3);
  if (el._p === v) return;
  el._p = v;
  el.style.setProperty('--p', v);
  if (el.classList.contains('manifesto')) {
   const n = maniWords.length, lit = Math.floor(clamp(p * 1.3) * n);
   maniWords.forEach((w, i) => w.classList.toggle('lit', i < lit));
  }
 });
 parallax.forEach(el => {
  if (compactViewport.matches && el.closest('.collage')) return;
  const r = el.getBoundingClientRect();
  if (r.bottom < -200 || r.top > vh + 200) return;
  const off = (r.top + r.height / 2 - vh / 2) * Number(el.dataset.speed);
  el.style.transform = `translate3d(0,${off.toFixed(1)}px,0)`;
 });
}
const schedule = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
addEventListener('scroll', schedule, {passive: true});
addEventListener('resize', () => { if (innerWidth !== VW) { VW = innerWidth; readVH(); measure(); } schedule(); }, {passive: true});
addEventListener('load', () => { measure(); schedule(); });
measure(); frame();

/* ---------- hero gold dust ---------- */
const cv = $('#sparks');
if (cv && !reduce) {
 const ctx = cv.getContext('2d');
 let w, h, dpr, parts = [], visible = true;
 const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
 size(); addEventListener('resize', size);
 const N = innerWidth < 700 ? 34 : 70;
 for (let i = 0; i < N; i++) parts.push({x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + .3, s: Math.random() * .0006 + .0002, a: Math.random() * Math.PI * 2, t: Math.random() * .6 + .2});
 new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) requestAnimationFrame(draw); }).observe(cv);
 function draw() {
  if (!visible) return;
  ctx.clearRect(0, 0, w, h);
  for (const p of parts) {
   p.y -= p.s; p.a += .01; if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); }
   const x = (p.x + Math.sin(p.a) * .01) * w, yy = p.y * h;
   const alpha = p.t * (.55 + .45 * Math.sin(p.a * 2));
   const g = ctx.createRadialGradient(x, yy, 0, x, yy, p.r * 4);
   g.addColorStop(0, `rgba(240,214,160,${alpha})`); g.addColorStop(1, 'rgba(240,214,160,0)');
   ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, yy, p.r * 4, 0, 6.283); ctx.fill();
  }
  requestAnimationFrame(draw);
 }
 requestAnimationFrame(draw);
}

/* ---------- cursor ---------- */
if (fine && !reduce) {
 const c = document.createElement('div'); c.className = 'cursor'; c.setAttribute('aria-hidden', 'true'); document.body.append(c);
 let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
 addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, {passive: true});
 (function loop() { cx += (mx - cx) * .2; cy += (my - cy) * .2; c.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); })();
 document.addEventListener('pointerover', e => c.classList.toggle('big', !!e.target.closest('a,button,summary,.card')));
}

/* ---------- floating image on service rows ---------- */
const fl = $('.float-img');
if (fl && fine) {
 const imgs = $$('img', fl);
 let fx = 0, fy = 0, tx = 0, ty = 0, run = false;
 const loop = () => { fx += (tx - fx) * .14; fy += (ty - fy) * .14; fl.style.left = fx + 'px'; fl.style.top = fy + 'px'; if (run) requestAnimationFrame(loop); };
 $$('.srow').forEach((row, i) => {
  row.addEventListener('pointerenter', e => { tx = fx = e.clientX; ty = fy = e.clientY; imgs.forEach((im, j) => im.classList.toggle('on', j === i)); fl.classList.add('on'); if (!run) { run = true; loop(); } });
  row.addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
  row.addEventListener('pointerleave', () => { fl.classList.remove('on'); run = false; });
 });
}

/* ---------- menu ---------- */
const menu = $('.menu');
if (menu) {
 $('.menu-btn')?.addEventListener('click', () => menu.showModal());
 $('.menu-close')?.addEventListener('click', () => menu.close());
 $$('a', menu).forEach(a => a.addEventListener('click', () => menu.close()));
}

/* ---------- services page: scrollspy ---------- */
if (catNav) {
 const links = $$('a', catNav);
 const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  links.forEach(l => {
   const on = l.hash === '#' + e.target.id;
   l.classList.toggle('on', on);
   if (on) catNav.scrollTo({left: l.offsetLeft - (catNav.clientWidth - l.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth'});
  });
 }), {rootMargin: '-45% 0px -50% 0px'});
 $$('.cat').forEach(s => io.observe(s));
}

/* ---------- services page: drawer ---------- */
const drawer = $('.drawer');
if (drawer) {
 const open = card => {
  const d = card.dataset;
  $('#d-img', drawer).src = $('img', card).src;
  $('#d-cat', drawer).textContent = d.cat;
  $('#d-title', drawer).textContent = $('.t', card).textContent;
  $('#d-desc', drawer).textContent = $('.d', card).textContent;
  $('#d-for', drawer).textContent = d.for;
  drawer.showModal();
  history.replaceState(null, '', '#' + card.id);
 };
 $$('.card').forEach(card => card.addEventListener('click', () => open(card)));
 $('.drawer-close', drawer).addEventListener('click', () => drawer.close());
 drawer.addEventListener('click', e => { if (e.target === drawer) drawer.close(); });
 drawer.addEventListener('close', () => history.replaceState(null, '', location.pathname));
 const deep = location.hash && $(location.hash + '.card');
 if (deep) setTimeout(() => { deep.scrollIntoView({block: 'center'}); open(deep); }, 900);
}
})();
