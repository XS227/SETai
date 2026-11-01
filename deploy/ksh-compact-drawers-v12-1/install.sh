#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-/var/www/setai/ksh/fliskonkurrenten}"
RAW="https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-compact-drawers-v12-1/panel.css"
HTML="$ROOT/showroom/index.html"
CSS="$ROOT/assets/ksh-drawers-v12-1.css"
[[ -f "$HTML" && -f "$ROOT/assets/ksh-ux-v12.css" ]] || { echo "Requires installed UX v12; no files changed" >&2;exit 2; }
TMP="$(mktemp -d)";trap 'rm -rf "$TMP"' EXIT
curl -fLsS --max-time 45 --retry 3 "$RAW" -o "$TMP/panel.css"
python3 - "$TMP/panel.css" "$HTML" <<'PY'
from pathlib import Path
import sys
css=Path(sys.argv[1]).read_text()
html=Path(sys.argv[2]).read_text()
for marker in ('height:min(278px,35vh)','height:min(206px,25dvh)','overflow-y:auto','sr5-drawer'):
 assert marker in css,marker
assert html.lower().count('</head>')==1
assert 'ksh-ux-v12.css' in html
print('PASS: explicit compact panel dimensions and showroom CSS link')
PY
BACKUP="/var/backups/setaei/ksh-drawers-v12-1-$(date +%Y%m%d-%H%M%S)-$$"
sudo -n mkdir -p "$BACKUP"
sudo -n cp -a "$HTML" "$BACKUP/showroom-index.html"
if [[ -f "$CSS" ]];then sudo -n cp -a "$CSS" "$BACKUP/previous-panel.css";fi
sudo -n cp "$TMP/panel.css" "$CSS.tmp"
sudo -n chmod 0644 "$CSS.tmp"
sudo -n mv "$CSS.tmp" "$CSS"
sudo -n python3 - "$HTML" <<'PY'
from pathlib import Path
import re,sys
path=Path(sys.argv[1])
html=path.read_text()
html=re.sub(r'<link\b[^>]*href=["\'][^"\']*ksh-drawers-v12-1\.css[^"\']*["\'][^>]*>','',html,flags=re.I)
tag='<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/ksh-drawers-v12-1.css?v=12.1">'
assert html.lower().count('</head>')==1
html=re.sub('</head>',tag+'</head>',html,count=1,flags=re.I)
staged=path.with_name('index.html.ksh12-1.tmp')
staged.write_text(html)
staged.chmod(path.stat().st_mode & 0o777)
staged.replace(path)
PY
echo "PUBLISHED KSH v12.1 compact panel size. Backup: $BACKUP"
echo "https://setai.no/ksh/fliskonkurrenten/showroom/?v=12.1"
