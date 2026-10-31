#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-/var/www/setai/ksh}"
RAW="${KSH_SOURCE_URL:-https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-v6}"
[[ -f "$ROOT/heimslig/3d-studio/index.html" ]] || { echo 'Mangler eksisterende KSH/Heimslig-studio.' >&2; exit 2; }
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
for file in brand.css room-data.js room-renderer.js room-studio.js room-studio.css social.js site.js footer.html identity.html apply_site.py assets-manifest.json SOURCES.md SHA256SUMS; do
  curl -fLsS --retry 2 --max-time 60 "$RAW/$file" -o "$TMP/$file"
done
(cd "$TMP" && sha256sum -c SHA256SUMS)
python3 - "$TMP" <<'PY'
from pathlib import Path
import concurrent.futures,hashlib,json,sys,urllib.request
root=Path(sys.argv[1]);assets=json.loads((root/'assets-manifest.json').read_text())
def download(item):
    p=(root/item['path']).resolve()
    if not p.is_relative_to(root) or item['path'].split('/')[0] not in ('assets','vendor'):raise ValueError('Ugyldig ressurssti')
    data=urllib.request.urlopen(item['url'],timeout=60).read()
    if hashlib.sha256(data).hexdigest()!=item['sha256']:raise ValueError('Endret ressurs: '+item['path'])
    p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(download,assets))
print('Verifisert',len(assets),'material-, logo- og 3D-ressurser.')
PY
if command -v node >/dev/null; then
  for file in room-data.js social.js site.js; do node --check "$TMP/$file"; done
  for file in room-renderer.js room-studio.js; do node --input-type=module --check < "$TMP/$file"; done
fi
BACKUP="${KSH_BACKUP_ROOT:-/var/backups/setaei}/ksh-v6-$(date +%Y%m%d-%H%M%S)-$$"
python3 "$TMP/apply_site.py" "$ROOT" "$TMP" "$BACKUP"
printf '%s\n' 'KSH v6 installert.' 'Profil: https://setai.no/ksh/identitet/' 'Romstudio: https://setai.no/ksh/heimslig/3d-studio/'
