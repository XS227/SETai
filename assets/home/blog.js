// /blog/: category/topic filter (with #hash deep links) and a 3D scene that follows the chosen category.
(function(){
  var state = {cat:'alle', sub:'alle'};
  var groups = Array.prototype.slice.call(document.querySelectorAll('.group'));
  var catBtns = Array.prototype.slice.call(document.querySelectorAll('button[data-cat]'));
  var subBtns = Array.prototype.slice.call(document.querySelectorAll('button[data-sub]'));
  var subBar = document.querySelector('.fchips.sub'), countEl = document.querySelector('.count');
  var listEl = document.getElementById('artikler');
  var LABEL = {tanker:'Tanker', prosjekter:'Bak kulissene', bedrift:'For bedrifter'};
  var SUBLABEL = {cto:'CTO', ai:'AI', nettside:'Nettside', seo:'SEO', saas:'SaaS', automatisering:'Automatisering'};
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var listeners = [];

  function apply(){
    var shown = 0;
    groups.forEach(function(g){
      var gc = g.getAttribute('data-cat'), visibleGroup = (state.cat==='alle' || state.cat===gc), n = 0;
      Array.prototype.forEach.call(g.querySelectorAll('li'), function(li){
        var ok = visibleGroup && (gc!=='bedrift' || state.sub==='alle' || li.getAttribute('data-sub')===state.sub);
        li.hidden = !ok; if (ok) n++;
      });
      g.hidden = n===0; shown += n;
    });
    catBtns.forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-cat')===state.cat)); });
    subBtns.forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-sub')===state.sub)); });
    subBar.hidden = state.cat!=='bedrift';
    var what = state.cat==='bedrift' && state.sub!=='alle' ? ' om ' + SUBLABEL[state.sub] : ' i ' + LABEL[state.cat];
    countEl.textContent = state.cat==='alle' ? 'Viser alle ' + shown + ' artikler' : 'Viser ' + shown + (shown===1 ? ' artikkel' : ' artikler') + what;
    listeners.forEach(function(fn){ fn(state); });
  }
  function scrollToList(){ listEl.scrollIntoView({behavior: reduce ? 'auto' : 'smooth'}); }
  function setCat(c, scroll){
    state.cat = c; state.sub = 'alle'; apply();
    if (history.replaceState) history.replaceState(null, '', c==='alle' ? '#artikler' : '#' + c);
    if (scroll) scrollToList();
  }
  catBtns.forEach(function(b){ b.addEventListener('click', function(){ setCat(b.getAttribute('data-cat'), b.classList.contains('door')); }); });
  subBtns.forEach(function(b){ b.addEventListener('click', function(){
    state.sub = b.getAttribute('data-sub'); apply();
    if (history.replaceState) history.replaceState(null, '', state.sub==='alle' ? '#bedrift' : '#' + state.sub);
  }); });

  // Old and new anchors (#essays was the previous id of the essay section)
  var MAP = {essays:['tanker','alle'], tanker:['tanker','alle'], prosjekter:['prosjekter','alle'], bedrift:['bedrift','alle'], cto:['bedrift','cto'], ai:['bedrift','ai'], nettside:['bedrift','nettside'], seo:['bedrift','seo'], saas:['bedrift','saas'], automatisering:['bedrift','automatisering']};
  var h = (location.hash||'').replace('#','');
  if (MAP[h]){ state.cat = MAP[h][0]; state.sub = MAP[h][1]; }
  apply();
  if (MAP[h]) setTimeout(function(){ listEl.scrollIntoView(); }, 0);

  // ── 3D ──────────────────────────────────────────────────
  var canvas = document.getElementById('scene');
  if (typeof THREE === 'undefined'){ canvas.style.display='none'; return; }
  var renderer;
  try { renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true}); } catch(e){ canvas.style.display='none'; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  renderer.setClearColor(0x10100F, 1);
  var scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x10100F, 15, 30);
  var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  var CREAM = new THREE.Color(0xFFFAF0), ORANGE = new THREE.Color(0xF47A2A), tmp = new THREE.Color();
  scene.add(new THREE.AmbientLight(0xffffff, 0.32));
  var key = new THREE.DirectionalLight(0xFFFAF0, 0.9); key.position.set(-4,6,6); scene.add(key);
  var rim = new THREE.DirectionalLight(0x5C84AE, 0.8); rim.position.set(5,2,-6); scene.add(rim);
  var root = new THREE.Group(); scene.add(root);
  (function(){
    var g = new THREE.BufferGeometry(), n = 520, a = new Float32Array(n*3);
    for (var i=0;i<n;i++){ a[i*3]=(Math.random()-.5)*22; a[i*3+1]=(Math.random()-.5)*14; a[i*3+2]=-3-Math.random()*9; }
    g.setAttribute('position', new THREE.BufferAttribute(a,3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({color:0xFFFAF0, size:0.035, transparent:true, opacity:0.3})));
  })();

  var boxGeo = new THREE.BoxGeometry(1,1,1), edgeGeo = new THREE.EdgesGeometry(boxGeo);
  function cube(){
    var m = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({color:0x18191B, metalness:0.35, roughness:0.48, emissive:0xF47A2A, emissiveIntensity:0}));
    var e = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({color:0xFFFAF0, transparent:true, opacity:0.5}));
    m.add(e); root.add(m); return {mesh:m, edge:e, hl:0};
  }
  // Clusters: essays = flowing wave (8), projects = 3 fanned frames, business = 6 topic cubes
  var CENTER = {tanker:[-1.7,1.1,0], prosjekter:[1.7,1.0,-0.3], bedrift:[0,-1.2,0.2]};
  var wave = [], frames = [], topics = [], i;
  for (i=0;i<8;i++) wave.push(cube());
  for (i=0;i<3;i++) frames.push(cube());
  for (i=0;i<6;i++) topics.push(cube());
  var SUBS = ['cto','ai','nettside','seo','saas','automatisering'];

  function tex(draw){ var c=document.createElement('canvas'); c.width=c.height=128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); }
  var glowT = tex(function(x){ var g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(244,122,42,.75)'); g.addColorStop(1,'rgba(244,122,42,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); });
  var sparkT = tex(function(x){ x.translate(64,64); x.scale(4.6,4.6); x.fillStyle='#F47A2A'; x.beginPath(); x.moveTo(0,-12); x.lineTo(3,-3); x.lineTo(12,0); x.lineTo(3,3); x.lineTo(0,12); x.lineTo(-3,3); x.lineTo(-12,0); x.lineTo(-3,-3); x.closePath(); x.fill(); });
  var star = new THREE.Group(); root.add(star);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); glow.scale.set(2.4,2.4,1); star.add(glow);
  var spark = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkT, transparent:true, depthWrite:false})); spark.scale.set(0.55,0.55,1); star.add(spark);
  star.add(new THREE.PointLight(0xF47A2A, 2.2, 7));

  var target = {star:[0,0.25,0.8]};
  function onState(s){
    var c = s.cat;
    if (c==='alle') target.star = [0,0.25,0.8];
    else if (c==='bedrift' && s.sub!=='alle'){ var k=SUBS.indexOf(s.sub), tc=CENTER.bedrift; target.star = [tc[0]+((k%3)-1)*0.75, tc[1]+(k<3?0.35:-0.35)+0.75, tc[2]+0.4]; }
    else { var cc=CENTER[c]; target.star = [cc[0], cc[1]+1.0, cc[2]+0.3]; }
    kick();
  }
  listeners.push(onState);
  var starPos = target.star.slice();

  var layout = {x:2.3, y:0, z:12};
  function resize(){
    var w=window.innerWidth, hh=window.innerHeight;
    renderer.setSize(w,hh,false); camera.aspect=w/hh; camera.updateProjectionMatrix();
    if (w/hh > 1.1){ layout.x=2.3; layout.y=0; layout.z=12; } else { layout.x=0; layout.y=2.2; layout.z=17; }
  }
  window.addEventListener('resize', resize); resize();
  // The scene fades back as you scroll into the list, so the text stays readable
  function fade(){ var v = Math.max(0.2, 1 - window.scrollY/(window.innerHeight*0.9)*0.8); canvas.style.opacity = v.toFixed(2); }
  window.addEventListener('scroll', fade, {passive:true}); fade();

  var clock = new THREE.Clock();
  function setC(c, p, s, hl, k){
    c.mesh.position.set(p[0],p[1],p[2]); c.mesh.scale.set(s[0],s[1],s[2]);
    c.hl += (hl - c.hl)*k; tmp.copy(CREAM).lerp(ORANGE, c.hl);
    c.edge.material.color.copy(tmp); c.edge.material.opacity = 0.3 + c.hl*0.65; c.mesh.material.emissiveIntensity = c.hl*0.2;
  }
  var running = false, tabHidden = false;
  function frame(){
    running = false;
    var t = reduce ? 0 : clock.getElapsedTime(), k = reduce ? 1 : 0.08;
    camera.position.set(0, 1.2, layout.z); camera.lookAt(0, 0.1, 0);
    root.position.set(layout.x, layout.y, 0);
    root.rotation.y = -0.3 + Math.sin(t*0.15)*0.08;
    var c = state.cat, all = c==='alle';
    var tc = CENTER.tanker;
    wave.forEach(function(q,i){
      var x = tc[0] - 1.2 + i*0.34, y = tc[1] + Math.sin(i*0.8 + t*1.2)*0.35, z = tc[2] + Math.cos(i*0.6 + t*0.9)*0.2;
      setC(q, [x,y,z], [.2,.2,.2], (c==='tanker') ? 1 : (all ? 0.2 : 0), k); q.mesh.rotation.y = t*0.8+i;
    });
    var pc = CENTER.prosjekter;
    frames.forEach(function(q,i){
      setC(q, [pc[0]+(i-1)*0.55, pc[1]+Math.sin(t*0.6+i)*0.05, pc[2]-Math.abs(i-1)*0.3], [.5,.7,.04], (c==='prosjekter') ? 1 : (all ? 0.2 : 0), k);
      q.mesh.rotation.y = (i-1)*-0.35;
    });
    var bc = CENTER.bedrift;
    topics.forEach(function(q,i){
      var sel = c==='bedrift' && (state.sub==='alle' || SUBS[i]===state.sub);
      setC(q, [bc[0]+((i%3)-1)*0.75, bc[1]+(i<3?0.35:-0.35), bc[2]], [.45,.45,.45], sel ? 1 : (all ? 0.2 : (c==='bedrift' ? 0.12 : 0)), k);
      q.mesh.rotation.y = t*0.3 + i*0.4; q.mesh.rotation.x = 0.35;
    });
    for (var j=0;j<3;j++) starPos[j] += (target.star[j]-starPos[j])*k;
    star.position.set(starPos[0], starPos[1]+Math.sin(t*1.2)*0.05, starPos[2]);
    spark.material.rotation = t*0.3;
    renderer.render(scene, camera);
    // Keep animating only while the tab is visible and the scene is still clearly on screen
    if (!reduce && !tabHidden && window.scrollY < window.innerHeight*3) kick();
  }
  function kick(){ if (!running){ running = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', kick, {passive:true});
  window.addEventListener('resize', kick);
  document.addEventListener('visibilitychange', function(){ tabHidden = document.hidden; if (!tabHidden) kick(); });
  onState(state);
})();
