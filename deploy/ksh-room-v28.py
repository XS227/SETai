#!/usr/bin/env python3
"""Non-destructive compatibility patch for current Heimslig v25 studio.
Only adds shared placement fallback, top camera and responsive control skin.
Creates backups and fails safely if live markup no longer matches.
"""
from pathlib import Path
from datetime import datetime,timezone
import re,sys
ROOT=Path('/var/www/setai/ksh')
STAMP=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
DRY='--check' in sys.argv

def write(f,text):
    old=f.read_text(encoding='utf-8')
    if old==text:
        print('UNCHANGED',f);return
    if DRY:
        print('DRY-RUN',f,'size',len(text));return
    backup=f.with_name(f.name+'.backup-before-room-v28-'+STAMP)
    backup.write_text(old,encoding='utf-8')
    f.write_text(text,encoding='utf-8')
    print('PUBLISHED',f,'BACKUP',backup)

def studio():
    f=ROOT/'assets/ksh-v6/room-studio.js'
    src=f.read_text(encoding='utf-8')
    button='<button id="r6-view-top" type="button" aria-label="Se rommet ovenfra">↑ Ovenfra</button>'
    if button not in src:
        marker='<button id="r6-reset" type="button" aria-label="Nullstill kameravinkel">↺</button>'
        assert src.count(marker)==1,'Cannot locate camera reset'
        src=src.replace(marker,marker+button)
    handler="'view-top').onclick"
    if handler not in src:
        marker="$('reset').onclick=()=>renderer.reset();"
        assert src.count(marker)==1,'Cannot locate camera handler'
        src=src.replace(marker,marker+"$('view-top').onclick=()=>{setMode('3d');renderer.view();};")
    # Repack when a new large product could fit only after existing furniture is moved.
    needle="""  const pos=C.findPlacement(s,i);
  if(!pos){placementStatus('Ingen ledig gulvplass. Utvid rommet eller fjern et møbel. Ingenting ble lagt oppå andre.');return;}"""
    replacement="""  const pos=C.findPlacement(s,i);
  if(!pos){
   const trial={...s,items:[...s.items.map(v=>({...v,size:[...v.size]})),i]};
   if(C.arrangeRoom(trial).length===0){
    s.items=trial.items;s.selected=id;placementStatus('Møblene er plassert uten kollisjoner.');update();focusSelected();return;
   }
   placementStatus('Ingen ledig gulvplass. Utvid rommet eller fjern et møbel. Ingenting ble lagt oppå andre.');return;
  }"""
    if "C.arrangeRoom(trial)" not in src:
        assert src.count(needle)==1,'Current add implementation changed; stop rather than overwrite'
        src=src.replace(needle,replacement)
    assert 'C.arrangeRoom(trial)' in src
    assert "C.collisions(s)" in src,'Expected current collision-awareness missing'
    write(f,src)
    p=ROOT/'heimslig/3d-studio/index.html'
    html=p.read_text(encoding='utf-8')
    if 'room-placement-v7.js' not in html:
        match=re.search(r'(<script\s+src="/ksh/assets/ksh-v6/room-data.js[^"]*"\s*></script>)',html)
        assert match,'Room data script missing; do not patch'
        html=html.replace(match.group(1),match.group(1)+'\n<script src="/ksh/assets/ksh-v6/room-placement-v7.js?v=7.3"></script>',1)
    if 'room-studio-v7.css' not in html:
        assert '</head>' in html
        html=html.replace('</head>','<link rel="stylesheet" href="/ksh/assets/ksh-v6/room-studio-v7.css?v=7.3">\n</head>',1)
    html=re.sub(r'room-studio\.js\?v=[0-9.]+','room-studio.js?v=28.1',html,count=1)
    assert html.count('room-placement-v7.js')==1
    assert html.count('room-studio-v7.css')==1
    write(p,html)
def main():
    for f in ['assets/ksh-v6/room-placement-v7.js','assets/ksh-v6/room-studio-v7.css']:
        assert (ROOT/f).exists(),'Stage '+f+' before patch'
    studio()
if __name__=='__main__':main()
