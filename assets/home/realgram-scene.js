// /blog/realgram-okosystem-vpn-spill-token/: three products (VPN ring, game octahedron, token coin) that
// merge into one identity as you scroll. Stages follow the [data-stage] sections:
// 0 hero, 1 side by side, 2 never three, 3 value loop, 4 network, 5 clan ladder, 6 architecture (SSO), 7 SaaS, 8 next (satellite), 9 FAQ
(function(){
  var canvas = document.getElementById('scene');
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-stage]'));
  var LAST = sections.length - 1;
  var bar = document.querySelector('.progress'), now = document.querySelector('.chapter-now'), lastCh = '';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function scrollStage(){
    var mid = window.scrollY + window.innerHeight*0.5, st = 0;
    for (var i=0;i<sections.length;i++){
      var top = sections[i].offsetTop, h = sections[i].offsetHeight;
      if (mid >= top){ var f=(mid-top)/h; st = i + Math.min(1, Math.max(0,(f-0.6)/0.4)); }
    }
    return Math.min(LAST, st);
  }
  function ui(st){
    var max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (max>0 ? Math.min(1, scrollY/max) : 0) + ')';
    var ch = sections[Math.round(st)].getAttribute('data-chapter') || '';
    if (now && ch !== lastCh){ lastCh = ch; now.textContent = ch; }
  }
  function fallback(){ canvas.style.display='none'; window.addEventListener('scroll', function(){ ui(scrollStage()); }, {passive:true}); ui(scrollStage()); }
  if (typeof THREE === 'undefined') return fallback();
  var renderer;
  try { renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true}); } catch(e){ return fallback(); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  renderer.setClearColor(0x10100F, 1);

  var scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x10100F, 15, 30);
  var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  var CREAM = new THREE.Color(0xFFFAF0), ORANGE = new THREE.Color(0xF47A2A), tmp = new THREE.Color();
  scene.add(new THREE.AmbientLight(0xffffff, 0.34));
  var key = new THREE.DirectionalLight(0xFFFAF0, 0.9); key.position.set(-4,6,7); scene.add(key);
  var rim = new THREE.DirectionalLight(0x5C84AE, 0.8); rim.position.set(5,2,-6); scene.add(rim);
  var root = new THREE.Group(); scene.add(root);

  (function(){
    var g = new THREE.BufferGeometry(), n = 520, a = new Float32Array(n*3);
    for (var i=0;i<n;i++){ a[i*3]=(Math.random()-.5)*22; a[i*3+1]=(Math.random()-.5)*14; a[i*3+2]=-3-Math.random()*9; }
    g.setAttribute('position', new THREE.BufferAttribute(a,3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({color:0xFFFAF0, size:0.035, transparent:true, opacity:0.3})));
  })();

  function obj(geo, rotX){
    var m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color:0x1B1C1E, metalness:0.45, roughness:0.38, emissive:0xF47A2A, emissiveIntensity:0}));
    var e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0.55}));
    var g = new THREE.Group(); if (rotX){ m.rotation.x = rotX; e.rotation.x = rotX; }
    g.add(m); g.add(e); root.add(g); return {g:g, m:m, e:e};
  }
  var vpn = obj(new THREE.TorusGeometry(0.45,0.13,6,20));
  var game = obj(new THREE.OctahedronGeometry(0.5,0));
  var coin = obj(new THREE.CylinderGeometry(0.45,0.45,0.13,20), Math.PI/2);
  var core = obj(new THREE.IcosahedronGeometry(0.5,1));
  var MAIN = [vpn, game, coin];

  function textSprite(txt){
    var c=document.createElement('canvas'); c.width=512; c.height=96;
    var x=c.getContext('2d');
    function draw(){ x.clearRect(0,0,512,96); x.fillStyle='#FFFAF0'; x.font='500 40px "Space Grotesk", Inter, system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,256,48); }
    draw();
    var map = new THREE.CanvasTexture(c);
    // Redraw once the webfont is in, otherwise the label keeps the fallback font
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ draw(); map.needsUpdate = true; kick(); });
    var s=new THREE.Sprite(new THREE.SpriteMaterial({map:map, transparent:true, depthWrite:false, opacity:0}));
    s.scale.set(1.5,0.28,1); root.add(s); return s;
  }
  var labels = [textSprite('ReaLink'), textSprite('Shahnameh'), textSprite('REAL / ZAR')];
  var coreLabel = textSprite('Én identitet');

  // links core -> the three products
  var linkPos = new Float32Array(3*6), linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPos,3));
  var linkMat = new THREE.LineBasicMaterial({color:0xF47A2A, transparent:true, opacity:0});
  root.add(new THREE.LineSegments(linkGeo, linkMat));

  // tokens flowing round the value loop
  var tokenGeo = new THREE.CylinderGeometry(0.09,0.09,0.03,16);
  var tokens = [], i;
  for (i=0;i<10;i++){ var tm = new THREE.Mesh(tokenGeo, new THREE.MeshBasicMaterial({color:0xF47A2A, transparent:true, opacity:0})); tm.rotation.x = Math.PI/2; root.add(tm); tokens.push(tm); }

  // growing network
  var NN = 60, nodes = [], nodePos = [];
  var nodeGeo = new THREE.SphereGeometry(0.045, 8, 8);
  for (i=0;i<NN;i++){
    var th = Math.random()*Math.PI*2, ph = Math.acos(2*Math.random()-1), r = 1.3 + Math.random()*1.3;
    nodePos.push([Math.sin(ph)*Math.cos(th)*r, Math.cos(ph)*r*0.7, Math.sin(ph)*Math.sin(th)*r]);
    var nm = new THREE.Mesh(nodeGeo, new THREE.MeshBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0})); nm.position.set(nodePos[i][0],nodePos[i][1],nodePos[i][2]); root.add(nm); nodes.push(nm);
  }
  var PAIRS = [];
  for (i=1;i<NN;i++){
    var best=[], d;
    for (var j=0;j<i;j++){ d = Math.hypot(nodePos[i][0]-nodePos[j][0], nodePos[i][1]-nodePos[j][1], nodePos[i][2]-nodePos[j][2]); best.push([d,j]); }
    best.sort(function(a,b){ return a[0]-b[0]; }); PAIRS.push([i,best[0][1]]); if (best[1]) PAIRS.push([i,best[1][1]]);
  }
  var netPos = new Float32Array(PAIRS.length*6), netGeo = new THREE.BufferGeometry();
  netGeo.setAttribute('position', new THREE.BufferAttribute(netPos,3));
  var netMat = new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0});
  root.add(new THREE.LineSegments(netGeo, netMat));

  // clan ladder
  var boxGeo = new THREE.BoxGeometry(1,1,1), boxEdge = new THREE.EdgesGeometry(boxGeo);
  var steps = [0,1,2,3].map(function(k){
    var m = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({color:0x18191B, metalness:0.35, roughness:0.48, emissive:0xF47A2A, emissiveIntensity:0}));
    var e = new THREE.LineSegments(boxEdge, new THREE.LineBasicMaterial({color:k===3?0xF47A2A:0xFFFAF0, transparent:true, opacity:0.6}));
    m.add(e); root.add(m); return m;
  });
  var stepLabels = ['Warrior','Pahlavan · 3+','Champion · 6+','King · 10+'].map(textSprite);

  // SSO ring
  var ring = new THREE.Mesh(new THREE.TorusGeometry(1.15,0.015,8,100), new THREE.MeshBasicMaterial({color:0xF47A2A, transparent:true, opacity:0}));
  root.add(ring);

  // satellite (Starlink node)
  var sat = new THREE.Group();
  sat.add(new THREE.Mesh(new THREE.BoxGeometry(0.18,0.18,0.18), new THREE.MeshStandardMaterial({color:0x1F2023, metalness:0.6, roughness:0.3})));
  [-1,1].forEach(function(s){
    var p = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.02,0.16), new THREE.MeshStandardMaterial({color:0x22334A, metalness:0.5, roughness:0.4})); p.position.x = s*0.32; sat.add(p);
    var pe = new THREE.LineSegments(new THREE.EdgesGeometry(p.geometry), new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0.6})); pe.position.copy(p.position); sat.add(pe);
  });
  root.add(sat);
  var beamGeo = new THREE.BufferGeometry(), beamPos = new Float32Array(6); beamGeo.setAttribute('position', new THREE.BufferAttribute(beamPos,3));
  var beamMat = new THREE.LineDashedMaterial({color:0xF47A2A, dashSize:0.12, gapSize:0.08, transparent:true, opacity:0});
  var beam = new THREE.Line(beamGeo, beamMat); root.add(beam);

  // star
  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var glowT = tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.75)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); });
  var sparkT = tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); });
  var star = new THREE.Group(); root.add(star);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); glow.scale.set(2.2,2.2,1); star.add(glow);
  var spark = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkT, transparent:true, depthWrite:false})); spark.scale.set(0.5,0.5,1); star.add(spark);
  star.add(new THREE.PointLight(0xF47A2A, 2.0, 7));

  // stage layouts for [vpn, game, coin, core]
  var TRI = [[0,1.5,0],[1.3,-0.75,0],[-1.3,-0.75,0]];
  function mainState(s, k, time){
    if (k===3){
      if (s<=1) return {p:[0,0,0], s:0.001, hl:0};
      if (s===5) return {p:[-1.9,-1.5,0], s:0.4, hl:0.6};
      if (s===6) return {p:[0,0,0], s:1.25, hl:1};
      if (s===4) return {p:[0,0,0], s:0.85, hl:0.8};
      return {p:[0,0,0], s:1, hl:0.7};
    }
    if (s===0){ var F=[[-2.2,1.25,-1],[2.3,0.9,-0.6],[0.3,-1.6,0.4]][k]; return {p:[F[0], F[1]+Math.sin(time*0.5+k)*0.08, F[2]], s:0.85, hl:0}; }
    if (s===1) return {p:[(k-1)*1.45, 0, 0], s:0.8, hl:0};
    if (s===5) return {p:[-1.9 + (k-1)*0.45, -0.9, 0], s:0.001, hl:0};
    if (s===6){ var a6 = k*Math.PI*2/3 + time*0.35; return {p:[Math.cos(a6)*1.8, Math.sin(a6*2)*0.25, Math.sin(a6)*1.8], s:0.6, hl:0.4}; }
    if (s===4){ var q=TRI[k]; return {p:[q[0]*0.8,q[1]*0.8,q[2]], s:0.55, hl:0.3}; }
    return {p:TRI[k], s:(s===2||s===3)?0.7:0.65, hl:(s===3)?0.5:0.3};
  }
  var LOOP = [TRI[1], TRI[2], TRI[0]]; // game -> coin -> vpn -> game
  function loopPoint(f){
    var seg = Math.floor(f*3)%3, lf = f*3 - Math.floor(f*3), A = LOOP[seg], B = LOOP[(seg+1)%3];
    var mx = (A[0]+B[0])/2, my = (A[1]+B[1])/2, bow = 0.35;
    var x = (1-lf)*(1-lf)*A[0] + 2*(1-lf)*lf*(mx*(1+bow)) + lf*lf*B[0];
    var y = (1-lf)*(1-lf)*A[1] + 2*(1-lf)*lf*(my*(1+bow)) + lf*lf*B[1];
    return [x, y, 0.15];
  }
  function stepState(k, s){
    if (s!==5) return {p:[-0.6+k*0.6,-1.6,0], h:0.001};
    var h = 0.5 + k*0.55; return {p:[-0.9+k*0.7, -1.6 + h/2, 0], h:h};
  }
  function starPos(s, time){
    switch(s){
      case 0: return [0, 0.2, 0.6];
      case 1: return [0, 0.85, 0.3];
      case 2: return [0, 0.95, 0.7];
      case 3: return loopPoint((time*0.12)%1);
      case 4: return [0, 2.45, 0];
      case 5: return [1.2, 1.25, 0];
      case 6: return [0, 0, 1.0];
      case 7: return [0, 2.0, 0];
      case 8: return [1.6, 2.2, 0];
      default: return [0, 1.6, 0];
    }
  }
  function weight(st,k){ return Math.max(0, 1-Math.abs(st-k)); }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function ease(t){ return t*t*(3-2*t); }

  var current = scrollStage(), clock = new THREE.Clock();
  var layout = {x:2.2, y:0, z:12};
  function resize(){
    var ww=innerWidth, hh=innerHeight;
    renderer.setSize(ww,hh,false); camera.aspect=ww/hh; camera.updateProjectionMatrix();
    if (ww/hh > 1.1){ layout.x=2.2; layout.y=0; layout.z=12; } else { layout.x=0; layout.y=2.0; layout.z=17; }
  }
  window.addEventListener('resize', resize); resize();

  function applyObj(o, A, B, t, time, spin){
    o.g.position.set(lerp(A.p[0],B.p[0],t), lerp(A.p[1],B.p[1],t), lerp(A.p[2],B.p[2],t));
    o.g.scale.setScalar(Math.max(.001, lerp(A.s,B.s,t)));
    o.g.rotation.y = time*spin; o.g.rotation.x = Math.sin(time*0.3)*0.2;
    var hl = lerp(A.hl,B.hl,t);
    tmp.copy(CREAM).lerp(ORANGE, hl); o.e.material.color.copy(tmp); o.e.material.opacity = 0.45+hl*0.5;
    o.m.material.emissiveIntensity = hl*0.18;
  }

  var running = false, tabHidden = false;
  function frame(){
    running = false;
    var time = reduce ? 0 : clock.getElapsedTime();
    current += (scrollStage() - current) * (reduce ? 1 : 0.07);
    ui(current);
    var a=Math.floor(current), b=Math.min(a+1,LAST), t=ease(current-a);
    if (a>=LAST){ a=LAST; b=LAST; t=0; }

    camera.position.set(0, 1.2, layout.z); camera.lookAt(0, 0.1, 0);
    root.position.set(layout.x, layout.y, 0);
    root.rotation.y = -0.25 + Math.sin(time*0.18)*0.08;

    for (var k=0;k<4;k++){
      var o = k<3 ? MAIN[k] : core;
      applyObj(o, mainState(a,k,time), mainState(b,k,time), t, time, k===3 ? 0.25 : 0.4+k*0.1);
    }
    var labOn = Math.max(weight(current,1), weight(current,2), weight(current,3), weight(current,7));
    MAIN.forEach(function(o,k){ labels[k].position.set(o.g.position.x, o.g.position.y-0.62, o.g.position.z+0.2); labels[k].material.opacity = labOn; });
    coreLabel.position.set(core.g.position.x, core.g.position.y-0.8, core.g.position.z+0.4);
    coreLabel.material.opacity = Math.max(weight(current,2), weight(current,6))*0.9;

    for (k=0;k<3;k++){ var p = MAIN[k].g.position, c = core.g.position; linkPos.set([c.x,c.y,c.z,p.x,p.y,p.z], k*6); }
    linkGeo.attributes.position.needsUpdate = true;
    linkMat.opacity = 0.55*Math.max(weight(current,2), weight(current,3), weight(current,4)*0.7, weight(current,7), weight(current,8), weight(current,9));

    var w3 = weight(current,3);
    tokens.forEach(function(tm,i){ var lp = loopPoint(((time*0.12) + i/10)%1); tm.position.set(lp[0],lp[1],lp[2]); tm.rotation.z = time*2+i; tm.material.opacity = w3; tm.visible = w3>0.01; });

    var grow = Math.max(0, Math.min(1, (current-3.35)/0.9)), wn = Math.max(0, 1 - Math.max(0, current-4.3)/0.8);
    var visible = Math.floor(6 + grow*(NN-6));
    nodes.forEach(function(nm,i){ var on = i<visible ? 1 : 0; nm.material.opacity = on*wn*0.85; nm.visible = !!on && wn>0.01; });
    PAIRS.forEach(function(pr,i){
      var A = nodePos[pr[0]], B = nodePos[pr[1]];
      if (pr[0]<visible && pr[1]<visible) netPos.set([A[0],A[1],A[2],B[0],B[1],B[2]], i*6); else netPos.set([0,0,0,0,0,0], i*6);
    });
    netGeo.attributes.position.needsUpdate = true; netMat.opacity = 0.28*wn*grow;

    var w5 = weight(current,5);
    steps.forEach(function(m,k){
      var A=stepState(k,a), B=stepState(k,b);
      var h = Math.max(.001, lerp(A.h,B.h,t));
      m.position.set(lerp(A.p[0],B.p[0],t), lerp(A.p[1],B.p[1],t), 0);
      m.scale.set(Math.max(.001,0.55*Math.min(1,h*4)), h, Math.max(.001,0.55*Math.min(1,h*4)));
      m.material.emissiveIntensity = k===3 ? 0.2*w5 : 0;
      stepLabels[k].position.set(m.position.x, -1.6 + h + 0.25, 0.3); stepLabels[k].material.opacity = w5;
    });

    var w6 = weight(current,6);
    ring.material.opacity = 0.8*w6; ring.rotation.x = Math.PI/2 + Math.sin(time*0.4)*0.3; ring.rotation.y = time*0.3; ring.scale.setScalar(0.6+0.4*w6);

    var w8 = weight(current,8), sa = time*0.25;
    sat.position.set(1.6 + Math.cos(sa)*0.6, 2.2, Math.sin(sa)*0.6);
    sat.scale.setScalar(Math.max(.001, w8)); sat.visible = w8>0.01; sat.rotation.y = time*0.4;
    beamPos.set([sat.position.x, sat.position.y, sat.position.z, 0,0.3,0]); beamGeo.attributes.position.needsUpdate = true; beam.computeLineDistances();
    beamMat.opacity = 0.8*w8;

    var SA=starPos(a,time), SB=starPos(b,time);
    star.position.set(lerp(SA[0],SB[0],t), lerp(SA[1],SB[1],t)+Math.sin(time*1.2)*0.04, lerp(SA[2],SB[2],t));
    spark.material.rotation = time*0.3;

    renderer.render(scene, camera);
    if (!reduce && !tabHidden) kick();
  }
  function kick(){ if (!running){ running = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', kick, {passive:true});
  window.addEventListener('resize', kick);
  document.addEventListener('visibilitychange', function(){ tabHidden = document.hidden; if (!tabHidden) kick(); });
  kick();
})();
