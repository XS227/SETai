// Black & White Universe essays: a 2D particle flow behind the text. Each section.flow carries a
// data-flow JSON (lam, turb, vort, inward, renew, sing, split, foam, dipole) and the field blends
// between sections as you scroll. Optional: an equation block with .term buttons (data-eq section).
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv = document.getElementById('flow'), ctx = cv.getContext('2d');
  var sections = Array.prototype.slice.call(document.querySelectorAll('section.flow'));
  var KEYS = ['lam','turb','vort','inward','renew','sing','split','foam','dipole'];
  var specs = sections.map(function(s){ var o = {}, d = {}; try { d = JSON.parse(s.getAttribute('data-flow')||'{}'); } catch(e){} KEYS.forEach(function(k){ o[k] = d[k]||0; }); return o; });
  var eqIndex = -1; sections.forEach(function(s,i){ if (eqIndex<0 && s.hasAttribute('data-eq')) eqIndex = i; });
  var P = {}; KEYS.forEach(function(k){ P[k] = specs[0][k]; });
  var termMode = null;

  // reading progress + current chapter
  var bar = document.querySelector('.progress'), now = document.querySelector('.chapter-now');
  var lastChapter = '';
  function ui(ws){
    var max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (max>0 ? Math.min(1, scrollY/max) : 0) + ')';
    var best = 0, bi = 0; ws.forEach(function(w,i){ if (w>best){ best=w; bi=i; } });
    var ch = sections[bi].getAttribute('data-chapter') || '';
    if (now && ch !== lastChapter){ lastChapter = ch; now.textContent = ch; }
  }

  // equation terms
  var noteEl = document.querySelector('.term-note');
  var NOTES = {
    time:'<b>Change in time.</b> How the velocity at each point evolves from moment to moment.',
    nonlinear:'<b>Self-transport, the nonlinear term.</b> The flow carries and reshapes its own velocity. This is the heart of the difficulty.',
    pressure:'<b>Pressure.</b> Pushes fluid from high to low pressure, and enforces incompressibility.',
    viscosity:'<b>Viscosity.</b> Diffuses sharp variations and smooths the flow. In 3D, the question is whether it always wins.',
    force:'<b>External force.</b> Gravity, stirring, or any push from outside the fluid.',
    div:'<b>Incompressibility.</b> Fluid is neither created nor destroyed inside the flow.'
  };
  var DEFAULT_NOTE = noteEl ? noteEl.innerHTML : '';
  var termBtns = Array.prototype.slice.call(document.querySelectorAll('.term'));
  termBtns.forEach(function(b){
    b.addEventListener('click', function(){
      var t = b.getAttribute('data-term'); termMode = (termMode===t) ? null : t;
      termBtns.forEach(function(x){ x.setAttribute('aria-pressed', String(x.getAttribute('data-term')===termMode)); });
      if (noteEl) noteEl.innerHTML = termMode ? NOTES[termMode] : DEFAULT_NOTE;
      if (reduce) staticRender();
    });
  });

  // how much each section is "in view", normalised
  function weights(){
    var vh = innerHeight, ws = [], sum = 0;
    sections.forEach(function(s){
      var r = s.getBoundingClientRect(), c = r.top + r.height/2, d = Math.abs(c - vh/2);
      var w = Math.max(0, 1 - d/(r.height/2 + vh*0.45)); w = w*w; ws.push(w); sum += w;
    });
    if (sum <= 0){ ws[ws.length-1] = 1; sum = 1; }
    return ws.map(function(w){ return w/sum; });
  }
  function targetFrom(ws){
    var T = {}; KEYS.forEach(function(k){ T[k]=0; });
    ws.forEach(function(w,i){ if (w>0) KEYS.forEach(function(k){ T[k] += specs[i][k]*w; }); });
    var we = eqIndex>=0 ? ws[eqIndex] : 0;
    if (termMode && we > 0){
      var m = we*1.4;
      if (termMode==='viscosity'){ T.turb *= (1-0.8*Math.min(1,m)); T.vort *= (1-0.8*Math.min(1,m)); T.lam += 0.3*m; }
      if (termMode==='nonlinear'){ T.vort += 0.9*m; T.inward += 0.35*m; T.turb += 0.2*m; }
      if (termMode==='pressure'){ T.inward -= 0.5*m; }
      if (termMode==='force'){ T.lam += 1.1*m; }
      if (termMode==='time'){ T.renew += 0.9*m; }
      if (termMode==='div'){ T.turb *= 0.5; }
    }
    return T;
  }

  // particles
  var W=0, H=0, DPR=1, N=0, px, py, life, foamF, cx=0, cy=0;
  function resize(){
    DPR = Math.min(window.devicePixelRatio||1, 1.5);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    var n = W < 700 ? 1100 : 2400;
    if (n !== N){
      N = n; px = new Float32Array(N); py = new Float32Array(N); life = new Float32Array(N); foamF = new Uint8Array(N);
      for (var i=0;i<N;i++){ px[i]=Math.random()*W; py[i]=Math.random()*H; life[i]=Math.random()*500; foamF[i] = Math.random()<0.05 ? 1 : 0; }
    }
    cx = W > 820 ? W*0.72 : W*0.5; cy = W > 820 ? H*0.5 : H*0.3;
    ctx.fillStyle = '#10100F'; ctx.fillRect(0,0,W,H);
  }
  window.addEventListener('resize', function(){ resize(); if (reduce) staticRender(); });
  resize();

  var t = 0;
  function vel(x, y, out){
    var X=x/H, Y=y/H, dx=(x-cx)/H, dy=(y-cy)/H, r=Math.sqrt(dx*dx+dy*dy)+1e-4, vx=0, vy=0, s;
    if (P.lam){ vx += P.lam; vy += P.lam*0.25*Math.sin(Y*6 + X*2 + t*0.6); }
    if (P.turb){ vx += P.turb*(Math.sin(Y*9+t*0.9)+Math.cos(X*11-t*0.7))*0.6; vy += P.turb*(Math.cos(X*8+t*0.8)-Math.sin(Y*10-t))*0.6; }
    if (P.vort){ s = P.vort*0.22/(r+0.06); vx += -dy/r*s; vy += dx/r*s; }
    if (P.inward){ vx += -dx/r*P.inward*0.5; vy += -dy/r*P.inward*0.5; }
    if (P.sing){
      var ph=(t*0.09)%1, rad = ph<0.75 ? -(0.25+ph*1.5) : 3.2*(1-(ph-0.75)/0.25), spin = (ph<0.75 ? 0.15+ph : 0.15)*0.5/(r+0.05);
      vx += P.sing*(dx/r*rad - dy/r*spin); vy += P.sing*(dy/r*rad + dx/r*spin);
    }
    if (P.dipole){
      var ox = (W>820 ? W*0.48 : 0) + (((t*0.035)%1) * (W>820 ? W*0.6 : W*1.2)) - (W>820?0:W*0.1), sep = 0.09;
      for (var k=0;k<2;k++){
        var sy = cy + (k? sep : -sep)*H, ddx=(x-ox)/H, ddy=(y-sy)/H, rr=Math.sqrt(ddx*ddx+ddy*ddy)+1e-4, ss = (k?-1:1)*P.dipole*0.09/(rr+0.035);
        vx += -ddy/rr*ss; vy += ddx/rr*ss;
      }
    }
    out[0]=vx; out[1]=vy;
  }
  function mix(a,b,m){ return [Math.round(a[0]+(b[0]-a[0])*m), Math.round(a[1]+(b[1]-a[1])*m), Math.round(a[2]+(b[2]-a[2])*m)]; }
  var DARK=[16,16,15], CREAM=[255,250,240];
  var v = [0,0];
  function respawn(i){ px[i]=Math.random()*W; py[i]=Math.random()*H; life[i]=150+Math.random()*350; }
  function step(fadeAlpha){
    var xb = cx + Math.sin(t*0.3)*18;
    var split = Math.max(0, Math.min(1, P.split));
    var leftBg = mix(DARK, CREAM, split*0.92);
    ctx.globalAlpha = fadeAlpha;
    ctx.fillStyle = 'rgb('+leftBg.join(',')+')'; ctx.fillRect(0,0,xb,H);
    ctx.fillStyle = '#10100F'; ctx.fillRect(xb,0,W-xb,H);
    ctx.globalAlpha = 1;
    var leftInk = mix(CREAM, [20,16,12], split), seaA = 0.5*(1-0.78*Math.max(0,Math.min(1,P.foam)));
    var pathL = new Path2D(), pathR = new Path2D(), pathF = new Path2D();
    var speed = H*0.0022, decay = 1 + P.renew*4 + P.sing*1.5;
    for (var i=0;i<N;i++){
      var x0=px[i], y0=py[i];
      vel(x0,y0,v);
      var mx=v[0]*speed, my=v[1]*speed, L=Math.sqrt(mx*mx+my*my);
      if (L>7){ mx*=7/L; my*=7/L; }
      var x1=x0+mx, y1=y0+my;
      life[i]-=decay;
      if (life[i]<0 || x1<-5 || x1>W+5 || y1<-5 || y1>H+5){
        if (life[i]>=0){ if (x1>W) x1-=W; else if (x1<0) x1+=W; if (y1>H) y1-=H; else if (y1<0) y1+=H; px[i]=x1; py[i]=y1; }
        else respawn(i);
        continue;
      }
      px[i]=x1; py[i]=y1;
      var p = foamF[i] ? pathF : (x1 < xb ? pathL : pathR);
      p.moveTo(x0,y0); p.lineTo(x1,y1);
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba('+leftInk.join(',')+','+(split>0.5 ? 0.7 : seaA)+')'; ctx.stroke(pathL);
    ctx.strokeStyle = 'rgba(255,250,240,'+seaA+')'; ctx.stroke(pathR);
    ctx.strokeStyle = 'rgba(244,122,42,'+(0.75+0.25*P.foam)+')'; ctx.lineWidth = 1 + P.foam*0.8; ctx.stroke(pathF);
  }

  var hidden = false;
  function frame(){
    if (hidden) return;
    var ws = weights(); ui(ws);
    var T = targetFrom(ws);
    KEYS.forEach(function(k){ P[k] += (T[k]-P[k])*0.045; });
    t += 1/60;
    step(0.085);
    requestAnimationFrame(frame);
  }
  function staticRender(){
    var ws = weights(); ui(ws); P = targetFrom(ws);
    ctx.fillStyle = '#10100F'; ctx.fillRect(0,0,W,H);
    for (var k=0;k<90;k++){ t += 1/60; step(0.03); }
  }
  if (reduce){
    var to; window.addEventListener('scroll', function(){ ui(weights()); clearTimeout(to); to = setTimeout(staticRender, 160); }, {passive:true});
    staticRender();
  } else {
    // Pause the particle loop while the tab is hidden
    document.addEventListener('visibilitychange', function(){ hidden = document.hidden; if (!hidden) requestAnimationFrame(frame); });
    requestAnimationFrame(frame);
  }
})();
