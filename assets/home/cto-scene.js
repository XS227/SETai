// /services/cto-oslo/: scroll-driven 3D scene, one picture per CTO responsibility
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('scene');
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-stage]'));
  var LAST = sections.length - 1;
  var bar = document.querySelector('.progress'), now = document.querySelector('.chapter-now'), lastCh = '';
  function scrollStage(){
    var mid = scrollY + innerHeight*0.5, st = 0;
    for (var i=0;i<sections.length;i++){ var top=sections[i].offsetTop, h=sections[i].offsetHeight; if (mid>=top){ var f=(mid-top)/h; st = i + Math.min(1, Math.max(0,(f-0.6)/0.4)); } }
    return Math.min(LAST, st);
  }
  function ui(st){
    var max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (max>0 ? Math.min(1, scrollY/max) : 0) + ')';
    var ch = sections[Math.round(st)].getAttribute('data-chapter') || '';
    if (ch !== lastCh){ lastCh = ch; now.textContent = ch; }
  }
  if (typeof THREE === 'undefined'){ canvas.style.display='none'; addEventListener('scroll',function(){ui(scrollStage());},{passive:true}); return; }
  var renderer;
  try { renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true}); } catch(e){ canvas.style.display='none'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2));
  renderer.setClearColor(0x10100F, 1);
  var scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x10100F, 15, 30);
  var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xffffff, 0.36));
  var key = new THREE.DirectionalLight(0xFFFAF0, 0.9); key.position.set(-4,6,7); scene.add(key);
  var rim = new THREE.DirectionalLight(0x5C84AE, 0.8); rim.position.set(5,2,-6); scene.add(rim);
  var root = new THREE.Group(); scene.add(root);
  (function(){
    var g = new THREE.BufferGeometry(), n = 480, a = new Float32Array(n*3);
    for (var i=0;i<n;i++){ a[i*3]=(Math.random()-.5)*22; a[i*3+1]=(Math.random()-.5)*14; a[i*3+2]=-3-Math.random()*9; }
    g.setAttribute('position', new THREE.BufferAttribute(a,3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({color:0xFFFAF0, size:0.035, transparent:true, opacity:0.3})));
  })();

  var C = {cream:0xFFFAF0, orange:0xF47A2A, dark:0x1B1C1E};
  function mkGroup(){ var g = new THREE.Group(); g.userData.mats = []; root.add(g); return g; }
  function track(g, mat, base){ mat.transparent = true; mat.userData = {base:base}; g.userData.mats.push(mat); return mat; }
  function solid(g, geo, edgeColor, edgeOp){
    var m = new THREE.Mesh(geo, track(g, new THREE.MeshStandardMaterial({color:C.dark, metalness:0.45, roughness:0.4}), 1));
    var e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), track(g, new THREE.LineBasicMaterial({color:edgeColor||C.cream}), edgeOp||0.6));
    m.add(e); m.userData.edge = e; g.add(m); return m;
  }
  function dot(g, r, color, op){ var m = new THREE.Mesh(new THREE.SphereGeometry(r,10,10), track(g, new THREE.MeshBasicMaterial({color:color, depthWrite:false}), op==null?1:op)); g.add(m); return m; }
  function segs(g, color, op, n){ var geo = new THREE.BufferGeometry(); var arr = new Float32Array(n*6); geo.setAttribute('position', new THREE.BufferAttribute(arr,3)); var l = new THREE.LineSegments(geo, track(g, new THREE.LineBasicMaterial({color:color}), op)); g.add(l); return {l:l, arr:arr, geo:geo}; }
  function ring(g, r, color, op, arc){ var m = new THREE.Mesh(new THREE.TorusGeometry(r,0.014,6,96,arc||Math.PI*2), track(g, new THREE.MeshBasicMaterial({color:color}), op)); g.add(m); return m; }
  function label(g, txt, op, sx){
    var c=document.createElement('canvas'); c.width=512; c.height=96;
    var x=c.getContext('2d');
    function draw(){ x.clearRect(0,0,512,96); x.fillStyle='#FFFAF0'; x.font='500 38px "Space Grotesk", Inter, system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,256,48); }
    draw();
    var map = new THREE.CanvasTexture(c);
    // Redraw once the webfont is in, otherwise the label keeps the fallback font
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ draw(); map.needsUpdate = true; });
    var s = new THREE.Sprite(track(g, new THREE.SpriteMaterial({map:map, depthWrite:false}), op||0.9)); s.scale.set(sx||1.4,(sx||1.4)*0.19,1); g.add(s); return s;
  }
  function setGroup(g, wgt){ g.visible = wgt > 0.01; g.scale.setScalar(0.78 + 0.22*wgt); g.userData.mats.forEach(function(m){ m.opacity = m.userData.base * wgt; }); }
  function w(st,k){ return Math.max(0, 1-Math.abs(st-k)); }
  function setEdge(m, hex){ m.userData.edge.material.color.setHex(hex); }

  // MAP (0, 10): business / technology / infrastructure layers
  var map = mkGroup(), LY = [1.35, 0, -1.35], LN = ['Forretning','Teknologi','Infrastruktur'], layerNodes = [];
  LY.forEach(function(y,k){
    var plane = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.6,0.01,2.0)), track(map, new THREE.LineBasicMaterial({color:k===0?C.orange:C.cream}), k===0?0.6:0.35)); plane.position.y = y; map.add(plane);
    var l = label(map, LN[k], 0.9); l.position.set(-2.35, y, 0.9);
    var nodes = []; for (var i=0;i<5;i++){ var d = dot(map, 0.06, k===0 ? C.orange : C.cream, 0.95); d.position.set(-1.4 + i*0.7, y+0.04, Math.sin(i*1.7+k)*0.6); nodes.push(d); } layerNodes.push(nodes);
  });
  var mapLinks = segs(map, C.cream, 0.28, 10);
  (function(){ var k=0; for (var L=0;L<2;L++){ for (var i=0;i<5;i++){ var A=layerNodes[L][i].position, B=layerNodes[L+1][(i+L+1)%5].position; mapLinks.arr.set([A.x,A.y,A.z,B.x,B.y,B.z], k*6); k++; } } })();
  var mapPulses = []; for (var i=0;i<8;i++){ mapPulses.push({m:dot(map, 0.045, C.orange, 1), k:i%10, f:i/8}); }

  // WHO (1): three pedestals
  var who = mkGroup(), PX = [-1.6, 0, 1.6];
  PX.forEach(function(x){ var p = solid(who, new THREE.CylinderGeometry(0.45,0.5,0.25,24)); p.position.set(x,-1.0,0); });
  var emptySeat = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.55,0.75,0.55)), track(who, new THREE.LineDashedMaterial({color:C.cream, dashSize:0.06, gapSize:0.05}), 0.7)); emptySeat.computeLineDistances(); emptySeat.position.set(-1.6,-0.4,0); who.add(emptySeat);
  var knot = solid(who, new THREE.TorusKnotGeometry(0.26,0.07,64,8,3,5)); knot.position.set(0,-0.3,0);
  var vault = solid(who, new THREE.BoxGeometry(0.6,0.6,0.6), C.orange, 0.85); vault.position.set(1.6,-0.4,0);
  var band = ring(who, 0.42, C.orange, 0.8); band.position.set(1.6,-0.4,0);
  [['Ingen CTO',-1.6],['Teknisk gjeld',0],['Investering',1.6]].forEach(function(t){ var l = label(who, t[0]); l.position.set(t[1],-1.45,0.5); });

  // AUDIT (2): architecture blocks + scan + priority bars
  var audit = mkGroup(), blocks = [], DEBT = {1:2, 4:1, 6:0};
  for (i=0;i<9;i++){ var b = solid(audit, new THREE.BoxGeometry(0.55,0.4,0.55)); b.position.set(((i%3)-1)*0.75 - 0.6, Math.floor(i/3)*0.5 - 0.9, 0); blocks.push(b); }
  var scan = new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.0), track(audit, new THREE.MeshBasicMaterial({color:C.orange, side:THREE.DoubleSide, depthWrite:false}), 0.12)); scan.rotation.x = -Math.PI/2; audit.add(scan);
  var scanE = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(2.6,1.0)), track(audit, new THREE.LineBasicMaterial({color:C.orange}), 0.8)); scan.add(scanE);
  var prioBars = [1.3, 0.85, 0.45].map(function(len,k){ var m = solid(audit, new THREE.BoxGeometry(len,0.16,0.16), k===0 ? C.orange : C.cream, k===0?0.95:0.5); m.position.set(1.15 + len/2, 0.55 - k*0.45, 0); return m; });
  [['Haster',0.55],['Neste',0.1],['Kan vente',-0.35]].forEach(function(t){ var l = label(audit, t[0], 0.85, 1.1); l.position.set(1.7, t[1]+0.2, 0.3); });

  // ROAD (3): road + milestones + goals
  var road = mkGroup();
  var roadCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-2.2,-1.2,0.6), new THREE.Vector3(-0.8,-0.9,0), new THREE.Vector3(0.6,-0.6,0.4), new THREE.Vector3(2.0,-0.2,-0.2)]);
  var roadLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(roadCurve.getPoints(60)), track(road, new THREE.LineBasicMaterial({color:C.cream}), 0.6)); road.add(roadLine);
  var MS = [0.08, 0.38, 0.68, 0.98], msObjs = MS.map(function(f,k){ var p = roadCurve.getPoint(f); var h = 0.3 + k*0.25; var m = solid(road, new THREE.BoxGeometry(0.18,h,0.18), k===3 ? C.orange : C.cream); m.position.set(p.x, p.y + h/2, p.z); return {m:m, p:p, h:h}; });
  var goalLinks = segs(road, C.orange, 0.4, 4);
  var goals = msObjs.map(function(o,k){ var g = solid(road, new THREE.OctahedronGeometry(0.1,0), C.orange, 0.9); g.position.set(o.p.x, 1.3, o.p.z); goalLinks.arr.set([o.p.x, o.p.y+o.h, o.p.z, o.p.x, 1.3, o.p.z], k*6); return g; });
  var gl1 = label(road, 'Forretningsmål', 0.9); gl1.position.set(-0.1,1.7,0.2);
  ['Nå','Neste','Senere','Mål'].forEach(function(t,k){ var o = msObjs[k]; var l = label(road, t, 0.85, 0.9); l.position.set(o.p.x, o.p.y - 0.25, o.p.z+0.3); });
  var traveler = dot(road, 0.07, C.orange, 1);

  // ARCH (4): base platform + modules snapping in
  var arch = mkGroup();
  var base = solid(arch, new THREE.BoxGeometry(3.0,0.14,1.6)); base.position.y = -0.9;
  var SLOTS = [[-1.0,-0.45],[0,-0.45],[1.0,-0.45],[-0.5,0.15],[0.5,0.15],[0,0.75]];
  var mods = SLOTS.map(function(s,k){ return solid(arch, new THREE.BoxGeometry(0.8,0.5,0.8), k===5 ? C.orange : C.cream); });
  var bl = label(arch, 'Bygg det unike', 0.85, 1.2); bl.position.set(0,1.35,0.3);
  var kl = label(arch, 'Kjøp resten', 0.75, 1.1); kl.position.set(0,-1.3,0.6);

  // SECURITY (5)
  var sec = mkGroup();
  var sCore = solid(sec, new THREE.BoxGeometry(0.7,0.7,0.7), C.orange, 0.9);
  var shields = [1.0, 1.3, 1.6].map(function(r,k){ return ring(sec, r, k===0 ? C.orange : C.cream, k===0 ? 0.8 : 0.45); });
  var keyTok = solid(sec, new THREE.BoxGeometry(0.22,0.1,0.04), C.orange, 1);
  var sl = label(sec, 'Lag på lag', 0.85); sl.position.set(0,-1.9,0.3);

  // TEAM (6)
  var team = mkGroup();
  var lead = solid(team, new THREE.OctahedronGeometry(0.32,0), C.orange, 0.95);
  var devs = []; for (i=0;i<6;i++){ var a = i/6*Math.PI*2; var d = solid(team, new THREE.BoxGeometry(0.28,0.28,0.28)); d.position.set(Math.cos(a)*1.5, Math.sin(a)*0.9, Math.sin(a)*0.5); devs.push(d); }
  var sprint = ring(team, 1.9, C.orange, 0.5, Math.PI*1.7);
  var tLinks = segs(team, C.cream, 0.25, 6); devs.forEach(function(d,k){ var p=d.position; tLinks.arr.set([0,0,0,p.x,p.y,p.z], k*6); });
  var reviews = []; for (i=0;i<6;i++){ reviews.push(dot(team, 0.05, C.orange, 1)); }
  var tl = label(team, 'Sprintrytme', 0.85, 1.2); tl.position.set(0,-1.5,0.5);

  // SCALE (7)
  var scl = mkGroup();
  var lb = solid(scl, new THREE.CylinderGeometry(0.5,0.5,0.12,6), C.orange, 0.9); lb.position.set(0,1.2,0);
  var lbl = label(scl, 'Lastfordeling', 0.85, 1.2); lbl.position.set(0,1.65,0.2);
  var inst = []; for (i=0;i<8;i++){ inst.push(solid(scl, new THREE.BoxGeometry(0.42,0.6,0.42))); }
  var sLinks = segs(scl, C.cream, 0.3, 8);

  // DUE DILIGENCE (8)
  var dd = mkGroup();
  var docs = []; for (i=0;i<6;i++){ var d = solid(dd, new THREE.BoxGeometry(1.5,0.08,1.05)); d.position.set(0, -1.1 + i*0.2, 0); d.rotation.y = (i%2?0.06:-0.06); docs.push(d); }
  var ticks = []; for (i=0;i<6;i++){ var t = solid(dd, new THREE.BoxGeometry(0.16,0.16,0.04), C.orange, 1); t.position.set(1.05, -1.1 + i*0.2, 0.4); ticks.push(t); }
  var ddl = label(dd, 'Datarom', 0.9); ddl.position.set(0,0.55,0.3);
  var eye = ring(dd, 0.4, C.orange, 0.7); eye.position.set(-1.6,0.6,0);

  // BACKGROUND (9): timeline pillars
  var bg = mkGroup(), BGN = ['IT og drift','Sikkerhet','SETAEI','SaaS','AI'];
  var pillars = BGN.map(function(n,k){ var h = 0.5 + k*0.42; var m = solid(bg, new THREE.BoxGeometry(0.42,h,0.42), k===4 ? C.orange : C.cream); m.position.set(-1.7 + k*0.85, -1.4 + h/2, 0); var l = label(bg, n, 0.85, 1.0); l.position.set(m.position.x, -1.65, 0.4); return {m:m, h:h}; });
  var bgLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pillars.map(function(p){ return new THREE.Vector3(p.m.position.x, -1.4 + p.h + 0.12, 0); })), track(bg, new THREE.LineDashedMaterial({color:C.orange, dashSize:0.08, gapSize:0.06}), 0.7)); bgLine.computeLineDistances(); bg.add(bgLine);

  // star
  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var glowT = tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.75)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); });
  var sparkT = tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); });
  var star = new THREE.Group(); root.add(star);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); glow.scale.set(2.0,2.0,1); star.add(glow);
  var spark = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkT, transparent:true, depthWrite:false})); spark.scale.set(0.45,0.45,1); star.add(spark);
  star.add(new THREE.PointLight(0xF47A2A, 1.8, 6));

  var travelPos = new THREE.Vector3();
  function starPos(s){
    switch(s){
      case 0: case 10: return [0, 2.0, 0.4];
      case 1: return [-1.6, 0.35, 0.4];
      case 2: return [1.15, 0.9, 0.4];
      case 3: return [travelPos.x, travelPos.y + 0.3, travelPos.z + 0.2];
      case 4: return [0, 1.2, 0.5];
      case 5: return [0, 0, 0.75];
      case 6: return [0, 0.55, 0.4];
      case 7: return [0, 1.6, 0.4];
      case 8: return [1.05, 0.35, 0.5];
      default: return [1.7, 1.15, 0.3];
    }
  }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function ease(t){ return t*t*(3-2*t); }

  var current = scrollStage(), clock = new THREE.Clock();
  var layout = {x:2.5, y:0, z:11.5};
  function resize(){
    var ww=innerWidth, hh=innerHeight; renderer.setSize(ww,hh,false); camera.aspect=ww/hh; camera.updateProjectionMatrix();
    if (ww/hh > 1.1){ layout.x=2.5; layout.y=0; layout.z=11.5; } else { layout.x=0; layout.y=2.0; layout.z=16.5; }
  }
  addEventListener('resize', resize); resize();

  function frame(){
    var time = reduce ? 0 : clock.getElapsedTime();
    current += (scrollStage() - current) * (reduce ? 1 : 0.065);
    ui(current);
    var a=Math.floor(current), b=Math.min(a+1,LAST), t=ease(current-a);
    if (a>=LAST){ a=LAST; b=LAST; t=0; }
    camera.position.set(0, 1.3, layout.z); camera.lookAt(0, 0.1, 0);
    root.position.set(layout.x, layout.y, 0);
    root.rotation.y = -0.3 + Math.sin(time*0.18)*0.07;

    // map
    var wM = Math.max(w(current,0), w(current,10)); setGroup(map, wM);
    if (wM>0.01){ mapPulses.forEach(function(p){ p.f += reduce ? 0 : 0.01; if (p.f>1){ p.f = 0; p.k = (p.k+3)%10; } var o = p.k*6, A = new THREE.Vector3(mapLinks.arr[o],mapLinks.arr[o+1],mapLinks.arr[o+2]), B = new THREE.Vector3(mapLinks.arr[o+3],mapLinks.arr[o+4],mapLinks.arr[o+5]); p.m.position.copy(B).lerp(A, p.f); }); }

    // who
    var w1 = w(current,1); setGroup(who, w1);
    if (w1>0.01){ knot.rotation.y = time*0.6; knot.rotation.x = time*0.3; vault.rotation.y = time*0.4; band.rotation.x = Math.PI/2; band.rotation.z = time*0.5; emptySeat.rotation.y = time*0.3; }

    // audit
    var w2 = w(current,2); setGroup(audit, w2);
    if (w2>0.01){
      var sy = -1.1 + ((time*0.35)%1)*1.6; scan.position.set(-0.6, sy, 0);
      blocks.forEach(function(bk,i){ var seen = bk.position.y < sy + 0.2; var debt = DEBT[i]; setEdge(bk, (debt!==undefined && seen) ? C.orange : C.cream); });
    }

    // road
    var w3 = w(current,3); setGroup(road, w3);
    if (w3>0.01){
      var rf = (time*0.09) % 1; travelPos.copy(roadCurve.getPoint(rf)); traveler.position.copy(travelPos);
      msObjs.forEach(function(o,k){ setEdge(o.m, rf >= MS[k]-0.02 ? C.orange : C.cream); });
      goals.forEach(function(g,k){ g.rotation.y = time*0.8+k; });
    }

    // arch
    var w4 = w(current,4); setGroup(arch, w4);
    if (w4>0.01){
      var cyc = (time*0.35) % 1.3;
      mods.forEach(function(m,k){ var start = k*0.14, f = Math.max(0, Math.min(1, (cyc - start)/0.25)); var fe = ease(f); var s = SLOTS[k]; m.position.set(s[0], s[1] + (1-fe)*2.4, (1-fe)*0.8); m.scale.set(1, k>=3 ? (k===5?0.8:0.9) : 1, 1); });
    }

    // security
    var w5 = w(current,5); setGroup(sec, w5);
    if (w5>0.01){
      sCore.rotation.y = time*0.4;
      shields[0].rotation.set(time*0.5, 0.3, 0); shields[1].rotation.set(0.6, time*0.4, 0); shields[2].rotation.set(Math.PI/2, 0, time*0.3);
      var ka = time*0.9; keyTok.position.set(Math.cos(ka)*1.15, Math.sin(ka)*0.5, Math.sin(ka)*0.9); keyTok.rotation.z = ka;
    }

    // team
    var w6 = w(current,6); setGroup(team, w6);
    if (w6>0.01){
      lead.rotation.y = time*0.6; sprint.rotation.z = -time*0.4; sprint.rotation.x = 0.25;
      reviews.forEach(function(r,k){ var f = ((time*0.5) + k/6) % 1, p = devs[k].position, out = f<0.5 ? f*2 : (1-f)*2; r.position.set(p.x*(1-out), p.y*(1-out), p.z*(1-out)); });
      devs.forEach(function(d,k){ d.rotation.y = time*0.5+k; });
    }

    // scale
    var w7 = w(current,7); setGroup(scl, w7);
    if (w7>0.01){
      var count = 2 + Math.floor(((time*0.35) % 1) * 7); if (reduce) count = 8;
      inst.forEach(function(m,k){ var on = k < count; var x = (k - (count-1)/2) * 0.62; var tx = on ? x : 0; m.position.x += (tx - m.position.x)*0.1; m.position.y = -0.6; m.scale.setScalar(on ? 1 : 0.001); setEdge(m, k===count-1 ? C.orange : C.cream); var o=k*6; sLinks.arr.set([0,1.14,0, m.position.x, -0.3, 0], o); if (!on) sLinks.arr.set([0,1.14,0,0,1.14,0], o); });
      sLinks.geo.attributes.position.needsUpdate = true; lb.rotation.y = time*0.5;
    }

    // due diligence
    var w8 = w(current,8); setGroup(dd, w8);
    if (w8>0.01){
      var done = Math.floor((time*0.8) % 8); if (reduce) done = 6;
      ticks.forEach(function(tk,k){ var on = k < done; tk.scale.setScalar(on ? 1 : 0.001); });
      eye.rotation.y = time*0.6;
    }

    // background
    var w9 = w(current,9); setGroup(bg, w9);
    if (w9>0.01){ pillars.forEach(function(p,k){ p.m.rotation.y = Math.sin(time*0.5+k)*0.2; }); }

    var SA=starPos(a), SB=starPos(b);
    star.position.set(lerp(SA[0],SB[0],t), lerp(SA[1],SB[1],t)+Math.sin(time*1.2)*0.04, lerp(SA[2],SB[2],t));
    spark.material.rotation = time*0.3;
    renderer.render(scene, camera);
    if (!reduce && !tabHidden) requestAnimationFrame(frame);
  }
  // Pause the loop while the tab is hidden
  var tabHidden = false;
  document.addEventListener('visibilitychange', function(){ var was = tabHidden; tabHidden = document.hidden; if (was && !tabHidden && !reduce) requestAnimationFrame(frame); });
  if (reduce){ addEventListener('scroll',function(){requestAnimationFrame(frame);},{passive:true}); addEventListener('resize',function(){requestAnimationFrame(frame);}); }
  requestAnimationFrame(frame);
})();
