#!/usr/bin/env python3
"""KSH v14.1: comfortable evening ambient accent and 320px tool layout."""
from pathlib import Path
from datetime import datetime,timezone
import shutil
root=Path('/var/www/setai/ksh/fliskonkurrenten')
p=root/'assets/bathroom-v11-1/room.js'
s=p.read_text()
if 'KSH_COZY_POINTLIGHT_V141' not in s:
    a="this.sun.color.lerpColors(new T.Color('#ffb77b'),new T.Color('#eaf3ff'),tint);"
    b="""this.sun.color.lerpColors(new T.Color('#ffb77b'),new T.Color('#eaf3ff'),tint);
   /* KSH_COZY_POINTLIGHT_V141: subtle warm recessed accent in evening mode */
   if(!this.cozyLight){
     this.cozyLight=new T.PointLight('#ffc28b',0,7.2,1.8);
     this.scene.add(this.cozyLight);
   }
   this.cozyLight.position.set(s.width*.12,s.height*.79,-s.length*.34);
   this.cozyLight.intensity=s.daylight==='evening'?1.22*factor:0;
   this.scene.background.set(s.daylight==='evening'?'#39302b':'#e8e2d8');"""
    if s.count(a)!=1:raise RuntimeError('Cannot find lighting update')
    s=s.replace(a,b,1)
    s=s.replace('>Kveldslys</button>','>Kveldskos</button>',1)
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    shutil.copy2(p,p.with_name('room.js.bak.cozy-'+stamp))
    tmp=p.with_name('room.js.tmp.cozy')
    tmp.write_text(s);tmp.chmod(0o644);tmp.replace(p)
    print('UPDATED EVENING ACCENT')
q=root/'assets/ksh-showroom-v12.css'
style=q.read_text()
if 'KSH_V141_SMALL_SCREEN' not in style:
    style+='''

/* KSH_V141_SMALL_SCREEN: four labeled actions per row on 320px cover screens */
@media(max-width:350px){
  #reisen .sr5-tools{gap:5px;max-width:calc(100% - 82px)}
  #reisen .sr5-tools button{flex:0 0 49px;width:49px;min-width:0;height:54px;min-height:54px;padding:4px 1px}
  #reisen .sr5-tools .sr12-tool-label{font-size:8.1px;letter-spacing:-.02em}
  #reisen .sr5-tools button svg{width:18px;height:18px;flex-basis:18px}
}
'''
    q.write_text(style);q.chmod(0o644)
    print('UPDATED SMALL TOUCH LAYOUT')
page=root/'showroom/index.html'
html=page.read_text()
updated=html.replace('room.js?v=13.0','room.js?v=14.1').replace('ksh-showroom-v12.css?v=12.1','ksh-showroom-v12.css?v=14.1')
if updated!=html:
    page.write_text(updated);page.chmod(0o644)
    print('CACHE BUSTED')
