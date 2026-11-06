/* SETAEI Forskning visualisations: dependency-free responsive SVG with accessible tooltips.
 * radial(), zbars(), histogram(), paths(), donut(). Every chart is redrawn from plain numbers. */
(function(root){
'use strict';
var NS='http://www.w3.org/2000/svg',ACC='#F47A2A',COOL='#7CC7B2',BLUE='#9fb7ff',MUTE='#ffffff3d',WARN='#F4B63A';
function S(tag,attrs,parent){var e=document.createElementNS(NS,tag);if(attrs)for(var k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e}
function fmt(n,d){return Number(n).toLocaleString('nb-NO',{maximumFractionDigits:d==null?2:d})}
var tipEl=null;
function tip(){if(!tipEl){tipEl=document.createElement('div');tipEl.className='tip';tipEl.setAttribute('role','status');document.body.appendChild(tipEl)}return tipEl}
function showTip(html,ev){var t=tip();t.innerHTML=html;t.classList.add('on');var x=ev.clientX+14,y=ev.clientY+14,w=t.offsetWidth,h=t.offsetHeight;if(x+w>innerWidth-8)x=ev.clientX-w-14;if(y+h>innerHeight-8)y=ev.clientY-h-14;t.style.left=Math.max(8,x)+'px';t.style.top=Math.max(8,y)+'px'}
function hideTip(){if(tipEl)tipEl.classList.remove('on')}
function esc(s){return String(s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})}
function bind(node,html){
 node.addEventListener('mousemove',function(e){showTip(html(),e)});node.addEventListener('mouseleave',hideTip);
 node.addEventListener('focus',function(){var r=node.getBoundingClientRect();showTip(html(),{clientX:r.left+r.width/2,clientY:r.top})});node.addEventListener('blur',hideTip);
 node.addEventListener('touchstart',function(e){var t=e.touches[0];showTip(html(),t);setTimeout(hideTip,2200)},{passive:true});
}
function root0(box,w,h,label){box.textContent='';var svg=S('svg',{viewBox:'0 0 '+w+' '+h,role:'img','aria-label':label||'Diagram'});box.appendChild(svg);return svg}
function colorZ(z){return z>=2?ACC:z<=-2?BLUE:MUTE}

/* ---- circular frequency chart: one wedge per number; length = excess in σ, ring = expectation ---- */
function radial(box,o){
 var n=o.n,W=440,C=W/2,R0=72,RM=176,svg=root0(box,W,W,'Sirkeldiagram over hvor ofte hvert tall er trukket'),sd=o.sd||1;
 var lo=-4,hi=4,rad=function(z){return R0+(Math.max(lo,Math.min(hi,z))-lo)/(hi-lo)*(RM-R0)};
 [-2,0,2].forEach(function(z){S('circle',{cx:C,cy:C,r:rad(z),fill:'none',stroke:z===0?'#ffffff55':'#ffffff20','stroke-dasharray':z===0?'':'3 4'},svg)});
 var txt=S('text',{x:C,y:C-4,'text-anchor':'middle',style:'font:700 22px Space Grotesk;fill:#FFFAF0'},svg),sub=S('text',{x:C,y:C+16,'text-anchor':'middle',style:'font-size:11px'},svg);
 function centre(i){
  if(i==null){txt.textContent='1–'+n;sub.textContent='Trykk på et tall'}
  else{var z=(o.values[i]-o.expected)/sd;txt.textContent=String(i);sub.textContent=fmt(o.values[i],0)+' trekk · '+(z>=0?'+':'')+fmt(z,1)+' σ'}
 }
 var wedges={};
 for(var i=1;i<=n;i++){
  var a0=(i-1)/n*2*Math.PI-Math.PI/2+.006,a1=i/n*2*Math.PI-Math.PI/2-.006,z=(o.values[i]-o.expected)/sd,r1=rad(z);
  var p=function(r,a){return (C+r*Math.cos(a)).toFixed(1)+' '+(C+r*Math.sin(a)).toFixed(1)};
  var d='M'+p(R0,a0)+' L'+p(r1,a0)+' A'+r1.toFixed(1)+' '+r1.toFixed(1)+' 0 0 1 '+p(r1,a1)+' L'+p(R0,a1)+' A'+R0+' '+R0+' 0 0 0 '+p(R0,a0)+'Z';
  var w=S('path',{d:d,fill:o.selected===i?'#FFFAF0':colorZ(z),class:'hit',tabindex:0,role:'button','aria-label':'Tall '+i+': '+o.values[i]+' trekk'},svg);
  (function(i,z){bind(w,function(){return '<b>'+i+'</b> · '+fmt(o.values[i],0)+' trekk<br>forventet '+fmt(o.expected,1)+' ('+(z>=0?'+':'')+fmt(z,2)+' σ)'});
   w.addEventListener('click',function(){o.onPick&&o.onPick(i)});w.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();o.onPick&&o.onPick(i)}});w.addEventListener('mouseenter',function(){centre(i)});w.addEventListener('mouseleave',function(){centre(o.selected)})})(i,z);
  wedges[i]=w;
  if(i%5===0||n<=40||o.selected===i){var am=(i-.5)/n*2*Math.PI-Math.PI/2;S('text',{x:C+(RM+14)*Math.cos(am),y:C+(RM+14)*Math.sin(am)+3.5,'text-anchor':'middle',style:'font-size:10px'},svg).textContent=i}
 }
 centre(o.selected);
}

/* ---- z-score per number as bars with the ±2σ "expected noise" band ---- */
function zbars(box,o){
 var n=o.n,W=720,H=240,L=34,Rr=8,T=10,B=26,pw=(W-L-Rr)/n,svg=root0(box,W,H,'Søylediagram over avvik fra forventet i standardavvik'),sd=o.sd||1;
 var lo=-4,hi=4,y=function(z){return T+(hi-Math.max(lo,Math.min(hi,z)))/(hi-lo)*(H-T-B)};
 S('rect',{x:L,y:y(2),width:W-L-Rr,height:y(-2)-y(2),fill:'#ffffff0d'},svg);
 [-4,-2,0,2,4].forEach(function(z){S('line',{x1:L,x2:W-Rr,y1:y(z),y2:y(z),class:z?'gridl':'axis'},svg);S('text',{x:L-6,y:y(z)+3.5,'text-anchor':'end'},svg).textContent=(z>0?'+':'')+z+'σ'});
 for(var i=1;i<=n;i++){
  var z=(o.values[i]-o.expected)/sd,x=L+(i-1)*pw,top=Math.min(y(z),y(0)),h=Math.max(1.5,Math.abs(y(z)-y(0)));
  var r=S('rect',{x:(x+pw*.14).toFixed(1),y:top,width:(pw*.72).toFixed(1),height:h,rx:1.5,fill:o.selected===i?'#FFFAF0':colorZ(z),class:'hit',tabindex:0,role:'button','aria-label':'Tall '+i+' '+fmt(z,1)+' sigma'},svg);
  (function(i,z){bind(r,function(){return '<b>'+i+'</b> · '+fmt(o.values[i],0)+' trekk<br>'+(z>=0?'+':'')+fmt(z,2)+' σ fra forventet '+fmt(o.expected,1)});r.addEventListener('click',function(){o.onPick&&o.onPick(i)})})(i,z);
  if(i%5===0||n<=30)S('text',{x:x+pw/2,y:H-8,'text-anchor':'middle',style:'font-size:10px'},svg).textContent=i;
 }
}

/* ---- observed vs theoretical distribution of hits ---- */
function histogram(box,o){ // o:{labels:[...], series:[{name,color,values:[p]}]}
 box.style.maxWidth='760px';var m=o.labels.length,W=620,H=230,L=40,Rr=8,T=10,B=30,gw=(W-L-Rr)/m,svg=root0(box,W,H,o.aria||'Treffordeling'),ymax=0;
 o.series.forEach(function(s){s.values.forEach(function(v){if(v>ymax)ymax=v})});ymax=Math.max(ymax*1.12,.001);
 var y=function(v){return T+(1-v/ymax)*(H-T-B)};
 for(var t=0;t<=4;t++){var v=ymax*t/4;S('line',{x1:L,x2:W-Rr,y1:y(v),y2:y(v),class:t?'gridl':'axis'},svg);S('text',{x:L-6,y:y(v)+3.5,'text-anchor':'end'},svg).textContent=fmt(v*100,v*100<10?1:0)+' %'}
 var k=o.series.length;
 o.labels.forEach(function(lb,j){
  var gx=L+j*gw,bw=gw*.78/k;
  o.series.forEach(function(s,si){
   var v=s.values[j],r=S('rect',{x:(gx+gw*.11+si*bw).toFixed(1),y:y(v),width:(bw*.94).toFixed(1),height:Math.max(0,H-B-y(v)),rx:2,fill:s.color,class:'hit',tabindex:0},svg);
   bind(r,function(){return '<b>'+esc(lb)+'</b> · '+esc(s.name)+'<br>'+fmt(v*100,v<.01?3:2)+' %'});
  });
  S('text',{x:gx+gw/2,y:H-10,'text-anchor':'middle'},svg).textContent=lb;
 });
}

/* ---- cumulative excess hits with the 95 % envelope expected from pure chance ---- */
function paths(box,o){ // o:{series:[{name,color,excess:[cumulative], width}], sdPerDraw, dates:[iso]}
 var W=720,H=300,L=52,Rr=12,T=12,B=30,n=0,svg=root0(box,W,H,'Kumulativt overskudd av treff sammenlignet med tilfeldighet');
 o.series.forEach(function(s){n=Math.max(n,s.excess.length)});if(!n){box.textContent='Ingen data';return}
 var env=function(i){return 1.96*o.sdPerDraw*Math.sqrt(i)},ym=env(n);
 o.series.forEach(function(s){s.excess.forEach(function(v){if(Math.abs(v)>ym)ym=Math.abs(v)})});ym*=1.08;
 var X=function(i){return L+i/n*(W-L-Rr)},Y=function(v){return T+(1-(v+ym)/(2*ym))*(H-T-B)};
 var step=Math.max(1,Math.floor(n/160)),up=[],dn=[];
 for(var i=0;i<=n;i+=step){up.push(X(i).toFixed(1)+' '+Y(env(i)).toFixed(1));dn.unshift(X(i).toFixed(1)+' '+Y(-env(i)).toFixed(1))}
 up.push(X(n).toFixed(1)+' '+Y(env(n)).toFixed(1));dn.unshift(X(n).toFixed(1)+' '+Y(-env(n)).toFixed(1));
 S('polygon',{points:up.concat(dn).join(' '),fill:'#ffffff0f',stroke:'#ffffff22'},svg);
 for(var t=-2;t<=2;t++){var v=ym*t/2.16;S('line',{x1:L,x2:W-Rr,y1:Y(v),y2:Y(v),class:t?'gridl':'axis'},svg);S('text',{x:L-6,y:Y(v)+3.5,'text-anchor':'end'},svg).textContent=(v>0?'+':'')+fmt(v,Math.abs(v)<10?1:0)}
 if(o.dates&&o.dates.length){[0,.5,1].forEach(function(f,j){var i=Math.min(o.dates.length-1,Math.round(f*(o.dates.length-1)));S('text',{x:L+f*(W-L-Rr),y:H-8,'text-anchor':j===0?'start':j===2?'end':'middle'},svg).textContent=o.dates[i].slice(0,7)})}
 o.series.forEach(function(s){
  var d='';for(var i=0;i<s.excess.length;i+=Math.max(1,Math.floor(s.excess.length/400))){d+=(d?'L':'M')+X(i+1).toFixed(1)+' '+Y(s.excess[i]).toFixed(1)}
  d+='L'+X(s.excess.length).toFixed(1)+' '+Y(s.excess[s.excess.length-1]).toFixed(1);
  S('path',{d:d,fill:'none',stroke:s.color,'stroke-width':s.width||2,'stroke-linejoin':'round','stroke-linecap':'round',opacity:s.dim?.75:1},svg);
 });
 var cross=S('line',{y1:T,y2:H-B,stroke:'#ffffff66','stroke-width':1,visibility:'hidden'},svg),ov=S('rect',{x:L,y:T,width:W-L-Rr,height:H-T-B,fill:'transparent'},svg);
 function at(ev){var r=svg.getBoundingClientRect(),vx=(ev.clientX-r.left)/r.width*W,i=Math.max(1,Math.min(n,Math.round((vx-L)/(W-L-Rr)*n)));cross.setAttribute('x1',X(i));cross.setAttribute('x2',X(i));cross.setAttribute('visibility','visible');
  var h='<b>'+(o.dates&&o.dates[i-1]?o.dates[i-1]:'trekning '+i)+'</b> · nr. '+i;
  o.series.forEach(function(s){var v=s.excess[Math.min(i,s.excess.length)-1];h+='<br><span style="color:'+s.color+'">●</span> '+esc(s.name)+': '+(v>=0?'+':'')+fmt(v,1)});
  h+='<br>95 %-grense: ±'+fmt(env(i),1);showTip(h,ev)}
 ov.addEventListener('mousemove',at);ov.addEventListener('mouseleave',function(){cross.setAttribute('visibility','hidden');hideTip()});
 ov.addEventListener('touchmove',function(e){at(e.touches[0])},{passive:true});
}

/* ---- donut: observed share (arc) with a tick for the share expected by chance ---- */
function donut(box,o){ // {value, chance, text, color}
 var svg=root0(box,120,120,o.aria||'Andel'),r=46,C=2*Math.PI*r;
 S('circle',{cx:60,cy:60,r:r,fill:'none',stroke:'#ffffff14','stroke-width':12},svg);
 S('circle',{cx:60,cy:60,r:r,fill:'none',stroke:o.color||ACC,'stroke-width':12,'stroke-dasharray':(Math.max(0,Math.min(1,o.value))*C).toFixed(2)+' '+C.toFixed(2),transform:'rotate(-90 60 60)','stroke-linecap':'butt'},svg);
 var a=o.chance*2*Math.PI-Math.PI/2;
 S('line',{x1:60+(r-10)*Math.cos(a),y1:60+(r-10)*Math.sin(a),x2:60+(r+10)*Math.cos(a),y2:60+(r+10)*Math.sin(a),stroke:'#FFFAF0','stroke-width':2.4,'stroke-linecap':'round'},svg);
 S('text',{x:60,y:64,'text-anchor':'middle',style:'font:700 17px Space Grotesk;fill:#FFFAF0'},svg).textContent=o.text;
}
root.SETAEI_VIZ={radial:radial,zbars:zbars,histogram:histogram,paths:paths,donut:donut,tip:showTip,hideTip:hideTip,fmt:fmt,esc:esc,C:{ACC:ACC,COOL:COOL,BLUE:BLUE,MUTE:MUTE,WARN:WARN}};
})(window);
