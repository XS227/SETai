#!/usr/bin/env bash
# Isolated Heimslig room + calculator upgrade; no other KSH sites are modified.
set -euo pipefail
ROOT="${1:-/var/www/setai/ksh/heimslig}"
RAW="${HEIMSLIG_SOURCE_URL:-https://raw.githubusercontent.com/XS227/SETai/main/deploy/heimslig-v5}"
[[ -d "$ROOT" && -f "$ROOT/3d-studio/index.html" ]] || { echo 'Mangler eksisterende Heimslig 3D-studio.' >&2; exit 2; }
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
for f in room-core.js room-renderer.js room-studio.js room-studio.css heimslig-v4.js SHA256SUMS; do
 curl -fLsS --max-time 45 --retry 2 "$RAW/$f" -o "$TMP/$f"
done
(cd "$TMP" && sha256sum -c SHA256SUMS)
if command -v node >/dev/null; then
 for f in room-core.js room-renderer.js room-studio.js heimslig-v4.js; do node --check "$TMP/$f"; done
fi
BACKUP="${HEIMSLIG_BACKUP_ROOT:-/var/backups/setaei}/heimslig-v5-$(date +%Y%m%d-%H%M%S)-$$"
python3 - "$ROOT" "$TMP" "$BACKUP" <<'PY'
import pathlib,re,shutil,sys
root,tmp,backup=map(pathlib.Path,sys.argv[1:])
plans=[];viewers=0
for p in sorted(root.rglob('index.html')):
    if any(x.startswith('.') or x in ('backups','vendor','node_modules') for x in p.relative_to(root).parts):continue
    s=p.read_text(encoding='utf-8')
    if '</head>' not in s.lower() or '</body>' not in s.lower():continue
    has_viewer=bool(re.search(r'id=[\"\']heimsligViewer[\"\']',s))
    if has_viewer:
        viewers+=1
        s=re.sub(r'<script\b[^>]*src=[\"\']/ksh/assets/showroom\.js[^\"\']*[\"\'][^>]*>\s*</script>','',s,flags=re.I)
    s=re.sub(r'<script\b[^>]*src=[\"\']/ksh/heimslig/assets/v4/heimslig-v4\.js[^\"\']*[\"\'][^>]*>\s*</script>','',s,flags=re.I)
    s=re.sub(r'\n?<!-- HEIMSLIG_V5_START -->.*?<!-- HEIMSLIG_V5_END -->','',s,flags=re.S)
    s=re.sub(r'<link\b[^>]*href=[\"\']/ksh/heimslig/assets/v5/room-studio\.css[^\"\']*[\"\'][^>]*>','',s,flags=re.I)
    css='<link rel="stylesheet" href="/ksh/heimslig/assets/v5/room-studio.css?v=5.1">'
    s=re.sub(r'</head>',css+'\n</head>',s,count=1,flags=re.I)
    tags=['<script defer src="/ksh/heimslig/assets/v4/heimslig-v4.js?v=5.1"></script>']
    if has_viewer:
        tags += ['<script defer src="/ksh/heimslig/assets/v5/'+f+'?v=5.1"></script>' for f in ('room-core.js','room-renderer.js','room-studio.js')]
    s=re.sub(r'</body>','\n<!-- HEIMSLIG_V5_START -->\n'+'\n'.join(tags)+'\n<!-- HEIMSLIG_V5_END -->\n</body>',s,count=1,flags=re.I)
    plans.append((p,s))
if not viewers:raise SystemExit('Fant ikke kjent showroom. Ingen endringer utført.')
backup.mkdir(parents=True,exist_ok=False)
for p,_ in plans:
    dest=backup/p.relative_to(root);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
for name in ('room-core.js','room-renderer.js','room-studio.js','room-studio.css','heimslig-v4.js'):
    relative=pathlib.Path('assets')/('v4' if name=='heimslig-v4.js' else 'v5')/name
    target=root/relative
    if target.exists():
        dest=backup/relative;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(target,dest)
    target.parent.mkdir(parents=True,exist_ok=True)
    staged=target.with_suffix(target.suffix+'.tmp');shutil.copyfile(tmp/name,staged);staged.chmod(0o644);staged.replace(target)
for p,s in plans:
    staged=p.with_suffix('.html.tmp');staged.write_text(s,encoding='utf-8');staged.chmod(p.stat().st_mode & 0o777);staged.replace(p)
print('Oppdatert',len(plans),'sider og',viewers,'romvisninger.')
print('Sikkerhetskopi:',backup)
print('Tilbakestill: sudo cp -a '+str(backup)+'/. '+str(root)+'/')
PY
printf '%s\n' 'Heimslig v5 installert: https://setai.no/ksh/heimslig/3d-studio/'
