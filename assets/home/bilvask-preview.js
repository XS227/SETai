// exact preview copy from bilvask-scene.js
(function(){
  var reduce = false;
  var canvas = document.querySelector('.preview-bilvask');
  if (!canvas) return;
  var sections = [];
  var LAST = 9;
  var calc={car:'sedan',wash:'full',add:{felg:false,voks:false,understell:false}};
  var INCLUDED={full:['felg','voks']};
  function scrollStage(){ return 0; }
  function ui(){}
  if (typeof THREE === 'undefined'){ canvas.style.display='none'; return; }

  function init(){
  var renderer;
  try { renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true}); } catch(e){ canvas.style.display='none'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2));
  renderer.setClearColor(0x10100F, 1);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;

  var scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x10100F, 16, 36);
  var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  (function(){
    var env = new THREE.Scene(); env.background = new THREE.Color(0x141413);
    function panel(color, pw, ph, pos){ var m = new THREE.Mesh(new THREE.PlaneGeometry(pw,ph), new THREE.MeshBasicMaterial({color:color, side:THREE.DoubleSide})); m.position.set(pos[0],pos[1],pos[2]); m.lookAt(0,0,0); env.add(m); }
    panel(0xFFFFFF, 8, 1.2, [0, 6, 0]); panel(0xFFFFFF, 8, 1.2, [0, 6, 3]); panel(0x7FC4E8, 4, 3, [-6, 2, 3]); panel(0xF47A2A, 2, 2, [6, 1, -3]);
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(env, 0.03).texture;
  })();
  scene.add(new THREE.HemisphereLight(0x9DB4CC, 0x15110D, 0.35));
  var keyLight = new THREE.DirectionalLight(0xFFF0E0, 0.7); keyLight.position.set(-4,7,6); scene.add(keyLight);
  var root = new THREE.Group(); scene.add(root);

  function std(c, o){ return new THREE.MeshStandardMaterial(Object.assign({color:c, roughness:0.6, metalness:0.1}, o||{})); }
  function box(bw,bh,bd,mat,x,y,z,parent){ var m = new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), mat); m.position.set(x,y,z); (parent||root).add(m); return m; }
  function sprite(txt, color, font, parent){
    var c=document.createElement('canvas'); c.width=512; c.height=96; var x=c.getContext('2d');
    function draw(){ x.clearRect(0,0,512,96); x.fillStyle=color||'#FFFAF0'; x.font=font||'600 40px "Space Grotesk", Inter, system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,256,48); }
    draw();
    var map = new THREE.CanvasTexture(c);
    // Redraw once the webfont is in, otherwise the label keeps the fallback font
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ draw(); map.needsUpdate = true; });
    var s=new THREE.Sprite(new THREE.SpriteMaterial({map:map, transparent:true, depthWrite:false, opacity:0})); s.scale.set(1.4,0.26,1); (parent||root).add(s); return s;
  }
  function clamp01(v){ return Math.max(0, Math.min(1, v)); }
  function near(c,k){ return Math.max(0, 1-Math.abs(c-k)); }
  function ease(t){ return t*t*(3-2*t); }
  function lerp(a,b,t){ return a+(b-a)*t; }
  var FONT = '600 40px "Space Grotesk", Inter, system-ui, sans-serif';

  // ---------- floor + tunnel ----------
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), std(0x121211, {roughness:0.35, metalness:0.3})); floor.rotation.x = -Math.PI/2; root.add(floor);
  box(8.6, 0.01, 1.7, std(0x1C1C1B, {roughness:0.5}), 0, 0.005, 0);
  [-0.6, 0.6].forEach(function(z){ box(8.6, 0.06, 0.06, std(0x3A3F47,{metalness:0.6,roughness:0.3}), 0, 0.03, z); });
  for (var ai=0; ai<7; ai++){ var arrow = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 3), new THREE.MeshBasicMaterial({color:0x7FC4E8, transparent:true, opacity:0.35})); arrow.rotation.z = -Math.PI/2; arrow.rotation.x = Math.PI/2; arrow.position.set(-3.6 + ai*1.2, 0.02, 0); root.add(arrow); }
  var STATIONS = [{x:-2.4, name:'Skum', key:'foam'}, {x:-1.2, name:'Børster', key:'felg'}, {x:0, name:'Skyll', key:'understell'}, {x:1.2, name:'Voks', key:'voks'}, {x:2.4, name:'Tørk', key:'dry'}];
  var archMat = std(0x262A31, {roughness:0.45, metalness:0.5});
  var arches = STATIONS.map(function(s){
    var g = new THREE.Group(); g.position.x = s.x; root.add(g);
    box(0.14, 2.0, 0.14, archMat, 0, 1.0, -1.05, g); box(0.14, 2.0, 0.14, archMat, 0, 1.0, 1.05, g); box(0.16, 0.16, 2.26, archMat, 0, 2.05, 0, g);
    var led = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 2.0), new THREE.MeshBasicMaterial({color:0x7FC4E8})); led.position.set(0.09, 1.95, 0); g.add(led);
    var l = sprite(s.name, '#FFFAF0', FONT, g); l.position.set(0, 2.42, 0); l.scale.set(0.9,0.17,1);
    g.userData = {led:led, label:l, x:s.x, key:s.key, glow:0}; return g;
  });
  var signG = new THREE.Group(); signG.position.set(-3.4, 2.75, 0); root.add(signG);
  box(2.4, 0.42, 0.08, std(0x0F1B26,{roughness:0.4, metalness:0.3, emissive:0x0E2E44, emissiveIntensity:0.6}), 0, 0, 0, signG);
  var signTxt = sprite('BILVASKEXPRESS', '#7FC4E8', '700 46px "Space Grotesk", Inter, system-ui, sans-serif', signG); signTxt.position.set(0,0,0.06); signTxt.scale.set(2.2,0.4,1); signTxt.material.opacity = 1;

  // station effects
  var foam = []; for (var i=0;i<46;i++){ var fm = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random()*0.04, 8, 8), new THREE.MeshStandardMaterial({color:0xFFFFFF, roughness:0.9, transparent:true, opacity:0})); fm.userData = {x:(Math.random()-0.5)*0.5, z:(Math.random()-0.5)*1.6, o:Math.random()}; root.add(fm); foam.push(fm); }
  var brushes = [-0.85, 0.85].map(function(z){ var g = new THREE.Group(); g.position.set(-1.2, 0.85, z); root.add(g); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,1.6,8), archMat)); for (var k=0;k<14;k++){ var br = new THREE.Mesh(new THREE.BoxGeometry(0.02,1.5,0.18), std(k%2?0x7FC4E8:0x3A6E8C,{roughness:0.9})); br.rotation.y = k/14*Math.PI; g.add(br); } return g; });
  var drops = []; for (i=0;i<40;i++){ var dr = new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.18,4), new THREE.MeshBasicMaterial({color:0x7FC4E8, transparent:true, opacity:0})); dr.userData = {x:(Math.random()-0.5)*0.4, z:(Math.random()-0.5)*1.7, o:Math.random()}; root.add(dr); drops.push(dr); }
  var waxSweep = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.0), new THREE.MeshBasicMaterial({color:0xF47A2A, transparent:true, opacity:0, side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending})); waxSweep.rotation.y = Math.PI/2; waxSweep.position.set(1.2, 1.0, 0); root.add(waxSweep);
  var airLines = []; for (i=0;i<16;i++){ var al = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.4, 0.01), new THREE.MeshBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0})); al.userData = {z:(i/15-0.5)*1.8, o:Math.random()}; root.add(al); airLines.push(al); }

  // ---------- the car ----------
  var car = new THREE.Group(); root.add(car);
  var paint = new THREE.MeshPhysicalMaterial({color:0x5B4E42, roughness:0.9, metalness:0.1, clearcoat:0, clearcoatRoughness:0.1});
  var glass = new THREE.MeshPhysicalMaterial({color:0x0C1116, roughness:0.08, metalness:0.2, clearcoat:1});
  var body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.42, 0.95), paint); body.position.y = 0.48; car.add(body);
  var hood = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.9), paint); hood.position.set(0.72, 0.71, 0); car.add(hood);
  var cabGlass = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.38, 0.88), glass); cabGlass.position.set(-0.12, 0.88, 0); car.add(cabGlass);
  var cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.05, 0.9), paint); cabRoof.position.set(-0.12, 1.09, 0); car.add(cabRoof);
  var pillars = [-0.66, 0.42].map(function(x){ var m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.9), paint); m.position.set(x, 0.88, 0); car.add(m); return m; });
  var wheels = [[0.65,0.5],[0.65,-0.5],[-0.65,0.5],[-0.65,-0.5]].map(function(q){ var g = new THREE.Group(); g.position.set(q[0], 0.22, q[1]); car.add(g); var tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.16,20), std(0x111214,{roughness:0.85})); tyre.rotation.x = Math.PI/2; g.add(tyre); var rim = new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,0.17,12), std(0xBFC4CA,{metalness:0.9,roughness:0.25})); rim.rotation.x = Math.PI/2; g.add(rim); return g; });
  var lights = [0.36,-0.36].map(function(z){ var h = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.08,0.2), new THREE.MeshStandardMaterial({color:0xFFFFFF, emissive:0xFFF4E0, emissiveIntensity:1.2})); h.position.set(1.01, 0.55, z); car.add(h); var rl = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.08,0.22), new THREE.MeshStandardMaterial({color:0x5A0F0F, emissive:0xC2261F, emissiveIntensity:0.9})); rl.position.set(-1.01, 0.56, z); car.add(rl); return h; });
  // plate (AI/SI stage)
  var plate = sprite('EK 24 816', '#14100C', '700 58px "Space Grotesk", Inter, system-ui, sans-serif', car); plate.position.set(1.03, 0.4, 0); plate.scale.set(0.42,0.1,1); plate.material.opacity = 0.95;
  var plateBg = new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.1), new THREE.MeshBasicMaterial({color:0xFFFAF0})); plateBg.rotation.y = Math.PI/2; plateBg.position.set(1.022, 0.4, 0); car.add(plateBg);
  var scanBeam = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.9), new THREE.MeshBasicMaterial({color:0xF47A2A, transparent:true, opacity:0, side:THREE.DoubleSide, blending:THREE.AdditiveBlending})); scanBeam.rotation.y = Math.PI/2; scanBeam.scale.y = 0.4; root.add(scanBeam);
  var chips = ['Vipps-ID','Historikk','Klippekort','Referral','AI/SI-forslag'].map(function(t){ return sprite(t, '#F47A2A', FONT); });
  var protoLbl = sprite('Prototype', '#B7B0A4', '500 36px "Space Grotesk", Inter, system-ui, sans-serif');

  // car type morph
  var TYPES = {sedan:{bh:0.42, ch:0.38, cl:1.1, cx:-0.12, hood:1}, suv:{bh:0.55, ch:0.46, cl:1.35, cx:-0.18, hood:1}, van:{bh:0.6, ch:0.6, cl:1.7, cx:-0.15, hood:0.4}};
  var morph = {bh:0.42, ch:0.38, cl:1.1, cx:-0.12, hood:1};

  // ---------- map (local SEO stage) ----------
  var mapG = new THREE.Group(); root.add(mapG);
  var PINS = [['Lillestrøm',[-5,0,3.6]],['Strømmen',[-6.2,0,-2.6]],['Skedsmo',[5.2,0,-3.2]],['Romerike',[5.4,0,3.4]]];
  var pinObjs = PINS.map(function(pn){ var g = new THREE.Group(); g.position.set(pn[1][0], 0, pn[1][2]); mapG.add(g);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.28,20,20), new THREE.MeshStandardMaterial({color:0xF47A2A, emissive:0xF47A2A, emissiveIntensity:0.4, transparent:true})); head.position.y = 0.9; g.add(head);
    var tip = new THREE.Mesh(new THREE.ConeGeometry(0.16,0.6,16), new THREE.MeshStandardMaterial({color:0xF47A2A, transparent:true})); tip.rotation.x = Math.PI; tip.position.y = 0.4; g.add(tip);
    var ring = new THREE.Mesh(new THREE.RingGeometry(0.3,0.36,40), new THREE.MeshBasicMaterial({color:0xF47A2A, transparent:true, side:THREE.DoubleSide})); ring.rotation.x = -Math.PI/2; ring.position.y = 0.02; g.add(ring);
    var l = sprite(pn[0], '#FFFAF0', '700 44px "Space Grotesk", Inter, system-ui, sans-serif', g); l.position.y = 1.55; l.scale.set(2.0,0.37,1);
    var road = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0.03,0), new THREE.Vector3(-pn[1][0]*0.5, 0.03, -pn[1][2]*0.2), new THREE.Vector3(-pn[1][0], 0.03, -pn[1][2])]), new THREE.LineDashedMaterial({color:0x7FC4E8, dashSize:0.25, gapSize:0.15, transparent:true})); road.computeLineDistances(); g.add(road);
    g.userData = {head:head, tip:tip, ring:ring, label:l, road:road}; return g; });

  // star (SETAEI guide)
  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var glowT = tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.7)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); });
  var sparkT = tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); });
  var star = new THREE.Group(); root.add(star);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); glow.scale.set(1.4,1.4,1); star.add(glow);
  var spark = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkT, transparent:true, depthWrite:false})); spark.scale.set(0.36,0.36,1); star.add(spark);
  var spot = new THREE.SpotLight(0xFFF1E0, 0, 12, 0.5, 0.5, 1.2); spot.position.set(0, 6, 2); spot.target = car; root.add(spot);

  // car x per stage: 0 hero, 1 mission, 2 car type, 3 wash select, 4 price, 5 book, 6 map, 7 proto, 8 skills, 9 final
  var CARX = [-5.2, -4.4, -4.0, -2.2, -0.2, 1.8, 4.6, 5.0, 5.0, 5.4];
  var layout = {x:0, dist:12.5};
  function resize(){
    var ww=canvas.clientWidth||400, hh=canvas.clientHeight||250; renderer.setSize(ww,hh,false); camera.aspect=ww/hh; camera.updateProjectionMatrix();
    if (ww/hh > 1.1){ layout.x=0; layout.dist=12.5; } else { layout.x=0; layout.dist=17; }
  }
  addEventListener('resize', resize); resize();
  var current = 0, clock = new THREE.Clock(), lastTime = 0;
  var DIRTY = new THREE.Color(0x5B4E42), CLEAN = new THREE.Color(0x15324F);

  function renderFrame(){
    var time = reduce ? 0 : clock.getElapsedTime(), dt = Math.min(0.05, time - lastTime); lastTime = time;
    var cyc=(time*(LAST/28))%(LAST*2); var targetStage=cyc<=LAST?cyc:(LAST*2-cyc); current += (targetStage - current) * 0.06;
    ui(current);
    var c = current;
    var a = Math.floor(c), b = Math.min(a+1, LAST), t = ease(c - a);
    var cx = lerp(CARX[Math.min(a, CARX.length-1)], CARX[Math.min(b, CARX.length-1)], t);
    // final: turntable spin at exit
    var wFin = near(c, LAST);
    car.position.set(cx, 0, 0);
    car.rotation.y = wFin > 0 ? (reduce ? 0.6 : time*0.35)*wFin : 0;
    wheels.forEach(function(g){ g.rotation.z = -cx*2.2; });

    // car type: cycles on its own stage, then follows the calculator
    var tp = TYPES[c > 1.5 ? calc.car : 'sedan'];
    if (near(c,2) > 0.6 && !reduce){ tp = TYPES[['sedan','suv','van'][Math.floor(time/1.8)%3]]; }
    ['bh','ch','cl','cx','hood'].forEach(function(k){ morph[k] += (tp[k]-morph[k])*0.08; });
    body.scale.y = morph.bh/0.42; body.position.y = 0.27 + morph.bh/2;
    cabGlass.scale.set(morph.cl/1.1, morph.ch/0.38, 1); cabGlass.position.set(morph.cx, 0.27 + morph.bh + morph.ch/2, 0);
    cabRoof.scale.x = morph.cl/1.1*0.93; cabRoof.position.set(morph.cx, 0.27 + morph.bh + morph.ch + 0.02, 0);
    pillars[0].position.set(morph.cx - morph.cl/2 + 0.03, 0.27 + morph.bh + morph.ch/2, 0); pillars[1].position.set(morph.cx + morph.cl/2 - 0.03, 0.27 + morph.bh + morph.ch/2, 0); pillars.forEach(function(pl){ pl.scale.y = morph.ch/0.38; });
    hood.position.y = 0.27 + morph.bh + 0.03; hood.scale.x = morph.hood; hood.position.x = 0.72 - (1-morph.hood)*0.2;
    lights.forEach(function(h){ h.position.y = 0.27 + morph.bh*0.65; });

    // dirt → clean as the car passes the stations
    var clean = clamp01((cx + 2.6)/4.8);
    paint.color.copy(DIRTY).lerp(CLEAN, clean);
    paint.roughness = lerp(0.9, 0.18, clean); paint.metalness = lerp(0.1, 0.55, clean); paint.clearcoat = lerp(0, 1, clamp01((cx-1.0)/1.2)); paint.envMapIntensity = lerp(0.4, 1.4, clean);

    // stations light up when the car is near, or when picked in the calculator
    var w3 = near(c,3), inc = INCLUDED[calc.wash] || [];
    arches.forEach(function(g){
      var u = g.userData, nearCar = clamp01(1 - Math.abs(cx - u.x)/0.9);
      var sel = (u.key==='foam' || u.key==='dry') ? 1 : ((calc.add[u.key] || inc.indexOf(u.key)>=0) ? 1 : 0.15);
      u.glow += (Math.max(nearCar, w3*sel) - u.glow)*0.15;
      u.led.material.color.setHex(u.glow > 0.5 ? 0xF47A2A : 0x7FC4E8);
      u.led.scale.y = 1 + u.glow*1.5;
      u.label.material.opacity = 0.35 + 0.65*u.glow;
    });
    var mapW = near(c,6);
    var nf = clamp01(1 - Math.abs(cx + 2.4)/1.0);
    foam.forEach(function(fm){ var ph = ((time*0.5) + fm.userData.o) % 1; fm.position.set(-2.4 + fm.userData.x, 2.0 - ph*1.6, fm.userData.z); fm.material.opacity = nf*(1-ph*0.3); fm.visible = nf > 0.02; });
    var nb = clamp01(1 - Math.abs(cx + 1.2)/1.1);
    brushes.forEach(function(g,k){ g.rotation.y += (reduce?0:dt) * 12 * (k?1:-1) * Math.max(0.15, nb); g.position.z = (k? 1 : -1) * lerp(0.85, 0.62, nb); });
    var nr = clamp01(1 - Math.abs(cx)/1.0);
    drops.forEach(function(dr){ var ph = ((time*1.4) + dr.userData.o) % 1; dr.position.set(dr.userData.x, 1.95 - ph*1.9, dr.userData.z); dr.material.opacity = nr*0.85; dr.visible = nr > 0.02; });
    var nw = clamp01(1 - Math.abs(cx - 1.2)/0.9);
    waxSweep.material.opacity = nw*0.45*(0.6+0.4*Math.sin(time*6)); waxSweep.position.x = 1.2 + Math.sin(time*2.5)*0.25;
    var nd = clamp01(1 - Math.abs(cx - 2.4)/0.9);
    airLines.forEach(function(al){ var ph = ((time*2.0) + al.userData.o) % 1; al.position.set(2.4 + (ph-0.5)*0.2, 1.9 - ph*1.4, al.userData.z); al.material.opacity = nd*0.6*(1-ph); al.visible = nd > 0.02; });

    // plate scan + profile chips (AI/SI stage)
    var w7 = near(c,7);
    scanBeam.material.opacity = w7*0.9; scanBeam.position.set(cx + 1.25, 0.4 + Math.sin(time*3)*0.12, 0);
    chips.forEach(function(s,k){ var an = k/5*Math.PI*2 + time*0.4; s.position.set(cx + Math.cos(an)*1.9, 1.3 + Math.sin(an*2)*0.15, Math.sin(an)*1.6); s.material.opacity = w7*(0.55 + 0.45*clamp01(Math.sin(an)+0.4)); });
    protoLbl.position.set(cx, 2.2, 0); protoLbl.material.opacity = 0.9*w7;

    // map
    mapG.visible = mapW > 0.01;
    pinObjs.forEach(function(g,k){ var u = g.userData, on = clamp01(mapW*1.6 - k*0.15); g.scale.setScalar(Math.max(0.001, on)); u.head.material.opacity = u.tip.material.opacity = on; u.ring.material.opacity = on*0.8; u.ring.scale.setScalar(1 + ((time*0.6 + k*0.25)%1)*2.5); u.label.material.opacity = on; u.road.material.opacity = on*0.7; g.position.y = Math.abs(Math.sin(time*1.4+k))*0.08*on; });

    spot.intensity = 2.4*wFin;

    // camera
    var orbit = -0.55 + c*0.04 + (reduce?0:Math.sin(time*0.1)*0.04) + wFin*0.25;
    var el = 0.32 + 0.95*mapW - 0.06*wFin;
    var dist = layout.dist + 7*mapW - 1.5*wFin;
    var focus = new THREE.Vector3(lerp(cx*0.55, 0, mapW), lerp(0.9, 0, mapW), 0);
    camera.position.set(focus.x + Math.sin(orbit)*Math.cos(el)*dist, focus.y + Math.sin(el)*dist, Math.cos(orbit)*Math.cos(el)*dist);
    var right = new THREE.Vector3(Math.cos(orbit), 0, -Math.sin(orbit));
    camera.position.addScaledVector(right, -layout.x*(1+0.5*mapW));
    camera.lookAt(focus.clone().addScaledVector(right, -layout.x*(1+0.5*mapW)));

    // star rides above the car, flies to the pins on the map
    var sPos = new THREE.Vector3(cx + 0.2, 1.75 + Math.sin(time*1.2)*0.05, 0.2);
    if (mapW > 0.3){ var pin = pinObjs[Math.floor(time/1.6)%4].position; sPos.lerp(new THREE.Vector3(pin.x+0.4, 1.6, pin.z), mapW); }
    star.position.copy(sPos); spark.material.rotation = time*0.3;

    renderer.render(scene, camera);
    if (!reduce && !tabHidden) requestAnimationFrame(renderFrame);
  }
  // Pause the loop while the tab is hidden
  var tabHidden = false;
  document.addEventListener('visibilitychange', function(){ var was = tabHidden; tabHidden = document.hidden; if (was && !tabHidden && !reduce) requestAnimationFrame(renderFrame); });
  requestAnimationFrame(renderFrame);
  }
  var started = false; function go(){ if (!started){ started = true; init(); } }
  if (document.fonts && document.fonts.ready){ document.fonts.ready.then(go); setTimeout(go, 1500); } else go();
})();
