// SETAEI homepage: language switch (NO/EN/FA), contact sheet and the scroll-driven 3D scene.
(function(){
  var root = document.documentElement;

  // ── language ─────────────────────────────────────────────
  var LANGS = ['no','en','fa'];
  // The page's own language (lang on <html>: "no" on /, "en" on /en/) is the markup; the others live in data-*
  var BASE = root.lang === 'en' ? 'en' : 'no';
  function pick(el, attr, own){
    var t = {el:el, no:el.getAttribute('data-'+attr+'no'), en:el.getAttribute('data-'+attr+'en'), fa:el.getAttribute('data-'+attr+'fa')};
    t[BASE] = own; return t;
  }
  var translations = Array.prototype.slice.call(document.querySelectorAll('[data-en],[data-no]')).map(function(el){ return pick(el, '', el.innerHTML); });
  var placeholders = Array.prototype.slice.call(document.querySelectorAll('[data-ph-en],[data-ph-no]')).map(function(el){ return pick(el, 'ph-', el.placeholder); });
  var META = {
    no:{title:'SETAEI | AI, nettsider, nettbutikk og SEO i Oslo', desc:'SETAEI bygger nettsider, nettbutikker, AI-løsninger og SaaS-produkter for bedrifter i Oslo og Norge.'},
    en:{title:'SETAEI | AI, websites, e-commerce and SEO in Oslo', desc:'SETAEI builds websites, online stores, AI solutions and SaaS products for companies in Oslo and Norway.'},
    fa:{title:'SETAEI | هوش مصنوعی، وب‌سایت و سئو در اسلو', desc:'SETAEI وب‌سایت، فروشگاه اینترنتی، راهکارهای هوش مصنوعی و محصولات SaaS برای کسب‌وکارها در اسلو و نروژ می‌سازد.'}
  };
  var language = 'no';
  function ui(no,en,fa){ return language==='fa' ? fa : language==='en' ? en : no; }
  function setMeta(id, v){ var el = document.getElementById(id); if (el) el.content = v; }
  function setLanguage(lang, persist){
    if (LANGS.indexOf(lang) < 0) lang = 'en';
    language = lang;
    root.lang = lang;
    root.dir = lang==='fa' ? 'rtl' : 'ltr';
    translations.forEach(function(t){ var v = t[lang] || t.en || t.no; if (v != null) t.el.innerHTML = v; });
    placeholders.forEach(function(t){ var v = t[lang] || t.en || t.no; if (v != null) t.el.placeholder = v; });
    document.querySelectorAll('.lang-switch [data-lang]').forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-lang')===lang)); });
    var m = META[lang]; document.title = m.title;
    setMeta('metaDesc', m.desc); setMeta('metaOgTitle', m.title); setMeta('metaOgDesc', m.desc); setMeta('metaTwTitle', m.title); setMeta('metaTwDesc', m.desc);
    if (persist){ try { localStorage.setItem('setaei-lang', lang); } catch(e){} }
    window.dispatchEvent(new Event('setaei-lang'));
  }
  function initialLanguage(){
    var q = new URLSearchParams(location.search).get('lang'); if (LANGS.indexOf(q) >= 0) return q;
    try { var s = localStorage.getItem('setaei-lang'); if (LANGS.indexOf(s) >= 0) return s; } catch(e){}
    if (BASE === 'en') return 'en';
    var nav = (navigator.language || 'en').toLowerCase();
    if (nav.indexOf('fa')===0 || nav.indexOf('prs')===0) return 'fa';
    if (nav.indexOf('no')===0 || nav.indexOf('nb')===0 || nav.indexOf('nn')===0) return 'no';
    return 'en';
  }
  // header-v4.js may inject the switch after us, so delegate the click
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('.lang-switch [data-lang]');
    if (b) setLanguage(b.getAttribute('data-lang'), true);
  });
  var first = initialLanguage(); if (first !== BASE) setLanguage(first, false);
  else document.querySelectorAll('.lang-switch [data-lang]').forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-lang')===BASE)); });

  // ── contact sheet ────────────────────────────────────────
  var overlay = document.getElementById('contactOverlay');
  var sheet = document.getElementById('contactSheet');
  var form = document.getElementById('contactForm');
  var statusEl = document.getElementById('contactStatus');
  var submit = document.getElementById('contactSubmit');
  var success = document.getElementById('contactSuccess');
  var lastFocus = null;
  function openContact(){
    lastFocus = document.activeElement;
    overlay.classList.add('open'); sheet.classList.add('open');
    overlay.setAttribute('aria-hidden','false'); sheet.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    setTimeout(function(){ var f = document.getElementById('cf-name'); if (f && !form.hidden) f.focus(); }, 60);
  }
  function showForm(){ success.hidden = true; form.hidden = false; form.reset(); submit.disabled = false; statusEl.textContent = ''; statusEl.className = 'status'; }
  function closeContact(){
    overlay.classList.remove('open'); sheet.classList.remove('open');
    overlay.setAttribute('aria-hidden','true'); sheet.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    setTimeout(function(){ if (!sheet.classList.contains('open') && !success.hidden) showForm(); }, 400);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('click', function(e){
    var o = e.target.closest && e.target.closest('.js-open-contact');
    if (o){ e.preventDefault(); openContact(); }
  });
  document.getElementById('contactClose').addEventListener('click', closeContact);
  document.getElementById('contactSuccessClose').addEventListener('click', closeContact);
  overlay.addEventListener('click', closeContact);
  document.addEventListener('keydown', function(e){
    if (!sheet.classList.contains('open')) return;
    if (e.key === 'Escape') { closeContact(); return; }
    if (e.key !== 'Tab') return;
    var f = Array.prototype.filter.call(sheet.querySelectorAll('button,input,textarea,a[href]'), function(el){ return !el.disabled && el.offsetParent !== null && !el.classList.contains('hp'); });
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length-1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length-1]) { e.preventDefault(); f[0].focus(); }
  });
  function setStatus(msg, kind){ statusEl.textContent = msg; statusEl.className = 'status ' + (kind || ''); }
  form.addEventListener('submit', function(e){
    e.preventDefault();
    if (!form.checkValidity()) { setStatus(ui('Fyll ut navn, e-post og melding.','Please fill in name, email and message.','لطفاً نام، ایمیل و پیام را وارد کنید.'), 'err'); return; }
    setStatus(ui('Sender…','Sending…','در حال ارسال…'), '');
    submit.disabled = true;
    var fd = new FormData(form), payload = {};
    ['name','company','email','phone','message','source','website'].forEach(function(k){ payload[k] = (fd.get(k) || '').toString().trim(); });
    fetch('/api/homepage-contact.php', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)})
      .then(function(r){ return r.json().catch(function(){ return {}; }); })
      .then(function(d){
        if (d.ok) { form.hidden = true; success.hidden = false; document.getElementById('contactSuccessClose').focus(); return; }
        setStatus(d.error || ui('Meldingen ble ikke sendt. Send e-post direkte til khabat@setai.no.','Could not send the message. Email khabat@setai.no directly.','ارسال پیام انجام نشد. لطفاً مستقیماً به khabat@setai.no ایمیل بزنید.'), 'err');
        submit.disabled = false;
      })
      .catch(function(){
        setStatus(ui('Nettverksfeil. Prøv igjen eller send e-post til khabat@setai.no.','Network error. Try again or email khabat@setai.no.','خطای شبکه. دوباره تلاش کنید یا مستقیماً به khabat@setai.no ایمیل بزنید.'), 'err');
        submit.disabled = false;
      });
  });

  // ── section dots + 3D scene ──────────────────────────────
  var canvas = document.getElementById('scene');
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-stage]'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.home-dots a'));
  var LAST = sections.length - 1;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function scrollStage(){
    var mid = window.scrollY + window.innerHeight * 0.5, st = 0;
    for (var i=0;i<sections.length;i++){
      var top = sections[i].offsetTop, h = sections[i].offsetHeight;
      if (mid >= top){ var f = (mid - top) / h; st = i + Math.min(1, Math.max(0, (f - 0.6) / 0.4)); }
    }
    return Math.min(LAST, st);
  }
  function updateNav(st){
    var idx = Math.round(st);
    navLinks.forEach(function(a,i){ if (i===idx) a.setAttribute('aria-current','step'); else a.removeAttribute('aria-current'); });
  }

  if (typeof THREE === 'undefined'){ canvas.style.display='none'; window.addEventListener('scroll', function(){ updateNav(scrollStage()); }, {passive:true}); return; }
  var renderer;
  try { renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true}); } catch(e){ canvas.style.display='none'; window.addEventListener('scroll', function(){ updateNav(scrollStage()); }, {passive:true}); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  renderer.setClearColor(0x10100F, 1);

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x10100F, 15, 30);
  var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.8, 11);
  var CREAM = new THREE.Color(0xFFFAF0), ORANGE = new THREE.Color(0xF47A2A), tmp = new THREE.Color();

  scene.add(new THREE.AmbientLight(0xffffff, 0.32));
  var key = new THREE.DirectionalLight(0xFFFAF0, 0.9); key.position.set(-4,6,6); scene.add(key);
  var rim = new THREE.DirectionalLight(0x5C84AE, 0.8); rim.position.set(5,2,-6); scene.add(rim);

  var group = new THREE.Group(); scene.add(group);

  (function(){
    var g = new THREE.BufferGeometry(), n = 480, a = new Float32Array(n*3);
    for (var i=0;i<n;i++){ a[i*3]=(Math.random()-.5)*22; a[i*3+1]=(Math.random()-.5)*14; a[i*3+2]=-1-Math.random()*9; }
    g.setAttribute('position', new THREE.BufferAttribute(a,3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({color:0xFFFAF0, size:0.035, transparent:true, opacity:0.35})));
  })();

  // 3D "S" from the logo
  function arcPts(pts, cx, cy, r, a0, a1, steps){
    for (var k=0;k<=steps;k++){ var a = a0 + (a1-a0)*k/steps; pts.push([cx + r*Math.cos(a), cy + r*Math.sin(a)]); }
  }
  var P = [], D = Math.PI/180;
  P.push([72,0]); P.push([32,0]);
  arcPts(P, 32,29,29, -90*D, -270*D, 28);
  P.push([48,58]);
  arcPts(P, 48,71,13, -90*D, 90*D, 20);
  P.push([8,84]); P.push([8,100]); P.push([48,100]);
  arcPts(P, 48,71,29, 90*D, -90*D, 28);
  P.push([32,42]);
  arcPts(P, 32,29,13, 90*D, 270*D, 20);
  P.push([72,16]);
  var SC = 0.03, shape = new THREE.Shape();
  P.forEach(function(p,k){ var x=(p[0]-40)*SC, y=-(p[1]-50)*SC; if (k===0) shape.moveTo(x,y); else shape.lineTo(x,y); });
  shape.closePath();
  var sGeo = new THREE.ExtrudeGeometry(shape, {depth:0.45, bevelEnabled:false, curveSegments:1});
  sGeo.translate(0,0,-0.225);
  var logo = new THREE.Group();
  logo.add(new THREE.Mesh(sGeo, new THREE.MeshStandardMaterial({color:0x1B1C1E, metalness:0.45, roughness:0.38})));
  logo.add(new THREE.LineSegments(new THREE.EdgesGeometry(sGeo, 30), new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0.6})));
  group.add(logo);

  // cubes
  var N = 9, cubes = [];
  var boxGeo = new THREE.BoxGeometry(1,1,1), edgeGeo = new THREE.EdgesGeometry(boxGeo);
  for (var i=0;i<N;i++){
    var m = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({color:0x18191B, metalness:0.35, roughness:0.45, emissive:0xF47A2A, emissiveIntensity:0}));
    var e = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0.55}));
    m.add(e); group.add(m); cubes.push({mesh:m, edge:e});
  }

  // connecting line (constellation / agent chain)
  var linePos = new Float32Array(N*3), lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos,3));
  var lineMat = new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0});
  group.add(new THREE.Line(lineGeo, lineMat));

  // star
  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var glowT = tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.75)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); });
  var sparkT = tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); });
  var star = new THREE.Group(); group.add(star);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); glow.scale.set(2.4,2.4,1); star.add(glow);
  var spark = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkT, transparent:true, depthWrite:false})); spark.scale.set(0.55,0.55,1); star.add(spark);
  star.add(new THREE.PointLight(0xF47A2A, 2.2, 7));

  var SCATTER = [[-2.2,1.2,-1],[-1.0,0.2,0.5],[-1.6,-1.3,0],[0.2,1.6,-0.5],[0.6,-0.4,1],[1.5,0.9,0],[2.3,-0.8,-0.8],[1.2,-1.8,0.4],[-0.3,-1.9,-1.2]];

  // stages: 0 intro, 1 services, 2 projects, 3 shahnameh, 4 realgram, 5 research, 6 contact
  function cubeState(s, i, time){
    if (s===0) return {p:[0,0,-0.3], s:.001, r:0, hl:0};
    if (s===1){ if (i<6) return {p:[((i%3)-1)*1.4, i<3?0.75:-0.75, 0], s:.9, r:0.35, hl:0}; return {p:[0,0,0], s:.001, r:0, hl:0}; }
    if (s===2){ var q=SCATTER[i]; return {p:[q[0],q[1],q[2]], s:.45, r:time*0.3+i, hl:0}; }
    if (s===3){ var a=(160 - i*17.5)*D; return {p:[Math.cos(a)*2.3, -0.4+Math.sin(a)*2.3, Math.sin(i)*0.3], s:.5, r:time*0.4+i, hl:0}; }
    if (s===4){ if (i===0) return {p:[0,0,0], s:1.1, r:time*0.3, hl:1}; var b=(i/8)*Math.PI*2 + time*0.4; return {p:[Math.cos(b)*2.0, Math.sin(b)*0.6, Math.sin(b)*2.0], s:.32, r:time+i, hl:0}; }
    if (s===5){ var k=Math.min(i,5); return {p:[-2.5+k*1.0, -0.3, 0], s:(i<6?.55:.001), r:0.3, hl:0}; }
    var c=(i/N)*Math.PI*2 + time*0.15; return {p:[Math.cos(c)*2.5, Math.sin(c)*2.5, -0.6], s:.3, r:time*0.5+i, hl:0};
  }
  function starPos(s, time){
    if (s===0 || s===6) return [1.5,1.8,0.4];
    if (s===1) return [0,2.0,0];
    if (s===2) return [2.6,1.9,0];
    if (s===3) return [0,-0.4,0.3];
    if (s===4) return [0,1.3,0.6];
    var f = (time*0.22)%1; return [-2.5+f*5.0, 0.55, 0];
  }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function ease(t){ return t*t*(3-2*t); }

  var current = scrollStage(), clock = new THREE.Clock();
  var layout = {x:2.1, y:0, z:11};
  function resize(){
    var w=window.innerWidth, h=window.innerHeight;
    renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();
    // Text sits on the reading side, the scene on the other (mirrored for Persian)
    if (w/h > 1.1){ layout.x = root.dir==='rtl' ? -2.1 : 2.1; layout.y=0; layout.z=11; } else { layout.x=0; layout.y=1.9; layout.z=16; }
  }
  window.addEventListener('resize', resize); window.addEventListener('setaei-lang', function(){ resize(); kick(); }); resize();

  var running = false, hidden = false;
  function frame(){
    running = false;
    var time = reduce ? 0 : clock.getElapsedTime();
    var target = scrollStage();
    current += (target - current) * (reduce ? 1 : 0.08);
    updateNav(current);
    var a = Math.floor(current), b = Math.min(a+1, LAST), t = ease(current - a);
    if (a >= LAST){ a = LAST; b = LAST; t = 0; }

    group.position.set(layout.x, layout.y, 0); camera.position.z = layout.z;
    group.rotation.y = -0.3 + Math.sin(current*0.9)*0.25 + Math.sin(time*0.2)*0.05;
    group.rotation.x = 0.06;

    var wl = Math.max(0, 1-Math.abs(current-0), 1-Math.abs(current-LAST));
    logo.visible = wl > 0.01; logo.scale.setScalar(Math.max(.001, wl));
    logo.rotation.y = Math.sin(time*0.35)*0.35 - 0.2;

    for (var i=0;i<N;i++){
      var A=cubeState(a,i,time), B=cubeState(b,i,time), c=cubes[i];
      c.mesh.position.set(lerp(A.p[0],B.p[0],t), lerp(A.p[1],B.p[1],t), lerp(A.p[2],B.p[2],t));
      c.mesh.scale.setScalar(Math.max(.001, lerp(A.s,B.s,t)));
      c.mesh.rotation.y = lerp(A.r,B.r,t); c.mesh.rotation.x = lerp(A.r,B.r,t)*0.3;
      var hl = lerp(A.hl,B.hl,t);
      tmp.copy(CREAM).lerp(ORANGE, hl); c.edge.material.color.copy(tmp); c.edge.material.opacity = 0.55+hl*0.4;
      c.mesh.material.emissiveIntensity = hl*0.18;
      linePos[i*3]=c.mesh.position.x; linePos[i*3+1]=c.mesh.position.y; linePos[i*3+2]=c.mesh.position.z;
    }
    lineGeo.attributes.position.needsUpdate = true;
    lineMat.opacity = 0.35*Math.max(0, 1-Math.abs(current-2), 1-Math.abs(current-5));

    var SA=starPos(a,time), SB=starPos(b,time);
    star.position.set(lerp(SA[0],SB[0],t), lerp(SA[1],SB[1],t)+Math.sin(time*1.2)*0.05, lerp(SA[2],SB[2],t));
    spark.material.rotation = time*0.3;

    renderer.render(scene, camera);
    // Keep animating only while the tab is visible and no contact sheet covers the page
    if (!reduce && !hidden && !sheet.classList.contains('open')) kick();
  }
  function kick(){ if (!running){ running = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', kick, {passive:true});
  window.addEventListener('resize', kick);
  overlay.addEventListener('transitionend', kick);
  document.addEventListener('visibilitychange', function(){ hidden = document.hidden; if (!hidden) kick(); });
  kick();
})();
