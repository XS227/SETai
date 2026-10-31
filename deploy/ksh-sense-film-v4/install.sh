#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-/var/www/setai/ksh}"
RAW="${KSH_SENSE_FILM_SOURCE_URL:-https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-sense-film-v4}"
PAGE="$ROOT/fliskonkurrenten/produkt/sanipro-sense/index.html"
for file in "$PAGE" "$ROOT/assets/ksh-v6/room-data.js" "$ROOT/assets/ksh-v6/room-renderer.js" "$ROOT/fliskonkurrenten/assets/sense-v3/sense-v3.glb" "$ROOT/fliskonkurrenten/assets/sense-v3/cinematic.css"; do
 [[ -s "$file" ]] || { echo "Mangler Sense v3-forutsetning: $file" >&2; exit 2; }
done
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/media"
for file in index.html landing.css landing.js room.js media/sense.webm media/sense.mp4 media/poster.jpg SHA256SUMS; do
 curl -fLsS --retry 2 --max-time 90 "$RAW/$file" -o "$TMP/$file"
done
(cd "$TMP" && sha256sum -c SHA256SUMS)
if command -v node >/dev/null; then
 node --check "$TMP/landing.js"
 node --input-type=module --check < "$TMP/room.js"
fi
BACKUP="${KSH_BACKUP_ROOT:-/var/backups/setaei}/sense-film-v4-$(date +%Y%m%d-%H%M%S)-$$"
python3 - "$ROOT" "$TMP" "$BACKUP" <<'PY'
from pathlib import Path
import re,shutil,sys
root,tmp,backup=map(Path,sys.argv[1:]);page=root/'fliskonkurrenten/produkt/sanipro-sense/index.html'
source=page.read_text();footers=re.findall(r'<footer\b.*?</footer>',source,re.S|re.I)
if len(footers)!=1:raise SystemExit('Forventet én eksisterende footer. Ingen sider er endret.')
updated=(tmp/'index.html').read_text();updated=re.sub(r'<footer\b.*?</footer>',lambda _:footers[0],updated,flags=re.S|re.I)
plans={page:updated.encode()}
for name in ('landing.css','landing.js','room.js','media/sense.webm','media/sense.mp4','media/poster.jpg'):
 plans[root/'fliskonkurrenten/assets/sense-film-v4'/name]=(tmp/name).read_bytes()
backup.mkdir(parents=True,exist_ok=False);created=[]
for p in plans:
 if p.exists():
  b=backup/p.relative_to(root);b.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,b)
 else:created.append(p)
written=[]
try:
 for p,data in sorted(plans.items(),key=lambda item:item[0].suffix=='.html'):
  p.parent.mkdir(parents=True,exist_ok=True);t=p.with_name(p.name+'.film-v4.tmp');t.write_bytes(data);t.chmod(0o644);t.replace(p);written.append(p)
except BaseException:
 for p in reversed(written):
  old=backup/p.relative_to(root)
  if old.exists():shutil.copy2(old,p)
  elif p in created:p.unlink(missing_ok=True)
 raise
print('Sense Film v4 installert. Eksisterende footer er bevart.')
print('Sikkerhetskopi:',backup)
print('Tilbakestill: sudo cp -a '+str(backup)+'/. '+str(root)+'/')
PY
printf '%s\n' 'https://setai.no/ksh/fliskonkurrenten/produkt/sanipro-sense/'
