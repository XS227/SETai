#!/usr/bin/env python3
"""KSH v27: non-destructive polish for pages already running the enhanced v26 guide.

v26 provides the new editorial layout. Retire conflicting v25 CSS on only those
pages, then load the v27 mobile layout after v26. Files without v26 are untouched.
"""
from pathlib import Path
from datetime import datetime,timezone
import shutil
BASE=Path("/var/www/setai/ksh")
stamp=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
new='<link rel="stylesheet" href="/ksh/assets/ksh-project-mobile-v27.css?v=27.1">'
previous='<link rel="stylesheet" href="/ksh/assets/ksh-project-v25.css?v=25.1">'
changed=[]
for file in sorted(BASE.rglob("index.html")):
    content=file.read_text(encoding="utf-8")
    if 'ksh-network-v26.css' not in content or '<head' not in content:
        continue
    result=content.replace(previous,'')
    if new not in result:
        result=result.replace('</head>',new+'</head>',1)
    if result==content:continue
    backup=file.with_name(file.name+".bak.mobile27."+stamp)
    shutil.copy2(file,backup)
    file.write_text(result,encoding="utf-8")
    changed.append(str(file.relative_to(BASE)))
print("Mobile v27 updated",len(changed),"v26 pages")
for name in changed:print("UPDATED",name)
