#!/usr/bin/env python3
"""KSH v25.2: Bring Heimslig 3D view and lighting controls to shared showroom standard."""
from pathlib import Path
from datetime import datetime,timezone
import shutil
root=Path("/var/www/setai/ksh")
stamp=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
def update(name,fn):
 p=root/name;s=p.read_text(encoding="utf-8");t=fn(s)
 if t!=s:
  shutil.copy2(p,p.with_name(p.name+".bak.ksh25.2."+stamp))
  p.write_text(t,encoding="utf-8")
  print("UPDATED",name)
def repl(s,old,new):
 if old not in s and new not in s:raise RuntimeError("Unexpected source layout: "+old[:75])
 return s.replace(old,new)

def data(s):
 s=repl(s,"daylight:'day',waste:10,","daylight:'day',lightStrength:1,waste:10,")
 pos="for(const [k,opts] of [['floor',materials]"
 marker="  for(const [k,opts] of [['floor',materials]"
 if "s.lightStrength=clamp(raw.lightStrength" not in s:
  assert marker in s
  s=s.replace(marker,"  s.lightStrength=clamp(raw.lightStrength,.4,1.6,1);\n"+marker,1)
 return s
update(Path("assets/ksh-v6/room-data.js"),data)

def render(s):
 s=repl(s,"this.sun.intensity=s.daylight==='day'?3.3:.7;",
     "this.sun.intensity=(s.daylight==='day'?3.3:.7)*(s.lightStrength||1);")
 s=repl(s,"this.renderer.toneMappingExposure=s.daylight==='day'?1.15:.85;",
     "this.renderer.toneMappingExposure=(s.daylight==='day'?1.15:.85)*(.88+.12*(s.lightStrength||1));")
 return s
update(Path("assets/ksh-v6/room-renderer.js"),render)

def studio(s):
 if "KSH_SHOWROOM_PARITY_25_2" in s:return s
 s="/* KSH_SHOWROOM_PARITY_25_2 */\n"+s
 s=repl(s,"import {RoomRenderer} from './room-renderer.js';","import {RoomRenderer} from './room-renderer.js?v=25.2';")
 old='<button type="button" class="r6-fullscreen" id="r6-fullscreen" aria-label="Fullskjerm">⤢</button>'
 new=old+'<div class="r6-views"><label for="r6-camera-view">Visning</label><select id="r6-camera-view" aria-label="Velg kameravinkel"><option value="angle">Perspektiv</option><option value="front">Forfra</option><option value="side">Fra siden</option><option value="top">Ovenfra</option></select></div>'
 s=repl(s,old,new)
 old='<p class="r6-small">Lys og skjerm påvirker fargene.'
 new='<label class="r6-light-control" for="r6-light-level">Lysstyrke <output id="r6-light-label">100%</output><input id="r6-light-level" type="range" min="0.4" max="1.6" step="0.05" value="1"></label><p class="r6-small">Lys og skjerm påvirker fargene.'
 s=repl(s,old,new)
 old="let mode=renderer.is3D?'3d':'plan';"
 # Keep selector and view in sync even when auto-follow jumps to a new product.
 s=repl(s,old,old+"\n function cameraMode(view){\n"
  +"  if(!renderer.is3D)return;\n"
  +"  const size=Math.max(s.width,s.length),d=size*1.5;\n"
  +"  renderer.controls.target.set(0,.65,0);\n"
  +"  if(view==='angle')renderer.reset();\n"
  +"  else {\n"
  +"   const pos=view==='front'?[0,2.1,d]:view==='side'?[d,2.1,0]:[.001,d*1.3,.001];\n"
  +"   renderer.eye.position.set(...pos);renderer.controls.update();\n"
  +"  }\n"
  +" }\n"
  +" $('camera-view').onchange=e=>cameraMode(e.target.value);\n")
 # Camera control is irrelevant in the photo/plan mode.
 s=repl(s,
  "renderer.setMode(mode);shell.querySelectorAll('[data-mode]')",
  "renderer.setMode(mode);shell.querySelector('.r6-views').hidden=mode!=='3d';shell.querySelectorAll('[data-mode]')")
 s=repl(s,
  "function focusSelected(){",
  "function focusSelected(){\n  $('camera-view').value='angle';")
 s=repl(s,
  "renderer.update(s);for(const k of ['width'",
  "renderer.update(s);set('light-level',s.lightStrength||1);$('light-label').textContent=Math.round((s.lightStrength||1)*100)+'%';for(const k of ['width'")
 s=repl(s,
  "numeric('delivery',v=>s.delivery=v,true);",
  "numeric('light-level',v=>s.lightStrength=v);numeric('delivery',v=>s.delivery=v,true);")
 return s
update(Path("assets/ksh-v6/room-studio.js"),studio)
def html(s):
 s=s.replace('/ksh/assets/ksh-v6/room-data.js?v=25.1','/ksh/assets/ksh-v6/room-data.js?v=25.2')
 s=s.replace('/ksh/assets/ksh-v6/room-studio.js?v=25.1','/ksh/assets/ksh-v6/room-studio.js?v=25.2')
 s=s.replace('/ksh/assets/ksh-room-v25.css?v=25.1','/ksh/assets/ksh-room-v25.css?v=25.2')
 return s
update(Path("heimslig/3d-studio/index.html"),html)
