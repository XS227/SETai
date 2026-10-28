(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SetaeiTelemetry=api;})(globalThis,function(){
'use strict';
class ConfirmedCounter{
 constructor(){this.from=0n;this.to=0n;this.displayed=null;this.started=0;this.duration=0;this.stamp=null;this.epoch=null;this.confirmed=null;this.live=false;}
 valueAt(tick){const fraction=this.duration?Math.max(0,Math.min(1,(tick-this.started)/this.duration)):1;const steps=BigInt(Math.floor(fraction*1000000));const value=this.from+(this.to-this.from)*steps/1000000n;this.displayed=value;return value;}
 accept(sample,{fresh,animate,tick}){
  const n=BigInt(sample.attempts),stamp=Date.parse(sample.checkpointUtc),parsedEpoch=Date.parse(sample.startedUtc),epoch=Number.isFinite(parsedEpoch)?parsedEpoch:sample.startedUtc;
  const reset=this.confirmed!==null&&(epoch!==this.epoch||n<this.confirmed);
  const previous=this.displayed===null?null:this.valueAt(tick);
  if(!fresh||!animate||reset){this.from=this.to=n;this.started=tick;this.duration=0;this.displayed=n;this.live=fresh&&animate;}
  else if(!this.live){
   const rows=sample.series||[],latest=rows.at(-1),before=rows.at(-2);let start=n,seconds=0;
   if(latest&&before&&!latest.discontinuity&&String(latest.attempts)===String(n)){
    const dt=(Date.parse(latest.atUtc)-Date.parse(before.atUtc))/1000;
    const candidate=/^\d+$/.test(String(before.attempts))?BigInt(before.attempts):n;
    if(dt>0&&dt<=60&&candidate<=n){start=candidate;seconds=dt;}
   }
   if(previous!==null&&start<previous)start=previous>n?n:previous;
   this.from=start;this.to=n;this.started=tick;this.duration=seconds>0?Math.max(20000,Math.min(30000,seconds*1000)):0;this.live=true;
  }else if(stamp!==this.stamp||n!==this.confirmed){
   const dt=stamp-this.stamp;
   this.from=previous===null?n:previous>n?n:previous;this.to=n;this.started=tick;
   this.duration=dt>0&&dt<=60000?Math.min(30000,Math.max(20000,dt)):0;
  }
  this.stamp=stamp;this.epoch=epoch;this.confirmed=n;
  return this.valueAt(tick);
 }
}
function metrics(observation){
 const histogram=observation.stats.histogram;let samples=0,matched=0,best=0;
 histogram.forEach((n,i)=>{samples+=n;matched+=n*i;if(n)best=i;});
 const bits=observation.targetBits||160,p=2**-bits,n=Number(observation.attempts);
 return {samples,meanBits:samples?matched/samples:null,meanPercent:samples?matched/samples/bits*100:null,bestBits:best,bestPercent:best/bits*100,probability:-Math.expm1(n*Math.log1p(-p)),probabilityPercent:-Math.expm1(n*Math.log1p(-p))*100};
}
return {ConfirmedCounter,metrics};
});
