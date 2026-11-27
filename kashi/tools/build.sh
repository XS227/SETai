#!/usr/bin/env bash
# Build dist/ from site/ with a cache-busting version stamp.
set -euo pipefail
cd "$(dirname "$0")"
V="$(date -u +%Y%m%d%H%M%S)"
rm -rf dist && cp -r ../v2 dist
sed -i "s/__V__/$V/g" dist/index.html
echo "Built dist/ version $V"
