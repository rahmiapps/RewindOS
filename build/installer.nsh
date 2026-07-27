!macro customInstall
  ; Per-user Explorer integration. No administrator rights are requested.
  WriteRegStr HKCU "Software\Classes\Directory\shell\RewindOS" "" "Mit RewindOS schützen / Protect with RewindOS"
  WriteRegStr HKCU "Software\Classes\Directory\shell\RewindOS" "Icon" "$INSTDIR\RewindOS.exe"
  WriteRegStr HKCU "Software\Classes\Directory\shell\RewindOS\command" "" "$\"$INSTDIR\RewindOS.exe$\" --protect $\"%1$\""
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\Directory\shell\RewindOS"
!macroend
