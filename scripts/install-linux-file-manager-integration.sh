#!/usr/bin/env bash
set -euo pipefail

EXECUTABLE="${1:-$(command -v rewindos || true)}"
if [ -z "$EXECUTABLE" ]; then
  echo "Usage: $0 /full/path/to/rewindos" >&2
  exit 1
fi
EXECUTABLE="$(realpath -- "$EXECUTABLE")"
case "$EXECUTABLE" in
  *$'\n'*|*$'\r'*|*'"'*|*'\'*|*'`'*|*'$'*)
    echo "The executable path contains characters that cannot be represented safely in a desktop entry." >&2
    exit 1
    ;;
esac
if [ ! -f "$EXECUTABLE" ] || [ ! -x "$EXECUTABLE" ]; then
  echo "The RewindOS executable does not exist or is not executable: $EXECUTABLE" >&2
  exit 1
fi

# KDE Dolphin service menus for current KDE and the older KDE 5 location.
# The executable path is validated above before it is written into Exec.
install_dolphin_menu() {
  local kde_dir="$1"
  mkdir -p "$kde_dir"
  printf '%s\n' \
    '[Desktop Entry]' \
    'Type=Service' \
    'MimeType=inode/directory;' \
    'Actions=RewindOSProtect;' \
    'X-KDE-ServiceTypes=KonqPopupMenu/Plugin' \
    '' \
    '[Desktop Action RewindOSProtect]' \
    'Name=Protect with RewindOS' \
    'Name[de]=Mit RewindOS schützen' \
    'Icon=rewindos' \
    "Exec=\"$EXECUTABLE\" --protect %f" \
    > "$kde_dir/rewindos-protect.desktop"
  chmod 0644 "$kde_dir/rewindos-protect.desktop"
}

install_dolphin_menu "$HOME/.local/share/kio/servicemenus"
install_dolphin_menu "$HOME/.local/share/kservices5/ServiceMenus"

install_script() {
  local target="$1"
  mkdir -p "$(dirname "$target")"
  {
    printf '%s\n' '#!/usr/bin/env bash' 'set -euo pipefail'
    printf 'EXECUTABLE=%q\n' "$EXECUTABLE"
    cat <<'SCRIPT'
while IFS= read -r selected_path; do
  [ -n "$selected_path" ] || continue
  "$EXECUTABLE" --protect "$selected_path"
done <<< "${NAUTILUS_SCRIPT_SELECTED_FILE_PATHS:-${NEMO_SCRIPT_SELECTED_FILE_PATHS:-}}"
SCRIPT
  } > "$target"
  chmod 0700 "$target"
}

install_script "$HOME/.local/share/nautilus/scripts/Protect with RewindOS"
install_script "$HOME/.local/share/nemo/scripts/Protect with RewindOS"

echo "Linux file-manager integrations installed for Dolphin, Nautilus and Nemo."
