$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot
if ($IsWindows) {
    & "$PSScriptRoot\build-windows.ps1"
} elseif ($IsLinux) {
    & "$PSScriptRoot\build-linux.ps1"
} else {
    throw "This release script supports Windows and Linux."
}
