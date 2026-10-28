// /projects/: a flight through the SETAEI Lab corridor, one object per project, with calm film clips on the film sections
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-stage]'));
  var LAST = sections.length - 1;
  var railSpan = document.querySelector('.rail span'), nowName = document.querySelector('.now-name'), nowN = document.querySelector('.now-n'), lastI = -1;

  // reveal on view
  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) e.target.classList.add('in'); }); }, {threshold:0.35});
    sections.forEach(function(s){ io.observe(s); });
  } else sections.forEach(function(s){ s.classList.add('in'); });

  function scrollStage(){
    var mid = scrollY + innerHeight*0.5, st = 0;
    for (var i=0;i<sections.length;i++){ var top=sections[i].offsetTop, h=sections[i].offsetHeight; if (mid>=top){ var f=(mid-top)/h; st = i + Math.min(1, Math.max(0,(f-0.5)/0.5)); } }
    return Math.min(LAST, st);
  }
  function ui(st){
    railSpan.style.transform = 'scaleX(' + (st/LAST).toFixed(4) + ')';
    var i = Math.round(st); if (i === lastI) return; lastI = i;
    var s = sections[i]; nowName.textContent = s.getAttribute('data-name'); nowN.textContent = s.getAttribute('data-n') ? s.getAttribute('data-n') + ' / 12' : '';
  }
  addEventListener('scroll', function(){ ui(scrollStage()); }, {passive:true}); ui(scrollStage());


  // ---------- calm film layer ----------
  // Sections with data-video get a muted, slowed-down clip behind the corridor while they are the current stage.
  // Each clip is only loaded the first time its section comes close, and paused as soon as it fades out.
  var reel = document.querySelector('.reel'), clips = {}, activeV = null;
  function clipFor(i){
    var src = sections[i] && sections[i].getAttribute('data-video'); if (!src || !reel) return null;
    if (!clips[i]){ var v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline',''); v.preload = 'auto'; v.src = src; reel.appendChild(v); clips[i] = v; }
    return clips[i];
  }
  function updateReel(st){
    if (reduce || !reel) return;
    var i = Math.round(st), near = Math.abs(st - i) < 0.42, v = near ? clipFor(i) : null;
    if (sections[i+1] && sections[i+1].getAttribute('data-video') && st > i + 0.2) clipFor(i+1);
    if (v === activeV) return;
    if (activeV){ var old = activeV; old.classList.remove('on'); setTimeout(function(){ if (old !== activeV) old.pause(); }, 1700); }
    activeV = v; reel.classList.toggle('on', !!v);
    if (v){ v.classList.add('on'); v.playbackRate = 0.75; var p = v.play(); if (p && p.catch) p.catch(function(){}); v.addEventListener('loadedmetadata', function(){ v.playbackRate = 0.75; }, {once:true}); }
  }
  addEventListener('scroll', function(){ updateReel(scrollStage()); }, {passive:true}); updateReel(scrollStage());
  document.addEventListener('visibilitychange', function(){ if (activeV){ if (document.hidden) activeV.pause(); else activeV.play().catch(function(){}); } });

  var canvas = document.getElementById('scene');
  if (typeof THREE === 'undefined'){ canvas.style.display='none'; return; }
  var renderer;
  try { renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true}); } catch(e){ canvas.style.display='none'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2));
  renderer.setClearColor(0x10100F, 1);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  var scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x10100F, 7, 30);
  var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
  (function(){
    var env = new THREE.Scene(); env.background = new THREE.Color(0x12151A);
    function panel(color, w, h, pos){ var m = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({color:color, side:THREE.DoubleSide})); m.position.set(pos[0],pos[1],pos[2]); m.lookAt(0,0,0); env.add(m); }
    panel(0xFFF1E6, 6, 2, [0,6,3]); panel(0xE7B3A6, 3, 3, [-6,1,2]); panel(0x9DB4CC, 3, 3, [6,0,-3]); panel(0xF47A2A, 2, 1, [2,-4,5]);
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(env, 0.04).texture;
  })();
  scene.add(new THREE.HemisphereLight(0xBFD0E0, 0x1A1410, 0.45));
  var key = new THREE.DirectionalLight(0xFFF0E0, 0.8); key.position.set(-4,6,6); scene.add(key);

  var C = {cream:0xFFFAF0, orange:0xF47A2A, dark:0x1B1C1E};
  function solid(g, geo, edge, op, col){ var m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color:col||C.dark, metalness:0.4, roughness:0.4})); var e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({color:edge||C.cream, transparent:true, opacity:op||0.6})); m.add(e); g.add(m); return m; }
  function sprite(txt, color, font){ var c=document.createElement('canvas'); c.width=128; c.height=128; var x=c.getContext('2d'); x.fillStyle=color||'#FFFAF0'; x.font=font||'700 84px "Space Grotesk", Inter, system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,64,68); var s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c), transparent:true, depthWrite:false})); s.scale.set(0.28,0.28,1); return s; }
  function pearl(color){ return new THREE.MeshPhysicalMaterial({color:color, roughness:0.15, clearcoat:1, clearcoatRoughness:0.08}); }

  // ---------- builders ----------
  var B = {
    realgram:function(g){ var core = solid(g, new THREE.IcosahedronGeometry(0.42,1), C.orange, 0.9); var ring = new THREE.Mesh(new THREE.TorusGeometry(0.95,0.012,8,120), new THREE.MeshBasicMaterial({color:C.cream})); ring.rotation.x = 1.2; g.add(ring);
      var sats = [new THREE.TorusGeometry(0.16,0.05,6,18), new THREE.OctahedronGeometry(0.17,0), new THREE.CylinderGeometry(0.16,0.16,0.05,18)].map(function(geo){ return solid(g, geo); });
      return function(t,a){ core.rotation.y = t*0.4; ring.rotation.z = t*0.3; sats.forEach(function(s,k){ var an = k/3*Math.PI*2 + t*0.6; s.position.set(Math.cos(an)*0.95, Math.sin(an)*0.35, Math.sin(an)*0.95*Math.cos(1.2)); s.rotation.y = t+k; }); }; },
    shahnameh:function(g){ var gem = solid(g, new THREE.OctahedronGeometry(0.42,0), C.orange, 0.9); gem.position.y = 0.55; var st = []; for (var i=0;i<14;i++){ var a = i*0.6, r = 0.95 - i*0.035; var m = solid(g, new THREE.BoxGeometry(0.1,0.1,0.1)); m.position.set(Math.cos(a)*r, -0.9 + i*0.11, Math.sin(a)*r); st.push(m); }
      return function(t,a){ gem.rotation.y = t*0.6; var lit = Math.floor((t*1.5)%15); st.forEach(function(m,i){ m.children[0].material.color.setHex(i<lit ? C.orange : C.cream); m.rotation.y = t+i; }); }; },
    trustai:function(g){ var slabs = [0,1,2].map(function(k){ var m = solid(g, new THREE.BoxGeometry(1.3,0.1,0.85), k===2?C.orange:C.cream); m.position.y = -0.5 + k*0.42; return m; }); var dots = []; for (var i=0;i<6;i++){ var d = new THREE.Mesh(new THREE.SphereGeometry(0.05,10,10), new THREE.MeshBasicMaterial({color:i%2?C.orange:C.cream})); g.add(d); dots.push(d); }
      return function(t,a){ slabs.forEach(function(m,k){ m.position.y = -0.5 + k*(0.32 + 0.12*a); m.rotation.y = Math.sin(t*0.4+k)*0.15; }); dots.forEach(function(d,i){ var an = i/6*Math.PI*2 + t*0.7; d.position.set(Math.cos(an)*1.05, -0.4 + (i%3)*0.4, Math.sin(an)*0.7); }); }; },
    numerologist:function(g){ var dd = solid(g, new THREE.DodecahedronGeometry(0.45,0), C.orange, 0.85); var digits = []; for (var i=1;i<=9;i++){ var s = sprite(String(i), i===7?'#F47A2A':'#FFFAF0'); g.add(s); digits.push(s); }
      return function(t,a){ dd.rotation.y = t*0.35; dd.rotation.x = t*0.2; digits.forEach(function(s,k){ var an = k/9*Math.PI*2 + t*0.3; s.position.set(Math.cos(an)*1.0, Math.sin(an*2)*0.15, Math.sin(an)*1.0); }); }; },
    si:function(g){ var phone = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.72,1.35,0.08)), new THREE.LineBasicMaterial({color:C.cream})); g.add(phone); var core = solid(g, new THREE.IcosahedronGeometry(0.22,1), C.orange, 0.95); var shield = new THREE.Mesh(new THREE.TorusGeometry(1.0,0.012,8,120), new THREE.MeshBasicMaterial({color:C.orange})); g.add(shield);
      return function(t,a){ core.rotation.y = t*0.8; phone.rotation.y = Math.sin(t*0.5)*0.35; shield.rotation.z = t*0.3; shield.rotation.x = Math.sin(t*0.3)*0.4; }; },
    film:function(g){ var fr = []; for (var i=0;i<6;i++){ var m = solid(g, new THREE.BoxGeometry(0.78,0.44,0.03)); fr.push(m); }
      return function(t,a){ fr.forEach(function(f,i){ var p = ((t*0.07) + i/6) % 1, an = (p-0.5)*2.6; f.position.set(Math.sin(an)*1.4, Math.cos(an)*0.15, Math.cos(an)*0.7 - 0.6); f.rotation.y = -an*0.8; var front = Math.max(0, 1-Math.abs(p-0.5)*5); f.scale.setScalar(0.75 + front*0.5); f.children[0].material.color.setHex(front>0.5?C.orange:C.cream); }); }; },
    crown:function(g){ var knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.36,0.1,140,16,2,3), pearl(0xE8A07A)); g.add(knot); var bars = []; for (var i=0;i<28;i++){ var b = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.2,0.03), new THREE.MeshBasicMaterial({color:i%4===0?C.orange:C.cream})); var an = i/28*Math.PI*2; b.position.set(Math.cos(an)*0.95, 0, Math.sin(an)*0.95); g.add(b); bars.push(b); }
      return function(t,a){ knot.rotation.y = t*0.4; knot.rotation.x = t*0.25; bars.forEach(function(b,i){ b.scale.y = 0.4 + Math.abs(Math.sin(t*3 + i*0.7))*2.0*(0.4+0.6*a); }); }; },
    gardoon:function(g){ function gear(r, n, col){ var gg = new THREE.Group(); gg.add(solid(gg, new THREE.CylinderGeometry(r,r,0.14,32), col, 0.7)); for (var i=0;i<n;i++){ var an = i/n*Math.PI*2; var tth = solid(gg, new THREE.BoxGeometry(0.1,0.14,0.12), col, 0.7); tth.position.set(Math.cos(an)*(r+0.05), 0, Math.sin(an)*(r+0.05)); tth.rotation.y = -an; } gg.rotation.x = Math.PI/2; g.add(gg); return gg; }
      var g1 = gear(0.5, 14, C.cream), g2 = gear(0.28, 8, C.orange); g1.position.x = -0.25; g2.position.set(0.58, 0.3, 0);
      return function(t,a){ g1.rotation.y = t*0.6; g2.rotation.y = -t*0.6*14/8 + 0.2; }; },
    somi:function(g){ var p = new THREE.Mesh(new THREE.SphereGeometry(0.55,64,64), pearl(0xF1E3DA)); g.add(p); var rings = []; for (var i=0;i<3;i++){ var r = new THREE.Mesh(new THREE.RingGeometry(1,1.012,96), new THREE.MeshBasicMaterial({color:0xF1E3DA, transparent:true, side:THREE.DoubleSide})); r.rotation.x = -Math.PI/2; r.position.y = -0.75; g.add(r); rings.push(r); }
      return function(t,a){ p.position.y = Math.sin(t*0.7)*0.06; rings.forEach(function(r,i){ var f = ((t*0.15) + i/3) % 1; r.scale.setScalar(0.5 + f*1.6); r.material.opacity = 0.5*(1-f); }); }; },
    styrk:function(g){ var sun = new THREE.Mesh(new THREE.CircleGeometry(0.32,48), new THREE.MeshBasicMaterial({color:0xD6A23C})); sun.position.set(0.45,0.55,-0.4); g.add(sun);
      [[-0.5,0.95,0x8FA38E,-0.3],[0.25,1.25,0x4E6B57,-0.15],[0.75,0.8,0x2F4A3A,0]].forEach(function(m){ var c = new THREE.Mesh(new THREE.ConeGeometry(0.62,m[1],4), new THREE.MeshStandardMaterial({color:m[2], roughness:0.9, flatShading:true})); c.position.set(m[0], -0.75 + m[1]/2, m[3]); c.rotation.y = Math.PI/4; g.add(c); });
      var curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.0,-0.75,0.5), new THREE.Vector3(-0.3,-0.5,0.45), new THREE.Vector3(0.1,-0.1,0.35), new THREE.Vector3(0.25,0.45,0.2)]); var path = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.02, 6, false), new THREE.MeshBasicMaterial({color:0xB4532F})); g.add(path);
      var walkers = [0,1].map(function(k){ var w = new THREE.Mesh(new THREE.SphereGeometry(0.045,10,10), new THREE.MeshBasicMaterial({color:k?0xFFFAF0:0xB4532F})); g.add(w); return w; });
      return function(t,a){ var f = (t*0.08)%1; walkers[0].position.copy(curve.getPoint(f)); walkers[1].position.copy(curve.getPoint(Math.max(0,f-0.04))); sun.position.y = 0.4 + Math.sin(t*0.3)*0.1; }; },
    volla:function(g){ var clad = new THREE.MeshStandardMaterial({color:0x2A2E33, roughness:0.8}); var house = new THREE.Mesh(new THREE.BoxGeometry(1.1,0.6,0.7), clad); house.position.y = -0.3; g.add(house);
      var s = new THREE.Shape(); s.moveTo(-0.42,0); s.lineTo(0.42,0); s.lineTo(0,0.38); s.closePath(); var roofGeo = new THREE.ExtrudeGeometry(s,{depth:1.2, bevelEnabled:false}); var roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({color:0x17191C, roughness:0.6})); roof.rotation.y = Math.PI/2; roof.position.set(-0.6,0,0); g.add(roof);
      var winMat = new THREE.MeshStandardMaterial({color:0x1C232B, emissive:0xFFB673, emissiveIntensity:0.9}); [[-0.3,-0.25],[0.15,-0.25],[0.38,-0.25]].forEach(function(q,k){ var wnd = new THREE.Mesh(new THREE.BoxGeometry(k===1?0.3:0.16,0.2,0.02), winMat); wnd.position.set(q[0], q[1], 0.36); g.add(wnd); });
      var edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.1,0.6,0.7)), new THREE.LineBasicMaterial({color:C.orange, transparent:true})); edges.position.y = -0.3; g.add(edges);
      return function(t,a){ edges.material.opacity = 0.9*(1-a)*0.7 + 0.1; winMat.emissiveIntensity = 0.4 + 0.8*a; g.rotation.y = -0.5 + Math.sin(t*0.25)*0.35; }; },
    bilvask:function(g){ var paint = new THREE.MeshPhysicalMaterial({color:0x15324F, roughness:0.2, metalness:0.5, clearcoat:1}); var body = new THREE.Mesh(new THREE.BoxGeometry(1.0,0.22,0.5), paint); body.position.y = -0.45; g.add(body); var cab = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.2,0.46), new THREE.MeshPhysicalMaterial({color:0x0C1116, roughness:0.08, clearcoat:1})); cab.position.set(-0.06,-0.24,0); g.add(cab);
      [[0.32,0.26],[0.32,-0.26],[-0.32,0.26],[-0.32,-0.26]].forEach(function(q){ var wh = new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.11,0.08,16), new THREE.MeshStandardMaterial({color:0x111214})); wh.rotation.x = Math.PI/2; wh.position.set(q[0],-0.56,q[1]); g.add(wh); });
      var gantry = new THREE.Group(); g.add(gantry); [-0.42,0.42].forEach(function(z){ var post = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.95,0.06), new THREE.MeshStandardMaterial({color:0x2C313A, metalness:0.5, roughness:0.4})); post.position.set(0,-0.2,z); gantry.add(post); }); var beam = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.08,0.92), new THREE.MeshBasicMaterial({color:C.orange})); beam.position.y = 0.28; gantry.add(beam);
      var drops = []; for (var i=0;i<14;i++){ var d = new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.006,0.1,4), new THREE.MeshBasicMaterial({color:0x7FC4E8})); d.userData.o = Math.random(); d.userData.z = (Math.random()-0.5)*0.8; gantry.add(d); drops.push(d); }
      return function(t,a){ gantry.position.x = Math.sin(t*0.9)*0.6; drops.forEach(function(d){ var ph = ((t*1.4)+d.userData.o)%1; d.position.set(0, 0.22 - ph*0.65, d.userData.z); }); }; }
  };

  // ---------- layout along the corridor ----------
  var SP = 7.5, objs = [];
  sections.forEach(function(s, i){
    var key = s.getAttribute('data-obj'), z = -i*SP;
    if (key && B[key]){ var g = new THREE.Group(); g.position.set(0, 0, z); scene.add(g); var tick = B[key](g); objs.push({g:g, tick:tick, i:i}); }
    if (s.classList.contains('chapter')){ var gate = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.02, 8, 160), new THREE.MeshBasicMaterial({color:C.orange, transparent:true, opacity:0.6})); gate.position.set(0, 0.3, z); scene.add(gate); objs.push({g:gate, tick:function(t){ gate.rotation.z = t*0.1; }, i:i, gate:true}); }
  });
  // dust along the corridor
  (function(){ var n = 1600, g = new THREE.BufferGeometry(), a = new Float32Array(n*3); for (var i=0;i<n;i++){ a[i*3]=(Math.random()-0.5)*18; a[i*3+1]=(Math.random()-0.5)*10; a[i*3+2]= 8 - Math.random()*(SP*(LAST+2)); } g.setAttribute('position', new THREE.BufferAttribute(a,3)); scene.add(new THREE.Points(g, new THREE.PointsMaterial({color:0xFFFAF0, size:0.035, transparent:true, opacity:0.45}))); })();
  // floor lines (speed lines) for motion feeling
  (function(){ var pts = []; for (var i=0;i<60;i++){ var z = 6 - i*SP*(LAST+1)/60; pts.push(new THREE.Vector3(-6,-1.6,z), new THREE.Vector3(6,-1.6,z)); } var l = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color:0x2A3340, transparent:true, opacity:0.5})); scene.add(l); })();

  // star guide
  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var star = new THREE.Group(); scene.add(star);
  star.add(new THREE.Sprite(new THREE.SpriteMaterial({map:tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.7)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); }), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})));
  star.children[0].scale.set(1.3,1.3,1);
  var spark = new THREE.Sprite(new THREE.SpriteMaterial({map:tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); }), transparent:true, depthWrite:false})); spark.scale.set(0.34,0.34,1); star.add(spark);
  var starLight = new THREE.PointLight(0xF47A2A, 1.4, 5); star.add(starLight);

  var layout = {ox:2.3, oy:0.1, cx:-0.4, back:5.2};
  function resize(){
    var ww=innerWidth, hh=innerHeight; renderer.setSize(ww,hh,false); camera.aspect=ww/hh; camera.updateProjectionMatrix();
    if (ww/hh > 1.1){ layout.ox=2.3; layout.oy=0.1; layout.cx=-0.4; layout.back=5.2; } else { layout.ox=0; layout.oy=1.35; layout.cx=0; layout.back=6.8; }
    objs.forEach(function(o){ if (!o.gate){ o.g.position.x = layout.ox; o.g.position.y = layout.oy; } else { o.g.position.x = layout.ox*0.5; } });
  }
  addEventListener('resize', resize); resize();
  function w(c,k){ return Math.max(0, 1-Math.abs(c-k)); }
  var current = scrollStage(), clock = new THREE.Clock(), look = new THREE.Vector3();

  function frame(){
    var t = reduce ? 0 : clock.getElapsedTime();
    current += (scrollStage() - current) * (reduce ? 1 : 0.055);
    ui(current);
    var c = current, z = -c*SP;
    var sway = reduce ? 0 : Math.sin(t*0.25)*0.18;
    camera.position.set(layout.cx + sway, 0.55 + (reduce?0:Math.sin(t*0.2)*0.08), z + layout.back);
    look.set(layout.ox*0.55, layout.oy*0.7, z - 1.5);
    camera.lookAt(look);
    objs.forEach(function(o){
      var a = w(c, o.i);
      if (!o.gate){ var s = 0.75 + 0.35*a; o.g.scale.setScalar(s); o.g.rotation.y += reduce ? 0 : 0.002; }
      o.tick(t, a);
    });
    // star flies just ahead to the current object
    var tgtX = layout.ox + 0.9, tgtY = layout.oy + 1.0, tgtZ = z + 0.2;
    star.position.set(star.position.x + (tgtX - star.position.x)*0.08, star.position.y + (tgtY + Math.sin(t*1.3)*0.06 - star.position.y)*0.08, star.position.z + (tgtZ - star.position.z)*0.08);
    spark.material.rotation = t*0.3;
    renderer.render(scene, camera);
    if (!reduce && !tabHidden) requestAnimationFrame(frame);
  }
  // Pause the loop while the tab is hidden
  var tabHidden = false;
  document.addEventListener('visibilitychange', function(){ var was = tabHidden; tabHidden = document.hidden; if (was && !tabHidden && !reduce) requestAnimationFrame(frame); });
  if (reduce){ addEventListener('scroll',function(){requestAnimationFrame(frame);},{passive:true}); addEventListener('resize',function(){requestAnimationFrame(frame);}); }
  requestAnimationFrame(frame);
})();
