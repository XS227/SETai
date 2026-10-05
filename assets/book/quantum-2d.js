(function(){
  var canvas=document.querySelector('.d2-gl'); if(!canvas) return;
  document.documentElement.classList.add('d2-js');
  var ctx=canvas.getContext('2d',{alpha:false}); if(!ctx) return;
  var DPR=Math.min(devicePixelRatio||1,2), W=0,H=0, page=document.body.getAttribute('data-qpage')||'';
  var beats=[].slice.call(document.querySelectorAll('[data-scene]'));
  beats.forEach(function(b){b._lines=[].slice.call(b.querySelectorAll('.l'));});
  function resize(){W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,2);canvas.width=W*DPR;canvas.height=H*DPR;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0)}
  addEventListener('resize',resize);resize();
  function local(b){var r=b.getBoundingClientRect(),mid=H*.55;return Math.max(0,Math.min(1,(mid-r.top)/Math.max(1,r.height)))}
  function stage(){var mid=H*.55,i=0;for(var k=0;k<beats.length;k++)if(beats[k].getBoundingClientRect().top<=mid)i=k;var b=beats[i];return {id:+(b.getAttribute('data-scene')||0),m:local(b)}}
  function reveal(){beats.forEach(function(b){var n=b._lines.length,m=local(b),shown=-1;b._lines.forEach(function(l,k){var on=m>(k+.35)/(n+.6)*.82;l.classList.toggle('in',on);if(on)shown=k});b._lines.forEach(function(l,k){l.classList.toggle('now',k===shown)})})}
  addEventListener('scroll',reveal,{passive:true});reveal();
  function bg(t){ctx.fillStyle='#070707';ctx.fillRect(0,0,W,H);ctx.save();ctx.globalAlpha=.22;for(var i=0;i<75;i++){var x=(i*137.23%W),y=(i*83.71%H),tw=.35+.65*Math.sin(t*.001+i*1.7)*.5+.5;ctx.fillStyle='rgba(255,255,255,'+(0.16*tw)+')';ctx.fillRect(x,y,1,1)}ctx.restore()}
  function glowDot(x,y,r,a,warm){ctx.save();ctx.globalCompositeOperation='lighter';var g=ctx.createRadialGradient(x,y,0,x,y,r*4);g.addColorStop(0,warm?'rgba(244,122,42,'+a+')':'rgba(255,255,255,'+a+')');g.addColorStop(.18,warm?'rgba(244,122,42,'+(a*.55)+')':'rgba(255,255,255,'+(a*.5)+')');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*4,0,Math.PI*2);ctx.fill();ctx.restore()}
  function line(x1,y1,x2,y2,a,w){ctx.save();ctx.strokeStyle='rgba(245,242,235,'+a+')';ctx.lineWidth=w||1;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore()}
  function slit(t,m){
    var cy=H*.5, src=W*.18, wall=W*.5, screen=W*.82;
    glowDot(src,cy,7,.95,true);
    // incoming moving wavefronts
    ctx.save();ctx.strokeStyle='rgba(245,242,235,.22)';ctx.lineWidth=1;
    for(var k=0;k<8;k++){var rr=((t*.06+k*42)%(wall-src));ctx.beginPath();ctx.arc(src,cy,rr,Math.PI*1.68,Math.PI*.32,false);ctx.stroke()}
    ctx.restore();
    // wall + two slits
    var gap=34, sy=65;ctx.save();ctx.strokeStyle='rgba(245,242,235,.58)';ctx.lineWidth=3;
    [[0,cy-sy-gap],[cy-sy+gap,cy+sy-gap],[cy+sy+gap,H]].forEach(function(s){ctx.beginPath();ctx.moveTo(wall,s[0]);ctx.lineTo(wall,s[1]);ctx.stroke()});ctx.restore();
    // outgoing waves
    var measured=m>.48, alpha=Math.min(1,m*1.8);
    ctx.save();ctx.strokeStyle='rgba(245,242,235,'+(measured?.14:.28)+')';ctx.lineWidth=1;
    [-sy,sy].forEach(function(off){for(var j=0;j<7;j++){var rr=((t*.07+j*48)%Math.max(80,screen-wall));ctx.beginPath();ctx.arc(wall,cy+off,rr,-Math.PI/2,Math.PI/2);ctx.stroke()}});
    ctx.restore();
    // detector eyes appear
    if(measured){[-sy,sy].forEach(function(off){glowDot(wall+35,cy+off,5,.8,true);ctx.save();ctx.strokeStyle='rgba(255,255,255,.6)';ctx.beginPath();ctx.ellipse(wall+35,cy+off,13,7,0,0,Math.PI*2);ctx.stroke();ctx.restore()})}
    // screen
    line(screen,cy-H*.28,screen,cy+H*.28,.45,2);
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(var y=-H*.26;y<H*.26;y+=4){var p=measured?(Math.exp(-Math.pow((y-65)/48,2))+Math.exp(-Math.pow((y+65)/48,2)))*.42:(.15+.85*Math.pow(Math.cos(y*.115),2))*Math.exp(-y*y/(H*H*.065));if(((Math.sin(y*12.9898+17.3)*43758.5453)%1+1)%1<p){ctx.fillStyle=measured?'rgba(255,255,255,.62)':'rgba(255,255,255,.82)';ctx.fillRect(screen-5+((y*7)%11),cy+y,2,2)}}ctx.restore();
    glowDot(screen,cy,8,.35,true);
  }
  function bell(t,m){
    var cy=H*.5,cx=W*.5,L=W*.2,R=W*.8;glowDot(cx,cy,8,.95,true);
    var u=(t*.00012)%1, ex=cx+(L-cx)*u, fx=cx+(R-cx)*u;glowDot(ex,cy,5,.85,false);glowDot(fx,cy,5,.85,false);
    line(cx,cy,L,cy,.2,1);line(cx,cy,R,cy,.2,1);
    [L,R].forEach(function(x,idx){ctx.save();ctx.strokeStyle='rgba(245,242,235,.55)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,cy,42,0,Math.PI*2);ctx.stroke();var a=(idx?1:-1)*(.35+m*1.1);ctx.beginPath();ctx.moveTo(x-Math.cos(a)*34,cy-Math.sin(a)*34);ctx.lineTo(x+Math.cos(a)*34,cy+Math.sin(a)*34);ctx.stroke();ctx.restore();glowDot(x,cy,4,.45,true)});
    if(m>.35){ctx.save();ctx.setLineDash([5,8]);ctx.strokeStyle='rgba(244,122,42,.24)';ctx.beginPath();ctx.moveTo(L,cy);ctx.bezierCurveTo(W*.38,cy-H*.18,W*.62,cy+H*.18,R,cy);ctx.stroke();ctx.restore()}
    // correlation bars
    if(m>.55){var bx=W*.37,by=H*.72,bw=W*.26;line(bx,by,bx+bw,by,.25,1);for(var i=0;i<9;i++){var x=bx+i*bw/8,amp=18+30*Math.abs(Math.cos(i*.7+m));ctx.fillStyle=i%2?'rgba(255,255,255,.48)':'rgba(244,122,42,.55)';ctx.fillRect(x,by-amp,3,amp)}}
  }
  function tunnel(t,m){
    var cy=H*.5, barrierX=W*.56, bw=Math.max(55,W*.07);ctx.save();var g=ctx.createLinearGradient(barrierX-bw/2,0,barrierX+bw/2,0);g.addColorStop(0,'rgba(255,255,255,.12)');g.addColorStop(.5,'rgba(255,255,255,.24)');g.addColorStop(1,'rgba(255,255,255,.12)');ctx.fillStyle=g;ctx.fillRect(barrierX-bw/2,H*.18,bw,H*.64);ctx.strokeStyle='rgba(245,242,235,.38)';ctx.strokeRect(barrierX-bw/2,H*.18,bw,H*.64);ctx.restore();
    // wave packet left
    var start=W*.16, travel=Math.min(1,m*1.25), center=start+(barrierX-bw/2-start)*Math.min(1,travel*1.2);
    ctx.save();ctx.strokeStyle='rgba(245,242,235,.72)';ctx.lineWidth=2;ctx.beginPath();for(var x=start;x<barrierX-bw/2;x+=3){var env=Math.exp(-Math.pow((x-center)/90,2));var y=cy+Math.sin((x-start)*.09-t*.006)*38*env;if(x===start)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke();ctx.restore();
    // exponential tail inside
    var tail=Math.max(0,(m-.22)/.5);ctx.save();ctx.strokeStyle='rgba(244,122,42,'+(Math.min(.8,tail))+')';ctx.lineWidth=2;ctx.beginPath();for(var x=barrierX-bw/2;x<barrierX+bw/2;x+=2){var decay=Math.exp(-(x-(barrierX-bw/2))/(bw*.3));var y=cy+Math.sin((x-start)*.09-t*.006)*34*decay;ctx.lineTo(x,y)}ctx.stroke();ctx.restore();
    // transmitted wave
    if(m>.5){var a=Math.min(1,(m-.5)*2.2);ctx.save();ctx.strokeStyle='rgba(245,242,235,'+(.58*a)+')';ctx.lineWidth=2;ctx.beginPath();for(var x=barrierX+bw/2;x<W*.88;x+=3){var env=Math.exp(-Math.pow((x-(barrierX+bw/2+100))/110,2));var y=cy+Math.sin((x-start)*.09-t*.006)*22*env;if(x===barrierX+bw/2)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke();ctx.restore();glowDot(W*.78,cy,7,.7*a,true)}
    // reflected wave
    if(m>.62){ctx.save();ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=1.3;ctx.beginPath();for(var x=barrierX-bw/2;x>W*.22;x-=3){var env=Math.exp(-Math.pow((x-(barrierX-bw/2-90))/100,2));var y=cy+Math.sin((barrierX-x)*.09-t*.005)*18*env;if(x===barrierX-bw/2)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke();ctx.restore()}
  }
  var last=0;
  function frame(t){var s=stage();bg(t); if(page==='double-slit')slit(t,s.id===0?s.m:s.id===1?.55+.4*s.m:1); else if(page==='bells-inequality')bell(t,s.id===0?s.m*.35:s.id===1?.35+.45*s.m:.8+.2*s.m); else tunnel(t,s.id===0?s.m*.45:s.id===1?.35+.45*s.m:.8+.2*s.m);last=t;requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
})();
