#!/bin/bash
set -euo pipefail
SOURCE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
PUBLIC_ROOT="${LOTTERY_PUBLIC_ROOT:-/var/www/setai}"
OPS_DIR="${LOTTERY_OPS_DIR:-/opt/setai-lottery-labs}"
mkdir -p "$OPS_DIR"
exec 9>"$OPS_DIR/refresh.lock"
flock -n 9 || exit 0
stage_dir="$(mktemp -d "$OPS_DIR/refresh.XXXXXXXX")"
trap 'rm -rf -- "$stage_dir"' EXIT
for game in Lotto Vikinglotto; do
  mkdir -p "$stage_dir/$game"
  cp "$PUBLIC_ROOT/$game/history.json" "$stage_dir/$game/"
  cp "$PUBLIC_ROOT/$game/forecasts.json" "$stage_dir/$game/"
done
export LOTTERY_LAB_ROOT="$stage_dir"
python3 "$SOURCE_DIR/tools/lottery-lab/collect.py"
node "$SOURCE_DIR/tools/lottery-lab/freeze.js"
python3 "$SOURCE_DIR/tools/lottery-lab/build.py"
node "$SOURCE_DIR/tools/lottery-lab/test.js"
for game in Lotto Vikinglotto; do
  for asset in history.json analysis.json forecasts.json index.html results.html; do
    install -m 644 "$stage_dir/$game/$asset" "$PUBLIC_ROOT/$game/$asset.new"
    mv -f "$PUBLIC_ROOT/$game/$asset.new" "$PUBLIC_ROOT/$game/$asset"
  done
done
date -u '+Completed official Lotto and Vikinglotto refresh: %Y-%m-%dT%H:%M:%SZ'
