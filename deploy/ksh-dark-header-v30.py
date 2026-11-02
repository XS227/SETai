#!/usr/bin/env python3
"""SETAEI KSH dark header v30, matching Fliskonkurrenten proposal.
Batched, backed up, idempotent. Does not rewrite logos or navigation markup.
Usage: python3 deploy/ksh-dark-header-v30.py --root /var/www/setai/ksh
"""
import argparse
from pathlib import Path
from datetime import datetime, timezone
import re
import shutil
import sys

ap = argparse.ArgumentParser()
ap.add_argument("--root", type=Path, default=Path("/var/www/setai/ksh"))
ap.add_argument("--dry-run", action="store_true")
args = ap.parse_args()

root=args.root
companies=("fliskonkurrenten","heimslig","heimdal-naturstein","flyt-gulv")
stylesheet='<link rel="stylesheet" href="/ksh/assets/ksh-dark-header-v30.css?v=30.2">'
stamp=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
found=0
changed=0
for company in companies:
    directory=root/company
    if not directory.is_dir():
        raise FileNotFoundError(directory)
    for path in sorted(directory.rglob("index.html")):
        old=path.read_text(encoding="utf-8")
        if not re.search(r"<head(?:\s[^>]*)?>",old,re.I):
            print("SKIP no head:",path)
            continue
        # Restrict rollout to generated KSH proposal pages sharing our stylesheet.
        if "/ksh/assets/ksh-brand-v24.css" not in old:
            print("SKIP different site template:",path.relative_to(root))
            continue
        found+=1
        if "ksh-dark-header-v30.css" in old:
            new=old.replace("ksh-dark-header-v30.css?v=30.1","ksh-dark-header-v30.css?v=30.2")
        else:
            new,count=re.subn(r"</head\s*>",stylesheet+"</head>",old,count=1,flags=re.I)
            if count!=1:
                raise RuntimeError("head close missing "+str(path))
        if new==old:
            continue
        if not args.dry_run:
            backup=path.with_name(path.name+".bak.dark-header30."+stamp)
            shutil.copy2(path,backup)
            path.write_text(new,encoding="utf-8")
        changed+=1
        print(("WOULD_UPDATE" if args.dry_run else "UPDATED"),path.relative_to(root))
print("Pages found:",found,"pages changed:",changed,"dry_run:",args.dry_run)
if found<150:
    raise SystemExit("FAIL: expected >=150 KSH proposal pages; inspect before assuming complete")
