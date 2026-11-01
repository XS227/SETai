#!/usr/bin/env bash
# KASHI bilingual supplier/tax analysis + link to original SEO/market analysis.
set -euo pipefail
ROOT="/var/www/setai/kashi"
if [[ "$#" -gt 0 ]]; then ROOT="$1"; fi
[[ "$ROOT" == /* && -d "$ROOT" && -f "$ROOT/index.html" ]] || { echo "ERROR: KASHI root missing: $ROOT" >&2;exit 2; }
for c in python3 curl;do command -v "$c" >/dev/null || { echo "ERROR: $c required" >&2;exit 2; };done
# Pin both HTML assets to the same reviewed GitHub commit to avoid CDN branch drift.
REF="1b573255bca8bb2ab42809eb384fe3da8ca2c8db"
BASE="https://raw.githubusercontent.com/XS227/SETai/$REF/deploy/kashi-partners-v1"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
for file in index.html fa/index.html;do
 mkdir -p "$TMP/$(dirname "$file")"
 curl -fLsS --retry 3 --max-time 35 "$BASE/$file" -o "$TMP/$file"
 test -s "$TMP/$file" || { echo "Missing $file" >&2;exit 2; }
done
python3 - "$TMP" <<'PY'
from pathlib import Path
import re,sys
tmp=Path(sys.argv[1])
no=(tmp/"index.html").read_text(encoding="utf-8")
fa=(tmp/"fa/index.html").read_text(encoding="utf-8")
for content in (no,fa):
 assert content.count("</html>")==1 and len(content)>15000
 assert "noindex" in content and "Setareh Meybod Tile" in content
 assert "Tabriz Tile Group" in content and "Persepolis Tile" in content
 assert ("24%" in content or "24 %" in content or "۲۴٪" in content) and ("0%" in content or "0 %" in content)
 assert 'https://www.skatturinn.is/' in content
 assert content.count("<script>")==1 and content.count("</script>")==1
assert 'id="import2026"' in no and 'id="vat"' in no and '/kashi/partners/fa/' in no
assert 'lang="fa" dir="rtl"' in fa and 'id="calculator"' in fa
assert 'id="export"' in fa and '/kashi/seo/' in fa
for lang,s in (("no",no),("fa",fa)):
 js=re.search(r"<script>(.*?)</script>",s,re.S)
 assert js
 (tmp/f"{lang}.js").write_text(js.group(1),encoding="utf-8")
print("Preflight: Norwegian + Persian RTL pages; 2026 HS 6907 duty and 24% VAT, CSV and calculators.")
PY
if command -v node >/dev/null;then node --check "$TMP/no.js";node --check "$TMP/fa.js";echo "JS syntax: OK";fi
STAMP="$(date +%Y%m%d-%H%M%S)-$$"
BACKUP="/var/backups/setaei/kashi-partners-$STAMP"
install -d -m 0755 "$ROOT/partners/fa" "$BACKUP"
for rel in partners/index.html partners/fa/index.html seo/index.html;do
 if [[ -f "$ROOT/$rel" ]];then
  mkdir -p "$BACKUP/$(dirname "$rel")"
  cp -p "$ROOT/$rel" "$BACKUP/$rel"
 fi
done
for file in index.html fa/index.html;do
 dest="$ROOT/partners/$file"
 cp "$TMP/$file" "$dest.tmp"
 chmod 0644 "$dest.tmp"
 mv -f "$dest.tmp" "$dest"
done
# The original KASHI SEO market analysis is retained unchanged except for one
# non-invasive navigation link to the import analysis in its existing footer.
if [[ -f "$ROOT/seo/index.html" ]];then
 python3 - "$ROOT/seo/index.html" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
s=p.read_text(encoding="utf-8")
anchor='<a data-i="k880e0be" href="/kashi/seo/">Market research</a>'
link='<a href="/kashi/partners/">Import / واردات</a>'
if link not in s:
 if anchor in s:
  s=s.replace(anchor,anchor+link,1)
  tmp=p.with_suffix(".html.tmp")
  tmp.write_text(s,encoding="utf-8")
  tmp.chmod(p.stat().st_mode & 0o777)
  tmp.replace(p)
  print("Original /kashi/seo/ now links to the import analysis.")
 else:
  print("Skipped SEO footer link: markup changed, original preserved.")
PY
fi
for url in "https://setai.no/kashi/partners/" "https://setai.no/kashi/partners/fa/" "https://setai.no/kashi/seo/";do
 curl -fLsS --max-time 15 -o /dev/null -w 'HTTP %{http_code} · %{url_effective}\n' "$url?v=$(date +%s)"
done
echo "Backup: $BACKUP"
echo "Published: both languages; original SEO analysis preserved."
