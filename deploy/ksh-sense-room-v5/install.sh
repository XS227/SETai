#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-/var/www/setai/ksh}"
RAW="${KSH_SENSE_ROOM_SOURCE_URL:-https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-sense-room-v5}"
PAGE="$ROOT/fliskonkurrenten/produkt/sanipro-sense/index.html"
for file in "$PAGE" "$ROOT/fliskonkurrenten/assets/sense-film-v4/landing.js" "$ROOT/fliskonkurrenten/assets/sense-film-v4/landing.css" "$ROOT/assets/ksh-v6/room-renderer.js"; do
 [[ -s "$file" ]] || { echo "Mangler eksisterende Sense Film v4: $file" >&2; exit 2; }
done
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
for file in room.js room.css layout.js room-renderer.js SHA256SUMS; do curl -fLsS --retry 2 --max-time 60 "$RAW/$file" -o "$TMP/$file"; done
(cd "$TMP" && sha256sum -c SHA256SUMS)
if command -v node >/dev/null; then
 for file in room.js layout.js room-renderer.js; do node --input-type=module --check < "$TMP/$file"; done
fi
BACKUP="${KSH_BACKUP_ROOT:-/var/backups/setaei}/sense-room-v5-$(date +%Y%m%d-%H%M%S)-$$"
python3 - "$ROOT" "$TMP" "$BACKUP" <<'PY'
from pathlib import Path
import re,shutil,sys
root,tmp,backup=map(Path,sys.argv[1:]);page=root/'fliskonkurrenten/produkt/sanipro-sense/index.html'
s=page.read_text()
if 'sf-film' not in s:raise SystemExit('Forventet Sense Film v4. Ingen endringer utført.')
s=re.sub(r'/sense-film-v4/landing\.(css|js)\?v=[\d.]+',lambda m:'/sense-film-v4/landing.'+m[1]+'?v=5',s)
s=re.sub(r'<link\b[^>]*href=["\']/ksh/fliskonkurrenten/assets/sense-room-v5/room\.css[^"\']*["\'][^>]*>','',s)
s=s.replace('</head>','<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/sense-room-v5/room.css?v=5"></head>',1)
loader=root/'fliskonkurrenten/assets/sense-film-v4/landing.js';js=loader.read_text()
if '/sense-film-v4/room.js?v=4' not in js and '/sense-room-v5/room.js?v=5' not in js:raise SystemExit('Ukjent showroom-loader. Ingen endringer utført.')
js=js.replace('/sense-film-v4/room.js?v=4','/sense-room-v5/room.js?v=5')
csspath=root/'fliskonkurrenten/assets/sense-film-v4/landing.css';css=csspath.read_text().replace('button,a:focus-visible','button:focus-visible,a:focus-visible')
plans={page:s.encode(),loader:js.encode(),csspath:css.encode(),root/'assets/ksh-v6/room-renderer.js':(tmp/'room-renderer.js').read_bytes()}
for n in ('room.js','room.css','layout.js'):plans[root/'fliskonkurrenten/assets/sense-room-v5'/n]=(tmp/n).read_bytes()
backup.mkdir(parents=True,exist_ok=False);created=[]
for p in plans:
 if p.exists():
  b=backup/p.relative_to(root);b.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,b)
 else:created.append(p)
written=[]
try:
 for p,data in sorted(plans.items(),key=lambda item:item[0].suffix=='.html'):
  p.parent.mkdir(parents=True,exist_ok=True);t=p.with_name(p.name+'.room-v5.tmp');t.write_bytes(data);t.chmod(0o644);t.replace(p);written.append(p)
except BaseException:
 for p in reversed(written):
  old=backup/p.relative_to(root)
  if old.exists():shutil.copy2(old,p)
  elif p in created:p.unlink(missing_ok=True)
 raise
print('Sense Room v5 installert: korrigerte modellakser, veggmontering, ikonvalg og live pris.')
print('Sikkerhetskopi:',backup)
print('Tilbakestill: sudo cp -a '+str(backup)+'/. '+str(root)+'/')
PY
printf '%s\n' 'https://setai.no/ksh/fliskonkurrenten/produkt/sanipro-sense/#se3d'
