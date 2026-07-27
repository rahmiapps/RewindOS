param(
  [string]$Version = "0.4.0"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git is not installed or not available in PATH."
}

$tag = "v$Version"
Write-Host "Running verification..." -ForegroundColor Cyan
npm run verify

Write-Host "Creating Git tag $tag..." -ForegroundColor Cyan
git add .
git commit -m "Release $tag"
git tag -a $tag -m "RewindOS $tag"
git push origin main
git push origin $tag

Write-Host "GitHub Actions will now build Windows and Linux packages and create the release." -ForegroundColor Green
