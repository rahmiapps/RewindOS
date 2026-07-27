$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "RewindOS Windows build" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js 22 or newer is required."
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm is required."
}

$major = [int]((node --version).TrimStart('v').Split('.')[0])
if ($major -lt 22) { throw "Node.js 22 or newer is required." }

Write-Host "Installing exact dependencies..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") { npm ci } else { npm install }

Write-Host "Running source, translation and regression checks..." -ForegroundColor Yellow
npm run verify

Write-Host "Checking production dependencies for high/critical advisories..." -ForegroundColor Yellow
npm run audit

Write-Host "Running Electron startup smoke test..." -ForegroundColor Yellow
npm run smoke

Write-Host "Building NSIS EXE installer and portable EXE..." -ForegroundColor Yellow
npm run dist:win

$checksumFile = Join-Path $ProjectRoot "dist\SHA256SUMS-Windows.txt"
Get-ChildItem (Join-Path $ProjectRoot "dist") -File |
    Where-Object { $_.Name -ne "SHA256SUMS-Windows.txt" } |
    Get-FileHash -Algorithm SHA256 |
    ForEach-Object { "$($_.Hash.ToLower())  $([IO.Path]::GetFileName($_.Path))" } |
    Set-Content -Encoding ascii $checksumFile

Write-Host "`nFinished. Files are in: $ProjectRoot\dist" -ForegroundColor Green
Get-ChildItem "$ProjectRoot\dist" -File | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
