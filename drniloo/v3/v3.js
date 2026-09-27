(() => {
'use strict';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const journey = $('.journey');
const chapters = $$('.chapter');
const bar = $('.reading-progress');
const heroImage = $('.hero-image');
const focusFrame = $('.journey-image-frame');
const stage = $('.journey-stage');
const ring = $('.focus-ring');
let cameraSize = '';
let cameraScene = -1;
let measureFrame;
// Intrinsic pixel landmarks in portrait-hq.webp, independent of object-fit or viewport.
function updateCamera(scene) {
 const width = focusFrame.clientWidth;
 const height = focusFrame.clientHeight;
 if (!width || !height) return;
 const size = `${width}:${height}`;
 if (size === cameraSize && scene === cameraScene) return;
 const resized = size !== cameraSize;
 const focus = chapters[scene].dataset;
 const sourceX = Number(focus.focusX);
 const sourceY = Number(focus.focusY);
 const scale = Math.max(width / 941, height / 1672) * Number(focus.focusZoom);
 const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
 // Center the named feature, while keeping the image over every edge of the frame.
 const x = clamp(width * .5 - sourceX * scale, width - 941 * scale, 0);
 const y = clamp(height * .48 - sourceY * scale, height - 1672 * scale, 0);
 if (resized) stage.classList.add('is-measuring');
 stage.dataset.ready = 'true';
 stage.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
 ring.style.left = `${sourceX}px`;
 ring.style.top = `${sourceY}px`;
 ring.style.width = ring.style.height = `${Number(focus.focusRadius) * 2}px`;
 $('.focus-label').textContent = focus.focusLabel;
 cameraSize = size;
 cameraScene = scene;
 if (resized) {
  cancelAnimationFrame(measureFrame);
  // Flush the new geometry before allowing transitions again (rotation / fold resize).
  stage.getBoundingClientRect();
  measureFrame = requestAnimationFrame(() => stage.classList.remove('is-measuring'));
 }
}
let queued = false;
function paint() {
 queued = false;
 const y = window.scrollY;
 document.body.classList.toggle('scrolled', y > 24);
 paintBrandStory(); paintServiceOrbit();
 if (!motion.matches) {
  const total = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = `scaleX(${total > 0 ? Math.min(1, y / total) : 0})`;
  if (y < innerHeight * 1.5) heroImage.style.transform = `scale(1.035) translateY(${Math.min(y * .045, 35)}px)`;
 }
 const top = innerWidth <= 720 ? focusFrame.getBoundingClientRect().bottom : $('.header').getBoundingClientRect().bottom;
 const readingLine = top + Math.max(0, innerHeight - top) * .5;
 let scene = 0;
 let nearest = Infinity;
 chapters.forEach((chapter, i) => {
  const rect = $('h2', chapter).getBoundingClientRect();
  const distance = Math.abs((rect.top + rect.bottom) / 2 - readingLine);
  if (distance < nearest) { nearest = distance; scene = i; }
 });
 if (journey.dataset.scene !== String(scene)) {
  journey.dataset.scene = String(scene);
  $('.scene-counter').textContent = ['۰۱ / ۰۳','۰۲ / ۰۳','۰۳ / ۰۳'][scene];
 }
 updateCamera(scene);
}
function schedule() { if (!queued) { queued = true; requestAnimationFrame(paint); } }
window.addEventListener('scroll', schedule, {passive:true});
window.addEventListener('resize', schedule, {passive:true});
if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(focusFrame);
motion.addEventListener('change', () => { if (motion.matches) heroImage.style.transform = ''; schedule(); });
if ('IntersectionObserver' in window) {
 const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), {threshold:.12});
 $$('.reveal').forEach(el => observer.observe(el));
 document.documentElement.classList.add('js');
}
const services = [...document.querySelectorAll('.service')];
const brandStory = $('.brand-story');
const brandSticky = $('.brand-story-sticky');
const serviceRail = $('.service-grid');
function paintBrandStory(){
 if(!brandStory||!brandSticky)return;
 const r=brandStory.getBoundingClientRect(), travel=Math.max(1,brandStory.offsetHeight-innerHeight);
 const p=Math.max(0,Math.min(1,-r.top/travel));
 brandSticky.style.setProperty('--brand-progress',p);
 let scale=1, ox=50, oy=42, shade=.72, scene=0;
 if(p<.25){scale=1+p*1.2;scene=0}
 else if(p<.5){const q=(p-.25)/.25;scale=1.3+q*.9;ox=53;oy=50;shade=.48;scene=1}
 else if(p<.75){const q=(p-.5)/.25;scale=2.2+q*1.2;ox=51;oy=58;shade=.3;scene=2}
 else {const q=(p-.75)/.25;scale=3.4+q*1.25;ox=51;oy=49;shade=.18;scene=3}
 brandSticky.style.setProperty('--brand-scale',scale);
 brandSticky.style.setProperty('--brand-origin',ox+'% '+oy+'%');
 brandSticky.style.setProperty('--brand-shade',shade);
 [...brandSticky.querySelectorAll('.brand-story-copy')].forEach((el,i)=>el.classList.toggle('is-active',i===scene));
}
function paintServiceOrbit(){
 if(!serviceRail)return;
 const rc=serviceRail.getBoundingClientRect(), center=rc.left+rc.width/2;
 let nearest=null, nd=Infinity;
 services.filter(s=>!s.hidden).forEach(card=>{
   const r=card.getBoundingClientRect(), d=(r.left+r.width/2-center)/Math.max(1,r.width);
   card.style.setProperty('--orbit-d',Math.max(-3,Math.min(3,d)).toFixed(2));
   const ad=Math.abs(d); if(ad<nd){nd=ad;nearest=card}
 });
 services.forEach(s=>s.classList.toggle('is-center',s===nearest));
}
serviceRail?.addEventListener('scroll',()=>requestAnimationFrame(paintServiceOrbit),{passive:true});

function filterServices(category, announce = true) {
 $$('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
 let count = 0;
 services.forEach(button => { button.hidden = category !== 'all' && button.dataset.category !== category; if (!button.hidden) count++; });
 if (announce) $('#filter-status').textContent = `${count.toLocaleString('fa-IR')} خدمت نمایش داده می‌شود.`;
 schedule(); paintServiceOrbit();
}
$$('[data-filter]').forEach(button => button.addEventListener('click', () => filterServices(button.dataset.filter)));
$$('[data-filter-link]').forEach(link => link.addEventListener('click', () => filterServices(link.dataset.filterLink)));
const descriptions = {
 lips:'گفت‌وگو درباره فرم، حجم و تناسب لب‌ها با سایر اجزای چهره، با توجه به خواسته و شرایط فردی شما.',
 face:'بررسی فرم صورت و هماهنگی چانه، گونه و خط فک، برای گفت‌وگو درباره گزینه‌های متناسب با چهره شما.',
 skin:'گفت‌وگو درباره دغدغه‌های پوست و آشنایی با این خدمت. جزئیات روش و تناسب آن با شرایط شما در ارزیابی مشخص می‌شود.',
 hair:'بررسی دغدغه‌های مو یا ابرو و آشنایی با گزینه‌های موجود، بر اساس شرایط و ارزیابی فردی.'
};
const serviceDialog = $('.service-dialog');
services.forEach(button => button.addEventListener('click', () => {
 $('#service-title').textContent = button.dataset.service;
 $('#service-description').textContent = descriptions[button.dataset.category];
 serviceDialog.showModal();
}));
const menu = $('.menu-dialog');
$('.menu-toggle').addEventListener('click', () => menu.showModal());
$$('nav a', menu).forEach(link => link.addEventListener('click', () => menu.close()));
$$('dialog').forEach(dialog => {
 $('.close-dialog', dialog).addEventListener('click', () => dialog.close());
 dialog.addEventListener('click', e => { const r = dialog.getBoundingClientRect(); if (e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) dialog.close(); });
});
window.addEventListener('load', schedule, {once:true});
document.fonts?.ready.then(schedule);
paint();
})();
