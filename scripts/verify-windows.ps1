$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot
npm run verify
node --check src/main/main.cjs
node --check src/main/preload.cjs
node --check src/renderer/app.js
Write-Host "RewindOS source verification completed." -ForegroundColor Green
