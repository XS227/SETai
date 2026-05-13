const form = document.getElementById('starter-form');
const msg = document.getElementById('form-msg');
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('main-nav');

if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('open');
  });
}

if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    msg.textContent = 'Takk! Vi tar kontakt med deg snart.';
    form.reset();
  });
}
