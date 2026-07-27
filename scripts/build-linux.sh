#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "RewindOS Linux build"
command -v node >/dev/null || { echo "Node.js 22 or newer is required."; exit 1; }
command -v npm >/dev/null || { echo "npm is required."; exit 1; }
MAJOR="$(node --version | sed 's/^v//' | cut -d. -f1)"
[ "$MAJOR" -ge 22 ] || { echo "Node.js 22 or newer is required."; exit 1; }

if [ -f package-lock.json ]; then npm ci; else npm install; fi
"$ROOT/scripts/configure-electron-sandbox.sh"
npm run verify
npm run audit
if command -v xvfb-run >/dev/null; then
  xvfb-run -a npm run smoke
elif [ "${REWINDOS_SKIP_SMOKE:-0}" = "1" ]; then
  echo "WARNING: graphical smoke test explicitly skipped because REWINDOS_SKIP_SMOKE=1. Do not publish this build without a separate smoke test." >&2
else
  echo "xvfb-run is required for the graphical smoke test. Install xvfb, or set REWINDOS_SKIP_SMOKE=1 only for local troubleshooting." >&2
  exit 1
fi
npm run dist:linux

(
  cd dist
  find . -maxdepth 1 -type f ! -name 'SHA256SUMS-Linux.txt' -printf '%f\0' \
    | sort -z \
    | xargs -0 -r sha256sum > SHA256SUMS-Linux.txt
)

echo "Finished. Files are in $ROOT/dist"
find "$ROOT/dist" -maxdepth 1 -type f -printf '%f\n' 2>/dev/null || ls -la "$ROOT/dist"
