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
