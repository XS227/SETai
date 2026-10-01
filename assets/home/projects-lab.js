// /projects/: SETAEI Lab. Filter chips (counts computed from the cards, #hash and old ?tjeneste= links work),
// and a 3D lab where each project is an object; the hovered/centred card lights up and the star moves to it.
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = Array.prototype.slice.call(document.querySelectorAll('.pgrid > li'));
  var groups = Array.prototype.slice.call(document.querySelectorAll('.group'));
  var chips = Array.prototype.slice.call(document.querySelectorAll('.fchip'));
  var hint = document.querySelector('.hint'), empty = document.querySelector('.empty');
  var state = {filter:'alle', hover:null, view:null};
  var listeners = [];
  function emit(){ listeners.forEach(function(f){ f(state); }); }
  function tagsOf(li){ return li.getAttribute('data-tags').split(' '); }

  // counts on the chips come from the cards, so they never drift
  chips.forEach(function(c){
    var f = c.getAttribute('data-f'), n = f==='alle' ? items.length : items.filter(function(li){ return tagsOf(li).indexOf(f) >= 0; }).length;
    var sm = c.querySelector('small'); if (sm) sm.textContent = n;
    if (n === 0 && f !== 'alle') c.hidden = true;
  });
  var countEl = document.querySelector('[data-count="projects"]'); if (countEl) countEl.textContent = items.length;

  function applyFilter(f, push){
    if (!chips.some(function(c){ return c.getAttribute('data-f')===f; })) f = 'alle';
    state.filter = f; var n = 0;
    items.forEach(function(li){ var ok = f==='alle' || tagsOf(li).indexOf(f) >= 0; li.hidden = !ok; if (ok) n++; });
    groups.forEach(function(g){ g.hidden = !g.querySelector('.pgrid > li:not([hidden])'); });
    empty.hidden = n>0;
    chips.forEach(function(c){ c.setAttribute('aria-pressed', String(c.getAttribute('data-f')===f)); });
    var chip = document.querySelector('.fchip[data-f="'+f+'"]'), label = chip ? chip.firstChild.textContent.trim() : '';
    hint.textContent = f==='alle' ? 'Viser alle ' + n + ' prosjekter' : 'Viser ' + n + (n===1 ? ' prosjekt' : ' prosjekter') + ' innen ' + label;
    if (push && history.replaceState) history.replaceState(null, '', f==='alle' ? location.pathname : '#' + f);
    emit();
  }
  chips.forEach(function(c){ c.addEventListener('click', function(){ applyFilter(c.getAttribute('data-f'), true); }); });

  // Deep links: #ai, and the old ?tjeneste=web style from the previous projects page
  var OLD = {web:'nettside', seo:'seo', ai:'ai', app:'app', video:'video', brand:'merkevare', automation:'automatisering', strategy:'strategi'};
  var q = new URLSearchParams(location.search).get('tjeneste'), h = (location.hash||'').replace('#','');
  applyFilter(h || (q && OLD[q]) || 'alle', false);

  items.forEach(function(li){
    var id = li.getAttribute('data-id'), card = li.querySelector('.pcard');
    li.addEventListener('mouseenter', function(){ state.hover = id; card.classList.add('on'); emit(); });
    li.addEventListener('mouseleave', function(){ if (state.hover===id) state.hover = null; card.classList.remove('on'); emit(); });
    li.addEventListener('focusin', function(){ state.hover = id; emit(); });
    li.addEventListener('focusout', function(){ if (state.hover===id) state.hover = null; emit(); });
  });
  // the card nearest the middle of the screen (touch and scrolling)
  function nearest(){
    if (scrollY < innerHeight*0.5){ if (state.view){ state.view = null; emit(); } return; }
    var best = null, bd = 1e9, mid = innerHeight/2;
    items.forEach(function(li){ if (li.hidden) return; var r = li.getBoundingClientRect(), d = Math.abs(r.top + r.height/2 - mid); if (d < bd){ bd = d; best = li.getAttribute('data-id'); } });
    if (best !== state.view){ state.view = best; emit(); }
  }
  addEventListener('scroll', nearest, {passive:true});

  // ── 3D lab ───────────────────────────────────────────────
  var canvas = document.getElementById('scene');
  if (typeof THREE === 'undefined'){ canvas.style.display='none'; return; }
  var renderer;
  try { renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true}); } catch(e){ canvas.style.display='none'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2));
  renderer.setClearColor(0x10100F, 1);
  var scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x10100F, 14, 28);
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
  var floor = new THREE.GridHelper(7, 14, 0x2E2C29, 0x1E1D1B); floor.position.y = -2.3; root.add(floor);

  function textSprite(txt){
    var c=document.createElement('canvas'); c.width=512; c.height=96;
    var x=c.getContext('2d');
    function draw(){ x.clearRect(0,0,512,96); x.fillStyle='#FFFAF0'; x.font='500 40px "Space Grotesk", Inter, system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,256,48); }
    draw();
    var map = new THREE.CanvasTexture(c);
    // Redraw once the webfont is in, otherwise the label keeps the fallback font
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ draw(); map.needsUpdate = true; kick(); });
    var s=new THREE.Sprite(new THREE.SpriteMaterial({map:map, transparent:true, depthWrite:false, opacity:0.8}));
    s.scale.set(1.3,0.24,1); return s;
  }
  function part(g, geo, rx){
    var m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color:0x1B1C1E, metalness:0.45, roughness:0.4, emissive:0xF47A2A, emissiveIntensity:0, transparent:true, opacity:1}));
    var e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0.55}));
    if (rx){ m.rotation.x = rx; e.rotation.x = rx; }
    g.add(m); g.add(e); g.userData.mats.push(m.material); g.userData.edges.push(e.material); return m;
  }
  // One object per project; positions group the three worlds (products top, lab middle, clients bottom)
  var SPEC = {
    realgram:{pos:[0,1.0,0.2], name:'REALGRAM', build:function(g){ part(g,new THREE.IcosahedronGeometry(0.36,1)); var r = part(g,new THREE.TorusGeometry(0.58,0.02,6,48)); r.rotation.x = 1.2; g.userData.ring = r; }},
    shahnameh:{pos:[-1.5,1.35,-0.5], name:'Shahnameh', build:function(g){ part(g,new THREE.OctahedronGeometry(0.38,0)); }},
    trustai:{pos:[1.5,1.25,-0.3], name:'TrustAI', build:function(g){ for (var k=0;k<3;k++){ var m = part(g,new THREE.BoxGeometry(0.6,0.12,0.45)); m.position.y = -0.18 + k*0.18; } }},
    numerologist:{pos:[2.35,0.15,-0.8], name:'Numerologist AI', build:function(g){ part(g,new THREE.DodecahedronGeometry(0.32,0)); }},
    si:{pos:[-2.35,0.25,-0.6], name:'Super Intelligence', build:function(g){ part(g,new THREE.IcosahedronGeometry(0.26,1)); g.userData.moon = part(g,new THREE.SphereGeometry(0.05,8,8)); }},
    film:{pos:[-1.1,-0.35,0.4], name:'The Son He Did Not Know', build:function(g){ part(g,new THREE.BoxGeometry(0.72,0.42,0.04)); var i = part(g,new THREE.BoxGeometry(0.56,0.3,0.05)); i.position.z = 0.01; }},
    crown:{pos:[0.35,-0.45,0.6], name:'Crown of My Heart', build:function(g){ part(g,new THREE.TorusKnotGeometry(0.18,0.055,48,6)); }},
    gardoon:{pos:[1.6,-0.6,0.2], name:'Gardoon', build:function(g){ part(g,new THREE.CylinderGeometry(0.3,0.3,0.1,12), Math.PI/2); part(g,new THREE.CylinderGeometry(0.1,0.1,0.14,8), Math.PI/2); }},
    somi:{pos:[-1.7,-1.55,0], name:'SOMI Klinikken', build:function(g){ part(g,new THREE.BoxGeometry(0.62,0.42,0.04)); var b = part(g,new THREE.BoxGeometry(0.62,0.06,0.05)); b.position.y = 0.18; }},
    styrk:{pos:[0,-1.65,0.25], name:'Styrk Karriere', build:function(g){ part(g,new THREE.BoxGeometry(0.62,0.42,0.04)); var b = part(g,new THREE.BoxGeometry(0.62,0.06,0.05)); b.position.y = 0.18; }},
    volla:{pos:[1.7,-1.55,0], name:'Volla Byggmester', build:function(g){ part(g,new THREE.BoxGeometry(0.45,0.32,0.4)); var r = part(g,new THREE.ConeGeometry(0.4,0.28,4)); r.position.y = 0.3; r.rotation.y = Math.PI/4; }}
  };
  var TAGS = {}; items.forEach(function(li){ TAGS[li.getAttribute('data-id')] = tagsOf(li); });
  var IDS = Object.keys(SPEC).filter(function(id){ return TAGS[id]; }), objs = {};
  IDS.forEach(function(id){
    var g = new THREE.Group(); g.userData = {mats:[], edges:[], hl:0, dim:1, sc:1};
    SPEC[id].build(g); g.position.set(SPEC[id].pos[0], SPEC[id].pos[1], SPEC[id].pos[2]);
    var l = textSprite(SPEC[id].name); l.position.set(0,-0.48,0.15); g.add(l); g.userData.label = l;
    root.add(g); objs[id] = g;
  });

  var LINKS = [['realgram','shahnameh'],['realgram','trustai'],['realgram','si'],['trustai','numerologist'],['shahnameh','film'],['film','crown'],['crown','gardoon'],['somi','styrk'],['styrk','volla']];
  var lp = [];
  LINKS.forEach(function(p){ if (!objs[p[0]] || !objs[p[1]]) return; var A = SPEC[p[0]].pos, B = SPEC[p[1]].pos; lp.push(A[0],A[1],A[2],B[0],B[1],B[2]); });
  var lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lp),3));
  root.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0.12})));

  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var glowT = tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.75)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); });
  var sparkT = tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); });
  var star = new THREE.Group(); root.add(star);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); glow.scale.set(1.8,1.8,1); star.add(glow);
  var spark = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkT, transparent:true, depthWrite:false})); spark.scale.set(0.42,0.42,1); star.add(spark);
  star.add(new THREE.PointLight(0xF47A2A, 1.8, 5));
  var starPos = new THREE.Vector3(0, 2.2, 0.4), target = new THREE.Vector3();

  var layout = {x:2.6, y:0.1, z:12};
  function resize(){
    var w=innerWidth, hh=innerHeight; renderer.setSize(w,hh,false); camera.aspect=w/hh; camera.updateProjectionMatrix();
    if (w/hh > 1.1){ layout.x=2.6; layout.y=0.1; layout.z=12; } else { layout.x=0; layout.y=2.3; layout.z=16.5; }
  }
  addEventListener('resize', resize); resize();
  // the lab fades back once you scroll into the cards
  function fade(){ var v = Math.max(0.3, 1 - scrollY/(innerHeight*0.9)*0.7); canvas.style.opacity = v.toFixed(2); }
  addEventListener('scroll', fade, {passive:true}); fade();

  var clock = new THREE.Clock(), tourIdx = 0, tourT = 0;
  listeners.push(function(){ tourT = -10; kick(); });
  var running = false, tabHidden = false;
  function frame(){
    running = false;
    var time = reduce ? 0 : clock.getElapsedTime();
    camera.position.set(0, 0.8, layout.z); camera.lookAt(0, 0, 0);
    root.position.set(layout.x, layout.y, 0);
    root.rotation.y = -0.18 + Math.sin(time*0.12)*0.1;

    var focus = state.hover || state.view;
    var visibleIds = IDS.filter(function(id){ return state.filter==='alle' || TAGS[id].indexOf(state.filter) >= 0; });
    if (!focus && visibleIds.length){
      // nothing in focus: a slow tour through the visible projects
      if (time - tourT > 3.2){ tourT = time; tourIdx = (tourIdx + 1) % visibleIds.length; }
      focus = visibleIds[tourIdx % visibleIds.length];
    }
    var k2 = reduce ? 1 : 0.08;
    IDS.forEach(function(id, k){
      var g = objs[id], u = g.userData, inF = visibleIds.indexOf(id) >= 0;
      var tHl = id===focus ? 1 : (state.filter!=='alle' && inF ? 0.5 : 0);
      var tDim = inF ? 1 : 0.18, tSc = id===focus ? 1.25 : (inF ? 1 : 0.8);
      u.hl += (tHl-u.hl)*k2; u.dim += (tDim-u.dim)*k2; u.sc += (tSc-u.sc)*k2;
      g.scale.setScalar(u.sc);
      g.rotation.y = time*(0.25 + (k%4)*0.08) + k; g.position.y = SPEC[id].pos[1] + Math.sin(time*0.6 + k)*0.05;
      tmp.copy(CREAM).lerp(ORANGE, u.hl);
      u.edges.forEach(function(m){ m.color.copy(tmp); m.opacity = (0.35 + u.hl*0.6) * u.dim; });
      u.mats.forEach(function(m){ m.opacity = 0.35 + 0.65*u.dim; m.emissiveIntensity = u.hl*0.2; });
      u.label.material.opacity = (0.35 + u.hl*0.65) * u.dim;
      if (u.ring) u.ring.rotation.z = time*0.6;
      if (u.moon) u.moon.position.set(Math.cos(time*1.4)*0.45, Math.sin(time*1.4)*0.15, Math.sin(time*1.4)*0.45);
    });
    if (objs[focus]){ var fp = objs[focus].position; target.set(fp.x + 0.45, fp.y + 0.55, fp.z + 0.3); } else target.set(0,2,0.4);
    starPos.lerp(target, reduce ? 1 : 0.06);
    star.position.set(starPos.x, starPos.y + Math.sin(time*1.2)*0.04, starPos.z);
    spark.material.rotation = time*0.3;
    renderer.render(scene, camera);
    // Animate while the tab is visible and the lab is still near the top of the page
    if (!reduce && !tabHidden && scrollY < innerHeight*6) kick();
  }
  function kick(){ if (!running){ running = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', kick, {passive:true});
  addEventListener('resize', kick);
  document.addEventListener('visibilitychange', function(){ tabHidden = document.hidden; if (!tabHidden) kick(); });
  kick();
})();
