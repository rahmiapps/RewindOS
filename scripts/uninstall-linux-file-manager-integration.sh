#!/usr/bin/env bash
set -euo pipefail

TARGETS=(
  "$HOME/.local/share/nautilus/scripts/Protect with RewindOS"
  "$HOME/.local/share/nemo/scripts/Protect with RewindOS"
  "$HOME/.local/share/kio/servicemenus/rewindos-protect.desktop"
  "$HOME/.local/share/kservices5/ServiceMenus/rewindos-protect.desktop"
)

for target in "${TARGETS[@]}"; do
  if [ -L "$target" ]; then
    echo "Refusing to remove symbolic link: $target" >&2
    exit 1
  fi
  [ ! -e "$target" ] || rm -- "$target"
done

echo "Linux file-manager integrations removed for Dolphin, Nautilus and Nemo."
