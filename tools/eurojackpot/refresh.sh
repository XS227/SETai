#!/usr/bin/env bash
set -euo pipefail
eurojackpot_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
eurojackpot_public_dir="${1:-$eurojackpot_dir}"
test -d "$eurojackpot_public_dir"
exec 9>"$eurojackpot_dir/.refresh.lock"
flock -n 9 || exit 0
python3 "$eurojackpot_dir/update_history.py" --output "$eurojackpot_public_dir/history.js"
node "$eurojackpot_dir/freeze_proposals.js" "$eurojackpot_public_dir"
python3 "$eurojackpot_dir/update_research.py" --output "$eurojackpot_public_dir/research.js"
