#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-/var/www/setai/ksh}"
RAW="${KSH_SENSE_SOURCE_URL:-https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-sense-v3}"
BASE="${KSH_SOURCE_URL:-https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-v6}"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
for file in sense.html cinematic.js cinematic.css builder.py shared.js SHA256SUMS; do curl -fsSL --retry 2 --max-time 60 "$RAW/$file" -o "$TMP/$file"; done
(cd "$TMP" && sha256sum -c SHA256SUMS)
python3 "$TMP/builder.py" --output "$TMP/sense-v3.glb"
# All prerequisites must exist before the shared upgrade changes any pages.
for slug in vedum-flow-takegronn zup-spilepanel-eik-sort colorker-althea-sand-dekor; do
 [[ -s "$ROOT/fliskonkurrenten/produkt/$slug/assets/model.glb" ]] || { echo "Mangler produktmodell: $slug" >&2; exit 2; }
done
[[ -s "$ROOT/fliskonkurrenten/produkt/sanipro-sense/assets/sense-hero.webp" ]] || { echo 'Mangler Sense-produktbilder.' >&2; exit 2; }
curl -fsSL "$BASE/install.sh" -o "$TMP/base-install.sh"
KSH_SOURCE_URL="$BASE" bash "$TMP/base-install.sh" "$ROOT"
BACKUP="${KSH_BACKUP_ROOT:-/var/backups/setaei}/sense-v3-$(date +%Y%m%d-%H%M%S)-$$"
python3 - "$ROOT" "$TMP" "$BACKUP" <<'PY'
from pathlib import Path
import re,shutil,sys
root,tmp,backup=map(Path,sys.argv[1:]);page=root/'fliskonkurrenten/produkt/sanipro-sense/index.html'
current=page.read_text();footer=re.search(r'<footer\b.*?</footer>',current,re.S).group()
s=(tmp/'sense.html').read_text();s=re.sub(r'<footer\b.*?</footer>',footer,s,flags=re.S);s=s.replace('<body>','<body data-ksh-brand="fliskonkurrenten">');s=s.replace('</head>','<link rel="stylesheet" href="/ksh/assets/ksh-v6/brand.css?v=6.1"></head>')
plans={page:s.encode(),root/'fliskonkurrenten/assets/ksh-four-products-v2.js':(tmp/'shared.js').read_bytes()}
for n in ['cinematic.js','cinematic.css','sense-v3.glb']:plans[root/'fliskonkurrenten/assets/sense-v3'/n]=(tmp/n).read_bytes()
backup.mkdir(parents=True)
for p in plans:
 if p.exists():
  b=backup/p.relative_to(root);b.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,b)
for p,data in sorted(plans.items(),key=lambda pair:pair[0].suffix=='.html'):
 p.parent.mkdir(parents=True,exist_ok=True);t=p.with_name(p.name+'.tmp');t.write_bytes(data);t.chmod(0o644);t.replace(p)
print('Sense v3 installert. Sikkerhetskopi:',backup)
print('Tilbakestill: sudo cp -a '+str(backup)+'/. '+str(root)+'/')
PY
printf '%s\n' 'https://setai.no/ksh/fliskonkurrenten/produkt/sanipro-sense/'
