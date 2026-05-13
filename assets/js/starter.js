const form = document.getElementById('starter-form');
const msg = document.getElementById('form-msg');
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('main-nav');
const submitBtn = document.getElementById('starter-submit');

if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('open');
  });
}

const setMessage = (text, ok) => {
  msg.textContent = text;
  msg.style.color = ok ? '#0f7a34' : '#b42318';
  msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

const disableForm = (isDisabled) => {
  if (!submitBtn) return;
  submitBtn.disabled = isDisabled;
  submitBtn.setAttribute('aria-busy', String(isDisabled));
  submitBtn.textContent = isDisabled ? 'Sender…' : 'Send forespørsel';
};

if (form) {
  const csrfTokenField = document.getElementById('csrf-token');
  const csrfToken = window.crypto?.randomUUID ? window.crypto.randomUUID() : String(Date.now());
  if (csrfTokenField) csrfTokenField.value = csrfToken;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitBtn?.disabled) return;

    disableForm(true);
    msg.textContent = '';

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/contact.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Noe gikk galt. Prøv igjen.');
      }

      setMessage('Takk! Vi har mottatt forespørselen din og tar kontakt snart.', true);
      form.reset();
      if (csrfTokenField) {
        csrfTokenField.value = window.crypto?.randomUUID ? window.crypto.randomUUID() : String(Date.now());
      }
    } catch (error) {
      setMessage(error.message || 'Kunne ikke sende forespørselen. Prøv igjen.', false);
    } finally {
      disableForm(false);
    }
  });
}
