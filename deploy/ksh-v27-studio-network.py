#!/usr/bin/env python3
"""KSH v27 — targeted, auditable live-page patches (creates timestamped backups).
Requires asset files to have been staged to the same document root in advance.
Supports --check for dry run; no external network calls.
"""
from pathlib import Path
from datetime import datetime, timezone
import sys
ROOT=Path('/var/www/setai/ksh')
CHECK='--check' in sys.argv
STAMP=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
changes=[]

def replace_once(text,old,new,label):
    if text.count(new)==1 and old not in text:return text
    count=text.count(old)
    if count!=1:raise AssertionError(f'{label}: expected 1 original, got {count}')
    return text.replace(old,new,1)

def update(path,content):
    before=path.read_text(encoding='utf-8')
    if content==before:
        print('UNCHANGED',path)
        return
    changes.append(str(path.relative_to(ROOT)))
    if CHECK:
        print('DRY',path,'new chars',len(content))
        return
    backup=path.with_name(path.name+'.bak.v27.'+STAMP)
    backup.write_text(before,encoding='utf-8')
    path.write_text(content,encoding='utf-8')
    print('UPDATED',path,'BACKUP',backup)

def html_asset(path,css=None,js=None):
    txt=path.read_text(encoding='utf-8')
    if css and css not in txt:
        if '</head>' not in txt:raise AssertionError(f'no head {path}')
        txt=txt.replace('</head>','<link rel="stylesheet" href="'+css+'">\n</head>',1)
    if js and js not in txt:
        if '</body>' not in txt:raise AssertionError(f'no body {path}')
        txt=txt.replace('</body>','<script defer src="'+js+'"></script>\n</body>',1)
    update(path,txt)

def network():
    f=ROOT/'assets/ksh-network-v21.js'
    txt=f.read_text(encoding='utf-8')
    oldget="sessionStorage.getItem('net21-project')"
    oldset="sessionStorage.setItem('net21-project',k)"
    if oldget in txt:txt=txt.replace(oldget,"sessionStorage.getItem('net21-project-'+origin)")
    if oldset in txt:txt=txt.replace(oldset,"sessionStorage.setItem('net21-project-'+origin,k)")
    assert oldget not in txt and oldset not in txt
    update(f,txt)
    # Main screens + relevant studio pages; product-detail/catalog shells keep their existing compact layout.
    for p in [
        'flyt-gulv/index.html','flyt-gulv/tjenester/index.html',
        'heimslig/index.html','heimslig/3d-studio/index.html',
        'heimdal-naturstein/index.html','heimdal-naturstein/3d-studio/index.html',
        'fliskonkurrenten/index.html',
    ]:
        f=ROOT/p
        if not f.exists():continue
        if 'ksh-network-v21.js' not in f.read_text():continue
        html_asset(f,'/ksh/assets/ksh-network-v26.css?v=26.1','/ksh/assets/ksh-network-v26.js?v=26.1')

def room_studio():
    f=ROOT/'assets/ksh-v6/room-studio.js'
    txt=f.read_text(encoding='utf-8')
    # Add compact camera view and practical collision-aware placement controls.
    txt=replace_once(
        txt,
        '<button id="r6-reset" type="button" aria-label="Nullstill kameravinkel">↺</button>',
        '<button id="r6-reset" type="button" aria-label="Nullstill kameravinkel">↺</button><button id="r6-view-top" type="button" aria-label="Se rommet ovenfra">↑ Ovenfra</button>',
        'top-down camera button')
    txt=replace_once(
        txt,
        '<button class="r6-primary" type="button" id="r6-add">Legg i rommet ＋</button>',
        '<button class="r6-primary" type="button" id="r6-add">Legg i rommet ＋</button><p class="r6-placement-help">Møbler får automatisk ledig plass. Størrelse og rotasjon kontrolleres mot vegger og andre møbler.</p><button id="r6-autoplace" type="button">Plasser møblene uten kollisjoner ↗</button>',
        'smart place action')

    oldoutside="const outside=s.items.filter(x=>C.outside(s,x));$('fit').textContent=$('outside').textContent=outside.length?`${outside.length} møbel(er) går utenfor rommet. Juster mål eller plassering.`:'';"
    newoutside="const outside=s.items.filter(x=>C.outside(s,x));const overlaps=C.layoutIssues(s);const layoutText=overlaps.length?`${overlaps.length} møbel(er) overlapper eller står for nær veggen. Bruk automatisk plassering.`:'';$('fit').textContent=$('outside').textContent=layoutText||spatialMessage||(outside.length?`${outside.length} møbel(er) går utenfor rommet. Juster mål eller plassering.`:'');"
    txt=replace_once(txt,oldoutside,newoutside,'layout warning')

    oldadd="function add(type,source){if(s.items.length>=20)return;const id='i'+Date.now()+Math.random().toString(16).slice(2);const i=source?{...source,id,size:[...source.size],x:source.x+.3,z:source.z+.3}:C.item(type,id);s.items.push(i);s.selected=id;update();}"
    newadd="function add(type,source){if(s.items.length>=20)return;const id='i'+Date.now()+Math.random().toString(16).slice(2);const i=source?{...source,id,size:[...source.size],x:source.x+.5,z:source.z+.5}:C.item(type,id);const place=C.findFreePlacement(s,i,s.items);if(!place){const trial={...s,items:[...s.items.map(v=>({...v,size:[...v.size]})),i]};if(!C.arrangeRoom(trial).length){s.items=trial.items;spatialMessage='';s.selected=id;update();return;}spatialMessage='Rommet har ikke plass til dette møbelet. Fjern et møbel eller øk rommålene.';$('outside').textContent=spatialMessage;return;}i.x=place.x;i.z=place.z;spatialMessage='';s.items.push(i);s.selected=id;update();}"
    txt=replace_once(txt,oldadd,newadd,'smart add and duplicate')

    oldedit="function edit(fn,reset=false){const i=selected();if(!i)return;fn(i);if(reset){i.price=null;set('item-price',null);}}"
    newedit="function edit(fn,reset=false){const i=selected();if(!i)return;const before={x:i.x,z:i.z,rotation:i.rotation,size:[...i.size]};fn(i);if(!C.canPlace(s,i,s.items.filter(x=>x.id!==i.id))){i.x=before.x;i.z=before.z;i.rotation=before.rotation;i.size=before.size;spatialMessage='Ingen plass her: møbelet kolliderer eller går utenfor rommet. Velg en annen plassering.';}else spatialMessage='';if(reset){i.price=null;set('item-price',null);}}"
    txt=replace_once(txt,oldedit,newedit,'guard editor')

    oldselected="const $=n=>document.getElementById('r6-'+n),selected=()=>s.items.find(i=>i.id===s.selected);let opener;"
    newselected="const $=n=>document.getElementById('r6-'+n),selected=()=>s.items.find(i=>i.id===s.selected);let opener,spatialMessage='';"
    txt=replace_once(txt,oldselected,newselected,'message variable')

    oldnumeric="const numeric=(id,fn,nullable=false)=>$(id).addEventListener('input',e=>{if((!nullable&&e.target.value==='')||!e.target.validity.valid)return;fn(nullable?C.price(e.target.value):Number(e.target.value));update();});"
    newnumeric="const numeric=(id,fn,nullable=false)=>$(id).addEventListener('input',e=>{if((!nullable&&e.target.value==='')||!e.target.validity.valid)return;fn(nullable?C.price(e.target.value):Number(e.target.value));update();if(spatialMessage&&selected()){const i=selected(),fields={'x':i.x,'z':i.z,'rotation':i.rotation,'item-width':Math.round(i.size[0]*100),'item-height':Math.round(i.size[1]*100),'item-depth':Math.round(i.size[2]*100)};if(Object.hasOwn(fields,id))e.target.value=fields[id];}});"
    txt=replace_once(txt,oldnumeric,newnumeric,'editable position sync')

    oldroom="for(const k of ['width','length','height','waste'])numeric(k,v=>s[k]=v);"
    newroom="for(const k of ['width','length','height','waste'])numeric(k,v=>{s[k]=v;if(k==='width'||k==='length')C.arrangeRoom(s);});"
    txt=replace_once(txt,oldroom,newroom,'room dimension collision repair')

    oldreset="$('reset').onclick=()=>renderer.reset();$('fullscreen').onclick=async()=>{"
    newreset="$('reset').onclick=()=>renderer.reset();$('view-top').onclick=()=>{setMode('3d');renderer.view();};$('autoplace').onclick=()=>{const bad=C.arrangeRoom(s);spatialMessage=bad.length?'Rommet har ikke plass til alle møblene. Øk målene eller fjern møbler.':'';update();};$('fullscreen').onclick=async()=>{"
    txt=replace_once(txt,oldreset,newreset,'top view and auto arrange handlers')
    update(f,txt)

    html=ROOT/'heimslig/3d-studio/index.html'
    data=html.read_text(encoding='utf-8')
    # Synchronous classic placement engine is loaded after shared room-data and before 3D module.
    old='<script src="/ksh/assets/ksh-v6/room-data.js?v=6.1"></script>'
    new=old+'\n<script src="/ksh/assets/ksh-v6/room-placement-v7.js?v=7.1"></script>'
    if new not in data:
        data=replace_once(data,old,new,'placement engine script')
    if '/ksh/assets/ksh-v6/room-studio-v7.css?v=7.1' not in data:
        data=data.replace('</head>','<link rel="stylesheet" href="/ksh/assets/ksh-v6/room-studio-v7.css?v=7.1">\n</head>',1)
    data=data.replace('/ksh/assets/ksh-v6/room-studio.js?v=6.1','/ksh/assets/ksh-v6/room-studio.js?v=7.1')
    assert new in data
    update(html,data)

def verify_assets():
    for a in ['assets/ksh-network-v26.js','assets/ksh-network-v26.css',
              'assets/ksh-v6/room-placement-v7.js','assets/ksh-v6/room-studio-v7.css']:
        if not (ROOT/a).exists():raise AssertionError(f'missing published asset {a}')

def main():
    verify_assets()
    network()
    room_studio()
    print(('DRY-RUN' if CHECK else 'DEPLOYED'),len(changes),'files')

if __name__=='__main__':main()
