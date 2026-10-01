// /services/ai-ekspert-oslo/: multi-agent demo + scroll-driven 3D scene, one picture per section
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ---------- multi-agent demo ----------
  var demoStep = -1;
  var STEPS = [
    ['Datalag','Ny henvendelse registrert fra nettskjema.'],
    ['Lead-agent','Henter firmainformasjon og strukturerer leadet.'],
    ['Scoring-agent','Vurderer behov og kjøpsvilje: høy prioritet.'],
    ['Koordinator','Velger neste handling: personlig svar i dag.'],
    ['Kontakt-agent','Utkast til svar laget, sendt til godkjenning.'],
    ['Beslutning','Godkjent og sendt. Resultatet er registrert.']
  ];
  var agentEls = Array.prototype.slice.call(document.querySelectorAll('#agents li'));
  var log = document.getElementById('log'), runBtn = document.getElementById('run');
  function mark(i){ agentEls.forEach(function(el,k){ el.className = k<i ? 'done' : (k===i ? 'now' : ''); }); }
  function addLog(i){ var li = document.createElement('li'); li.innerHTML = '<b>' + STEPS[i][0] + '</b> ' + STEPS[i][1]; log.appendChild(li); }
  runBtn.addEventListener('click', function(){
    log.innerHTML = ''; runBtn.disabled = true; runBtn.textContent = 'Kjører…';
    if (reduce){ STEPS.forEach(function(s,i){ addLog(i); }); demoStep = 5; mark(6); runBtn.disabled=false; runBtn.textContent='Kjør igjen'; return; }
    var i = 0;
    (function next(){
      demoStep = i; mark(i); addLog(i);
      i++;
      if (i < STEPS.length) setTimeout(next, 1100);
      else setTimeout(function(){ mark(6); demoStep = 6; runBtn.disabled=false; runBtn.textContent='Kjør igjen'; }, 1100);
    })();
  });

  // ---------- scroll + UI ----------
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
  function label(g, txt, op){
    var c=document.createElement('canvas'); c.width=512; c.height=96;
    var x=c.getContext('2d');
    function draw(){ x.clearRect(0,0,512,96); x.fillStyle='#FFFAF0'; x.font='500 38px "Space Grotesk", Inter, system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,256,48); }
    draw();
    var map = new THREE.CanvasTexture(c);
    // Redraw once the webfont is in, otherwise the label keeps the fallback font
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ draw(); map.needsUpdate = true; });
    var s = new THREE.Sprite(track(g, new THREE.SpriteMaterial({map:map, depthWrite:false}), op||0.9)); s.scale.set(1.4,0.26,1); g.add(s); return s;
  }
  function setGroup(g, wgt){ g.visible = wgt > 0.01; g.scale.setScalar(0.75 + 0.25*wgt); g.userData.mats.forEach(function(m){ m.opacity = m.userData.base * wgt; }); }
  function w(st,k){ return Math.max(0, 1-Math.abs(st-k)); }
  function setEdge(m, hex, op){ m.userData.edge.material.color.setHex(hex); if (op!=null) m.userData.edge.material.userData.base = op; }

  // G0 brain (0, 11)
  var brain = mkGroup(), BN = 80, bPos = [];
  for (var i=0;i<BN;i++){ var y = 1 - (i/(BN-1))*2, r = Math.sqrt(1-y*y), th = i*2.39996; bPos.push(new THREE.Vector3(Math.cos(th)*r*1.7, y*1.35, Math.sin(th)*r*1.45)); }
  var bDots = bPos.map(function(p,i){ var d = dot(brain, 0.035, i%7===0 ? C.orange : C.cream, 0.9); d.position.copy(p); return d; });
  var bPairs = []; for (i=0;i<BN;i++){ var best=[]; for (var j=0;j<BN;j++){ if (j!==i) best.push([bPos[i].distanceTo(bPos[j]), j]); } best.sort(function(a,b){return a[0]-b[0];}); for (var k=0;k<3;k++){ if (best[k][1] > i) bPairs.push([i,best[k][1]]); } }
  var bLines = segs(brain, C.cream, 0.18, bPairs.length);
  bPairs.forEach(function(p,k){ var A=bPos[p[0]], B=bPos[p[1]]; bLines.arr.set([A.x,A.y,A.z,B.x,B.y,B.z], k*6); });
  var pulses = []; for (i=0;i<14;i++){ pulses.push({m:dot(brain, 0.045, C.orange, 1), pair:Math.floor(Math.random()*bPairs.length), f:Math.random()}); }

  // G1 levels (1)
  var levels = mkGroup();
  var lvCore = solid(levels, new THREE.IcosahedronGeometry(0.28,1), C.orange, 0.9);
  var rings = [0.7,1.15,1.6,2.05].map(function(r,k){ var m = new THREE.Mesh(new THREE.TorusGeometry(r,0.012,6,96), track(levels, new THREE.MeshBasicMaterial({color:C.cream}), 0.6)); m.rotation.x = Math.PI/2.3; levels.add(m); return m; });
  ['Modell','Kunnskap','Agenter','Multi-agent'].forEach(function(t,k){ var l = label(levels, (k+1)+' · '+t); l.position.set([0.7,1.15,1.6,2.05][k]+0.2, -0.05 - k*0.02, 0.5); });

  // G2 prompt (2)
  var prompt = mkGroup();
  var pCore = solid(prompt, new THREE.OctahedronGeometry(0.42,0), C.orange, 0.9);
  var inTok = [], outTok = [];
  for (i=0;i<10;i++){ inTok.push(dot(prompt, 0.05, C.cream, 0.8)); }
  for (i=0;i<5;i++){ var ob = solid(prompt, new THREE.BoxGeometry(0.5,0.12,0.05), C.orange, 0.85); ob.position.set(1.7, 0.6 - i*0.3, 0); outTok.push(ob); }
  var pl1 = label(prompt, 'Fritekst inn'); pl1.position.set(-1.8,-1.0,0.3);
  var pl2 = label(prompt, 'Strukturert ut'); pl2.position.set(1.7,-1.0,0.3);

  // G3 knowledge (3)
  var know = mkGroup();
  var docs = []; for (i=0;i<4;i++){ var d = solid(know, new THREE.BoxGeometry(0.5,0.68,0.03)); d.position.set(-2.0+i*0.12, 0.4-i*0.12, -i*0.15); d.rotation.y = 0.3; docs.push(d); }
  var kl1 = label(know, 'Dokumenter'); kl1.position.set(-1.8,-0.55,0.3);
  var VN = 42, vPos = [];
  for (i=0;i<VN;i++){ vPos.push(new THREE.Vector3(0.4 + Math.random()*2.0, -1.0 + Math.random()*2.1, -0.6 + Math.random()*1.2)); }
  var vDots = vPos.map(function(p){ var d = dot(know, 0.04, C.cream, 0.8); d.position.copy(p); return d; });
  var kl2 = label(know, 'Søk etter mening'); kl2.position.set(1.4,-1.35,0.3);
  var qLines = segs(know, C.orange, 0.7, 4);
  var kCore = solid(know, new THREE.IcosahedronGeometry(0.2,1), C.orange, 0.9); kCore.position.set(-0.6, 1.25, 0);
  var aLines = segs(know, C.orange, 0.45, 4);

  // G4 agent (4)
  var agent = mkGroup();
  var aCore = solid(agent, new THREE.IcosahedronGeometry(0.38,1), C.orange, 0.9);
  var TOOLS = [['CRM',[0,1.45,0]],['E-post',[1.7,0,0]],['Database',[0,-1.45,0]],['Nettside',[-1.7,0,0]]];
  var toolObjs = TOOLS.map(function(t){ var m = solid(agent, new THREE.BoxGeometry(0.42,0.42,0.42)); m.position.set(t[1][0],t[1][1],t[1][2]); var l = label(agent, t[0]); l.position.set(t[1][0], t[1][1]-0.42, 0.3); return m; });
  var aRing = new THREE.Mesh(new THREE.TorusGeometry(0.75,0.012,6,80), track(agent, new THREE.MeshBasicMaterial({color:C.orange}), 0.6)); agent.add(aRing);
  var aPulse = dot(agent, 0.07, C.orange, 1);
  var aLinks = segs(agent, C.cream, 0.2, 4); TOOLS.forEach(function(t,k){ aLinks.arr.set([0,0,0,t[1][0],t[1][1],t[1][2]], k*6); });

  // G5 multi (5)
  var multi = mkGroup();
  var MA = []; for (i=0;i<6;i++){ var ang = Math.PI*(0.95 - i*0.18); MA.push(new THREE.Vector3(Math.cos(ang)*2.1, Math.sin(ang)*0.5 - 0.9, Math.sin(i)*0.2)); }
  var mObjs = MA.map(function(p,i){ var m = solid(multi, i===3 ? new THREE.OctahedronGeometry(0.3,0) : new THREE.BoxGeometry(0.34,0.34,0.34)); m.position.copy(p); return m; });
  var coord = solid(multi, new THREE.IcosahedronGeometry(0.34,1), C.orange, 0.9); coord.position.set(0,1.1,0);
  var cl = label(multi, 'Koordinator'); cl.position.set(0,1.62,0.2);
  var mLinks = segs(multi, C.cream, 0.25, 11);
  (function(){ var k=0; for (var i=0;i<5;i++){ mLinks.arr.set([MA[i].x,MA[i].y,MA[i].z,MA[i+1].x,MA[i+1].y,MA[i+1].z], k*6); k++; } for (i=0;i<6;i++){ mLinks.arr.set([0,1.1,0,MA[i].x,MA[i].y,MA[i].z], k*6); k++; } })();
  var lead = dot(multi, 0.08, C.orange, 1);
  var mlab = ['Data','Lead','Scoring','Koord.','Kontakt','Beslutning'].map(function(t,i){ var l = label(multi, t, 0.85); l.position.set(MA[i].x, MA[i].y-0.38, MA[i].z+0.2); return l; });

  // G6 production (6)
  var prod = mkGroup();
  var rail = new THREE.Mesh(new THREE.BoxGeometry(4.6,0.02,0.02), track(prod, new THREE.MeshBasicMaterial({color:C.cream}), 0.35)); rail.position.y = -0.3; prod.add(rail);
  var gateL = solid(prod, new THREE.BoxGeometry(0.06,1.0,0.5), C.orange, 0.9); gateL.position.set(0.8,0.2,0);
  var gateTop = solid(prod, new THREE.BoxGeometry(0.6,0.06,0.5), C.orange, 0.9); gateTop.position.set(1.1,0.72,0);
  var gateR = solid(prod, new THREE.BoxGeometry(0.06,1.0,0.5), C.orange, 0.9); gateR.position.set(1.4,0.2,0);
  var gl = label(prod, 'Godkjenning'); gl.position.set(1.1,1.0,0.2);
  var autoL = label(prod, 'Automatisk'); autoL.position.set(-1.3,0.5,0.2);
  var items = []; for (i=0;i<8;i++){ items.push(solid(prod, new THREE.BoxGeometry(0.2,0.2,0.2))); }
  var retryCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.4,-0.2,0), new THREE.Vector3(-1.2,-1.3,0), new THREE.Vector3(-2.0,-0.2,0));
  var retry = new THREE.Line(new THREE.BufferGeometry().setFromPoints(retryCurve.getPoints(24)), track(prod, new THREE.LineDashedMaterial({color:C.cream, dashSize:0.07, gapSize:0.06}), 0.4)); retry.computeLineDistances(); prod.add(retry);
  var rl = label(prod, 'Nytt forsøk ved feil'); rl.position.set(-1.2,-1.35,0.2);

  // G7 local (7)
  var local = mkGroup();
  var phone = solid(local, new THREE.BoxGeometry(0.95,1.8,0.1));
  var lCore = solid(local, new THREE.IcosahedronGeometry(0.24,1), C.orange, 0.9); lCore.position.z = 0.1;
  var shield = new THREE.Mesh(new THREE.TorusGeometry(1.35,0.015,6,96), track(local, new THREE.MeshBasicMaterial({color:C.orange}), 0.7)); local.add(shield);
  var cut = segs(local, C.cream, 0.35, 6);
  for (i=0;i<6;i++){ var an = i/6*Math.PI*2; cut.arr.set([Math.cos(an)*1.6, Math.sin(an)*1.6, 0, Math.cos(an)*2.3, Math.sin(an)*2.3, 0], i*6); }
  var ll = label(local, 'Offline · på enheten'); ll.position.set(0,-1.25,0.3);

  // G8 generative (8)
  var gen = mkGroup();
  var frames = []; for (i=0;i<7;i++){ var f = solid(gen, new THREE.BoxGeometry(0.8,0.46,0.03)); frames.push(f); }
  var genL = label(gen, 'Shot for shot'); genL.position.set(0,-1.2,0.4);

  // G9 guard (9)
  var guard = mkGroup();
  var gCore = solid(guard, new THREE.IcosahedronGeometry(0.4,1), C.orange, 0.9);
  var cage = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.6,1.6,1.6)), track(guard, new THREE.LineBasicMaterial({color:C.cream}), 0.5)); guard.add(cage);
  var gauge = new THREE.Mesh(new THREE.TorusGeometry(1.45,0.025,6,96,Math.PI*1.3), track(guard, new THREE.MeshBasicMaterial({color:C.orange}), 0.8)); guard.add(gauge);
  var gL = label(guard, 'Målt, begrenset, dokumentert'); gL.position.set(0,-1.35,0.4);

  // G10 process (10)
  var proc = mkGroup();
  var pBlocks = []; for (i=0;i<4;i++){ var h = 0.45 + i*0.4; var b = solid(proc, new THREE.BoxGeometry(0.55,h,0.55), i===3 ? C.orange : C.cream, i===3?0.9:0.6); b.position.set(-1.2 + i*0.8, -1.4 + h/2, 0); pBlocks.push(b); }
  ['Kartlegging','Pilot','Integrasjon','Drift'].forEach(function(t,i){ var l = label(proc, t); l.position.set(-1.2+i*0.8, -1.4 + 0.45 + i*0.4 + 0.25, 0.3); l.scale.set(1.1,0.2,1); });

  // star
  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var glowT = tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.75)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); });
  var sparkT = tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); });
  var star = new THREE.Group(); root.add(star);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); glow.scale.set(2.0,2.0,1); star.add(glow);
  var spark = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkT, transparent:true, depthWrite:false})); spark.scale.set(0.45,0.45,1); star.add(spark);
  star.add(new THREE.PointLight(0xF47A2A, 1.8, 6));

  var qPos = new THREE.Vector3(), leadPos = new THREE.Vector3();
  function starPos(s, time){
    switch(s){
      case 0: case 11: return [1.2, 1.7, 0.6];
      case 1: return [0, 0.55, 0.4];
      case 2: return [0, 0.85, 0.4];
      case 3: return [qPos.x, qPos.y, qPos.z];
      case 4: return [aPulse.position.x, aPulse.position.y+0.25, aPulse.position.z+0.2];
      case 5: return [leadPos.x, leadPos.y+0.35, leadPos.z+0.2];
      case 6: return [1.1, 1.35, 0.3];
      case 7: return [0.55, 0.8, 0.4];
      case 8: return [0, 0.7, 0.6];
      case 9: return [0, 0.85, 0.6];
      default: return [1.2, 0.9, 0.3];
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
    camera.position.set(0, 0.8, layout.z); camera.lookAt(0, 0.1, 0);
    root.position.set(layout.x, layout.y, 0);
    root.rotation.y = -0.2 + Math.sin(time*0.18)*0.06;

    // brain
    var wB = Math.max(w(current,0), w(current,11)); setGroup(brain, wB);
    if (wB>0.01){
      brain.rotation.y = time*0.12;
      pulses.forEach(function(p){ p.f += reduce ? 0 : 0.012; if (p.f>1){ p.f=0; p.pair = Math.floor(Math.random()*bPairs.length); } var pr = bPairs[p.pair]; p.m.position.copy(bPos[pr[0]]).lerp(bPos[pr[1]], p.f); });
    }
    // levels
    var w1 = w(current,1); setGroup(levels, w1);
    if (w1>0.01){ var hiR = Math.floor(time/1.6)%4; rings.forEach(function(r,k){ r.material.color.setHex(k===hiR ? C.orange : C.cream); r.rotation.z = time*0.1*(k+1); }); lvCore.rotation.y = time*0.5; }
    // prompt
    var w2 = w(current,2); setGroup(prompt, w2);
    if (w2>0.01){
      pCore.rotation.y = time*0.6;
      inTok.forEach(function(d,i){ var f = ((time*0.3) + i/10)%1; d.position.set(-2.4 + f*2.2, Math.sin(i*2.1+time)*0.6*(1-f), Math.cos(i*1.3)*0.3*(1-f)); });
      outTok.forEach(function(o,i){ var ph = ((time*0.5) - i*0.15) % 1; var s = Math.max(0.001, Math.min(1, ph*3)); o.scale.set(s,1,1); o.position.x = 1.45 + 0.25*s; });
    }
    // knowledge
    var w3 = w(current,3); setGroup(know, w3);
    if (w3>0.01){
      var qa = time*0.5; qPos.set(1.4 + Math.cos(qa)*0.7, Math.sin(qa*1.3)*0.7, Math.sin(qa)*0.3);
      var dists = vPos.map(function(p,i){ return [p.distanceTo(qPos), i]; }).sort(function(x,y){ return x[0]-y[0]; }).slice(0,4);
      vDots.forEach(function(d){ d.material.color.setHex(C.cream); });
      dists.forEach(function(dd,k){ var p = vPos[dd[1]]; vDots[dd[1]].material.color.setHex(C.orange); qLines.arr.set([qPos.x,qPos.y,qPos.z,p.x,p.y,p.z], k*6); aLines.arr.set([p.x,p.y,p.z,-0.6,1.25,0], k*6); });
      qLines.geo.attributes.position.needsUpdate = true; aLines.geo.attributes.position.needsUpdate = true;
      kCore.rotation.y = time*0.6;
    }
    // agent
    var w4 = w(current,4); setGroup(agent, w4);
    if (w4>0.01){
      aCore.rotation.y = time*0.5; aRing.rotation.z = -time*0.8; aRing.rotation.x = 0.4;
      var cyc = (time*0.45)%4, ti = Math.floor(cyc), ph2 = cyc - ti, tp = TOOLS[ti][1];
      var out = ph2 < 0.5 ? ph2*2 : (1-ph2)*2;
      aPulse.position.set(tp[0]*out, tp[1]*out, tp[2]*out);
      toolObjs.forEach(function(m,k){ setEdge(m, k===ti ? C.orange : C.cream); m.rotation.y = time*0.4+k; });
    }
    // multi
    var w5 = w(current,5); setGroup(multi, w5);
    if (w5>0.01){
      var stepF;
      if (demoStep >= 0 && demoStep < 6){ stepF = demoStep; }
      else { stepF = (time*0.5) % 6; }
      var si2 = Math.floor(stepF), sf = stepF - si2;
      if (si2 < 5) leadPos.copy(MA[si2]).lerp(MA[si2+1], demoStep>=0 && demoStep<6 ? 0 : ease(Math.min(1, sf*1.4))); else leadPos.copy(MA[5]);
      lead.position.copy(leadPos);
      mObjs.forEach(function(m,k){ setEdge(m, k===si2 ? C.orange : C.cream); m.rotation.y = time*0.5+k; });
      coord.rotation.y = time*0.6;
    }
    // production
    var w6 = w(current,6); setGroup(prod, w6);
    if (w6>0.01){
      items.forEach(function(m,i){
        var f = ((time*0.12) + i/8) % 1, x = -2.3 + f*4.6, y = -0.18;
        var needs = i%3===0;
        if (needs && x > 0.75 && x < 1.45){ var hold = Math.sin(time*2+i)>0.2; if (hold) x = 0.75; }
        m.position.set(x, y, 0); setEdge(m, needs ? C.orange : C.cream);
      });
    }
    // local
    var w7 = w(current,7); setGroup(local, w7);
    if (w7>0.01){ lCore.rotation.y = time*0.6; shield.rotation.z = time*0.3; phone.rotation.y = Math.sin(time*0.4)*0.25; }
    // generative
    var w8 = w(current,8); setGroup(gen, w8);
    if (w8>0.01){
      frames.forEach(function(f,i){ var p = ((time*0.08) + i/7) % 1, ang = (p-0.5)*2.4; f.position.set(Math.sin(ang)*2.4, Math.cos(ang)*0.25 - 0.1, Math.cos(ang)*1.2 - 1.0); f.rotation.y = -ang*0.8; var front = Math.max(0, 1-Math.abs(p-0.5)*6); f.scale.setScalar(0.8 + front*0.6); setEdge(f, front>0.5 ? C.orange : C.cream); });
    }
    // guard
    var w9 = w(current,9); setGroup(guard, w9);
    if (w9>0.01){ gCore.rotation.y = time*0.5; cage.rotation.y = time*0.15; cage.rotation.x = 0.3; gauge.rotation.z = Math.sin(time*0.5)*0.4 - 0.4; }
    // process
    var w10 = w(current,10); setGroup(proc, w10);

    var SA=starPos(a,time), SB=starPos(b,time);
    star.position.set(lerp(SA[0],SB[0],t), lerp(SA[1],SB[1],t)+Math.sin(time*1.2)*0.04, lerp(SA[2],SB[2],t));
    spark.material.rotation = time*0.3;
    renderer.render(scene, camera);
    if (!reduce && !tabHidden) requestAnimationFrame(frame);
  }
  // Pause the loop while the tab is hidden
  var tabHidden = false;
  document.addEventListener('visibilitychange', function(){ var was = tabHidden; tabHidden = document.hidden; if (was && !tabHidden && !reduce) requestAnimationFrame(frame); });
  if (reduce){ addEventListener('scroll',function(){requestAnimationFrame(frame);},{passive:true}); addEventListener('resize',function(){requestAnimationFrame(frame);}); runBtn.addEventListener('click', function(){ setTimeout(function(){ requestAnimationFrame(frame); }, 0); }); }
  requestAnimationFrame(frame);
})();
