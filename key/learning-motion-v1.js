'use strict';
(() => {
 const $=id=>document.getElementById(id);
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 let value=13,challenge=null,round=0;
 const weights=[8,4,2,1],switches=[],hexButtons=[];
 function glow(element){
  if(reduce.matches||!element?.animate)return;
  element.animate([{transform:'scale(.94)',opacity:.55},{transform:'scale(1.06)',opacity:1},{transform:'scale(1)',opacity:1}],{duration:420,easing:'ease-out'});
 }
 function drawBits(animate=false){
  const binary=value.toString(2).padStart(4,'0'),hex=value.toString(16).toUpperCase();
  $('play-hex').textContent=hex;$('play-binary').textContent=binary;
  $('play-sum').textContent=weights.filter((w,i)=>binary[i]==='1').join(' + ')+' = '+value;
  if(value===0)$('play-sum').textContent='Ingen biter på = 0';
  switches.forEach((button,i)=>{
   const on=binary[i]==='1';button.classList.toggle('on',on);button.setAttribute('aria-pressed',String(on));
   button.querySelector('strong').textContent=on?'1':'0';button.setAttribute('aria-label','Bit med verdi '+weights[i]+': '+(on?'på':'av'));
  });
  hexButtons.forEach((button,i)=>{button.classList.toggle('on',i===value);button.setAttribute('aria-pressed',String(i===value));});
  if(challenge===null)$('play-feedback').textContent=hex+' = '+value+' = '+binary+'. Endre én bit og se hva som skjer.';
  else if(value===challenge){
   $('play-feedback').textContent='✦ Treff! '+challenge.toString(16).toUpperCase()+' = '+value+' = '+binary+'. Klar for neste utfordring?';
   $('play-feedback').classList.add('solved');if(animate)glow($('play-feedback'));
  }else{
   $('play-feedback').textContent='Utfordring: lag hex '+challenge.toString(16).toUpperCase()+' ved å slå bitene av og på.';
   $('play-feedback').classList.remove('solved');
  }
  if(animate){glow($('play-hex'));glow($('play-binary'));}
 }
 weights.forEach((weight,index)=>{
  const button=document.createElement('button');button.type='button';button.className='bit-switch';
  const small=document.createElement('small');small.textContent='VERDI '+weight;
  const strong=document.createElement('strong');strong.textContent='0';
  const label=document.createElement('span');label.textContent='Klikk for å bytte';
  button.append(small,strong,label);button.addEventListener('click',()=>{value^=weight;drawBits(true);});
  switches.push(button);$('play-bits').append(button);
 });
 for(let i=0;i<16;i++){
  const button=document.createElement('button');button.type='button';button.textContent=i.toString(16).toUpperCase();
  button.addEventListener('click',()=>{value=i;challenge=null;$('play-feedback').classList.remove('solved');drawBits(true);});
  hexButtons.push(button);$('play-hex-bank').append(button);
 }
 $('play-challenge').addEventListener('click',()=>{round++;challenge=(round*7+3)%16;if(challenge===value)challenge=(challenge+1)%16;drawBits();});
 drawBits();
 let playTimer=null,playing=false,flight=null;
 function stopPlay(){
  playing=false;clearTimeout(playTimer);playTimer=null;
  $('process-play').textContent='▶ Spill av';$('process-play').setAttribute('aria-pressed','false');
 }
 function currentStep(){return Number(($('process-count').textContent.match(/STEG (\d+)/)||[])[1]||0);}
 function animateStep(detail){
  const {step,bit,scalar,previous}=detail;
  $('journey-bit').textContent=step?String(bit):'—';
  $('journey-bit-caption').textContent=step?'Bit '+step+' av 8':'Start reisen';
  $('journey-operation').textContent=step?'×2 '+(bit===1?'+G':'+0'):'×2';
  $('journey-operation-caption').textContent=step?previous+'G → '+(2*previous)+'G':'Punktregning på kurven';
  $('journey-point').textContent=scalar+'G';
  $('journey-result-caption').textContent=step===8?'Alle åtte biter er behandlet':'Klar for neste bit';
  $('journey-story').textContent=!step?'Vi starter med 0G. Hver ny bit dobler punktet; en 1-bit legger også til G.':
    step===8?'Ferdig! 11010111 er 215. Punktet er 215G. Se den faktiske offentlige nøkkelen og adressen nedenfor.':
    bit===1?'Biten er 1: vi dobler '+previous+'G og legger til G. Det nye punktet er '+scalar+'G.':
    'Biten er 0: vi dobler '+previous+'G og legger ikke til G. Det nye punktet er '+scalar+'G.';
  flight?.cancel();
  $('journey-token').textContent=step?String(bit):'▶';
  if(step&&!reduce.matches&&!document.hidden&&!$('process-tool').hidden){
   const distance=Math.max(0,$('journey-track').clientWidth-34);
   flight=$('journey-token').animate([
    {transform:'translateX(0)',opacity:1},
    {transform:'translateX('+distance*.48+'px) scale(1.18)',opacity:1,offset:.5},
    {transform:'translateX('+distance+'px)',opacity:1}
   ],{duration:850,easing:'ease-in-out',fill:'forwards'});
   glow($('journey-operation-card'));glow($('journey-result-card'));
  }
  if(step===8)stopPlay();
 }
 document.addEventListener('process-step',event=>animateStep(event.detail));
 function nextFrame(){
  if(!playing||document.hidden||$('process-tool').hidden){stopPlay();return;}
  if(currentStep()>=8){stopPlay();return;}
  $('process-next-button').click();
  if(playing)playTimer=setTimeout(nextFrame,1250);
 }
 $('process-play').addEventListener('click',()=>{
  if(playing){stopPlay();return;}
  if(currentStep()===8)$('process-restart').click();
  playing=true;$('process-play').textContent='Ⅱ Pause';$('process-play').setAttribute('aria-pressed','true');nextFrame();
 });
 for(const id of ['process-previous-button','process-restart']){
  $(id).addEventListener('click',stopPlay);
 }
 new MutationObserver(()=>{if($('process-tool').hidden){stopPlay();flight?.cancel();}}).observe($('process-tool'),{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopPlay();flight?.cancel();}});
 window.addEventListener('pagehide',stopPlay);
 animateStep({step:0,bit:null,scalar:0,previous:0});
})();