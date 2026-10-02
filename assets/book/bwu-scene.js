// Black & White Universe: the shared chapter engine. One living black-and-white WebGL scene that the text drives.
// Each chapter registers its own scenes as GLSL in window.BWU_SCENES (a `vec3 scene(float id, vec2 p, float t, float m)`).
// Every reading beat ([data-scene]) owns a visual metaphor; its scroll progress animates both the scene and
// the line-by-line reveal of the text, so what you read and what you see happen in the same moment.
(function(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('d2-js');
  var beats = Array.prototype.slice.call(document.querySelectorAll('[data-scene]'));
  if (!beats.length) return;

  // ---------- text: reveal line by line, spotlight the line being read ----------
  beats.forEach(function(b){ b._lines = Array.prototype.slice.call(b.querySelectorAll('.l')); });
  function local(b){
    var r = b.getBoundingClientRect(), mid = innerHeight * 0.55;
    return Math.max(0, Math.min(1, (mid - r.top) / Math.max(1, r.height)));
  }
  function revealText(){
    beats.forEach(function(b){
      var n = b._lines.length; if (!n) return;
      var m = reduce ? 1 : local(b), shown = -1;
      b._lines.forEach(function(l, k){
        var on = m > (k + 0.35) / (n + 0.6) * 0.82;
        l.classList.toggle('in', on); if (on) shown = k;
      });
      b._lines.forEach(function(l, k){ l.classList.toggle('now', k === shown && !reduce); });
    });
  }
  addEventListener('scroll', revealText, {passive:true}); addEventListener('resize', revealText); revealText();

  // ---------- the scene ----------
  var canvas = document.querySelector('.d2-gl');
  var gl = canvas && (canvas.getContext('webgl', {antialias:false, alpha:false, powerPreference:'high-performance'}) || canvas.getContext('experimental-webgl'));
  if (!gl){ document.documentElement.classList.add('d2-nogl'); return; }

  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FS = [
'#ifdef GL_FRAGMENT_PRECISION_HIGH',
'precision highp float;',
'#else',
'precision mediump float;',
'#endif',
'uniform vec2 uRes; uniform float uTime, uA, uB, uW, uM, uZoom; uniform vec2 uFocal;',
'#define PI 3.14159265',
'float PX;',
'float sq(float x){ return x*x; }',
'float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }',
'float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);',
'  return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x), mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x), f.y); }',
'float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }',
'float stars(vec2 p, float dens){ vec2 g=floor(p), f=fract(p)-.5; float h=h21(g);',
'  vec2 o=vec2(h21(g+3.1),h21(g+7.7))-.5; float d=length(f-o*.7);',
'  return step(1.-dens,h)*(1.-smoothstep(0.,.07,d))*(.35+.65*h21(g+1.3)); }',
'float cells(vec2 p){ vec2 g=floor(p), f=fract(p); float d1=8., d2=8.;',
'  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 b=vec2(float(i),float(j)); vec2 o=vec2(h21(g+b),h21(g+b+5.3));',
'    vec2 r=b+o-f; float d=dot(r,r); if(d<d1){ d2=d1; d1=d; } else if(d<d2){ d2=d; } }',
'  return 1.-smoothstep(0.,.07,sqrt(d2)-sqrt(d1)); }',

// I/II: the void, a trembling point of possibility
'float glowLine(float d, float w){ return exp(-d*d/(w*w)); }',
'float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.)); }',
'mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }',
].join('\n') + '\n' + (window.BWU_SCENES || 'vec3 scene(float id, vec2 p, float t, float m){ return vec3(0.); }') + '\n' + [
'void main(){',
'  PX=1./(uRes.y*uZoom);',
'  vec2 p=((gl_FragCoord.xy-.5*uRes)/uRes.y-uFocal)/uZoom;',
'  vec3 col=scene(uA,p,uTime,uM);',
'  if(uW>.001) col=mix(col,scene(uB,p,uTime,0.),uW);',
'  vec2 s=gl_FragCoord.xy/uRes-.5;',
'  col*=1.-.9*dot(s,s);',
'  col+=(h21(gl_FragCoord.xy+fract(uTime)*100.)-.5)*.035;',
'  col=col/(1.+col*.35);',
'  gl_FragColor=vec4(pow(max(col,0.),vec3(.92)),1.);',
'}'].join('\n');

  function sh(type, src){ var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ console.warn('bwu shader:', gl.getShaderInfoLog(s)); return null; } return s; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs){ document.documentElement.classList.add('d2-nogl'); return; }
  var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)){ console.warn('bwu link:', gl.getProgramInfoLog(prog)); document.documentElement.classList.add('d2-nogl'); return; }
  gl.useProgram(prog);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ['uRes','uTime','uA','uB','uW','uM','uZoom','uFocal'].forEach(function(n){ U[n] = gl.getUniformLocation(prog, n); });

  // Render below native resolution and step down further if frames get slow; the grain hides the upscale.
  var quality = innerWidth < 760 ? 0.55 : 0.7, slow = 0, lastT = 0;
  var focal = [0,0], zoom = 1;
  function resize(){
    var d = Math.min(devicePixelRatio || 1, 2) * quality;
    canvas.width = Math.round(innerWidth * d); canvas.height = Math.round(innerHeight * d);
    gl.viewport(0, 0, canvas.width, canvas.height);
    var asp = innerWidth / innerHeight;
    var rtl = document.documentElement.dir === 'rtl';
    if (asp > 1.05){ focal = [Math.min(.42, asp*.5 - .42) * (rtl ? -1 : 1), 0]; zoom = 1; }   // desktop: scene beside the text (left of it in Persian)
    else { focal = [0, .2]; zoom = .8; }                                      // phone: scene above, text below
  }
  addEventListener('resize', resize); resize();

  var bridge = document.querySelector('.chapter-bridge'), smM = 0, smW = 0, t0 = performance.now(), hidden = false;
  function stage(){
    var mid = innerHeight * 0.55, i = 0;
    for (var k = 0; k < beats.length; k++){ if (beats[k].getBoundingClientRect().top <= mid) i = k; }
    var b = beats[i], m = local(b), fixed = b.getAttribute('data-m');
    var next = beats[i+1], w = next ? Math.max(0, (m - 0.86) / 0.14) : 0;
    w = w * w * (3 - 2 * w);
    return { a: +b.getAttribute('data-scene'), b: next ? +next.getAttribute('data-scene') : 0, w: w, m: fixed ? +fixed : Math.min(1, m / 0.86) };
  }
  function frame(now){
    if (hidden) return;
    var covered = bridge && bridge.getBoundingClientRect().top <= 0;
    if (!covered){
      var s = stage();
      smM += (s.m - smM) * (reduce ? 1 : 0.08); smW += (s.w - smW) * (reduce ? 1 : 0.15);
      if (Math.abs(s.m - smM) > 0.5) smM = s.m;   // jumped to another beat: don't sweep through
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, reduce ? 4 : (now - t0) / 1000);
      gl.uniform1f(U.uA, s.a); gl.uniform1f(U.uB, s.b); gl.uniform1f(U.uW, smW); gl.uniform1f(U.uM, smM);
      gl.uniform1f(U.uZoom, zoom); gl.uniform2f(U.uFocal, focal[0], focal[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (lastT && now - lastT > 30){ if (++slow > 40 && quality > 0.35){ quality *= 0.8; slow = 0; resize(); } } else slow = Math.max(0, slow - 1);
    }
    lastT = now;
    if (!reduce) requestAnimationFrame(frame);
  }
  if (reduce){ var draw = function(){ requestAnimationFrame(frame); }; addEventListener('scroll', draw, {passive:true}); addEventListener('resize', draw); }
  document.addEventListener('visibilitychange', function(){ hidden = document.hidden; lastT = 0; if (!hidden) requestAnimationFrame(frame); });
  requestAnimationFrame(frame);
})();
