// /services/seo-oslo/: scroll-driven 3D "city" behind the sections.
// Stages: 0 start, 1 three layers, 2 audit, 3 keywords, 4 structure, 5 measuring, 6 case, 7 what you get
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
  var key = new THREE.DirectionalLight(0xFFFAF0, 0.85); key.position.set(-4,7,6); scene.add(key);
  var rim = new THREE.DirectionalLight(0x5C84AE, 0.8); rim.position.set(5,2,-6); scene.add(rim);

  var root = new THREE.Group(); scene.add(root);

  (function(){
    var g = new THREE.BufferGeometry(), n = 480, a = new Float32Array(n*3);
    for (var i=0;i<n;i++){ a[i*3]=(Math.random()-.5)*22; a[i*3+1]=(Math.random()-.5)*14; a[i*3+2]=-2-Math.random()*9; }
    g.setAttribute('position', new THREE.BufferAttribute(a,3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({color:0xFFFAF0, size:0.035, transparent:true, opacity:0.3})));
  })();

  // ground grid
  var grid = new THREE.GridHelper(6, 12, 0x2E2C29, 0x1E1D1B); grid.position.y = -1.6; root.add(grid);

  var N = 16, cubes = [];
  var H = [1.2,2.0,0.9,1.6, 2.6,1.1,3.0,1.4, 1.0,2.2,1.3,1.8, 1.5,0.8,2.4,1.1];
  var boxGeo = new THREE.BoxGeometry(1,1,1), edgeGeo = new THREE.EdgesGeometry(boxGeo);
  for (var i=0;i<N;i++){
    var m = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({color:0x18191B, metalness:0.35, roughness:0.5, emissive:0xF47A2A, emissiveIntensity:0}));
    var e = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0.5}));
    m.add(e); root.add(m); cubes.push({mesh:m, edge:e});
  }
  var HERO = 6;
  function cityPos(i){ var c=i%4, r=Math.floor(i/4); return [(c-1.5)*0.95, (r-1.5)*0.95]; }

  // scan plane (audit)
  var scanGeo = new THREE.PlaneGeometry(4.3,4.3);
  var scan = new THREE.Mesh(scanGeo, new THREE.MeshBasicMaterial({color:0xF47A2A, transparent:true, opacity:0, side:THREE.DoubleSide, depthWrite:false}));
  scan.rotation.x = -Math.PI/2;
  var scanEdge = new THREE.LineSegments(new THREE.EdgesGeometry(scanGeo), new THREE.LineBasicMaterial({color:0xF47A2A, transparent:true, opacity:0}));
  scan.add(scanEdge); root.add(scan);

  // hierarchy lines (structure)
  var PAIRS = [[0,1],[0,2],[1,3],[1,4],[2,5],[2,6]];
  var treePos = new Float32Array(PAIRS.length*6), treeGeo = new THREE.BufferGeometry();
  treeGeo.setAttribute('position', new THREE.BufferAttribute(treePos,3));
  var treeMat = new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0});
  root.add(new THREE.LineSegments(treeGeo, treeMat));

  // beam (result)
  var beam = new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,1,8), new THREE.MeshBasicMaterial({color:0xF47A2A, transparent:true, opacity:0}));
  root.add(beam);

  // star
  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var glowT = tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.75)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); });
  var sparkT = tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); });
  var star = new THREE.Group(); root.add(star);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); glow.scale.set(2.4,2.4,1); star.add(glow);
  var spark = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkT, transparent:true, depthWrite:false})); spark.scale.set(0.55,0.55,1); star.add(spark);
  star.add(new THREE.PointLight(0xF47A2A, 2.2, 7));

  var FLAG = {3:1, 9:1, 13:1}, KEY = {1:1, 4:1, 6:1, 11:1, 14:1};
  var CASE = [16,10,8,5,4,2,1];
  var hidden = {p:[0,-1.6,0], s:[.001,.001,.001], r:0, hl:0};

  function city(i, hl){ var q=cityPos(i), h=H[i]; return {p:[q[0], -1.6+h/2, q[1]], s:[.7,h,.7], r:0, hl:hl}; }
  function cubeState(s, i){
    if (s===0) return city(i, 0);
    if (s===1){ var layer=i%3, j=Math.floor(i/3); return {p:[((j%3)-1)*0.9, -1.0+layer*1.05, (Math.floor(j/3)-0.5)*0.9], s:[.8,.12,.8], r:0, hl:(layer===2?0.35:0)}; }
    if (s===2) return city(i, FLAG[i]?1:0);
    if (s===3){ var q=cityPos(i); if (KEY[i]){ var h=1.0+((i*7)%5)*0.25; return {p:[q[0],-1.6+h/2,q[1]], s:[.28,h,.28], r:0, hl:1}; } return {p:[q[0],-1.45,q[1]], s:[.22,.22,.22], r:0, hl:0}; }
    if (s===4){
      if (i===0) return {p:[0,1.15,0], s:[1.5,.36,.6], r:0, hl:0.6};
      if (i<3) return {p:[i===1?-1.0:1.0, 0.15,0], s:[.95,.3,.5], r:0, hl:0};
      if (i<7){ var xs=[-1.5,-0.5,0.5,1.5]; return {p:[xs[i-3],-0.85,0], s:[.65,.22,.4], r:0, hl:0}; }
      return hidden;
    }
    if (s===5){ if (i<8){ var hb=0.35+Math.pow(i/7,1.6)*2.8; return {p:[-2.1+i*0.6,-1.6+hb/2,0], s:[.38,hb,.38], r:0, hl:(i===7?1:0)}; } return hidden; }
    if (s===6){ if (i<7){ var hc=CASE[i]*0.18; return {p:[-1.8+i*0.6,-1.6+hc/2,0], s:[.4,hc,.4], r:0, hl:(i<2?1:0)}; } return hidden; }
    return city(i, i===HERO?1:0);
  }
  var heroQ = cityPos(HERO), heroTop = -1.6 + H[HERO];
  function starPos(s){
    if (s===0) return [heroQ[0], 2.3, heroQ[1]];
    if (s===1) return [0, 2.2, 0];
    if (s===2) return [2.0, 1.9, 0];
    if (s===3) return [0, 1.7, 0];
    if (s===4) return [1.2, 1.75, 0];
    if (s===5) return [2.1, 2.0, 0];
    if (s===6) return [-1.8, 1.9, 0];
    return [heroQ[0], 2.8, heroQ[1]];
  }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function ease(t){ return t*t*(3-2*t); }

  var current = scrollStage(), clock = new THREE.Clock();
  var layout = {x:2.2, y:0, z:12};
  function resize(){
    var w=window.innerWidth, h=window.innerHeight;
    renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();
    if (w/h > 1.1){ layout.x=2.2; layout.y=0; layout.z=12; } else { layout.x=0; layout.y=1.9; layout.z=17; }
  }
  window.addEventListener('resize', resize); resize();

  var running = false, tabHidden = false;
  function frame(){
    running = false;
    var time = reduce ? 0 : clock.getElapsedTime();
    current += (scrollStage() - current) * (reduce ? 1 : 0.08);
    updateNav(current);
    var a=Math.floor(current), b=Math.min(a+1,LAST), t=ease(current-a);
    if (a>=LAST){ a=LAST; b=LAST; t=0; }

    camera.position.set(0, 2.2, layout.z); camera.lookAt(0, 0.3, 0);
    root.position.set(layout.x, layout.y, 0);
    root.rotation.y = -0.55 + current*0.1 + Math.sin(time*0.18)*0.06;

    for (var i=0;i<N;i++){
      var A=cubeState(a,i), B=cubeState(b,i), c=cubes[i];
      c.mesh.position.set(lerp(A.p[0],B.p[0],t), lerp(A.p[1],B.p[1],t), lerp(A.p[2],B.p[2],t));
      c.mesh.scale.set(Math.max(.001,lerp(A.s[0],B.s[0],t)), Math.max(.001,lerp(A.s[1],B.s[1],t)), Math.max(.001,lerp(A.s[2],B.s[2],t)));
      c.mesh.rotation.y = lerp(A.r,B.r,t);
      var hl=lerp(A.hl,B.hl,t);
      tmp.copy(CREAM).lerp(ORANGE, hl); c.edge.material.color.copy(tmp); c.edge.material.opacity = 0.45+hl*0.5;
      c.mesh.material.emissiveIntensity = hl*0.2;
    }

    var w2 = Math.max(0, 1-Math.abs(current-2));
    scan.visible = w2 > 0.01;
    scan.position.y = -1.5 + ((time*0.3)%1)*3.2;
    scan.material.opacity = 0.1*w2; scanEdge.material.opacity = 0.7*w2;

    var w4 = Math.max(0, 1-Math.abs(current-4));
    PAIRS.forEach(function(pr,k){
      var p1=cubes[pr[0]].mesh.position, p2=cubes[pr[1]].mesh.position;
      treePos.set([p1.x,p1.y,p1.z,p2.x,p2.y,p2.z], k*6);
    });
    treeGeo.attributes.position.needsUpdate = true; treeMat.opacity = 0.4*w4;

    var SA=starPos(a), SB=starPos(b);
    star.position.set(lerp(SA[0],SB[0],t), lerp(SA[1],SB[1],t)+Math.sin(time*1.2)*0.05, lerp(SA[2],SB[2],t));
    spark.material.rotation = time*0.3;

    var w7 = Math.max(0, 1-Math.abs(current-LAST));
    var bl = Math.max(0.01, star.position.y - heroTop);
    beam.visible = w7 > 0.01;
    beam.scale.y = bl; beam.position.set(heroQ[0], heroTop + bl/2, heroQ[1]);
    beam.material.opacity = 0.75*w7;

    renderer.render(scene, camera);
    if (!reduce && !tabHidden) kick();
  }
  function kick(){ if (!running){ running = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', kick, {passive:true});
  window.addEventListener('resize', kick);
  document.addEventListener('visibilitychange', function(){ tabHidden = document.hidden; if (!tabHidden) kick(); });
  kick();
})();
