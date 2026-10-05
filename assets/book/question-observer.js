(function(){
  var canvas=document.querySelector('.observer-gl'); if(!canvas) return;
  var ctx=canvas.getContext('2d',{alpha:false}); if(!ctx) return;
  document.documentElement.classList.add('observer-js');
  var beats=[].slice.call(document.querySelectorAll('[data-observer-scene]'));
  var W=0,H=0,DPR=1, reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize(){W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0)}
  addEventListener('resize',resize); resize();

  beats.forEach(function(b){b._lines=[].slice.call(b.querySelectorAll('.obs-line'));});
  function local(b){var r=b.getBoundingClientRect(),mid=H*.56;return Math.max(0,Math.min(1,(mid-r.top)/Math.max(1,r.height)))}
  function current(){var i=0,mid=H*.56;for(var k=0;k<beats.length;k++)if(beats[k].getBoundingClientRect().top<=mid)i=k;return {i:i,b:beats[i],m:local(beats[i])}}
  function reveal(){beats.forEach(function(b){var n=b._lines.length,m=local(b),last=-1;b._lines.forEach(function(l,k){var on=m>(k+.25)/(n+.35)*.86;l.classList.toggle('in',on);if(on)last=k});b._lines.forEach(function(l,k){l.classList.toggle('now',k===last)})})}
  addEventListener('scroll',reveal,{passive:true}); reveal();

  function bg(t){
    ctx.fillStyle='#050505';ctx.fillRect(0,0,W,H);
    var gx=W*(W/H>1.05?.68:.5),gy=H*(W/H>1.05?.49:.34);
    var g=ctx.createRadialGradient(gx,gy,0,gx,gy,Math.max(W,H)*.72);g.addColorStop(0,'rgba(34,31,28,.30)');g.addColorStop(.5,'rgba(12,12,12,.16)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalAlpha=.34;for(var i=0;i<90;i++){var x=(i*173.71)%W,y=(i*97.19)%H,a=.15+.28*(.5+.5*Math.sin(t*.0008+i));ctx.fillStyle='rgba(255,255,255,'+a+')';ctx.fillRect(x,y,1,1)}ctx.restore();
  }
  function glow(x,y,r,a,warm){
    ctx.save();ctx.globalCompositeOperation='lighter';var g=ctx.createRadialGradient(x,y,0,x,y,r*4.5);g.addColorStop(0,warm?'rgba(244,122,42,'+a+')':'rgba(255,255,255,'+a+')');g.addColorStop(.22,warm?'rgba(244,122,42,'+(a*.48)+')':'rgba(255,255,255,'+(a*.42)+')');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*4.5,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function strokeCircle(x,y,r,a,w){ctx.save();ctx.strokeStyle='rgba(245,242,235,'+a+')';ctx.lineWidth=w||1;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.restore()}
  function line(x1,y1,x2,y2,a,w,dash){ctx.save();ctx.strokeStyle='rgba(245,242,235,'+a+')';ctx.lineWidth=w||1;if(dash)ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore()}
  function focal(){return W/H>1.05?[W*.7,H*.5]:[W*.5,H*.34]}

  // 0 — The question: possibility cloud, no privileged outcome.
  function possibility(t,m){
    var f=focal(),cx=f[0],cy=f[1],R=Math.min(W,H)*(W/H>1.05?.28:.23);
    for(var i=0;i<54;i++){
      var a=i*2.399+t*.00008*(i%3+1), rr=R*(.22+.74*((i*37)%53)/53);
      var wob=Math.sin(t*.0012+i*1.7)*10*(1-m*.5);
      var x=cx+Math.cos(a)*(rr+wob),y=cy+Math.sin(a*.93)*(rr*.66+wob*.4);
      glow(x,y,2.2,.16+.18*((i%7)/7),false);
    }
    for(var r=1;r<5;r++)strokeCircle(cx,cy,R*(r/4),.05,1);
    if(m>.45){var a=(m-.45)/.55;glow(cx,cy,7,.24*a,true);strokeCircle(cx,cy,18+26*a,.16*a,1.2)}
  }

  // 1 — Measurement: an apparatus enters, interactions suppress alternatives and one registered event remains.
  function measurement(t,m){
    var f=focal(),cx=f[0],cy=f[1],R=Math.min(W,H)*.25;
    for(var i=0;i<42;i++){
      var ang=i*2.2+t*.00005,rr=R*(.3+.7*((i*23)%41)/41),fade=Math.max(.04,1-m*.86);
      glow(cx+Math.cos(ang)*rr,cy+Math.sin(ang)*rr*.62,2,.22*fade,false);
    }
    var detX=cx+R*(1.25-1.25*m),detY=cy-R*.05;
    ctx.save();ctx.strokeStyle='rgba(245,242,235,'+(.2+.55*m)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(detX,detY,26,Math.PI*.15,Math.PI*1.85);ctx.stroke();ctx.beginPath();ctx.moveTo(detX+23,detY-10);ctx.lineTo(detX+42,detY-20);ctx.lineTo(detX+42,detY+20);ctx.lineTo(detX+23,detY+10);ctx.stroke();ctx.restore();
    line(detX-42,detY,cx,cy,.16+.25*m,1,[4,6]);
    var hit=Math.max(0,(m-.55)/.45);glow(cx,cy,8,.9*hit,true);strokeCircle(cx,cy,22+18*hit,.35*hit,1.6);
    if(hit>.05){for(var k=0;k<8;k++){var a=k*Math.PI/4+t*.0002;line(cx,cy,cx+Math.cos(a)*(45+35*hit),cy+Math.sin(a)*(45+35*hit),.08*hit,1)}}
  }

  // 2 — Double slit: clearly compare no-path-information versus path-information.
  function doubleSlit(t,m){
    var f=focal(),cy=f[1],src=f[0]-Math.min(W*.22,230),wall=f[0],screen=f[0]+Math.min(W*.2,210),sy=48;
    glow(src,cy,6,.9,true);
    ctx.save();ctx.strokeStyle='rgba(255,255,255,.18)';for(var k=0;k<7;k++){var rr=((t*.055+k*38)%(Math.max(80,wall-src)));ctx.beginPath();ctx.arc(src,cy,rr,-1.1,1.1);ctx.stroke()}ctx.restore();
    ctx.save();ctx.strokeStyle='rgba(245,242,235,.65)';ctx.lineWidth=3;[[H*.18,cy-sy-17],[cy-sy+17,cy+sy-17],[cy+sy+17,H*.82]].forEach(function(v){ctx.beginPath();ctx.moveTo(wall,v[0]);ctx.lineTo(wall,v[1]);ctx.stroke()});ctx.restore();
    var observe=m>.52;
    ctx.save();ctx.strokeStyle='rgba(255,255,255,'+(observe?.12:.28)+')';ctx.lineWidth=1;[-sy,sy].forEach(function(off){for(var j=0;j<7;j++){var rr=((t*.065+j*42)%Math.max(90,screen-wall));ctx.beginPath();ctx.arc(wall,cy+off,rr,-Math.PI/2,Math.PI/2);ctx.stroke()}});ctx.restore();
    if(observe){[-sy,sy].forEach(function(off){glow(wall+28,cy+off,4,.7,true);strokeCircle(wall+28,cy+off,10,.35,1)})}
    line(screen,cy-H*.25,screen,cy+H*.25,.5,2);
    for(var y=-H*.23;y<H*.23;y+=4){var p=observe?(Math.exp(-Math.pow((y-55)/42,2))+Math.exp(-Math.pow((y+55)/42,2)))*.46:(.12+.88*Math.pow(Math.cos(y*.12),2))*Math.exp(-y*y/(H*H*.055));var h=((Math.sin((y+321)*12.9898)*43758.5453)%1+1)%1;if(h<p){ctx.fillStyle=observe?'rgba(255,255,255,.58)':'rgba(255,255,255,.85)';ctx.fillRect(screen-4+(y%9),cy+y,2,2)}}
    // visual split memory: left label line vs right label line
    var a=Math.min(1,Math.abs(m-.5)*2);glow(screen,cy,7,.28+a*.18,true);
  }

  // 3 — Interpretation space: three lenses around the same event.
  function interpretations(t,m){
    var f=focal(),cx=f[0],cy=f[1],R=Math.min(W,H)*.18;
    var pts=[[cx-R*1.2,cy+R*.55],[cx+R*1.2,cy+R*.55],[cx,cy-R*.95]];
    glow(cx,cy,7,.85,true);strokeCircle(cx,cy,24,.28,1.2);
    pts.forEach(function(p,i){line(cx,cy,p[0],p[1],.12+.18*m,1,[5,7]);strokeCircle(p[0],p[1],28,.18+.2*(i===Math.floor(m*3)%3),1.2);glow(p[0],p[1],4,.25+(i===Math.floor(m*3)%3?.35:0),i===1)});
    // same event pulses through three possible readings
    for(var k=0;k<3;k++){var p=pts[k],phase=.5+.5*Math.sin(t*.002+k*2.1);strokeCircle(p[0],p[1],36+phase*12,.05+.08*phase,1)}
  }

  // 4 — Our answer: potential remains black, event becomes white, interaction is orange seam.
  function answer(t,m){
    var f=focal(),cx=f[0],cy=f[1],R=Math.min(W,H)*.27;
    ctx.save();var g=ctx.createLinearGradient(cx-R,cy,cx+R,cy);g.addColorStop(0,'rgba(0,0,0,.72)');g.addColorStop(.48,'rgba(24,24,24,.35)');g.addColorStop(.52,'rgba(245,242,235,.08)');g.addColorStop(1,'rgba(245,242,235,.28)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.fill();ctx.restore();
    for(var i=0;i<34;i++){var a=i*2.3+t*.00005,rr=R*(.18+.74*((i*19)%31)/31);var side=Math.cos(a)<0;var alpha=side?.12:.28;glow(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr*.72,2.2,alpha,false)}
    line(cx,cy-R*.85,cx,cy+R*.85,.55,1.5);glow(cx,cy,8,.95,true);
    var pulse=.5+.5*Math.sin(t*.0015);strokeCircle(cx,cy,24+22*pulse,.18,1.2);
    // convergence to one registered point
    if(m>.45){var q=(m-.45)/.55;for(var k=0;k<16;k++){var a=k*Math.PI/8,lineR=R*(1-q*.72);glow(cx+Math.cos(a)*lineR,cy+Math.sin(a)*lineR*.72,2,.12*(1-q),false)}glow(cx,cy,10,.65+.3*q,true)}
  }

  function draw(t){
    bg(t);var s=current();var m=reduce?1:s.m;
    if(s.i===0) possibility(t,m);
    else if(s.i===1) measurement(t,m);
    else if(s.i===2) doubleSlit(t,m);
    else if(s.i===3) interpretations(t,m);
    else answer(t,m);
    if(!reduce)requestAnimationFrame(draw);
  }
  if(reduce){draw(4000);addEventListener('scroll',function(){draw(4000)},{passive:true})}else requestAnimationFrame(draw);
})();
