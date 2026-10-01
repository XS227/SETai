// /services/web-design-oslo/: scroll-driven 3D "browser" built from blocks behind the sections.
// Stages: 0 start, 1 first impression, 2 customer journey (funnel), 3 booking (calendar), 4 landing pages,
// 5 speed/mobile/SEO (phone + gauge), 6 projects (three sites), 7 process + contact
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

  var boxGeo = new THREE.BoxGeometry(1,1,1), edgeGeo = new THREE.EdgesGeometry(boxGeo);
  var N = 16, cubes = [];
  for (var i=0;i<N;i++){
    var m = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({color:0x18191B, metalness:0.35, roughness:0.48, emissive:0xF47A2A, emissiveIntensity:0}));
    var e = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0.5}));
    m.add(e); root.add(m); cubes.push({mesh:m, edge:e});
  }

  function textSprite(txt){
    var c=document.createElement('canvas'); c.width=512; c.height=96;
    var x=c.getContext('2d');
    function draw(){ x.clearRect(0,0,512,96); x.fillStyle='#FFFAF0'; x.font='500 40px "Space Grotesk", Inter, system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,256,48); }
    draw();
    var map = new THREE.CanvasTexture(c);
    // Redraw once the webfont is in, otherwise the label keeps the fallback font
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ draw(); map.needsUpdate = true; kick(); });
    var s=new THREE.Sprite(new THREE.SpriteMaterial({map:map, transparent:true, depthWrite:false, opacity:0}));
    s.scale.set(1.6,0.3,1); root.add(s); return s;
  }
  var caseLabels = ['SOMI Klinikken','Styrk Karriere','Volla Byggmester'].map(textSprite);

  var funnel = [1.45,0.95,0.5].map(function(r){
    var t = new THREE.Mesh(new THREE.TorusGeometry(r,0.012,8,80), new THREE.MeshBasicMaterial({color:0xF47A2A, transparent:true, opacity:0}));
    t.rotation.x = Math.PI/2; root.add(t); return t;
  });
  var gauge = new THREE.Mesh(new THREE.TorusGeometry(1.45,0.02,8,96,Math.PI*1.5), new THREE.MeshBasicMaterial({color:0xF47A2A, transparent:true, opacity:0}));
  root.add(gauge);

  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var glowT = tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.75)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); });
  var sparkT = tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); });
  var star = new THREE.Group(); root.add(star);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); glow.scale.set(2.4,2.4,1); star.add(glow);
  var spark = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkT, transparent:true, depthWrite:false})); spark.scale.set(0.55,0.55,1); star.add(spark);
  star.add(new THREE.PointLight(0xF47A2A, 2.2, 7));

  var H = {p:[0,0,0], s:[.001,.001,.001], r:0, hl:0};
  function S(p,s,r,hl){ return {p:p, s:s, r:r||0, hl:hl||0}; }
  // 0 frame, 1 bar, 2 hero, 3-5 cards, 6 button, 7-15 extras
  function browser(i, heroHl){
    if (i===0) return S([0,0,-0.05],[3.2,2.2,.08]);
    if (i===1) return S([0,1.0,0.02],[3.2,.18,.1]);
    if (i===2) return S([0,0.42,0.06],[2.8,.62,.08],0,heroHl);
    if (i>=3 && i<=5) return S([(i-4)*1.0,-0.45,0.06],[.85,.62,.08]);
    if (i===6) return S([-0.85,0.32,0.14],[.6,.16,.08],0,1);
    return H;
  }
  function visitorIndex(i){ return (i>=3 && i<=5) ? i-3 : (i>=7 ? i-4 : -1); }
  function cubeState(s, i, time){
    if (s===0 || s===7) return browser(i, 0);
    if (s===1) return browser(i, 1);
    if (s===2){
      if (i===6) return S([0,-1.55,0],[.42,.42,.42],time*0.5,1);
      var v = visitorIndex(i); if (v<0) return H;
      var f = ((v/12) + time*0.1) % 1, r = 1.55*(1-f)+0.12, a = v*2.4 + f*5;
      var sc = 0.2*Math.pow(Math.sin(Math.min(1,f*1.15)*Math.PI*0.5+0.0001),0.2);
      return S([Math.cos(a)*r, 1.6-f*3.0, Math.sin(a)*r],[sc,sc,sc],time+v, f>0.85?1:0);
    }
    if (s===3){
      if (i===0) return S([0,0,-0.08],[3.4,2.7,.08]);
      if (i===1) return S([0,1.38,0],[3.4,.22,.1]);
      if (i===2) return H;
      if (i===6) return S([0.375,0,0.38],[.6,.6,.12],0,1);
      var v3 = visitorIndex(i); if (v3<0 || v3>11) return H;
      var slot = v3 >= 6 ? v3+1 : v3; if (slot>11) return H;
      var c = slot%4, rr = Math.floor(slot/4);
      return S([(c-1.5)*0.75, (1-rr)*0.75, 0.02],[.6,.6,.08]);
    }
    if (s===4){
      if (i===0) return S([0,0,-0.05],[1.5,2.8,.08]);
      if (i===1) return S([0,1.33,0.02],[1.5,.14,.1]);
      if (i===2) return S([0,0.7,0.06],[1.3,.8,.08]);
      if (i===6) return S([0,-0.85,0.12],[.9,.26,.1],0,1);
      if (i>=7 && i<=10){ var k=i-7, side = k%2 ? 1 : -1, f4=((k/4)+time*0.18)%1, y4 = 0.6 - k*0.45;
        var sc4 = 1 - f4*0.6; return S([side*(3.2 - f4*2.6), y4, 0.5 - f4*0.3],[.7*sc4,.42*sc4,.05], side*-0.4*(1-f4), f4>0.75?1:0.2); }
      return H;
    }
    if (s===5){
      if (i===0) return S([0,0,-0.05],[1.05,2.05,.1]);
      if (i===1) return S([0,0.94,0.02],[1.05,.1,.11]);
      if (i===2) return S([0,0.5,0.06],[.85,.5,.08]);
      if (i>=3 && i<=5) return S([0,-0.08-(i-3)*0.27,0.06],[.85,.2,.08]);
      if (i===6) return S([0,-0.82,0.1],[.55,.13,.08],0,1);
      return H;
    }
    // s===6: three sites side by side
    if (i>=7 && i<=9){ var b=i-7; return S([(b-1)*1.9, 0, -Math.abs(b-1)*0.4],[1.6,1.05,.06],(b-1)*-0.3, b===1?0.4:0.15); }
    if (i>=10 && i<=12){ var b2=i-10; return S([(b2-1)*1.9, 0.5, -Math.abs(b2-1)*0.4+0.02],[1.6,.1,.08],(b2-1)*-0.3); }
    if (i>=13 && i<=15){ var b3=i-13; return S([(b3-1)*1.9-0.35, 0.12, -Math.abs(b3-1)*0.4+0.05],[.55,.12,.06],(b3-1)*-0.3,1); }
    return H;
  }
  function starPos(s){
    switch(s){
      case 1: return [-1.75,0.75,0.4];
      case 2: return [0.55,-1.25,0.4];
      case 3: return [0.375,0.65,0.5];
      case 4: return [0.75,-0.75,0.35];
      case 5: return [0,1.45,0.3];
      case 6: return [0,1.25,0.2];
      default: return [1.75,1.35,0.3];
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

    camera.position.set(0, 1.0, layout.z); camera.lookAt(0, 0.1, 0);
    root.position.set(layout.x, layout.y, 0);
    root.rotation.y = -0.4 + Math.sin(time*0.2)*0.07;
    root.rotation.x = 0.05;

    for (var i=0;i<N;i++){
      var A=cubeState(a,i,time), B=cubeState(b,i,time), c=cubes[i];
      c.mesh.position.set(lerp(A.p[0],B.p[0],t), lerp(A.p[1],B.p[1],t), lerp(A.p[2],B.p[2],t));
      c.mesh.scale.set(Math.max(.001,lerp(A.s[0],B.s[0],t)), Math.max(.001,lerp(A.s[1],B.s[1],t)), Math.max(.001,lerp(A.s[2],B.s[2],t)));
      c.mesh.rotation.y = lerp(A.r,B.r,t);
      var hl=lerp(A.hl,B.hl,t);
      tmp.copy(CREAM).lerp(ORANGE, hl); c.edge.material.color.copy(tmp); c.edge.material.opacity = 0.42+hl*0.55;
      c.mesh.material.emissiveIntensity = hl*0.25;
    }

    var w2=weight(current,2), w5=weight(current,5), w6=weight(current,6);
    funnel.forEach(function(r,k){ r.position.y = 1.2 - k*1.0; r.material.opacity = 0.45*w2; });
    gauge.material.opacity = 0.75*w5; gauge.rotation.z = -time*0.8;
    caseLabels.forEach(function(sp,k){ sp.position.set((k-1)*1.9, -0.8, -Math.abs(k-1)*0.4+0.2); sp.material.opacity = w6; });

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
