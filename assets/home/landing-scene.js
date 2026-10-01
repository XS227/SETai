// /services/landing-pages/: a landing page assembled part by part as you scroll, plus message-match and A/B demos
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // message match demo
  var V = {
    match:{bar:'<span>Salong Nord · Aprilkampanje</span>', h:'30 % på hårfarge i hele april', s:'Book innen 30. april. Gjelder alle farger og striper.', c:'Book time med rabatt', off:false, v:'<b>Treff:</b> Samme tilbud, samme ord, én knapp. Den besøkende vet at hun er på rett sted.'},
    home:{bar:'<span>Hjem</span><span>Om oss</span><span>Tjenester</span><span>Priser</span><span>Kontakt</span>', h:'Velkommen til Salong Nord', s:'Vi har klippet og farget hår siden 2010.', c:'Les mer om oss', off:true, v:'<b>Bom:</b> Hvor er de 30 prosentene? Den besøkende må lete, og de fleste gidder ikke.'}
  };
  var mmBtns = Array.prototype.slice.call(document.querySelectorAll('.mm-tabs button'));
  function setMM(k){
    var d = V[k];
    document.getElementById('lp-bar').innerHTML = d.bar;
    document.getElementById('lp-h').textContent = d.h;
    document.getElementById('lp-s').textContent = d.s;
    var c = document.getElementById('lp-c'); c.textContent = d.c; c.className = d.off ? 'off' : '';
    document.getElementById('lp-v').innerHTML = d.v;
    mmBtns.forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-v')===k)); });
    mmState = k;
  }
  var mmState = 'match';
  mmBtns.forEach(function(b){ b.addEventListener('click', function(){ setMM(b.getAttribute('data-v')); }); });

  // A/B calculator: two-proportion z-test
  function erf(x){ var s = x<0?-1:1; x=Math.abs(x); var t=1/(1+0.3275911*x); var y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x); return s*y; }
  function Phi(z){ return 0.5*(1+erf(z/Math.SQRT2)); }
  var nIn = document.getElementById('n'), nOut = document.getElementById('n-out'), abOut = document.getElementById('ab-out');
  var abSig = false;
  function calc(){
    var n = +nIn.value, pa = 0.03, pb = 0.036;
    var ca = Math.round(n*pa), cb = Math.round(n*pb);
    var p = (ca+cb)/(2*n), se = Math.sqrt(p*(1-p)*(2/n));
    var z = se>0 ? ((cb/n)-(ca/n))/se : 0, pv = 2*(1-Phi(Math.abs(z)));
    abSig = pv < 0.05;
    nOut.textContent = n.toLocaleString('nb-NO');
    abOut.className = 'out' + (abSig ? ' ok' : '');
    abOut.innerHTML = 'A: ' + ca + ' kunder, B: ' + cb + ' kunder. p = ' + pv.toFixed(3).replace('.',',') + '. ' + (abSig ? '<b>Signifikant.</b> Forskjellen er sannsynligvis ekte.' : '<b>Ikke ennå.</b> Forskjellen kan fortsatt være tilfeldig.');
  }
  nIn.addEventListener('input', calc); calc();

  // ---------- scroll + 3D ----------
  var canvas = document.getElementById('scene');
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-stage]'));
  var LAST = sections.length - 1;
  var bar = document.querySelector('.progress'), now = document.querySelector('.chapter-now'), lastCh = '';
  function scrollStage(){
    var mid = scrollY + innerHeight*0.5, st = 0;
    for (var i=0;i<sections.length;i++){ var top=sections[i].offsetTop, h=sections[i].offsetHeight; if (mid>=top){ var f=(mid-top)/h; st = i + Math.min(1, Math.max(0,(f-0.6)/0.4)); } }
    return Math.min(LAST, st);
  }
  function ui(st){
    var max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (max>0 ? Math.min(1, scrollY/max) : 0) + ')';
    var ch = sections[Math.round(st)].getAttribute('data-chapter') || '';
    if (ch !== lastCh){ lastCh = ch; now.textContent = ch; }
  }
  if (typeof THREE === 'undefined'){ canvas.style.display='none'; addEventListener('scroll',function(){ui(scrollStage());},{passive:true}); return; }
  var renderer;
  try { renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true}); } catch(e){ canvas.style.display='none'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2));
  renderer.setClearColor(0x10100F, 1);
  var scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x10100F, 15, 30);
  var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xffffff, 0.38));
  var key = new THREE.DirectionalLight(0xFFFAF0, 0.9); key.position.set(-4,6,7); scene.add(key);
  var rim = new THREE.DirectionalLight(0x5C84AE, 0.8); rim.position.set(5,2,-6); scene.add(rim);
  var root = new THREE.Group(); scene.add(root);
  (function(){
    var g = new THREE.BufferGeometry(), n = 480, a = new Float32Array(n*3);
    for (var i=0;i<n;i++){ a[i*3]=(Math.random()-.5)*22; a[i*3+1]=(Math.random()-.5)*14; a[i*3+2]=-3-Math.random()*9; }
    g.setAttribute('position', new THREE.BufferAttribute(a,3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({color:0xFFFAF0, size:0.035, transparent:true, opacity:0.3})));
  })();

  var CREAM = new THREE.Color(0xFFFAF0), ORANGE = new THREE.Color(0xF47A2A), tmp = new THREE.Color();
  var boxGeo = new THREE.BoxGeometry(1,1,1), edgeGeo = new THREE.EdgesGeometry(boxGeo);
  function blk(parent, x, y, w, h, orange){
    var m = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({color:orange?0x3A2416:0x1B1C1E, metalness:0.35, roughness:0.45, emissive:0xF47A2A, emissiveIntensity:orange?0.18:0, transparent:true}));
    var e = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({color:orange?0xF47A2A:0xFFFAF0, transparent:true, opacity:0.6}));
    m.add(e); m.scale.set(w,h,0.06); m.position.set(x,y,0.04); parent.add(m);
    return {m:m, e:e, base:[x,y], orange:!!orange, hl:0};
  }
  // main page
  var page = new THREE.Group(); root.add(page);
  var frame = blk(page, 0, 0, 1.8, 3.4); frame.m.position.z = -0.04; frame.m.scale.z = 0.03;
  var B = {
    head: blk(page, -0.15, 1.25, 1.25, 0.15),
    sub:  blk(page, -0.3, 1.04, 0.95, 0.07),
    cta1: blk(page, -0.42, 0.8, 0.62, 0.17, true),
    img:  blk(page, 0.5, 0.98, 0.5, 0.56),
    logos:[0,1,2,3,4].map(function(k){ return blk(page, -0.6 + k*0.3, 0.42, 0.22, 0.08); }),
    ben:  [0,1,2].map(function(k){ return blk(page, -0.54 + k*0.54, -0.05, 0.46, 0.5); }),
    test: blk(page, 0, -0.56, 1.45, 0.3),
    faq:  [0,1,2].map(function(k){ return blk(page, 0, -0.84 - k*0.12, 1.45, 0.06); }),
    cta2: blk(page, 0, -1.35, 0.85, 0.19, true)
  };
  var ALL = [B.head,B.sub,B.cta1,B.img,B.test,B.cta2].concat(B.logos,B.ben,B.faq);
  var HL = {
    3:[B.head,B.sub,B.cta1,B.img], 4:B.logos.concat([B.test]), 5:B.ben.concat(B.faq), 6:[B.cta1,B.cta2], 12:[B.cta1,B.cta2]
  };
  // nav (stage 0 only)
  var nav = new THREE.Group(); page.add(nav);
  var navBar = blk(nav, 0, 1.58, 1.8, 0.1);
  var tabs = [0,1,2,3].map(function(k){ return blk(nav, 0.05 + k*0.22, 1.58, 0.16, 0.05); });
  // ad card (2)
  function mkTracked(){ var g = new THREE.Group(); g.userData.list = []; root.add(g); return g; }
  var adG = mkTracked();
  var ad = blk(adG, -2.2, 1.1, 0.95, 0.6); var adStripe = blk(adG, -2.2, 0.95, 0.75, 0.08, true); var adH = blk(adG, -2.25, 1.22, 0.7, 0.08);
  adG.userData.list = [ad, adStripe, adH];
  var adLineMat = new THREE.LineDashedMaterial({color:0xF47A2A, dashSize:0.08, gapSize:0.06, transparent:true, opacity:0});
  var adLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.72,1.1,0.05), new THREE.Vector3(-0.78,1.25,0.08)]), adLineMat); adLine.computeLineDistances(); root.add(adLine);
  // fold line (3)
  var foldMat = new THREE.LineDashedMaterial({color:0xF47A2A, dashSize:0.07, gapSize:0.05, transparent:true, opacity:0});
  var fold = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.15,0.6,0.1), new THREE.Vector3(1.15,0.6,0.1)]), foldMat); fold.computeLineDistances(); page.add(fold);
  // cta link (6)
  var ctaMat = new THREE.LineDashedMaterial({color:0xF47A2A, dashSize:0.07, gapSize:0.05, transparent:true, opacity:0});
  var ctaLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.42,0.71,0.12), new THREE.Vector3(-1.05,0.3,0.12), new THREE.Vector3(-1.05,-1.2,0.12), new THREE.Vector3(-0.43,-1.35,0.12)]), ctaMat); ctaLine.computeLineDistances(); page.add(ctaLine);
  // gauge (7)
  var gaugeMat = new THREE.MeshBasicMaterial({color:0xF47A2A, transparent:true, opacity:0});
  var gauge = new THREE.Mesh(new THREE.TorusGeometry(2.1,0.025,6,120,Math.PI*1.4), gaugeMat); root.add(gauge);
  var gaugeBg = new THREE.Mesh(new THREE.TorusGeometry(2.1,0.01,6,120), new THREE.MeshBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0})); root.add(gaugeBg);
  // visitors (8)
  var VIS = 26, visitors = []; for (var i=0;i<VIS;i++){ var vm = new THREE.Mesh(new THREE.SphereGeometry(0.05,8,8), new THREE.MeshBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0})); root.add(vm); visitors.push(vm); }
  // B variant (9)
  var pageB = new THREE.Group(); root.add(pageB);
  var bList = [blk(pageB,0,0,1.8,3.4), blk(pageB,-0.15,1.25,1.25,0.15), blk(pageB,-0.3,1.04,0.95,0.07), blk(pageB,0,0.72,1.2,0.24,true), blk(pageB,0,0.05,1.45,0.7), blk(pageB,0,-0.7,1.45,0.4), blk(pageB,0,-1.35,1.1,0.24,true)];
  bList[0].m.position.z = -0.04;
  // SEO results (10)
  var seoG = mkTracked();
  var results = [0,1,2,3].map(function(k){ return blk(seoG, -2.25, 1.0 - k*0.32, 1.05, 0.2, k===0); }); seoG.userData.list = results;
  var seoMat = new THREE.LineDashedMaterial({color:0xF47A2A, dashSize:0.08, gapSize:0.06, transparent:true, opacity:0});
  var seoLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.72,1.0,0.05), new THREE.Vector3(-0.78,1.25,0.08)]), seoMat); seoLine.computeLineDistances(); root.add(seoLine);
  // examples (11)
  var exG = new THREE.Group(); root.add(exG);
  var exPages = [0,1,2,3].map(function(k){ var g = new THREE.Group(); exG.add(g); var parts = [blk(g,0,0,0.9,1.6), blk(g,-0.05,0.6,0.65,0.08), blk(g,-0.15,0.42,0.4,0.1,true), blk(g,0,-0.05,0.72,0.45), blk(g,0,-0.62,0.5,0.12,true)]; parts[0].m.position.z = -0.04; g.userData.parts = parts; return g; });
  function textSprite(txt){
    var c=document.createElement('canvas'); c.width=512; c.height=96;
    var x=c.getContext('2d');
    function draw(){ x.clearRect(0,0,512,96); x.fillStyle='#FFFAF0'; x.font='500 40px "Space Grotesk", Inter, system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,256,48); }
    draw();
    var map = new THREE.CanvasTexture(c);
    // Redraw once the webfont is in, otherwise the label keeps the fallback font
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ draw(); map.needsUpdate = true; });
    var s=new THREE.Sprite(new THREE.SpriteMaterial({map:map, transparent:true, depthWrite:false, opacity:0})); s.scale.set(1.3,0.24,1); return s;
  }
  var exLabels = ['Frisør','Bilvask','Restaurant','Klinikk'].map(function(t,k){ var s = textSprite(t); exPages[k].add(s); s.position.set(0,-1.05,0.1); return s; });
  var abLabels = [textSprite('A'), textSprite('B')]; abLabels.forEach(function(s){ root.add(s); });

  // star
  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var glowT = tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.75)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); });
  var sparkT = tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); });
  var star = new THREE.Group(); root.add(star);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); glow.scale.set(1.8,1.8,1); star.add(glow);
  var spark = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkT, transparent:true, depthWrite:false})); spark.scale.set(0.42,0.42,1); star.add(spark);
  star.add(new THREE.PointLight(0xF47A2A, 1.6, 5));

  function starPos(s){
    switch(s){
      case 0: return [1.25, 1.8, 0.4];
      case 1: return [0.6, 2.15, 0.4];
      case 2: return [-2.2, 1.6, 0.4];
      case 3: return [-0.42, 0.8, 0.45];
      case 4: return [0.75, 0.6, 0.45];
      case 5: return [0.75, -0.2, 0.45];
      case 6: return [0, -1.35, 0.45];
      case 7: return [0, 2.2, 0.3];
      case 8: return [0, -1.35, 0.5];
      case 9: return [0.95, -1.35*0.72, 0.5];
      case 10: return [-2.25, 1.35, 0.4];
      case 11: return [0, 1.5, 0.4];
      default: return [0, -1.35, 0.5];
    }
  }
  function w(st,k){ return Math.max(0, 1-Math.abs(st-k)); }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function ease(t){ return t*t*(3-2*t); }
  function paint(bk, hl, op){ tmp.copy(bk.orange ? ORANGE : CREAM); if (!bk.orange) tmp.lerp(ORANGE, hl); bk.e.material.color.copy(tmp); bk.e.material.opacity = (0.3 + 0.6*Math.max(hl, bk.orange?0.6:0))*op; bk.m.material.opacity = op; bk.m.visible = op > 0.02; bk.e.visible = op > 0.02; }

  var current = scrollStage(), clock = new THREE.Clock();
  var layout = {x:2.4, y:0, z:11.5};
  function resize(){
    var ww=innerWidth, hh=innerHeight; renderer.setSize(ww,hh,false); camera.aspect=ww/hh; camera.updateProjectionMatrix();
    if (ww/hh > 1.1){ layout.x=2.4; layout.y=0; layout.z=11.5; } else { layout.x=0; layout.y=2.0; layout.z=16.5; }
  }
  addEventListener('resize', resize); resize();

  function frameLoop(){
    var time = reduce ? 0 : clock.getElapsedTime();
    current += (scrollStage() - current) * (reduce ? 1 : 0.065);
    ui(current);
    var a=Math.floor(current), b=Math.min(a+1,LAST), t=ease(current-a);
    if (a>=LAST){ a=LAST; b=LAST; t=0; }
    camera.position.set(0, 0.6, layout.z); camera.lookAt(0, 0, 0);
    root.position.set(layout.x, layout.y, 0);
    root.rotation.y = -0.28 + Math.sin(time*0.18)*0.06;

    var w9 = w(current,9), w11 = w(current,11);
    // main page transform (AB shift, examples hide)
    page.position.x = -0.95*w9; page.scale.setScalar(Math.max(0.001, (1 - 0.28*w9) * (1 - 0.9*w11)));
    var pageOp = 1 - 0.9*w11;

    // highlights
    var hlA = HL[a] || [], hlB = HL[b] || [], anyHl = (hlA.length? (1-t):0) + (hlB.length? t:0);
    ALL.forEach(function(bk){
      var h = (hlA.indexOf(bk)>=0 ? (1-t) : 0) + (hlB.indexOf(bk)>=0 ? t : 0);
      bk.hl += (h - bk.hl)*0.15;
      bk.m.position.z = 0.04 + bk.hl*0.16;
      var dim = 1 - 0.55*anyHl*(1-bk.hl);
      paint(bk, bk.hl, pageOp*dim);
    });
    // CTA pulse when highlighted
    [B.cta1,B.cta2].forEach(function(bk){ bk.m.material.emissiveIntensity = 0.18 + 0.25*bk.hl*(0.5+0.5*Math.sin(time*4)); });
    paint(frame, 0, pageOp);

    // nav: visible at 0, flies away by 1
    var navOut = Math.min(1, Math.max(0, current));
    nav.position.set(navOut*1.6, navOut*1.2, navOut*0.6); nav.rotation.z = -navOut*0.4;
    [navBar].concat(tabs).forEach(function(bk){ paint(bk, 0, (1-navOut)*pageOp); });

    // ad (2)
    var w2 = w(current,2);
    adG.userData.list.forEach(function(bk){ paint(bk, 0, w2); });
    adLineMat.opacity = 0.8*w2;
    // fold (3)
    foldMat.opacity = 0.9*w(current,3);
    // cta line (6)
    ctaMat.opacity = 0.85*Math.max(w(current,6), w(current,12));
    // gauge (7)
    var w7 = w(current,7); gaugeMat.opacity = 0.85*w7; gaugeBg.material.opacity = 0.15*w7; gauge.rotation.z = -Math.PI*0.2 + Math.sin(time*0.8)*0.05; gauge.scale.setScalar(0.85 + 0.15*w7);
    // visitors (8)
    var w8 = w(current,8);
    visitors.forEach(function(vm,i){
      var f = ((time*0.16) + i/VIS) % 1, conv = i%4===0;
      var y0 = 1.3 - (i%9)*0.3, x, y, z = 0.25;
      if (f < 0.45){ x = -2.8 + f/0.45*2.4; y = y0; }
      else if (conv){ var g = (f-0.45)/0.55; x = -0.4 + g*0.4; y = y0 + (-1.35 - y0)*g; }
      else { var g2 = (f-0.45)/0.55; x = -0.4 + g2*3.0; y = y0 - g2*0.3; }
      vm.position.set(x, y, z);
      vm.material.color.setHex(conv && f>0.8 ? 0xF47A2A : 0xFFFAF0);
      vm.material.opacity = w8 * (conv ? 1 : Math.max(0, 1 - Math.max(0, f-0.55)*2.2));
      vm.visible = w8 > 0.01;
    });
    // B variant (9)
    pageB.position.x = 0.95; pageB.scale.setScalar(0.72);
    bList.forEach(function(bk){ paint(bk, 0, w9); });
    abLabels[0].position.set(-0.95, 1.55, 0.3); abLabels[1].position.set(0.95, 1.55, 0.3);
    abLabels.forEach(function(s,k){ s.material.opacity = w9; });
    if (w9 > 0.5) bList[6].m.material.emissiveIntensity = abSig ? 0.45 : 0.18;
    // SEO (10)
    var w10 = w(current,10);
    seoG.userData.list.forEach(function(bk,k){ paint(bk, 0, w10); }); seoMat.opacity = 0.8*w10;
    // examples (11)
    exPages.forEach(function(g,k){
      var ang = (k-1.5)*0.55; g.position.set(Math.sin(ang)*2.4, 0, Math.cos(ang)*0.8 - 0.6); g.rotation.y = -ang*0.7;
      g.scale.setScalar(Math.max(0.001, 0.6 + 0.4*w11));
      g.userData.parts.forEach(function(bk){ paint(bk, 0, w11); });
      exLabels[k].material.opacity = w11;
    });

    var SA=starPos(a), SB=starPos(b);
    star.position.set(lerp(SA[0],SB[0],t), lerp(SA[1],SB[1],t)+Math.sin(time*1.2)*0.04, lerp(SA[2],SB[2],t));
    spark.material.rotation = time*0.3;
    renderer.render(scene, camera);
    if (!reduce && !tabHidden) requestAnimationFrame(frameLoop);
  }
  // Pause the loop while the tab is hidden
  var tabHidden = false;
  document.addEventListener('visibilitychange', function(){ var was = tabHidden; tabHidden = document.hidden; if (was && !tabHidden && !reduce) requestAnimationFrame(frameLoop); });
  if (reduce){ addEventListener('scroll',function(){requestAnimationFrame(frameLoop);},{passive:true}); addEventListener('resize',function(){requestAnimationFrame(frameLoop);}); }
  requestAnimationFrame(frameLoop);
})();
