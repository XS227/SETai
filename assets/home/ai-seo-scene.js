// /services/ai-drevet-seo/: scroll-driven 3D scene (agents around a core) behind the sections.
// Stages: 0 start, 1 result, 2 method, 3 agents, 4 data, 5 credentials, 6 why SETAEI + contact
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

  var boxGeo = new THREE.BoxGeometry(1,1,1), edgeGeo = new THREE.EdgesGeometry(boxGeo);
  function makeCube(){
    var m = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({color:0x18191B, metalness:0.35, roughness:0.5, emissive:0xF47A2A, emissiveIntensity:0}));
    var e = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0.5}));
    m.add(e); root.add(m); return {mesh:m, edge:e};
  }
  var N = 10, cubes = []; for (var i=0;i<N;i++) cubes.push(makeCube());

  // core (the website): octahedron
  var coreGeo = new THREE.OctahedronGeometry(0.75, 0);
  var core = new THREE.Mesh(coreGeo, new THREE.MeshStandardMaterial({color:0x1B1C1E, metalness:0.5, roughness:0.35}));
  core.add(new THREE.LineSegments(new THREE.EdgesGeometry(coreGeo), new THREE.LineBasicMaterial({color:0xF47A2A, transparent:true, opacity:0.85})));
  root.add(core);

  // agent links (cubes 0-3 to core) and pipeline line (cubes 0-3)
  var linkPos = new Float32Array(4*6), linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPos,3));
  var linkMat = new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0});
  root.add(new THREE.LineSegments(linkGeo, linkMat));
  var pipePos = new Float32Array(4*3), pipeGeo = new THREE.BufferGeometry();
  pipeGeo.setAttribute('position', new THREE.BufferAttribute(pipePos,3));
  var pipeMat = new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0});
  root.add(new THREE.Line(pipeGeo, pipeMat));

  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var glowT = tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.75)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); });
  var sparkT = tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); });
  var star = new THREE.Group(); root.add(star);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); glow.scale.set(2.4,2.4,1); star.add(glow);
  var spark = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkT, transparent:true, depthWrite:false})); spark.scale.set(0.55,0.55,1); star.add(spark);
  star.add(new THREE.PointLight(0xF47A2A, 2.2, 7));

  var hidden = {p:[0,0,0], s:[.001,.001,.001], r:0, hl:0};
  var RANKH = [3.0,1.53,1.48,1.35,0.64];
  function cubeState(s, i, time){
    if (s===0){ if (i<4){ var a=i*Math.PI/2 + time*0.35; return {p:[Math.cos(a)*1.9, Math.sin(a*2)*0.25, Math.sin(a)*1.9], s:[.45,.45,.45], r:time*0.5+i, hl:(i===3?0.7:0)}; } return hidden; }
    if (s===1){ return {p:[0, 1.9-i*0.42, 0], s:[2.6,.12,.9], r:0, hl:(i===6?1:0)}; }
    if (s===2){ if (i<4) return {p:[-2.1+i*1.4, 0, 0], s:[.6,.6,.6], r:0.4, hl:0}; return hidden; }
    if (s===3){ if (i<4){ var xs=[-1.6,1.6,-1.6,1.6], ys=[1.1,1.1,-1.1,-1.1]; return {p:[xs[i], ys[i], 0], s:[.6,.6,.6], r:time*0.4+i, hl:0}; } return hidden; }
    if (s===4){ if (i<5){ var h=RANKH[i]; return {p:[-1.6+i*0.8, -1.6+h/2, 0], s:[.45,h,.45], r:0, hl:(i===0?1:0)}; } return hidden; }
    if (s===5){ if (i<4){ return {p:[i%2?0.8:-0.8, -0.9, i<2?0.6:-0.6], s:[.45,1.4,.45], r:0, hl:0}; } if (i===4) return {p:[0,-0.11,0], s:[2.4,.18,1.8], r:0, hl:0.5}; return hidden; }
    if (i<5){ var b=i*Math.PI*2/5 + time*0.2; return {p:[Math.cos(b)*2.0, -0.2+Math.sin(b*2)*0.15, Math.sin(b)*2.0], s:[.42,.42,.42], r:time*0.5+i, hl:0}; }
    return hidden;
  }
  function starPos(s, time){
    if (s===0 || s===6) return [0,1.65,0];
    if (s===1) return [-1.65, 1.9-6*0.42, 0.2];
    if (s===2){ var f=(time*0.22)%1; return [-2.1+f*4.2, 0.65, 0]; }
    if (s===3) return [0,1.25,0.2];
    if (s===4) return [-1.6, 1.85, 0];
    return [0, 0.9, 0];
  }
  function coreW(st){ return Math.max(0, 1-Math.abs(st-0), 1-Math.abs(st-3), 1-Math.abs(st-6)); }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function ease(t){ return t*t*(3-2*t); }

  var current = scrollStage(), clock = new THREE.Clock();
  var layout = {x:2.3, y:0, z:12};
  function resize(){
    var w=window.innerWidth, h=window.innerHeight;
    renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();
    if (w/h > 1.1){ layout.x=2.3; layout.y=0; layout.z=12; } else { layout.x=0; layout.y=1.9; layout.z=17; }
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

    camera.position.set(0, 1.4, layout.z); camera.lookAt(0, 0.2, 0);
    root.position.set(layout.x, layout.y, 0);
    root.rotation.y = -0.45 + current*0.08 + Math.sin(time*0.18)*0.06;

    for (var i=0;i<N;i++){
      var A=cubeState(a,i,time), B=cubeState(b,i,time), c=cubes[i];
      c.mesh.position.set(lerp(A.p[0],B.p[0],t), lerp(A.p[1],B.p[1],t), lerp(A.p[2],B.p[2],t));
      c.mesh.scale.set(Math.max(.001,lerp(A.s[0],B.s[0],t)), Math.max(.001,lerp(A.s[1],B.s[1],t)), Math.max(.001,lerp(A.s[2],B.s[2],t)));
      c.mesh.rotation.y = lerp(A.r,B.r,t);
      var hl=lerp(A.hl,B.hl,t);
      tmp.copy(CREAM).lerp(ORANGE, hl); c.edge.material.color.copy(tmp); c.edge.material.opacity = 0.45+hl*0.5;
      c.mesh.material.emissiveIntensity = hl*0.2;
    }

    var cw = coreW(current);
    core.visible = cw > 0.01; core.scale.setScalar(Math.max(.001, cw));
    core.rotation.y = time*0.4; core.rotation.x = Math.sin(time*0.3)*0.2;

    for (var k=0;k<4;k++){ var p=cubes[k].mesh.position; linkPos.set([p.x,p.y,p.z,0,0,0], k*6); pipePos.set([p.x,p.y,p.z], k*3); }
    linkGeo.attributes.position.needsUpdate = true; pipeGeo.attributes.position.needsUpdate = true;
    linkMat.opacity = 0.4*Math.max(0, 1-Math.abs(current-3)) + 0.18*Math.max(0, 1-Math.abs(current-0));
    pipeMat.opacity = 0.4*Math.max(0, 1-Math.abs(current-2));

    var SA=starPos(a,time), SB=starPos(b,time);
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
