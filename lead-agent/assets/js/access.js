(function () {
  const TOKEN = '0227';
  const SK = 'la_access';

  window.LA_TOKEN = TOKEN;
  window.LA_READY = new Promise(function (resolve) {
    document.addEventListener('DOMContentLoaded', function () {
      if (sessionStorage.getItem(SK) === TOKEN) { resolve(); return; }

      var overlay = document.createElement('div');
      overlay.id = 'accessOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:9999';

      overlay.innerHTML =
        '<div style="background:#fff;border-radius:14px;padding:32px 28px;width:320px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.22)">' +
        '<div style="font-size:28px;margin-bottom:8px">🔒</div>' +
        '<h2 style="margin:0 0 4px;font-size:18px">SETAEI Lead Agent</h2>' +
        '<p style="color:#66758f;font-size:13px;margin:0 0 18px">Skriv inn tilgangskoden</p>' +
        '<input id="accessPin" type="password" placeholder="Kode" autocomplete="off" ' +
        'style="width:100%;padding:10px;border:1px solid #e4e9f2;border-radius:8px;font-size:16px;text-align:center;letter-spacing:4px;margin-bottom:10px" />' +
        '<div id="accessErr" style="color:#d64545;font-size:13px;min-height:18px;margin-bottom:8px"></div>' +
        '<button id="accessBtn" style="background:#246bff;color:#fff;border:0;border-radius:8px;padding:10px 0;width:100%;font-size:15px;cursor:pointer">Logg inn</button>' +
        '</div>';

      document.body.appendChild(overlay);

      var input = document.getElementById('accessPin');
      var btn   = document.getElementById('accessBtn');
      var err   = document.getElementById('accessErr');

      function attempt() {
        if (input.value === TOKEN) {
          sessionStorage.setItem(SK, TOKEN);
          overlay.remove();
          resolve();
        } else {
          err.textContent = 'Feil kode. Prøv igjen.';
          input.value = '';
          input.focus();
        }
      }

      btn.addEventListener('click', attempt);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') attempt(); });
      setTimeout(function () { input.focus(); }, 50);
    });
  });
})();
