// Black & White Universe, chapter 01 «The Drop»: one living black-and-white scene that the text drives.
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
'vec3 sVoid(vec2 p, float t, float m){',
'  float r=length(p);',
'  vec3 c=vec3(.012)+vec3(.04)*fbm(p*2.5+vec2(t*.03,-t*.02))*(1.-smoothstep(0.,1.2,r));',
'  vec2 j=(vec2(noise(vec2(t*7.,1.)),noise(vec2(1.,t*7.)))-.5)*.006*(.4+m);',
'  float rr=length(p-j), fl=.55+.45*noise(vec2(t*3.,4.));',
'  c+=vec3(.00018/(rr*rr+.00025))*fl*(.3+.7*m)+vec3(.12)*exp(-rr*18.)*(.3+.7*m);',
'  c+=vec3(.5)*exp(-abs(rr-.06-.015*sin(t*1.3))*90.)*.07*m;',
'  return c; }',

// III: the first equation, a line of light drawn but never finished
'vec3 sLine(vec2 p, float t, float m){',
'  vec3 c=sVoid(p,t,.25)*.7;',
'  float span=.62, head=mix(-span, span*.55, smoothstep(.04,.85,m));',
'  float y=p.y+.003*sin(p.x*30.+t*2.);',
'  float drawn=step(-span,p.x)*step(p.x,head)*step(.3,noise(vec2(p.x*14.,3.)));',
'  c+=vec3(.95)*exp(-abs(y)*900.)*drawn + vec3(.6)*exp(-abs(y)*60.)*drawn*.05;',
'  float tip=length(vec2(p.x-head,y)); c+=vec3(.00009/(tip*tip+.0001))*step(.02,m);',
'  float ghost=step(head,p.x)*step(p.x,span)*exp(-abs(p.y)*900.)*step(.55,noise(vec2(p.x*40.,t*2.)));',
'  c+=vec3(.1)*ghost;',
'  return c; }',

// IV: light born from darkness, the only warmth in the chapter
'vec3 sSpark(vec2 p, float t, float m){',
'  float r=length(p), ig=smoothstep(0.,.6,m);',
'  vec3 c=sVoid(p,t,1.-ig)*(1.-ig*.6);',
'  float core=exp(-r*r*mix(9000.,60.,ig*ig))*ig;',
'  float a=atan(p.y,p.x);',
'  float rays=pow(noise(vec2(a*6.,t*.4))*.5+noise(vec2(a*17.,-t*.3))*.5,3.)*exp(-r*mix(30.,3.5,ig))*ig;',
'  float streak=exp(-abs(p.y)*mix(400.,90.,ig))*exp(-abs(p.x)*mix(20.,2.2,ig))*ig;',
'  vec3 warm=vec3(1.,.48,.16);',
'  c+=vec3(1.)*core*1.4 + mix(vec3(1.),warm,.55)*rays*.9 + vec3(.88)*streak*.35 + warm*exp(-r*7.)*.1*ig;',
'  return c; }',

// a real water drop: refracts an upside-down world, like a real drop does
'float sdDrop(vec3 q, float t){',
'  q.y+=.05; float w=1.-.78*smoothstep(-.05,.62,q.y);',
'  float d=length(vec3(q.x/w*1.12,q.y*.92,q.z/w*1.12))-.46;',
'  d+=.005*sin(q.y*14.+t*2.2)*sin(atan(q.z,q.x)*3.+t);',
'  return d*w*.75; }',
'vec3 dropN(vec3 p, float t){ vec2 e=vec2(.002,0.);',
'  return normalize(vec3(sdDrop(p+e.xyy,t)-sdDrop(p-e.xyy,t), sdDrop(p+e.yxy,t)-sdDrop(p-e.yxy,t), sdDrop(p+e.yyx,t)-sdDrop(p-e.yyx,t))); }',
'vec3 studio(vec3 d){',
'  float soft=smoothstep(.55,.95,d.y)*(1.-smoothstep(.2,.6,abs(d.x)));',
'  float side=smoothstep(.6,.95,d.x)*(1.-smoothstep(.1,.5,abs(d.y)))*.35;',
'  return vec3(.015+.05*smoothstep(-.2,1.,d.y)+soft*1.6+side); }',
'vec3 ocean(vec3 d, float t){',
'  vec3 sun=normalize(vec3(.3,.16,-1.));',
'  if(d.y>0.){ float sky=.22+.55*pow(1.-d.y,6.); return vec3(sky+pow(max(dot(d,sun),0.),300.)*2.); }',
'  vec2 uv=d.xz/(-d.y+.03); float wv=fbm(uv*1.4+vec2(t*.15,t*.05));',
'  float haze=pow(1.+d.y,10.);',
'  float glint=pow(max(dot(normalize(vec3(d.x,-d.y,d.z)),sun),0.),30.)*smoothstep(.5,.75,wv)*1.6;',
'  return vec3(.04+.22*wv*haze+.35*haze+glint); }',
'vec3 galaxy(vec3 d, float t){',
'  vec2 q=d.xy/(abs(d.z)+.35)*1.7; q=mat2(.8,-.6,.6,.8)*q; q.y*=1.8;',
'  float r=length(q), a=atan(q.y,q.x);',
'  float arms=.5+.5*cos(2.*(a-log(r+.001)*2.4-t*.06));',
'  float g=exp(-r*2.2)*(.25+.75*arms*arms)*(.6+.6*fbm(q*6.+t*.02))+exp(-r*r*60.)*.8;',
'  return vec3(g*1.1+stars(d.xy*60.,.07)*.8+stars(d.yz*90.,.05)*.6); }',
'vec3 sDrop(vec2 p, float t, float m, float inner){',
'  p*=1.35;',
'  vec3 bg=vec3(.012)+vec3(.03)*fbm(p*2.+t*.02)+vec3(stars(p*55.,.04))*.45;',
'  if(inner>.5) bg+=vec3(cells(p*5.+vec2(t*.02,0.)))*.07*(1.-smoothstep(.2,1.2,length(p)));',
'  bg+=vec3(.05)*exp(-sq((p.y+.42)*14.))*(1.-smoothstep(.1,.5,abs(p.x)));',
'  if(length(p)>.62) return bg;',
'  float ang=t*.12+m*.6, ca=cos(ang), sa=sin(ang);',
'  vec3 ro=vec3(0.,0.,2.4), rd=normalize(vec3(p,-1.9));',
'  ro.xz=mat2(ca,-sa,sa,ca)*ro.xz; rd.xz=mat2(ca,-sa,sa,ca)*rd.xz;',
'  float tt=0., hit=0., md=9.; vec3 pos=ro;',
'  for(int i=0;i<64;i++){ pos=ro+rd*tt; float d=sdDrop(pos,t); md=min(md,d); if(d<.0008){ hit=1.; break; } tt+=d; if(tt>4.) break; }',
'  if(hit<.5) return bg+vec3(.25)*exp(-md*45.)*.25;',
'  vec3 n=dropN(pos,t);',
'  float th=max(dot(-rd,n),0.), fres=.02+.98*pow(1.-th,5.);',
'  vec3 refl=studio(reflect(rd,n));',
'  vec3 ri=refract(rd,n,1./1.33);',
'  ri.xz=mat2(ca,sa,-sa,ca)*ri.xz;',
'  vec3 ex=normalize(vec3(ri.x*2.6,-ri.y*2.6,ri.z));',
'  vec3 ins=inner<.5 ? ocean(ex,t)*.62 : galaxy(ex,t)*(.42+.25*m);',
'  ins*=.5+.5*th;',
'  vec3 col=mix(ins,refl,fres)+vec3(.55)*pow(1.-th,3.)*.45;',
'  col+=vec3(pow(max(dot(reflect(rd,n),normalize(vec3(-.4,.8,.6))),0.),180.)*2.5);',
'  col+=vec3(exp(-dot(pos.xy-vec2(.04,-.3),pos.xy-vec2(.04,-.3))*60.)*.22);',
'  return col; }',

// V: quantum fluctuation, pairs born from nothing and annihilated again
'vec3 sFluct(vec2 p, float t, float m){',
'  vec3 c=sVoid(p,t,.15)*.85;',
'  float dens=mix(.2,.8,m);',
'  for(int k=0;k<2;k++){',
'    float sc=1.+float(k)*.8; vec2 q=p*7.*sc+float(k)*13.1; vec2 g=floor(q), f=fract(q);',
'    float h=h21(g); if(h<dens){',
'      float life=fract(t*(.1+.1*h21(g+2.))+h*7.), env=sin(life*PI);',
'      float an=h21(g+9.)*6.2831; vec2 dir=vec2(cos(an),sin(an));',
'      vec2 ctr=vec2(.5)+(vec2(h21(g+4.),h21(g+6.))-.5)*.4; float sep=env*.2;',
'      vec2 a1=ctr+dir*sep, a2=ctr-dir*sep;',
'      float d1=length(f-a1), d2=length(f-a2);',
'      vec2 pa=f-a2, ba=a1-a2; float hh=clamp(dot(pa,ba)/max(dot(ba,ba),1e-5),0.,1.); float ds=length(pa-ba*hh);',
'      float fade=1./sc;',
'      c+=vec3(1.)*env*exp(-d1*d1*1400.)*1.1*fade;',
'      c+=vec3(.9)*env*exp(-sq((d2-.03)*110.))*.8*fade;',
'      c+=vec3(.6)*exp(-ds*260.)*env*(1.-env)*.6*fade;',
'      c+=vec3(1.)*smoothstep(.93,1.,life)*exp(-length(f-ctr)*40.)*.7*fade;',
'    } }',
'  c+=vec3(.8)*exp(-length(p)*9.)*.25*m;',
'  return c; }',

// VII: the fragile edge between black and white
'vec3 sEdge(vec2 p, float t, float m){',
'  float amp=.015+.05*m;',
'  float b=sin(p.y*9.+t*1.3)*amp*.6+(fbm(vec2(p.y*3.,t*.25))-.5)*amp*1.6;',
'  float x=p.x-b, light=smoothstep(-.002,.002,x);',
'  float mist=.5+.35*fbm(p*3.+vec2(t*.05,0.));',
'  vec3 c=mix(vec3(.01),vec3(mist),light);',
'  c+=vec3(.07)*(1.-light)*fbm(p*8.-t*.05);',
'  c-=vec3(.14)*light*fbm(p*8.+t*.05);',
'  c+=vec3(.9)*exp(-abs(x)*500.);',
'  c*=1.-smoothstep(.22,.72,length(p*vec2(.9,1.)));',
'  return c+vec3(.012); }',

// VIII: every number hums, Chladni figures in sand on a vibrating plate
'vec3 sHarm(vec2 p, float t, float m){',
'  float R=.4, r=length(p); vec2 q=p/R;',
'  float k=m*4., i0=floor(k), fk=smoothstep(.3,.7,fract(k));',
'  float n1=1.+i0, m1=2.+i0;',
'  float v0=cos(n1*PI*q.x)*cos(m1*PI*q.y)-cos(m1*PI*q.x)*cos(n1*PI*q.y);',
'  float v1=cos((n1+1.)*PI*q.x)*cos((m1+1.)*PI*q.y)-cos((m1+1.)*PI*q.x)*cos((n1+1.)*PI*q.y);',
'  float v=mix(v0,v1,fk)+.03*sin(t*6.);',
'  float sand=exp(-abs(v)*13.)*(.65+.35*noise(p*500.));',
'  float plate=1.-smoothstep(R-.004,R,r);',
'  vec3 c=vec3(.012)+vec3(.05)*plate+vec3(.85)*sand*plate;',
'  c+=vec3(.5)*exp(-abs(r-R)*400.);',
'  c+=vec3(.3)*exp(-abs(fract((r-R)*6.-t*.35)-.5)*30.)*step(R,r)*exp(-(r-R)*5.);',
'  return c; }',

// IX: a black hole, and the spark that waits inside it
'vec3 sBH(vec2 p, float t, float m){',
'  float r=length(p), rs=.11;',
'  vec2 lp=p*(1.+.02/(r*r+.001));',
'  vec3 c=vec3(.01)+vec3(stars(lp*50.,.05))*.7;',
'  float arc=exp(-sq((r-.148)*40.))*smoothstep(-.02,.06,p.y)*(.5+.6*fbm(vec2(atan(p.y,p.x)*4.+t*.3,2.)));',
'  c+=vec3(.9)*arc*.8 + vec3(1.)*exp(-abs(r-.118)*350.)*.9;',
'  float sh=1.-smoothstep(rs-.004,rs+.002,r);',
'  c*=1.-sh;',
'  float fl=.55+.45*sin(t*3.1)*sin(t*1.7+1.);',
'  float sp=(.00004/(r*r+.00005))*fl*smoothstep(.1,.55,m)*sh;',
'  vec2 q=vec2(p.x,p.y/.22); float qr=length(q), a=atan(q.y,q.x);',
'  float turb=fbm(vec2(a*3.+t*.4-qr*4.,qr*6.));',
'  float disc=smoothstep(.13,.17,qr)*(1.-smoothstep(.3,.62,qr))*(.35+.9*turb);',
'  float dop=.6+.55*(-p.x/(abs(p.x)+.2));',
'  float front=max(step(p.y,0.),step(rs,r));',
'  float dd=disc*dop*front*.9;',
'  c+=vec3(1.,.5,.2)*sp*(1.-min(dd*3.,1.))+vec3(sp*.3);',
'  c+=vec3(dd);',
'  return c; }',

// X: the drop falls home into the ocean, and the ocean wakes
'vec3 sReturn(vec2 p, float t, float m){',
'  float hz=.03; vec3 c;',
'  float fall=smoothstep(0.,.42,m), since=max(0.,m-.42);',
'  if(p.y>hz){ float y=p.y-hz; c=vec3(.07+.36*exp(-y*6.)); c+=vec3(.25)*exp(-length(p-vec2(-.3,.24))*30.); }',
'  else {',
'    float dy=hz-p.y+.002; vec2 w=vec2(p.x/dy,1./dy)*.35;',
'    vec2 imp=vec2(0.,1.6); float e=.02;',
'    float d0=length(w-imp), d1=length(w+vec2(e,0.)-imp), d2=length(w+vec2(0.,e)-imp);',
'    float on=step(.001,since)*exp(-since*1.4), front=since*7.;',
'    float H0=fbm(w*1.2+vec2(t*.1,t*.2))*.3+sin(d0*26.-since*60.)*exp(-d0*.9)*(1.-smoothstep(front,front+.3,d0))*on*.22;',
'    float H1=fbm((w+vec2(e,0.))*1.2+vec2(t*.1,t*.2))*.3+sin(d1*26.-since*60.)*exp(-d1*.9)*(1.-smoothstep(front,front+.3,d1))*on*.22;',
'    float H2=fbm((w+vec2(0.,e))*1.2+vec2(t*.1,t*.2))*.3+sin(d2*26.-since*60.)*exp(-d2*.9)*(1.-smoothstep(front,front+.3,d2))*on*.22;',
'    float slope=((H1-H0)+(H2-H0))/e;',
'    float near=exp(-dy*8.);',
'    c=vec3(.03+.32*near+.06*slope*(.3+near));',
'    c+=vec3(.9)*exp(-abs(p.x+.3)*14.)*smoothstep(.55,.8,fbm(w*3.+t*.3))*near*.8;',
'    c+=vec3(.6)*exp(-d0*2.5)*smoothstep(0.,.3,since)*.35;',
'  }',
'  vec2 dp=vec2(0.,mix(.62,-.19,fall*fall));',
'  vec2 dq=(p-dp)*vec2(1.,.8); float dr=length(dq);',
'  float body=(1.-smoothstep(.03,.034,dr))*step(m,.43);',
'  vec3 dn=normalize(vec3(dq/.034,sqrt(max(0.,1.-dot(dq,dq)/(.034*.034)))));',
'  vec3 dcol=vec3(.08+.45*smoothstep(-.6,.6,-dn.y))+vec3(pow(max(dot(dn,normalize(vec3(-.5,.6,.6))),0.),40.)*1.5);',
'  c=mix(c,dcol,body);',
'  c+=vec3(.9)*exp(-length((p-vec2(0.,-.19))*vec2(1.,3.))*40.)*smoothstep(.42,.44,m)*exp(-since*10.);',
'  return c; }',

'vec3 scene(float id, vec2 p, float t, float m){',
'  if(id<.5) return sVoid(p,t,m);',
'  if(id<1.5) return sLine(p,t,m);',
'  if(id<2.5) return sSpark(p,t,m);',
'  if(id<3.5) return sDrop(p,t,m,0.);',
'  if(id<4.5) return sFluct(p,t,m);',
'  if(id<5.5) return sDrop(p,t,m,1.);',
'  if(id<6.5) return sEdge(p,t,m);',
'  if(id<7.5) return sHarm(p,t,m);',
'  if(id<8.5) return sBH(p,t,m);',
'  return sReturn(p,t,m); }',
'void main(){',
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
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ console.warn('drop-v2 shader:', gl.getShaderInfoLog(s)); return null; } return s; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs){ document.documentElement.classList.add('d2-nogl'); return; }
  var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)){ console.warn('drop-v2 link:', gl.getProgramInfoLog(prog)); document.documentElement.classList.add('d2-nogl'); return; }
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
    if (asp > 1.05){ focal = [Math.min(.42, asp*.5 - .42), 0]; zoom = 1; }   // desktop: scene to the right, text left
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
