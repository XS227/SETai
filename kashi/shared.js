(function(){
const calm=matchMedia('(prefers-reduced-motion:reduce)').matches;
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);

/* header + menu + parallax */
const hdr=$('#hdr'),bg=$('.phero-bg');let tick=false;
function onScroll(){if(tick)return;tick=true;requestAnimationFrame(()=>{tick=false;const y=scrollY;hdr&&hdr.classList.toggle('solid',y>60);if(bg&&!calm&&y<innerHeight*1.2)bg.style.transform='translateY('+y*.2+'px)'})}
addEventListener('scroll',onScroll,{passive:true});onScroll();
const nav=$('#nav');
$('#burger')&&($('#burger').onclick=()=>nav.classList.toggle('open'));
$$('#nav a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));

/* reveal */
const io=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target)}}),{threshold:.12,rootMargin:'0px 0px -40px 0px'});
window.kashiReveal=()=>$$('.rv:not(.in)').forEach(el=>io.observe(el));
kashiReveal();

/* cursor glow on cards */
document.addEventListener('pointermove',e=>{const c=e.target.closest&&e.target.closest('.card');if(!c)return;const r=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-r.left+'px');c.style.setProperty('--my',e.clientY-r.top+'px')},{passive:true});

/* counters */
const cio=new IntersectionObserver(es=>es.forEach(en=>{if(!en.isIntersecting)return;cio.unobserve(en.target);const el=en.target,n=+el.dataset.count,suf=el.dataset.suf||'';if(calm){el.textContent=n+suf;return}const t0=performance.now();(function s(t){const k=Math.min(1,(t-t0)/1500);el.textContent=Math.round(n*(1-Math.pow(1-k,3)))+suf;if(k<1)requestAnimationFrame(s)})(t0)}));
$$('[data-count]').forEach(el=>cio.observe(el));

/* marquee */
const mq=$('#marq');
if(mq){const icon='<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M12 3v18M3 12h18"/></svg>';const row=['Nordic Sand','Arctic Grey','Pure White','Persian Travertine','Ivory Limestone','Volcanic Graphite','Warm Concrete','Fjord Blue','Desert Clay','Silver Marble','Basalt Stone','Cream Silk'].map(n=>'<span>'+icon+n+'</span>').join('');mq.innerHTML=row+row}

/* hero canvas */
const c=$('#fx');if(!c||calm)return;
const g=c.getContext('2d');let w,h,dpr,mx=.5,my=.5,run=true,last=0;
const size=()=>{dpr=Math.min(2,devicePixelRatio||1);const r=c.parentElement.getBoundingClientRect();w=r.width;h=r.height;c.width=w*dpr;c.height=h*dpr;g.setTransform(dpr,0,0,dpr,0,0)};
size();addEventListener('resize',size);
addEventListener('pointermove',e=>{mx=e.clientX/innerWidth;my=e.clientY/innerHeight},{passive:true});
const motes=Array.from({length:matchMedia('(max-width:700px)').matches?30:64},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.9+.4,s:Math.random()*.05+.02,p:Math.random()*6.28,z:Math.random()*.8+.2}));
function draw(ms){
  if(!run)return;requestAnimationFrame(draw);
  const t=ms/1000,dt=Math.min(.05,(ms-last)/1000||0);last=ms;
  g.clearRect(0,0,w,h);
  const hz=h*.7,vx=w*(.5+(mx-.5)*.07);
  const fl=g.createLinearGradient(0,hz,0,h);fl.addColorStop(0,'rgba(217,184,140,0)');fl.addColorStop(1,'rgba(217,184,140,.13)');g.fillStyle=fl;g.fillRect(0,hz,w,h-hz);
  g.lineWidth=1;
  for(let i=-26;i<=26;i++){const xb=w/2+i*w*.085;g.strokeStyle='rgba(235,205,160,'+Math.max(0,.2-Math.abs(i)*.0055)+')';g.beginPath();g.moveTo(vx+i*w*.085*.03,hz);g.lineTo(xb,h);g.stroke()}
  for(let k=0;k<12;k++){const z=((k+(t*.22)%1)/12),y=hz+(h-hz)*Math.pow(z,2.1);g.strokeStyle='rgba(235,205,160,'+(.04+.26*z)+')';g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke()}
  g.globalCompositeOperation='lighter';
  const sx=((t*.06)%1.5-.25)*w,sw=g.createRadialGradient(sx,hz+(h-hz)*.45,0,sx,hz+(h-hz)*.45,w*.3);
  sw.addColorStop(0,'rgba(255,225,180,.15)');sw.addColorStop(1,'rgba(255,225,180,0)');g.fillStyle=sw;g.fillRect(0,hz-40,w,h-hz+40);
  const cg=g.createRadialGradient(mx*w,my*h,0,mx*w,my*h,240);cg.addColorStop(0,'rgba(217,184,140,.12)');cg.addColorStop(1,'rgba(217,184,140,0)');g.fillStyle=cg;g.fillRect(0,0,w,h);
  for(const m of motes){m.y-=m.s*dt*(1+m.z);if(m.y<-.02){m.y=1.02;m.x=Math.random()}const a=.2+.45*Math.abs(Math.sin(t*1.3+m.p));g.fillStyle='rgba(255,226,178,'+a*m.z+')';g.beginPath();g.arc((m.x+(mx-.5)*.03*m.z)*w,m.y*h,m.r*m.z,0,6.283);g.fill()}
  g.globalCompositeOperation='source-over';
}
new IntersectionObserver(es=>{const v=es[0].isIntersecting;if(v&&!run){run=true;requestAnimationFrame(draw)}else if(!v)run=false}).observe(c.parentElement);
requestAnimationFrame(draw);
})();
