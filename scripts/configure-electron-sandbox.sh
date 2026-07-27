#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SANDBOX="$ROOT/node_modules/electron/dist/chrome-sandbox"

[ -f "$SANDBOX" ] || { echo "Electron chrome-sandbox was not found. Run npm install first." >&2; exit 1; }

OWNER="$(stat -c '%U' "$SANDBOX")"
MODE="$(stat -c '%a' "$SANDBOX")"
if [ "$OWNER" = "root" ] && [ "$MODE" = "4755" ]; then
  echo "Electron sandbox permissions are correct: root/root 4755"
  exit 0
fi

command -v sudo >/dev/null || {
  echo "sudo is required once to configure Electron's Linux sandbox securely." >&2
  echo "Run: sudo chown root:root '$SANDBOX' && sudo chmod 4755 '$SANDBOX'" >&2
  exit 1
}

sudo chown root:root "$SANDBOX"
sudo chmod 4755 "$SANDBOX"

OWNER="$(stat -c '%U' "$SANDBOX")"
GROUP="$(stat -c '%G' "$SANDBOX")"
MODE="$(stat -c '%a' "$SANDBOX")"
[ "$OWNER" = "root" ] && [ "$GROUP" = "root" ] && [ "$MODE" = "4755" ] || {
  echo "Electron sandbox permission verification failed: $OWNER/$GROUP $MODE" >&2
  exit 1
}
echo "Electron sandbox configured securely: $OWNER/$GROUP $MODE"
