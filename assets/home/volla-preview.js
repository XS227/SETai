// /projects/vollabyggmester/: a house rising from one line as you scroll, plus the before/after slider
(function(){
  var reduce = false;

  var canvas = document.querySelector('.preview-volla');
  if (!canvas) return;
  var sections = [];
  var LAST = 12;
  function scrollStage(){ return 0; }
  function ui(){}
  if (typeof THREE === 'undefined'){ canvas.style.display='none'; addEventListener('scroll',function(){ui(scrollStage());},{passive:true}); return; }
  var renderer;
  try { renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true}); } catch(e){ canvas.style.display='none'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2));
  renderer.setClearColor(0x10100F, 1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;

  var scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x10100F, 16, 34);
  var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  var hemi = new THREE.HemisphereLight(0x9DB4CC, 0x1A1410, 0.35); scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xFFE2C4, 0.0); sun.position.set(-6, 8, 6); sun.castShadow = true;
  sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left=-6; sun.shadow.camera.right=6; sun.shadow.camera.top=6; sun.shadow.camera.bottom=-6; sun.shadow.bias = -0.0008;
  scene.add(sun);
  var fill = new THREE.DirectionalLight(0x5C84AE, 0.35); fill.position.set(6,3,-5); scene.add(fill);
  var root = new THREE.Group(); scene.add(root);

  (function(){
    var g = new THREE.BufferGeometry(), n = 420, a = new Float32Array(n*3);
    for (var i=0;i<n;i++){ a[i*3]=(Math.random()-.5)*26; a[i*3+1]=Math.random()*12+1; a[i*3+2]=-6-Math.random()*8; }
    g.setAttribute('position', new THREE.BufferAttribute(a,3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({color:0xFFFAF0, size:0.035, transparent:true, opacity:0.35})));
  })();

  // ---------- helpers ----------
  function std(color, opts){ var m = new THREE.MeshStandardMaterial(Object.assign({color:color, roughness:0.8, metalness:0.05}, opts||{})); return m; }
  function box(w,h,d,mat,x,y,z,parent){ var m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat); m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; (parent||root).add(m); return m; }
  function lineMat(color, op, dashed){ return dashed ? new THREE.LineDashedMaterial({color:color, dashSize:0.08, gapSize:0.06, transparent:true, opacity:op}) : new THREE.LineBasicMaterial({color:color, transparent:true, opacity:op}); }
  function polyline(pts, mat, parent){ var l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat); if (mat.isLineDashedMaterial) l.computeLineDistances(); (parent||root).add(l); return l; }
  function sprite(txt, parent){
    var c=document.createElement('canvas'); c.width=512; c.height=96; var x=c.getContext('2d');
    function draw(){ x.clearRect(0,0,512,96); x.fillStyle='#FFFAF0'; x.font='500 40px "Space Grotesk", Inter, system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,256,48); }
    draw();
    var map = new THREE.CanvasTexture(c);
    // Redraw once the webfont is in, otherwise the label keeps the fallback font
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ draw(); map.needsUpdate = true; });
    
    var s=new THREE.Sprite(new THREE.SpriteMaterial({map:map, transparent:true, depthWrite:false, opacity:0})); s.scale.set(1.2,0.22,1); (parent||root).add(s); return s;
  }
  function clamp01(v){ return Math.max(0, Math.min(1, v)); }
  var V = function(x,y,z){ return new THREE.Vector3(x,y,z); };

  // dimensions
  var W2 = 2.0, D2 = 1.3, FLOOR = 0.2, WALLH = 1.6, TOP = FLOOR + WALLH, RIDGE = TOP + 1.0;

  // ---------- ground ----------
  var groundMat = std(0x0F1318, {roughness:1});
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), groundMat); ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; root.add(ground);
  var gridH = new THREE.GridHelper(14, 28, 0x2A3340, 0x18202A); gridH.position.y = 0.002; gridH.material.transparent = true; root.add(gridH);

  // ---------- 0: first line ----------
  var firstLine = polyline([V(-W2,0.01,D2), V(W2,0.01,D2)], lineMat(0xF47A2A, 1));
  // ---------- 1: plan ----------
  var planG = new THREE.Group(); root.add(planG);
  var planMat = lineMat(0xF47A2A, 0), planMat2 = lineMat(0xFFFAF0, 0), dimMat = lineMat(0xFFFAF0, 0, true);
  polyline([V(-W2,0.01,-D2), V(W2,0.01,-D2), V(W2,0.01,D2), V(-W2,0.01,D2), V(-W2,0.01,-D2)], planMat, planG);
  polyline([V(0.6,0.01,-D2), V(0.6,0.01,D2)], planMat2, planG);
  polyline([V(0.6,0.01,0), V(W2,0.01,0)], planMat2, planG);
  polyline([V(-0.8,0.01,-D2), V(-0.8,0.01,-0.2)], planMat2, planG);
  polyline([V(-W2,0.01,D2+0.45), V(W2,0.01,D2+0.45)], dimMat, planG);
  polyline([V(W2+0.45,0.01,-D2), V(W2+0.45,0.01,D2)], dimMat, planG);
  var dimA = sprite('4,0 m', planG); dimA.position.set(0,0.2,D2+0.6);
  var dimB = sprite('2,6 m', planG); dimB.position.set(W2+0.9,0.2,0);
  var roomL = [sprite('Stue og kjøkken', planG), sprite('Bad', planG), sprite('Soverom', planG)];
  roomL[0].position.set(-0.7,0.2,0.4); roomL[1].position.set(1.3,0.2,-0.65); roomL[2].position.set(1.3,0.2,0.65);

  // ---------- 2: blueprint ghost ----------
  var ghostMat = lineMat(0xFFFAF0, 0, true);
  (function(){
    var pts = [];
    var c = [[-W2,FLOOR,-D2],[W2,FLOOR,-D2],[W2,FLOOR,D2],[-W2,FLOOR,D2]];
    var t = [[-W2,TOP,-D2],[W2,TOP,-D2],[W2,TOP,D2],[-W2,TOP,D2]];
    for (var i=0;i<4;i++){ var a=c[i], b=c[(i+1)%4], ta=t[i], tb=t[(i+1)%4]; pts.push(V(a[0],a[1],a[2]),V(b[0],b[1],b[2]), V(ta[0],ta[1],ta[2]),V(tb[0],tb[1],tb[2]), V(a[0],a[1],a[2]),V(ta[0],ta[1],ta[2])); }
    pts.push(V(-W2,TOP,-D2),V(-W2,RIDGE,0), V(-W2,RIDGE,0),V(-W2,TOP,D2), V(W2,TOP,-D2),V(W2,RIDGE,0), V(W2,RIDGE,0),V(W2,TOP,D2), V(-W2,RIDGE,0),V(W2,RIDGE,0));
    var g = new THREE.BufferGeometry().setFromPoints(pts); var l = new THREE.LineSegments(g, ghostMat); l.computeLineDistances(); root.add(l);
  })();

  // ---------- 3: foundation ----------
  var concrete = std(0x8C8A86, {roughness:0.95});
  var slab = box(2*W2+0.2, FLOOR, 2*D2+0.2, concrete, 0, FLOOR/2, 0);
  var footings = [[-W2,-D2],[W2,-D2],[W2,D2],[-W2,D2]].map(function(p){ return box(0.3,0.08,0.3, concrete, p[0], 0.04, p[1]); });

  // ---------- 4: timber frame ----------
  var wood = std(0xC9A06A, {roughness:0.7});
  var studs = [];
  function stud(x,z){ var s = box(0.06, WALLH, 0.1, wood, x, FLOOR+WALLH/2, z); s.userData.h = 1; studs.push(s); return s; }
  for (var x=-W2; x<=W2+0.001; x+=0.4){ stud(x, -D2); stud(x, D2); }
  for (var z=-D2+0.4; z<D2-0.01; z+=0.4){ stud(-W2, z); stud(W2, z); }
  for (z=-D2+0.4; z<D2-0.01; z+=0.4){ stud(0.6, z); }
  var plates = [];
  [[0,-D2,2*W2,0.1],[0,D2,2*W2,0.1]].forEach(function(p){ plates.push(box(p[2],0.06,p[3],wood,p[0],FLOOR+0.03,p[1])); plates.push(box(p[2],0.06,p[3],wood,p[0],TOP-0.03,p[1])); });
  [[-W2,0],[W2,0]].forEach(function(p){ plates.push(box(0.1,0.06,2*D2,wood,p[0],FLOOR+0.03,p[1])); plates.push(box(0.1,0.06,2*D2,wood,p[0],TOP-0.03,p[1])); });
  studs.sort(function(a,b){ return (a.position.x+a.position.z*0.1) - (b.position.x+b.position.z*0.1); });

  // ---------- 5: plumbing ----------
  var copper = std(0xC97B4A, {metalness:0.7, roughness:0.35}), drain = std(0x9AA0A6, {roughness:0.5});
  function tube(pts, r, mat){ var path = new THREE.CurvePath(); for (var i=0;i<pts.length-1;i++) path.add(new THREE.LineCurve3(pts[i], pts[i+1])); var g = new THREE.TubeGeometry(path, 64, r, 8, false); var m = new THREE.Mesh(g, mat); m.castShadow = true; root.add(m); m.userData.count = g.index.count; g.setDrawRange(0,0); return m; }
  var pipes = [
    tube([V(-W2+0.15,FLOOR+0.06,-D2+0.15), V(0.4,FLOOR+0.06,-D2+0.15), V(0.4,FLOOR+0.06,-0.5), V(1.4,FLOOR+0.06,-0.5), V(1.4,FLOOR+0.9,-0.5)], 0.03, copper),
    tube([V(-W2+0.15,FLOOR+0.06,-D2+0.25), V(-1.2,FLOOR+0.06,-D2+0.25), V(-1.2,FLOOR+0.06,-0.9), V(-1.2,FLOOR+0.85,-0.9)], 0.03, copper),
    tube([V(1.6,FLOOR+0.05,-0.8), V(1.6,FLOOR+0.05,-D2-0.4)], 0.055, drain),
    tube([V(-1.5,FLOOR+0.05,-1.0), V(-1.5,FLOOR+0.05,-D2-0.4)], 0.05, drain)
  ];
  var tubLbl = sprite('Bad'), kitLbl = sprite('Kjøkken');
  tubLbl.position.set(1.4,1.35,-0.5); kitLbl.position.set(-1.2,1.3,-0.9);

  // ---------- 6: electrical ----------
  var panelBox = box(0.3,0.45,0.08, std(0xD9D4C9,{roughness:0.5}), -W2+0.12, FLOOR+1.05, 0.3);
  panelBox.rotation.y = Math.PI/2;
  var outlets = [[-1.6,-D2+0.07],[-0.4,-D2+0.07],[1.2,-D2+0.07],[-1.0,D2-0.07],[0.4,D2-0.07],[1.6,D2-0.07]].map(function(p){ return box(0.08,0.08,0.04, std(0xEDEBE6), p[0], FLOOR+0.35, p[1]); });
  var wireMat = new THREE.LineBasicMaterial({color:0xF47A2A, transparent:true, opacity:0});
  var wires = outlets.map(function(o){ var ox=o.position.x, oz=o.position.z; var pts=[V(-W2+0.14,FLOOR+1.25,0.3), V(-W2+0.14,TOP-0.12,0.3), V(ox,TOP-0.12,oz), V(ox,FLOOR+0.35,oz)]; var l = polyline(pts, wireMat); l.userData.pts = pts; return l; });
  var sparks = wires.map(function(){ var s = new THREE.Mesh(new THREE.SphereGeometry(0.035,8,8), new THREE.MeshBasicMaterial({color:0xFFB46B, transparent:true, opacity:0})); root.add(s); return s; });
  function along(pts, f){ var L=[], tot=0; for (var i=0;i<pts.length-1;i++){ var d=pts[i].distanceTo(pts[i+1]); L.push(d); tot+=d; } var tgt=f*tot; for (i=0;i<L.length;i++){ if (tgt<=L[i]) return pts[i].clone().lerp(pts[i+1], tgt/L[i]); tgt-=L[i]; } return pts[pts.length-1].clone(); }

  // ---------- 7: roof ----------
  var trusses = [];
  var rafterL = Math.sqrt(D2*D2 + 1.0*1.0), ang = Math.atan2(1.0, D2);
  for (x=-W2; x<=W2+0.001; x+=0.5){
    var g = new THREE.Group(); g.position.x = x; root.add(g);
    var l1 = box(0.06,0.08,rafterL, wood, 0, TOP+0.5, -D2/2, g); l1.rotation.x = -ang;
    var l2 = box(0.06,0.08,rafterL, wood, 0, TOP+0.5, D2/2, g); l2.rotation.x = ang;
    var ch = box(0.06,0.06,2*D2, wood, 0, TOP+0.03, 0, g);
    var kp = box(0.05,0.95,0.06, wood, 0, TOP+0.5, 0, g);
    trusses.push(g);
  }
  var roofMat = std(0x1B1D20, {roughness:0.6, metalness:0.15});
  var roofL = rafterL + 0.38;
  var roofA = new THREE.Group(); root.add(roofA); var rA = box(2*W2+0.5, 0.07, roofL, roofMat, 0, 0, 0, roofA); roofA.position.set(0, TOP+0.5+0.06, -D2/2 - 0.12); roofA.rotation.x = -ang;
  var roofB = new THREE.Group(); root.add(roofB); var rB = box(2*W2+0.5, 0.07, roofL, roofMat, 0, 0, 0, roofB); roofB.position.set(0, TOP+0.5+0.06, D2/2 + 0.12); roofB.rotation.x = ang;
  var ridgeCap = box(2*W2+0.5, 0.06, 0.16, roofMat, 0, RIDGE+0.1, 0);
  // roof seams (standing seam look)
  var seamMat = std(0x2A2D31, {roughness:0.5, metalness:0.3});
  [rA, rB].forEach(function(r){ for (var sx=-W2; sx<=W2+0.01; sx+=0.32){ var s = box(0.02,0.03,roofL, seamMat, sx, 0.05, 0, r.parent); } });

  // ---------- 8: walls, cladding, windows ----------
  var clad = std(0x2A2E33, {roughness:0.85}), groove = std(0x1A1D21, {roughness:1}), trim = std(0xE9E6DF, {roughness:0.5});
  var glassMat = new THREE.MeshStandardMaterial({color:0x1C232B, emissive:0xFFB673, emissiveIntensity:0.0, roughness:0.15, metalness:0.2});
  var walls = [];
  function wall(name, w, x, z, rotY){
    var g = new THREE.Group(); g.position.set(x, FLOOR, z); g.rotation.y = rotY; root.add(g);
    var inner = new THREE.Group(); g.add(inner);
    box(w, WALLH, 0.08, clad, 0, WALLH/2, 0.06, inner);
    for (var gx=-w/2+0.18; gx<w/2-0.05; gx+=0.18){ box(0.012, WALLH, 0.02, groove, gx, WALLH/2, 0.105, inner); }
    walls.push({g:g, inner:inner, name:name, w:w}); return inner;
  }
  var front = wall('front', 2*W2+0.08, 0, D2, 0);
  var back  = wall('back', 2*W2+0.08, 0, -D2, Math.PI);
  var left  = wall('left', 2*D2+0.08, -W2, 0, -Math.PI/2);
  var right = wall('right', 2*D2+0.08, W2, 0, Math.PI/2);
  // gables
  function gable(x, rotY){
    var s = new THREE.Shape(); s.moveTo(-D2-0.04,0); s.lineTo(D2+0.04,0); s.lineTo(0,1.0); s.closePath();
    var geo = new THREE.ExtrudeGeometry(s, {depth:0.08, bevelEnabled:false}); var m = new THREE.Mesh(geo, clad); m.castShadow = m.receiveShadow = true;
    var g = new THREE.Group(); g.position.set(x, TOP, 0); g.rotation.y = rotY; g.add(m); m.position.z = 0.02; root.add(g); return g;
  }
  var gableL = gable(-W2, -Math.PI/2), gableR = gable(W2, Math.PI/2);
  var windows = [];
  function win(parent, x, y, w, h, isDoor){
    var g = new THREE.Group(); g.position.set(x, y, 0.13); parent.add(g);
    var t = 0.05;
    box(w+t*2, t, 0.05, trim, 0, h/2+t/2, 0, g); box(w+t*2, t, 0.05, trim, 0, -h/2-t/2, 0, g);
    box(t, h, 0.05, trim, -w/2-t/2, 0, 0, g); box(t, h, 0.05, trim, w/2+t/2, 0, 0, g);
    if (!isDoor){ box(0.02, h, 0.04, trim, 0, 0, 0.005, g); }
    var gl = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), isDoor ? std(0x3A2A1E,{roughness:0.6}) : glassMat); gl.position.z = -0.01; g.add(gl);
    if (isDoor){ var knob = box(0.04,0.04,0.04, std(0xC9A06A,{metalness:0.8,roughness:0.3}), w*0.32, 0, 0.03, g); var dg = new THREE.Mesh(new THREE.BoxGeometry(0.12,h*0.7,0.025), glassMat); dg.position.set(-w*0.2,0.05,0.005); g.add(dg); }
    windows.push(g); return g;
  }
  win(front, -1.35, 0.95, 0.7, 0.8); win(front, -0.35, 0.6, 0.55, 1.15, true); win(front, 0.75, 0.95, 1.15, 0.85); win(front, 1.6, 0.95, 0.45, 0.8);
  win(back, -1.0, 0.95, 0.9, 0.8); win(back, 1.0, 1.15, 0.5, 0.5);
  win(left, 0, 0.95, 0.9, 0.8); win(right, -0.4, 0.95, 0.6, 0.8);
  // fascia
  var fasciaA = box(2*W2+0.5, 0.08, 0.04, trim, 0, TOP-0.02, -D2-0.33); var fasciaB = box(2*W2+0.5, 0.08, 0.04, trim, 0, TOP-0.02, D2+0.33);
  var steps = box(0.9, 0.12, 0.4, concrete, -0.35, 0.06, D2+0.35);

  // ---------- 9: interior ----------
  var intG = new THREE.Group(); root.add(intG);
  var floorWood = std(0x8A6A4A, {roughness:0.6});
  box(2*W2-0.1, 0.02, 2*D2-0.1, floorWood, 0, FLOOR+0.011, 0, intG);
  box(0.06, WALLH, 2*D2-0.1, std(0xE7E2D8), 0.6, FLOOR+WALLH/2, 0, intG);
  box(1.4, WALLH, 0.06, std(0xE7E2D8), 1.3, FLOOR+WALLH/2, 0, intG);
  var counter = box(1.2, 0.45, 0.32, std(0xD9D4C9,{roughness:0.4}), -1.2, FLOOR+0.22, -D2+0.25, intG);
  var counterTop = box(1.24, 0.04, 0.36, std(0x2A2E33,{roughness:0.3}), -1.2, FLOOR+0.47, -D2+0.25, intG);
  var island = box(0.6, 0.45, 0.35, std(0xD9D4C9,{roughness:0.4}), -1.2, FLOOR+0.22, -0.35, intG);
  var sofa = box(0.9, 0.25, 0.35, std(0x6B5446,{roughness:0.9}), -0.8, FLOOR+0.13, 0.85, intG);
  var sofaB = box(0.9, 0.3, 0.1, std(0x6B5446,{roughness:0.9}), -0.8, FLOOR+0.3, 1.0, intG);
  var tub = box(0.8, 0.28, 0.4, std(0xEDEBE6,{roughness:0.3}), 1.3, FLOOR+0.14, -0.95, intG);
  var bed = box(0.8, 0.22, 0.6, std(0xE7E2D8,{roughness:0.9}), 1.35, FLOOR+0.11, 0.75, intG);
  var lamp = new THREE.PointLight(0xFFC890, 0, 4.5, 2); lamp.position.set(-0.6, TOP-0.3, 0); intG.add(lamp);
  var lamp2 = new THREE.PointLight(0xFFC890, 0, 3, 2); lamp2.position.set(1.3, TOP-0.3, -0.6); intG.add(lamp2);

  // ---------- 11: digital layer ----------
  var digG = new THREE.Group(); root.add(digG);
  var dmat = function(c){ return new THREE.MeshBasicMaterial({color:c, transparent:true, opacity:0}); };
  var browser = new THREE.Mesh(new THREE.BoxGeometry(1.7,1.1,0.03), dmat(0x151920)); browser.position.set(-3.4, 2.9, 0); digG.add(browser);
  var bEdge = new THREE.LineSegments(new THREE.EdgesGeometry(browser.geometry), new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0})); browser.add(bEdge);
  var bBar = new THREE.Mesh(new THREE.BoxGeometry(1.7,0.1,0.035), dmat(0xFFFAF0)); bBar.position.set(0,0.5,0); browser.add(bBar);
  var bHero = new THREE.Mesh(new THREE.BoxGeometry(1.5,0.45,0.035), dmat(0x2A2E33)); bHero.position.set(0,0.15,0); browser.add(bHero);
  var bCta = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.12,0.04), dmat(0xF47A2A)); bCta.position.set(-0.45,-0.22,0); browser.add(bCta);
  var bCards = [-0.5,0,0.5].map(function(cx){ var m = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.18,0.035), dmat(0x2A2E33)); m.position.set(cx,-0.42,0); browser.add(m); return m; });
  var results = [0,1,2].map(function(k){ var m = new THREE.Mesh(new THREE.BoxGeometry(1.3,0.13,0.03), dmat(k===0?0xF47A2A:0x2A2E33)); m.position.set(-3.4, 1.95 - k*0.22, 0); digG.add(m); return m; });
  var digLineMat = lineMat(0xF47A2A, 0, true);
  polyline([V(-2.55,2.6,0), V(-1.6,2.4,D2), V(-0.5,1.6,D2+0.2)], digLineMat, digG);
  var digLbl = sprite('Søk: byggmester Oslo', digG); digLbl.position.set(-3.4,2.25,0.1);

  // ---------- 12: landscape ----------
  var landG = new THREE.Group(); root.add(landG);
  var trees = [[-4.2,-1.8,1.1],[4.0,-2.2,1.3],[-3.6,2.6,0.9],[4.6,1.6,1.0]].map(function(p){
    var g = new THREE.Group(); g.position.set(p[0],0,p[1]); landG.add(g);
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.08,0.5,8), std(0x4A3828)); trunk.position.y = 0.25; trunk.castShadow = true; g.add(trunk);
    var leaf = std(0x1F3527, {roughness:0.9});
    [[0.55,0.9,0.7],[0.45,0.8,1.15],[0.32,0.7,1.55]].forEach(function(c){ var cone = new THREE.Mesh(new THREE.ConeGeometry(c[0],c[1],10), leaf); cone.position.y = c[2]; cone.castShadow = true; g.add(cone); });
    g.userData.s = p[2]; return g;
  });
  var stones = []; for (var si=0; si<6; si++){ var st = box(0.32, 0.03, 0.22, std(0x6E6A63,{roughness:1}), -0.35 + Math.sin(si)*0.06, 0.015, D2+0.75 + si*0.38, landG); stones.push(st); }
  var porchL = new THREE.PointLight(0xFFC890, 0, 3.5, 2); porchL.position.set(-0.35, 1.6, D2+0.4); root.add(porchL);
  var winGlowL = new THREE.PointLight(0xFFB673, 0, 4, 2); winGlowL.position.set(0.75, 1.0, D2+0.9); root.add(winGlowL);

  // star (guide)
  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var glowT = tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.75)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); });
  var sparkT = tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); });
  var star = new THREE.Group(); root.add(star);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); glow.scale.set(1.5,1.5,1); star.add(glow);
  var spark = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkT, transparent:true, depthWrite:false})); spark.scale.set(0.38,0.38,1); star.add(spark);

  var STAR = [[W2,0.15,D2],[W2+0.45,0.3,D2+0.45],[0,RIDGE+0.4,0],[W2+0.2,FLOOR+0.3,D2+0.2],[W2,TOP+0.25,D2],[1.4,FLOOR+1.1,-0.5],[-W2+0.1,FLOOR+1.6,0.3],[0,RIDGE+0.45,0],[0.75,1.9,D2+0.4],[-0.6,TOP+0.1,0.2],[0,RIDGE+0.8,0],[-2.55,2.75,0.1],[0,RIDGE+0.9,0]];
  var spos = new THREE.Vector3().fromArray(STAR[0]);

  // ---------- layout ----------
  var layout = {x:0, y:-1.0, dist:13.5};
  function resize(){
    var ww=canvas.clientWidth||400, hh=canvas.clientHeight||250; renderer.setSize(ww,hh,false); camera.aspect=ww/hh; camera.updateProjectionMatrix();
    if (ww/hh > 1.1){ layout.x=0; layout.y=-0.9; layout.dist=13.5; } else { layout.x=0; layout.y=0.6; layout.dist=19; }
  }
  addEventListener('resize', resize); resize();
  function p(cur, k){ return clamp01((cur - (k - 0.85)) / 0.85); }
  function w(cur, k){ return Math.max(0, 1 - Math.abs(cur - k)); }
  function ease(t){ return t*t*(3-2*t); }
  var current = 0, clock = new THREE.Clock(), startT = null;
  var GROUND0 = new THREE.Color(0x0F1318), GROUND1 = new THREE.Color(0x1C2619);

  function frame(){
    var time = reduce ? 0 : clock.getElapsedTime();
    var cyc=(time*(LAST/28))%(LAST*2); var targetStage=cyc<=LAST?cyc:(LAST*2-cyc); current += (targetStage - current) * 0.06;
    ui(current);
    var c = current;

    // camera orbit
    var orbit = -0.62 + c*0.07 + (c > 11.5 ? (c-11.5)*0.6 : 0) + Math.sin(time*0.12)*0.04 + (w(c,12) > 0.6 && !reduce ? Math.sin(time*0.08)*0.25 : 0);
    var el = 0.62 - c*0.022;
    var dist = layout.dist - c*0.12 - w(c,9)*1.2;
    camera.position.set(Math.sin(orbit)*Math.cos(el)*dist, Math.sin(el)*dist + 1.2, Math.cos(orbit)*Math.cos(el)*dist);
    camera.lookAt(0, 1.0, 0);
    root.position.set(0, layout.y, 0);
    // horizontal offset in screen space: shift scene to the right on desktop
    var right = new THREE.Vector3(Math.cos(orbit), 0, -Math.sin(orbit));
    root.position.addScaledVector(right, -layout.x*0.0);
    camera.position.addScaledVector(right, -layout.x);
    var look = new THREE.Vector3(0,1.0,0).addScaledVector(right, -layout.x);
    camera.lookAt(look);

    // 0 first line (draws on load)
    if (startT === null) startT = time;
    var draw = reduce ? 1 : clamp01((time - startT)/1.6);
    firstLine.geometry.setFromPoints([V(-W2,0.012,D2), V(-W2 + 2*W2*ease(draw),0.012,D2)]);
    firstLine.material.opacity = 1 - p(c,3)*0.9;

    // 1 plan
    var p1 = p(c,1), fadePlan = 1 - p(c,4);
    planMat.opacity = p1 * fadePlan; planMat2.opacity = 0.6*p1*fadePlan; dimMat.opacity = 0.5*p1*fadePlan;
    [dimA,dimB].concat(roomL).forEach(function(s){ s.material.opacity = 0.9*p1*Math.max(0, 1 - p(c,3)*1.3); });
    // 2 ghost
    ghostMat.opacity = 0.55 * p(c,2) * (1 - p(c,5));
    // grid fades as house becomes real
    gridH.material.opacity = 1 - p(c,10)*0.85;

    // 3 foundation
    var p3 = p(c,3);
    slab.visible = p3 > 0.01; slab.scale.y = Math.max(0.001, ease(p3)); slab.position.y = FLOOR*slab.scale.y/2;
    footings.forEach(function(f){ f.visible = p3 > 0.01; });

    // 4 frame
    var p4 = p(c,4);
    studs.forEach(function(s,i){ var k = clamp01(p4*1.25*studs.length - i*1.0)/1; var on = clamp01((p4*studs.length*1.15 - i)); s.visible = on > 0.01; s.scale.y = Math.max(0.001, ease(on)); s.position.y = FLOOR + WALLH*s.scale.y/2; });
    plates.forEach(function(pl){ pl.visible = p4 > 0.85; });

    // 5 plumbing
    var p5 = p(c,5);
    pipes.forEach(function(pp,i){ var f = clamp01(p5*1.3 - i*0.1); pp.geometry.setDrawRange(0, Math.floor(pp.userData.count*f/3)*3); pp.visible = f>0.01; });
    tubLbl.material.opacity = kitLbl.material.opacity = w(c,5);

    // 6 electrical
    var p6 = p(c,6);
    panelBox.visible = p6 > 0.05; outlets.forEach(function(o,i){ o.visible = p6 > 0.15 + i*0.1; });
    wireMat.opacity = p6 * (1 - p(c,8)*0.9);
    var w6 = w(c,6);
    sparks.forEach(function(s,i){ var f = ((time*0.35) + i/6) % 1; s.position.copy(along(wires[i].userData.pts, f)); s.material.opacity = w6; s.visible = w6 > 0.02; });

    // 7 roof: trusses then covering
    var p7 = p(c,7);
    trusses.forEach(function(g,i){ var on = clamp01(p7*1.8*trusses.length/1.0 - i); var oc = clamp01(on); g.visible = oc > 0.01; g.position.y = (1-ease(oc))*1.6; });
    var cover = clamp01((p7 - 0.55)/0.45);
    roofA.visible = roofB.visible = ridgeCap.visible = cover > 0.01;
    roofA.scale.set(Math.max(0.001,cover),1,1); roofB.scale.set(Math.max(0.001,cover),1,1); ridgeCap.scale.set(Math.max(0.001,cover),1,1);

    // 8 walls & windows (cladding rises), front wall opens for interior (9)
    var p8 = p(c,8), open = w(c,9) > 0 ? ease(w(c,9)) : 0;
    walls.forEach(function(wl, i){
      var on = clamp01(p8*1.5 - i*0.12);
      wl.g.visible = on > 0.01; wl.inner.scale.y = Math.max(0.001, ease(on));
      if (wl.name==='front'){ wl.g.position.y = FLOOR - open*(WALLH+0.3); }
    });
    [gableL, gableR].forEach(function(g){ g.visible = p8 > 0.6; g.scale.y = Math.max(0.001, ease(clamp01((p8-0.6)/0.4))); });
    windows.forEach(function(g,i){ g.scale.setScalar(Math.max(0.001, ease(clamp01(p8*2 - 1 - i*0.05)))); });
    fasciaA.visible = fasciaB.visible = steps.visible = p8 > 0.8;
    // inner systems disappear behind walls
    var hideInner = p(c,9) > 0.5 && open < 0.2;
    studs.forEach(function(s){ if (hideInner) s.visible = false; });
    pipes.forEach(function(pp){ if (hideInner) pp.visible = false; });

    // 9 interior
    var p9 = p(c,9);
    intG.visible = p9 > 0.01;
    lamp.intensity = 1.6*Math.max(open, p(c,12)*0.6); lamp2.intensity = 1.2*Math.max(open, p(c,12)*0.6);

    // 11 digital
    var w11 = w(c,11);
    digG.children.forEach(function(ch){ if (ch.material) ch.material.opacity = (ch.material.color && ch.material.color.getHex()===0x151920 ? 0.95 : 0.9) * w11; });
    browser.children.forEach(function(ch){ if (ch.material) ch.material.opacity = 0.95*w11; });
    digG.visible = w11 > 0.01; digG.position.y = Math.sin(time*0.8)*0.04;

    // 12 finale: dusk, glow, landscape
    var p10 = p(c,10), p12 = p(c,12);
    sun.intensity = 0.15 + 0.75*p(c,8) - 0.35*p12;
    sun.color.setHex(0xFFE2C4).lerp(new THREE.Color(0xFFB27A), p12);
    hemi.intensity = 0.3 + 0.25*p(c,8);
    groundMat.color.copy(GROUND0).lerp(GROUND1, p10);
    glassMat.emissiveIntensity = 0.15 + 1.1*Math.max(p12, open*0.6);
    porchL.intensity = 1.4*p12; winGlowL.intensity = 1.0*p12;
    trees.forEach(function(t,i){ var s = ease(clamp01(p(c,10)*1.6 - i*0.15)) * t.userData.s; t.scale.setScalar(Math.max(0.001,s)); t.visible = s > 0.01; t.rotation.z = Math.sin(time*0.6+i)*0.01; });
    stones.forEach(function(st,i){ st.visible = p(c,10) > 0.2 + i*0.1; });

    // star
    var a = Math.floor(c), b = Math.min(a+1, LAST), t = ease(c - a);
    var A = STAR[Math.min(a, STAR.length-1)], B = STAR[Math.min(b, STAR.length-1)];
    spos.set(A[0]+(B[0]-A[0])*t, A[1]+(B[1]-A[1])*t, A[2]+(B[2]-A[2])*t);
    if (c < 0.6){ spos.set(-W2 + 2*W2*ease(draw), 0.15, D2); }
    star.position.set(spos.x, spos.y + Math.sin(time*1.2)*0.04, spos.z);
    spark.material.rotation = time*0.3;
    glow.material.opacity = 1 - p12*0.5;

    renderer.render(scene, camera);
    if (!reduce && !tabHidden) requestAnimationFrame(frame);
  }
  // Pause the loop while the tab is hidden
  var tabHidden = false;
  document.addEventListener('visibilitychange', function(){ var was = tabHidden; tabHidden = document.hidden; if (was && !tabHidden && !reduce) requestAnimationFrame(frame); });
  requestAnimationFrame(frame);
})();
