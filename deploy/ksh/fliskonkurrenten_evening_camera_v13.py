#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime,timezone
import shutil
base=Path('/var/www/setai/ksh/fliskonkurrenten')
p=base/'assets/bathroom-v11-1/room.js'
s=p.read_text()
def sub(a,b):
 global s
 count=s.count(a)
 if count!=1:raise RuntimeError('Expected 1 occurrence got '+str(count)+' for '+a[:90])
 s=s.replace(a,b,1)
if 'KSH_EVENING_INSIDE_CAMERA_V13' not in s:
 sub("state.lightBrightness=raw?.room?.lightCustomized && Number.isFinite(+raw?.room?.lightBrightness)\n ?Math.max(20,Math.min(180,Number(raw.room.lightBrightness))):78;",
     "/* KSH_EVENING_INSIDE_CAMERA_V13: warm evening as default, honor explicit user lighting. */\nstate.lightCustomized=!!raw?.room?.lightCustomized;\nif(!state.lightCustomized)state.daylight='evening';\nstate.lightBrightness=state.lightCustomized && Number.isFinite(+raw?.room?.lightBrightness)\n ?Math.max(20,Math.min(180,Number(raw.room.lightBrightness))):72;")
 sub("state.lightTemperature=Number.isFinite(+raw?.room?.lightTemperature)\n ?Math.max(2700,Math.min(6500,Number(raw.room.lightTemperature)))\n :(state.daylight==='evening'?3000:5500);",
     "state.lightTemperature=state.lightCustomized && Number.isFinite(+raw?.room?.lightTemperature)\n ?Math.max(2700,Math.min(6500,Number(raw.room.lightTemperature)))\n :(state.daylight==='evening'?2900:5500);")
 sub("case 'right':eye=new T.Vector3(-w*.86-1,h*.64,l*.29);target.set(w*.34,h*.46,0);break;",
     "// The room's solid side wall is at negative X; looking from negative X views its OUTSIDE.\n    // Right-side preset approaches through the OPEN positive-X/positive-Z corner, aiming\n    // inward to the back panel rather than looking through the back of the side wall.\n    case 'right':eye=new T.Vector3(w*.69,h*.68,l*.51+0.35);target.set(w*.02,h*.47,-l*.29);break;")
 sub("['right','Høyre vegg','Se veggpanel og rom']","['right','Høyre side','Se innsiden av bakvegg og panel']")
 sub("'Kameravisning: '+({'overview':'Oversikt','front':'Forfra','left':'Venstre vegg','right':'Høyre vegg','top':'Ovenfra'}",
     "'Kameravisning: '+({'overview':'Oversikt','front':'Forfra','left':'Venstre vegg','right':'Høyre side · innenfra','top':'Ovenfra'}")
 stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
 shutil.copy2(p,p.with_name('room.js.bak.evening-'+stamp))
 tmp=p.with_name('room.js.tmp.evening');tmp.write_text(s);tmp.chmod(0o644);tmp.replace(p)
 print('ROOM UPDATED EVENING CAMERA')
else:print('ROOM already updated')
page=base/'showroom/index.html'
html=page.read_text()
new=html.replace('room.js?v=12.1','room.js?v=13.0').replace('room.js?v=12','room.js?v=13.0')
if new!=html:
 page.write_text(new);page.chmod(0o644)
 print('CACHE BUST ROOM')
