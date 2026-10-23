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

/* Generator: yields progress 0..1 about every 24 rows; returns {N,albedo,normal,rough} (RGBA bytes). */
export function* generateStone(id,N){
  const m=STONES[id];if(!m)throw new Error('Ukjent stein: '+id);
  const {n,fbm,fbmA,speck}=makeNoise(m.seed);
  const plaster=m.kind==='plaster';
  const lay=plaster?null:makeLayout(m);
  const segOf=plaster?null:lay.segs.map(arr=>{const a=new Uint16Array(N);let s=0;for(let x=0;x<N;x++){const X=(x+.5)/N*T;while(s<arr.length-2&&X>=arr[s+1])s++;a[x]=s;}return a;});
  const albedo=new Uint8ClampedArray(N*N*4),rough=new Uint8ClampedArray(N*N*4),H=new Float32Array(N*N);
  const dx=T/N,tr=(tid,k)=>hashf(tid,k*977+13,m.seed);
  const c0=m.c0,c1=m.c1||m.c0,J=m.joint;
  for(let y=0;y<N;y++){
    const v=(y+.5)/N,Y=(y+.5)*dx;
    for(let x=0;x<N;x++){
      const u=(x+.5)/N,X=(x+.5)*dx;
      let R,G,B,h=0,Rg=m.rough,tid=0,dE=1,dEj=1,lx=0,ly=0,w=1;
      if(!plaster){
        let r=Math.floor(Y/m.rowH);if(r>=lay.rows)r=lay.rows-1;
        const arr=lay.segs[r],s=segOf[r][x],x0=arr[s];w=arr[s+1]-x0;
        tid=r*64+s;lx=X-x0;ly=Y-r*m.rowH;
        dE=Math.min(lx,w-lx,ly,m.rowH-ly);
        dEj=dE+(n(u*180,v*180,180)-.5)*m.jitter;
      }
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
        const v1=smooth(m.th[0],1,r1)*(.35+.65*body),v2=smooth(m.th[1],1,r2)*.6*(.4+.6*body);
        const halo=Math.pow(r1,6)*.14+Math.pow(r2,8)*.06;
        const cloud=fbm(u+.2,v+.5,5,4),tone=1+(cloud-.5)*.06+(tr(tid,0)-.5)*.025;
        let R0=m.c0[0],G0=m.c0[1],B0=m.c0[2];
        if(m.patch){const p=smooth(.52,.8,fbm(u+.4,v+.9,3,3))*.5;R0+=(m.patch[0]-R0)*p;G0+=(m.patch[1]-G0)*p;B0+=(m.patch[2]-B0)*p;}
        const a=clamp01(v1*.9+v2*.7+halo);
        R=(R0+(m.vein[0]-R0)*a)*tone;G=(G0+(m.vein[1]-G0)*a)*tone;B=(B0+(m.vein[2]-B0)*a)*tone;
        h=(n(u*300,v*300,300)-.5)*.12;Rg+=(cloud-.5)*.10+a*.10;
      }else if(m.kind==='zellige'){
        const tone=(tr(tid,0)-.5)*.30,tint=(tr(tid,1)-.5)*20,mot=fbm(u,v,3,24),k=clamp01(tr(tid,3)*.8+(mot-.5)*.5);
        let rr=(c0[0]+(c1[0]-c0[0])*k)*(1+tone)+tint*.5,gg=(c0[1]+(c1[1]-c0[1])*k)*(1+tone)+tint,bb=(c0[2]+(c1[2]-c0[2])*k)*(1+tone)-tint*.4;
        const pool=1-smooth(0,.014,dE);
        rr+=(222-rr)*pool*.45;gg+=(214-gg)*pool*.45;bb+=(188-bb)*pool*.45;
        const sp=n(u*400,v*400,400);rr*=.97+sp*.05;gg*=.97+sp*.05;bb*=.97+sp*.05;
        R=rr;G=gg;B=bb;
        h=smooth(0,.03,dE)*.55+(mot-.5)*.35+((lx/w-.5)*(tr(tid,4)-.5)+(ly/m.rowH-.5)*(tr(tid,5)-.5))*1.5;
        Rg+=(mot-.5)*.12+pool*.18;
      }else if(m.kind==='terracotta'){
        const tk=tr(tid,0)*.85+(fbm(u,v,3,18)-.5)*.5,gr=n(u*300,v*300,300),sp=speck(u,v,220,.85,.4);
        const k=clamp01(tk),dark=1-sp*.35,tone=1+(gr-.5)*.10;
        R=(c0[0]+(c1[0]-c0[0])*k)*tone*dark;G=(c0[1]+(c1[1]-c0[1])*k)*tone*dark;B=(c0[2]+(c1[2]-c0[2])*k)*tone*dark;
        h=(fbm(u,v,4,24)-.5)*.8+(gr-.5)*.6;Rg+=(gr-.5)*.1;
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
