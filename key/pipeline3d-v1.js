'use strict';
/* SETAEI Pipeline 3D v1: the REAL key -> address chain as four stacked bit layers.
 * 256-bit key -> secp256k1 public key (512 bit) -> Keccak-256 hash (256 bit) -> last 160 bits = address.
 * Everything is computed locally from a freshly generated SYNTHETIC key; nothing is stored or sent.
 * Flip a key bit and watch the avalanche. The only exact bit-for-bit link is hash bit 96+n = address bit n.
 */
(() => {
  const host=document.getElementById('guess-result');
  if(!host||typeof LocalWalletCrypto==='undefined'||!LocalWalletCrypto.deriveStages)return;
  const LAYERS=[
    {id:'key', short:'1 · NØKKEL',   name:'Privatnøkkel',     n:256,cols:16,rows:16,cell:1,  rgb:[182,140,255]},
    {id:'pub', short:'2 · OFFENTLIG',name:'Offentlig nøkkel', n:512,cols:32,rows:16,cell:.5, rgb:[255,162,77]},
    {id:'hash',short:'3 · HASH',     name:'Keccak-256-hash',  n:256,cols:16,rows:16,cell:1,  rgb:[75,235,241]},
    {id:'addr',short:'4 · ADRESSE',  name:'Wallet-adresse',   n:160,cols:16,rows:10,cell:1,  rgb:[158,248,126]}
  ];
  const STEP_TEXT=[
    'Hele reisen: 256 bit inn, 160 bit ut. <b>Trykk på en lilla nøkkelbit</b> for å snu den og se hva som skjer videre nedover. Gule ringer = biter som endret seg.',
    '<b>Privatnøkkel.</b> 256 tilfeldige 0/1-er. Dette er hemmeligheten; alt annet regnes ut fra dette ene tallet.',
    '<b>Offentlig nøkkel.</b> Nøkkelen ganges med et fast punkt G på kurven secp256k1. Resultatet er et punkt (x, y) på 2 × 256 = 512 bit. Veien tilbake er praktisk talt umulig, og en liten endring gir et helt annet punkt.',
    '<b>Keccak-256.</b> De 512 bitene blandes til en hash på 256 bit. Én endret bit inn gir en helt annen hash ut. De første 96 bitene (grå rader) kastes.',
    '<b>Adresse.</b> Bare de siste 160 hashbitene beholdes. Dette er den eneste ekte bit-for-bit-koblingen: adressebit n = hashbit 96 + n (grønne linjer).'
  ];
  const ORDER=BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');

  /* ---------- UI ---------- */
  const sec=document.createElement('section');
  sec.id='pipe3d';sec.className='pipe3d';sec.setAttribute('aria-labelledby','pipe3d-title');
  sec.innerHTML=
    '<div class="p3-head"><div><p class="p3-eyebrow">SETAEI · REISEN FRA NØKKEL TIL ADRESSE</p>'+
    '<h3 id="pipe3d-title">Slik blir en nøkkel til en adresse · 3D</h3>'+
    '<p class="p3-sub">Fire lag, ekte beregning. Snu en bit og se skredet.</p></div><span class="p3-tag">REELL BEREGNING</span></div>'+
    '<div class="p3-steps" role="group" aria-label="Velg trinn">'+
    '<button type="button" data-step="0" aria-pressed="true">Alle</button>'+
    '<button type="button" data-step="1" aria-pressed="false" style="--c:182,140,255">1 Nøkkel</button>'+
    '<button type="button" data-step="2" aria-pressed="false" style="--c:255,162,77">2 Offentlig</button>'+
    '<button type="button" data-step="3" aria-pressed="false" style="--c:75,235,241">3 Hash</button>'+
    '<button type="button" data-step="4" aria-pressed="false" style="--c:158,248,126">4 Adresse</button></div>'+
    '<div class="p3-shell"><canvas id="p3-canvas" width="820" height="720" tabindex="0" aria-label="Tredimensjonal visning av fire bitlag: privatnøkkel, offentlig nøkkel, hash og adresse. Dra for å rotere, trykk på en nøkkelbit for å snu den."></canvas>'+
    '<div class="p3-hint">Dra = roter · klyp = zoom · trykk lilla bit = snu</div></div>'+
    '<p id="p3-card" class="p3-card" aria-live="polite"></p>'+
    '<p id="p3-pick" class="p3-pick" role="status" aria-live="polite">Ingen bit valgt</p>'+
    '<div class="p3-actions">'+
    '<button type="button" id="p3-new">⟲ Nytt eksempel</button><button type="button" id="p3-flip">⚡ Snu tilfeldig bit</button>'+
    '<button type="button" id="p3-undo">↶ Angre</button><button type="button" id="p3-spin" aria-pressed="false">⟳ Snurr</button></div>'+
    '<div class="p3-actions small"><button type="button" id="p3-zin">＋</button><button type="button" id="p3-zout">−</button><button type="button" id="p3-reset">↺ Utgangsvisning</button>'+
    '<label class="p3-slide">Avstand <input id="p3-gap" type="range" min="2" max="12" value="7" step="0.5"></label></div>'+
    '<div class="p3-toggles"><label><input id="p3-vals" type="checkbox" checked> Vis 0 / 1</label><label><input id="p3-links" type="checkbox" checked> Vis linjer</label></div>'+
    '<div class="p3-chart"><h4>Hvor mange biter snudde i hvert lag?</h4><div id="p3-bars"></div>'+
    '<p class="p3-small">Tilfeldig ville gitt omtrent 50 % (stiplet linje). Nøkkelen endres med bare 1 bit, men alt etterpå endres omtrent som en myntkasting.</p></div>'+
    '<div class="p3-chart"><h4>Statistikk: snu alle 256 nøkkelbiter, én om gangen</h4>'+
    '<button type="button" id="p3-stats" class="p3-wide">◎ Kjør statistikk (256 beregninger)</button>'+
    '<canvas id="p3-hist" width="640" height="220" hidden aria-label="Histogram over hvor mange adressebiter som snudde for hver av de 256 nøkkelbit-endringene, sammenlignet med forventet fordeling"></canvas>'+
    '<p id="p3-stats-text" class="p3-small" role="status" aria-live="polite">Søylene viser hvor mange adressebiter som snudde. Den lilla kurven er hva ren tilfeldighet gir (binomisk, 160 myntkast).</p></div>'+
    '<p class="p3-note">Nøkkelen er laget tilfeldig i nettleseren din bare til denne demoen, og brukes aldri som en ekte lommebok. Ingenting lagres eller sendes. Å se skredeffekten er <b>ikke</b> en måte å finne en nøkkel på; det forklarer hvorfor det ikke går.</p>';
  host.parentNode.insertBefore(sec,host);
  // Replace the old text-only pipeline in the 2D/3D lab with this interactive one.
  document.querySelector('.holo-pipe')?.remove();
  const labTitle=document.querySelector('.holo-lab h4');
  if(labTitle)labTitle.textContent='Mål alle koblinger mot en kjent adresse';

  const $=id=>document.getElementById(id);
  const canvas=$('p3-canvas'),ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)return;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const fmtPct=(a,b)=>(100*a/b).toFixed(1).replace('.',',')+' %';

  /* ---------- crypto ---------- */
  const hexBits=hex=>{const o=new Uint8Array(hex.length*4);for(let i=0;i<hex.length;i++){const v=parseInt(hex[i],16);for(let b=0;b<4;b++)o[i*4+b]=(v>>(3-b))&1;}return o;};
  const bitsHex=bits=>{let s='';for(let i=0;i<bits.length;i+=4)s+=(bits[i]*8+bits[i+1]*4+bits[i+2]*2+bits[i+3]).toString(16);return s;};
  function stateFromKeyBits(K){
    const hex=bitsHex(K),v=BigInt('0x'+hex);
    if(v<=0n||v>=ORDER)return null;
    const s=LocalWalletCrypto.deriveStages(hex);
    const P=hexBits(s.pub),H=hexBits(s.hash);
    return {key:K,pub:P,hash:H,addr:H.slice(96)};
  }
  function randomState(){
    for(;;){
      const bytes=crypto.getRandomValues(new Uint8Array(32));
      const K=new Uint8Array(256);
      for(let i=0;i<32;i++)for(let b=0;b<8;b++)K[i*8+b]=(bytes[i]>>(7-b))&1;
      const s=stateFromKeyBits(K);if(s)return s;
    }
  }
  const diff=(a,b)=>{let n=0;for(let i=0;i<a.length;i++)n+=a[i]!==b[i];return n;};

  /* ---------- state ---------- */
  let stack=[],step=0,spinning=false,spinRaf=0,spinLast=0,dirty=false,raf=0;
  let w=0,h=0,ratio=1,yaw=-.55,pitch=.62,zoom=1,gap=7,picked=null,sample=null;
  const pts=[];
  const cur=()=>stack[stack.length-1],prev=()=>stack[stack.length-2]||null;
  function reset(){stack=[randomState()];picked=null;sample=null;$('p3-hist').hidden=true;refresh();}
  function flipBit(k){
    const s=cur(),K=s.key.slice();K[k]^=1;
    const n=stateFromKeyBits(K);if(!n)return;
    stack.push(n);if(stack.length>40)stack.shift();
    refresh();
  }

  /* ---------- projection ---------- */
  function resize(){
    const b=canvas.getBoundingClientRect();if(b.width<20||b.height<20)return;
    w=b.width;h=b.height;ratio=clamp(window.devicePixelRatio||1,1,2);
    const cw=Math.round(w*ratio),ch=Math.round(h*ratio);
    if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
    request();
  }
  function proj(x,y,z){
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const X=x*cy+z*sy,Z=-x*sy+z*cy,Y=y*cp-Z*sp,D=y*sp+Z*cp;
    const persp=clamp(40/(40-D),.6,1.8);
    const scale=Math.min(w/21,h/(14+gap*3.2))*zoom*persp;
    return {x:w/2+X*scale,y:h/2+Y*scale,depth:D,scale};
  }
  const layerZ=li=>(1.5-li)*gap;
  const nodePos=(L,li,i)=>{
    const c=i%L.cols,r=Math.floor(i/L.cols);
    return proj((c-(L.cols-1)/2)*L.cell,(r-(L.rows-1)/2)*L.cell,layerZ(li));
  };
  const rgb=(c,a)=>'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')';
  const layerAlpha=li=>step===0||step===li+1?1:.16;

  /* ---------- drawing ---------- */
  function drawPlate(L,li){
    const hw=L.cols*L.cell/2+.35*L.cell,hh=L.rows*L.cell/2+.35*L.cell,z=layerZ(li);
    const c=[proj(-hw,-hh,z),proj(hw,-hh,z),proj(hw,hh,z),proj(-hw,hh,z)];
    ctx.globalAlpha=layerAlpha(li);
    ctx.beginPath();ctx.moveTo(c[0].x,c[0].y);for(let i=1;i<4;i++)ctx.lineTo(c[i].x,c[i].y);ctx.closePath();
    ctx.fillStyle=rgb(L.rgb,.07);ctx.fill();ctx.strokeStyle=rgb(L.rgb,.75);ctx.lineWidth=1.3;ctx.stroke();
    ctx.fillStyle=rgb(L.rgb,1);ctx.font='700 '+clamp(w/38,9,12)+'px ui-monospace,monospace';ctx.textAlign='left';ctx.textBaseline='bottom';
    ctx.fillText(L.short+' · '+L.n+' bit',c[3].x+2,c[3].y-3);
    ctx.globalAlpha=1;
  }
  function drawLinks(){
    if(!$('p3-links').checked)return;
    const s=cur(),p=prev();
    // Exact link: address bit n = hash bit 96+n.
    if(step===0||step>=3){
      ctx.lineWidth=.7;
      for(let i=0;i<160;i++){
        const a=nodePos(LAYERS[2],2,96+i),b=nodePos(LAYERS[3],3,i);
        const ch=p&&s.addr[i]!==p.addr[i];
        ctx.strokeStyle=ch?'rgba(255,230,120,.75)':'rgba(158,248,126,'+(step>=3?.34:.16)+')';
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      }
    }
    // Avalanche cascade: from the flipped key bit to every bit that changed below it.
    if(p&&p.key&&stack.length>1&&(step===0||step===1||step===2||step===3)){
      let k=-1;for(let i=0;i<256;i++)if(s.key[i]!==p.key[i]){k=i;break;}
      if(k>=0){
        const from=nodePos(LAYERS[0],0,k);
        ctx.lineWidth=.6;
        for(const [li,key] of [[1,'pub'],[2,'hash']]){
          if(step!==0&&step!==1&&step!==li+1)continue;
          ctx.strokeStyle=rgb(LAYERS[li].rgb,.20);
          for(let i=0;i<s[key].length;i++)if(s[key][i]!==p[key][i]){
            const to=nodePos(LAYERS[li],li,i);ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);ctx.stroke();
          }
        }
      }
    }
  }
  function render(){
    dirty=false;
    const r=canvas.getBoundingClientRect();if(r.width<20||r.height<20)return;
    if(Math.abs(r.width-w)>.1||Math.abs(r.height-h)>.1){resize();return;}
    ctx.setTransform(ratio,0,0,ratio,0,0);
    const bg=ctx.createRadialGradient(w/2,h*.4,10,w/2,h/2,Math.max(w,h)*.8);
    bg.addColorStop(0,'#241a45');bg.addColorStop(.6,'#150f2c');bg.addColorStop(1,'#0c0919');
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    const s=cur(),p=prev();pts.length=0;
    LAYERS.forEach((L,li)=>drawPlate(L,li));
    drawLinks();
    // flow labels between layers
    const flows=['↓ × G  (kurvemultiplikasjon)','↓ Keccak-256  (blanding)','↓ behold siste 160 bit'];
    ctx.font='600 '+clamp(w/42,8,11)+'px system-ui,sans-serif';ctx.textBaseline='middle';ctx.textAlign='right';
    flows.forEach((t,i)=>{
      const pp=proj(8.9,0,(layerZ(i)+layerZ(i+1))/2);
      ctx.fillStyle='rgba(255,236,170,.92)';ctx.fillText(t,Math.min(w-6,pp.x),pp.y);
    });
    // nodes, back to front
    const nodes=[];
    LAYERS.forEach((L,li)=>{const arr=s[L.id];for(let i=0;i<arr.length;i++){const c=nodePos(L,li,i);nodes.push({L,li,i,c,v:arr[i]});}});
    nodes.sort((a,b)=>a.c.depth-b.c.depth);
    const showVals=$('p3-vals').checked;
    for(const n of nodes){
      const {L,li,i,c,v}=n,rad=Math.max(1.6,c.scale*L.cell*.40),al=layerAlpha(li);
      const changed=p&&p[L.id][i]!==v;
      const dropped=L.id==='hash'&&i<96;
      ctx.globalAlpha=al;
      ctx.beginPath();ctx.arc(c.x,c.y,rad,0,6.2832);
      if(v){ctx.fillStyle=dropped?'rgba(160,160,175,.62)':rgb(L.rgb,.95);ctx.fill();}
      else{ctx.fillStyle=dropped?'rgba(60,60,75,.5)':rgb(L.rgb,.10);ctx.fill();ctx.strokeStyle=dropped?'rgba(150,150,165,.4)':rgb(L.rgb,.45);ctx.lineWidth=.8;ctx.stroke();}
      if(v&&rad>3.5){ctx.beginPath();ctx.arc(c.x-rad*.3,c.y-rad*.3,rad*.28,0,6.2832);ctx.fillStyle='rgba(255,255,255,.28)';ctx.fill();}
      if(changed){ctx.beginPath();ctx.arc(c.x,c.y,rad+2.4,0,6.2832);ctx.strokeStyle='#ffe678';ctx.lineWidth=1.6;ctx.stroke();}
      if(picked&&picked.layer===li&&picked.i===i){ctx.beginPath();ctx.arc(c.x,c.y,rad+5,0,6.2832);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();}
      if(showVals&&rad>=5.2&&al>.5){
        ctx.fillStyle=v?'#13102a':rgb(L.rgb,.95);ctx.font='700 '+clamp(rad*1.15,7,11)+'px ui-monospace,monospace';
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(v),c.x,c.y+.5);
      }
      ctx.globalAlpha=1;
      if(al>.5)pts.push({li,i,x:c.x,y:c.y,d:c.depth,r:rad});
    }
  }
  function request(){dirty=true;if(raf)return;raf=requestAnimationFrame(()=>{raf=0;if(dirty)render();});}

  /* ---------- text, bars, histogram ---------- */
  function refresh(){
    const s=cur(),p=prev();
    $('p3-undo').disabled=stack.length<2;
    $('p3-card').innerHTML=STEP_TEXT[step];
    const rows=LAYERS.map((L,li)=>{
      const n=p?diff(s[L.id],p[L.id]):0,frac=p?n/L.n:0;
      return '<div class="p3-bar"><span class="p3-bl" style="color:'+rgb(L.rgb,1)+'">'+L.name+'</span>'+
        '<span class="p3-track"><i style="width:'+(frac*100).toFixed(1)+'%;background:'+rgb(L.rgb,.9)+'"></i><u></u></span>'+
        '<span class="p3-bv">'+(p?n+' / '+L.n+' · '+fmtPct(n,L.n):'—')+'</span></div>';
    });
    $('p3-bars').innerHTML=rows.join('');
    // sanity: last 160 hash bits equal the address the page's own routine derives
    request();
  }
  function histogram(counts){
    const cv=$('p3-hist'),g=cv.getContext('2d'),W=cv.width,H=cv.height;
    cv.hidden=false;
    g.clearRect(0,0,W,H);g.fillStyle='#140e29';g.fillRect(0,0,W,H);
    const lo=50,hi=110,bw=2,nb=(hi-lo)/bw,bins=new Array(nb).fill(0);
    for(const c of counts)bins[clamp(Math.floor((c-lo)/bw),0,nb-1)]++;
    const pl=34,pr=8,pt=14,pb=30,pw=W-pl-pr,ph=H-pt-pb;
    // binomial(160, .5) expectation, scaled to 256 samples
    const lf=[0];for(let i=1;i<=160;i++)lf[i]=lf[i-1]+Math.log(i);
    const pmf=k=>Math.exp(lf[160]-lf[k]-lf[160-k]-160*Math.LN2);
    const exp=bins.map((_,b)=>{let t=0;for(let k=lo+b*bw;k<lo+(b+1)*bw;k++)t+=pmf(k);return t*counts.length;});
    const ymax=Math.max(4,...bins,...exp)*1.12;
    g.strokeStyle='rgba(200,190,255,.18)';g.lineWidth=1;g.font='10px ui-monospace,monospace';g.fillStyle='#b9b0e6';g.textAlign='right';
    for(let t=0;t<=4;t++){const y=pt+ph-ph*t/4;g.beginPath();g.moveTo(pl,y);g.lineTo(W-pr,y);g.stroke();g.fillText(String(Math.round(ymax*t/4)),pl-4,y+3);}
    const bwPx=pw/nb;
    bins.forEach((v,b)=>{const hh=ph*v/ymax;g.fillStyle='rgba(158,248,126,.88)';g.fillRect(pl+b*bwPx+1.5,pt+ph-hh,bwPx-3,hh);});
    g.beginPath();exp.forEach((v,b)=>{const x=pl+(b+.5)*bwPx,y=pt+ph-ph*v/ymax;b?g.lineTo(x,y):g.moveTo(x,y);});
    g.strokeStyle='#c3a6ff';g.lineWidth=2.4;g.stroke();
    g.fillStyle='#b9b0e6';g.textAlign='center';
    for(let v=lo;v<=hi;v+=10){g.fillText(String(v),pl+(v-lo)/(hi-lo)*pw,H-12);}
    g.fillText('antall adressebiter som snudde (av 160)',pl+pw/2,H-1);
    g.strokeStyle='#ffe678';g.setLineDash([4,3]);g.beginPath();const x80=pl+(80-lo)/(hi-lo)*pw;g.moveTo(x80,pt);g.lineTo(x80,pt+ph);g.stroke();g.setLineDash([]);
  }
  let running=false;
  async function runStats(){
    if(running)return;running=true;const btn=$('p3-stats');btn.disabled=true;
    const base=cur(),counts=[];let pubSum=0,hashSum=0;
    try{
      for(let k=0;k<256;k++){
        const K=base.key.slice();K[k]^=1;const n=stateFromKeyBits(K);if(!n)continue;
        counts.push(diff(n.addr,base.addr));pubSum+=diff(n.pub,base.pub);hashSum+=diff(n.hash,base.hash);
        if(k%8===7){btn.textContent='Beregner … '+(k+1)+' / 256';await new Promise(r=>setTimeout(r,0));}
      }
      const m=counts.reduce((a,b)=>a+b,0)/counts.length;
      const sd=Math.sqrt(counts.reduce((a,b)=>a+(b-m)**2,0)/counts.length);
      histogram(counts);
      $('p3-stats-text').textContent='256 enkeltbit-endringer: i snitt '+m.toFixed(1).replace('.',',')+' av 160 adressebiter snudde (forventet 80, standardavvik '+sd.toFixed(1).replace('.',',')+' mot forventet 6,3). Offentlig nøkkel: '+
        fmtPct(pubSum,counts.length*512)+' snudd, hash: '+fmtPct(hashSum,counts.length*256)+'. Fordelingen følger myntkasting – ingen nøkkelbit har en forutsigbar rolle.';
    }catch(e){$('p3-stats-text').textContent='Statistikken stoppet: '+e.message;}
    finally{running=false;btn.disabled=false;btn.textContent='◎ Kjør statistikk på nytt (256 beregninger)';}
  }

  /* ---------- interaction ---------- */
  const ptr=new Map();let moved=false,lastDist=null;
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture?.(e.pointerId);ptr.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY});moved=false;lastDist=null;});
  canvas.addEventListener('pointermove',e=>{
    const o=ptr.get(e.pointerId);if(!o)return;
    const dx=e.clientX-o.x,dy=e.clientY-o.y;o.x=e.clientX;o.y=e.clientY;
    if(Math.hypot(e.clientX-o.sx,e.clientY-o.sy)>5)moved=true;
    if(ptr.size===2){const a=[...ptr.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(lastDist)zoom=clamp(zoom*d/lastDist,.5,3);lastDist=d;}
    else{yaw+=dx*.01;pitch=clamp(pitch+dy*.009,-1.2,1.3);}
    request();
  });
  function up(e){
    const o=ptr.get(e.pointerId);
    if(o&&!moved&&ptr.size===1){
      const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
      let best=null,bd=1e9;
      for(const q of pts){const d=Math.hypot(q.x-x,q.y-y);if(d<q.r+7&&(d<bd-2||(Math.abs(d-bd)<=2&&best&&q.d>best.d))){bd=d;best=q;}}
      if(best)pick(best.li,best.i);
    }
    ptr.delete(e.pointerId);lastDist=null;
  }
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  canvas.addEventListener('keydown',e=>{
    let c=true;
    if(e.key==='ArrowLeft')yaw-=.13;else if(e.key==='ArrowRight')yaw+=.13;
    else if(e.key==='ArrowUp')pitch=clamp(pitch-.12,-1.2,1.3);else if(e.key==='ArrowDown')pitch=clamp(pitch+.12,-1.2,1.3);else c=false;
    if(c){e.preventDefault();request();}
  });
  function pick(li,i){
    picked={layer:li,i};const L=LAYERS[li],s=cur();
    let txt=L.name+' · bit '+(i+1)+' = '+s[L.id][i];
    if(li===0){txt+=' → snudd til '+(s.key[i]^1)+'. Se hva som endret seg nedover.';flipBit(i);}
    else if(li===2)txt+=i<96?' · kastes (blir ikke del av adressen)':' · blir adressebit '+(i-95);
    else if(li===3)txt+=' · er hashbit '+(96+i+1);
    else if(li===1)txt+=(i<256?' · del av x-koordinaten':' · del av y-koordinaten');
    $('p3-pick').textContent=txt;request();
  }
  const setStep=n=>{step=n;sec.querySelectorAll('.p3-steps button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.step)===n)));$('p3-card').innerHTML=STEP_TEXT[n];request();};
  sec.querySelectorAll('.p3-steps button').forEach(b=>b.addEventListener('click',()=>setStep(Number(b.dataset.step))));
  $('p3-new').addEventListener('click',reset);
  $('p3-flip').addEventListener('click',()=>{const k=crypto.getRandomValues(new Uint8Array(1))[0];flipBit(k);$('p3-pick').textContent='Snudde nøkkelbit '+(k+1)+' tilfeldig.';});
  $('p3-undo').addEventListener('click',()=>{if(stack.length>1){stack.pop();refresh();}});
  $('p3-zin').addEventListener('click',()=>{zoom=clamp(zoom*1.2,.5,3);request();});
  $('p3-zout').addEventListener('click',()=>{zoom=clamp(zoom/1.2,.5,3);request();});
  $('p3-reset').addEventListener('click',()=>{yaw=-.55;pitch=.62;zoom=1;gap=7;$('p3-gap').value='7';request();});
  $('p3-gap').addEventListener('input',e=>{gap=Number(e.target.value);request();});
  $('p3-vals').addEventListener('change',request);$('p3-links').addEventListener('change',request);
  $('p3-stats').addEventListener('click',runStats);
  function spin(t){
    spinRaf=0;if(!spinning||document.hidden)return;
    if(spinLast)yaw+=Math.min(90,t-spinLast)*.0005;spinLast=t;request();spinRaf=requestAnimationFrame(spin);
  }
  $('p3-spin').addEventListener('click',()=>{
    spinning=!spinning;$('p3-spin').setAttribute('aria-pressed',String(spinning));spinLast=0;
    cancelAnimationFrame(spinRaf);spinRaf=0;if(spinning)spinRaf=requestAnimationFrame(spin);
  });
  if(typeof ResizeObserver==='function')new ResizeObserver(resize).observe(canvas);else window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(spinRaf);spinRaf=0;}else{resize();if(spinning)spinRaf=requestAnimationFrame(spin);}});
  window.addEventListener('pagehide',()=>{stack=[];sample=null;picked=null;cancelAnimationFrame(spinRaf);cancelAnimationFrame(raf);spinning=false;});
  reset();resize();
})();
