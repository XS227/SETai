// /projects/styrk-karriere/: a new firm climbing its own peaks, one scene per section
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('scene');
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-stage]'));
  var LAST = sections.length - 1;
  var meter = document.querySelector('.meter'), stopName = document.querySelector('.stop-name'), lastS = '';
  function scrollStage(){
    var mid = scrollY + innerHeight*0.5, st = 0;
    for (var i=0;i<sections.length;i++){ var top=sections[i].offsetTop, h=sections[i].offsetHeight; if (mid>=top){ var f=(mid-top)/h; st = i + Math.min(1, Math.max(0,(f-0.55)/0.45)); } }
    return Math.min(LAST, st);
  }
  function ui(st){
    meter.style.transform = 'scaleX(' + (st/LAST) + ')';
    var s = sections[Math.round(st)].getAttribute('data-stop');
    if (s !== lastS){ lastS = s; stopName.textContent = s; }
  }
  if (typeof THREE === 'undefined'){ canvas.style.display='none'; addEventListener('scroll',function(){ui(scrollStage());},{passive:true}); return; }
  addEventListener('scroll', function(){ ui(scrollStage()); }, {passive:true}); ui(scrollStage());
  function init(){
  var renderer;
  try { renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true}); } catch(e){ canvas.style.display='none'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2));
  renderer.setClearColor(0x10100F, 1);
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  var root = new THREE.Group(); scene.add(root);

  var COL = {paper:0xEFE4CC, rust:0xB4532F, mustard:0xD6A23C, pine:0x2F4A3A, sage:0x8FA38E, moss:0x4E6B57, deep:0x22362A, ink:0x2B2A26};
  function flat(c, op){ return new THREE.MeshBasicMaterial({color:c, transparent:op!=null, opacity:op==null?1:op}); }
  function shapeMesh(pts, color, z, parent){ var s = new THREE.Shape(); pts.forEach(function(p,i){ if(i===0) s.moveTo(p[0],p[1]); else s.lineTo(p[0],p[1]); }); s.closePath(); var m = new THREE.Mesh(new THREE.ShapeGeometry(s), flat(color)); m.position.z = z; (parent||poster).add(m); return m; }
  function sprite(txt, color, font, parent){
    var c=document.createElement('canvas'); c.width=512; c.height=96; var x=c.getContext('2d'); 
    function draw(){ x.clearRect(0,0,512,96); x.fillStyle=color||'#2B2A26'; x.font=font||'500 42px Karla, system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,256,48); }
    draw();
    var map = new THREE.CanvasTexture(c);
    // Redraw once the webfont is in, otherwise the label keeps the fallback font
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ draw(); map.needsUpdate = true; });
    
    var s=new THREE.Sprite(new THREE.SpriteMaterial({map:map, transparent:true, depthWrite:false, opacity:0})); s.scale.set(1.0,0.19,1); (parent||poster).add(s); return s;
  }

  // ---------- the poster ----------
  var poster = new THREE.Group(); root.add(poster);
  var PW = 6.0, PH = 7.6;
  var posterFrame = new THREE.Mesh(new THREE.PlaneGeometry(PW+0.36, PH+0.36), flat(0xE3D5B6)); posterFrame.position.z = -3.02; poster.add(posterFrame);
  var skyMat = flat(COL.paper); var sky = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), skyMat); sky.position.z = -3.0; poster.add(sky);
  var titleSpr = sprite('STYRK-KARRIERE.NO', '#2F4A3A', '600 46px "Playfair Display", Georgia, serif'); titleSpr.position.set(0, PH/2-0.45, -2.9); titleSpr.scale.set(3.2,0.6,1);
  var subSpr = sprite('Karriererådgivning', '#B4532F', 'italic 500 34px "Playfair Display", Georgia, serif'); subSpr.position.set(0, PH/2-0.94, -2.9); subSpr.scale.set(2.35,0.42,1);
  // sun
  var sunMat = flat(COL.mustard); var sun = new THREE.Mesh(new THREE.CircleGeometry(0.72, 48), sunMat); sun.position.set(1.3, -1.0, -2.95); poster.add(sun);
  var sunRays = []; for (var r=0;r<12;r++){ var ray = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.32), flat(COL.mustard, 0)); var a = r/12*Math.PI*2; ray.userData.a = a; poster.add(ray); sunRays.push(ray); }
  // clouds
  var clouds = [[-1.6,1.9,1.0],[1.9,2.5,0.8],[-0.2,2.9,0.6]].map(function(c){ var g = new THREE.Group(); [[0,0,0.32],[0.32,0.05,0.24],[-0.3,0.02,0.22]].forEach(function(b){ var m = new THREE.Mesh(new THREE.CircleGeometry(b[2]*c[2],32), flat(0xF8F1E2)); m.position.set(b[0]*c[2], b[1]*c[2], 0); g.add(m); }); g.position.set(c[0], c[1], -2.93); poster.add(g); return g; });
  // mountain layers (poster style)
  var HW = PW/2, HB = -PH/2;
  shapeMesh([[-HW,HB],[-HW,0.2],[-2.2,1.0],[-1.3,0.3],[-0.4,1.4],[0.7,0.5],[1.6,1.6],[2.4,0.7],[HW,1.1],[HW,HB]], COL.sage, -2.6);
  shapeMesh([[-HW,HB],[-HW,-0.3],[-2.4,0.4],[-1.6,-0.4],[-0.6,0.7],[0.3,-0.2],[1.2,1.05],[2.0,0.1],[HW,0.45],[HW,HB]], COL.moss, -2.0);
  var ridge = shapeMesh([[-HW,HB],[-HW,-1.2],[-2.0,-0.6],[-1.0,-1.1],[0.1,0.15],[0.75,-0.35],[1.5,0.55],[2.3,-0.6],[HW,-0.3],[HW,HB]], COL.pine, -1.3);
  shapeMesh([[-HW,HB],[-HW,-2.2],[-1.6,-1.6],[-0.4,-2.3],[0.8,-1.7],[2.0,-2.4],[HW,-2.0],[HW,HB]], COL.deep, -0.6);
  // pines on foreground
  for (var t=0;t<14;t++){ var tx = -2.7 + t*0.42 + Math.sin(t*3.1)*0.08, ty = -2.45 - Math.abs(Math.sin(t*1.7))*0.5; var tr = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.5, 3), flat(0x1A2A20)); tr.position.set(tx, ty, -0.5); poster.add(tr); }

  // the path (rust ribbon) from valley to summit
  var pathPts = [[-2.4,-3.3,-0.4],[-1.4,-2.7,-0.45],[-1.9,-1.9,-0.5],[-0.7,-1.5,-1.0],[-1.1,-0.85,-1.15],[-0.2,-0.45,-1.2],[0.45,-0.55,-1.22],[0.9,-0.05,-1.25],[1.5,0.55,-1.25]].map(function(p){ return new THREE.Vector3(p[0],p[1],p[2]); });
  var path = new THREE.CatmullRomCurve3(pathPts);
  var pathLen = 220, pathPos = path.getPoints(pathLen);
  var pathGeo = new THREE.BufferGeometry().setFromPoints(pathPos);
  var pathLine = new THREE.Line(pathGeo, new THREE.LineBasicMaterial({color:COL.rust, transparent:true, opacity:0.35})); poster.add(pathLine);
  var tubeGeo = new THREE.TubeGeometry(path, 220, 0.035, 6, false); var walked = new THREE.Mesh(tubeGeo, flat(COL.rust)); poster.add(walked); var tubeCount = tubeGeo.index.count;
  // dashed remainder
  var dashMat = new THREE.LineDashedMaterial({color:COL.paper, dashSize:0.06, gapSize:0.06, transparent:true, opacity:0.65});
  var dashLine = new THREE.Line(pathGeo, dashMat); dashLine.computeLineDistances(); dashLine.position.z = 0.01; poster.add(dashLine);

  // two walkers: adviser (rust) and candidate (paper)
  function walker(bodyColor, headColor){
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.07,0.24,10), flat(bodyColor)); body.position.y = 0.12; g.add(body);
    var head = new THREE.Mesh(new THREE.CircleGeometry(0.055,20), flat(headColor)); head.position.set(0,0.3,0.01); g.add(head);
    poster.add(g); return g;
  }
  var adviser = walker(COL.rust, 0xE9C9A3), candidate = walker(0xFFFAF0, 0xE9C9A3);

  // signposts (5 layers)
  var SIGNS = [['Identitet',0.16],['Opplevelse',0.34],['Synlighet',0.52],['Kampanje',0.68],['Måling',0.86]];
  var signs = SIGNS.map(function(s){
    var p = path.getPoint(s[1]); var g = new THREE.Group(); g.position.set(p.x+0.22, p.y, p.z+0.02); poster.add(g);
    var pole = new THREE.Mesh(new THREE.PlaneGeometry(0.03,0.42), flat(0x5A3A26)); pole.position.y = 0.21; g.add(pole);
    var plank = new THREE.Mesh(new THREE.PlaneGeometry(0.62,0.15), flat(COL.mustard)); plank.position.set(0.22,0.38,0.005); g.add(plank);
    var l = sprite(s[0], '#2B2A26', '700 40px Karla, system-ui, sans-serif', g); l.position.set(0.22,0.38,0.01); l.scale.set(0.62,0.12,1); l.material.opacity = 1;
    g.scale.setScalar(0.001); return g;
  });
  // name sign at the trailhead (2)
  var trail = new THREE.Group(); var tp = path.getPoint(0.02); trail.position.set(tp.x-0.6, tp.y+0.1, tp.z+0.05); poster.add(trail);
  var tPole = new THREE.Mesh(new THREE.PlaneGeometry(0.04,0.6), flat(0x5A3A26)); tPole.position.y = 0.3; trail.add(tPole);
  var tBoard = new THREE.Mesh(new THREE.PlaneGeometry(1.25,0.36), flat(COL.pine)); tBoard.position.set(0,0.66,0.005); trail.add(tBoard);
  var tTxt = sprite('Styrk-karriere.no', '#EFE4CC', '600 44px "Playfair Display", Georgia, serif', trail); tTxt.position.set(0,0.68,0.01); tTxt.scale.set(1.15,0.22,1); tTxt.material.opacity = 1;
  trail.scale.setScalar(0.001);
  // three steps plateaus (4)
  var steps3 = [0.22, 0.45, 0.7].map(function(f,k){ var p = path.getPoint(f); var m = new THREE.Mesh(new THREE.CircleGeometry(0.16, 6), flat(COL.mustard, 0)); m.position.set(p.x, p.y, p.z+0.03); poster.add(m); var l = sprite('0'+(k+1), '#2B2A26', '700 54px Karla, system-ui, sans-serif'); l.position.set(p.x, p.y, p.z+0.04); l.scale.set(0.5,0.1,1); m.userData.l = l; return m; });
  // billboard (6)
  var board = new THREE.Group(); var bp = path.getPoint(0.66); board.position.set(bp.x-1.55, bp.y+0.25, bp.z+0.1); poster.add(board);
  var bLegs = [-0.35,0.35].map(function(x){ var m = new THREE.Mesh(new THREE.PlaneGeometry(0.04,0.5), flat(0x5A3A26)); m.position.set(x,0.25,0); board.add(m); return m; });
  var bFace = new THREE.Mesh(new THREE.PlaneGeometry(1.15,0.55), flat(COL.rust)); bFace.position.set(0,0.75,0.005); board.add(bFace);
  var bTxt = sprite('Karriererådgivning', '#EFE4CC', 'italic 600 34px "Playfair Display", Georgia, serif', board); bTxt.position.set(0,0.8,0.01); bTxt.scale.set(0.94,0.18,1); bTxt.material.opacity = 1;
  var bTag = sprite('Amedia · 1.–14. oktober', '#EFE4CC', '500 34px Karla, system-ui, sans-serif', board); bTag.position.set(0,0.62,0.01); bTag.scale.set(0.95,0.16,1); bTag.material.opacity = 1;
  board.scale.setScalar(0.001);
  var visitors = []; for (var v=0; v<10; v++){ var vm = new THREE.Mesh(new THREE.CircleGeometry(0.03,12), flat(COL.mustard, 0)); poster.add(vm); visitors.push(vm); }
  // SEO flags (7)
  var FLAGS = [['#4',[-0.6,0.7,-1.95]],['#2',[1.2,1.05,-1.95]]];
  var flags = FLAGS.map(function(f,k){ var g = new THREE.Group(); g.position.set(f[1][0], f[1][1], f[1][2]+0.02); poster.add(g);
    var pole = new THREE.Mesh(new THREE.PlaneGeometry(0.025,0.5), flat(0x2B2A26)); pole.position.y = 0.25; g.add(pole);
    var cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.34,0.2), flat(k===1?COL.rust:COL.mustard)); cloth.position.set(0.18,0.4,0.005); g.add(cloth);
    var l = sprite(f[0], k===1?'#EFE4CC':'#2B2A26', '700 64px Karla, system-ui, sans-serif', g); l.position.set(0.18,0.4,0.01); l.scale.set(0.5,0.1,1); l.material.opacity = 1;
    g.scale.setScalar(0.001); return g; });

  // competitors on the broad peak (1) and niche peaks (2)
  var compG = new THREE.Group(); poster.add(compG);
  var compFlags = [[1.38,1.42],[1.55,1.6],[1.72,1.5],[1.86,1.3]].map(function(q,k){ var g = new THREE.Group(); g.position.set(q[0], q[1], -2.55); compG.add(g);
    var pole = new THREE.Mesh(new THREE.PlaneGeometry(0.02,0.36), flat(0x55524C,0)); pole.position.y = 0.18; g.add(pole);
    var cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.2,0.12), flat(0x7E7A72,0)); cloth.position.set(0.1,0.3,0.004); g.add(cloth); return g; });
  var bigLbl = sprite('«karriererådgivning»', '#2B2A26', 'italic 600 40px "Playfair Display", Georgia, serif', compG); bigLbl.position.set(1.6, 2.15, -2.5); bigLbl.scale.set(1.6,0.3,1);
  var bigSub = sprite('etablerte aktører', '#55524C', '500 34px Karla, system-ui, sans-serif', compG); bigSub.position.set(1.6, 1.92, -2.5); bigSub.scale.set(1.1,0.2,1);
  var NICHE = [['ledere og fagspesialister',[-0.6,0.72,-1.95],0.52],['100 % digital',[1.2,1.07,-1.95],0.8],['jobbsøk fra utlandet',[-2.4,0.42,-1.95],0.3]];
  var nicheG = new THREE.Group(); poster.add(nicheG);
  var niche = NICHE.map(function(n){ var dot = new THREE.Mesh(new THREE.CircleGeometry(0.06,20), flat(COL.mustard,0)); dot.position.set(n[1][0], n[1][1], n[1][2]+0.03); nicheG.add(dot);
    var l = sprite(n[0], '#B4532F', '700 36px Karla, system-ui, sans-serif', nicheG); l.position.set(n[1][0], n[1][1]+0.22, n[1][2]+0.04); l.scale.set(1.35,0.25,1);
    var from = path.getPoint(n[2]); var route = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(from.x,from.y,from.z+0.02), new THREE.Vector3((from.x+n[1][0])/2, Math.max(from.y,n[1][1])+0.15, (from.z+n[1][2])/2), new THREE.Vector3(n[1][0], n[1][1], n[1][2]+0.03)]), new THREE.LineDashedMaterial({color:COL.rust, dashSize:0.05, gapSize:0.04, transparent:true, opacity:0}));
    route.computeLineDistances(); nicheG.add(route); return {dot:dot, l:l, route:route}; });
  // consultation cabin (6)
  var cabin = new THREE.Group(); var cp = path.getPoint(0.5); cabin.position.set(cp.x+0.32, cp.y+0.02, cp.z+0.04); poster.add(cabin);
  shapeMesh([[-0.2,0],[0.2,0],[0.2,0.22],[0,0.38],[-0.2,0.22]], COL.mustard, 0, cabin);
  shapeMesh([[-0.05,0],[0.05,0],[0.05,0.14],[-0.05,0.14]], COL.rust, 0.005, cabin);
  var win = new THREE.Mesh(new THREE.PlaneGeometry(0.07,0.06), flat(0xFFF1C9)); win.position.set(0.12,0.16,0.006); cabin.add(win);
  var cabL = sprite('Gratis samtale', '#2B2A26', '700 38px Karla, system-ui, sans-serif', cabin); cabL.position.set(0,0.52,0.01); cabL.scale.set(0.95,0.18,1); cabL.material.opacity = 1;
  cabin.scale.setScalar(0.001);
  // strata cross-section (9)
  var strataG = new THREE.Group(); strataG.position.set(-1.65, -2.9, 0.15); poster.add(strataG);
  var STR = [[COL.pine,'Grunnmur'],[0x3E5A45,'Nisjeinnhold'],[0x8C5530,'Kommersiell intensjon'],[COL.rust,'Forsterkning']];
  var strata = STR.map(function(s,k){ var m = new THREE.Mesh(new THREE.PlaneGeometry(2.3,0.32), flat(s[0], 0)); m.position.set(0, k*0.34, 0); strataG.add(m); var l = sprite(s[1], '#EFE4CC', '500 36px Karla, system-ui, sans-serif', strataG); l.position.set(0, k*0.34, 0.01); l.scale.set(1.5,0.14,1); m.userData.l = l; return m; });
  // lookout tower (9)
  var tower = new THREE.Group(); var sp = path.getPoint(0.97); tower.position.set(sp.x+0.35, sp.y-0.05, sp.z+0.02); poster.add(tower);
  [-0.12,0.12].forEach(function(x){ var leg = new THREE.Mesh(new THREE.PlaneGeometry(0.03,0.55), flat(0x5A3A26)); leg.position.set(x,0.27,0); leg.rotation.z = x>0?0.12:-0.12; tower.add(leg); });
  var deck = new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.05), flat(0x5A3A26)); deck.position.set(0,0.55,0.003); tower.add(deck);
  var screen = new THREE.Mesh(new THREE.PlaneGeometry(0.36,0.24), flat(COL.pine)); screen.position.set(0,0.75,0.004); tower.add(screen);
  var bars = [0.08,0.13,0.18].map(function(h,k){ var b = new THREE.Mesh(new THREE.PlaneGeometry(0.05,h), flat(COL.mustard)); b.position.set(-0.08+k*0.08, 0.66+h/2, 0.006); tower.add(b); return b; });
  tower.scale.setScalar(0.001);

  // star (SETAEI guide)
  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var glowT = tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.7)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); });
  var sparkT = tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); });
  var star = new THREE.Group(); poster.add(star);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowT, transparent:true, depthWrite:false})); glow.scale.set(0.9,0.9,1); star.add(glow);
  var spark = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkT, transparent:true, depthWrite:false})); spark.scale.set(0.24,0.24,1); star.add(spark);

  var layout = {x:2.55, y:0, z:15.5, s:1};
  function resize(){
    var ww=innerWidth, hh=innerHeight; renderer.setSize(ww,hh,false); camera.aspect=ww/hh; camera.updateProjectionMatrix();
    if (ww/hh > 1.1){ layout.x=2.55; layout.y=0; layout.z=15.5; } else { layout.x=0; layout.y=1.6; layout.z=26; }
  }
  addEventListener('resize', resize); resize();
  function clamp01(v){ return Math.max(0, Math.min(1, v)); }
  function p(c,k){ return clamp01((c - (k - 0.85))/0.85); }
  function w(c,k){ return Math.max(0, 1-Math.abs(c-k)); }
  function ease(t){ return t*t*(3-2*t); }
  var current = scrollStage(), clock = new THREE.Clock();
  var PAPER0 = new THREE.Color(COL.paper), DUSK = new THREE.Color(0xEBC096);

  function frame(){
    var time = reduce ? 0 : clock.getElapsedTime();
    current += (scrollStage() - current) * (reduce ? 1 : 0.06);
    ui(current);
    var c = current;
    camera.position.set(0, 0, layout.z); camera.lookAt(0,0,0);
    root.position.set(layout.x, layout.y, 0);
    poster.rotation.y = -0.18 + Math.sin(time*0.15)*0.03; poster.rotation.x = 0.02;

    // journey progress along path
    var f = clamp01(c / LAST) * 0.97;
    var fA = f, fC = Math.max(0, f - 0.018);
    var pA = path.getPoint(fA), pC = path.getPoint(fC);
    var bob = reduce ? 0 : Math.abs(Math.sin(time*5))*0.02;
    adviser.position.set(pA.x+0.04, pA.y + bob, pA.z+0.05); candidate.position.set(pC.x-0.04, pC.y + (reduce?0:Math.abs(Math.sin(time*5+1.2))*0.02), pC.z+0.06);
    walked.geometry.setDrawRange(0, Math.floor(tubeCount * fA / 3) * 3);

    // sun rises with identity (3), sets at end
    var p3 = p(c,4), pEnd = p(c,LAST);
    sun.position.y = -1.6 + ease(p3)*3.2 - pEnd*1.0;
    sunRays.forEach(function(ray,i){ var a = ray.userData.a + time*0.1; ray.position.set(sun.position.x + Math.cos(a)*0.95, sun.position.y + Math.sin(a)*0.95, -2.96); ray.rotation.z = a - Math.PI/2; ray.material.opacity = 0.9*p3; });
    skyMat.color.copy(PAPER0).lerp(DUSK, pEnd*0.85);
    clouds.forEach(function(cl,i){ cl.position.x = ((cl.position.x + 2.6 + (reduce?0:0.0015*(i+1))) % 5.6) - 2.6; });
    titleSpr.material.opacity = 0.95; subSpr.material.opacity = 0.9*clamp01(p(c,3)*1.2);

    // signposts (1)
    signs.forEach(function(g,i){ var on = clamp01(p(c,2)*1.4 - i*0.08); g.scale.setScalar(Math.max(0.001, ease(on))); });
    trail.scale.setScalar(Math.max(0.001, ease(p(c,3))));
    steps3.forEach(function(m,k){ var o = clamp01(p(c,5)*1.5 - k*0.2) * (1 - p(c,8)*0.7); m.material.opacity = o; m.userData.l.material.opacity = o; });
    board.scale.setScalar(Math.max(0.001, ease(p(c,7))));
    var w6 = w(c,7);
    visitors.forEach(function(vm,i){ var t2 = ((time*0.25) + i/10) % 1; var from = new THREE.Vector3(board.position.x, board.position.y+0.75, board.position.z+0.02); var to = path.getPoint(Math.min(0.97, 0.66 + t2*0.25)); vm.position.copy(from).lerp(to, ease(Math.min(1,t2*1.3))); vm.position.z += 0.02; vm.material.opacity = w6*(1-t2*0.4); vm.visible = w6>0.02; });
    flags.forEach(function(g,k){ g.scale.setScalar(Math.max(0.001, ease(clamp01(p(c,8)*1.5 - k*0.2)))); g.children[1].rotation.y = Math.sin(time*2+k)*0.25; });
    strata.forEach(function(m,k){ var o = clamp01(p(c,9)*1.6 - k*0.15) * (1 - p(c,10)); m.material.opacity = o; m.userData.l.material.opacity = o; m.position.x = (1-o)*-0.4; });
    tower.scale.setScalar(Math.max(0.001, ease(p(c,10))));
    var cOp = p(c,1) * (1 - 0.55*p(c,2));
    compFlags.forEach(function(g,k){ g.children.forEach(function(ch){ ch.material.opacity = cOp; }); g.children[1].rotation.y = Math.sin(time*2+k)*0.3; });
    bigLbl.material.opacity = 0.95*Math.max(cOp, 0.35*p(c,8)); bigSub.material.opacity = 0.8*cOp;
    niche.forEach(function(n,k){ var o = clamp01(p(c,2)*1.4 - k*0.15); n.dot.material.opacity = o; n.l.material.opacity = o*(1 - 0.5*p(c,8)); n.route.material.opacity = 0.85*o*(1 - 0.6*p(c,5)); });
    cabin.scale.setScalar(Math.max(0.001, ease(p(c,6)))); win.material.color.setHex(Math.sin(time*2) > 0 ? 0xFFE7A8 : 0xFFF1C9);
    bars.forEach(function(b,k){ b.scale.y = 0.6 + 0.4*Math.abs(Math.sin(time*0.8+k)); });

    // star guides just ahead of the walkers
    var sg = path.getPoint(Math.min(0.99, fA + 0.05));
    star.position.set(sg.x, sg.y + 0.35 + Math.sin(time*1.2)*0.03, sg.z + 0.12);
    spark.material.rotation = time*0.3;

    renderer.render(scene, camera);
    if (!reduce && !tabHidden) requestAnimationFrame(frame);
  }
  // Pause the loop while the tab is hidden
  var tabHidden = false;
  document.addEventListener('visibilitychange', function(){ var was = tabHidden; tabHidden = document.hidden; if (was && !tabHidden && !reduce) requestAnimationFrame(frame); });
  if (reduce){ addEventListener('scroll',function(){requestAnimationFrame(frame);},{passive:true}); addEventListener('resize',function(){requestAnimationFrame(frame);}); }
  requestAnimationFrame(frame);
  }
  var started = false; function go(){ if (!started){ started = true; init(); } }
  if (document.fonts && document.fonts.ready){ document.fonts.ready.then(go); setTimeout(go, 1500); } else go();
})();
