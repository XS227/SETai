#!/usr/bin/env python3
"""KSH v25 safe rollout: scoped KSH journeys + collision-safe Heimslig room."""
from pathlib import Path
from datetime import datetime,timezone
import shutil

ROOT=Path("/var/www/setai/ksh")
STAMP=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
updates=[]
def change(path,fn):
 p=ROOT/path
 old=p.read_text(encoding="utf-8")
 new=fn(old)
 if new!=old:
  backup=p.with_name(p.name+".bak.ksh25."+STAMP)
  shutil.copy2(p,backup)
  p.write_text(new,encoding="utf-8")
  updates.append(str(path))
def required(s,old,new,label):
 if old not in s and new not in s:raise RuntimeError("Expected marker not found: "+label)
 return s.replace(old,new)

def network(s):
 s=required(s,"sessionStorage.getItem('net21-project')","sessionStorage.getItem('net21-project:'+origin)","session read")
 s=required(s,"sessionStorage.setItem('net21-project',k)","sessionStorage.setItem('net21-project:'+origin,k)","session write")
 return s
change(Path("assets/ksh-network-v21.js"),network)

SPATIAL="""
/* KSH_ROOM_SPATIAL_V25: oriented rectangle collision test and no-overlap placement. */
function overlaps(a,b,clearance=.13){
 const axes=i=>{const t=(i.rotation||0)*Math.PI/180,c=Math.cos(t),s=Math.sin(t);return [[c,-s],[s,c]];};
 const aa=axes(a),bb=axes(b);
 const ha=[a.size[0]/2+clearance/2,a.size[2]/2+clearance/2];
 const hb=[b.size[0]/2+clearance/2,b.size[2]/2+clearance/2];
 const dx=(b.x||0)-(a.x||0),dz=(b.z||0)-(a.z||0);
 for(const u of [...aa,...bb]){
  const ra=ha[0]*Math.abs(u[0]*aa[0][0]+u[1]*aa[0][1])+ha[1]*Math.abs(u[0]*aa[1][0]+u[1]*aa[1][1]);
  const rb=hb[0]*Math.abs(u[0]*bb[0][0]+u[1]*bb[0][1])+hb[1]*Math.abs(u[0]*bb[1][0]+u[1]*bb[1][1]);
  if(Math.abs(dx*u[0]+dz*u[1])>=ra+rb-1e-7)return false;
 }
 return true;
}
function collisions(s){
 const pairs=[];
 for(let j=0;j<s.items.length;j++)for(let k=j+1;k<s.items.length;k++)
  if(overlaps(s.items[j],s.items[k],.075))pairs.push([s.items[j].id,s.items[k].id]);
 return pairs;
}
function findPlacement(s,item){
 if(item.size[1]>s.height)return null;
 const candidates=[],step=.2;
 for(let xi=Math.ceil(-s.width/(2*step));xi<=Math.floor(s.width/(2*step));xi++)
 for(let zi=Math.ceil(-s.length/(2*step));zi<=Math.floor(s.length/(2*step));zi++){
  const x=Math.round(xi*step*100)/100,z=Math.round(zi*step*100)/100;
  candidates.push([x,z]);
 }
 candidates.sort((a,b)=>a[0]*a[0]+a[1]*a[1]-b[0]*b[0]-b[1]*b[1] || b[1]-a[1] || a[0]-b[0]);
 for(const [x,z] of candidates){
  const trial={...item,x,z};
  if(!outside(s,trial)&&s.items.every(v=>!overlaps(v,trial)))return {x,z};
 }
 return null;
}
function reflow(s){
 const revised=[];
 for(const original of s.items){
  const trial={...original,size:[...original.size]};
  if(outside(s,trial)||revised.some(old=>overlaps(old,trial))){
   const pos=findPlacement({...s,items:revised},trial);
   if(!pos)return false;
   Object.assign(trial,pos);
  }
  revised.push(trial);
 }
 s.items=revised;
 return true;
}
"""
def core(s):
 if "KSH_ROOM_SPATIAL_V25" in s:return s
 needle="const api={materials,catalog,walls,finishes,price,item,defaults,normalize,unitPrice,totals,outside};"
 assert needle in s,"Unknown v6 room data"
 return s.replace(needle,SPATIAL+"\n"+needle.replace("totals,outside};","totals,outside,overlaps,collisions,findPlacement,reflow};"))
change(Path("assets/ksh-v6/room-data.js"),core)

def studio(s):
 if "KSH_STUDIO_25" in s:return s
 assert "import {RoomRenderer}" in s
 s=s.replace("const C=window.KSHRoom,A=","/* KSH_STUDIO_25 */\nconst C=window.KSHRoom,A=",1)
 s=required(s,
 "migrated=!saved&&!!localStorage.getItem('heimslig-room-v5');}catch{s=C.defaults();}",
 "migrated=!saved&&!!localStorage.getItem('heimslig-room-v5');}catch{s=C.defaults();}\n"+
 " const hadInvalid=!!(C.collisions(s).length||s.items.some(i=>C.outside(s,i)));\n const recovered=hadInvalid&&C.reflow(s);",
 "legacy saved room repair")
 s=required(s,
 '<p id="r6-outside" class="r6-outside" role="status"></p>',
 '<p id="r6-outside" class="r6-outside" role="status"></p><div class="r6-placement-actions"><button type="button" id="r6-reflow" hidden>Fordel møblene automatisk ↗</button><span id="r6-placement-status" role="status" aria-live="polite"></span></div>',
 "studio placement actions")
 s=required(s,"let mode=renderer.is3D?'3d':'plan';",
 """let mode=renderer.is3D?'3d':'plan';
 function focusSelected(){
  const i=selected();if(!i||!renderer.is3D||!renderer.controls)return;
  const d=Math.max(2.65,Math.max(i.size[0],i.size[2])*2);
  renderer.controls.target.set(i.x,Math.max(.4,i.size[1]*.55),i.z);
  renderer.eye.position.set(i.x+d*.75,Math.max(2,i.size[1]+d*.56),i.z+d*.85);
  renderer.controls.update();
 }
 function placementStatus(message){$('placement-status').textContent=message;}
 if(recovered)placementStatus('Tidligere overlappende møbler er fordelt på ledig plass.');
 else if(hadInvalid)placementStatus('Møblene får ikke plass. Prøv et større rom eller fjern et møbel.');
""","camera and status")
 # Remove the old single-line outside warning; it only detects furniture outside walls.
 line=next((x for x in s.splitlines(keepends=True) if "const outside=s.items.filter(x=>C.outside(s,x));" in x),None)
 assert line is not None,"Missing outside warning"
 s=s.replace(line,
 """  const outside=s.items.filter(x=>C.outside(s,x)),clashes=C.collisions(s);
  const fitMessage=[outside.length?outside.length+' møbler går utenfor rommet.':'',clashes.length?clashes.length+' møbelpar overlapper.':''].filter(Boolean).join(' ');
  $('fit').textContent=$('outside').textContent=fitMessage;
  $('reflow').hidden=!(outside.length||clashes.length);
""",1)
 s=required(s,"b.onclick=()=>{s.selected=it.id;update();};","b.onclick=()=>{s.selected=it.id;update();focusSelected();};","furniture select focus")
 s=required(s,
 "for(const k of ['width','length','height','waste'])numeric(k,v=>s[k]=v);",
 """for(const k of ['width','length','height'])numeric(k,v=>{
  const old=s[k];s[k]=v;
  if((C.collisions(s).length||s.items.some(i=>C.outside(s,i)))&&!C.reflow(s)){
   s[k]=old;placementStatus('Rommet er for lite. Endringen ble ikke lagret.');
   $(k).value=old;
  }
 });
 numeric('waste',v=>s.waste=v);""",
 "guard room resizing")
 oldadd=next((x for x in s.splitlines(keepends=True) if "function add(type,source){" in x),None)
 assert oldadd is not None and oldadd.count("s.items.push(i)")==1,"Unknown add method"
 newadd=""" function add(type,source){
  if(s.items.length>=20){placementStatus('Maksimum 20 møbler. Fjern ett før du legger til flere.');return;}
  const id='i'+Date.now()+Math.random().toString(16).slice(2);
  const i=source?{...source,id,size:[...source.size]}:C.item(type,id);
  const pos=C.findPlacement(s,i);
  if(!pos){placementStatus('Ingen ledig gulvplass. Utvid rommet eller fjern et møbel. Ingenting ble lagt oppå andre.');return;}
  Object.assign(i,pos);s.items.push(i);s.selected=id;
  placementStatus(C.catalog[i.type].name+' er lagt på en ledig plass.');
  update();focusSelected();
 }
"""
 s=s.replace(oldadd,newadd,1)
 oldedit=next((x for x in s.splitlines(keepends=True) if "function edit(fn,reset=false)" in x),None)
 assert oldedit is not None,"Unknown edit"
 newedit=""" function edit(fn,reset=false,validate=true){
  const i=selected();if(!i)return;
  const prev={...i,size:[...i.size]};
  fn(i);
  if(validate&&(C.outside(s,i)||s.items.some(other=>other.id!==i.id&&C.overlaps(i,other)))){
   Object.assign(i,prev);
   placementStatus('Møbelet kan ikke plasseres her: det kolliderer eller går utenfor rommet.');
   const active=document.activeElement;
   const fields={x:prev.x,z:prev.z,rotation:prev.rotation,
    'item-width':Math.round(prev.size[0]*100),'item-height':Math.round(prev.size[1]*100),
    'item-depth':Math.round(prev.size[2]*100)};
   const key=active&&active.id?active.id.replace(/^r6-/,''):'';
   if(active&&Object.hasOwn(fields,key))active.value=fields[key];
   return false;
  }
  if(reset){i.price=null;set('item-price',null);}
  return true;
 }
"""
 s=s.replace(oldedit,newedit,1)
 s=required(s,"edit(i=>i.finish=e.target.value,true);update();","edit(i=>i.finish=e.target.value,true,false);update();","finish update without geometry")
 s=required(s,
 "$('reset').onclick=()=>renderer.reset();",
 """$('reflow').onclick=()=>{
  if(C.reflow(s)){placementStatus('Møblene er fordelt med fri plass rundt.');update();focusSelected();}
  else placementStatus('Ikke plass til alle møbler. Utvid rommet eller fjern ett.');
 };
 $('reset').onclick=()=>renderer.reset();""",
 "reflow action")
 return s
change(Path("assets/ksh-v6/room-studio.js"),studio)

def roomhtml(s):
 s=required(s,'/ksh/assets/ksh-v6/room-data.js?v=6.1','/ksh/assets/ksh-v6/room-data.js?v=25.1','core version')
 s=required(s,'/ksh/assets/ksh-v6/room-studio.js?v=6.1','/ksh/assets/ksh-v6/room-studio.js?v=25.1','studio version')
 if 'ksh-room-v25.css' not in s:s=s.replace('</head>','<link rel="stylesheet" href="/ksh/assets/ksh-room-v25.css?v=25.1"></head>',1)
 return s
change(Path("heimslig/3d-studio/index.html"),roomhtml)

# Shared project journey: bring new CSS on every page using the project component.
css='<link rel="stylesheet" href="/ksh/assets/ksh-project-v25.css?v=25.1">'
n=0
for p in sorted(ROOT.rglob("index.html")):
 rel=p.relative_to(ROOT)
 raw=p.read_text(encoding="utf-8")
 if '/ksh/assets/ksh-network-v21.css' not in raw:continue
 def inject(s):
  s=s.replace('/ksh/assets/ksh-network-v21.js?v=21.4','/ksh/assets/ksh-network-v21.js?v=25.1')
  if css not in s:s=s.replace('</head>',css+'</head>',1)
  return s
 change(rel,inject)
 n+=1
print("Modified",len(updates),"files; shared project component pages",n)
for p in updates:print("UPDATED",p)
