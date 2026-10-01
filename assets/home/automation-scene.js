// /services/ai-automation/: scroll-driven 3D scene behind the sections.
// Stages: 0 start (messy pile), 1 three areas (rails), 2 mapping, 3 pilot, 4 systems hub, 5 follow-up, 6 what you get
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
  var N = 12, cubes = [];
  for (var i=0;i<N;i++){
    var m = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({color:0x18191B, metalness:0.35, roughness:0.5, emissive:0xF47A2A, emissiveIntensity:0}));
    var e = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0.5}));
    m.add(e); root.add(m); cubes.push({mesh:m, edge:e});
  }

  function textSprite(txt){
    var c = document.createElement('canvas'); c.width=512; c.height=96;
    var x = c.getContext('2d');
    function draw(){ x.clearRect(0,0,512,96); x.fillStyle='#D6D0C4'; x.font='500 42px "Space Grotesk", Inter, system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,256,48); }
    draw();
    var map = new THREE.CanvasTexture(c);
    // Redraw once the webfont is in, otherwise the label keeps the fallback font
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ draw(); map.needsUpdate = true; kick(); });
    var s = new THREE.Sprite(new THREE.SpriteMaterial({map:map, transparent:true, depthWrite:false, opacity:0}));
    s.scale.set(1.7,0.32,1); root.add(s); return s;
  }

  // rails (stage 1)
  var rails = [], railLabels = [];
  var RAILY = [0.9, 0, -0.9], RAILT = ['Kundedialog','Leads','Interne prosesser'];
  RAILY.forEach(function(y,k){
    var g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.5,y-0.25,0), new THREE.Vector3(2.5,y-0.25,0)]);
    var l = new THREE.Line(g, new THREE.LineBasicMaterial({color:0xF47A2A, transparent:true, opacity:0})); root.add(l); rails.push(l);
    var s = textSprite(RAILT[k]); s.position.set(3.4, y, 0); railLabels.push(s);
  });

  // pilot frame (stage 3)
  var frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.9,1.9,1.9));
  var pilotFrame = new THREE.LineSegments(frameGeo, new THREE.LineBasicMaterial({color:0xF47A2A, transparent:true, opacity:0})); root.add(pilotFrame);

  // hub core + spokes + labels (stage 4)
  var coreGeo = new THREE.OctahedronGeometry(0.6, 0);
  var core = new THREE.Mesh(coreGeo, new THREE.MeshStandardMaterial({color:0x1B1C1E, metalness:0.5, roughness:0.35}));
  core.add(new THREE.LineSegments(new THREE.EdgesGeometry(coreGeo), new THREE.LineBasicMaterial({color:0xF47A2A, transparent:true, opacity:0.85})));
  root.add(core);
  var SYS = [], SYST = ['CRM','E-post','Nettside','Kalender','Regnskap'];
  for (var s=0;s<5;s++){ var ang=(90+s*72)*Math.PI/180; SYS.push([Math.cos(ang)*2.1, Math.sin(ang)*1.75, Math.sin(s*1.7)*0.4]); }
  var sysLabels = SYST.map(function(tx){ var sp=textSprite(tx); sp.scale.set(1.3,0.25,1); return sp; });
  var spokePos = new Float32Array(5*6), spokeGeo = new THREE.BufferGeometry();
  spokeGeo.setAttribute('position', new THREE.BufferAttribute(spokePos,3));
  var spokeMat = new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0});
  root.add(new THREE.LineSegments(spokeGeo, spokeMat));

  // star
  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var glowT = tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.75)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); });
  var sparkT = tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); });
  var star = new THREE.Group(); root.add(star);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); glow.scale.set(2.4,2.4,1); star.add(glow);
  var spark = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkT, transparent:true, depthWrite:false})); spark.scale.set(0.55,0.55,1); star.add(spark);
  star.add(new THREE.PointLight(0xF47A2A, 2.2, 7));

  var PILE = [[-1.1,-1.35,0.3],[-0.3,-1.35,-0.4],[0.6,-1.35,0.2],[1.3,-1.35,-0.3],[-0.7,-0.82,0],[0.2,-0.8,0.1],[1.0,-0.85,-0.2],[-0.3,-0.27,-0.1],[0.55,-0.3,0.15],[0.1,0.24,0],[-1.7,-1.35,-0.6],[1.85,-1.35,0.5]];
  var H2 = [0.4,1.6,0.5,0.7, 2.4,0.6,0.5,1.9, 0.8,0.4,0.6,0.5];
  var hidden = {p:[0,-1.4,0], s:[.001,.001,.001], r:[0,0,0], hl:0};

  function cubeState(s, i, time){
    if (s===0){ var q=PILE[i], w=Math.sin(time*0.8+i)*0.04; return {p:[q[0],q[1]+w,q[2]], s:[.55,.55,.55], r:[(i*0.7)%1.2-0.4, i*1.3, (i*0.45)%0.9-0.3], hl:0}; }
    if (s===1){ var k=i%3, j=Math.floor(i/3), f=((j/4)+time*0.08)%1; var sc=0.4*Math.pow(Math.sin(f*Math.PI),0.3); return {p:[-2.5+f*5.0, RAILY[k], 0], s:[sc,sc,sc], r:[0,time*0.6+i,0], hl:(f>0.85?1:0)}; }
    if (s===2){ var c=i%4, r=Math.floor(i/4), h=H2[i]; return {p:[(c-1.5)*0.9, -1.5+h/2, (r-1)*0.9], s:[.6,h,.6], r:[0,0,0], hl:(h>1.5?1:0)}; }
    if (s===3){ if (i===4) return {p:[0,0,0], s:[.9,.9,.9], r:[0.3,time*0.5,0], hl:1}; var c3=i%4, r3=Math.floor(i/4); return {p:[(c3-1.5)*1.1, -1.5, -2.2+(r3-1)*0.6], s:[.2,.2,.2], r:[0,0,0], hl:0}; }
    if (s===4){
      if (i<5){ var q4=SYS[i]; return {p:q4, s:[.5,.5,.5], r:[0.3,0.5+time*0.2,0], hl:0}; }
      if (i<10){ var k4=i-5, f4=((time*0.35)+k4*0.21)%1, sp=SYS[k4]; return {p:[sp[0]*(1-f4), sp[1]*(1-f4), sp[2]*(1-f4)], s:[.14,.14,.14], r:[0,0,0], hl:1}; }
      return hidden;
    }
    if (s===5){ if (i<8){ var a5=i*Math.PI*2/8 + time*0.3; return {p:[Math.cos(a5)*1.9, -0.2, Math.sin(a5)*1.9], s:[.42,.42,.42], r:[0,-a5,0], hl:Math.pow(Math.max(0,Math.sin(a5)),6)}; } return hidden; }
    var lay=Math.floor(i/4); return {p:[(i%2-0.5)*0.62, -1.3+lay*0.62, (Math.floor(i/2)%2-0.5)*0.62], s:[.58,.58,.58], r:[0,0,0], hl:(lay===2?0.6:0)};
  }
  function starPos(s){
    if (s===0) return [0.2, 1.3, 0.2];
    if (s===1) return [2.6, 1.6, 0];
    if (s===2) return [0.45, 1.6, 0];
    if (s===3) return [0, 1.5, 0];
    if (s===4) return [0, 0, 0.9];
    if (s===5) return [0, 1.0, 0];
    return [0, 0.9, 0];
  }
  function weight(st, k){ return Math.max(0, 1-Math.abs(st-k)); }
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
    current += (scrollStage() - current) * (reduce ? 1 : 0.08);
    updateNav(current);
    var a=Math.floor(current), b=Math.min(a+1,LAST), t=ease(current-a);
    if (a>=LAST){ a=LAST; b=LAST; t=0; }

    camera.position.set(0, 1.6, layout.z); camera.lookAt(0, 0.1, 0);
    root.position.set(layout.x, layout.y, 0);
    root.rotation.y = -0.35 + current*0.06 + Math.sin(time*0.18)*0.06;

    for (var i=0;i<N;i++){
      var A=cubeState(a,i,time), B=cubeState(b,i,time), c=cubes[i];
      c.mesh.position.set(lerp(A.p[0],B.p[0],t), lerp(A.p[1],B.p[1],t), lerp(A.p[2],B.p[2],t));
      c.mesh.scale.set(Math.max(.001,lerp(A.s[0],B.s[0],t)), Math.max(.001,lerp(A.s[1],B.s[1],t)), Math.max(.001,lerp(A.s[2],B.s[2],t)));
      c.mesh.rotation.set(lerp(A.r[0],B.r[0],t), lerp(A.r[1],B.r[1],t), lerp(A.r[2],B.r[2],t));
      var hl=lerp(A.hl,B.hl,t);
      tmp.copy(CREAM).lerp(ORANGE, hl); c.edge.material.color.copy(tmp); c.edge.material.opacity = 0.45+hl*0.5;
      c.mesh.material.emissiveIntensity = hl*0.2;
    }

    var w1=weight(current,1), w3=weight(current,3), w4=weight(current,4);
    rails.forEach(function(l){ l.material.opacity = 0.45*w1; });
    railLabels.forEach(function(sp){ sp.material.opacity = w1; });
    pilotFrame.material.opacity = 0.7*w3; pilotFrame.rotation.y = time*0.2; pilotFrame.visible = w3 > 0.01;
    core.visible = w4 > 0.01; core.scale.setScalar(Math.max(.001,w4)); core.rotation.y = time*0.4;
    for (var k=0;k<5;k++){ var sp=SYS[k]; spokePos.set([sp[0],sp[1],sp[2],0,0,0], k*6); sysLabels[k].position.set(sp[0], sp[1]-0.48, sp[2]); sysLabels[k].material.opacity = w4; }
    spokeGeo.attributes.position.needsUpdate = true; spokeMat.opacity = 0.3*w4;

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
