// Delt scroll-styrt bakgrunn. <canvas id="page-bg" data-theme="network|wave|ripple|flow" data-accent="#e9b778" data-layout="left|center" data-mode="light">
// Kapitlene hentes automatisk fra <h2> i innholdet: scenen utvikler seg gjennom siden og får et puls ved hvert nytt kapittel.
// Desktop (layout=left): teksten i venstrekolonne, scenen til høyre – som /services/seo-oslo/.
// Canvas ligger bak innholdet (z-index:-1). Ingen avhengigheter, pauser i bakgrunnsfane, stille ved prefers-reduced-motion.
(function(){
  var canvas = document.getElementById('page-bg');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var theme = canvas.getAttribute('data-theme') || 'network';
  var left = canvas.getAttribute('data-layout') !== 'center';
  var light = canvas.getAttribute('data-mode') === 'light';
  var hex = (canvas.getAttribute('data-accent') || '#e9b778').replace('#', '');
  if (hex.length === 3) hex = hex.replace(/./g, '$&$&');
  var R = parseInt(hex.substr(0, 2), 16) || 233, G = parseInt(hex.substr(2, 2), 16) || 183, B = parseInt(hex.substr(4, 2), 16) || 120;
  function acc(a){ return 'rgba(' + R + ',' + G + ',' + B + ',' + a + ')'; }
  function ink(a){ return light ? 'rgba(40,32,24,' + (a * .8) + ')' : 'rgba(255,250,240,' + a + ')'; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- layout: venstrekolonne på desktop ----------
  if (left) {
    var st = document.createElement('style');
    st.textContent = '@media (min-width:900px){main .wrap,main .container,main.wrap,main.container{width:min(720px,56vw)!important;max-width:none!important;margin-left:max(6vw,24px)!important;margin-right:0!important}}' +
      '.home-dots{position:fixed;right:max(14px,2vw);top:50%;transform:translateY(-50%);z-index:5;display:flex;flex-direction:column;gap:2px}' +
      '.home-dots a{display:flex;align-items:center;justify-content:center;width:44px;height:40px;color:#d6d0c4}' +
      '.home-dots a::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor;opacity:.5;transition:transform .3s,opacity .3s,background .3s}' +
      '.home-dots a[aria-current="step"]::before{background:' + acc(1) + ';opacity:1;transform:scale(1.5)}' +
      '.home-dots .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
      '@media (max-width:520px){.home-dots{display:none}}';
    document.head.appendChild(st);
  }

  // ---------- skygge ----------
  var shade = document.createElement('div');
  shade.setAttribute('aria-hidden', 'true');
  shade.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none';
  var base = light ? '250,248,244' : '16,16,15';
  var bgAttr = (canvas.getAttribute('data-bg') || '').replace('#', '');
  if (bgAttr.length === 6) base = parseInt(bgAttr.substr(0, 2), 16) + ',' + parseInt(bgAttr.substr(2, 2), 16) + ',' + parseInt(bgAttr.substr(4, 2), 16);
  function setShade(){
    var c = base;
    if (!left) shade.style.background = 'rgba(' + c + ',.84)';
    else if (window.innerWidth > 899) shade.style.background = 'linear-gradient(90deg,rgba(' + c + ',.97) 0%,rgba(' + c + ',.94) 44%,rgba(' + c + ',.45) 66%,rgba(' + c + ',.04) 100%)';
    else shade.style.background = 'linear-gradient(180deg,rgba(' + c + ',.82) 0%,rgba(' + c + ',.9) 100%)';
  }
  canvas.parentNode.insertBefore(shade, canvas.nextSibling);

  // ---------- kapitler (h2) + prikk-navigasjon ----------
  var scope = document.querySelector('main') || document.body;
  var heads = Array.prototype.slice.call(scope.querySelectorAll('h2')).filter(function(h){ return h.offsetParent !== null; });
  function pageEnd(){ return Math.max(1, document.documentElement.scrollHeight - window.innerHeight); }
  function absTop(el){ return el.getBoundingClientRect().top + window.scrollY; }
  var dots = [], dotTargets = [];
  if (left && heads.length > 1) {
    var picks = heads;
    if (heads.length > 9) { picks = []; for (var q = 0; q < 9; q++) picks.push(heads[Math.round(q * (heads.length - 1) / 8)]); }
    var nav = document.createElement('nav');
    nav.className = 'home-dots'; nav.setAttribute('aria-label', 'Seksjoner');
    picks.forEach(function(h, i){
      if (!h.id) h.id = 'kapittel-' + (i + 1);
      var a = document.createElement('a');
      a.href = '#' + h.id; a.innerHTML = '<span class="sr">' + h.textContent.replace(/</g, '') + '</span>';
      nav.appendChild(a); dots.push(a); dotTargets.push(h);
    });
    document.body.appendChild(nav);
  }
  function chapterIndex(){
    var mid = window.scrollY + window.innerHeight * .5, idx = 0;
    for (var i = 0; i < heads.length; i++) if (mid >= absTop(heads[i])) idx = i + 1;
    return idx;
  }
  function updateDots(){
    if (!dots.length) return;
    var mid = window.scrollY + window.innerHeight * .5, cur = 0;
    dotTargets.forEach(function(h, i){ if (mid >= absTop(h)) cur = i; });
    dots.forEach(function(a, i){ if (i === cur) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
  }

  // ---------- tilstand ----------
  var W = 0, H = 0, running = false, t0 = performance.now(), s = 0, ss = 0, energy = 0, lastChap = -1, mx = 0, my = 0, mxs = 0, mys = 0, small = false;
  var nodes = [], rings = [], streaks = [], lastRing = 0;
  function init(){
    small = W < 700; nodes = []; streaks = [];
    var n = small ? 38 : 74, j;
    for (j = 0; j < n; j++) nodes.push({x: Math.random(), y: Math.random(), z: .25 + Math.random() * .75, a: Math.random() * 6.28, s: .00008 + Math.random() * .00016});
    var m = small ? 34 : 70;
    for (j = 0; j < m; j++) streaks.push({x: Math.random(), y: Math.random(), l: 40 + Math.random() * 120, v: .00012 + Math.random() * .0004, z: .3 + Math.random() * .7});
  }
  function resize(){
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    setShade(); init();
    if (!running) draw(performance.now());
  }
  function cxr(){ return left && W > 899 ? .76 : .5; }

  function glow(){
    var g = ctx.createRadialGradient(W * .85, H * .1, 0, W * .85, H * .1, Math.max(W, H) * .7);
    g.addColorStop(0, acc(.08 + .08 * ss + .1 * energy)); g.addColorStop(1, acc(0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // network: spredte stjerner som trekkes sammen og kobles til en klynge mot slutten
  function drawNetwork(t){
    var cx = W * cxr(), cy = H * .46, pts = [], i, j, pull = .1 + .55 * ss;
    for (i = 0; i < nodes.length; i++) {
      var n = nodes[i]; n.a += n.s * 16;
      var x0 = (n.x + Math.cos(n.a) * .03) * W + mxs * 30 * n.z, y0 = (n.y + Math.sin(n.a * 1.3) * .03) * H + mys * 60 * n.z;
      var tx = cx + (n.x - .5) * W * .34, ty = cy + (n.y - .5) * H * .5;
      pts.push([x0 + (tx - x0) * pull * n.z, y0 + (ty - y0) * pull * n.z, n.z]);
    }
    var maxd = (small ? 100 : 140) * (.7 + .8 * ss + .5 * energy), md2 = maxd * maxd;
    ctx.lineWidth = 1;
    for (i = 0; i < pts.length; i++) for (j = i + 1; j < pts.length; j++) {
      var dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], d2 = dx * dx + dy * dy;
      if (d2 < md2) { ctx.strokeStyle = acc((1 - d2 / md2) * (.16 + .16 * ss + .2 * energy) * Math.min(pts[i][2], pts[j][2])); ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[j][0], pts[j][1]); ctx.stroke(); }
    }
    for (i = 0; i < pts.length; i++) {
      var hot = i % 7 === 0, pu = .5 + .5 * Math.sin(t * 1.2 + i);
      ctx.fillStyle = hot ? acc(.5 + pu * .3 + energy * .2) : ink(.16 + pts[i][2] * .26);
      ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], (hot ? 2.6 : 1.4) * pts[i][2] + (hot ? pu + energy * 1.5 : 0), 0, 6.283); ctx.fill();
    }
  }

  // wave: terreng som er rolig i starten, bølger opp midt i siden og glatter seg mot slutten
  function drawWave(t){
    var rows = small ? 16 : 26, cols = small ? 22 : 40, hor = H * (.52 - .12 * ss), vx = W * cxr(), i, j;
    var amp = .5 + 1.1 * Math.sin(Math.min(1, ss) * 3.14159) + energy * .8;
    ctx.lineWidth = 1;
    for (i = 0; i < rows; i++) {
      var f = i / (rows - 1), pf = f * f, y0 = hor + pf * (H * .62), sc = .25 + pf * 1.7;
      ctx.beginPath();
      for (j = 0; j <= cols; j++) {
        var u = j / cols - .5, x = vx + u * W * 1.5 * sc + mxs * 18 * f;
        var h = (Math.sin(u * 7 + t * .6 + i * .5) * 14 + Math.cos(u * 3 - t * .4 + i * .3) * 10) * sc * amp;
        if (j) ctx.lineTo(x, y0 - h); else ctx.moveTo(x, y0 - h);
      }
      ctx.strokeStyle = (i % 5 === 0 || f < ss) ? acc(.08 + f * .2) : ink(.025 + f * .06);
      ctx.stroke();
    }
    ctx.strokeStyle = ink(.03);
    for (j = 0; j <= cols; j += 2) { var uu = j / cols - .5; ctx.beginPath(); ctx.moveTo(vx + uu * W * .4, hor); ctx.lineTo(vx + uu * W * 2.1, H); ctx.stroke(); }
    for (i = 0; i < 40; i++) { ctx.fillStyle = ink(.08 + .12 * (.5 + .5 * Math.sin(t + i))); ctx.fillRect(((i * 97 + 13) % 100) / 100 * W, ((i * 53 + 7) % 100) / 100 * hor * .95, 1.4, 1.4); }
  }

  // ripple: pulser som blir hyppigere og sterkere jo lenger ned siden man kommer
  function drawRipple(t){
    var cx = W * (left && W > 899 ? .76 : (small ? .5 : .72)) + mxs * 20, cy = H * (.3 + .25 * ss) + mys * 12, i;
    var gap = 2.6 - 1.6 * ss;
    if (t - lastRing > gap) { rings.push(t); lastRing = t; }
    if (energy > .9 && rings.length && t - rings[rings.length - 1] > .5) rings.push(t);
    while (rings.length && t - rings[0] > 12) rings.shift();
    var max = Math.max(W, H) * .9; ctx.lineWidth = 1.2;
    for (i = 0; i < rings.length; i++) {
      var k = (t - rings[i]) / 12, r = k * max;
      ctx.strokeStyle = acc((.22 + .2 * ss) * (1 - k)); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = ink(.07 * (1 - k)); ctx.beginPath(); ctx.arc(cx, cy, r * .72, 0, 6.283); ctx.stroke();
    }
    var pulse = .6 + .4 * Math.sin(t * 1.6) + energy * .6, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90 + 40 * ss);
    g.addColorStop(0, acc(Math.min(.8, .4 * pulse))); g.addColorStop(1, acc(0));
    ctx.fillStyle = g; ctx.fillRect(cx - 140, cy - 140, 280, 280);
    ctx.fillStyle = ink(.9); ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 6.283); ctx.fill();
    var cnt = 10 + Math.round(26 * ss);
    for (i = 0; i < cnt; i++) { var a = i / cnt * 6.283 + t * .07, rr = 140 + (i % 5) * 70 + Math.sin(t * .5 + i) * 10; ctx.fillStyle = i % 4 === 0 ? acc(.6) : ink(.22); ctx.fillRect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .6, 1.8, 1.8); }
  }

  // flow: lysstriper som øker i tempo og tetthet gjennom artikkelen
  function drawFlow(t){
    ctx.lineWidth = 1;
    var vis = Math.round(streaks.length * (.4 + .6 * ss)), speed = 1 + 2.2 * ss + energy * 3;
    for (var i = 0; i < vis; i++) {
      var q = streaks[i]; q.x += q.v * 16 * q.z * speed; if (q.x > 1.2) { q.x = -.2; q.y = Math.random(); }
      var x = q.x * W, y = ((q.y * H - window.scrollY * .18 * q.z) % H + H) % H + Math.sin(t * .5 + i) * 6, hot = i % 6 === 0;
      var g = ctx.createLinearGradient(x - q.l, 0, x, 0);
      g.addColorStop(0, acc(0)); g.addColorStop(1, hot ? acc(.5 * q.z) : ink(.16 * q.z));
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(x - q.l * q.z * (1 + ss), y); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = hot ? acc(.8) : ink(.35 * q.z); ctx.fillRect(x, y - .8, 1.8, 1.8);
    }
    ctx.strokeStyle = ink(.025);
    for (var k = 1; k < 9; k++) { var yy = (k / 9) * H - (window.scrollY * .05) % (H / 9); ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke(); }
  }

  function draw(now){
    var t = (now - t0) / 1000;
    s = Math.min(1, Math.max(0, (window.scrollY || 0) / pageEnd()));
    ss += (s - ss) * (reduce ? 1 : .06);
    mxs += (mx - mxs) * .05; mys += (my - mys) * .05;
    var ch = chapterIndex();
    if (ch !== lastChap) { if (lastChap >= 0 && !reduce) energy = 1; lastChap = ch; updateDots(); }
    energy *= .965;
    ctx.clearRect(0, 0, W, H);
    glow();
    if (theme === 'wave') drawWave(t); else if (theme === 'ripple') drawRipple(t); else if (theme === 'flow') drawFlow(t); else drawNetwork(t);
  }
  function loop(now){ if (!running) return; draw(now); requestAnimationFrame(loop); }
  function start(){ if (reduce || running) return; running = true; requestAnimationFrame(loop); }

  window.addEventListener('resize', resize);
  window.addEventListener('scroll', function(){ if (!running) draw(performance.now()); }, {passive: true});
  window.addEventListener('pointermove', function(e){ mx = e.clientX / W - .5; my = e.clientY / H - .5; }, {passive: true});
  document.addEventListener('visibilitychange', function(){ if (document.hidden) running = false; else start(); });
  resize();
  if (reduce) draw(performance.now()); else start();
})();
