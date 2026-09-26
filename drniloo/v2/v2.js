(() => {
  const html = document.documentElement;
  const scenes = [...document.querySelectorAll('.scene[data-scene]')];
  const face = document.getElementById('faceShell');
  const ring = document.getElementById('focusRing');
  const contour = document.getElementById('contourLine');
  const particles = document.getElementById('particles');
  const number = document.getElementById('sceneNumber');
  const label = document.getElementById('sceneLabel');
  const bar = document.getElementById('progressBar');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const states = [
    {s:1.04,x:0,y:0,r:0, rx:63,ry:53,rw:18,rh:12,ro:0, c:0,p:0},
    {s:2.18,x:5,y:-17,r:-1.2, rx:63,ry:59,rw:18,rh:10,ro:1, c:0,p:0},
    {s:1.72,x:8,y:-8,r:-3.2, rx:69,ry:56,rw:20,rh:24,ro:.38, c:1,p:0},
    {s:2.32,x:2,y:14,r:.7, rx:63,ry:42,rw:27,rh:11,ro:1, c:.1,p:0},
    {s:1.98,x:2,y:29,r:1.2, rx:63,ry:23,rw:26,rh:13,ro:.4, c:0,p:1},
    {s:1.06,x:0,y:0,r:0, rx:63,ry:50,rw:24,rh:16,ro:0, c:0,p:0}
  ];

  const lerp = (a,b,t) => a + (b-a)*t;
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const ease = t => t*t*(3-2*t);

  function sceneMetrics(){
    return scenes.map(el => {
      const rect = el.getBoundingClientRect();
      return {el, top: rect.top + scrollY, h: rect.height};
    });
  }

  let metrics = sceneMetrics();
  let ticking = false;

  function render(){
    ticking = false;
    const viewportCenter = scrollY + innerHeight * .5;

    let idx = 0;
    for (let i=0;i<metrics.length;i++){
      const center = metrics[i].top + metrics[i].h * .5;
      if (viewportCenter >= center) idx = i;
    }
    idx = clamp(idx,0,states.length-1);

    let next = Math.min(idx+1, states.length-1);
    let t = 0;
    if (idx < metrics.length-1){
      const a = metrics[idx].top + metrics[idx].h*.5;
      const b = metrics[next].top + metrics[next].h*.5;
      t = clamp((viewportCenter-a)/(b-a),0,1);
      t = ease(t);
    }

    const A = states[idx], B = states[next];
    const s = lerp(A.s,B.s,t);
    const x = lerp(A.x,B.x,t);
    const y = lerp(A.y,B.y,t);
    const r = lerp(A.r,B.r,t);

    if (!reduced) {
      face.style.transform = `translate3d(${x}vw,${y}vh,0) scale(${s}) rotate(${r}deg)`;
      ring.style.left = `${lerp(A.rx,B.rx,t)}%`;
      ring.style.top = `${lerp(A.ry,B.ry,t)}%`;
      ring.style.width = `${lerp(A.rw,B.rw,t)}vw`;
      ring.style.height = `${lerp(A.rh,B.rh,t)}vw`;
      ring.style.opacity = lerp(A.ro,B.ro,t);
      contour.style.opacity = lerp(A.c,B.c,t);
      particles.style.opacity = lerp(A.p,B.p,t);
    }

    const active = t > .58 ? next : idx;
    html.dataset.scene = active;
    scenes.forEach((el,i)=>el.classList.toggle('is-active',i===active));
    number.textContent = String(active+1).padStart(2,'0') + ' / 06';
    label.textContent = scenes[active]?.dataset.label || '';

    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = `${max ? (scrollY/max)*100 : 0}%`;
  }

  function requestRender(){
    if(!ticking){ ticking = true; requestAnimationFrame(render); }
  }

  addEventListener('scroll', requestRender, {passive:true});
  addEventListener('resize', () => { metrics = sceneMetrics(); requestRender(); }, {passive:true});
  addEventListener('load', () => { metrics = sceneMetrics(); render(); });
  render();
})();