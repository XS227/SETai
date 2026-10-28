'use strict';
/* SETAEI Bit Hologram v1: true 3D geometric projections on HTML canvas.
 * Reads *existing rendered local DOM bit tables*, NEVER private key input.
 * 4D = local comparison history (time), 5D = extra correctness/position overlay.
 * Neither 4D nor 5D is a claim of mathematical key/address dependence.
 */
(() => {
  const $=id=>document.getElementById(id);
  const panel=$('bit-holo-panel'),canvas=$('holo-canvas'),
    addressGrid=$('guess-address-grid'),keyGrid=$('guess-bit-grid');
  if(!panel||!canvas||!addressGrid||!keyGrid)return;
  const ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
  if(!ctx)return;
  const q=id=>$(id),status=q('holo-selection'),addrScore=q('holo-address-total'),keyScore=q('holo-key-total');
  const sepControl=q('holo-separation'),shiftControl=q('holo-shift');
  const connections=q('holo-connections'),values=q('holo-values'),glass=q('holo-glass');
  const historyPanel=q('holo-timeline'),historyLabel=q('holo-frame-label');
  const spinButton=q('holo-spin'),moveButton=q('holo-move');
  let w=0,h=0,ratio=1,mode='3d',spinning=false,moving=false,dirty=false,raf=0;
  let yaw=-0.5,pitch=0.69,zoom=1.02,panX=0,panY=0,topY=0;
  let separation=Number(sepControl.value),sideShift=Number(shiftControl.value);
  let snapshots=[],historyIndex=-1,lastSignature='',snap=null;
  const points=new Map();
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const fmt=n=>Number(n).toLocaleString('nb-NO');
  function parseGrid(grid,count){
    const nodes=[...grid.querySelectorAll('.guess-bit-chip')];
    if(nodes.length!==count)return null;
    return nodes.map(n=>({
      bit:n.textContent.trim()==='1'?1:0,
      match:n.classList.contains('correct')?1:n.classList.contains('incorrect')?0:-1
    }));
  }
  function snapshotSignature(a,k){
    return a.concat(k).map(n=>String(n.bit)+String(n.match+1)).join('');
  }
  function collect(){
    if(q('guess-result').hidden || q('guess-address-lab').hidden || q('guess-bit-lab').hidden)return;
    const a=parseGrid(addressGrid,160),k=parseGrid(keyGrid,256);
    if(!a||!k)return;
    const signature=snapshotSignature(a,k);
    if(signature===lastSignature)return;
    lastSignature=signature;
    const entry={address:a,key:k,createdAt:Date.now()};
    snapshots.push(entry);
    if(snapshots.length>12)snapshots.shift();
    if(mode!=='4d'||historyIndex===snapshots.length-2||historyIndex<0)
      historyIndex=snapshots.length-1;
    syncSnapshot();
  }
  function syncSnapshot(){
    snap=snapshots[clamp(historyIndex,0,snapshots.length-1)]||null;
    historyLabel.textContent=snapshots.length?
      'Test '+(historyIndex+1)+' av '+snapshots.length:'Ingen tester ennå';
    q('holo-previous').disabled=historyIndex<=0;
    q('holo-next').disabled=historyIndex>=snapshots.length-1;
    addrScore.textContent='Adresse: '+(snap?snap.address.filter(v=>v.match===1).length:'—')+'/160';
    const known=snap?snap.key.filter(v=>v.match!==-1).length:0;
    keyScore.textContent=known?'Nøkkel: '+snap.key.filter(v=>v.match===1).length+'/256':'Nøkkel: fasit ukjent';
    requestRender();
  }
  function resize(){
    const bounds=canvas.getBoundingClientRect();
    if(bounds.width<20||bounds.height<20)return;
    w=bounds.width;h=bounds.height;
    ratio=clamp(window.devicePixelRatio||1,1,2);
    const width=Math.max(100,Math.round(w*ratio)),height=Math.max(100,Math.round(h*ratio));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    requestRender();
  }
  function xyz(x,y,z){
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const X=x*cy+z*sy,Z=-x*sy+z*cy;
    const Y=y*cp-Z*sp,D=y*sp+Z*cp;
    const perspective=clamp(30/(30-D),0.50,2.0);
    const scale=Math.min(w/24,h/25)*zoom*perspective;
    return {x:w/2+X*scale+panX,y:h/2+Y*scale+panY,depth:D,scale};
  }
  function base(layer){
    const z=(layer==='address'?1:-1)*(1.0+separation/12.3);
    return {z,x:layer==='address'?sideShift/9:0,y:layer==='address'?topY:0};
  }
  function vertex(col,row,layer){
    const b=base(layer);
    return xyz((col-7.5)*1.1+b.x,(row-(layer==='address'?4.5:7.5))*0.99+b.y,b.z);
  }
  function outlinePolygon(pts,stroke,fill,width=1){
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);
    ctx.closePath();
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
  }
  function gradientGrid(){
    ctx.fillStyle='#071723';ctx.fillRect(0,0,w,h);
    const bg=ctx.createRadialGradient(w*.49,h*.45,12,w*.49,h*.51,Math.max(w,h)*.75);
    bg.addColorStop(0,'#10445a');bg.addColorStop(.50,'#0b2633');bg.addColorStop(1,'#07121a');
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(21,157,181,.10)';ctx.lineWidth=.7;
    const grid=clamp(Math.min(w,h)/13,17,30);
    for(let i=0;i<w+grid;i+=grid){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,h);ctx.stroke();}
    for(let i=0;i<h+grid;i+=grid){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(w,i);ctx.stroke();}
  }
  function connectionLines(){
    if(!connections.checked)return;
    ctx.lineWidth=mode==='5d'?1.0:.7;
    for(let i=0;i<160;i+=mode==='5d'?2:5){
      const row=Math.floor(i/16),col=i%16;
      const p=vertex(col,row,'address');
      // Closest spatial placement in a 16×16 key grid. This is NOT a bit mapping.
      const kRow=Math.round(row*15/9),q=vertex(col,kRow,'key');
      const linked=snap?.address[i]?.match===1;
      ctx.strokeStyle=linked?'rgba(160,248,107,.24)':'rgba(45,211,235,.14)';
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
    }
  }
  function plate(layer){
    const height=layer==='address'?10:16;
    const corners=[vertex(-.53,-.53,layer),vertex(15.53,-.53,layer),
      vertex(15.53,height-.47,layer),vertex(-.53,height-.47,layer)];
    const tint=layer==='address'?'rgba(12,84,105,.13)':'rgba(38,99,69,.16)';
    outlinePolygon(corners,'rgba(68,229,248,.76)',tint,1.45);
    const glow=glass.checked?3.5:7;
    ctx.save();ctx.shadowColor=layer==='address'?'#37dcf1':'#9ef87e';ctx.shadowBlur=glow;
    outlinePolygon(corners,'rgba(70,226,246,.52)',null,1);ctx.restore();
  }
  function render(){
    dirty=false;
    const rect=canvas.getBoundingClientRect();
    if(rect.width<20||rect.height<20)return;
    if(Math.abs(rect.width-w)>.1||Math.abs(rect.height-h)>.1){resize();return;}
    ctx.setTransform(ratio,0,0,ratio,0,0);
    gradientGrid();
    points.clear();
    if(!snap){
      ctx.textAlign='center';ctx.fillStyle='#a0d6d8';ctx.font='600 13px system-ui,sans-serif';
      ctx.fillText('Kjør «Test med kjent eksempel»',w/2,h/2-10);
      ctx.font='11px system-ui,sans-serif';ctx.fillStyle='#82adb7';
      ctx.fillText('for å vise 160 + 256 faktiske bitceller',w/2,h/2+13);
      return;
    }
    connectionLines();
    const polygons=[];
    for(const layer of ['address','key']){
      const rows=layer==='address'?10:16,data=snap[layer];
      for(let i=0;i<data.length;i++){
        const col=i%16,row=Math.floor(i/16),node=data[i];
        const x0=col-.45,x1=col+.45,y0=row-.42,y1=row+.42;
        const corners=[vertex(x0,y0,layer),vertex(x1,y0,layer),
          vertex(x1,y1,layer),vertex(x0,y1,layer)];
        const center=vertex(col,row,layer);
        polygons.push({layer,node,index:i,corners,center,depth:center.depth});
      }
    }
    polygons.sort((a,b)=>a.depth-b.depth);
    // Plane outlines are drawn before cells to keep all 416 cells visible.
    plate('address');plate('key');
    for(const tile of polygons){
      let fill,stroke,label;
      if(tile.node.match===1){
        fill=glass.checked?'rgba(109,235,93,.40)':'rgba(82,174,92,.88)';
        stroke='rgba(163,247,111,.74)';label='#edffdc';
      }else if(tile.node.match===0){
        fill=glass.checked?'rgba(61,78,101,.32)':'rgba(48,68,86,.94)';
        stroke='rgba(91,123,140,.43)';label='#acc4d2';
      }else{
        fill=glass.checked?'rgba(35,120,156,.28)':'rgba(38,100,139,.80)';
        stroke='rgba(69,154,191,.56)';label='#b2e9f5';
      }
      if(mode==='5d'&&tile.node.match===1)fill=glass.checked?'rgba(181,255,96,.57)':'rgba(167,237,81,.98)';
      outlinePolygon(tile.corners,stroke,fill,.55);
      points.set(tile.layer+':'+tile.index,tile.center);
      if(values.checked&&tile.center.scale>10){
        ctx.fillStyle=label;ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.font=(tile.layer==='address'?'700 ':'600 ')+
          clamp(tile.center.scale*.49,6,11)+'px ui-monospace,monospace';
        ctx.fillText(String(tile.node.bit),tile.center.x,tile.center.y);
      }
      if(mode==='5d'&&tile.node.match===1&&tile.index%9===0){
        ctx.fillStyle='rgba(198,250,122,.55)';
        ctx.fillRect(tile.center.x-1.2,tile.center.y-1.2,2.4,2.4);
      }
    }
    if(mode==='5d'){
      ctx.fillStyle='#99d8e8';ctx.textAlign='right';ctx.font='10px ui-monospace,monospace';
      ctx.fillText('FARGEKODE = LIKHET · IKKE ÅRSAK',w-8,17);
    }
  }
  function requestRender(){
    dirty=true;
    if(raf)return;
    raf=requestAnimationFrame(()=>{
      raf=0;if(dirty)render();
    });
  }
  const pointers=new Map();
  let lastTouchDistance=null,lastMoved=false;
  function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  canvas.addEventListener('pointerdown',e=>{
    canvas.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});
    lastMoved=false;lastTouchDistance=null;
  });
  canvas.addEventListener('pointermove',e=>{
    const old=pointers.get(e.pointerId);if(!old)return;
    const dx=e.clientX-old.x,dy=e.clientY-old.y;
    old.x=e.clientX;old.y=e.clientY;
    if(Math.hypot(e.clientX-old.startX,e.clientY-old.startY)>5)lastMoved=true;
    if(pointers.size===2){
      const p=[...pointers.values()],dist=distance(p[0],p[1]);
      if(lastTouchDistance!==null)zoom=clamp(zoom*(dist/Math.max(1,lastTouchDistance)),.48,2.8);
      lastTouchDistance=dist;
    }else if(pointers.size===1){
      if(moving){
        const shift=(Number(shiftControl.value)+dx*.65);
        sideShift=clamp(shift,-80,80);shiftControl.value=String(Math.round(sideShift));
        q('holo-shift-label').textContent=String(Math.round(sideShift));
        topY=clamp(topY+dy*.012,-5,5);
      }else{
        yaw+=dx*.011;pitch=clamp(pitch+dy*.010,-1.25,1.27);
      }
    }
    requestRender();
  });
  function pointerUp(e){
    const p=pointers.get(e.pointerId);
    if(p&&!lastMoved&&pointers.size===1&&snap){
      const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
      let closest=null,distanceMin=15;
      for(const [id,c] of points){
        const d=Math.hypot(c.x-x,c.y-y);
        if(d<distanceMin){distanceMin=d;closest=id;}
      }
      if(closest){
        const [layer,indexString]=closest.split(':'),index=Number(indexString),v=snap[layer][index];
        status.textContent=(layer==='address'?'Adresse':'Nøkkel')+'bit '+(index+1)+
          ': '+v.bit+' · '+(v.match===1?'lik':v.match===0?'ulik':'fasit ukjent');
      }
    }
    pointers.delete(e.pointerId);lastTouchDistance=null;
  }
  canvas.addEventListener('pointerup',pointerUp);
  canvas.addEventListener('pointercancel',pointerUp);
  canvas.addEventListener('wheel',e=>{
    if(!panel.contains(document.activeElement))return;
    e.preventDefault();
    zoom=clamp(zoom*Math.exp(-e.deltaY*.001),.48,2.8);requestRender();
  },{passive:false});
  canvas.addEventListener('keydown',e=>{
    let changed=true;
    if(e.key==='ArrowLeft')yaw-=.13;
    else if(e.key==='ArrowRight')yaw+=.13;
    else if(e.key==='ArrowUp')pitch=clamp(pitch-.12,-1.25,1.27);
    else if(e.key==='ArrowDown')pitch=clamp(pitch+.12,-1.25,1.27);
    else changed=false;
    if(changed){e.preventDefault();requestRender();}
  });
  const sceneReset=()=>{
    yaw=-.5;pitch=.69;zoom=1.02;panX=0;panY=0;topY=0;
    separation=65;sideShift=0;sepControl.value='65';shiftControl.value='0';
    q('holo-separation-label').textContent='65 %';q('holo-shift-label').textContent='0';
    spinning=false;moving=false;spinButton.setAttribute('aria-pressed','false');
    if(moveButton)moveButton.setAttribute('aria-pressed','false');
    cancelAnimationFrame(spinFrame);spinFrame=0;requestRender();
  };
  const zoomBy=m=>{zoom=clamp(zoom*m,.48,2.8);requestRender();};
  q('holo-zoom-in').addEventListener('click',()=>zoomBy(1.2));
  q('holo-zoom-out').addEventListener('click',()=>zoomBy(1/1.2));
  q('holo-rotate-left').addEventListener('click',()=>{yaw+=Math.PI/5;requestRender();});
  q('holo-reset').addEventListener('click',sceneReset);
  if(moveButton)moveButton.addEventListener('click',()=>{
    moving=!moving;moveButton.setAttribute('aria-pressed',String(moving));
    moveButton.title=moving?'Dra i hologrammet for å flytte det øvre laget':'Dra for å rotere';
  });
  sepControl.addEventListener('input',()=>{separation=Number(sepControl.value);
    q('holo-separation-label').textContent=Math.round(separation)+' %';requestRender();});
  shiftControl.addEventListener('input',()=>{sideShift=Number(shiftControl.value);
    q('holo-shift-label').textContent=String(sideShift);requestRender();});
  for(const c of [connections,values,glass])c.addEventListener('change',requestRender);
  for(const m of ['3d','4d','5d'])q('holo-mode-'+m).addEventListener('click',()=>{
    mode=m;
    for(const n of ['3d','4d','5d']){
      const b=q('holo-mode-'+n);b.classList.toggle('active',n===m);
      b.setAttribute('aria-pressed',String(n===m));
    }
    historyPanel.hidden=m!=='4d';
    q('holo-note').textContent=m==='3d'
      ?'3D: roter, zoom og legg 160 adressebiter over 256 nøkkelbiter. Koblingslinjene viser geometrisk plassering, ikke kryptografisk bitavhengighet.'
      :m==='4d'
      ?'4D: bla mellom lokale modelltester som er utført mens denne nettsiden er åpen. Ingen nøkkeldata lagres eller sendes.'
      :'5D: vis ekstra visuelle markører for bitlikhet og romlig plassering. 5D er her en analysevisning, ikke en virkelig femdimensjonal kryptografisk relasjon.';
    historyIndex=snapshots.length-1;syncSnapshot();
  });
  q('holo-previous').addEventListener('click',()=>{historyIndex=clamp(historyIndex-1,0,snapshots.length-1);syncSnapshot();});
  q('holo-next').addEventListener('click',()=>{historyIndex=clamp(historyIndex+1,0,snapshots.length-1);syncSnapshot();});
  let spinFrame=0,spinLast=0;
  function spin(t){
    spinFrame=0;
    if(!spinning||document.hidden||q('lookup-tool').hidden)return;
    if(!spinLast||t-spinLast>=32){
      if(spinLast)yaw+=Math.min(90,t-spinLast)*.0005;
      spinLast=t;requestRender();
    }
    spinFrame=requestAnimationFrame(spin);
  }
  spinButton.addEventListener('click',()=>{
    spinning=!spinning;spinButton.setAttribute('aria-pressed',String(spinning));
    cancelAnimationFrame(spinFrame);spinFrame=0;spinLast=0;
    if(spinning)spinFrame=requestAnimationFrame(spin);
  });
  const observer=new MutationObserver(()=>{collect();requestRender();});
  observer.observe(addressGrid,{childList:true,subtree:true});
  observer.observe(keyGrid,{childList:true,subtree:true});
  if(typeof ResizeObserver==='function'){
    const resizeObserver=new ResizeObserver(()=>resize());resizeObserver.observe(canvas);
  }else window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelAnimationFrame(spinFrame);spinFrame=0;}
    else {resize();if(spinning)spinFrame=requestAnimationFrame(spin);}
  });
  window.addEventListener('pagehide',()=>{
    observer.disconnect();snapshots=[];lastSignature='';snap=null;points.clear();
    cancelAnimationFrame(spinFrame);cancelAnimationFrame(raf);spinning=false;
  });
  collect();resize();
})();
