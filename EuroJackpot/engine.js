(function(root) {
  'use strict';
  const VERSION='1.0.0';
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const sigmoid=x=>1/(1+Math.exp(-x));
  function choose(n,k){ if(k<0||k>n)return 0; let v=1;for(let i=1;i<=k;i++)v=v*(n-i+1)/i;return Math.round(v); }
  const combinations=choose(50,5)*choose(12,2);
  function pool(date){return date<'2014-10-10'?8:date<'2022-03-25'?10:12;}
  function odds(m,s){return choose(5,m)*choose(45,5-m)*choose(2,s)*choose(10,2-s)/combinations;}
  function osloParts(now){
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Oslo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
    return Object.fromEntries(p.map(x=>[x.type,x.value]));
  }
  function nextDates(now=new Date(),results=[]){
    const p=osloParts(now), day=`${p.year}-${p.month}-${p.day}`, known=new Set(results.map(r=>r.date)), out=[];
    let d=new Date(day+'T12:00:00Z');
    for(let i=0;i<15&&out.length<2;i++,d.setUTCDate(d.getUTCDate()+1)){
      const key=d.toISOString().slice(0,10), dow=d.getUTCDay();
      if([2,5].includes(dow)&&!known.has(key))out.push(key);
    }
    return out;
  }
  function deadlineStatus(date,now=new Date()){
    const p=osloParts(now), day=`${p.year}-${p.month}-${p.day}`;
    return day>date||(day===date&&Number(p.hour)>=19)?'Norwegian ticket deadline has passed':'Norwegian ticket deadline: 19:00';
  }
  function validate(rows){
    if(!Array.isArray(rows)||!rows.length)throw Error('The archive is empty.');
    let prev='';
    return rows.map(r=>{
      if(!r||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||r.date<=prev)throw Error('Invalid archive date or ordering.');
      const d=new Date(r.date+'T12:00:00Z');
      if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==r.date||![5,...(r.date>='2022-03-29'?[2]:[])].includes(d.getUTCDay()))throw Error('Invalid draw date.');
      for(const [key,k,n] of [['main',5,50],['stars',2,pool(r.date)]]){
        if(!Array.isArray(r[key])||r[key].length!==k||new Set(r[key]).size!==k||r[key].some(x=>!Number.isInteger(x)||x<1||x>n))throw Error('Invalid archive numbers.');
      }
      prev=r.date;return {date:r.date,main:[...r.main].sort((a,b)=>a-b),stars:[...r.stars].sort((a,b)=>a-b)};
    });
  }
  function state(n,k){return {n,k,counts:Array(n).fill(0),last:Array(n).fill(-1),window:[],t:0};}
  function features(st,i){
    const p=st.k/st.n, w=st.window.length;
    const recent=w?st.window.reduce((a,r)=>a+Number(r.includes(i+1)),0)/w:p;
    const long=(st.counts[i]+30*p)/(st.t+30);
    const gap=st.last[i]<0?Math.min(st.t,1/p):st.t-1-st.last[i];
    return [1,clamp((recent-p)/Math.sqrt(p*(1-p)/Math.max(w,1)),-3,3),clamp((long-p)/Math.sqrt(p*(1-p)/Math.max(st.t+30,1)),-3,3),clamp(gap*p-1,-1,3)];
  }
  function update(st,nums){for(const num of nums){st.counts[num-1]++;st.last[num-1]=st.t;}st.window.push(nums);if(st.window.length>50)st.window.shift();st.t++;}
  function probabilities(st,beta){
    const offset=Math.log((st.k/st.n)/(1-st.k/st.n));
    const raw=Array.from({length:st.n},(_,i)=>{const f=features(st,i);return sigmoid(offset+f.reduce((s,x,j)=>s+x*beta[j],0));});
    // Project expected marginal inclusion counts back onto the fixed draw size.
    let low=-20,high=20;
    for(let t=0;t<45;t++){const mid=(low+high)/2;const sum=raw.reduce((s,p)=>s+sigmoid(Math.log(p/(1-p))+mid),0);if(sum>st.k)high=mid;else low=mid;}
    const offset2=(low+high)/2;
    return raw.map(p=>sigmoid(Math.log(p/(1-p))+offset2));
  }
  function trainStep(st,beta,nums){
    const ps=probabilities(st,beta), grad=Array(4).fill(0);
    for(let i=0;i<st.n;i++){const f=features(st,i), y=Number(nums.includes(i+1));for(let j=0;j<4;j++)grad[j]+=(ps[i]-y)*f[j]/st.n;}
    for(let j=0;j<4;j++)beta[j]=clamp(beta[j]-.035*(grad[j]+.12*beta[j]),-.5,.5);
  }
  function fit(rows){
    const cutoff=Math.floor(rows.length*.8), betaM=Array(4).fill(0), betaS=Array(4).fill(0);
    let m=state(50,5), s=state(pool(rows[0].date),2),test=[];
    for(let i=0;i<rows.length;i++){
      const r=rows[i], n=pool(r.date);
      // The star pool changed twice. Reset that pool's feature history at each change.
      if(s.n!==n)s=state(n,2);
      if(i>=cutoff){
        const pm=probabilities(m,betaM), ps=probabilities(s,betaS);
        const brier=(p,y)=>p.reduce((a,v,j)=>a+(v-Number(y.includes(j+1)))**2,0)/p.length;
        test.push({date:r.date,main:brier(pm,r.main),stars:brier(ps,r.stars),mainBaseline:.09,starsBaseline:(2/n)*(1-2/n)});
      }else if(i>=50){trainStep(m,betaM,r.main);if(s.t>=30)trainStep(s,betaS,r.stars);}
      update(m,r.main);update(s,r.stars);
    }
    const mean=key=>test.reduce((a,r)=>a+r[key],0)/test.length;
    const evaluation={from:test[0]?.date,to:test.at(-1)?.date,count:test.length,trainCount:cutoff,
      main:mean('main'),stars:mean('stars'),mainBaseline:mean('mainBaseline'),starsBaseline:mean('starsBaseline')};
    // Refit on the entire available history only after untouched holdout scoring.
    const fullM=Array(4).fill(0),fullS=Array(4).fill(0);m=state(50,5);s=state(pool(rows[0].date),2);
    for(const r of rows){if(s.n!==pool(r.date))s=state(pool(r.date),2);if(m.t>=50)trainStep(m,fullM,r.main);if(s.t>=30)trainStep(s,fullS,r.stars);update(m,r.main);update(s,r.stars);}
    return {evaluation,main:probabilities(m,fullM),stars:probabilities(s,fullS),coefficients:{main:fullM,stars:fullS}};
  }
  function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function rng(seed){let a=seed;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  function sample(weights,k,random){
    const available=weights.map((w,i)=>({w,i:i+1})),out=[];
    while(out.length<k){let v=random()*available.reduce((a,x)=>a+x.w,0),index=available.length-1;for(let j=0;j<available.length;j++){v-=available[j].w;if(v<0){index=j;break;}}out.push(available.splice(index,1)[0].i);}
    return out.sort((a,b)=>a-b);
  }
  function proposal(rows,date,mode='uniform',variant=0,model){
    const prior=rows.filter(r=>r.date<date);
    if(!prior.length)throw Error('No archive before this date.');
    const n=pool(date);
    const trained=model||fit(prior), random=rng(hash(VERSION+'|'+date+'|'+prior.at(-1).date+'|'+mode+'|'+variant));
    const mw=mode==='model'?trained.main:Array(50).fill(.1);
    const sw=mode==='model'&&trained.stars.length===n?trained.stars:Array(n).fill(2/n);
    return {date,main:sample(mw,5,random),stars:sample(sw,2,random),mode,asOf:prior.at(-1).date,version:VERSION,
      chance:1/(choose(50,5)*choose(n,2))};
  }
  function frequency(rows,key,period='all'){
    let use=period==='all'?rows:rows.slice(-Number(period));
    const n=key==='main'?50:12;
    return Array.from({length:n},(_,i)=>{
      const eligible=use.filter(r=>key==='main'||pool(r.date)>=i+1),count=eligible.filter(r=>r[key].includes(i+1)).length;
      const expected=eligible.reduce((sum,r)=>sum+(key==='main'?.1:2/pool(r.date)),0);
      const last=eligible.filter(r=>r[key].includes(i+1)).at(-1)?.date;
      return {number:i+1,count,eligible:eligible.length,rate:eligible.length?count/eligible.length:0,expected,last};
    });
  }
  const API={VERSION,choose,combinations,odds,pool,nextDates,deadlineStatus,validate,fit,proposal,frequency,rng,sample};
  if(typeof module!=='undefined')module.exports=API;else root.EJ=API;
})(typeof window!=='undefined'?window:globalThis);
