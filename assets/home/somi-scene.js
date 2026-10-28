// /projects/somiklinikken/: from unrest to calm, one scene per section of the clinic case
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('scene');
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-stage]'));
  var LAST = sections.length - 1;
  var meter = document.querySelector('.meter'), chapEl = document.querySelector('.chap'), lastC = '';
  function scrollStage(){
    var mid = scrollY + innerHeight*0.5, st = 0;
    for (var i=0;i<sections.length;i++){ var top=sections[i].offsetTop, h=sections[i].offsetHeight; if (mid>=top){ var f=(mid-top)/h; st = i + Math.min(1, Math.max(0,(f-0.55)/0.45)); } }
    return Math.min(LAST, st);
  }
  function ui(st){ meter.style.transform = 'scaleX(' + (st/LAST) + ')'; var c = sections[Math.round(st)].getAttribute('data-chap'); if (c !== lastC){ lastC = c; chapEl.textContent = c; } }
  addEventListener('scroll', function(){ ui(scrollStage()); }, {passive:true}); ui(scrollStage());
  if (typeof THREE === 'undefined'){ canvas.style.display='none'; return; }
  var renderer;
  try { renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true}); } catch(e){ canvas.style.display='none'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2));
  renderer.setClearColor(0x10100F, 1);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;

  var scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x10100F, 14, 30);
  var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

  // soft studio environment for the pearl
  (function(){
    var env = new THREE.Scene();
    env.background = new THREE.Color(0x14161B);
    function panel(color, w, h, pos, rot){ var m = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({color:color, side:THREE.DoubleSide})); m.position.set(pos[0],pos[1],pos[2]); m.lookAt(0,0,0); env.add(m); }
    panel(0xFFF1E6, 6, 3, [0, 6, 4]);
    panel(0xE7B3A6, 4, 4, [-6, 1, 2]);
    panel(0x9DB4CC, 3, 4, [6, 0, -3]);
    panel(0xFFD9B8, 3, 1, [2, -4, 5]);
    var pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.04).texture;
  })();
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));
  var key = new THREE.DirectionalLight(0xFFF0E6, 0.9); key.position.set(-3,5,6); scene.add(key);
  var rimL = new THREE.PointLight(0xD9A79A, 1.2, 12); rimL.position.set(3,1,-3); scene.add(rimL);

  var root = new THREE.Group(); scene.add(root);
  (function(){
    var g = new THREE.BufferGeometry(), n = 380, a = new Float32Array(n*3);
    for (var i=0;i<n;i++){ a[i*3]=(Math.random()-.5)*22; a[i*3+1]=(Math.random()-.5)*14; a[i*3+2]=-4-Math.random()*8; }
    g.setAttribute('position', new THREE.BufferAttribute(a,3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({color:0xF1E3DA, size:0.03, transparent:true, opacity:0.25})));
  })();

  function pearlMat(color){ return new THREE.MeshPhysicalMaterial({color:color, roughness:0.16, metalness:0.0, clearcoat:1.0, clearcoatRoughness:0.08, envMapIntensity:1.2, transparent:true}); }
  function sprite(txt, parent, color, font){
    var c=document.createElement('canvas'); c.width=512; c.height=96; var x=c.getContext('2d'); 
    function draw(){ x.clearRect(0,0,512,96); x.fillStyle=color||'#F1E3DA'; x.font=font||'500 38px "Space Grotesk", Inter, system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,256,48); }
    draw();
    var map = new THREE.CanvasTexture(c);
    // Redraw once the webfont is in, otherwise the label keeps the fallback font
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ draw(); map.needsUpdate = true; });
    
    var s=new THREE.Sprite(new THREE.SpriteMaterial({map:map, transparent:true, depthWrite:false, opacity:0})); s.scale.set(1.35,0.25,1); (parent||root).add(s); return s;
  }
  function clamp01(v){ return Math.max(0, Math.min(1, v)); }
  function w(c,k){ return Math.max(0, 1-Math.abs(c-k)); }
  function p(c,k){ return clamp01((c-(k-0.85))/0.85); }
  function ease(t){ return t*t*(3-2*t); }

  // ---------- main pearl with displaceable surface ----------
  var pearlGeo = new THREE.IcosahedronGeometry(1, 4);
  var basePos = pearlGeo.attributes.position.array.slice();
  var pearl = new THREE.Mesh(pearlGeo, pearlMat(0xF1E3DA)); root.add(pearl);
  var halo = new THREE.Sprite(new THREE.SpriteMaterial({map:(function(){ var c=document.createElement('canvas'); c.width=c.height=128; var x=c.getContext('2d'); var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(241,227,218,.45)'); g.addColorStop(0.5,'rgba(217,167,154,.15)'); g.addColorStop(1,'rgba(217,167,154,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); return new THREE.CanvasTexture(c); })(), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); halo.scale.set(4.2,4.2,1); root.add(halo);
  var shards = []; for (var i=0;i<18;i++){ var s = new THREE.Mesh(new THREE.TetrahedronGeometry(0.06 + Math.random()*0.05, 0), new THREE.MeshStandardMaterial({color:0x9AA0A6, roughness:0.5, transparent:true, opacity:0})); s.userData.dir = new THREE.Vector3(Math.random()-.5, Math.random()-.5, Math.random()-.5).normalize(); root.add(s); shards.push(s); }

  // water ripples
  var ripples = []; for (i=0;i<5;i++){ var r = new THREE.Mesh(new THREE.RingGeometry(1, 1.012, 96), new THREE.MeshBasicMaterial({color:0xF1E3DA, transparent:true, opacity:0, side:THREE.DoubleSide})); r.rotation.x = -Math.PI/2; r.position.y = -1.55; root.add(r); ripples.push(r); }

  // five questions (1)
  var QG = new THREE.Group(); root.add(QG);
  var qNames = ['Hva passer meg?','Hvem møter jeg?','Hva koster det?','Hvordan foregår det?','Hvor bestiller jeg?'];
  var qPearls = qNames.map(function(n,k){ var m = new THREE.Mesh(new THREE.SphereGeometry(0.16,32,32), pearlMat(k===4?0xE7B3A6:0xF1E3DA)); QG.add(m); var l = sprite(n, QG); m.userData.l = l; return m; });

  // treatment system (4): 8 pearls
  var CG = new THREE.Group(); root.add(CG);
  var cNames = ['Permanent makeup','Hud','Laser','Injeksjoner','Biostimulatorer','Gratis konsultasjon','Priser','Booking'];
  var cPearls = cNames.map(function(n,k){ var m = new THREE.Mesh(new THREE.SphereGeometry(0.2,32,32), pearlMat(k===5?0xE7B3A6:(k===4?0x8C8A86:0xF1E3DA))); CG.add(m); var l = sprite(n, CG); l.scale.set(1.2,0.22,1); m.userData.l = l; var a = (k/8)*Math.PI*2; m.userData.home = new THREE.Vector3(Math.cos(a)*1.75, Math.sin(a)*1.05, Math.sin(a)*0.4); return m; });

  // SEO map (5): disc + pin + treatment nodes
  var MG = new THREE.Group(); root.add(MG);
  var disc = new THREE.Mesh(new THREE.CircleGeometry(2.0, 96), new THREE.MeshBasicMaterial({color:0x1A1D23, transparent:true, opacity:0, side:THREE.DoubleSide})); disc.rotation.x = -Math.PI/2; disc.position.y = -1.0; MG.add(disc);
  var discRings = [0.7,1.3,1.9].map(function(r){ var m = new THREE.Mesh(new THREE.RingGeometry(r, r+0.008, 96), new THREE.MeshBasicMaterial({color:0xF1E3DA, transparent:true, opacity:0, side:THREE.DoubleSide})); m.rotation.x = -Math.PI/2; m.position.y = -0.99; MG.add(m); return m; });
  var pin = new THREE.Group(); MG.add(pin);
  var pinHead = new THREE.Mesh(new THREE.SphereGeometry(0.2,32,32), pearlMat(0xE7B3A6)); pinHead.position.y = 0.45; pin.add(pinHead);
  var pinTip = new THREE.Mesh(new THREE.ConeGeometry(0.12,0.45,24), pearlMat(0xE7B3A6)); pinTip.rotation.x = Math.PI; pinTip.position.y = 0.2; pin.add(pinTip);
  pin.position.y = -1.0;
  var pinL = sprite('Sandnes', MG, '#F1E3DA', '600 40px "Space Grotesk", Inter, system-ui, sans-serif'); pinL.position.set(0, -0.15, 0.4);
  var seoNodes = ['microblading','laser hårfjerning','hudpleie','injeksjoner'].map(function(n,k){ var a = k/4*Math.PI*2 + 0.4; var m = new THREE.Mesh(new THREE.SphereGeometry(0.1,24,24), pearlMat(0xF1E3DA)); m.position.set(Math.cos(a)*1.45, -0.85, Math.sin(a)*1.45); MG.add(m); var l = sprite(n, MG); l.scale.set(1.15,0.21,1); l.position.set(m.position.x, -0.55, m.position.z); m.userData.l = l; return m; });
  var seoLinesMat = new THREE.LineBasicMaterial({color:0xD9A79A, transparent:true, opacity:0});
  seoNodes.forEach(function(m){ var l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([m.position.clone(), new THREE.Vector3(0,-0.75,0)]), seoLinesMat); MG.add(l); });

  // chain (6)
  var HG = new THREE.Group(); root.add(HG);
  var hNames = ['Artikkel','Behandling','Pris','Booking'];
  var hPearls = hNames.map(function(n,k){ var m = new THREE.Mesh(new THREE.SphereGeometry(0.22,32,32), pearlMat(k===3?0xE7B3A6:0xF1E3DA)); m.position.set(-1.8 + k*1.2, 0.3 - k*0.25, 0); HG.add(m); var l = sprite(n, HG); l.position.set(m.position.x, m.position.y - 0.42, 0.2); m.userData.l = l; return m; });
  var hLineMat = new THREE.LineDashedMaterial({color:0xD9A79A, dashSize:0.07, gapSize:0.05, transparent:true, opacity:0});
  var hLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(hPearls.map(function(m){ return m.position.clone(); })), hLineMat); hLine.computeLineDistances(); HG.add(hLine);
  var flowDots = []; for (i=0;i<5;i++){ var fd = new THREE.Mesh(new THREE.SphereGeometry(0.045,12,12), new THREE.MeshBasicMaterial({color:0xFFE7D6, transparent:true, opacity:0})); HG.add(fd); flowDots.push(fd); }

  // trust venn (7)
  var TG = new THREE.Group(); root.add(TG);
  var vNames = ['Team','Anmeldelser','Resultater'];
  var venn = vNames.map(function(n,k){ var a = k/3*Math.PI*2 + Math.PI/2; var m = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.02, 12, 120), new THREE.MeshBasicMaterial({color:k===0?0xE7B3A6:0xF1E3DA, transparent:true, opacity:0})); m.position.set(Math.cos(a)*0.55, Math.sin(a)*0.55, 0); TG.add(m); var l = sprite(n, TG); l.position.set(Math.cos(a)*1.6, Math.sin(a)*1.5, 0.2); m.userData.l = l; return m; });
  // Trust signals that orbit in the "Tillit før booking" section
  var langs = ['Team','Erfaring','Anmeldelser'].map(function(t,k){ var l = sprite(t, TG, '#D9A79A', '600 44px "Space Grotesk", Inter, system-ui, sans-serif'); l.scale.set(1.3,0.24,1); return l; });

  // growth layers (8)
  var GG = new THREE.Group(); root.add(GG);
  var gNames = ['Nettsiden','SEO','Video','Annonser og sosiale medier'];
  var discs = gNames.map(function(n,k){ var m = new THREE.Mesh(new THREE.CylinderGeometry(1.5 - k*0.22, 1.5 - k*0.22, 0.12, 96), pearlMat(k===0?0xE7B3A6:0xF1E3DA)); m.position.y = -1.2 + k*0.55; GG.add(m); var l = sprite(n, GG); l.position.set(1.95 - k*0.1, m.position.y, 0.3); l.scale.set(1.5,0.27,1); m.userData.l = l; return m; });

  // star
  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var glowT = tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.7)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); });
  var sparkT = tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); });
  var star = new THREE.Group(); root.add(star);
  var sg = new THREE.Sprite(new THREE.SpriteMaterial({map:glowT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); sg.scale.set(1.4,1.4,1); star.add(sg);
  var sp = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkT, transparent:true, depthWrite:false})); sp.scale.set(0.36,0.36,1); star.add(sp);

  var STAR = [[1.0,1.15,0.6],[0.0,1.55,0.5],[1.1,1.1,0.7],[0.0,1.5,0.6],[0.0,0.0,1.1],[0.0,0.25,0.4],[1.8,0.0,0.4],[0,0.9,0.6],[0,0.85,0.4],[0.95,1.15,0.7]];
  var layout = {x:2.5, y:0.1, z:11};
  function resize(){
    var ww=innerWidth, hh=innerHeight; renderer.setSize(ww,hh,false); camera.aspect=ww/hh; camera.updateProjectionMatrix();
    if (ww/hh > 1.1){ layout.x=2.5; layout.y=0.1; layout.z=11; } else { layout.x=0; layout.y=2.0; layout.z=16; }
  }
  addEventListener('resize', resize); resize();
  var current = scrollStage(), clock = new THREE.Clock();
  var posAttr = pearlGeo.attributes.position, nrm = new THREE.Vector3();

  function setGroupOpacity(group, op){ group.visible = op > 0.01; group.traverse(function(o){ if (o.material && o.material.userData.keep === undefined){ o.material.opacity = op * (o.userData.baseOp || 1); } }); }

  function frame(){
    var time = reduce ? 0 : clock.getElapsedTime();
    current += (scrollStage() - current) * (reduce ? 1 : 0.06);
    ui(current);
    var c = current;
    camera.position.set(0, 0.7, layout.z); camera.lookAt(0, 0.1, 0);
    root.position.set(layout.x, layout.y, 0);
    root.rotation.y = Math.sin(time*0.15)*0.06;

    // pearl size/position per stage
    var showPearl = Math.max(w(c,0), w(c,1)*0.85, w(c,2), w(c,3), w(c,7)*0.5, w(c,9));
    var pScale = 1.1*w(c,0) + 0.75*w(c,1) + 1.0*w(c,2) + 1.05*w(c,3) + 0.35*w(c,4) + 0.25*w(c,5) + 0.3*w(c,6) + 0.45*w(c,7) + 0.25*w(c,8) + 1.15*w(c,9);
    pearl.scale.setScalar(Math.max(0.001, pScale));
    var pY = 0.25*w(c,0) + 0.1*w(c,1) + 0.1*w(c,2) + 0.15*w(c,3) + 0*w(c,4) + 0.7*w(c,8) + 0.25*w(c,9) + 1.8*w(c,8)*0;
    pearl.position.set(0, pY + (reduce?0:Math.sin(time*0.6)*0.05), 0);
    pearl.rotation.y = time*0.12;
    // noise for "before stability"
    var amp = 0.24 * clamp01((c-1.2)/0.4) * clamp01(1 - (c-1.85)/0.45);
    if (amp > 0.002 || pearl.userData.dirty){
      for (var i=0;i<posAttr.count;i++){
        var x = basePos[i*3], y = basePos[i*3+1], z = basePos[i*3+2];
        var n = Math.sin(x*7 + time*3) * Math.cos(y*6 - time*2.3) * Math.sin(z*8 + time*1.7);
        var glitch = (Math.sin(i*12.9898 + Math.floor(time*6)) > 0.93) ? 0.6 : 0;
        var d = 1 + amp*(n + glitch);
        posAttr.array[i*3] = x*d; posAttr.array[i*3+1] = y*d; posAttr.array[i*3+2] = z*d;
      }
      posAttr.needsUpdate = true; pearlGeo.computeVertexNormals(); pearl.userData.dirty = amp > 0.002;
    }
    pearl.material.color.setHex(amp > 0.08 ? 0xB9B4AE : 0xF1E3DA);
    halo.position.copy(pearl.position); halo.material.opacity = 0.5*Math.max(w(c,0), w(c,3), w(c,9)) ; halo.scale.setScalar(4.2*Math.max(0.3,pScale));
    shards.forEach(function(s,k){ var a = clamp01(amp/0.24); var f = ((time*0.4) + k/18) % 1; s.position.copy(s.userData.dir).multiplyScalar(1.1 + f*1.4).add(pearl.position); s.material.opacity = a*(1-f); s.visible = a > 0.02; s.rotation.set(time+k, time*0.7, 0); });

    // ripples (calm water)
    var rw = Math.max(w(c,0), w(c,3), w(c,9));
    ripples.forEach(function(r,k){ var f = ((time*0.12) + k/5) % 1; r.scale.setScalar(0.6 + f*3.2); r.material.opacity = rw*0.35*(1-f); r.visible = rw > 0.01; });

    // five questions
    var w1 = w(c,1); QG.visible = w1 > 0.01;
    qPearls.forEach(function(m,k){ var a = k/5*Math.PI*2 + time*0.18; m.position.set(Math.cos(a)*1.7, Math.sin(a)*0.75 + 0.1, Math.sin(a)*0.6); m.material.opacity = w1; m.scale.setScalar(Math.max(0.001,w1)); m.userData.l.position.set(m.position.x, m.position.y - 0.32, m.position.z + 0.2); m.userData.l.material.opacity = w1 * (0.55 + 0.45*clamp01(m.position.z+0.6)); });

    // treatments
    var w4 = w(c,4); CG.visible = w4 > 0.01;
    cPearls.forEach(function(m,k){ var h = m.userData.home; m.position.set(h.x*(0.6+0.4*w4), h.y*(0.6+0.4*w4), h.z); m.material.opacity = w4*(k===4?0.55:1); m.scale.setScalar(Math.max(0.001,w4)*(k===5?1.25:1)); m.userData.l.position.set(m.position.x, m.position.y - 0.36, m.position.z + 0.25); m.userData.l.material.opacity = w4; });

    // SEO map
    var w5 = w(c,5); MG.visible = w5 > 0.01;
    disc.material.opacity = 0.8*w5; discRings.forEach(function(r,k){ r.material.opacity = 0.3*w5; r.rotation.z = time*0.05*(k+1); });
    pinHead.material.opacity = pinTip.material.opacity = w5; pin.position.y = -1.0 + (reduce?0:Math.abs(Math.sin(time*1.5))*0.08);
    pinL.material.opacity = w5; seoLinesMat.opacity = 0.6*w5;
    seoNodes.forEach(function(m){ m.material.opacity = w5; m.userData.l.material.opacity = 0.9*w5; });
    MG.rotation.y = time*0.08; MG.rotation.x = 0.0;

    // chain
    var w6 = w(c,6); HG.visible = w6 > 0.01; hLineMat.opacity = 0.7*w6;
    hPearls.forEach(function(m,k){ m.material.opacity = w6; m.userData.l.material.opacity = w6; m.scale.setScalar(k===3 ? 1 + 0.15*Math.sin(time*3) : 1); });
    flowDots.forEach(function(d,k){ var f = ((time*0.22) + k/5) % 1, seg = Math.min(2, Math.floor(f*3)), lf = f*3 - seg; d.position.copy(hPearls[seg].position).lerp(hPearls[seg+1].position, lf); d.material.opacity = w6; });

    // trust
    var w7 = w(c,7); TG.visible = w7 > 0.01;
    venn.forEach(function(m,k){ m.material.opacity = 0.85*w7; m.rotation.x = Math.sin(time*0.4+k)*0.25; m.rotation.y = Math.cos(time*0.3+k)*0.25; m.userData.l.material.opacity = w7; });
    langs.forEach(function(l,k){ var a = k/3*Math.PI*2 + time*0.35; l.position.set(Math.cos(a)*2.2, Math.sin(a)*0.3 - 1.4, Math.sin(a)*0.8); l.material.opacity = w7*(0.5+0.5*clamp01(Math.sin(a)+0.5)); });

    // growth
    var w8 = w(c,8); GG.visible = w8 > 0.01;
    discs.forEach(function(m,k){ var on = clamp01(w8*1.6 - k*0.2); m.material.opacity = on; m.scale.set(Math.max(0.001,on), 1, Math.max(0.001,on)); m.rotation.y = time*0.1*(k+1); m.userData.l.material.opacity = on; });

    // star
    var a0 = Math.floor(c), b0 = Math.min(a0+1, LAST), t = ease(c - a0);
    var A = STAR[a0], B = STAR[b0];
    star.position.set(A[0]+(B[0]-A[0])*t, A[1]+(B[1]-A[1])*t + Math.sin(time*1.2)*0.04, A[2]+(B[2]-A[2])*t);
    sp.material.rotation = time*0.3;

    renderer.render(scene, camera);
    if (!reduce && !tabHidden) requestAnimationFrame(frame);
  }
  // Pause the loop while the tab is hidden
  var tabHidden = false;
  document.addEventListener('visibilitychange', function(){ var was = tabHidden; tabHidden = document.hidden; if (was && !tabHidden && !reduce) requestAnimationFrame(frame); });
  if (reduce){ addEventListener('scroll',function(){requestAnimationFrame(frame);},{passive:true}); addEventListener('resize',function(){requestAnimationFrame(frame);}); }
  requestAnimationFrame(frame);
})();
