#!/usr/bin/env bash
# SETAEI /key/research/ GitHub-pinned additive deploy.
# Never stop workers, edit /key/, change Nginx, or touch /key/api/.
set -Eeuo pipefail
umask 022
MODE=inspect
TARGET=""
PIN=d12c7aae9a221de9bf4f16fb27280fb201b36693
BASE="https://raw.githubusercontent.com/XS227/SETai/$PIN/key-research"
for arg in "$@"; do
  case "$arg" in
    --inspect) MODE=inspect ;;
    --install) MODE=install ;;
    --target=*) TARGET="${arg#--target=}" ;;
    *) echo "Unrecognized argument: $arg" >&2; exit 2 ;;
  esac
done
echo "SETAEI Research deployment: mode=$MODE host=$(hostname)"
if [[ "$MODE" == inspect ]]; then
  echo "Read-only route inventory:"
  nginx -T 2>&1 | grep -E -C 3 'server_name.*setai\.no|location[[:space:]]+.*(/key|key/)|root[[:space:]]+|alias[[:space:]]+' | head -160 || true
  echo "Live API HTTP status:"
  curl -sS -o /dev/null -w '%{http_code}\n' --max-time 10 'https://setai.no/key/api/latest' || true
  echo "No files or services changed."
  exit 0
fi
[[ $EUID -eq 0 ]] || { echo "Install requires root/sudo." >&2; exit 2; }
[[ "$TARGET" == /* ]] || { echo "Specify verified absolute --target=/.../key/research" >&2; exit 2; }
TARGET="${TARGET%/}"
[[ "$(basename "$TARGET")" == research && "$(basename "$(dirname "$TARGET")")" == key ]] || {
  echo "Refusing unexpected target; expected /.../key/research" >&2; exit 2;
}
KEYDIR="$(dirname "$TARGET")"
[[ -d "$KEYDIR" && ( -f "$KEYDIR/index.html" || -f "$KEYDIR/index.php" ) ]] || {
  echo "Refusing unknown /key static document root. Use --inspect and verify the route first." >&2; exit 3;
}
[[ ! -e "$TARGET" ]] || { echo "Refusing overwrite: $TARGET exists." >&2; exit 3; }
for cmd in curl grep mktemp mv; do command -v "$cmd" >/dev/null || { echo "Missing $cmd" >&2; exit 3; }; done
PRE="$(mktemp)"; POST="$(mktemp)"; STAGE="$(mktemp -d "$KEYDIR/.research-stage.XXXXXXXX")"
cleanup(){ rm -f "$PRE" "$POST"; [[ -d "$STAGE" ]] && rm -rf -- "$STAGE"; }
trap cleanup EXIT
curl --fail --silent --show-error --max-time 15 'https://setai.no/key/api/latest' -o "$PRE"
[[ -s "$PRE" ]] || { echo "Counter preflight failed; no change." >&2; exit 4; }
for f in index.html assets/styles.css assets/multi-target.js experiment-01/index.html experiment-02/index.html journal/index.html; do
  mkdir -p "$STAGE/$(dirname "$f")"
  curl --fail --location --silent --show-error --retry 2 --max-time 25 "$BASE/$f" -o "$STAGE/$f"
  [[ -s "$STAGE/$f" ]] || { echo "Empty download: $f" >&2; exit 5; }
done
grep -q 'Cryptographic Randomness Research' "$STAGE/index.html" || { echo "Invalid research index"; exit 5; }
grep -q 'SETAEI' "$STAGE/experiment-02/index.html" || { echo "Invalid study file"; exit 5; }
find "$STAGE" -type d -exec chmod 755 {} +
find "$STAGE" -type f -exec chmod 644 {} +
printf 'GitHub commit: %s\n' "$PIN" > "$STAGE/.research-build"
mv -- "$STAGE" "$TARGET"
echo "Files atomically installed under: $TARGET"
if ! curl --fail --silent --show-error --max-time 15 'https://setai.no/key/api/latest' -o "$POST" || [[ ! -s "$POST" ]]; then
  mv -- "$TARGET" "$KEYDIR/.research-rollback-$(date -u +%Y%m%dT%H%M%SZ)"
  echo "Rollback: live API stopped responding; research directory renamed out of service." >&2
  exit 6
fi
HTTP="$(curl --silent --show-error --location -o /dev/null -w '%{http_code}' --max-time 15 'https://setai.no/key/research/' || true)"
if [[ "$HTTP" != 200 ]]; then
  echo "Static files installed but HTTP $HTTP: Nginx/proxy route requires separate review." >&2
  echo "No Nginx configuration or existing live services were modified."
  exit 7
fi
echo "SUCCESS: /key/research/ HTTP 200; live counter API responding; /key/ untouched."
