#!/usr/bin/env bash
# Scoped Heimslig v7 fix: product-matched 3D model and collision-free placement.
set -euo pipefail
ROOT="${1:-/var/www/setai/ksh/heimslig}"
RAW="https://raw.githubusercontent.com/XS227/SETai/main/deploy/heimslig-v7"
[[ -d "$ROOT" && -f "$ROOT/3d-studio/index.html" && -f "$ROOT/assets/v5/room-studio.js" ]] || { echo 'Heimslig v5 is required. No site changes made.' >&2;exit 2;}
TMP=$(mktemp -d);trap 'rm -rf "$TMP"' EXIT
for file in room-core.js room-renderer.js room-studio.js test-room.js;do
 curl -fLsS --retry 3 --max-time 45 "$RAW/$file" -o "$TMP/$file"
 [[ -s "$TMP/$file" ]] || { echo "Empty $file" >&2;exit 2;}
 if command -v node >/dev/null;then node --check "$TMP/$file";fi
done
if command -v node >/dev/null;then node "$TMP/test-room.js";fi
grep -q 'findPlacement' "$TMP/room-core.js"
grep -q 'requestedProduct' "$TMP/room-studio.js"
grep -q "i.type==='sirkel'" "$TMP/room-renderer.js"
BACKUP="/var/backups/setaei/heimslig-v7-$(date +%Y%m%d-%H%M%S)-$$"
python3 - "$ROOT" "$TMP" "$BACKUP" <<'PY'
from pathlib import Path
import re,shutil,sys
root,tmp,backup=map(Path,sys.argv[1:])
files=['room-core.js','room-renderer.js','room-studio.js']
plans=[]
for p in sorted(root.rglob('index.html')):
 if any(x.startswith('.') or x in ('backups','vendor','node_modules') for x in p.relative_to(root).parts):continue
 html=p.read_text(encoding='utf-8')
 if not re.search(r'id=["\']heimsligViewer["\']',html):continue
 new=html
 for name in files:
  pattern=re.compile(r'<script\b[^>]*src=["\']/ksh/heimslig/assets/v(?:5|6|7)/'+re.escape(name)+r'(?:\?[^"\']*)?["\'][^>]*>\s*</script>',re.I)
  count=len(pattern.findall(new))
  if count!=1:raise SystemExit(f'Expected precisely one {name} include in {p}, found {count}. No changes made.')
  new=pattern.sub('<script defer src="/ksh/heimslig/assets/v7/'+name+'?v=7.0"></script>',new)
 plans.append((p,new))
if not plans:raise SystemExit('No known Heimslig room found. No changes made.')
backup.mkdir(parents=True,exist_ok=False)
targets=[(tmp/name,root/'assets/v7'/name) for name in files]
for p,_ in plans:
 dest=backup/p.relative_to(root);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
for src,dst in targets:
 if dst.exists():
  dest=backup/dst.relative_to(root);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(dst,dest)
for src,dst in targets:
 dst.parent.mkdir(parents=True,exist_ok=True)
 stage=dst.with_suffix(dst.suffix+'.new');shutil.copy2(src,stage);stage.chmod(0o644);stage.replace(dst)
for p,html in plans:
 stage=p.with_suffix('.html.new');stage.write_text(html,encoding='utf-8');stage.chmod(p.stat().st_mode&0o777);stage.replace(p)
print(f'Installed Heimslig v7 on {len(plans)} room pages. Other KSH pages unchanged.')
print('Backup:',backup)
print('Rollback: sudo cp -a '+str(backup)+'/. '+str(root)+'/')
PY
printf '%s\n' 'Test product: https://setai.no/ksh/heimslig/3d-studio/?produkt=sirkel-bord&v=7'
