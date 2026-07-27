$ErrorActionPreference = "Stop"
Remove-Item "HKCU:\Software\Classes\Directory\shell\RewindOS" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Explorer context menu removed." -ForegroundColor Green
