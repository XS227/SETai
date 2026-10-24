/* Stenhuset showroom: procedural, seamlessly tiling PBR textures (albedo, normal, roughness).
 * Pure JS, no DOM: usable in a Worker, in the page, or in Node for testing.
 * Each stone is laid out as real tiles (formats in metres) with joints, tumbled edges, pores,
 * veining (marble), glaze (zellige) and firing speckle (terracotta) over a texture that covers T metres. */
export const T=1.8;

export const STONES={
  'bastide-beige':{kind:'limestone',c0:[222,205,176],c1:[186,162,128],joint:[205,196,180],rowH:.3,widths:[.3,.45,.6,.9],jw:.0032,bevel:.010,jitter:.006,rough:.76,bump:2.4,seed:11},
  'bastide-grey': {kind:'limestone',c0:[176,175,164],c1:[126,128,121],joint:[190,187,176],rowH:.3,widths:[.3,.45,.6,.9],jw:.0032,bevel:.010,jitter:.006,rough:.78,bump:2.6,seed:23},
  'provence-beige':{kind:'limestone',c0:[232,218,190],c1:[203,180,144],joint:[214,205,189],rowH:.45,widths:[.45,.6,.9],jw:.0028,bevel:.008,jitter:.005,rough:.72,bump:1.8,seed:37},
  'provence-grey':{kind:'limestone',c0:[184,186,180],c1:[135,140,137],joint:[196,195,187],rowH:.45,widths:[.45,.6,.9],jw:.0028,bevel:.008,jitter:.005,rough:.74,bump:2.0,seed:41},
  'carrara-c':{kind:'marble',c0:[236,234,229],vein:[132,134,140],th:[.958,.968],rowH:.9,widths:[.6],joint:[210,206,198],jw:.0013,bevel:.0016,jitter:.0003,rough:.26,bump:.5,seed:53,patch:null},
  'calacatta-viola':{kind:'marble',c0:[240,231,222],vein:[108,76,82],th:[.915,.955],rowH:.9,widths:[.6],joint:[214,206,196],jw:.0013,bevel:.0016,jitter:.0003,rough:.24,bump:.5,seed:67,patch:[214,188,170]},
  'zellige':{kind:'zellige',c0:[137,163,148],c1:[162,186,172],joint:[206,202,190],rowH:.1,widths:[.1],jw:.0022,bevel:.004,jitter:.0035,rough:.10,bump:3.2,seed:79},
  'terracotta':{kind:'terracotta',c0:[190,108,76],c1:[160,82,56],joint:[188,176,156],rowH:.3,widths:[.3],jw:.0035,bevel:.008,jitter:.005,rough:.78,bump:1.9,seed:97},
  'kalkpuss-hvit':{kind:'plaster',c0:[236,231,221],c1:[222,215,203],rough:.93,bump:1.2,seed:101},
  'leirpuss':{kind:'plaster',c0:[208,188,164],c1:[190,167,142],rough:.93,bump:1.3,seed:113}
};

const clamp01=x=>x<0?0:x>1?1:x;
const smooth=(a,b,x)=>{x=(x-a)/(b-a);x=x<0?0:x>1?1:x;return x*x*(3-2*x);};
function hashf(a,b,s){let h=Math.imul(a,374761393)^Math.imul(b,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
function makeNoise(seed){
  const n=(x,y,px,py=px)=>{
    const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
    const x0=((xi%px)+px)%px,x1=(x0+1)%px,y0=((yi%py)+py)%py,y1=(y0+1)%py;
    const a=hashf(x0,y0,seed),b=hashf(x1,y0,seed),c=hashf(x0,y1,seed),d=hashf(x1,y1,seed);
    return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
  };
  const fbmA=(u,v,oct,pu,pv)=>{let s=0,amp=.5,tot=0;for(let o=0;o<oct;o++){s+=amp*n(u*pu,v*pv,pu,pv);tot+=amp;amp*=.5;pu*=2;pv*=2;}return s/tot;};
  const fbm=(u,v,oct,per)=>fbmA(u,v,oct,per,per);
  // Round pores/specks: one random dot per grid cell (periodic), value 0..1 (1 = centre of a dot).
  const speck=(u,v,G,thr,rad)=>{
    const gx=u*G,gy=v*G,ix=Math.floor(gx),iy=Math.floor(gy),a=((ix%G)+G)%G,b=((iy%G)+G)%G;
    if(hashf(a,b,seed+5)<thr)return 0;
    const cx=.25+.5*hashf(a,b,seed+6),cy=.25+.5*hashf(a,b,seed+7),d=Math.hypot(gx-ix-cx,gy-iy-cy);
    const r=rad*(.55+.9*hashf(a,b,seed+8));
    return d>=r?0:1-d/r;
  };
  return {n,fbm,fbmA,speck};
}
function makeLayout(m){
  let s=m.seed*7919+1;const rnd=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
  const rows=Math.max(1,Math.round(T/m.rowH)),segs=[];
  for(let r=0;r<rows;r++){
    const arr=[0];let x=0;
    while(x<T-1e-6){
      const rem=T-x,opts=m.widths.filter(w=>w<=rem+1e-6);
      let w=opts[Math.floor(rnd()*opts.length)]||rem;
      if(rem-w<m.widths[0]-1e-6)w=rem;
      x+=w;arr.push(Math.min(x,T));
    }
    segs.push(arr);
  }
  return {rows,segs};
}

/* Laid patterns for the shop's tiles, all periodic over T (sizes are rounded so a whole number fits):
 * 'grid' (straight, running bond with bond:true, two-colour chess with chess:true), 'diag' (chess turned 45°),
 * 'octagon' (ottagono / cassettone: octagons with a small insert where four meet), 'hex', 'basket' (basket weave,
 * small dots with dots:true). A cell function fills o with tid, local position, size, edge distance and alt (2nd colour). */
function makeCells(m){
  const fit=(s,even)=>{let k=Math.max(1,Math.round(T/s));if(even&&k%2)k++;return T/k;};
  const p=m.pattern;
  if(p==='grid'){
    const tw=fit(m.tw||.3,m.chess),th=fit(m.th2||m.tw||.3,m.chess||m.bond),cols=Math.round(T/tw),rows=Math.round(T/th);
    return (X,Y,o)=>{
      const r=Math.min(rows-1,Math.floor(Y/th));let x=X;if(m.bond&&(r&1))x=(X+tw/2)%T;
      const c=Math.min(cols-1,Math.floor(x/tw));
      o.lx=x-c*tw;o.ly=Y-r*th;o.w=tw;o.h=th;o.tid=r*cols+c+1;o.alt=!!m.chess&&((r+c)&1)===1;
      o.dE=Math.min(o.lx,tw-o.lx,o.ly,th-o.ly);
    };
  }
  if(p==='diag'){
    const s=fit(m.tw||.2,true),k=Math.round(T/s);
    return (X,Y,o)=>{
      const a=X+Y,b=X-Y+T*4,ia=Math.floor(a/s),ib=Math.floor(b/s),fa=a-ia*s,fb=b-ib*s;
      o.lx=fa/Math.SQRT2;o.ly=fb/Math.SQRT2;o.w=o.h=s/Math.SQRT2;
      o.tid=(ia%k)*k+(ib%k)+1;o.alt=((ia+ib)&1)===1;o.dE=Math.min(fa,s-fa,fb,s-fb)/Math.SQRT2;
    };
  }
  if(p==='octagon'){
    const tw=fit(m.tw||.3),n=Math.round(T/tw),c=tw*(m.insert||.29);
    return (X,Y,o)=>{
      const ci=Math.min(n-1,Math.floor(X/tw)),ri=Math.min(n-1,Math.floor(Y/tw)),lx=X-ci*tw,ly=Y-ri*tw;
      const dx=Math.min(lx,tw-lx),dy=Math.min(ly,tw-ly),k=dx+dy;
      if(k<c){
        const vx=(ci+(lx>tw/2?1:0))%n,vy=(ri+(ly>tw/2?1:0))%n;
        o.tid=100000+vy*n+vx;o.alt=true;o.dE=(c-k)/Math.SQRT2;o.lx=dx;o.ly=dy;o.w=o.h=c;
      }else{o.tid=ri*n+ci+1;o.alt=false;o.lx=lx;o.ly=ly;o.w=o.h=tw;o.dE=Math.min(dx,dy,(k-c)/Math.SQRT2);}
    };
  }
  if(p==='frame'){
    // cassettone: squares (inner share of the cell) framed by strips in the second stone, small square where strips cross
    const S=fit(m.tw||.4),n=Math.round(T/S),q=S*(m.inner||.75);
    return (X,Y,o)=>{
      const ci=Math.min(n-1,Math.floor(X/S)),ri=Math.min(n-1,Math.floor(Y/S)),lx=X-ci*S,ly=Y-ri*S;
      if(lx<q&&ly<q){o.tid=ri*n+ci+1;o.alt=false;o.lx=lx;o.ly=ly;o.w=o.h=q;o.dE=Math.min(lx,q-lx,ly,q-ly);return;}
      const a=lx>=q,b=ly>=q,x0=a?q:0,x1=a?S:q,y0=b?q:0,y1=b?S:q;
      o.alt=true;o.tid=100000+(ri*n+ci)*3+(a&&b?2:a?1:0);o.lx=lx-x0;o.ly=ly-y0;o.w=x1-x0;o.h=y1-y0;
      o.dE=Math.min(lx-x0,x1-lx,ly-y0,y1-ly);
    };
  }
  if(p==='hex'){
    const r0=(m.tw||.2)/2,cols=Math.max(1,Math.round(T/(Math.sqrt(3)*r0))),rows=2*Math.max(1,Math.round(T/(3*r0))),sx=T/cols,sy=T/rows;
    return (X,Y,o)=>{
      const j0=Math.floor(Y/sy);let d1=1e9,d2=1e9,ax=0,ay=0,bx=0,by=0,ti=0,tj=0;
      for(let j=j0-1;j<=j0+1;j++){
        const off=(j&1)?sx/2:0,i0=Math.round((X-off)/sx),cy=(j+.5)*sy;
        for(let i=i0-1;i<=i0+1;i++){
          const cx=i*sx+off,d=(X-cx)*(X-cx)+(Y-cy)*(Y-cy);
          if(d<d1){d2=d1;bx=ax;by=ay;d1=d;ax=cx;ay=cy;ti=i;tj=j;}else if(d<d2){d2=d;bx=cx;by=cy;}
        }
      }
      o.tid=(((tj%rows)+rows)%rows)*cols+(((ti%cols)+cols)%cols)+1;o.alt=false;
      o.lx=X-ax+sx/2;o.ly=Y-ay+sy*.67;o.w=sx;o.h=sy*1.33;o.dE=(d2-d1)/(2*Math.hypot(ax-bx,ay-by));
    };
  }
  if(p==='basket'){
    const B=fit(m.tw||.1,true),n=Math.round(T/B),d=B*(m.dot||.2);
    return (X,Y,o)=>{
      const bi=Math.min(n-1,Math.floor(X/B)),bj=Math.min(n-1,Math.floor(Y/B)),bx=X-bi*B,by=Y-bj*B;
      const dx=Math.min(bx,B-bx),dy=Math.min(by,B-by);
      if(m.dots&&dx<d/2&&dy<d/2){
        const vx=(bi+(bx>B/2?1:0))%n,vy=(bj+(by>B/2?1:0))%n;
        o.tid=100000+vy*n+vx;o.alt=true;o.lx=dx;o.ly=dy;o.w=o.h=d;o.dE=Math.min(d/2-dx,d/2-dy);return;
      }
      const vert=((bi+bj)&1)===0,half=vert?(bx<B/2?0:1):(by<B/2?0:1);
      o.lx=vert?bx-half*B/2:bx;o.ly=vert?by:by-half*B/2;o.w=vert?B/2:B;o.h=vert?B:B/2;
      o.tid=(bj*n+bi)*2+half+1;o.alt=false;
      let e=Math.min(o.lx,o.w-o.lx,o.ly,o.h-o.ly);if(m.dots)e=Math.min(e,Math.max(dx-d/2,dy-d/2));
      o.dE=e;
    };
  }
  return null;
}

/* Generator: yields progress 0..1 about every 24 rows; returns {N,albedo,normal,rough} (RGBA bytes). */
export function* generateStone(id,N){
  const m=STONES[id];if(!m)throw new Error('Ukjent stein: '+id);
  const {n,fbm,fbmA,speck}=makeNoise(m.seed);
  const plaster=m.kind==='plaster';
  const cell=plaster||!m.pattern?null:makeCells(m),o={};
  const lay=plaster||cell?null:makeLayout(m);
  const segFor=shift=>lay.segs.map(arr=>{const a=new Uint16Array(N);let s=0;for(let x=0;x<N;x++){const X=((x+.5)/N*T+shift)%T;s=0;while(s<arr.length-2&&X>=arr[s+1])s++;a[x]=s;}return a;});
  const segOf=lay?segFor(0):null,segOfB=lay&&m.bond?segFor(m.widths[0]/2):null;
  const albedo=new Uint8ClampedArray(N*N*4),rough=new Uint8ClampedArray(N*N*4),H=new Float32Array(N*N);
  const dx=T/N,tr=(tid,k)=>hashf(tid,k*977+13,m.seed);
  const J=m.joint,ALT=m.alt||m;
  for(let y=0;y<N;y++){
    const v=(y+.5)/N,Y=(y+.5)*dx;
    for(let x=0;x<N;x++){
      const u=(x+.5)/N,X=(x+.5)*dx;
      let R,G,B,h=0,Rg=m.rough,tid=0,dE=1,dEj=1,lx=0,ly=0,w=1,hh=m.rowH,alt=false;
      if(cell){
        cell(X,Y,o);tid=o.tid;lx=o.lx;ly=o.ly;w=o.w;hh=o.h;dE=o.dE;alt=o.alt;
        dEj=dE+(n(u*180,v*180,180)-.5)*m.jitter;
      }else if(!plaster){
        let r=Math.floor(Y/m.rowH);if(r>=lay.rows)r=lay.rows-1;
        const bond=segOfB&&(r&1),Xr=bond?(X+m.widths[0]/2)%T:X;
        const arr=lay.segs[r],s=(bond?segOfB:segOf)[r][x],x0=arr[s];w=arr[s+1]-x0;
        tid=r*64+s;lx=Xr-x0;ly=Y-r*m.rowH;
        dE=Math.min(lx,w-lx,ly,m.rowH-ly);
        dEj=dE+(n(u*180,v*180,180)-.5)*m.jitter;
      }
      // second colour of a two-tone pattern (chess, the inserts of an ottagono, the dots of a basket weave)
      const P=alt?ALT:m,c0=P.c0,c1=P.c1||P.c0,VE=P.vein||m.vein,PA=P.patch!==undefined?P.patch:m.patch;
      if(m.kind==='limestone'){
        const lo=fbm(u,v,4,3),mid=fbm(u+.31,v+.17,5,9),fine=fbm(u+.7,v+.2,3,64),gr=n(u*340,v*340,340);
        const t=clamp01((lo-.5)*1.9+.5+(tr(tid,2)-.5)*.5);
        const k=clamp01(.55*t+.30*clamp01((mid-.5)*1.8+.5)+.15*fine);
        const tone=1+(tr(tid,0)-.5)*.09+(gr-.5)*.08+(fine-.5)*.06;
        const pit=Math.min(1,speck(u,v,90,.972,.30)*.9+speck(u,v,330,.93,.34)*.55),pk=1-pit*.30;
        R=(c0[0]+(c1[0]-c0[0])*k)*tone*pk;G=(c0[1]+(c1[1]-c0[1])*k)*tone*pk;B=(c0[2]+(c1[2]-c0[2])*k)*tone*pk;
        h=(mid-.5)*1.3+(fine-.5)*.9+(gr-.5)*.45-pit*1.1;Rg+=(gr-.5)*.14+pit*.14;
      }else if(m.kind==='marble'){
        const w1=fbm(u+.13,v+.71,4,3),w2=fbm(u+.57,v+.29,4,3),w3=fbm(u+.9,v+.4,5,8);
        const sa=u-v+(w1-.5)*.5,ta=2*u+3*v+(w2-.5)*.45+(w3-.5)*.10;
        const f1=(fbmA(sa,ta,5,1,4)-.5)*2.1+.5,f2=(fbmA(sa+.37,ta+.55,6,2,7)-.5)*2.4+.5;
        const r1=1-Math.abs(2*f1-1),r2=1-Math.abs(2*f2-1);
        const body=smooth(.30,.72,fbm(u+.2,v+.8,3,3));
        const TH=P.th||m.th,v1=smooth(TH[0],1,r1)*(.35+.65*body),v2=smooth(TH[1],1,r2)*.6*(.4+.6*body);
        const halo=Math.pow(r1,6)*.14+Math.pow(r2,8)*.06;
        const cloud=fbm(u+.2,v+.5,5,4),tone=1+(cloud-.5)*.06+(tr(tid,0)-.5)*(m.tileTone||.025);
        let R0=c0[0],G0=c0[1],B0=c0[2];
        if(PA){const p=smooth(.52,.8,fbm(u+.4,v+.9,3,3))*.5;R0+=(PA[0]-R0)*p;G0+=(PA[1]-G0)*p;B0+=(PA[2]-B0)*p;}
        const a=clamp01(v1*.9+v2*.7+halo);
        R=(R0+(VE[0]-R0)*a)*tone;G=(G0+(VE[1]-G0)*a)*tone;B=(B0+(VE[2]-B0)*a)*tone;
        h=(n(u*300,v*300,300)-.5)*.12;Rg+=(cloud-.5)*.10+a*.10;
      }else if(m.kind==='zellige'){
        const tone=(tr(tid,0)-.5)*(m.tileTone||.30),tint=(tr(tid,1)-.5)*20,mot=fbm(u,v,3,24),k=clamp01(tr(tid,3)*.8+(mot-.5)*.5);
        let rr=(c0[0]+(c1[0]-c0[0])*k)*(1+tone)+tint*.5,gg=(c0[1]+(c1[1]-c0[1])*k)*(1+tone)+tint,bb=(c0[2]+(c1[2]-c0[2])*k)*(1+tone)-tint*.4;
        const pool=1-smooth(0,.014,dE);
        rr+=(222-rr)*pool*.45;gg+=(214-gg)*pool*.45;bb+=(188-bb)*pool*.45;
        const sp=n(u*400,v*400,400);rr*=.97+sp*.05;gg*=.97+sp*.05;bb*=.97+sp*.05;
        R=rr;G=gg;B=bb;
        h=smooth(0,.03,dE)*.55+(mot-.5)*.35+((lx/w-.5)*(tr(tid,4)-.5)+(ly/hh-.5)*(tr(tid,5)-.5))*1.5;
        Rg+=(mot-.5)*.12+pool*.18;
      }else if(m.kind==='terracotta'){
        const tk=tr(tid,0)*.85+(fbm(u,v,3,18)-.5)*.5,gr=n(u*300,v*300,300),sp=speck(u,v,220,.85,.4);
        const k=clamp01(tk),dark=1-sp*.35,tone=1+(gr-.5)*.10;
        R=(c0[0]+(c1[0]-c0[0])*k)*tone*dark;G=(c0[1]+(c1[1]-c0[1])*k)*tone*dark;B=(c0[2]+(c1[2]-c0[2])*k)*tone*dark;
        h=(fbm(u,v,4,24)-.5)*.8+(gr-.5)*.6;Rg+=(gr-.5)*.1;
      }else if(m.kind==='terrazzo'){
        // cement ground with marble chips in two sizes (c1 = main chip colour, vein = second chip colour)
        const base=fbm(u,v,3,6),gr=n(u*360,v*360,360),C2=VE||c1;
        const a=speck(u,v,150,.45,.42),b=speck(u+.37,v+.11,70,.8,.5),f=speck(u+.61,v+.29,280,.55,.36);
        const tone=1+(base-.5)*.07+(gr-.5)*.04+(tr(tid,0)-.5)*.03;
        let rr=c0[0]*tone,gg=c0[1]*tone,bb=c0[2]*tone;
        if(f>0){const k=smooth(0,.3,f)*.7;rr+=(C2[0]-rr)*k;gg+=(C2[1]-gg)*k;bb+=(C2[2]-bb)*k;}
        if(a>0){const k=smooth(0,.25,a);rr+=(c1[0]-rr)*k;gg+=(c1[1]-gg)*k;bb+=(c1[2]-bb)*k;}
        if(b>0){const k=smooth(0,.22,b);rr+=(C2[0]-rr)*k;gg+=(C2[1]-gg)*k;bb+=(C2[2]-bb)*k;}
        R=rr;G=gg;B=bb;h=(gr-.5)*.12;Rg+=(gr-.5)*.06;
      }else{ // plaster
        const lo=fbm(u,v,5,5),gr=n(u*380,v*380,380),streak=n(u*10,v*46,46);
        const k=clamp01((lo-.5)*3+.5),tone=1+(gr-.5)*.04+(streak-.5)*.025;
        R=(c0[0]+(c1[0]-c0[0])*k)*tone;G=(c0[1]+(c1[1]-c0[1])*k)*tone;B=(c0[2]+(c1[2]-c0[2])*k)*tone;
        h=(lo-.5)*.9+(gr-.5)*.5+(streak-.5)*.4;
      }
      if(!plaster){
        if(dE<m.jw){
          const jn=n(u*300,v*300,300);
          R=J[0]*(.9+jn*.14);G=J[1]*(.9+jn*.14);B=J[2]*(.9+jn*.14);h=-1.3;Rg=.95;
        }else if(dEj<m.jw+m.bevel){
          const s=smooth(0,1,Math.max(0,dEj-m.jw)/m.bevel),d=.8+.2*s;
          R=R*d+J[0]*(1-d)*.25;G=G*d+J[1]*(1-d)*.25;B=B*d+J[2]*(1-d)*.25;h=h*s+(s-1)*1.1;
        }
      }
      const i=y*N+x,p=i*4;
      albedo[p]=R;albedo[p+1]=G;albedo[p+2]=B;albedo[p+3]=255;
      const rv=Rg<.04?10:Rg>1?255:Rg*255;rough[p]=rv;rough[p+1]=rv;rough[p+2]=rv;rough[p+3]=255;
      H[i]=h;
    }
    if((y&23)===23)yield y/N*.85;
  }
  const normal=new Uint8ClampedArray(N*N*4),b=m.bump;
  for(let y=0;y<N;y++){
    const ym=((y-1+N)%N)*N,y0=y*N,yp=((y+1)%N)*N;
    for(let x=0;x<N;x++){
      const xm=(x-1+N)%N,xp=(x+1)%N;
      const gx=(H[y0+xp]-H[y0+xm])*b*.5,gy=(H[yp+x]-H[ym+x])*b*.5;
      const inv=1/Math.sqrt(gx*gx+gy*gy+1),p=(y0+x)*4;
      normal[p]=(-gx*inv*.5+.5)*255;normal[p+1]=(-gy*inv*.5+.5)*255;/* row index grows with V in a DataTexture */normal[p+2]=(inv*.5+.5)*255;normal[p+3]=255;
    }
    if((y&47)===47)yield .85+y/N*.15;
  }
  return {N,albedo,normal,rough};
}
export function runToEnd(id,N){const g=generateStone(id,N);let r;do{r=g.next();}while(!r.done);return r.value;}
