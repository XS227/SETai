'use strict';
(() => {
  const $=id=>document.getElementById(id);
  if(!$('reverse-tool'))return;
  // Educational small curve only. DO NOT adapt for real wallets.
  // E: y² = x³ + 7 (mod 9739), point group order 9631 (prime).
  const P=9739,N=9631,G={x:5,y:2479};
  const mod=n=>((n%P)+P)%P;
  function inverse(n) {
    let a=mod(n),b=P,u=1,v=0;
    while(b!==0){const q=Math.floor(a/b);[a,b]=[b,a-q*b];[u,v]=[v,u-q*v];}
    if(a!==1)throw new Error('No inverse');
    return mod(u);
  }
  function add(A,B) {
    if(A===null)return B;
    if(B===null)return A;
    if(A.x===B.x&&(A.y+B.y)%P===0)return null;
    let slope;
    if(A.x===B.x&&A.y===B.y) {
      if(A.y===0)return null;
      slope=mod(3*A.x*A.x*inverse(2*A.y));
    } else {
      slope=mod((B.y-A.y)*inverse(B.x-A.x));
    }
    const x=mod(slope*slope-A.x-B.x);
    return {x,y:mod(slope*(A.x-x)-A.y)};
  }
  function mul(k){let a=null,b=G;while(k>0){if(k%2)a=add(a,b);b=add(b,b);k=Math.floor(k/2);}return a;}
  // Deliberately tiny, non-cryptographic compressed code to show information loss.
  const toyCode=Q=>((113*Q.x+157*Q.y)%256).toString(16).padStart(2,'0');
  const matchPoint=(A,B)=>A!==null&&B!==null&&A.x===B.x&&A.y===B.y;
  let targetK=2026,target=mul(targetK),runId=0,running=false;
  let history=[];
  function resetResult(){
    $('reverse-progress').style.width='0%';
    $('reverse-checked').textContent='0 / 9 630';
    $('reverse-result').textContent='Start en test for å finne den skjulte verdien.';
    $('reverse-result').className='reverse-result';
    $('reverse-trace').replaceChildren();
    $('reverse-hit').textContent='Fasit holdes skjult til søket er ferdig.';
  }
  function setKey(k){
    runId++;running=false;targetK=k;target=mul(k);
    $('reverse-point').textContent='('+target.x+', '+target.y+')';
    $('reverse-toy-address').textContent='0x'+toyCode(target);
    $('reverse-input').value='';
    $('reverse-cancel').disabled=true;
    $('reverse-run-point').disabled=false;
    $('reverse-run-short').disabled=false;
    resetResult();
  }
  function addTrace(k,Q,mode){
    const row=document.createElement('div');row.className='reverse-trace-row';
    const match=mode==='point'?matchPoint(Q,target):toyCode(Q)===toyCode(target);
    row.textContent='k='+String(k).padStart(4,' ')+'  →  ('+Q.x+', '+Q.y+')  '+(match?'✓ treff':'');
    if(match)row.classList.add('found');
    $('reverse-trace').appendChild(row);
    while($('reverse-trace').children.length>8)$('reverse-trace').removeChild($('reverse-trace').firstChild);
  }
  async function run(mode){
    if(running)return;
    running=true;const mine=++runId;const start=performance.now();
    $('reverse-run-point').disabled=true;$('reverse-run-short').disabled=true;
    $('reverse-cancel').disabled=false;
    $('reverse-result').textContent=mode==='point'
      ? 'Tester kandidat 1G, 2G, 3G … mot det offentlige punktet.'
      : 'Tester alle 9 630 nøklene mot den 8-biters demonstrasjonsadressen.';
    $('reverse-result').className='reverse-result';
    $('reverse-trace').replaceChildren();
    let Q=null,k=0,found=[],complete=false;
    while(k<N-1&&!complete&&mine===runId){
      const until=Math.min(k+110,N-1);
      while(k<until){
        k++;Q=add(Q,G);
        const ok=mode==='point'?matchPoint(Q,target):(toyCode(Q)===toyCode(target));
        if(k<6||ok||(k%110===0&&k<800))addTrace(k,Q,mode);
        if(ok){found.push(k);if(mode==='point'){complete=true;break;}}
      }
      $('reverse-progress').style.width=(k/(N-1)*100)+'%';
      $('reverse-checked').textContent=k.toLocaleString('nb-NO')+' / 9 630';
      if(!complete&&k<N-1)await new Promise(resolve=>requestAnimationFrame(resolve));
    }
    if(mine!==runId)return;
    running=false;$('reverse-run-point').disabled=false;$('reverse-run-short').disabled=false;
    $('reverse-cancel').disabled=true;
    const elapsed=(performance.now()-start).toFixed(0);
    if(mode==='point'){
      const passed=found.length===1&&found[0]===targetK;
      $('reverse-result').textContent=passed
       ?'FUNNET! k = '+found[0]+' · '+k.toLocaleString('nb-NO')+' forsøk · '+elapsed+' ms'
       :'Ingen verifisert match; demoen feilet.';
      $('reverse-result').classList.add(passed?'success':'error');
      $('reverse-hit').textContent='Kontroll: '+found[0]+' × G = ('+target.x+', '+target.y+'). Søkingen fant faktisk den skjulte verdien.';
    } else {
      const passed=found.includes(targetK)&&found.length>1;
      $('reverse-result').textContent=(passed?'TREFF, MEN IKKE ENTYDIG: ':'RESULTAT: ')+found.length+' ulike privatnøkler gir samme 8-biters kode · '+elapsed+' ms';
      $('reverse-result').classList.add(passed?'success':'error');
      $('reverse-hit').textContent='Nøkler som matcher: '+found.slice(0,18).join(', ')+(found.length>18?' …':'')+'. Skjult fasit var '+targetK+'. Det offentlige punktet ville skilt kandidatene fra hverandre.';
    }
  }
  $('reverse-random').addEventListener('click',()=>{
    const a=new Uint32Array(1);crypto.getRandomValues(a);setKey(1+(a[0]%(N-1)));
  });
  $('reverse-choose').addEventListener('click',()=>{
    const s=$('reverse-input').value.trim(),k=Number(s);
    if(!/^[0-9]+$/.test(s)||!Number.isInteger(k)||k<1||k>=N){
      $('reverse-result').textContent='Velg et heltall fra 1 til 9 630.';return;
    }
    setKey(k);
  });
  $('reverse-run-point').addEventListener('click',()=>{void run('point');});
  $('reverse-run-short').addEventListener('click',()=>{void run('short');});
  $('reverse-cancel').addEventListener('click',()=>{runId++;running=false;$('reverse-run-point').disabled=false;$('reverse-run-short').disabled=false;$('reverse-cancel').disabled=true;$('reverse-result').textContent='Søk stoppet.';});
  setKey(targetK);
})();
