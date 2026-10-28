/* SETAEI / ChatGPT ad-placement explainer. The ad is a clearly marked mock example. */
(() => {
  const demo = document.querySelector('[data-cg-demo]');
  if (!demo) return;
  const buttons = Array.from(document.querySelectorAll('[data-cg-mode]'));
  const ad = demo.querySelector('[data-cg-ad]');
  const status = document.querySelector('[data-cg-status]');
  const labels = {
    no: {organic:'Kun det organiske svaret vises. Ingen annonse er lagt til.',paid:'En tydelig merket eksempelannonse vises etter AI-svaret.'},
    en: {organic:'Only the organic answer is shown. No ad has been added.',paid:'A clearly labelled example ad appears after the AI answer.'},
    fa: {organic:'فقط پاسخ عادی نمایش داده می‌شود؛ تبلیغی وجود ندارد.',paid:'یک تبلیغ نمونه با برچسب واضح، جدا از پاسخ نشان داده می‌شود.'}
  };
  function render(mode) {
    const paid = mode === 'paid';
    ad.hidden = !paid;
    buttons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.cgMode === mode)));
    const language = ['en','fa'].includes(document.documentElement.lang) ? document.documentElement.lang : 'no';
    if (status) status.textContent = labels[language][mode === 'paid' ? 'paid' : 'organic'];
  }
  buttons.forEach(btn => btn.addEventListener('click', () => render(btn.dataset.cgMode)));
  render('paid');
})();
