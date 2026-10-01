// /branding/: the official SETAEI wordmark (assets/brand/setaei-wordmark.svg) built in 3D from its strokes.
// Stages follow the [data-stage] sections: 0 hero (scattered), 1 logo, 2 construction, 3 the star, 4 variants,
// 5 colours, 6 typography, 7 icons (≡ motif), 8 motion (star orbit), 9 surfaces (S + star icon), 10 language.
(function(){
  // swatches: copy the hex code
  var note = document.querySelector('.copied');
  Array.prototype.forEach.call(document.querySelectorAll('.sw'), function(b){
    b.addEventListener('click', function(){
      var hex = b.getAttribute('data-hex');
      function done(ok){ if (note) note.textContent = ok ? hex + ' er kopiert' : 'Fargekode: ' + hex; }
      try { navigator.clipboard.writeText(hex).then(function(){ done(true); }, function(){ done(false); }); } catch(e){ done(false); }
    });
  });

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
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  var key = new THREE.DirectionalLight(0xFFF4E6, 0.95); key.position.set(-3,5,7); scene.add(key);
  var rim = new THREE.DirectionalLight(0x5C84AE, 0.7); rim.position.set(5,2,-6); scene.add(rim);
  var root = new THREE.Group(); scene.add(root);
  (function(){
    var g = new THREE.BufferGeometry(), n = 480, a = new Float32Array(n*3);
    for (var i=0;i<n;i++){ a[i*3]=(Math.random()-.5)*22; a[i*3+1]=(Math.random()-.5)*14; a[i*3+2]=-3-Math.random()*9; }
    g.setAttribute('position', new THREE.BufferAttribute(a,3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({color:0xFFFAF0, size:0.035, transparent:true, opacity:0.3})));
  })();

  // Wordmark space (viewBox 15 15 545 105) -> scene units, centred
  var K = 0.0078, DEPTH = 0.16, STROKE = 16, CX = 287.5, CY = 67.5;
  function W(x){ return (x-CX)*K; } function Hy(y){ return -(y-CY)*K; }
  var COL = {cream:new THREE.Color(0xFFF7EA), dark:new THREE.Color(0x10100F), orange:new THREE.Color(0xF47A2A), dim:new THREE.Color(0x3A3936)};
  var parts = [];
  function addPart(geo, cx, cy, rotZ, kind){
    var m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color:kind==='star'?0xF47A2A:0xFFF7EA, metalness:0.15, roughness:0.45, emissive:kind==='star'?0xF47A2A:0x000000, emissiveIntensity:kind==='star'?0.35:0}));
    root.add(m);
    var i = parts.length, h1 = Math.sin(i*12.9898)*43758.5453, r1 = h1 - Math.floor(h1), h2 = Math.sin(i*78.233)*12345.678, r2 = h2 - Math.floor(h2);
    var ang = i*2.39996, rad = 1.6 + r1*1.4;
    var p = {m:m, kind:kind, fin:[cx,cy,0], rz:rotZ||0, sc:[Math.cos(ang)*rad*1.2, Math.sin(ang)*rad*0.75, -0.8 + r2*1.8], sr:[r1*3, r2*4, (r1-r2)*3]};
    parts.push(p); return p;
  }
  // A straight stroke with butt caps, like the SVG lines
  function stroke(x1,y1,x2,y2,kind){
    var dx=x2-x1, dy=y2-y1, L=Math.sqrt(dx*dx+dy*dy);
    var g = new THREE.BoxGeometry(L*K, STROKE*K, DEPTH);
    return addPart(g, W((x1+x2)/2), Hy((y1+y2)/2), -Math.atan2(dy,dx), kind);
  }
  function polyShape(pts, kind){
    var cx=0, cy=0; pts.forEach(function(p){ cx+=p[0]; cy+=p[1]; }); cx/=pts.length; cy/=pts.length;
    var s = new THREE.Shape(); pts.forEach(function(p,k){ var x=(p[0]-cx)*K, y=-(p[1]-cy)*K; if (k===0) s.moveTo(x,y); else s.lineTo(x,y); }); s.closePath();
    var g = new THREE.ExtrudeGeometry(s, {depth:DEPTH, bevelEnabled:false, curveSegments:1}); g.translate(0,0,-DEPTH/2);
    return addPart(g, W(cx), Hy(cy), 0, kind);
  }
  // S: sample the stroked centre line "M78 29H49C31 29 27 50 43 58L68 70C83 77 79 105 58 105H27" and offset it by half the stroke
  function cubic(p0,p1,p2,p3,n,out){ for (var k=1;k<=n;k++){ var t=k/n, u=1-t; out.push([u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0], u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]]); } }
  var C = [[78,29],[49,29]];
  cubic([49,29],[31,29],[27,50],[43,58],18,C);
  C.push([68,70]);
  cubic([68,70],[83,77],[79,105],[58,105],18,C);
  C.push([27,105]);
  var left=[], right=[], hw=STROKE/2;
  for (var i=0;i<C.length;i++){
    var a=C[Math.max(0,i-1)], b=C[Math.min(C.length-1,i+1)], tx=b[0]-a[0], ty=b[1]-a[1], tl=Math.sqrt(tx*tx+ty*ty)||1;
    var nx=-ty/tl, ny=tx/tl;
    left.push([C[i][0]+nx*hw, C[i][1]+ny*hw]); right.push([C[i][0]-nx*hw, C[i][1]-ny*hw]);
  }
  var S = polyShape(left.concat(right.reverse()), 'S');
  var E1 = [stroke(118,31,176,31,'E1'), stroke(118,68,166,68,'E1'), stroke(118,105,176,105,'E1')];
  stroke(215,31,285,31,'T'); stroke(250,31,250,105,'T');
  stroke(321,105,355,31,'A'); stroke(355,31,389,105,'A');
  var E2 = [stroke(429,31,487,31,'E2'), stroke(429,68,477,68,'E2'), stroke(429,105,487,105,'E2')];
  stroke(539,31,539,105,'I');
  var STAR = polyShape([[355,58],[360,69],[372,70],[363,78],[366,90],[355,84],[344,90],[347,78],[338,70],[350,69]], 'star');

  // construction grid: top of strokes, middle bar, baseline
  var gridMat = new THREE.LineDashedMaterial({color:0xF47A2A, dashSize:0.06, gapSize:0.05, transparent:true, opacity:0});
  var gx = 2.5, gridGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-gx,Hy(31),0.1),new THREE.Vector3(gx,Hy(31),0.1),new THREE.Vector3(-gx,Hy(68),0.1),new THREE.Vector3(gx,Hy(68),0.1),new THREE.Vector3(-gx,Hy(105),0.1),new THREE.Vector3(gx,Hy(105),0.1)]);
  var grid = new THREE.LineSegments(gridGeo, gridMat); grid.computeLineDistances(); root.add(grid);

  // light-variant backdrop + icon plate
  var paper = new THREE.Mesh(new THREE.PlaneGeometry(5.4,2.0), new THREE.MeshBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0})); paper.position.z = -0.3; root.add(paper);
  var plate = new THREE.Mesh(new THREE.BoxGeometry(1.5,1.5,0.1), new THREE.MeshStandardMaterial({color:0x181A1B, metalness:0.3, roughness:0.5, transparent:true, opacity:0}));
  plate.position.z = -0.2; root.add(plate);

  // colour swatches
  var SWC = [0x10100F,0x181A1B,0xFFFAF0,0xD6D0C4,0xF47A2A,0x70D7E8];
  var swatches = SWC.map(function(c){
    var m = new THREE.Mesh(new THREE.BoxGeometry(0.62,0.82,0.04), new THREE.MeshStandardMaterial({color:c, roughness:0.6, metalness:0.05}));
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0.25})));
    root.add(m); return m;
  });

  // motion orbit
  var orbitPts = []; for (var q=0;q<=96;q++){ var aa=q/96*Math.PI*2; orbitPts.push(new THREE.Vector3(Math.cos(aa)*2.6, Math.sin(aa)*0.95, Math.sin(aa)*0.6)); }
  var orbitMat = new THREE.LineDashedMaterial({color:0xF47A2A, dashSize:0.08, gapSize:0.07, transparent:true, opacity:0});
  var orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(orbitPts), orbitMat); orbit.computeLineDistances(); root.add(orbit);

  // glow that follows the star
  var c2 = document.createElement('canvas'); c2.width=c2.height=128; var x2 = c2.getContext('2d'); var gg = x2.createRadialGradient(64,64,0,64,64,64); gg.addColorStop(0,'rgba(244,122,42,.7)'); gg.addColorStop(1,'rgba(244,122,42,0)'); x2.fillStyle=gg; x2.fillRect(0,0,128,128);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c2), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); root.add(glow);
  var starLight = new THREE.PointLight(0xF47A2A, 1.6, 4); root.add(starLight);

  // The ≡ loader: E bars stretched and stacked, middle bar left-aligned and shorter
  var BAR_LONG = 58*K, BAR_SHORT = 48*K, LOOP_W = 2.7;
  function eqBar(idx){
    var len = idx===1 ? LOOP_W*BAR_SHORT/BAR_LONG : LOOP_W;
    return {p:[idx===1 ? -(LOOP_W-len)/2 : 0, 0.42 - idx*0.42, 0], s:[len/(idx===1?BAR_SHORT:BAR_LONG), 0.9, 1]};
  }
  var ICON_S = [-0.12, -0.02, 0.08], ICON_STAR = [0.42, 0.44, 0.12];
  function partState(p, s, time){
    var f = p.fin, rz = p.rz;
    if (s===0) return {p:[p.sc[0], p.sc[1]+Math.sin(time*0.5+p.sc[2]*3)*0.08, p.sc[2]], r:[p.sr[0]+time*0.15, p.sr[1]+time*0.2, p.sr[2]], s:[1,1,1], o:1};
    if (s===1) return {p:[f[0]*1.18, f[1]+Math.sin(f[0]*3)*0.22, Math.cos(f[0]*2)*0.45], r:[p.sr[0]*0.25, p.sr[1]*0.25, rz+p.sr[2]*0.2], s:[1,1,1], o:1};
    if (s===5) return {p:[f[0]*0.72, f[1]*0.72+0.95, 0], r:[0,0,rz], s:[0.72,0.72,0.72], o:1};
    if (s===6) return {p:[f[0]*0.6, f[1]*0.6+1.25, 0], r:[0,0,rz], s:[0.6,0.6,0.6], o:1};
    if (s===7){
      if (p.kind==='E1' || p.kind==='E2'){ var e = eqBar((p.kind==='E1'?E1:E2).indexOf(p)); return {p:[e.p[0], e.p[1], p.kind==='E2'?-0.02:0], r:[0,0,0], s:e.s, o:1}; }
      return {p:[f[0]*0.5, f[1]*0.5+1.35, -0.4], r:[0,0,rz], s:[0.4,0.4,0.4], o:0.4};
    }
    if (s===9){
      if (p.kind==='S') return {p:ICON_S, r:[0,0,0], s:[1.45,1.45,1.45], o:1};
      if (p.kind==='star') return {p:ICON_STAR, r:[0,0,0], s:[1.6,1.6,1.6], o:1};
      return {p:[f[0]*0.4, f[1]*0.4-1.25, -0.6], r:[0,0,rz], s:[0.001,0.001,0.001], o:0};
    }
    if (s===8 && p.kind==='star'){ var oa = time*0.55; return {p:[Math.cos(oa)*2.6, Math.sin(oa)*0.95, Math.sin(oa)*0.6], r:[0,0,time], s:[1.4,1.4,1.4], o:1}; }
    if (s===3 && p.kind==='star') return {p:[f[0],f[1],0.15], r:[0,0,0], s:[1.7,1.7,1.7], o:1};
    return {p:[f[0],f[1],0], r:[0,0,rz], s:[1,1,1], o:1};
  }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function ease(t){ return t*t*(3-2*t); }
  function weight(st,k){ return Math.max(0, 1-Math.abs(st-k)); }

  var current = scrollStage(), clock = new THREE.Clock();
  var layout = {x:2.7, y:0, z:11};
  function resize(){
    var ww=innerWidth, hh=innerHeight; renderer.setSize(ww,hh,false); camera.aspect=ww/hh; camera.updateProjectionMatrix();
    if (ww/hh > 1.1){ layout.x=2.7; layout.y=0; layout.z=11; } else { layout.x=0; layout.y=2.1; layout.z=15.5; }
  }
  addEventListener('resize', resize); resize();
  var tmp = new THREE.Color(), vS = new THREE.Vector3(ICON_S[0],ICON_S[1],ICON_S[2]), vStar = new THREE.Vector3(ICON_STAR[0],ICON_STAR[1],ICON_STAR[2]);

  var running = false, tabHidden = false;
  function frame(){
    running = false;
    var time = reduce ? 0 : clock.getElapsedTime();
    current += (scrollStage() - current) * (reduce ? 1 : 0.065);
    ui(current);
    var a=Math.floor(current), b=Math.min(a+1,LAST), t=ease(current-a);
    if (a>=LAST){ a=LAST; b=LAST; t=0; }
    camera.position.set(0, 0.5, layout.z); camera.lookAt(0, 0.1, 0);
    root.position.set(layout.x, layout.y, 0);
    root.rotation.y = -0.22 + Math.sin(time*0.2)*0.07 * (1 - weight(current,4));
    root.rotation.x = 0.04;

    var w3=weight(current,3), w4=weight(current,4), w9=weight(current,9);
    var mode = reduce ? 0 : Math.floor(time/2.6) % 4; // variants: primary, light, S…I, icon

    parts.forEach(function(p){
      var A=partState(p,a,time), B=partState(p,b,time);
      p.m.position.set(lerp(A.p[0],B.p[0],t), lerp(A.p[1],B.p[1],t), lerp(A.p[2],B.p[2],t));
      p.m.rotation.set(lerp(A.r[0],B.r[0],t), lerp(A.r[1],B.r[1],t), lerp(A.r[2],B.r[2],t));
      p.m.scale.set(Math.max(.001,lerp(A.s[0],B.s[0],t)), Math.max(.001,lerp(A.s[1],B.s[1],t)), Math.max(.001,lerp(A.s[2],B.s[2],t)));
      var target = p.kind==='star' ? COL.orange : COL.cream;
      if (p.kind!=='star' && w3>0) target = tmp.copy(COL.cream).lerp(COL.dim, w3*0.75);
      if (w4>0.5){
        if (mode===1 && p.kind!=='star') target = COL.dark;
        if (mode===2 && (p.kind==='S' || p.kind==='I')) target = COL.orange;
        if (mode===2 && p.kind==='star') target = COL.cream;
      }
      var op = lerp(A.o,B.o,t);
      if (w4>0.5 && mode===3 && p.kind!=='S' && p.kind!=='star') op = 0;
      p.m.material.color.lerp(target, 0.12);
      p.m.material.transparent = op < 0.999; p.m.material.opacity += (op - p.m.material.opacity)*0.15;
      p.m.visible = p.m.material.opacity > 0.02;
    });
    // In the variants section the fourth variant is the icon: S + star on a plate
    var iconMix = (w4>0.5 && mode===3) ? 1 : 0, iconW = Math.max(iconMix*w4, w9);
    if (iconMix){
      S.m.position.lerp(vS, w4*0.9); STAR.m.position.lerp(vStar, w4*0.9);
      S.m.rotation.set(0,0,0); S.m.scale.multiplyScalar(1+0.45*w4); STAR.m.scale.multiplyScalar(1+0.5*w4);
    }
    plate.material.opacity += ((iconW>0.3 ? iconW : 0) - plate.material.opacity)*0.12; plate.visible = plate.material.opacity>0.02;
    paper.material.opacity += (((w4>0.5 && mode===1) ? w4 : 0) - paper.material.opacity)*0.12; paper.visible = paper.material.opacity>0.02;

    gridMat.opacity = 0.85*weight(current,2);
    orbitMat.opacity = 0.6*weight(current,8);

    var w5 = weight(current,5);
    swatches.forEach(function(m,i){
      var ang = (i-2.5)*0.16;
      m.position.set(-1.9 + i*0.76, -0.55 - Math.abs(i-2.5)*0.05, 0.1 - Math.abs(i-2.5)*0.05);
      m.rotation.set(0, -ang*0.6, ang*0.4);
      m.scale.setScalar(Math.max(.001, w5)); m.visible = w5>0.01;
    });

    var sp = STAR.m.position;
    glow.position.set(sp.x, sp.y, sp.z+0.05);
    var gs = 0.7 + w3*1.0 + weight(current,8)*0.6 + w9*0.4; glow.scale.set(gs,gs,1);
    starLight.position.set(sp.x, sp.y, sp.z+0.4);

    renderer.render(scene, camera);
    // Keep animating while visible; the variants section cycles on a timer, the rest follows scroll
    if (!reduce && !tabHidden) kick();
  }
  function kick(){ if (!running){ running = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', kick, {passive:true});
  addEventListener('resize', kick);
  document.addEventListener('visibilitychange', function(){ tabHidden = document.hidden; if (!tabHidden) kick(); });
  kick();
})();
