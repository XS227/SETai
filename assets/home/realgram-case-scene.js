// /projects/realgram/: case-study scene. One identity core with four surfaces (VPN, game, token, messages);
// each [data-stage] section gets its own picture: 0 hero, 1 the whole, 2 ReaLink failover, 3 Season 1 chapters,
// 4 clan rings, 5 ad-funded quota, 6 value flow, 7 network effect, 8 audiences, 9 three systems, 10 status (Starlink), 11 FAQ
(function(){
  var canvas = document.getElementById('scene');
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-stage]'));
  var LAST = sections.length - 1;
  var bar = document.querySelector('.progress'), now = document.querySelector('.chapter-now'), lastCh = '';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function scrollStage(){
    var mid = scrollY + innerHeight*0.5, st = 0;
    for (var i=0;i<sections.length;i++){ var top=sections[i].offsetTop, h=sections[i].offsetHeight; if (mid>=top){ var f=(mid-top)/h; st = i + Math.min(1, Math.max(0,(f-0.6)/0.4)); } }
    return Math.min(LAST, st);
  }
  function ui(st){
    var max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (max>0 ? Math.min(1, scrollY/max) : 0) + ')';
    var ch = sections[Math.round(st)].getAttribute('data-chapter') || '';
    if (now && ch !== lastCh){ lastCh = ch; now.textContent = ch; }
  }
  function fallback(){ canvas.style.display='none'; addEventListener('scroll', function(){ ui(scrollStage()); }, {passive:true}); ui(scrollStage()); }
  if (typeof THREE === 'undefined') return fallback();
  var renderer;
  try { renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true}); } catch(e){ return fallback(); }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2));
  renderer.setClearColor(0x10100F, 1);
  var scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x10100F, 15, 30);
  var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  var CREAM = new THREE.Color(0xFFFAF0), ORANGE = new THREE.Color(0xF47A2A), tmpC = new THREE.Color();
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
    if (rotX){ m.rotation.x = rotX; e.rotation.x = rotX; }
    var g = new THREE.Group(); g.add(m); g.add(e); root.add(g); return {g:g, m:m, e:e};
  }
  function setHl(o, hl){ tmpC.copy(CREAM).lerp(ORANGE, hl); o.e.material.color.copy(tmpC); o.e.material.opacity = 0.45+hl*0.5; o.m.material.emissiveIntensity = hl*0.18; }
  function textSprite(txt, color){
    var c=document.createElement('canvas'); c.width=512; c.height=96;
    var x=c.getContext('2d');
    function draw(){ x.clearRect(0,0,512,96); x.fillStyle=color||'#FFFAF0'; x.font='500 40px "Space Grotesk", Inter, system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,256,48); }
    draw();
    var map = new THREE.CanvasTexture(c);
    // Redraw once the webfont is in, otherwise the label keeps the fallback font
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ draw(); map.needsUpdate = true; kick(); });
    var s=new THREE.Sprite(new THREE.SpriteMaterial({map:map, transparent:true, depthWrite:false, opacity:0}));
    s.scale.set(1.5,0.28,1); root.add(s); return s;
  }

  var core = obj(new THREE.IcosahedronGeometry(0.55,1));
  var SURF = [obj(new THREE.TorusGeometry(0.4,0.12,6,20)), obj(new THREE.OctahedronGeometry(0.45,0)), obj(new THREE.CylinderGeometry(0.4,0.4,0.12,20), Math.PI/2), obj(new THREE.BoxGeometry(0.75,0.5,0.14))];
  var labels = ['ReaLink','Shahnameh','REAL / ZAR','Meldinger'].map(function(n){ return textSprite(n); });
  var audLabels = ['Sensurert internett','Spillere','Ambassadører','Testere'].map(function(n){ return textSprite(n,'#F47A2A'); });
  var coreLabel = textSprite('SSO · RS256 JWT', '#F47A2A');
  var CROSS = [[0,1.65,0],[1.85,0,0],[0,-1.65,0],[-1.85,0,0]];

  var linkPos = new Float32Array(4*6), linkGeo = new THREE.BufferGeometry(); linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPos,3));
  var linkMat = new THREE.LineBasicMaterial({color:0xF47A2A, transparent:true, opacity:0}); root.add(new THREE.LineSegments(linkGeo, linkMat));

  // data packets
  var packetGeo = new THREE.SphereGeometry(0.055, 10, 10), packets = [], i;
  for (i=0;i<14;i++){ var pm = new THREE.Mesh(packetGeo, new THREE.MeshBasicMaterial({color:0xF47A2A, transparent:true, opacity:0})); root.add(pm); packets.push(pm); }

  // VPN nodes
  var boxGeo = new THREE.BoxGeometry(1,1,1), boxEdge = new THREE.EdgesGeometry(boxGeo);
  function cube(){ var m = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({color:0x18191B, metalness:0.35, roughness:0.48, emissive:0xF47A2A, emissiveIntensity:0})); var e = new THREE.LineSegments(boxEdge, new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0.5})); m.add(e); root.add(m); return {m:m, e:e}; }
  var vnodes = [cube(), cube(), cube()];
  var NODEP = [[1.9,1.0,0],[2.1,0,0.2],[1.9,-1.0,0]];
  var nodeLabel = textSprite('Failover', '#B7B0A4');

  // Season 1 chapter stones
  var stones = []; for (i=0;i<7;i++) stones.push(cube());
  function stonePos(k){ var a = k*0.85, r = 1.6 - k*0.12; return [Math.cos(a)*r, -1.5 + k*0.45, Math.sin(a)*r*0.7]; }

  // clan rings: Pahlavan 3+, Champion 6+, King 10+
  var radii = [0.7, 1.3, 1.9];
  var rings = radii.map(function(r){ var t = new THREE.Mesh(new THREE.TorusGeometry(r,0.01,6,96), new THREE.MeshBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0})); root.add(t); return t; });
  var ringLabels = ['Pahlavan · 3+','Champion · 6+','King · 10+'].map(function(n){ return textSprite(n,'#B7B0A4'); });
  var youLabel = textSprite('Warrior · du', '#F47A2A');
  var clanNodes = [], CLANP = [], tiers = [3,3,4];
  tiers.forEach(function(n,ti){ for (var k=0;k<n;k++){ var a = (k/n)*Math.PI*2 + ti*0.5; CLANP.push([Math.cos(a)*radii[ti], Math.sin(a)*radii[ti], 0, ti]); } });
  CLANP.forEach(function(){ var m = new THREE.Mesh(new THREE.SphereGeometry(0.09,12,12), new THREE.MeshStandardMaterial({color:0xFFFAF0, roughness:0.5, transparent:true, opacity:0})); root.add(m); clanNodes.push(m); });
  var clanPos = new Float32Array(CLANP.length*6), clanGeo = new THREE.BufferGeometry(); clanGeo.setAttribute('position', new THREE.BufferAttribute(clanPos,3));
  var clanMat = new THREE.LineBasicMaterial({color:0xF47A2A, transparent:true, opacity:0}); root.add(new THREE.LineSegments(clanGeo, clanMat));

  // VPN quota bar
  var barShell = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.5,2.4,0.5)), new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0}));
  var barFill = new THREE.Mesh(new THREE.BoxGeometry(0.42,1,0.42), new THREE.MeshStandardMaterial({color:0xF47A2A, emissive:0xF47A2A, emissiveIntensity:0.25, transparent:true, opacity:0}));
  root.add(barShell); root.add(barFill);
  var barLabel = textSprite('VPN-kvote', '#F47A2A');

  // network effect
  var NN = 50, net = [], netP = [];
  for (i=0;i<NN;i++){ var th=Math.random()*Math.PI*2, ph=Math.acos(2*Math.random()-1), r=1.3+Math.random()*1.3; netP.push([Math.sin(ph)*Math.cos(th)*r, Math.cos(ph)*r*0.75, Math.sin(ph)*Math.sin(th)*r]); var nm = new THREE.Mesh(new THREE.SphereGeometry(0.045,8,8), new THREE.MeshBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0})); nm.position.set(netP[i][0],netP[i][1],netP[i][2]); root.add(nm); net.push(nm); }
  var NPAIR = []; for (i=1;i<NN;i++){ var best=[]; for (var j=0;j<i;j++) best.push([Math.hypot(netP[i][0]-netP[j][0],netP[i][1]-netP[j][1],netP[i][2]-netP[j][2]),j]); best.sort(function(a,b){ return a[0]-b[0]; }); NPAIR.push([i,best[0][1]]); if (best[1]) NPAIR.push([i,best[1][1]]); }
  var netPos = new Float32Array(NPAIR.length*6), netGeo = new THREE.BufferGeometry(); netGeo.setAttribute('position', new THREE.BufferAttribute(netPos,3));
  var netMat = new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0}); root.add(new THREE.LineSegments(netGeo, netMat));

  // three systems as pillars
  var pillars = [0,1,2].map(function(){ return [cube(), cube(), cube()]; });
  var PX = [-1.6, 0, 1.6];
  var pillarLabels = ['VPN-panel · PHP','Backend · Node.js','Transport · VLESS'].map(function(n,k){ return textSprite(n, k===1 ? '#F47A2A' : '#FFFAF0'); });

  // satellite (Starlink node)
  var sat = new THREE.Group();
  sat.add(new THREE.Mesh(new THREE.BoxGeometry(0.18,0.18,0.18), new THREE.MeshStandardMaterial({color:0x1F2023, metalness:0.6, roughness:0.3})));
  [-1,1].forEach(function(s){ var p = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.02,0.16), new THREE.MeshStandardMaterial({color:0x22334A, metalness:0.5, roughness:0.4})); p.position.x = s*0.32; sat.add(p); var pe = new THREE.LineSegments(new THREE.EdgesGeometry(p.geometry), new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0.6})); pe.position.copy(p.position); sat.add(pe); });
  root.add(sat);
  var beamGeo = new THREE.BufferGeometry(), beamPos = new Float32Array(6); beamGeo.setAttribute('position', new THREE.BufferAttribute(beamPos,3));
  var beamMat = new THREE.LineDashedMaterial({color:0xF47A2A, dashSize:0.12, gapSize:0.08, transparent:true, opacity:0}); var beam = new THREE.Line(beamGeo, beamMat); root.add(beam);

  // star (Hakim / guide)
  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var glowT = tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.75)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); });
  var sparkT = tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); });
  var star = new THREE.Group(); root.add(star);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); glow.scale.set(2.2,2.2,1); star.add(glow);
  var spark = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkT, transparent:true, depthWrite:false})); spark.scale.set(0.5,0.5,1); star.add(spark);
  star.add(new THREE.PointLight(0xF47A2A, 2.0, 7));
  var hakimLabel = textSprite('Hakim', '#F47A2A');

  function lerp(a,b,t){ return a+(b-a)*t; }
  function ease(t){ return t*t*(3-2*t); }
  function weight(st,k){ return Math.max(0, 1-Math.abs(st-k)); }

  function coreState(s){
    if (s===2) return {p:[-1.9,-0.9,-1], s:0.35, hl:0.3};
    if (s===3) return {p:[0,-1.9,-0.6], s:0.35, hl:0.3};
    if (s===4) return {p:[0,0,0], s:0.32, hl:1};
    if (s===5 || s===6) return {p:[0,-0.1,-0.4], s:0.45, hl:0.6};
    if (s===7) return {p:[0,0,0], s:0.8, hl:0.8};
    if (s===9) return {p:[0,1.9,-0.4], s:0.001, hl:0};
    return {p:[0,0,0], s:1, hl:0.7};
  }
  function surfState(s, k, time){
    if (s===0 || s===11){ var a = k*Math.PI/2 + time*0.3; return {p:[Math.cos(a)*1.9, Math.sin(a*2)*0.2, Math.sin(a)*1.9], s:0.75, hl:0}; }
    if (s===1 || s===8 || s===10) return {p:CROSS[k], s:0.75, hl:(s===1?0.35:0.2)};
    if (s===2){ if (k===0) return {p:[-1.7,0,0.3], s:1.15, hl:1}; return {p:[-1.9,-0.9,-1], s:0.001, hl:0}; }
    if (s===3){ if (k===1){ var sp = stonePos(6); return {p:[sp[0], sp[1]+0.55, sp[2]], s:0.8, hl:1}; } return {p:[0,-1.9,-0.6], s:0.001, hl:0}; }
    if (s===5){ if (k===3) return {p:[-1.7,0.9,0], s:1.2, hl:0.6}; if (k===1) return {p:[-1.7,-1.0,0], s:0.001, hl:0}; return {p:[0,-0.1,-0.4], s:0.001, hl:0}; }
    if (s===6){ if (k===3) return {p:[-1.8,1.05,0], s:0.9, hl:0.4}; if (k===1) return {p:[-1.8,-1.05,0], s:0.85, hl:0.4}; if (k===2) return {p:[0,-0.55,0.3], s:0.9, hl:1}; return {p:[0,-0.1,-0.4], s:0.001, hl:0}; }
    if (s===7){ var c = CROSS[k]; return {p:[c[0]*0.55,c[1]*0.55,0.3], s:0.42, hl:0.3}; }
    return {p:[0,1.9,-0.4], s:0.001, hl:0}; // 4 and 9
  }
  function starPos(s, time){
    switch(s){
      case 0: return [0, 1.25, 0.6];
      case 1: return [0, 0.9, 0.9];
      case 2: return [-1.7, 0.95, 0.3];
      case 3: { var k = Math.floor((time*0.35)%7), sp = stonePos(k); return [sp[0]+0.45, sp[1]+0.5, sp[2]]; }
      case 4: return [0, 2.3, 0];
      case 5: case 6: return [1.55, 1.55, 0];
      case 7: return [0, 2.4, 0];
      case 9: return [0, 1.8, 0.3];
      case 10: return [1.6, 2.2, 0];
      default: return [0, 1.4, 0.4];
    }
  }

  var current = scrollStage(), clock = new THREE.Clock();
  var layout = {x:2.3, y:0, z:12};
  function resize(){ var ww=innerWidth, hh=innerHeight; renderer.setSize(ww,hh,false); camera.aspect=ww/hh; camera.updateProjectionMatrix(); if (ww/hh > 1.1){ layout.x=2.3; layout.y=0; layout.z=12; } else { layout.x=0; layout.y=2.0; layout.z=17; } }
  addEventListener('resize', resize); resize();

  var running = false, tabHidden = false;
  function frame(){
    running = false;
    var time = reduce ? 0 : clock.getElapsedTime();
    current += (scrollStage() - current) * (reduce ? 1 : 0.07);
    ui(current);
    var a=Math.floor(current), b=Math.min(a+1,LAST), t=ease(current-a);
    if (a>=LAST){ a=LAST; b=LAST; t=0; }
    camera.position.set(0, 1.1, layout.z); camera.lookAt(0, 0.1, 0);
    root.position.set(layout.x, layout.y, 0);
    root.rotation.y = -0.22 + Math.sin(time*0.18)*0.07;
    var dom = Math.round(current), W = [], k;
    for (k=0;k<=LAST;k++) W.push(weight(current,k));
    function Wk(n){ return W[n] || 0; }

    var CA=coreState(a), CB=coreState(b);
    core.g.position.set(lerp(CA.p[0],CB.p[0],t), lerp(CA.p[1],CB.p[1],t), lerp(CA.p[2],CB.p[2],t));
    core.g.scale.setScalar(Math.max(.001, lerp(CA.s,CB.s,t))); core.g.rotation.y = time*0.25; core.g.rotation.x = Math.sin(time*0.3)*0.2;
    setHl(core, lerp(CA.hl,CB.hl,t));
    coreLabel.position.set(core.g.position.x, core.g.position.y-0.85, core.g.position.z+0.5); coreLabel.material.opacity = Wk(1);

    SURF.forEach(function(o,k){
      var A=surfState(a,k,time), B=surfState(b,k,time);
      o.g.position.set(lerp(A.p[0],B.p[0],t), lerp(A.p[1],B.p[1],t), lerp(A.p[2],B.p[2],t));
      o.g.scale.setScalar(Math.max(.001, lerp(A.s,B.s,t))); o.g.rotation.y = time*(0.35+k*0.1); o.g.rotation.x = Math.sin(time*0.3+k)*0.2;
      setHl(o, lerp(A.hl,B.hl,t));
      labels[k].position.set(o.g.position.x, o.g.position.y-0.58, o.g.position.z+0.3);
      labels[k].material.opacity = Math.max(Wk(1), Wk(10)*0.8, (k===0?Wk(2):0), (k===1?Wk(3):0), (k!==0 ? Wk(6) : 0));
      audLabels[k].position.set(o.g.position.x, o.g.position.y-0.58, o.g.position.z+0.3); audLabels[k].material.opacity = Wk(8);
      if (Wk(8) > 0.5) labels[k].material.opacity = Math.min(labels[k].material.opacity, 1-Wk(8));
      var c = core.g.position, p = o.g.position; linkPos.set([c.x,c.y,c.z,p.x,p.y,p.z], k*6);
    });
    linkGeo.attributes.position.needsUpdate = true;
    linkMat.opacity = 0.5*Math.max(Wk(1), Wk(8), Wk(10), Wk(0)*0.3, Wk(11)*0.3);

    // ReaLink failover: the active node switches every few seconds
    var active = Math.floor(time/3) % 3;
    vnodes.forEach(function(n,k){ var on = k===active ? 1 : 0; n.m.position.set(NODEP[k][0],NODEP[k][1],NODEP[k][2]); n.m.scale.setScalar(Math.max(.001, 0.45*Wk(2))); n.m.visible = Wk(2)>0.01; n.e.material.color.copy(on?ORANGE:CREAM); n.e.material.opacity = on ? 0.95 : 0.3; n.m.material.emissiveIntensity = on*0.2; });
    nodeLabel.position.set(2.0,-1.6,0.2); nodeLabel.material.opacity = Wk(2);

    stones.forEach(function(s,k){ var sp = stonePos(k); s.m.position.set(sp[0],sp[1],sp[2]); s.m.scale.setScalar(Math.max(.001, 0.32*Wk(3))); s.m.visible = Wk(3)>0.01; s.m.rotation.y = time*0.3+k; var lit = k <= Math.floor((time*0.35)%7); s.e.material.color.copy(lit?ORANGE:CREAM); s.e.material.opacity = lit?0.9:0.4; });
    hakimLabel.position.set(star.position.x, star.position.y+0.45, star.position.z); hakimLabel.material.opacity = Wk(3);

    var w4 = Wk(4);
    rings.forEach(function(r){ r.material.opacity = 0.3*w4; r.scale.setScalar(Math.max(.001, 0.6+0.4*w4)); });
    ringLabels.forEach(function(l,k){ l.position.set(radii[k]+0.15, 0.22, 0.2); l.material.opacity = w4; });
    youLabel.position.set(0,-0.42,0.4); youLabel.material.opacity = w4;
    var grow = Math.max(0, Math.min(1, (current-3.4)/0.8)), visibleClan = Math.floor(grow*CLANP.length + 0.001);
    clanNodes.forEach(function(m,k){ var P = CLANP[k], on = k < visibleClan; m.position.set(P[0],P[1],P[2]); m.material.opacity = on ? w4 : 0; m.visible = on && w4>0.01; m.material.color.copy(P[3]===2 ? ORANGE : CREAM);
      if (on) clanPos.set([0,0,0,P[0],P[1],P[2]], k*6); else clanPos.set([0,0,0,0,0,0], k*6); });
    clanGeo.attributes.position.needsUpdate = true; clanMat.opacity = 0.4*w4;

    var wb = Math.max(Wk(5), Wk(6)), fill = 0.15 + ((time*0.22)%1)*0.85;
    barShell.position.set(1.55,0,0); barShell.material.opacity = 0.6*wb; barShell.scale.setScalar(Math.max(.001, wb));
    barFill.scale.set(Math.max(.001,wb), Math.max(.001, fill*2.3*wb), Math.max(.001,wb)); barFill.position.set(1.55, -1.15*wb + fill*1.15*wb, 0); barFill.material.opacity = 0.85*wb; barFill.visible = wb>0.01;
    barLabel.position.set(1.55,-1.5,0.3); barLabel.material.opacity = wb;

    var w7 = Wk(7), g7 = Math.max(0, Math.min(1, (current-6.4)/0.8)), nVis = Math.floor(6 + g7*(NN-6));
    net.forEach(function(m,k){ var on = k<nVis; m.material.opacity = on ? 0.85*w7 : 0; m.visible = on && w7>0.01; });
    NPAIR.forEach(function(pr,k){ var A=netP[pr[0]], B=netP[pr[1]]; if (pr[0]<nVis && pr[1]<nVis) netPos.set([A[0],A[1],A[2],B[0],B[1],B[2]], k*6); else netPos.set([0,0,0,0,0,0], k*6); });
    netGeo.attributes.position.needsUpdate = true; netMat.opacity = 0.3*w7*g7;

    var w9 = Wk(9);
    pillars.forEach(function(stack,p){ stack.forEach(function(c,l){ c.m.position.set(PX[p], -1.2 + l*0.55, 0); c.m.scale.set(Math.max(.001,1.0*w9), Math.max(.001,0.42*w9), Math.max(.001,0.9*w9)); c.m.visible = w9>0.01; var hl = (p===1 && l===2) ? 1 : 0; c.e.material.color.copy(hl?ORANGE:CREAM); c.e.material.opacity = 0.35+hl*0.6; c.m.material.emissiveIntensity = hl*0.2; }); pillarLabels[p].position.set(PX[p], 0.55, 0.5); pillarLabels[p].material.opacity = w9; });

    var w10 = Wk(10), sa = time*0.25;
    sat.position.set(1.6 + Math.cos(sa)*0.6, 2.3, Math.sin(sa)*0.6); sat.scale.setScalar(Math.max(.001, w10)); sat.visible = w10>0.01; sat.rotation.y = time*0.4;
    var vp = SURF[0].g.position; beamPos.set([sat.position.x,sat.position.y,sat.position.z, vp.x,vp.y,vp.z]); beamGeo.attributes.position.needsUpdate = true; beam.computeLineDistances(); beamMat.opacity = 0.8*w10;

    // packets follow a path that fits the current section
    var pw = Wk(dom);
    packets.forEach(function(pm,k){
      var f = ((time*0.35) + k/packets.length) % 1, pos = null;
      if (dom===1){ var tgt = SURF[k%4].g.position; pos = [tgt.x*f, tgt.y*f, tgt.z*f]; }
      else if (dom===2){ var src = SURF[0].g.position, dst = NODEP[active]; pos = [lerp(src.x,dst[0],f), lerp(src.y,dst[1],f), lerp(src.z,dst[2],f)]; }
      else if (dom===5){ var s5 = SURF[3].g.position; pos = [lerp(s5.x,1.55,f), lerp(s5.y,0.9,f)+Math.sin(f*Math.PI)*0.4, 0.2]; }
      else if (dom===6){ if (k%2===0){ var s6 = SURF[3].g.position; pos = [lerp(s6.x,1.55,f), lerp(s6.y,0.9,f), 0.2]; } else { var g6 = SURF[1].g.position, c6 = SURF[2].g.position; pos = f<0.5 ? [lerp(g6.x,c6.x,f*2), lerp(g6.y,c6.y,f*2), 0.25] : [lerp(c6.x,1.55,(f-0.5)*2), lerp(c6.y,0.2,(f-0.5)*2), 0.25]; } }
      else if (dom===9){ var to = k%2 ? 0 : 2; pos = [lerp(PX[1],PX[to],f), Math.sin(f*Math.PI)*0.5, 0.3]; }
      if (pos){ pm.position.set(pos[0],pos[1],pos[2]); pm.material.opacity = pw*Math.sin(f*Math.PI); pm.visible = true; } else { pm.visible = false; }
    });

    var SA=starPos(a,time), SB=starPos(b,time);
    star.position.set(lerp(SA[0],SB[0],t), lerp(SA[1],SB[1],t)+Math.sin(time*1.2)*0.04, lerp(SA[2],SB[2],t));
    spark.material.rotation = time*0.3;

    renderer.render(scene, camera);
    if (!reduce && !tabHidden) kick();
  }
  function kick(){ if (!running){ running = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', kick, {passive:true});
  addEventListener('resize', kick);
  document.addEventListener('visibilitychange', function(){ tabHidden = document.hidden; if (!tabHidden) kick(); });
  kick();
})();
