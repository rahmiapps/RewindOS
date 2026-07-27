#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
[ -d node_modules ] || npm install
"$ROOT/scripts/configure-electron-sandbox.sh"
npm start
