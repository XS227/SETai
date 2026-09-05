(function () {
  // Shared scroll-reveal for static pages using /seo-expansion.css. Unlike
  // the homepage's `.fu` class (hardcoded in markup, hidden by default even
  // without JS), this only ever hides an element if THIS script actually
  // runs and adds `.seo-fu-js` — so a blocked/failed script can never leave
  // content stuck invisible. Fixes the same bug the homepage's mobile 3D
  // reveal had: the CSS-only `animation-timeline: view()` version in
  // seo-expansion.css silently does nothing on browsers without support
  // (notably older Safari/iOS) — this IntersectionObserver version works
  // everywhere `.fu` already works on the homepage.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var SELECTOR = [
    '.article-body > h2', '.article-body > h3', '.article-body > p',
    '.article-body > ul', '.article-body > ol', '.article-body > figure',
    '.card', '.tl-item', '.callout', '.author-box', '.cluster-heading', '.tag-row', '.faq dt'
  ].join(',');

  var els = document.querySelectorAll(SELECTOR);
  if (!els.length) return;

  els.forEach(function (el) { el.classList.add('seo-fu-js'); });

  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('on');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

  els.forEach(function (el) { obs.observe(el); });

  // Safety net (2026-08-26): a renderer that lays out the whole page at
  // once without dispatching real scroll/resize events (a crawler, a
  // headless full-page screenshot, print-to-PDF) may never fire the
  // IntersectionObserver above, leaving .seo-fu-js content stuck at
  // opacity:0 forever — confirmed happening in exactly that scenario on
  // the homepage's equivalent .fu3d reveal. Force-reveal anything not
  // already revealed after 2.5s, regardless of scroll state.
  setTimeout(function () {
    document.querySelectorAll('.seo-fu-js:not(.on)').forEach(function (el) { el.classList.add('on'); });
  }, 2500);
})();
