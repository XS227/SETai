'use strict';
/* SETAEI Bit Hologram v2: 3D / 4D / 5D analysis lab on HTML canvas, no libraries, no network.
 * Reads the already rendered local bit tables. The only secret it can touch is the synthetic
 * demo key announced by bit-compare-v3.js ("setai:truth"); it is kept in memory and dropped on pagehide.
 *
 * What is REAL here:  match / mismatch per bit, history of local tests, and the measured
 *   sensitivity matrix (flip key bit k -> which address bits change), computed with the
 *   page's own deriveAddress().
 * What is a VIEW:     5D axes are a way to lay out five measured properties, not a physical
 *   or cryptographic fifth dimension. The quantum wording is an analogy.
 */
(() => {
  const $=id=>document.getElementById(id);
  const panel=$('bit-holo-panel'),canvas=$('holo-canvas'),
    addressGrid=$('guess-address-grid'),keyGrid=$('guess-bit-grid');
  if(!panel||!canvas||!addressGrid||!keyGrid)return;
  const ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
  if(!ctx)return;
  const q=$,status=q('holo-selection'),addrScore=q('holo-address-total'),keyScore=q('holo-key-total');
  const sepControl=q('holo-separation'),shiftControl=q('holo-shift');
  const connections=q('holo-connections'),values=q('holo-values'),glass=q('holo-glass');
  const historyPanel=q('holo-timeline'),historyLabel=q('holo-frame-label');
  const spinButton=q('holo-spin'),moveButton=q('holo-move');
  let w=0,h=0,ratio=1,mode='3d',spinning=false,moving=false,dirty=false,raf=0;
  let yaw=-0.5,pitch=0.69,zoom=1.02,panX=0,panY=0,topY=0;
  let separation=Number(sepControl.value),sideShift=Number(shiftControl.value);
  let snapshots=[],historyIndex=-1,lastSignature='',snap=null;
  let truth=null,sens=null,measuring=false,selected=null,onlyMissing=false;
  const points=new Map();
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const pct=(a,b)=>b?(100*a/b).toFixed(1).replace('.',',')+' %':'—';

  /* ---------- injected lab UI ---------- */
  const missToggle=document.createElement('label');
  missToggle.innerHTML='<input id="holo-missing" type="checkbox"> Vis bare det som mangler';
  panel.querySelector('.holo-toggles').appendChild(missToggle);
  const lab=document.createElement('div');lab.className='holo-lab';
  lab.innerHTML=
    '<h4>Slik blir en nøkkel til en adresse</h4>'+
    '<ol class="holo-pipe" aria-label="Fire trinn fra privatnøkkel til adresse">'+
    '<li><b>256 bit</b><span>Privatnøkkel</span></li>'+
    '<li><b>× G</b><span>Elliptisk kurve secp256k1 → offentlig nøkkel (512 bit)</span></li>'+
    '<li><b>Keccak-256</b><span>Hash → 256 bit</span></li>'+
    '<li><b>Siste 160</b><span>De 160 bitene er adressen</span></li></ol>'+
    '<p class="holo-lesson">Hver adressebit er altså <em>nøyaktig</em> én hashbit. Men hashen og kurven blander alt: <strong>snur du én eneste nøkkelbit, snur omtrent halvparten av adressebitene</strong> (skredeffekt). Derfor finnes det ingen «bit 12 i adressen kommer fra bit 12 i nøkkelen». Målingen under viser det med ekte tall.</p>'+
    '<div class="holo-measure"><button type="button" id="holo-measure" disabled>◎ Mål koblingene · snu hver nøkkelbit (256 målinger)</button>'+
    '<p id="holo-measure-status" role="status" aria-live="polite">Trykk «Test med kjent eksempel» først. Måling krever en kjent syntetisk testnøkkel; en ekte nøkkel røres aldri.</p></div>'+
    '<div id="holo-matrix-wrap" class="holo-matrix-wrap" hidden>'+
    '<p class="holo-matrix-title">Koblingskart · rader = 256 nøkkelbiter · kolonner = 160 adressebiter</p>'+
    '<canvas id="holo-matrix" width="160" height="256" aria-label="Varmekart: lys celle betyr at en nøkkelbit-endring snudde den adressebiten" tabindex="0"></canvas>'+
    '<p class="holo-matrix-legend"><i class="flip"></i> snudde ved endring <i class="same"></i> uendret · trykk i kartet for å velge et par</p>'+
    '<p id="holo-matrix-readout" class="holo-matrix-readout"></p></div>'+
    '<details class="holo-missing"><summary id="holo-missing-summary">Hvilke biter mangler?</summary><div id="holo-missing-list"></div></details>'+
    '<div class="holo-quantum"><h4>Kvantetankegang (analogi)</h4>'+
    '<p>Før du regner ut adressen er hver adressebit 50/50 sett fra nøkkelens side: «superposisjon» av 0 og 1. Å regne ut og sammenligne er «målingen» som gir ett svar. Skredeffekten er som sammenfiltring: én endring i nøkkelen påvirker alle utfall samtidig. <strong>Dette er en tenkemåte, ikke ekte kvantefysikk:</strong> hele kjeden er klassisk og helt deterministisk, og ingen kvantemaskin trengs for å se mønsteret her.</p></div>';
  panel.insertBefore(lab,q('holo-note'));
  const measureBtn=q('holo-measure'),measureStatus=q('holo-measure-status');
  const matrix=q('holo-matrix'),mctx=matrix.getContext('2d'),matrixWrap=q('holo-matrix-wrap'),
    readout=q('holo-matrix-readout'),missList=q('holo-missing-list'),missSummary=q('holo-missing-summary');

  /* ---------- data ---------- */
  function parseGrid(grid,count){
    const nodes=[...grid.querySelectorAll('.guess-bit-chip')];
    if(nodes.length!==count)return null;
    return nodes.map(n=>({
      bit:n.textContent.trim()==='1'?1:0,
      match:n.classList.contains('correct')?1:n.classList.contains('incorrect')?0:-1
    }));
  }
  const signatureOf=(a,k)=>a.concat(k).map(n=>String(n.bit)+String(n.match+1)).join('');
  function collect(){
    if(q('guess-result').hidden||q('guess-address-lab').hidden||q('guess-bit-lab').hidden)return;
    const a=parseGrid(addressGrid,160),k=parseGrid(keyGrid,256);
    if(!a||!k)return;
    const signature=signatureOf(a,k);
    if(signature===lastSignature)return;
    lastSignature=signature;
    snapshots.push({address:a,key:k,createdAt:Date.now()});
    if(snapshots.length>12)snapshots.shift();
    if(mode!=='4d'||historyIndex===snapshots.length-2||historyIndex<0)historyIndex=snapshots.length-1;
    syncSnapshot();
  }
  function syncSnapshot(){
    snap=snapshots[clamp(historyIndex,0,snapshots.length-1)]||null;
    historyLabel.textContent=snapshots.length?'Test '+(historyIndex+1)+' av '+snapshots.length:'Ingen tester ennå';
    q('holo-previous').disabled=historyIndex<=0;
    q('holo-next').disabled=historyIndex>=snapshots.length-1;
    const aHit=snap?snap.address.filter(v=>v.match===1).length:0;
    addrScore.textContent='Adresse: '+(snap?aHit:'—')+'/160';
    const known=snap?snap.key.filter(v=>v.match!==-1).length:0;
    keyScore.textContent=known?'Nøkkel: '+snap.key.filter(v=>v.match===1).length+'/256':'Nøkkel: fasit ukjent';
    renderMissing();
    requestRender();
  }
  function renderMissing(){
    if(!snap){missSummary.textContent='Hvilke biter mangler?';missList.textContent='';return;}
    const rowsOf=(layer,rows)=>{
      const out=[];
      for(let r=0;r<rows;r++){
        const miss=[];
        for(let c=0;c<16;c++){const i=r*16+c;if(snap[layer][i].match===0)miss.push(i+1);}
        if(miss.length)out.push('<li><span>rad '+(r+1)+'</span> '+miss.length+'/16 mangler: <code>'+miss.join(', ')+'</code></li>');
      }
      return out.join('');
    };
    const aMiss=snap.address.filter(v=>v.match===0).length;
    const kKnown=snap.key.some(v=>v.match!==-1),kMiss=snap.key.filter(v=>v.match===0).length;
    missSummary.textContent='Mangler: '+aMiss+' av 160 adressebiter'+(kKnown?' · '+kMiss+' av 256 nøkkelbiter':'');
    missList.innerHTML='<p class="holo-miss-h">Adressebiter som ikke stemmer</p><ul>'+(rowsOf('address',10)||'<li>Ingen</li>')+'</ul>'+
      (kKnown?'<p class="holo-miss-h">Nøkkelbiter som ikke stemmer</p><ul>'+(rowsOf('key',16)||'<li>Ingen</li>')+'</ul>':
        '<p class="holo-miss-h">Nøkkelbiter</p><p>Fasit ukjent, så det kan ikke avgjøres hvilke som mangler.</p>');
  }

  /* ---------- measured sensitivity (key bit -> address bits) ---------- */
  const toBits=hex=>[...hex.toLowerCase().replace(/^0x/,'')].flatMap(ch=>parseInt(ch,16).toString(2).padStart(4,'0').split('').map(Number));
  const ORDER=BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
  async function measure(){
    if(!truth||measuring||typeof LocalWalletCrypto==='undefined')return;
    measuring=true;measureBtn.disabled=true;
    const baseBits=toBits(LocalWalletCrypto.deriveAddress(truth.key));
    const rows=[];
    try{
      for(let k=0;k<256;k++){
        const flipped=BigInt('0x'+truth.key)^(1n<<BigInt(255-k));
        const row=new Uint8Array(160);
        if(flipped>0n&&flipped<ORDER){
          const bits=toBits(LocalWalletCrypto.deriveAddress(flipped.toString(16).padStart(64,'0')));
          for(let i=0;i<160;i++)row[i]=bits[i]!==baseBits[i]?1:0;
        }
        rows.push(row);
        if(k%8===7){measureStatus.textContent='Måler … '+(k+1)+' / 256 nøkkelbiter snudd';await new Promise(r=>setTimeout(r,0));}
        if(!truth)throw new Error('avbrutt');
      }
      sens=rows;drawMatrix();summarize();
    }catch(e){measureStatus.textContent='Målingen ble avbrutt: '+e.message;}
    finally{measuring=false;measureBtn.disabled=!truth;requestRender();}
  }
  function summarize(){
    let total=0;const perAddr=new Uint16Array(160);
    for(const row of sens)for(let i=0;i<160;i++){total+=row[i];perAddr[i]+=row[i];}
    const mean=total/(256*160);
    const lo=Math.min(...perAddr),hi=Math.max(...perAddr);
    measureStatus.textContent='Ferdig: 256 nøkkelbit-endringer × 160 adressebiter = 40 960 målte koblinger. I snitt snur '+
      pct(total,256*160)+' av adressebitene per endret nøkkelbit (tilfeldig ville gitt 50 %). Hver adressebit ble snudd av mellom '+lo+' og '+hi+' av 256 nøkkelbiter. Ingen enkeltkobling skiller seg ut, og det er selve poenget: ingen bit-for-bit-vei tilbake.'+
      (Math.abs(mean-.5)<.03?'':' (Avvik fra 50 % – uvanlig, sjekk manuelt.)');
    matrixWrap.hidden=false;
  }
  function drawMatrix(){
    if(!sens)return;
    const img=mctx.createImageData(160,256);
    for(let k=0;k<256;k++)for(let i=0;i<160;i++){
      const p=(k*160+i)*4,on=sens[k][i];
      img.data[p]=on?197:15;img.data[p+1]=on?244:44;img.data[p+2]=on?121:56;img.data[p+3]=255;
    }
    mctx.putImageData(img,0,0);
    if(selected&&selected.key!=null){mctx.fillStyle='rgba(75,235,241,.28)';mctx.fillRect(0,selected.key,160,1);}
    if(selected&&selected.addr!=null){mctx.fillStyle='rgba(75,235,241,.28)';mctx.fillRect(selected.addr,0,1,256);}
  }
  function describeSelection(){
    if(!selected){readout.textContent='';return;}
    const parts=[];
    if(sens&&selected.key!=null){
      const n=sens[selected.key].reduce((a,b)=>a+b,0);
      parts.push('Å snu nøkkelbit '+(selected.key+1)+' endret '+n+' av 160 adressebiter ('+pct(n,160)+').');
    }
    if(sens&&selected.addr!=null){
      let n=0;for(const row of sens)n+=row[selected.addr];
      parts.push('Adressebit '+(selected.addr+1)+' ble snudd av '+n+' av 256 nøkkelbiter ('+pct(n,256)+').');
    }
    if(sens&&selected.key!=null&&selected.addr!=null)
      parts.push('Akkurat dette paret: '+(sens[selected.key][selected.addr]?'snudde':'forble uendret')+'.');
    readout.textContent=parts.join(' ');
  }

  /* ---------- projection ---------- */
  function resize(){
    const b=canvas.getBoundingClientRect();
    if(b.width<20||b.height<20)return;
    w=b.width;h=b.height;ratio=clamp(window.devicePixelRatio||1,1,2);
    const cw=Math.max(100,Math.round(w*ratio)),ch=Math.max(100,Math.round(h*ratio));
    if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
    requestRender();
  }
  function xyz(x,y,z){
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const X=x*cy+z*sy,Z=-x*sy+z*cy,Y=y*cp-Z*sp,D=y*sp+Z*cp;
    const perspective=clamp(30/(30-D),0.50,2.0);
    const scale=Math.min(w/24,h/25)*zoom*perspective;
    return {x:w/2+X*scale+panX,y:h/2+Y*scale+panY,depth:D,scale};
  }
  function base(layer){
    return {z:(layer==='address'?1:-1)*(1.0+separation/12.3),x:layer==='address'?sideShift/9:0,y:layer==='address'?topY:0};
  }
  function vertex(col,row,layer){
    const b=base(layer);
    return xyz((col-7.5)*1.1+b.x,(row-(layer==='address'?4.5:7.5))*0.99+b.y,b.z);
  }
  const rgba=(r,g,b,a)=>'rgba('+r+','+g+','+b+','+a+')';
  function backdrop(){
    ctx.fillStyle='#071723';ctx.fillRect(0,0,w,h);
    const bg=ctx.createRadialGradient(w*.49,h*.45,12,w*.49,h*.51,Math.max(w,h)*.75);
    bg.addColorStop(0,'#10445a');bg.addColorStop(.5,'#0b2633');bg.addColorStop(1,'#07121a');
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(21,157,181,.08)';ctx.lineWidth=.7;
    const g=clamp(Math.min(w,h)/13,17,30);
    for(let i=0;i<w+g;i+=g){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,h);ctx.stroke();}
    for(let i=0;i<h+g;i+=g){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(w,i);ctx.stroke();}
  }
  function plate(layer){
    const rows=layer==='address'?10:16;
    const c=[vertex(-.6,-.6,layer),vertex(15.6,-.6,layer),vertex(15.6,rows-.4,layer),vertex(-.6,rows-.4,layer)];
    ctx.beginPath();ctx.moveTo(c[0].x,c[0].y);for(let i=1;i<4;i++)ctx.lineTo(c[i].x,c[i].y);ctx.closePath();
    ctx.fillStyle=layer==='address'?'rgba(12,84,105,.10)':'rgba(38,99,69,.12)';ctx.fill();
    ctx.strokeStyle=layer==='address'?'rgba(68,229,248,.55)':'rgba(158,248,126,.45)';ctx.lineWidth=1.2;ctx.stroke();
  }
  function stability(layer,i){
    const upto=snapshots.slice(0,historyIndex+1);
    if(upto.length<2)return null;
    let known=0,hit=0;
    for(const s of upto){const m=s[layer][i].match;if(m!==-1){known++;if(m===1)hit++;}}
    return known?hit/known:null;
  }
  function sphere(c,r,fill,stroke,hollow){
    ctx.beginPath();ctx.arc(c.x,c.y,r,0,6.2832);
    if(hollow){
      ctx.setLineDash([Math.max(1.5,r*.6),Math.max(1.5,r*.5)]);
      ctx.strokeStyle=stroke;ctx.lineWidth=1.3;ctx.stroke();ctx.setLineDash([]);
      return;
    }
    ctx.fillStyle=fill;ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.8;ctx.stroke();}
    if(r>4){ctx.beginPath();ctx.arc(c.x-r*.3,c.y-r*.3,r*.28,0,6.2832);ctx.fillStyle='rgba(255,255,255,.22)';ctx.fill();}
  }
  function measuredLinks(){
    if(!sens||!selected||!connections.checked)return;
    ctx.lineWidth=.9;
    if(selected.key!=null){
      const from=points.get('key:'+selected.key);
      if(from)for(let i=0;i<160;i++){
        const to=points.get('address:'+i);if(!to)continue;
        ctx.strokeStyle=sens[selected.key][i]?'rgba(255,214,102,.50)':'rgba(120,170,190,.05)';
        ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);ctx.stroke();
      }
    }
    if(selected.addr!=null){
      const to=points.get('address:'+selected.addr);
      if(to)for(let k=0;k<256;k++){
        const from=points.get('key:'+k);if(!from)continue;
        ctx.strokeStyle=sens[k][selected.addr]?'rgba(255,140,200,.34)':'rgba(120,170,190,.03)';
        ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);ctx.stroke();
      }
    }
  }
  function render(){
    dirty=false;
    const rect=canvas.getBoundingClientRect();
    if(rect.width<20||rect.height<20)return;
    if(Math.abs(rect.width-w)>.1||Math.abs(rect.height-h)>.1){resize();return;}
    ctx.setTransform(ratio,0,0,ratio,0,0);
    backdrop();points.clear();
    if(!snap){
      ctx.textAlign='center';ctx.fillStyle='#a0d6d8';ctx.font='600 13px system-ui,sans-serif';
      ctx.fillText('Kjør «Test med kjent eksempel»',w/2,h/2-10);
      ctx.font='11px system-ui,sans-serif';ctx.fillStyle='#82adb7';
      ctx.fillText('for å vise 160 + 256 faktiske bitkuler',w/2,h/2+13);
      return;
    }
    plate('address');plate('key');
    const nodes=[];
    for(const layer of ['address','key']){
      const data=snap[layer];
      for(let i=0;i<data.length;i++){
        const c=vertex(i%16,Math.floor(i/16),layer);
        points.set(layer+':'+i,c);nodes.push({layer,i,node:data[i],c});
      }
    }
    // 4th axis (time): older tests as ghost copies shifted along a diagonal.
    if(mode==='5d'&&historyIndex>0){
      const back=Math.min(4,historyIndex);
      for(let j=back;j>=1;j--){
        const s=snapshots[historyIndex-j];if(!s)continue;
        ctx.fillStyle='rgba(197,244,121,'+(.22-j*.04)+')';
        for(const n of nodes){
          if(s[n.layer][n.i].match!==1)continue;
          ctx.beginPath();ctx.arc(n.c.x-j*7,n.c.y-j*5,Math.max(1,n.c.scale*.12),0,6.2832);ctx.fill();
        }
      }
    }
    nodes.sort((a,b)=>a.c.depth-b.c.depth);
    measuredLinks();
    for(const t of nodes){
      const m=t.node.match,r=Math.max(2,t.c.scale*.40);
      const isSel=selected&&((t.layer==='key'&&selected.key===t.i)||(t.layer==='address'&&selected.addr===t.i));
      const dim=onlyMissing&&m!==0;
      if(dim){
        ctx.fillStyle='rgba(120,170,190,.18)';ctx.beginPath();ctx.arc(t.c.x,t.c.y,Math.max(1,r*.28),0,6.2832);ctx.fill();
      }else if(m===1){
        sphere(t.c,r,glass.checked?'rgba(109,235,93,.62)':'rgba(82,174,92,.95)','rgba(163,247,111,.8)');
      }else if(m===0){
        // Missing bit: an empty dashed shell where a correct bit should have been.
        sphere(t.c,r,null,'rgba(255,150,120,.9)',true);
        ctx.fillStyle='rgba(255,120,90,.10)';ctx.beginPath();ctx.arc(t.c.x,t.c.y,r*.85,0,6.2832);ctx.fill();
      }else{
        sphere(t.c,r,glass.checked?'rgba(35,140,180,.55)':'rgba(38,110,150,.9)','rgba(69,154,191,.7)');
      }
      if(mode==='5d'&&!dim){
        const s=stability(t.layer,t.i);
        if(s!==null){
          ctx.beginPath();ctx.arc(t.c.x,t.c.y,r+2.2,0,6.2832);
          ctx.strokeStyle=s>=.99?'rgba(197,244,121,.95)':s>0?rgba(255,214,102,.3+.5*s):'rgba(255,140,120,.35)';
          ctx.lineWidth=1;ctx.stroke();
        }
      }
      if(isSel){ctx.beginPath();ctx.arc(t.c.x,t.c.y,r+4,0,6.2832);ctx.strokeStyle='#4bebf1';ctx.lineWidth=2;ctx.stroke();}
      if(values.checked&&!dim&&t.c.scale>10){
        ctx.fillStyle=m===1?'#0b2a12':m===0?'#ffb8a2':'#d3f3fb';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.font='700 '+clamp(t.c.scale*.46,6,11)+'px ui-monospace,monospace';
        ctx.fillText(String(t.node.bit),t.c.x,t.c.y+.5);
      }
    }
    ctx.textBaseline='alphabetic';
    if(mode==='5d'){
      ctx.fillStyle='#99d8e8';ctx.textAlign='right';ctx.font='9px ui-monospace,monospace';
      const lines=['x kolonne · y rad · z lag','t historikk (spøkelser, bakover)','s stabilitet (ring: grønn = alltid lik)','v måling: gult = snudd av valgt bit'];
      lines.forEach((l,i)=>ctx.fillText(l,w-8,16+i*12));
    }
  }
  function requestRender(){
    dirty=true;if(raf)return;
    raf=requestAnimationFrame(()=>{raf=0;if(dirty)render();});
  }

  /* ---------- interaction ---------- */
  const pointers=new Map();
  let lastTouchDistance=null,lastMoved=false;
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
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
      const p=[...pointers.values()],d=dist(p[0],p[1]);
      if(lastTouchDistance!==null)zoom=clamp(zoom*(d/Math.max(1,lastTouchDistance)),.48,2.8);
      lastTouchDistance=d;
    }else if(pointers.size===1){
      if(moving){
        sideShift=clamp(Number(shiftControl.value)+dx*.65,-80,80);shiftControl.value=String(Math.round(sideShift));
        q('holo-shift-label').textContent=String(Math.round(sideShift));
        topY=clamp(topY+dy*.012,-5,5);
      }else{yaw+=dx*.011;pitch=clamp(pitch+dy*.010,-1.25,1.27);}
    }
    requestRender();
  });
  function select(layer,index){
    selected=selected||{key:null,addr:null};
    if(layer==='key')selected.key=selected.key===index?null:index;
    else selected.addr=selected.addr===index?null:index;
    if(selected.key==null&&selected.addr==null)selected=null;
    const v=snap[layer][index];
    status.textContent=(layer==='address'?'Adresse':'Nøkkel')+'bit '+(index+1)+': '+v.bit+' · '+
      (v.match===1?'lik':v.match===0?'mangler (ulik)':'fasit ukjent');
    describeSelection();drawMatrix();requestRender();
  }
  function pointerUp(e){
    const p=pointers.get(e.pointerId);
    if(p&&!lastMoved&&pointers.size===1&&snap){
      const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
      let closest=null,best=16;
      for(const [id,c] of points){const d=Math.hypot(c.x-x,c.y-y);if(d<best){best=d;closest=id;}}
      if(closest){const [layer,i]=closest.split(':');select(layer,Number(i));}
    }
    pointers.delete(e.pointerId);lastTouchDistance=null;
  }
  canvas.addEventListener('pointerup',pointerUp);
  canvas.addEventListener('pointercancel',pointerUp);
  canvas.addEventListener('wheel',e=>{
    if(!panel.contains(document.activeElement))return;
    e.preventDefault();zoom=clamp(zoom*Math.exp(-e.deltaY*.001),.48,2.8);requestRender();
  },{passive:false});
  canvas.addEventListener('keydown',e=>{
    let ch=true;
    if(e.key==='ArrowLeft')yaw-=.13;else if(e.key==='ArrowRight')yaw+=.13;
    else if(e.key==='ArrowUp')pitch=clamp(pitch-.12,-1.25,1.27);
    else if(e.key==='ArrowDown')pitch=clamp(pitch+.12,-1.25,1.27);else ch=false;
    if(ch){e.preventDefault();requestRender();}
  });
  matrix.addEventListener('click',e=>{
    if(!sens)return;
    const r=matrix.getBoundingClientRect();
    const i=clamp(Math.floor((e.clientX-r.left)/r.width*160),0,159),k=clamp(Math.floor((e.clientY-r.top)/r.height*256),0,255);
    selected={key:k,addr:i};
    status.textContent='Valgt: nøkkelbit '+(k+1)+' ↔ adressebit '+(i+1);
    describeSelection();drawMatrix();requestRender();
  });
  measureBtn.addEventListener('click',measure);
  missToggle.querySelector('input').addEventListener('change',e=>{onlyMissing=e.target.checked;requestRender();});
  document.addEventListener('setai:truth',e=>{
    truth=e.detail||null;sens=null;selected=null;
    matrixWrap.hidden=true;readout.textContent='';
    measureBtn.disabled=!truth||measuring;
    measureStatus.textContent=truth?
      'Klar. Trykk for å snu hver av de 256 nøkkelbitene og se hvilke adressebiter som snur.':
      'Måling krever en kjent syntetisk testnøkkel («Test med kjent eksempel»). En ekte nøkkel røres aldri.';
    requestRender();
  });

  const sceneReset=()=>{
    yaw=-.5;pitch=.69;zoom=1.02;panX=0;panY=0;topY=0;separation=65;sideShift=0;
    sepControl.value='65';shiftControl.value='0';
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
  const notes={
    '3d':'3D: roter, zoom og legg adresselaget over nøkkellaget. Grønn kule = bit som stemmer, stiplet tom ring = bit som mangler. Velg en bit og kjør «Mål koblingene» for å se ekte, målte koblinger som gule linjer.',
    '4d':'4D: tid som fjerde akse. Bla mellom lokale tester fra denne økten, og se hvilke bitposisjoner som stemmer gang på gang og hvilke som skifter. Ingenting lagres eller sendes.',
    '5d':'5D: fem målte egenskaper i ett bilde: kolonne, rad, lag, tid (grønne spøkelser bakover) og stabilitet (ringfarge) – pluss målt påvirkning fra valgt bit. Dette er en analysevisning, ikke et fysisk femte rom, og farge betyr likhet, ikke årsak.'
  };
  for(const m of ['3d','4d','5d'])q('holo-mode-'+m).addEventListener('click',()=>{
    mode=m;
    for(const n of ['3d','4d','5d']){
      const b=q('holo-mode-'+n);b.classList.toggle('active',n===m);b.setAttribute('aria-pressed',String(n===m));
    }
    historyPanel.hidden=m!=='4d';
    q('holo-note').textContent=notes[m];
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
  if(typeof ResizeObserver==='function'){new ResizeObserver(()=>resize()).observe(canvas);}
  else window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelAnimationFrame(spinFrame);spinFrame=0;}
    else{resize();if(spinning)spinFrame=requestAnimationFrame(spin);}
  });
  window.addEventListener('pagehide',()=>{
    observer.disconnect();snapshots=[];lastSignature='';snap=null;truth=null;sens=null;selected=null;points.clear();
    cancelAnimationFrame(spinFrame);cancelAnimationFrame(raf);spinning=false;
  });
  collect();resize();
})();
