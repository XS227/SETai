#!/usr/bin/env python3
"""KSH v15: use same labeled showroom toolbar on embedded product pages;
evenly spread four KSH partner logos across all Fliskonkurrenten pages."""
from pathlib import Path
from datetime import datetime,timezone
import shutil
root=Path("/var/www/setai/ksh/fliskonkurrenten")
ts=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
def patch(p,fn):
    s=p.read_text(encoding="utf8");new=fn(s)
    if new==s:return False
    backup=p.with_name(p.name+".bak.ksh15-"+ts)
    shutil.copy2(p,backup)
    tmp=p.with_name(p.name+".tmp.ksh15")
    tmp.write_text(new,encoding="utf8");tmp.chmod(0o644);tmp.replace(p)
    return True

landing=root/"assets/sense-film-v4/landing.js"
def fix_landing(s):
    a="/assets/bathroom-v11-1/room.js?v=11.1"
    b="/assets/bathroom-v11-1/room.js?v=15"
    if a not in s and b not in s:raise ValueError("Sense JS import missing")
    return s.replace(a,b)
print("SENSE_IMPORT",patch(landing,fix_landing))

css=root/"assets/ksh-consistency-v15.css"
css.write_text("""
/* SETAEI KSH: same tool interface on product pages and independent showroom. */
body[data-ksh-brand="fliskonkurrenten"] .k6-footer .k6-brands{
 display:grid!important;
 grid-template-columns:repeat(4,minmax(0,1fr))!important;
 gap:clamp(16px,3vw,46px)!important;
 justify-items:stretch;
 align-items:center;
 max-width:1450px;
 width:100%;
 padding:clamp(26px,4vw,43px) 0;
 box-sizing:border-box;
}
body[data-ksh-brand="fliskonkurrenten"] .k6-footer .k6-brands>a{
 min-width:0;
 width:100%;
 display:flex!important;
 justify-content:center!important;
 align-items:center!important;
 text-align:center!important;
 text-decoration:none;
}
body[data-ksh-brand="fliskonkurrenten"] .k6-footer .k6-brands img{
 display:block;
 width:auto;
 max-width:min(100%,205px);
 max-height:58px;
 margin:0 auto;
 object-fit:contain;
}
body[data-ksh-brand="fliskonkurrenten"] .k6-footer .k6-wordmark{
 font:400 clamp(24px,3.1vw,42px)/1 Georgia,serif;
 text-align:center;white-space:nowrap;
}
@media(max-width:640px){
 body[data-ksh-brand="fliskonkurrenten"] .k6-footer .k6-brands{
   grid-template-columns:repeat(2,minmax(0,1fr))!important;
   gap:25px 16px!important;
 }
 body[data-ksh-brand="fliskonkurrenten"] .k6-footer .k6-brands img{
   max-width:min(100%,152px);max-height:49px;
 }
}
@media(max-width:320px){
 body[data-ksh-brand="fliskonkurrenten"] .k6-footer .k6-brands{
   gap:23px 10px!important;
 }
}
""".strip()+"\n")
css.chmod(0o644)

extra_style='<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/ksh-consistency-v15.css?v=15">'
shared_tool='<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/ksh-showroom-v12.css?v=14.1">'
count=0
for file in sorted(root.rglob("index.html")):
    text=file.read_text(encoding="utf8")
    if not "data-ksh-brand=\"fliskonkurrenten\"" in text:continue
    def edit(s):
        if extra_style not in s:
            s=s.replace("</head>",extra_style+"</head>",1)
        if file.relative_to(root).as_posix()=="produkt/sanipro-sense/index.html":
            if shared_tool not in s:
                s=s.replace("</head>",shared_tool+"</head>",1)
            # force new landing.js fetch because its importer was cached
            s=s.replace("sense-film-v4/landing.js?v=6","sense-film-v4/landing.js?v=15")
        return s
    if patch(file,edit):count+=1
print("PAGES_PATCHED",count,"STYLE",css)
