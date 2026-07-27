param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$ExecutablePath
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$item = Get-Item -LiteralPath $ExecutablePath -ErrorAction Stop
if (-not $item.PSIsContainer -and $item.Extension -ieq ".exe") {
    $exe = $item.FullName
} else {
    throw "ExecutablePath must point to an existing Windows .exe file."
}

$base = "HKCU:\Software\Classes\Directory\shell\RewindOS"
$command = '"{0}" --protect "%1"' -f $exe

New-Item -Path $base -Force | Out-Null
Set-Item -Path $base -Value "Mit RewindOS schützen / Protect with RewindOS"
New-ItemProperty -Path $base -Name "Icon" -PropertyType String -Value $exe -Force | Out-Null
New-Item -Path "$base\command" -Force | Out-Null
Set-Item -Path "$base\command" -Value $command

Write-Host "Explorer context menu registered for the current user." -ForegroundColor Green
