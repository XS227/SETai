(() => {
  const progress = document.getElementById('scrollProgress');
  const reveals = [...document.querySelectorAll('.reveal')];
  const parallax = [...document.querySelectorAll('[data-parallax]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('in'); });
  }, { threshold: .13 });
  reveals.forEach((el, i) => { el.style.transitionDelay = `${Math.min(i % 5, 4) * 70}ms`; io.observe(el); });
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const ratio = max > 0 ? scrollY / max : 0;
    if (progress) progress.style.width = `${ratio * 100}%`;
    if (!reduced) parallax.forEach(el => {
      const rect = el.getBoundingClientRect();
      const power = parseFloat(el.dataset.parallax || '.12');
      const offset = (rect.top - innerHeight * .5) * power * -1;
      el.style.setProperty('--parallax', `${Math.max(-45, Math.min(45, offset))}px`);
    });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
})();
