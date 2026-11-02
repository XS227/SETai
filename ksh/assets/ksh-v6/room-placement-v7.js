/* KSH Room Placement v7 — shared spatial rules for 3D and plan views.
   Rotated footprint SAT: prevents sofas/chairs/beds overlapping and leaving the room.
   Does not alter texture assets, product proportions or pricing. */
(function(root){
  'use strict';
  const C=root.KSHRoom;
  if(!C || C.placementVersion>=7) return;
  const EPS=1e-7;
  function axes(i){
    const a=-(Number(i.rotation)||0)*Math.PI/180;
    const c=Math.cos(a),s=Math.sin(a);
    return [[c,-s],[s,c]];
  }
  function half(i,gap=0){
    return [Math.max(.01,Number(i.size?.[0])||.01)/2+gap/2,
            Math.max(.01,Number(i.size?.[2])||.01)/2+gap/2];
  }
  function vertices(i,gap=0){
    const [u,v]=axes(i),[w,d]=half(i,gap);
    return [[-w,-d],[-w,d],[w,-d],[w,d]].map(([x,z])=>
      [Number(i.x||0)+x*u[0]+z*v[0],Number(i.z||0)+x*u[1]+z*v[1]]);
  }
  function overlaps(a,b,gap=.14){
    if(!a||!b||a.id===b.id)return false;
    const va=vertices(a,gap),vb=vertices(b,gap);
    for(const axis of [...axes(a),...axes(b)]){
      const pa=va.map(p=>p[0]*axis[0]+p[1]*axis[1]),
            pb=vb.map(p=>p[0]*axis[0]+p[1]*axis[1]);
      if(Math.max(...pa)<=Math.min(...pb)+EPS || Math.max(...pb)<=Math.min(...pa)+EPS) return false;
    }
    return true;
  }
  function fits(s,i,gap=.09){
    const w=Number(s.width)/2,l=Number(s.length)/2;
    if(!Number.isFinite(w)||!Number.isFinite(l)||i.size[1]>s.height)return false;
    return vertices(i,gap).every(p=>Math.abs(p[0])<=w+EPS && Math.abs(p[1])<=l+EPS);
  }
  function clear(s,i,others=s.items){
    return fits(s,i) && others.every(other=>other.id===i.id||!overlaps(i,other));
  }
  function findFree(s,i,others=s.items,prefer){
    const ox=Number(prefer?.x??i.x??0),oz=Number(prefer?.z??i.z??0);
    const candidate={...i,x:ox,z:oz};
    if(clear(s,candidate,others)) return {x:ox,z:oz};
    const step=.2,candidates=[];
    for(let x=-s.width/2;x<=s.width/2+EPS;x+=step){
      for(let z=-s.length/2;z<=s.length/2+EPS;z+=step){
        const px=Math.round(x*100)/100,pz=Math.round(z*100)/100;
        const distance=(px-ox)**2+(pz-oz)**2;
        candidates.push({x:px,z:pz,score:distance});
      }
    }
    candidates.sort((a,b)=>a.score-b.score || a.z-b.z || a.x-b.x);
    for(const p of candidates){candidate.x=p.x;candidate.z=p.z;if(clear(s,candidate,others))return {x:p.x,z:p.z};}
    return null;
  }
  function arrange(s){
    const placed=[],unplaced=[];
    for(const i of s.items){
      if(clear(s,i,placed)){placed.push(i);continue;}
      const xy=findFree(s,i,placed);
      if(xy){i.x=xy.x;i.z=xy.z;}else unplaced.push(i.id);
      placed.push(i);
    }
    return unplaced;
  }
  function issues(s){
    const bad=[];
    for(const i of s.items){
      if(!fits(s,i) || s.items.some(j=>j.id!==i.id&&overlaps(i,j)))bad.push(i.id);
    }
    return bad;
  }
  const oldNormalize=C.normalize;
  C.normalize=function(raw){
    const s=oldNormalize(raw);
    s.placementIssues=arrange(s);
    return s;
  };
  Object.assign(C,{placementVersion:7,overlaps,fitsRoom:fits,canPlace:clear,findFreePlacement:findFree,arrangeRoom:arrange,layoutIssues:issues});
})(window);
