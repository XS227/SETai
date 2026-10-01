// /services/: scroll-driven 3D scene, ten service cubes on a ring around the SETAEI "S".
// Stages: 0 start, 1-4 the four service areas, 5 how SETAEI works, 6 questions + contact
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
  scene.fog = new THREE.Fog(0x10100F, 14, 28);
  var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  var CREAM = new THREE.Color(0xFFFAF0), ORANGE = new THREE.Color(0xF47A2A), tmp = new THREE.Color();
  scene.add(new THREE.AmbientLight(0xffffff, 0.32));
  var key = new THREE.DirectionalLight(0xFFFAF0, 0.9); key.position.set(-4,6,6); scene.add(key);
  var rim = new THREE.DirectionalLight(0x5C84AE, 0.8); rim.position.set(5,2,-6); scene.add(rim);
  var root = new THREE.Group(); scene.add(root);

  (function(){
    var g = new THREE.BufferGeometry(), n = 480, a = new Float32Array(n*3);
    for (var i=0;i<n;i++){ a[i*3]=(Math.random()-.5)*22; a[i*3+1]=(Math.random()-.5)*14; a[i*3+2]=-3-Math.random()*9; }
    g.setAttribute('position', new THREE.BufferAttribute(a,3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({color:0xFFFAF0, size:0.035, transparent:true, opacity:0.3})));
  })();

  // 3D "S" from the logo
  function arcPts(pts, cx, cy, r, a0, a1, steps){ for (var k=0;k<=steps;k++){ var a=a0+(a1-a0)*k/steps; pts.push([cx+r*Math.cos(a), cy+r*Math.sin(a)]); } }
  var P=[], D=Math.PI/180;
  P.push([72,0]); P.push([32,0]); arcPts(P,32,29,29,-90*D,-270*D,28); P.push([48,58]); arcPts(P,48,71,13,-90*D,90*D,20);
  P.push([8,84]); P.push([8,100]); P.push([48,100]); arcPts(P,48,71,29,90*D,-90*D,28); P.push([32,42]); arcPts(P,32,29,13,90*D,270*D,20); P.push([72,16]);
  var SC=0.022, shape=new THREE.Shape();
  P.forEach(function(p,k){ var x=(p[0]-40)*SC, y=-(p[1]-50)*SC; if (k===0) shape.moveTo(x,y); else shape.lineTo(x,y); });
  shape.closePath();
  var sGeo = new THREE.ExtrudeGeometry(shape,{depth:0.36, bevelEnabled:false, curveSegments:1}); sGeo.translate(0,0,-0.18);
  var logo = new THREE.Group();
  logo.add(new THREE.Mesh(sGeo, new THREE.MeshStandardMaterial({color:0x1B1C1E, metalness:0.45, roughness:0.38})));
  logo.add(new THREE.LineSegments(new THREE.EdgesGeometry(sGeo,30), new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0.6})));
  root.add(logo);

  // 10 service cubes + labels
  var NAMES = ['Branding','Innhold og AI-video','Web','Nettbutikk','Kampanjer','SEO','AI-drevet SEO','AI-automatisering','SaaS','Utvikling'];
  var GROUP = [1,1,2,2,2,3,3,4,4,4];
  var GCENTER = {1:0.5, 2:3, 3:5.5, 4:8};
  function textSprite(txt){
    var c=document.createElement('canvas'); c.width=512; c.height=96;
    var x=c.getContext('2d');
    function draw(){ x.clearRect(0,0,512,96); x.fillStyle='#FFFAF0'; x.font='500 40px "Space Grotesk", Inter, system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,256,48); }
    draw();
    var map = new THREE.CanvasTexture(c);
    // Redraw once the webfont is in, otherwise the label keeps the fallback font
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ draw(); map.needsUpdate = true; kick(); });
    var s=new THREE.Sprite(new THREE.SpriteMaterial({map:map, transparent:true, depthWrite:false, opacity:0}));
    s.scale.set(1.7,0.32,1); root.add(s); return s;
  }
  var boxGeo = new THREE.BoxGeometry(1,1,1), edgeGeo = new THREE.EdgesGeometry(boxGeo);
  var N=10, cubes=[];
  for (var i=0;i<N;i++){
    var m = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({color:0x18191B, metalness:0.35, roughness:0.5, emissive:0xF47A2A, emissiveIntensity:0}));
    var e = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0.5}));
    m.add(e); root.add(m); cubes.push({mesh:m, edge:e, label:textSprite(NAMES[i])});
  }

  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var glowT = tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.75)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); });
  var sparkT = tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); });
  var star = new THREE.Group(); root.add(star);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); glow.scale.set(2.4,2.4,1); star.add(glow);
  var spark = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkT, transparent:true, depthWrite:false})); spark.scale.set(0.55,0.55,1); star.add(spark);
  star.add(new THREE.PointLight(0xF47A2A, 2.2, 7));

  var R = 2.4, STEP = Math.PI*2/N;
  function ringOffset(s, time){
    if (s>=1 && s<=4) return Math.PI/2 - GCENTER[s]*STEP;
    var sway = Math.sin(time*0.15)*0.35;
    return (s===0 ? Math.PI/2 + 0.5*STEP : Math.PI/2 - 9.5*STEP) + sway;
  }
  function cubeState(s, i, time){
    if (s===5){ var a5=i*0.62, r5=0.35+i*0.24; return {p:[Math.cos(a5)*r5, -1.45+i*0.3, Math.sin(a5)*r5], s:(i===0?.55:.38), hl:(i===0?1:0.15), lab:0}; }
    var off = ringOffset(s, time), a = i*STEP + off;
    var act = (s>=1 && s<=4 && GROUP[i]===s) ? 1 : 0;
    var sc = (s>=1 && s<=4) ? (act ? .62 : .32) : .42;
    return {p:[Math.cos(a)*R, -0.1 + (act?0.15:0), Math.sin(a)*R], s:sc, hl:act ? 1 : (s===6 ? 0.25 : 0), lab:act};
  }
  function logoScale(s){ if (s===0 || s===6) return 1; if (s===5) return 0.001; return 0.55; }
  function starPos(s){
    if (s===0 || s===6) return [1.15,1.45,0.35];
    if (s>=1 && s<=4) return [0, 1.25, R];
    return [Math.cos(9*0.62)*(0.35+9*0.24), -1.45+9*0.3+0.6, Math.sin(9*0.62)*(0.35+9*0.24)];
  }
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
    current += (scrollStage() - current) * (reduce ? 1 : 0.07);
    updateNav(current);
    var a=Math.floor(current), b=Math.min(a+1,LAST), t=ease(current-a);
    if (a>=LAST){ a=LAST; b=LAST; t=0; }

    camera.position.set(0, 1.5, layout.z); camera.lookAt(0, 0.1, 0);
    root.position.set(layout.x, layout.y, 0);
    root.rotation.y = -0.15 + Math.sin(time*0.18)*0.05;

    for (var i=0;i<N;i++){
      var A=cubeState(a,i,time), B=cubeState(b,i,time), c=cubes[i];
      c.mesh.position.set(lerp(A.p[0],B.p[0],t), lerp(A.p[1],B.p[1],t), lerp(A.p[2],B.p[2],t));
      c.mesh.scale.setScalar(Math.max(.001, lerp(A.s,B.s,t)));
      c.mesh.rotation.y = time*0.3 + i; c.mesh.rotation.x = 0.35;
      var hl=lerp(A.hl,B.hl,t);
      tmp.copy(CREAM).lerp(ORANGE, hl); c.edge.material.color.copy(tmp); c.edge.material.opacity = 0.4+hl*0.55;
      c.mesh.material.emissiveIntensity = hl*0.18;
      c.label.position.set(c.mesh.position.x, c.mesh.position.y - 0.62, c.mesh.position.z);
      c.label.material.opacity = lerp(A.lab,B.lab,t);
    }

    var ls = lerp(logoScale(a), logoScale(b), t);
    logo.visible = ls > 0.01; logo.scale.setScalar(Math.max(.001, ls));
    logo.rotation.y = Math.sin(time*0.35)*0.35 - 0.1;

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
