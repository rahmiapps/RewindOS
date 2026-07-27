#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
npm run verify
node --check src/main/main.cjs
node --check src/main/preload.cjs
node --check src/renderer/app.js
echo "RewindOS source verification completed."
