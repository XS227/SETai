(() => {
'use strict';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const journey = $('.journey');
const chapters = $$('.chapter');
const bar = $('.reading-progress');
const heroImage = $('.hero-image');
let queued = false;
function paint() {
 queued = false;
 const y = window.scrollY;
 document.body.classList.toggle('scrolled', y > 24);
 if (!motion.matches) {
  const total = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = `scaleX(${total > 0 ? Math.min(1, y / total) : 0})`;
  if (y < innerHeight * 1.5) heroImage.style.transform = `scale(1.035) translateY(${Math.min(y * .045, 35)}px)`;
 }
 const target = innerWidth <= 720 ? innerHeight * .75 : innerHeight * .5;
 let scene = 0;
 chapters.forEach((chapter, i) => { if (chapter.getBoundingClientRect().top < target) scene = i; });
 if (journey.dataset.scene !== String(scene)) {
  journey.dataset.scene = String(scene);
  $('.scene-counter').textContent = ['۰۱ / ۰۳','۰۲ / ۰۳','۰۳ / ۰۳'][scene];
 }
}
function schedule() { if (!queued) { queued = true; requestAnimationFrame(paint); } }
window.addEventListener('scroll', schedule, {passive:true});
window.addEventListener('resize', schedule, {passive:true});
motion.addEventListener('change', () => { if (motion.matches) heroImage.style.transform = ''; schedule(); });
if ('IntersectionObserver' in window) {
 const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), {threshold:.12});
 $$('.reveal').forEach(el => observer.observe(el));
 document.documentElement.classList.add('js');
}
const services = $$('.service');
function filterServices(category, announce = true) {
 $$('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
 let count = 0;
 services.forEach(button => { button.hidden = category !== 'all' && button.dataset.category !== category; if (!button.hidden) count++; });
 if (announce) $('#filter-status').textContent = `${count.toLocaleString('fa-IR')} خدمت نمایش داده می‌شود.`;
 schedule();
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
