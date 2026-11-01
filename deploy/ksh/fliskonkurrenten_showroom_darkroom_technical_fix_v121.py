#!/usr/bin/env python3
"""KSH QA follow-up: dark-slate default showroom + correct category-specific commerce CTAs."""
from pathlib import Path
from datetime import datetime,timezone
import shutil
base=Path('/var/www/setai/ksh/fliskonkurrenten')
stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')

def write_safe(path,new):
    old=path.read_text()
    if new==old:return False
    shutil.copy2(path,path.with_name(path.name+'.bak.fixv12-'+stamp))
    tmp=path.with_name(path.name+'.tmp')
    tmp.write_text(new,encoding='utf-8')
    tmp.chmod(0o644)
    tmp.replace(path)
    return True

room=base/'assets/bathroom-v11-1/room.js'
s=room.read_text()
if 'KSH_SHOWROOM_DARKROOM_V121' not in s:
    a="state.items=[];"
    assert s.count(a)==1
    s=s.replace(a,a+"\n/* KSH_SHOWROOM_DARKROOM_V121: dark grey walls by default; users may select lighter styles below. */\nstate.wallCustomized=!!raw?.room?.wallCustomized;\nif(!state.wallCustomized)state.wall='charcoal';",1)
    needle="options.querySelectorAll('[data-dimension]').forEach(el=>el.oninput=()=>{"
    assert s.count(needle)==1
    add="""const wallChoices=document.createElement('fieldset');wallChoices.className='sr12-walls';wallChoices.innerHTML='<legend>Veggfarge i rommet</legend><p>Standard: skifergrå. Velg en lysere vegg om du ønsker det.</p><div class="sr12-wall-options">'+Object.entries(C.walls).map(([key,wall])=>'<button type="button" data-wall="'+key+'" aria-pressed="'+(state.wall===key)+'"><i aria-hidden="true" style="background:'+wall.color+'"></i><span>'+wall.name+'</span></button>').join('')+'</div>';options.append(wallChoices);
  wallChoices.querySelectorAll('[data-wall]').forEach(b=>b.onclick=()=>{state.wall=b.dataset.wall;state.wallCustomized=true;update();render('room');});
  """
    s=s.replace(needle,add+needle,1)
    print('ROOM_DARK',write_safe(room,s))

category=base/'kategorier/category.js'
s=category.read_text()
needle="""'<div class="k13-detail-actions"><a href="/ksh/fliskonkurrenten/showroom/">Test 3D-showroom ↗</a><a href="/ksh/fliskonkurrenten/produkter/">Se produktstudiene ↗</a></div></div>'+"""
replacement="""'<div class="k13-detail-actions">'+(technical?'<a href="'+safe(category.source)+'" target="_blank" rel="noopener noreferrer">Se produkter og priser ↗</a><a href="/ksh/fliskonkurrenten/leverandorer/?tema=teknisk">Relevante leverandører ↗</a>':'<a href="/ksh/fliskonkurrenten/showroom/">Test 3D-showroom ↗</a><a href="/ksh/fliskonkurrenten/produkter/">Se produktstudiene ↗</a>')+'</div></div>'+"""
if 'category.source' not in s or needle in s:
    assert s.count(needle)==1,'Technical CTA source segment not found'
    s=s.replace(needle,replacement,1)
    print('CATEGORY_TECH_CTA',write_safe(category,s))
else: print('CATEGORY_CTA_ALREADY_FIXED')

f=base/'kategorier/index.html'
s=f.read_text()
if 'category.js?v=14' in s:print('CATEGORY_CACHE_BUST',write_safe(f,s.replace('category.js?v=14','category.js?v=15',1)))

css=base/'assets/ksh-showroom-v12.css'
s=css.read_text()
if 'KSH_SHOWROOM_DARKROOM_V121' not in s:
    s+='''

/* KSH_SHOWROOM_DARKROOM_V121 - tactile material swatches inside Room og mål */
#reisen .sr12-walls{margin:16px 0 0;padding:14px;border:1px solid #d7d2c7;border-radius:10px;min-width:0;background:#f7f4ed}
#reisen .sr12-walls legend{font-weight:750;padding:0 7px;color:#303b36}
#reisen .sr12-walls p{color:#66685f;font-size:12px;line-height:1.5;margin:7px 0 14px}
#reisen .sr12-wall-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#reisen .sr12-wall-options button{display:flex;align-items:center;gap:9px;min-width:0;min-height:43px;padding:8px;border:1px solid #d6d2c9;background:#fff;border-radius:7px;text-align:left;font-size:11px;color:#292f2a}
#reisen .sr12-wall-options button[aria-pressed=true]{border:2px solid #3b6750;background:#e5ede5;font-weight:750}
#reisen .sr12-wall-options button i{display:block;width:21px;height:21px;border-radius:5px;flex:none;border:1px solid #0002}
#reisen .sr12-wall-options button span{overflow-wrap:anywhere}
'''
    css.write_text(s);css.chmod(0o644);print('ROOM_CSS_UPDATED')
page=base/'showroom/index.html'
s=page.read_text()
print('ROOM_VERSION_BUMP',write_safe(page,s.replace('room.js?v=12','room.js?v=12.1').replace('ksh-showroom-v12.css?v=12','ksh-showroom-v12.css?v=12.1')))
