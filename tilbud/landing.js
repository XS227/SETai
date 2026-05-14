/**
 * SETAEI landing page — shared tracking + contact-form handler.
 *
 * Each landing page sets:
 *   window.LANDING_PAGE = 'bilvask'  // or 'frisor' | 'restaurant' | 'klinikk' | 'tilbud'
 * before including this script.
 */
(function () {
  var PAGE = window.LANDING_PAGE || 'general';
  var TRACK_URL   = '/lead-agent/api/landing-track.php';
  var CONTACT_URL = '/lead-agent/api/landing-contact.php';

  function track(event) {
    try {
      fetch(TRACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: PAGE, event: event })
      }).catch(function () {});
    } catch (e) {}
  }

  function setStatus(html, ok) {
    var el = document.getElementById('formStatus');
    if (!el) return;
    el.innerHTML = html;
    el.style.color = ok ? '#1e9b62' : '#c93f3f';
    el.style.fontWeight = '600';
  }

  function attach() {
    track('visit');

    document.querySelectorAll('[data-track="cta_click"]').forEach(function (el) {
      el.addEventListener('click', function () { track('cta_click'); });
    });
    var ctaBtn = document.getElementById('ctaBtn');
    if (ctaBtn) ctaBtn.addEventListener('click', function () { track('cta_click'); });
    var navCta = document.getElementById('navCta');
    if (navCta) navCta.addEventListener('click', function () { track('cta_click'); });

    var form = document.getElementById('contactForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn  = form.querySelector('button[type="submit"]');
      var orig = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sender…'; }
      setStatus('', true);

      var fd = new FormData(form);
      var payload = {
        page:    PAGE,
        name:    (fd.get('name')    || '').toString().trim(),
        email:   (fd.get('email')   || '').toString().trim(),
        phone:   (fd.get('phone')   || '').toString().trim(),
        message: (fd.get('message') || '').toString().trim(),
        website: (fd.get('website') || '').toString().trim()  // honeypot
      };

      fetch(CONTACT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      })
        .then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); })
        .then(function (res) {
          var d = res.data || {};
          if (d.ok) {
            setStatus(d.message || 'Takk! Vi tar kontakt innen 24 timer.', true);
            form.querySelectorAll('input,textarea,button').forEach(function (el) { el.disabled = true; });
            track('form_submit');
          } else {
            setStatus(d.error || 'Kunne ikke sende meldingen. Send oss gjerne en e-post direkte.', false);
            if (btn) { btn.disabled = false; btn.textContent = orig; }
          }
        })
        .catch(function () {
          setStatus('Nettverksfeil. Sjekk forbindelsen og prøv igjen, eller send en e-post direkte.', false);
          if (btn) { btn.disabled = false; btn.textContent = orig; }
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
