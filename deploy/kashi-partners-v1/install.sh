#!/usr/bin/env bash
# KASHI supplier comparison v1: isolated new route, no homepage modification.
set -euo pipefail
ROOT="/var/www/setai/kashi"
if [[ "$#" -gt 0 ]]; then ROOT="$1"; fi
[[ "$ROOT" == /* && -d "$ROOT" && -f "$ROOT/index.html" ]] || { echo "ERROR: KASHI document root not found: $ROOT" >&2; exit 2; }
command -v curl >/dev/null || { echo "ERROR: curl required" >&2; exit 2; }
RAW="https://raw.githubusercontent.com/XS227/SETai/35cff570db75c4d63efdd8ad4f8702551e395b80/deploy/kashi-partners-v1/index.html"
TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT
curl -fLsS --retry 3 --max-time 30 "$RAW" -o "$TMP"
python3 - "$TMP" <<'PY'
from pathlib import Path
import sys
s=Path(sys.argv[1]).read_text(encoding="utf-8")
required=["KASHI | Leverandørkontroll", "Setareh Meybod Tile","Tabriz Tile Group",
          "Persepolis Tile","IR-Build / Khatam","LuxeCeram","Semnan",
          'id="kalkulator"','id="rows"','name="robots"','navigator.clipboard']
for term in required:
    assert term in s, f"Preflight failed: {term}"
assert s.count("</html>")==1 and len(s)>15000
print("Preflight OK: 6 candidates, price calculator, CSV export, noindex.")
PY
DEST="$ROOT/partners/index.html"
install -d -m 0755 "$ROOT/partners"
if [[ -e "$DEST" ]]; then
  BACKUP="/var/backups/setaei/kashi-partners-$(date +%Y%m%d-%H%M%S)-$$"
  install -d -m 0755 "$BACKUP"
  cp -p "$DEST" "$BACKUP/index.html"
  echo "Existing file backed up: $BACKUP/index.html"
fi
cp "$TMP" "$DEST.tmp"
chmod 0644 "$DEST.tmp"
mv -f "$DEST.tmp" "$DEST"
echo "PUBLISHED: $DEST"
curl -fLsS --max-time 15 -o /dev/null -w 'HTTP %{http_code} for %{url_effective}\n' "https://setai.no/kashi/partners/?v=$(date +%s)"
echo "NOTE: noindex is not authentication. This page contains public supplier research only."
