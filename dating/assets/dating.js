// Numerologist dating – chart tooltips, photo downscaling, chat scroll, couples filter. No dependencies.
document.addEventListener('DOMContentLoaded', function () {
  // ---------- Photo: shrink in the browser (max 720px JPEG) so phone photos pass the upload limit ----------
  var input = document.querySelector('input[data-preview]');
  var hidden = document.getElementById('photo_data');
  if (input && hidden) {
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file || !/^image\//.test(file.type)) return;
      var url = URL.createObjectURL(file);
      var image = new Image();
      image.onload = function () {
        var side = Math.min(image.width, image.height), size = Math.min(720, side);
        var canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        canvas.getContext('2d').drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, size, size);
        hidden.value = canvas.toDataURL('image/jpeg', 0.85);
        input.value = '';
        var preview = document.querySelector('.photo-edit .pic');
        if (preview) {
          var img = document.createElement('img');
          img.className = 'pic big'; img.alt = ''; img.src = hidden.value;
          preview.replaceWith(img);
        }
        URL.revokeObjectURL(url);
      };
      image.src = url;
    });
  }

  var msgs = document.getElementById('msgs');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;

  // ---------- Chart tooltips ----------
  var tip = document.getElementById('tip');
  if (tip) {
    var show = function (e) {
      var t = e.target.closest('[data-tip]'); if (!t) return;
      tip.textContent = t.getAttribute('data-tip'); tip.hidden = false;
      var r = t.getBoundingClientRect(), x = e.clientX || (r.left + r.width / 2), y = e.clientY || r.top;
      tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 8, Math.max(8, x - tip.offsetWidth / 2)) + 'px';
      tip.style.top = Math.max(8, y - tip.offsetHeight - 14) + 'px';
    };
    document.addEventListener('pointermove', function (e) { if (e.target.closest('[data-tip]')) show(e); else tip.hidden = true; });
    document.addEventListener('pointerleave', function () { tip.hidden = true; });
  }
});

// ---------- Famous couples: category filter + sort (landing) ----------
document.addEventListener('DOMContentLoaded', function () {
  var box = document.getElementById('couples'); if (!box) return;
  var grid = box.querySelector('.cp-grid');
  box.querySelectorAll('[data-cat]').forEach(function (b) {
    if (b.tagName !== 'BUTTON') return;
    b.addEventListener('click', function () {
      box.querySelectorAll('button[data-cat]').forEach(function (x) { x.classList.toggle('on', x === b); });
      grid.querySelectorAll('.cp-card').forEach(function (c) { var v = b.dataset.cat; c.hidden = v !== 'all' && c.dataset.cat !== v && c.dataset.group !== v; });
    });
  });
  box.querySelectorAll('[data-sort]').forEach(function (b) {
    b.addEventListener('click', function () {
      box.querySelectorAll('[data-sort]').forEach(function (x) { x.classList.toggle('on', x === b); });
      var key = b.dataset.sort === 'years' ? 'years' : 'pct';
      Array.prototype.slice.call(grid.children).sort(function (x, y) { return y.dataset[key] - x.dataset[key] || y.dataset.pct - x.dataset.pct; })
        .forEach(function (c) { grid.appendChild(c); });
    });
  });
});

// Confirm destructive forms (delete profile).
document.addEventListener('submit', function (e) {
  var f = e.target.closest('form[data-confirm]');
  if (f && !window.confirm(f.getAttribute('data-confirm'))) e.preventDefault();
});
