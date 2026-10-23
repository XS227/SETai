/* Stenhuset "Prøv i mitt rom": pure geometry helpers (no DOM, testable in Node).
 * - quad ordering and homography (unit square <-> screen quad)
 * - device orientation -> rotation matrix, rotation-only reprojection of marked points (gyro stabilisation)
 * Matrices are 3x3, row-major arrays of 9 numbers. */

export const mul3=(a,b)=>{const r=new Array(9);for(let i=0;i<3;i++)for(let j=0;j<3;j++)r[i*3+j]=a[i*3]*b[j]+a[i*3+1]*b[3+j]+a[i*3+2]*b[6+j];return r;};
export const transpose3=a=>[a[0],a[3],a[6],a[1],a[4],a[7],a[2],a[5],a[8]];
export const apply3=(m,v)=>[m[0]*v[0]+m[1]*v[1]+m[2]*v[2],m[3]*v[0]+m[4]*v[1]+m[5]*v[2],m[6]*v[0]+m[7]*v[1]+m[8]*v[2]];
export function invert3(m){
  const [a,b,c,d,e,f,g,h,i]=m,A=e*i-f*h,B=-(d*i-f*g),C=d*h-e*g,det=a*A+b*B+c*C;
  if(Math.abs(det)<1e-12)return null;
  const s=1/det;
  return [A*s,-(b*i-c*h)*s,(b*f-c*e)*s,B*s,(a*i-c*g)*s,-(a*f-c*d)*s,C*s,-(a*h-b*g)*s,(a*e-b*d)*s];
}

/* Order four points clockwise (screen coordinates, y down) starting with the top-left-most. */
export function orderQuad(pts){
  const cx=pts.reduce((s,p)=>s+p[0],0)/4,cy=pts.reduce((s,p)=>s+p[1],0)/4;
  const sorted=pts.slice().sort((p,q)=>Math.atan2(p[1]-cy,p[0]-cx)-Math.atan2(q[1]-cy,q[0]-cx));
  // atan2 with y down grows clockwise on screen; start at the point closest to the top-left
  let k=0,best=1e18;sorted.forEach((p,i)=>{const d=(p[0]-cx)*(p[0]-cx)*0+(p[0]+p[1]);if(d<best){best=d;k=i;}});
  return [0,1,2,3].map(i=>sorted[(k+i)%4]);
}

/* Homography mapping the unit square (0,0),(1,0),(1,1),(0,1) onto quad p0..p3 (Heckbert). */
export function squareToQuad(p){
  const [x0,y0]=p[0],[x1,y1]=p[1],[x2,y2]=p[2],[x3,y3]=p[3];
  const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
  let a,b,c,d,e,f,g,h;
  if(Math.abs(dx3)<1e-9&&Math.abs(dy3)<1e-9){
    a=x1-x0;b=x2-x1;c=x0;d=y1-y0;e=y2-y1;f=y0;g=0;h=0;
  }else{
    const den=dx1*dy2-dx2*dy1;
    if(Math.abs(den)<1e-12)return null;
    g=(dx3*dy2-dx2*dy3)/den;h=(dx1*dy3-dx3*dy1)/den;
    a=x1-x0+g*x1;b=x3-x0+h*x3;c=x0;d=y1-y0+g*y1;e=y3-y0+h*y3;f=y0;
  }
  return [a,b,c,d,e,f,g,h,1];
}
export function project(H,u,v){const w=H[6]*u+H[7]*v+H[8];return [(H[0]*u+H[1]*v+H[2])/w,(H[3]*u+H[4]*v+H[5])/w];}
/* Is the quad convex and non-degenerate (in marking order)? */
export function isConvexQuad(p){
  let sign=0;
  for(let i=0;i<4;i++){
    const a=p[i],b=p[(i+1)%4],c=p[(i+2)%4],cr=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
    if(Math.abs(cr)<1e-6)return false;
    const s=cr>0?1:-1;if(sign&&s!==sign)return false;sign=s;
  }
  return true;
}

/* W3C DeviceOrientation (degrees) -> rotation matrix R = Rz(alpha) Rx(beta) Ry(gamma), device -> world. */
export function orientationMatrix(alpha,beta,gamma){
  const r=Math.PI/180,ca=Math.cos(alpha*r),sa=Math.sin(alpha*r),cb=Math.cos(beta*r),sb=Math.sin(beta*r),cg=Math.cos(gamma*r),sg=Math.sin(gamma*r);
  const Rz=[ca,-sa,0,sa,ca,0,0,0,1],Rx=[1,0,0,0,cb,-sb,0,sb,cb],Ry=[cg,0,sg,0,1,0,-sg,0,cg];
  return mul3(mul3(Rz,Rx),Ry);
}

/* Pinhole camera, portrait phone: image x right, y down, z forward. Back camera looks along device -z. */
export const pixelToDevRay=(x,y,cx,cy,f)=>{const X=(x-cx)/f,Y=(y-cy)/f;return [X,-Y,-1];};
export function devRayToPixel(d,cx,cy,f){
  const z=-d[2];if(z<=1e-4)return null;
  return [cx+f*d[0]/z,cy+f*(-d[1])/z];
}
/* World ray for a pixel at the orientation R (device->world). */
export const pixelToWorldRay=(x,y,R,cx,cy,f)=>apply3(R,pixelToDevRay(x,y,cx,cy,f));
/* Pixel of a world ray at the orientation R. Null when behind the camera. */
export const worldRayToPixel=(w,R,cx,cy,f)=>devRayToPixel(apply3(transpose3(R),w),cx,cy,f);

export const focalPx=(longSidePx,fovDeg)=>(longSidePx/2)/Math.tan(fovDeg*Math.PI/360);

/* Laplacian variance on a grayscale array (blur measure; low = blurry). */
export function laplacianVariance(gray,w,h){
  let sum=0,sum2=0,n=0;
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    const i=y*w+x,l=gray[i-1]+gray[i+1]+gray[i-w]+gray[i+w]-4*gray[i];
    sum+=l;sum2+=l*l;n++;
  }
  const m=sum/n;return sum2/n-m*m;
}

/* ======================= automatic surfaces from a segmentation map =======================
 * World frame is the W3C one (Z up). The camera sits at the origin, Hc metres above the floor (floor plane z = -Hc). */

/* Floor point (X,Y in metres) seen at video pixel (x,y), or null above the horizon. */
export function pixelFloorPoint(x,y,R,cx,cy,f,Hc){
  const d=pixelToWorldRay(x,y,R,cx,cy,f);if(d[2]>-0.02)return null;
  const t=-Hc/d[2];return [d[0]*t,d[1]*t];
}

/* Softmax probabilities for the wall/floor classes plus the arg-max class map.
 * logits: Float32Array laid out [C][h][w] (as ONNX returns it). */
export function postprocess(logits,C,h,w,wallId=0,floorId=3){
  const hw=h*w,cls=new Uint8Array(hw),floor=new Float32Array(hw),wall=new Float32Array(hw);
  for(let i=0;i<hw;i++){
    let mx=-1e30,arg=0;
    for(let c=0;c<C;c++){const v=logits[c*hw+i];if(v>mx){mx=v;arg=c;}}
    let sum=0;for(let c=0;c<C;c++)sum+=Math.exp(logits[c*hw+i]-mx);
    cls[i]=arg;floor[i]=Math.exp(logits[floorId*hw+i]-mx)/sum;wall[i]=Math.exp(logits[wallId*hw+i]-mx)/sum;
  }
  return {cls,floor,wall,w,h};
}

/* 4-connected components of cls===target. Returns {labels:Int16Array (-1 none), comps:[{id,size}]} largest first, small ones dropped. */
export function components(cls,w,h,target,minFrac=.02){
  const labels=new Int16Array(w*h).fill(-1),comps=[],stack=[];let next=0;
  for(let s=0;s<w*h;s++){
    if(cls[s]!==target||labels[s]>=0)continue;
    let size=0;stack.push(s);labels[s]=next;
    while(stack.length){
      const i=stack.pop();size++;const x=i%w,y=(i/w)|0;
      if(x>0&&cls[i-1]===target&&labels[i-1]<0){labels[i-1]=next;stack.push(i-1);}
      if(x<w-1&&cls[i+1]===target&&labels[i+1]<0){labels[i+1]=next;stack.push(i+1);}
      if(y>0&&cls[i-w]===target&&labels[i-w]<0){labels[i-w]=next;stack.push(i-w);}
      if(y<h-1&&cls[i+w]===target&&labels[i+w]<0){labels[i+w]=next;stack.push(i+w);}
    }
    comps.push({id:next,size});next++;
  }
  const keep=comps.filter(c=>c.size>=minFrac*w*h).sort((a,b)=>b.size-a.size);
  return {labels,comps:keep};
}

/* Pixels where component k meets the floor: for each column the lowest wall cell that has floor within 3 cells below. Grid coords. */
export function wallFloorBoundary(cls,labels,k,w,h,floorId=3){
  const pts=[];
  for(let x=0;x<w;x++){
    let yy=-1;for(let y=h-2;y>=0;y--)if(labels[y*w+x]===k){yy=y;break;}
    if(yy<0)continue;
    for(let d=1;d<=3&&yy+d<h;d++)if(cls[(yy+d)*w+x]===floorId){pts.push([x+.5,yy+1]);break;}
  }
  return pts;
}

/* Robust 2D line fit (RANSAC, then PCA on inliers). Returns {p0,u,inliers} with u a unit direction, or null. */
export function fitLine(pts,thr=.12,iters=80){
  if(pts.length<6)return null;
  let seed=12345;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
  let best=null,bn=0;
  for(let k=0;k<iters;k++){
    const a=pts[(rnd()*pts.length)|0],b=pts[(rnd()*pts.length)|0];
    const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy);if(L<.2)continue;
    const ux=dx/L,uy=dy/L;let n=0;
    for(const p of pts)if(Math.abs(ux*(p[1]-a[1])-uy*(p[0]-a[0]))<thr)n++;
    if(n>bn){bn=n;best={a,ux,uy};}
  }
  if(!best||bn<Math.max(5,pts.length*.4))return null;
  const inl=pts.filter(p=>Math.abs(best.ux*(p[1]-best.a[1])-best.uy*(p[0]-best.a[0]))<thr);
  const cx=inl.reduce((s,p)=>s+p[0],0)/inl.length,cy=inl.reduce((s,p)=>s+p[1],0)/inl.length;
  let sxx=0,syy=0,sxy=0;for(const p of inl){const x=p[0]-cx,y=p[1]-cy;sxx+=x*x;syy+=y*y;sxy+=x*y;}
  const ang=.5*Math.atan2(2*sxy,sxx-syy);
  return {p0:[cx,cy],u:[Math.cos(ang),Math.sin(ang)],inliers:inl.length};
}

/* Wall planes from a class map. cam = {R,cx,cy,f,vw,vh}. Returns [{label,p0,u,inliers,fallback}] */
export function wallPlanes(seg,cam,Hc,maxWalls=3){
  const {cls,w,h}=seg,{labels,comps}=components(cls,w,h,0,.02),out=[];
  for(const c of comps.slice(0,maxWalls)){
    const bpts=wallFloorBoundary(cls,labels,c.id,w,h);
    const floorPts=[];
    for(const b of bpts){const p=pixelFloorPoint(b[0]/w*cam.vw,b[1]/h*cam.vh,cam.R,cam.cx,cam.cy,cam.f,Hc);if(p&&Math.hypot(p[0],p[1])<30)floorPts.push(p);}
    const line=fitLine(floorPts);
    if(line)out.push({label:c.id,p0:line.p0,u:line.u,inliers:line.inliers,fallback:false});
    else{ // no visible floor line: assume a wall 3.5 m ahead, square to the camera heading
      const f0=pixelToWorldRay(cam.vw/2,cam.vh/2,cam.R,cam.cx,cam.cy,cam.f),hd=Math.hypot(f0[0],f0[1])||1,fx=f0[0]/hd,fy=f0[1]/hd;
      out.push({label:c.id,p0:[fx*3.5,fy*3.5],u:[-fy,fx],inliers:0,fallback:true});
    }
  }
  return {planes:out,labels};
}

/* ======================= v2: cleaner class maps, several wall planes per wall region (room corners) ======================= */

/* 3x3 majority vote on a class map: removes speckle and ragged edges. */
export function majority3(cls,w,h){
  const out=new Uint8Array(cls.length),vals=new Uint8Array(9),cnts=new Uint8Array(9);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    let n=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;
      const c=cls[yy*w+xx];let k=0;while(k<n&&vals[k]!==c)k++;
      if(k===n){vals[n]=c;cnts[n]=0;n++;}cnts[k]++;
    }
    let bi=0;for(let k=1;k<n;k++)if(cnts[k]>cnts[bi])bi=k;
    out[y*w+x]=cnts[bi]>=5?vals[bi]:cls[y*w+x];
  }
  return out;
}
export function boxBlur3(a,w,h){
  const o=new Float32Array(a.length);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    let s=0,n=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;s+=a[yy*w+xx];n++;}
    o[y*w+x]=s/n;
  }
  return o;
}
/* Angle in radians between two orientation matrices. */
export function rotAngle(A,B){
  const M=mul3(transpose3(A),B),c=(M[0]+M[4]+M[8]-1)/2;return Math.acos(Math.max(-1,Math.min(1,c)));
}

/* Wall planes with corner support. One wall region can contain several walls (an inside corner). Its floor line is split into
 * straight pieces; every image column is assigned to the piece whose floor points it holds. Returns
 * {planes:[{key,comp,sub,p0,u,cols|null,inliers,fallback}],labels}. cols[x] = piece index for grid column x (or -1). */
export function wallPlanesGeneric(seg,fp,fallbackFn,maxRegions=3,maxPieces=3){
  const {cls,w,h}=seg,{labels,comps}=components(cls,w,h,0,.02),planes=[];
  for(const c of comps.slice(0,maxRegions)){
    const items=[];
    for(const b of wallFloorBoundary(cls,labels,c.id,w,h)){
      const p=fp(b[0],b[1]);
      if(p)items.push({b,p});
    }
    let rest=items.slice();const lines=[];
    while(lines.length<maxPieces&&rest.length>=6){
      const ln=fitLine(rest.map(i=>i.p));if(!ln)break;
      const inl=[],out=[];
      for(const it of rest){const d=Math.abs(ln.u[0]*(it.p[1]-ln.p0[1])-ln.u[1]*(it.p[0]-ln.p0[0]));(d<.15?inl:out).push(it);}
      if(inl.length<Math.max(6,.18*items.length))break;
      lines.push({ln,inl});rest=out;
    }
    // merge near-collinear pieces (same wall seen twice)
    for(let i=0;i<lines.length;i++)for(let j=lines.length-1;j>i;j--){
      const a=lines[i].ln,b=lines[j].ln,dot=Math.abs(a.u[0]*b.u[0]+a.u[1]*b.u[1]),off=Math.abs(a.u[0]*(b.p0[1]-a.p0[1])-a.u[1]*(b.p0[0]-a.p0[0]));
      if(dot>Math.cos(8*Math.PI/180)&&off<.2){lines[i].inl=lines[i].inl.concat(lines[j].inl);lines.splice(j,1);}
    }
    if(!lines.length){
      const fb=fallbackFn();
      planes.push({key:c.id+'_0',comp:c.id,sub:0,p0:fb.p0,u:fb.u,cols:null,inliers:0,fallback:true});continue;
    }
    const cols=new Int8Array(w).fill(-1);
    lines.forEach((L,idx)=>{for(const it of L.inl)cols[Math.min(w-1,Math.floor(it.b[0]))]=idx;});
    // columns without a floor point (hidden by furniture) take the nearest assigned column
    const last=new Int16Array(w).fill(-1);let prev=-1;
    for(let x=0;x<w;x++){if(cols[x]>=0)prev=x;last[x]=prev;}
    let nxt=-1;
    for(let x=w-1;x>=0;x--){
      if(cols[x]>=0)nxt=x;
      if(cols[x]<0){const l=last[x],n=nxt;const pick=(l<0)?n:(n<0)?l:(x-l<=n-x?l:n);if(pick>=0)cols[x]=cols[pick];}
    }
    lines.forEach((L,idx)=>planes.push({key:c.id+'_'+idx,comp:c.id,sub:idx,p0:L.ln.p0,u:L.ln.u,cols,inliers:L.inl.length,fallback:false}));
  }
  return {planes,labels};
}

/* Gyro/pinhole version (camera mode): floor points come from a world ray and a known camera height. */
export function wallPlanes2(seg,cam,Hc,maxRegions=3,maxPieces=3){
  const {w,h}=seg;
  const fp=(gx,gy)=>{const p=pixelFloorPoint(gx/w*cam.vw,gy/h*cam.vh,cam.R,cam.cx,cam.cy,cam.f,Hc);return p&&Math.hypot(p[0],p[1])<30?p:null;};
  const fallbackFn=()=>{const f0=pixelToWorldRay(cam.vw/2,cam.vh/2,cam.R,cam.cx,cam.cy,cam.f),hd=Math.hypot(f0[0],f0[1])||1,fx=f0[0]/hd,fy=f0[1]/hd;return {p0:[fx*3.5,fy*3.5],u:[-fy,fx]};};
  return wallPlanesGeneric(seg,fp,fallbackFn,maxRegions,maxPieces);
}

/* ======================= WebXR (6DoF) helpers: column-major 4x4 matrices as in WebGL/WebXR ======================= */
export function mat4Mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}return o;}
export function mat4Inv(m){
  const inv=new Float64Array(16),[a00,a01,a02,a03,a10,a11,a12,a13,a20,a21,a22,a23,a30,a31,a32,a33]=m;
  const b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,
        b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
  let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;if(Math.abs(det)<1e-12)return null;det=1/det;
  inv[0]=(a11*b11-a12*b10+a13*b09)*det;inv[1]=(a02*b10-a01*b11-a03*b09)*det;inv[2]=(a31*b05-a32*b04+a33*b03)*det;inv[3]=(a22*b04-a21*b05-a23*b03)*det;
  inv[4]=(a12*b08-a10*b11-a13*b07)*det;inv[5]=(a00*b11-a02*b08+a03*b07)*det;inv[6]=(a32*b02-a30*b05-a33*b01)*det;inv[7]=(a20*b05-a22*b02+a23*b01)*det;
  inv[8]=(a10*b10-a11*b08+a13*b06)*det;inv[9]=(a01*b08-a00*b10-a03*b06)*det;inv[10]=(a30*b04-a31*b02+a33*b00)*det;inv[11]=(a21*b02-a20*b04-a23*b00)*det;
  inv[12]=(a11*b07-a10*b09-a12*b06)*det;inv[13]=(a00*b09-a01*b07+a02*b06)*det;inv[14]=(a31*b01-a30*b03-a32*b00)*det;inv[15]=(a20*b03-a21*b01+a22*b00)*det;
  return new Float32Array(inv);
}
const mulV4=(m,v)=>[m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12]*v[3],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13]*v[3],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]*v[3],m[3]*v[0]+m[7]*v[1]+m[11]*v[2]+m[15]*v[3]];
/* World ray through normalised device coordinates (nx,ny in -1..1), given the inverse of projection*view. */
export function ndcRay(invVP,nx,ny){
  const n=mulV4(invVP,[nx,ny,-1,1]),f=mulV4(invVP,[nx,ny,1,1]);
  const a=[n[0]/n[3],n[1]/n[3],n[2]/n[3]],b=[f[0]/f[3],f[1]/f[3],f[2]/f[3]];
  const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],L=Math.hypot(d[0],d[1],d[2]);return {o:a,d:[d[0]/L,d[1]/L,d[2]/L]};
}
/* Project a world point with a view-projection matrix; returns [nx,ny] or null when behind the camera. */
export function projectVP(VP,P){const c=mulV4(VP,[P[0],P[1],P[2],1]);return c[3]<=1e-6?null:[c[0]/c[3],c[1]/c[3]];}
/* Floor point (x,z) under the ray, floor plane y = floorY; null if the ray does not go down. */
export function rayFloorXZ(o,d,floorY){if(d[1]>-0.02)return null;const t=(floorY-o[1])/d[1];return [o[0]+d[0]*t,o[2]+d[2]*t];}

/* ======================= camera height from the picture =======================
 * If a wall shows both its floor line and its ceiling line, and the ceiling height is known, the camera height follows from the two
 * elevation angles (measured from the phone's orientation): Hc = Hceil * tan(a_floor) / (tan(a_floor) + tan(a_ceiling)).
 * Returns the median over the image columns that show both lines, or null. */
export function estimateCameraHeight(seg,cam,ceilH=2.5){
  const {cls,w,h}=seg,est=[];
  for(let x=0;x<w;x++){
    let yc=-1,yf=-1;
    for(let y=0;y<h-1;y++)if(cls[y*w+x]===5&&cls[(y+1)*w+x]===0)yc=y+1;           // ceiling -> wall
    for(let y=h-2;y>=0;y--)if(cls[y*w+x]===0&&cls[(y+1)*w+x]===3){yf=y+1;break;}   // wall -> floor
    if(yc<0||yf<0||yf<yc+4)continue;
    const dc=pixelToWorldRay((x+.5)/w*cam.vw,yc/h*cam.vh,cam.R,cam.cx,cam.cy,cam.f),df=pixelToWorldRay((x+.5)/w*cam.vw,yf/h*cam.vh,cam.R,cam.cx,cam.cy,cam.f);
    const ac=Math.asin(Math.max(-1,Math.min(1,dc[2]))),af=-Math.asin(Math.max(-1,Math.min(1,df[2])));
    if(ac<.03||af<.03)continue;
    est.push(ceilH*Math.tan(af)/(Math.tan(af)+Math.tan(ac)));
  }
  if(est.length<6)return null;
  est.sort((a,b)=>a-b);return est[est.length>>1];
}
