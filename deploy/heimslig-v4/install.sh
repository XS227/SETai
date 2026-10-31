#!/usr/bin/env bash
# Heimslig prototype v4 installer — run on SETAEI VPS. Idempotent and backed up.
set -euo pipefail
ROOT="/var/www/setai/ksh/heimslig"
if [ "$#" -ge 1 ]; then ROOT="$1"; fi
RAW="https://raw.githubusercontent.com/XS227/SETai/main/deploy/heimslig-v4"
[[ -d "$ROOT" ]] || { echo "FEIL: Heimslig-katalogen finnes ikke: $ROOT" >&2; exit 2; }
command -v curl >/dev/null || { echo "Mangler curl" >&2; exit 3; }
command -v python3 >/dev/null || { echo "Mangler python3" >&2; exit 3; }
mkdir -p "$ROOT/assets/v4" "$ROOT/social"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
for f in heimslig-v4.css heimslig-v4.js social/index.html social/site-images.js social/posts.json; do
  mkdir -p "$TMP/$(dirname "$f")"
  curl --fail --silent --show-error --location --retry 2 "$RAW/$f" -o "$TMP/$f"
  test -s "$TMP/$f" || { echo "Manglende fil: $f" >&2; exit 4; }
done
install -m 0644 "$TMP/heimslig-v4.css" "$ROOT/assets/v4/heimslig-v4.css"
install -m 0644 "$TMP/heimslig-v4.js" "$ROOT/assets/v4/heimslig-v4.js"
install -m 0644 "$TMP/social/index.html" "$ROOT/social/index.html"
install -m 0644 "$TMP/social/site-images.js" "$ROOT/social/site-images.js"
if [[ ! -f "$ROOT/social/posts.json" ]]; then
  install -m 0644 "$TMP/social/posts.json" "$ROOT/social/posts.json"
fi
python3 - "$ROOT" <<'PY'
import pathlib, re, shutil, sys
root=pathlib.Path(sys.argv[1])
css='<link rel="stylesheet" href="/ksh/heimslig/assets/v4/heimslig-v4.css?v=4">'
js='<script src="/ksh/heimslig/assets/v4/heimslig-v4.js?v=4" defer></script>'
count=0
for p in sorted(root.rglob('index.html')):
    if p == root/'social'/'index.html': continue
    if any(part.startswith('.') or part in ('node_modules','vendor','dist','backups') for part in p.relative_to(root).parts): continue
    try: original=p.read_text(encoding='utf-8')
    except (UnicodeError,PermissionError): continue
    if not re.search(r'</head\s*>',original,re.I) or not re.search(r'</body\s*>',original,re.I): continue
    changed=original
    if '/assets/v4/heimslig-v4.css' not in changed:
        changed=re.sub(r'</head\s*>',css+'\n</head>',changed,count=1,flags=re.I)
    if '/assets/v4/heimslig-v4.js' not in changed:
        changed=re.sub(r'</body\s*>',js+'\n</body>',changed,count=1,flags=re.I)
    if changed==original: continue
    backup=p.with_name(p.name+'.before-heimslig-v4.bak')
    if not backup.exists(): shutil.copy2(p,backup)
    p.write_text(changed,encoding='utf-8')
    count+=1
print('HEIMSLIG V4: updated',count,'existing pages; backups saved once.')
print('Social: /ksh/heimslig/social/')
print('Calculator: /ksh/heimslig/produkter/stoler/#heimslig-kalkulator')
PY
for path in social/ assets/v4/heimslig-v4.js produkter/stoler/; do
  status=$(curl --max-time 12 -L -s -o /dev/null -w '%{http_code}' "https://setai.no/ksh/heimslig/$path" || true)
  echo "Public $path: HTTP $status"
done
echo "Heimslig v4 installed; nginx restart unnecessary for static pages."
