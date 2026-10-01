// /services/fullstack-utvikler-oslo/: scroll-driven 3D stack (5 layers + integration satellites) behind the sections.
// Stages: 0 start, 1 frontend, 2 backend, 3 database, 4 integrations, 5 operations, 6 modernisation, 7 for teams, 8 contact
(function(){
  var canvas = document.getElementById('scene');
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-stage]'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.home-dots a'));
  var LAST = sections.length - 1;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function scrollStage(){
    var mid = window.scrollY + window.innerHeight*0.5, st = 0;
    for (var i=0;i<sections.length;i++){
      var top = sections[i].offsetTop, h = sections[i].offsetHeight;
      if (mid >= top){ var f=(mid-top)/h; st = i + Math.min(1, Math.max(0,(f-0.6)/0.4)); }
    }
    return Math.min(LAST, st);
  }
  function updateNav(st){
    var idx = Math.round(st);
    navLinks.forEach(function(a,i){ if (i===idx) a.setAttribute('aria-current','step'); else a.removeAttribute('aria-current'); });
  }
  function fallback(){ canvas.style.display='none'; window.addEventListener('scroll', function(){ updateNav(scrollStage()); }, {passive:true}); }
  if (typeof THREE === 'undefined') return fallback();
  var renderer;
  try { renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true}); } catch(e){ return fallback(); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  renderer.setClearColor(0x10100F, 1);

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x10100F, 15, 30);
  var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  var CREAM = new THREE.Color(0xFFFAF0), ORANGE = new THREE.Color(0xF47A2A), tmp = new THREE.Color();
  scene.add(new THREE.AmbientLight(0xffffff, 0.32));
  var key = new THREE.DirectionalLight(0xFFFAF0, 0.9); key.position.set(-4,7,6); scene.add(key);
  var rim = new THREE.DirectionalLight(0x5C84AE, 0.8); rim.position.set(5,2,-6); scene.add(rim);
  var root = new THREE.Group(); scene.add(root);

  (function(){
    var g = new THREE.BufferGeometry(), n = 520, a = new Float32Array(n*3);
    for (var i=0;i<n;i++){ a[i*3]=(Math.random()-.5)*22; a[i*3+1]=(Math.random()-.5)*14; a[i*3+2]=-3-Math.random()*9; }
    g.setAttribute('position', new THREE.BufferAttribute(a,3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({color:0xFFFAF0, size:0.035, transparent:true, opacity:0.3})));
  })();

  function textSprite(txt){
    var c=document.createElement('canvas'); c.width=512; c.height=96;
    var x=c.getContext('2d');
    function draw(){ x.clearRect(0,0,512,96); x.fillStyle='#FFFAF0'; x.font='500 40px "Space Grotesk", Inter, system-ui, sans-serif'; x.textAlign='left'; x.textBaseline='middle'; x.fillText(txt,8,48); }
    draw();
    var map = new THREE.CanvasTexture(c);
    // Redraw once the webfont is in, otherwise the label keeps the fallback font
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ draw(); map.needsUpdate = true; kick(); });
    var s=new THREE.Sprite(new THREE.SpriteMaterial({map:map, transparent:true, depthWrite:false, opacity:0}));
    s.scale.set(1.7,0.32,1); s.center.set(0,0.5); root.add(s); return s;
  }

  // 5 stack layers, bottom to top
  var LNAMES = ['Infrastruktur','Database','Backend og API','Integrasjoner','Frontend'];
  var slabGeo = new THREE.BoxGeometry(2.2,0.3,1.5), slabEdge = new THREE.EdgesGeometry(slabGeo);
  var layers = LNAMES.map(function(n){
    var m = new THREE.Mesh(slabGeo, new THREE.MeshStandardMaterial({color:0x18191B, metalness:0.38, roughness:0.45, emissive:0xF47A2A, emissiveIntensity:0}));
    var e = new THREE.LineSegments(slabEdge, new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0.55}));
    m.add(e); root.add(m); return {mesh:m, edge:e, label:textSprite(n)};
  });

  // 4 satellites (integrations / team)
  var boxGeo = new THREE.BoxGeometry(1,1,1), edgeGeo = new THREE.EdgesGeometry(boxGeo);
  var sats = [0,1,2,3].map(function(){
    var m = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({color:0x18191B, metalness:0.38, roughness:0.45}));
    var e = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({color:0xF47A2A, transparent:true, opacity:0.85}));
    m.add(e); root.add(m); return m;
  });
  var satPos = new Float32Array(4*6), satGeo = new THREE.BufferGeometry();
  satGeo.setAttribute('position', new THREE.BufferAttribute(satPos,3));
  var satMat = new THREE.LineBasicMaterial({color:0xF47A2A, transparent:true, opacity:0});
  root.add(new THREE.LineSegments(satGeo, satMat));

  // scan plane (modernisation)
  var scanGeo = new THREE.PlaneGeometry(2.8,2.0);
  var scan = new THREE.Mesh(scanGeo, new THREE.MeshBasicMaterial({color:0xF47A2A, transparent:true, opacity:0, side:THREE.DoubleSide, depthWrite:false}));
  scan.rotation.x = -Math.PI/2;
  var scanEdge = new THREE.LineSegments(new THREE.EdgesGeometry(scanGeo), new THREE.LineBasicMaterial({color:0xF47A2A, transparent:true, opacity:0}));
  scan.add(scanEdge); root.add(scan);

  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var glowT = tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.75)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); });
  var sparkT = tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); });
  var star = new THREE.Group(); root.add(star);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); glow.scale.set(2.4,2.4,1); star.add(glow);
  var spark = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkT, transparent:true, depthWrite:false})); spark.scale.set(0.55,0.55,1); star.add(spark);
  star.add(new THREE.PointLight(0xF47A2A, 2.2, 7));

  // stage -> active layer index (-1 = none)
  var ACTIVE = [-1, 4, 2, 1, 3, 0, -1, -1, -1];
  function inspecting(s){ return s>=1 && s<=5; }
  function layerState(s, L, time){
    var gap = inspecting(s) ? 0.55 : 0.4;
    var y = -1.3 + L*gap;
    var act = ACTIVE[s]===L ? 1 : 0;
    var hl = act;
    if (s===6){ hl = Math.pow(Math.max(0, Math.sin(time*2 - L*1.1)), 6); }
    if (s===0 || s===8) hl = (L===4 ? 0.35 : 0);
    return {p:[act*0.35, y + act*0.08, act*1.05], hl:hl, lab: inspecting(s) ? (act ? 1 : 0.3) : (s===0 ? 0.55 : 0)};
  }
  function satState(s, k, time){
    if (s===4){ var P=[[-2.4,0.6,0.6],[2.6,0.9,0.4],[-1.6,1.8,-1.0],[1.8,1.9,-1.0]]; return {p:P[k], s:.36}; }
    if (s===7){ var a=k*Math.PI/2 + time*0.35; return {p:[Math.cos(a)*2.4, -0.4, Math.sin(a)*2.4], s:.34}; }
    return {p:[0,-0.4,0], s:.001};
  }
  function topY(s){ return -1.3 + 4*(inspecting(s)?0.55:0.4) + 0.75; }
  function starPos(s){
    if (inspecting(s)){ var L=ACTIVE[s], y=-1.3+L*0.55; return [1.9, y+0.45, 1.05]; }
    return [0, topY(s), 0];
  }
  function weight(st,k){ return Math.max(0, 1-Math.abs(st-k)); }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function ease(t){ return t*t*(3-2*t); }

  var current = scrollStage(), clock = new THREE.Clock();
  var layout = {x:2.0, y:0, z:12};
  function resize(){
    var ww=window.innerWidth, hh=window.innerHeight;
    renderer.setSize(ww,hh,false); camera.aspect=ww/hh; camera.updateProjectionMatrix();
    if (ww/hh > 1.1){ layout.x=2.0; layout.y=0; layout.z=12; } else { layout.x=-0.6; layout.y=1.9; layout.z=17; }
  }
  window.addEventListener('resize', resize); resize();

  var running = false, tabHidden = false;
  function frame(){
    running = false;
    var time = reduce ? 0 : clock.getElapsedTime();
    current += (scrollStage() - current) * (reduce ? 1 : 0.07);
    updateNav(current);
    var a=Math.floor(current), b=Math.min(a+1,LAST), t=ease(current-a);
    if (a>=LAST){ a=LAST; b=LAST; t=0; }

    camera.position.set(0, 2.2, layout.z); camera.lookAt(0, 0.1, 0);
    root.position.set(layout.x, layout.y, 0);
    root.rotation.y = -0.6 + Math.sin(time*0.2)*0.08 + current*0.04;

    layers.forEach(function(Ly, L){
      var A=layerState(a,L,time), B=layerState(b,L,time);
      Ly.mesh.position.set(lerp(A.p[0],B.p[0],t), lerp(A.p[1],B.p[1],t), lerp(A.p[2],B.p[2],t));
      var hl = lerp(A.hl,B.hl,t);
      tmp.copy(CREAM).lerp(ORANGE, hl); Ly.edge.material.color.copy(tmp); Ly.edge.material.opacity = 0.5+hl*0.45;
      Ly.mesh.material.emissiveIntensity = hl*0.16;
      Ly.label.position.set(Ly.mesh.position.x + 1.35, Ly.mesh.position.y, Ly.mesh.position.z + 0.75);
      Ly.label.material.opacity = lerp(A.lab,B.lab,t);
    });

    var integY = layers[3].mesh.position;
    sats.forEach(function(m,k){
      var A=satState(a,k,time), B=satState(b,k,time);
      m.position.set(lerp(A.p[0],B.p[0],t), lerp(A.p[1],B.p[1],t), lerp(A.p[2],B.p[2],t));
      m.scale.setScalar(Math.max(.001, lerp(A.s,B.s,t))); m.rotation.y = time*0.5+k; m.rotation.x = 0.4;
      satPos.set([m.position.x,m.position.y,m.position.z, integY.x,integY.y,integY.z], k*6);
    });
    satGeo.attributes.position.needsUpdate = true; satMat.opacity = 0.45*weight(current,4);

    var w6 = weight(current,6);
    scan.visible = w6 > 0.01; scan.position.y = -1.5 + ((time*0.35)%1)*2.3;
    scan.material.opacity = 0.1*w6; scanEdge.material.opacity = 0.75*w6;

    var SA=starPos(a), SB=starPos(b);
    star.position.set(lerp(SA[0],SB[0],t), lerp(SA[1],SB[1],t)+Math.sin(time*1.2)*0.05, lerp(SA[2],SB[2],t));
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
