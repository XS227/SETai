// /seo/ og SEO-statussidene: scroll-styrt «ranking-skyline» bak innholdet (canvas 2D, ingen avhengigheter).
// Hver <section data-stage="..."> setter scenens tilstand; verdiene glir mykt mellom seksjonene.
// Scenen lever til høyre, teksten i venstrekolonnen (som /services/seo-oslo/).
(function(){
  var canvas = document.getElementById('seo-bg');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-stage]'));

  // Skygge som holder tekstkolonnen rolig
  var shade = document.createElement('div');
  shade.setAttribute('aria-hidden', 'true');
  shade.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none';
  function setShade(){
    shade.style.background = window.innerWidth > 899
      ? 'linear-gradient(90deg,rgba(16,16,15,.97) 0%,rgba(16,16,15,.94) 44%,rgba(16,16,15,.45) 66%,rgba(16,16,15,.04) 100%)'
      : 'linear-gradient(180deg,rgba(16,16,15,.82) 0%,rgba(16,16,15,.9) 100%)';
  }
  setShade();
  canvas.parentNode.insertBefore(shade, canvas.nextSibling);

  // Prikk-navigasjon (kun når siden har stages)
  var dots = [];
  if (sections.length > 1) {
    var nav = document.createElement('nav');
    nav.className = 'home-dots'; nav.setAttribute('aria-label', 'Seksjoner');
    sections.forEach(function(sec, i){
      if (!sec.id) return;
      var a = document.createElement('a');
      a.href = '#' + sec.id;
      a.innerHTML = '<span class="sr">' + (sec.getAttribute('data-label') || sec.id) + '</span>';
      nav.appendChild(a); dots[i] = a;
    });
    document.body.appendChild(nav);
  }

  // Scenens tilstand per stage. chaos: uro i søylene, growth: høyde, stair: trappetrinn, dim: demping, line: trafikklinjens fremdrift,
  // ang: kameravinkel, glow: styrke på #1-gløden, tight: samling av søylene
  var PARAMS = {
    hero:     {chaos:.55, growth:.95, stair:0,   dim:1,   line:.22, ang:-.55, glow:.45, tight:1},
    pain:     {chaos:1.1, growth:.42, stair:0,   dim:.55, line:.06, ang:-.15, glow:.0,  tight:1.25},
    proof:    {chaos:.25, growth:1.3, stair:.55, dim:1,   line:.55, ang:-.75, glow:.8,  tight:1},
    band:     {chaos:.3,  growth:1.05,stair:.2,  dim:.9,  line:.62, ang:-.4,  glow:.5,  tight:.9},
    services: {chaos:.12, growth:1.0, stair:0,   dim:1,   line:.7,  ang:-.3,  glow:.35, tight:.8},
    process:  {chaos:.08, growth:1.1, stair:1,   dim:1,   line:.82, ang:-.95, glow:.7,  tight:1},
    faq:      {chaos:.1,  growth:.8,  stair:.3,  dim:.8,  line:.9,  ang:-.5,  glow:.4,  tight:1},
    contact:  {chaos:.05, growth:1.55,stair:.75, dim:1.1, line:1,   ang:-.62, glow:1,   tight:1}
  };
  var KEYS = Object.keys(PARAMS.hero);
  var cur = {}; KEYS.forEach(function(k){ cur[k] = PARAMS.hero[k]; });

  function targetParams(){
    // posisjon midt i viewporten → flytende stage-indeks
    var mid = window.scrollY + window.innerHeight * 0.5, idx = 0, frac = 0, i;
    for (i = 0; i < sections.length; i++) {
      var top = sections[i].offsetTop, h = sections[i].offsetHeight;
      if (mid >= top) { idx = i; frac = Math.min(1, Math.max(0, (mid - top) / h)); }
    }
    var a = PARAMS[sections[idx] && sections[idx].getAttribute('data-stage')] || PARAMS.hero;
    var nx = sections[idx + 1], b = (nx && PARAMS[nx.getAttribute('data-stage')]) || a;
    var f = Math.min(1, Math.max(0, (frac - 0.6) / 0.4)); f = f * f * (3 - 2 * f);
    var out = {}; KEYS.forEach(function(k){ out[k] = a[k] + (b[k] - a[k]) * f; });
    out._idx = idx + f;
    return out;
  }
  function updateDots(st){
    var n = Math.round(st);
    dots.forEach(function(a, i){ if (!a) return; if (i === n) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
  }

  var COLS = 5, ROWS = 6, GAP = 1.15, cols = [];
  for (var i = 0; i < COLS * ROWS; i++) cols.push({c: i % COLS, r: Math.floor(i / COLS), base: .5 + Math.random() * 1.5, ph: Math.random() * 6.28, sp: .25 + Math.random() * .35, h: .5});
  var pts = [];
  for (var p = 0; p < 60; p++) pts.push({x: Math.random(), y: Math.random(), s: .4 + Math.random() * 1.2, v: .00004 + Math.random() * .00008});

  var W = 0, H = 0, running = false, t0 = performance.now(), ang = 0, F = 1, camY = 3.2, camZ = 9, cx = .5;
  function resize(){
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    setShade();
    if (!running) draw(performance.now());
  }
  function proj(x, y, z){
    var ca = Math.cos(ang), sa = Math.sin(ang), rx = x * ca - z * sa, rz = x * sa + z * ca, d = rz + camZ;
    if (d < .5) d = .5;
    var s = F / d;
    return [W * cx + rx * s, H * .6 - (y - camY * .35) * s];
  }

  function draw(now){
    var t = (now - t0) / 1000, tp = targetParams(), k = reduce ? 1 : .06;
    KEYS.forEach(function(key){ cur[key] += (tp[key] - cur[key]) * k; });
    updateDots(tp._idx);
    ang = cur.ang + Math.sin(t * .08) * .08;
    cx = W > 899 ? .76 : .5;
    F = Math.min(W, H * 1.3) * (W > 899 ? .95 : 1.1);
    var dim = cur.dim, half = COLS * GAP * 1.6;
    ctx.clearRect(0, 0, W, H);

    var g = ctx.createRadialGradient(W * .82, H * .12, 0, W * .82, H * .12, Math.max(W, H) * .55);
    g.addColorStop(0, 'rgba(233,183,120,' + (.10 * dim) + ')'); g.addColorStop(1, 'rgba(233,183,120,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // gulv-grid
    var n = 16, off = (t * .25) % (2 * half / n), i;
    ctx.lineWidth = 1;
    for (i = 0; i <= n; i++) {
      var kk = -half + i * (2 * half / n), a = proj(kk, 0, -half), b = proj(kk, 0, half);
      ctx.strokeStyle = 'rgba(255,250,240,' + (.05 * dim) + ')';
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      var zz = -half + ((i * (2 * half / n) + off) % (2 * half)), c = proj(-half, 0, zz), d = proj(half, 0, zz);
      ctx.strokeStyle = 'rgba(233,183,120,' + (.07 * dim) + ')';
      ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke();
    }

    // søyler: høyde følger stage (uro, vekst, trappetrinn mot #1)
    var list = cols.map(function(o){
      var x = (o.c - (COLS - 1) / 2) * GAP * cur.tight, z = (o.r - (ROWS - 1) / 2) * GAP * cur.tight;
      var wave = .5 + .5 * Math.sin(t * o.sp + o.ph);
      var rnd = o.base * (.55 + .7 * wave) * (1 + (cur.chaos - .3) * .5) + .18 * cur.chaos * Math.sin(t * .6 - o.r);
      var stair = .35 + o.c * .62 + (ROWS - 1 - o.r) * .04 + .05 * Math.sin(t * .8 + o.ph);
      var target = (rnd * (1 - cur.stair) + stair * cur.stair) * cur.growth;
      o.h += (target - o.h) * (reduce ? 1 : .08);
      return {x: x, z: z, rz: x * Math.sin(ang) + z * Math.cos(ang), h: Math.max(.08, o.h)};
    }).sort(function(a, b){ return b.rz - a.rz; });
    var best = list.reduce(function(m, c){ return c.h > m.h ? c : m; }, list[0]), w = .36;

    list.forEach(function(c){
      var x = c.x, z = c.z, h = c.h, top = c === best;
      var p0 = proj(x - w, 0, z - w), p1 = proj(x + w, 0, z - w), p2 = proj(x + w, 0, z + w);
      var q0 = proj(x - w, h, z - w), q1 = proj(x + w, h, z - w), q2 = proj(x + w, h, z + w), q3 = proj(x - w, h, z + w);
      var depth = Math.max(.15, Math.min(1, 1 - (c.rz + half) / (2 * half) * .75)), al = (.14 + depth * .28) * dim;
      function face(a, b, c2, d2, fill){ ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(d2[0], d2[1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
      face(p0, p1, q1, q0, 'rgba(24,26,27,.75)');
      face(p1, p2, q2, q1, 'rgba(31,33,34,.8)');
      var hot = top ? cur.glow : 0;
      face(q0, q1, q2, q3, top ? 'rgba(247,200,145,' + (.25 + .35 * hot) + ')' : 'rgba(233,183,120,' + (al * .55) + ')');
      ctx.strokeStyle = top ? 'rgba(247,200,145,' + (.5 + .4 * hot) + ')' : 'rgba(255,250,240,' + (al * .55) + ')';
      ctx.lineWidth = top ? 1.4 : 1;
      ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]); ctx.lineTo(q3[0], q3[1]); ctx.closePath();
      ctx.moveTo(p0[0], p0[1]); ctx.lineTo(q0[0], q0[1]); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(q1[0], q1[1]); ctx.moveTo(p2[0], p2[1]); ctx.lineTo(q2[0], q2[1]);
      ctx.stroke();
      if (top && hot > .02) {
        var c0 = proj(x, h + .25, z), gl = ctx.createRadialGradient(c0[0], c0[1], 0, c0[0], c0[1], 52);
        gl.addColorStop(0, 'rgba(247,200,145,' + (.5 * hot) + ')'); gl.addColorStop(1, 'rgba(247,200,145,0)');
        ctx.fillStyle = gl; ctx.fillRect(c0[0] - 56, c0[1] - 56, 112, 112);
      }
    });

    // trafikklinje: fremdrift følger stage (flat i «problem», full i «kontakt»)
    var N = 40, head = Math.max(.02, cur.line), prev = null, j, hp = null;
    ctx.lineWidth = 1.6;
    for (j = 0; j <= N; j++) {
      var u = j / N;
      if (u > head + .001) break;
      var amp = .2 + .8 * cur.line;
      var pp = proj(-half + u * 2 * half, .4 + u * u * 3.4 * amp + Math.sin(u * 14 + t * .7) * .12 * (.4 + cur.chaos * .6), -half * .9);
      if (prev) { ctx.strokeStyle = 'rgba(233,183,120,' + ((.15 + u * .55) * dim) + ')'; ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(pp[0], pp[1]); ctx.stroke(); }
      prev = pp; hp = pp;
    }
    if (hp) {
      var hg = ctx.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], 14);
      hg.addColorStop(0, 'rgba(255,250,240,.9)'); hg.addColorStop(1, 'rgba(233,183,120,0)');
      ctx.fillStyle = hg; ctx.fillRect(hp[0] - 16, hp[1] - 16, 32, 32);
    }

    // støv
    var sy = window.scrollY || 0;
    pts.forEach(function(q){
      if (!reduce) { q.y -= q.v * 16; if (q.y < -.02) { q.y = 1.02; q.x = Math.random(); } }
      var px = q.x * W + Math.sin(t * .3 + q.x * 9) * 8, py = q.y * H - sy * .04 * q.s;
      ctx.fillStyle = 'rgba(255,250,240,' + ((.10 + q.s * .12) * dim) + ')';
      ctx.fillRect(px, ((py % H) + H) % H, q.s, q.s);
    });
  }

  function loop(now){ if (!running) return; draw(now); requestAnimationFrame(loop); }
  function start(){ if (reduce || running) return; running = true; requestAnimationFrame(loop); }
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', function(){ if (!running) draw(performance.now()); }, {passive: true});
  document.addEventListener('visibilitychange', function(){ if (document.hidden) running = false; else start(); });
  resize();
  if (reduce) draw(performance.now()); else start();
})();
