#!/usr/bin/env python3
"""KSH v25.3: real shader lighting + fullscreen in Heimdal natural stone showroom."""
from pathlib import Path
from datetime import datetime,timezone
import shutil
base=Path("/var/www/setai/ksh")
stamp=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
def edit(name,fn):
 p=base/name;old=p.read_text(encoding="utf-8");new=fn(old)
 if new!=old:
  shutil.copy2(p,p.with_name(p.name+".bak.stone25."+stamp))
  p.write_text(new,encoding="utf-8")
  print("UPDATED",name)
def replace(s,a,b):
 if a not in s and b not in s:raise RuntimeError("Expected source: "+a[:75])
 return s.replace(a,b)
def js(s):
 if "KSH_STONE_LIGHT_25" in s:return s
 s="/* KSH_STONE_LIGHT_25 */\n"+s
 s=replace(s,"uniform int u_stoneType;varying","uniform int u_stoneType;uniform float u_lightPower;varying")
 s=replace(s,"col*=shade;col=pow(max(col,vec3(0.)),vec3(.92));","col*=shade*u_lightPower;col=pow(max(col,vec3(0.)),vec3(.92));")
 s=replace(s,"const uStone=gl.getUniformLocation(program,'u_stoneType');gl.enable","const uStone=gl.getUniformLocation(program,'u_stoneType'),uLight=gl.getUniformLocation(program,'u_lightPower');gl.enable")
 s=replace(s,"let yaw=-.38,model='sofa'","let lightPower=1;let yaw=-.38,model='sofa'")
 s=replace(s,"for(const item of scene){gl.uniform1f(uYaw","gl.uniform1f(uLight,lightPower);for(const item of scene){gl.uniform1f(uYaw")
 old="const resize=new ResizeObserver(()=>dirty=true);resize.observe(host);rebuild();"
 new="""if(type==='stone'){
  const bar=document.createElement('div');
  bar.className='ksh25-stone-toolbar';
  bar.innerHTML='<label>Lys <input type="range" min="0.5" max="1.5" step="0.05" value="1" aria-label="Lysstyrke i steinstudioet"><output>100%</output></label><button type="button" aria-label="Vis steinstudioet i fullskjerm">Fullskjerm ⤢</button>';
  host.append(bar);
  const slider=bar.querySelector('input'),output=bar.querySelector('output'),full=bar.querySelector('button');
  slider.addEventListener('input',()=>{
   lightPower=Math.max(.5,Math.min(1.5,Number(slider.value)||1));
   output.textContent=Math.round(lightPower*100)+'%';dirty=true;
  });
  full.addEventListener('click',async()=>{
   try{
    if(document.fullscreenElement===host)await document.exitFullscreen();
    else if(host.requestFullscreen)await host.requestFullscreen();
    else host.classList.toggle('ksh25-fs-fallback');
   }catch{host.classList.toggle('ksh25-fs-fallback');}
   dirty=true;
  });
  document.addEventListener('fullscreenchange',()=>{
   full.textContent=document.fullscreenElement===host?'Avslutt fullskjerm ↗':'Fullskjerm ⤢';
   dirty=true;
  });
 }
 """
 s=replace(s,old,new+old)
 return s
edit(Path("assets/showroom.js"),js)
def html(s):
 if '/ksh/assets/ksh-stone-v25.css' not in s:
  assert '</head>' in s
  s=s.replace('</head>','<link rel="stylesheet" href="/ksh/assets/ksh-stone-v25.css?v=25.3"></head>',1)
 s=replace(s,'/ksh/assets/showroom.js?v=5','/ksh/assets/showroom.js?v=25.3')
 return s
edit(Path("heimdal-naturstein/3d-studio/index.html"),html)
