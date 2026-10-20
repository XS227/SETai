#!/usr/bin/env bash
set -euo pipefail
eurojackpot_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
eurojackpot_public_dir="${1:-$eurojackpot_dir}"
test -d "$eurojackpot_public_dir"
exec 9>"$eurojackpot_dir/.refresh.lock"
flock -n 9 || exit 0
# Complete and validate the whole update before replacing published files.
stage_dir="$(mktemp -d "$eurojackpot_dir/refresh.XXXXXXXX")"
trap 'rm -rf -- "$stage_dir"' EXIT
cp -a "$eurojackpot_public_dir/." "$stage_dir/"
python3 "$eurojackpot_dir/update_history.py" --output "$stage_dir/history.js"
node "$eurojackpot_dir/freeze_proposals.js" "$stage_dir"
python3 "$eurojackpot_dir/update_research.py" --output "$stage_dir/research.js"
python3 "$eurojackpot_dir/update_site.py" --public-dir "$stage_dir"
node "$eurojackpot_dir/build_current_review.js" "$stage_dir"
for name in history.js proposals.js research.js site-data.js index.html results.html; do
  install -m 644 "$stage_dir/$name" "$eurojackpot_public_dir/$name.new"
  mv -f "$eurojackpot_public_dir/$name.new" "$eurojackpot_public_dir/$name"
done
for asset in "$stage_dir"/review-20*.html "$stage_dir"/review-20*.json; do
  name="$(basename -- "$asset")"
  install -m 644 "$asset" "$eurojackpot_public_dir/$name.new"
  mv -f "$eurojackpot_public_dir/$name.new" "$eurojackpot_public_dir/$name"
done
