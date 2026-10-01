// /services/saas-utvikler-oslo/: scroll-driven 3D platform (3 layers x 4 blocks + 4 tenants) behind the sections.
// Stages: 0 start, 1 idea, 2 design, 3 architecture, 4 development, 5 payments/integrations, 6 AI, 7 operations, 8 growth, 9 TrustAI case, 10 contact
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

  var boxGeo = new THREE.BoxGeometry(1,1,1), edgeGeo = new THREE.EdgesGeometry(boxGeo);
  var N = 16, cubes = [];
  for (var i=0;i<N;i++){
    var m = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({color:0x18191B, metalness:0.38, roughness:0.45, emissive:0xF47A2A, emissiveIntensity:0}));
    var e = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0.5}));
    m.add(e); root.add(m); cubes.push({mesh:m, edge:e});
  }

  function textSprite(txt, color){
    var c=document.createElement('canvas'); c.width=512; c.height=96;
    var x=c.getContext('2d');
    function draw(){ x.clearRect(0,0,512,96); x.fillStyle=color||'#D6D0C4'; x.font='500 40px "Space Grotesk", Inter, system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,256,48); }
    draw();
    var map = new THREE.CanvasTexture(c);
    // Redraw once the webfont is in, otherwise the label keeps the fallback font
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ draw(); map.needsUpdate = true; kick(); });
    var s=new THREE.Sprite(new THREE.SpriteMaterial({map:map, transparent:true, depthWrite:false, opacity:0}));
    s.scale.set(1.5,0.28,1); root.add(s); return s;
  }
  var layerLabels = ['Data','API','Grensesnitt'].map(function(t){ return textSprite(t); });
  var INTEG = ['Shopify','Betaling','E-post','CRM'];
  var integLabels = INTEG.map(function(t){ return textSprite(t,'#FFFAF0'); });
  var INTPOS = [[-2.3,0.1,0.4],[2.3,0.1,0.4],[-1.3,1.4,-1.2],[1.3,1.4,-1.2]];

  var intPos = new Float32Array(4*6), intGeo = new THREE.BufferGeometry();
  intGeo.setAttribute('position', new THREE.BufferAttribute(intPos,3));
  var intMat = new THREE.LineBasicMaterial({color:0xF47A2A, transparent:true, opacity:0});
  root.add(new THREE.LineSegments(intGeo, intMat));

  var ring = new THREE.Mesh(new THREE.TorusGeometry(1.5,0.018,8,96), new THREE.MeshBasicMaterial({color:0xF47A2A, transparent:true, opacity:0}));
  ring.rotation.x = Math.PI/2; root.add(ring);
  var ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.1,0.012,8,96), new THREE.MeshBasicMaterial({color:0xF47A2A, transparent:true, opacity:0}));
  ring2.rotation.x = Math.PI/2; root.add(ring2);

  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var glowT = tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.75)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); });
  var sparkT = tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); });
  var star = new THREE.Group(); root.add(star);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); glow.scale.set(2.4,2.4,1); star.add(glow);
  var spark = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkT, transparent:true, depthWrite:false})); spark.scale.set(0.55,0.55,1); star.add(spark);
  star.add(new THREE.PointLight(0xF47A2A, 2.2, 7));

  var hidden = {p:[0,-0.6,0], s:[.001,.001,.001], r:0, hl:0};
  function gx(k){ return (k%2-0.5)*1.0; } function gz(k){ return (Math.floor(k/2)-0.5)*1.0; }
  function platform(i, lift, time, wave){
    var L=Math.floor(i/4), k=i%4, y=-1.2+L*0.42+(lift||0);
    var s = L<2 ? [.95,.38,.95] : [.95,.12,.95];
    var hl = L===2 ? 0.35 : 0;
    if (wave){ hl = Math.pow(Math.max(0, Math.sin(time*2.2 - L*1.3)), 6); }
    return {p:[gx(k), y + (L===2?-0.13:0), gz(k)], s:s, r:0, hl:hl};
  }
  function tenantOrbit(k, time, radius, y, speed, hl){
    var a = k*Math.PI/2 + time*speed; return {p:[Math.cos(a)*radius, y, Math.sin(a)*radius], s:[.32,.32,.32], r:time+k, hl:hl};
  }
  function cubeState(s, i, time){
    var tenant = i>=12, k = i-12;
    if (s===0 || s===9 || s===10){
      if (!tenant) return platform(i,0,time,false);
      return tenantOrbit(k, time, 2.3, -0.4, 0.3, s===9?1:0);
    }
    if (s===1){ if (i===0) return {p:[0,-0.2,0], s:[.7,.7,.7], r:time*0.5, hl:1}; return hidden; }
    if (s===2){
      if (i<4) return {p:[-1.5+i*1.0, 0.3, -Math.abs(i-1.5)*0.35], s:[.85,1.15,.04], r:(i-1.5)*-0.28, hl:(i===1?0.7:0.1)};
      if (i<12) return {p:[-1.4+(i-4)*0.4, -0.9, 0.4], s:[.18,.18,.18], r:time*0.6+i, hl:((i%3)===0?1:0)};
      return hidden;
    }
    if (s===3){
      if (tenant) return hidden;
      var L=Math.floor(i/4), q=i%4; return {p:[gx(q), -1.5+L*1.25, gz(q)], s:[.9,.22,.9], r:0, hl:(L===2?0.5:0)};
    }
    if (s===4){ if (tenant) return hidden; return platform(i,0,time,true); }
    if (s===5){ if (!tenant) return platform(i,0,time,false); var ip=INTPOS[k]; return {p:ip, s:[.42,.42,.42], r:time*0.4+k, hl:0.6}; }
    if (s===6){ if (!tenant) return platform(i,0,time,false); return tenantOrbit(k, time, 1.7, 0.7, 0.7, 1); }
    if (s===7){ if (!tenant) return platform(i,0.55,time,false); return tenantOrbit(k, time, 2.1, -1.0, 0.25, 0); }
    if (!tenant) return platform(i,0,time,false);
    var a8 = Math.PI/4 + k*0.55; return {p:[Math.cos(a8)*2.5, -1.0+k*0.6, Math.sin(a8)*2.5], s:[.38,.38,.38], r:time*0.4+k, hl:k/3};
  }
  function starPos(s){
    switch(s){
      case 1: return [0.75,0.55,0.3];
      case 2: return [-0.5,1.25,0.3];
      case 3: return [1.35,1.6,0];
      case 4: return [0,0.6,0];
      case 5: return [0,0.75,0];
      case 6: return [0,1.35,0];
      case 7: return [0,1.6,0];
      case 8: var a=Math.PI/4+3*0.55; return [Math.cos(a)*2.5, 1.45, Math.sin(a)*2.5];
      default: return [0,1.0,0];
    }
  }
  function weight(st,k){ return Math.max(0, 1-Math.abs(st-k)); }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function ease(t){ return t*t*(3-2*t); }

  var current = scrollStage(), clock = new THREE.Clock();
  var layout = {x:2.2, y:0, z:12};
  function resize(){
    var ww=window.innerWidth, hh=window.innerHeight;
    renderer.setSize(ww,hh,false); camera.aspect=ww/hh; camera.updateProjectionMatrix();
    if (ww/hh > 1.1){ layout.x=2.2; layout.y=0; layout.z=12; } else { layout.x=0; layout.y=1.9; layout.z=17; }
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

    camera.position.set(0, 2.0, layout.z); camera.lookAt(0, 0.1, 0);
    root.position.set(layout.x, layout.y, 0);
    root.rotation.y = -0.55 + current*0.09 + Math.sin(time*0.18)*0.06;

    for (var i=0;i<N;i++){
      var A=cubeState(a,i,time), B=cubeState(b,i,time), c=cubes[i];
      c.mesh.position.set(lerp(A.p[0],B.p[0],t), lerp(A.p[1],B.p[1],t), lerp(A.p[2],B.p[2],t));
      c.mesh.scale.set(Math.max(.001,lerp(A.s[0],B.s[0],t)), Math.max(.001,lerp(A.s[1],B.s[1],t)), Math.max(.001,lerp(A.s[2],B.s[2],t)));
      c.mesh.rotation.y = lerp(A.r,B.r,t);
      var hl=lerp(A.hl,B.hl,t);
      tmp.copy(CREAM).lerp(ORANGE, hl); c.edge.material.color.copy(tmp); c.edge.material.opacity = 0.42+hl*0.55;
      c.mesh.material.emissiveIntensity = hl*0.2;
    }

    var w3=weight(current,3), w5=weight(current,5), w7=weight(current,7);
    layerLabels.forEach(function(s,L){ s.position.set(-1.6, -1.5+L*1.25, 0.6); s.material.opacity = w3; });
    for (var k=0;k<4;k++){
      var cp = cubes[12+k].mesh.position;
      integLabels[k].position.set(cp.x, cp.y-0.45, cp.z); integLabels[k].material.opacity = w5;
      intPos.set([cp.x,cp.y,cp.z, 0,-0.8,0], k*6);
    }
    intGeo.attributes.position.needsUpdate = true; intMat.opacity = 0.5*w5;
    var pulse = (time*0.5)%1;
    ring.position.y = -1.45; ring.material.opacity = 0.8*w7; ring.scale.setScalar(1+pulse*0.25);
    ring2.position.y = -1.45; ring2.material.opacity = 0.35*w7*(1-pulse); ring2.scale.setScalar(1+pulse*0.4);

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
