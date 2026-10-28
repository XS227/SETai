'use strict';
(() => {
  const el=id=>document.getElementById(id);
  const panel=el('process-tool');
  if(!panel)return;
  // d7 = 11010111. Only a public, intentionally insecure 8-bit teaching example.
  const P=BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f');
  const G={x:BigInt('0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'),y:BigInt('0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8')};
  const mod=v=>((v%P)+P)%P;
  function inv(n) {
    let a=mod(n),b=P,u=1n,v=0n;
    while(b!==0n){const q=a/b;[a,b]=[b,a%b];[u,v]=[v,u-q*v];}
    if(a!==1n)throw new Error('Ingen invers');
    return mod(u);
  }
  function double(A) {
    if(!A||A.y===0n)return null;
    const k=mod(3n*A.x*A.x*inv(2n*A.y));
    const x=mod(k*k-2n*A.x);
    return {x,y:mod(k*(A.x-x)-A.y)};
  }
  function add(A,B) {
    if(!A)return B;if(!B)return A;
    if(A.x===B.x)return mod(A.y+B.y)===0n?null:double(A);
    const k=mod((B.y-A.y)*inv(B.x-A.x));
    const x=mod(k*k-A.x-B.x);
    return {x,y:mod(k*(A.x-x)-A.y)};
  }
  const bits='11010111',states=[{scalar:0,point:null}];
  for(let i=0;i<bits.length;i++){
    const prev=states.at(-1),point=add(double(prev.point),bits[i]==='1'?G:null);
    states.push({scalar:2*prev.scalar+Number(bits[i]),point});
  }
  const hex=n=>n.toString(16).padStart(64,'0');
  let step=0;
  const bitButtons=[];
  for(let i=0;i<bits.length;i++){
    const b=document.createElement('button');
    b.className='pbit';b.type='button';
    const digit=document.createElement('strong');digit.textContent=bits[i];
    const position=document.createElement('small');position.textContent='bit '+(i+1);
    b.append(digit,position);
    b.addEventListener('click',()=>{step=i+1;render();});
    el('process-bit-buttons').append(b);bitButtons.push(b);
  }
  const demoKey=hex(215n);
  el('process-2gx').textContent=hex(double(G).x);
  el('process-2gy').textContent=hex(double(G).y);
  el('process-demo-key').textContent='0x'+demoKey;
  try {
    el('process-demo-address').textContent=LocalWalletCrypto.deriveAddress(demoKey);
    el('process-verified').textContent='Adressen er beregnet med den samme Ethereum-kryptografien som nøkkelgeneratoren.';
  } catch(e) {
    el('process-demo-address').textContent='Beregningen er utilgjengelig';
    el('process-verified').textContent='Kunne ikke beregne adressen. Last siden på nytt.';
  }
  function render(){
    const curr=states[step],prev=states[Math.max(0,step-1)];
    const bit=step?bits[step-1]:null;
    bitButtons.forEach((b,i)=>{b.classList.toggle('used',i<step);b.classList.toggle('selected',i===step-1);b.setAttribute('aria-pressed',String(i===step-1));});
    el('process-count').textContent='STEG '+step+' AV 8';
    el('process-fill').style.width=(step/8*100)+'%';
    el('process-previous').textContent=step?prev.scalar+'G':'0G';
    el('process-doubled').textContent=step?(2*prev.scalar)+'G':'0G';
    el('process-added').textContent=step?(bit==='1'?'+ G':'+ 0G'):'—';
    el('process-result').textContent=curr.scalar+'G';
    el('process-equation').textContent=step?('('+prev.scalar+' × 2) + '+bit+' = '+curr.scalar):'Start: 0G';
    const texts=[
      'Vi starter med 0G. Trykk «Neste bit» for å begynne. Vi arbeider fra venstre mot høyre.',
      'Bit 1 = 1. Doble 0G til 0G, og legg til G. Resultatet er G.',
      'Bit 2 = 1. Doble G til 2G, og legg til G. Nå har vi 3G.',
      'Bit 3 = 0. Doble 3G til 6G. Fordi biten er 0, legger vi ikke til G.',
      'Bit 4 = 1. Doble 6G til 12G, legg til G. Nå har vi 13G.',
      'Bit 5 = 0. Doble 13G til 26G. Vi legger ikke til noe.',
      'Bit 6 = 1. Doble 26G til 52G, legg til G. Nå har vi 53G.',
      'Bit 7 = 1. Doble 53G til 106G, legg til G. Nå har vi 107G.',
      'Bit 8 = 1. Doble 107G til 214G, legg til G. Resultatet er 215G.'
    ];
    el('process-text').textContent=texts[step];
    el('process-x').textContent=curr.point?hex(curr.point.x):'Intet endelig punkt ennå';
    el('process-y').textContent=curr.point?hex(curr.point.y):'Intet endelig punkt ennå';
    el('process-previous-button').disabled=step===0;
    el('process-next-button').disabled=step===8;
    el('process-finish').hidden=step!==8;
  }
  el('process-previous-button').addEventListener('click',()=>{if(step>0){step--;render();}});
  el('process-next-button').addEventListener('click',()=>{if(step<8){step++;render();}});
  el('process-restart').addEventListener('click',()=>{step=0;render();});
  render();
})();