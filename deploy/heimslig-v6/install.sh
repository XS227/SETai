#!/usr/bin/env bash
# Heimslig v6: photo-scanned CC0 material upgrade only. No other KSH sites touched.
set -euo pipefail
ROOT="${1:-/var/www/setai/ksh/heimslig}"
RAW="https://raw.githubusercontent.com/XS227/SETai/main/deploy/heimslig-v6"
[[ -d "$ROOT" && -f "$ROOT/3d-studio/index.html" && -f "$ROOT/assets/v5/room-studio.js" ]] || {
 echo "Mangler fungerende Heimslig v5. Ingen endringer utført." >&2;exit 2;
}
for exe in curl md5sum python3;do command -v "$exe" >/dev/null || { echo "Mangler $exe" >&2;exit 2;};done
TMP=$(mktemp -d);trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/textures"
curl -fLsS --retry 3 --max-time 60 "$RAW/room-renderer.js" -o "$TMP/room-renderer.js"
curl -fLsS --retry 3 --max-time 60 "$RAW/textures.md5" -o "$TMP/textures.md5"
if command -v node >/dev/null;then node --check "$TMP/room-renderer.js";fi
if ! grep -q "matFiles" "$TMP/room-renderer.js";then echo "Ugyldig v6-renderer." >&2;exit 2;fi
while read -r md5 relative;do
 [[ "$md5" =~ ^[a-f0-9]{32}$ && "$relative" =~ ^textures/[a-z0-9_]+_(diff|nor_gl|rough)_1k\.jpg$ ]] || { echo "Ugyldig manifest: $relative" >&2; exit 2;}
 name="${relative#textures/}"
 asset="${name%_1k.jpg}"
 asset="${asset%_diff}";asset="${asset%_nor_gl}";asset="${asset%_rough}"
 curl -fLsS --retry 3 --max-time 120 "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/$asset/$name" -o "$TMP/$relative"
done < "$TMP/textures.md5"
(cd "$TMP" && md5sum -c textures.md5)
BACKUP="/var/backups/setaei/heimslig-v6-$(date +%Y%m%d-%H%M%S)-$$"
python3 - "$ROOT" "$TMP" "$BACKUP" <<'PY'
from pathlib import Path
import re,shutil,sys
root,tmp,backup=map(Path,sys.argv[1:])
plans=[]
v5=re.compile(r'<script\b[^>]*src=["\']/ksh/heimslig/assets/v5/room-renderer\.js[^"\']*["\'][^>]*>\s*</script>',re.I)
v6=re.compile(r'<script\b[^>]*src=["\']/ksh/heimslig/assets/v6/room-renderer\.js[^"\']*["\'][^>]*>\s*</script>',re.I)
replacement='<script defer src="/ksh/heimslig/assets/v6/room-renderer.js?v=6.0"></script>'
for path in sorted(root.rglob('index.html')):
 if any(p in ('vendor','backups','node_modules') or p.startswith('.') for p in path.relative_to(root).parts):continue
 html=path.read_text(encoding='utf-8')
 if not re.search(r'id=["\']heimsligViewer["\']',html):continue
 if v6.search(html):new=v6.sub(replacement,html)
 elif v5.search(html):new=v5.sub(replacement,html)
 else:raise SystemExit(f'Mangler kjent renderer i {path}. Ingen endringer utført.')
 if new.count('/ksh/heimslig/assets/v6/room-renderer.js')!=1:raise SystemExit('Duplikat renderer. Ingen endringer utført.')
 plans.append((path,new))
if not plans:raise SystemExit('Ingen kjente 3D-rom ble funnet. Ingen endringer utført.')
# Backups before any modifications, no changes outside this subsite.
backup.mkdir(parents=True,exist_ok=False)
for path,_ in plans:
 dest=backup/path.relative_to(root);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,dest)
assets=[(tmp/'room-renderer.js',root/'assets/v6/room-renderer.js')]
assets += [(src,root/'assets/v6'/src.relative_to(tmp)) for src in sorted((tmp/'textures').glob('*.jpg'))]
for src,target in assets:
 if target.exists():
  dest=backup/target.relative_to(root);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(target,dest)
for src,target in assets:
 target.parent.mkdir(parents=True,exist_ok=True)
 staged=target.with_suffix(target.suffix+'.new');shutil.copy2(src,staged);staged.chmod(0o644);staged.replace(target)
for path,html in plans:
 staged=path.with_suffix('.html.new');staged.write_text(html,encoding='utf-8')
 staged.chmod(path.stat().st_mode&0o777);staged.replace(path)
print('Oppdatert romstudio:',len(plans),'side(r),',len(assets)-1,'faktiske PBR-maps.')
print('Backup:',backup)
print('Rollback: sudo cp -a '+str(backup)+'/. '+str(root)+'/')
PY
echo 'Ferdig. Test: https://setai.no/ksh/heimslig/3d-studio/?v=6'
