#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime, timezone
p=Path('/var/www/setai/ksh/heimdal-naturstein/3d-studio/index.html')
old=p.read_text(encoding='utf-8')
new=old
css='<link rel="stylesheet" href="/ksh/assets/ksh-showroom-common-v29.css?v=29.1">'
js='<script defer src="/ksh/assets/ksh-showroom-common-v29.js?v=29.1"></script>'
if css not in new:
    assert '</head>' in new
    new=new.replace('</head>',css+'\n</head>',1)
if js not in new:
    assert '</body>' in new
    new=new.replace('</body>',js+'\n</body>',1)
assert new.count(css)==1 and new.count(js)==1
if new!=old:
    backup=p.with_name('index.html.backup-ksh29-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    backup.write_text(old,encoding='utf-8')
    p.write_text(new,encoding='utf-8')
    print('PUBLISHED',p,'BACKUP',backup)
else:print('UNCHANGED')
