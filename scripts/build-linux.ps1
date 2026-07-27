$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

if (-not $IsLinux) { throw "Run this script with PowerShell 7 on Linux." }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 22 or newer is required." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "npm is required." }
$major = [int]((node --version).TrimStart('v').Split('.')[0])
if ($major -lt 22) { throw "Node.js 22 or newer is required." }

if (Test-Path "package-lock.json") { npm ci } else { npm install }
npm run verify
npm run audit
if (Get-Command xvfb-run -ErrorAction SilentlyContinue) {
    xvfb-run -a npm run smoke
} elseif ($env:REWINDOS_SKIP_SMOKE -eq "1") {
    Write-Warning "Graphical smoke test explicitly skipped because REWINDOS_SKIP_SMOKE=1. Do not publish this build without a separate smoke test."
} else {
    throw "xvfb-run is required for the graphical smoke test. Install xvfb, or set REWINDOS_SKIP_SMOKE=1 only for local troubleshooting."
}
npm run dist:linux

$checksumFile = Join-Path $ProjectRoot "dist/SHA256SUMS-Linux.txt"
Get-ChildItem (Join-Path $ProjectRoot "dist") -File |
    Where-Object { $_.Name -ne "SHA256SUMS-Linux.txt" } |
    Get-FileHash -Algorithm SHA256 |
    ForEach-Object { "$($_.Hash.ToLower())  $([IO.Path]::GetFileName($_.Path))" } |
    Set-Content -Encoding ascii $checksumFile
Write-Host "Linux packages created in $ProjectRoot/dist" -ForegroundColor Green
