# Publishes an in-app update. Installed Windows and Android apps pick it up by themselves
# (on start and every 6 hours, or when "Check for updates" is tapped) — no reinstalling.
#
#   1. Raise "version" in package.json (e.g. 1.1.0 -> 1.1.1)
#   2. powershell -ExecutionPolicy Bypass -File scripts\publish-update.ps1 -Notes "What changed"
#
# Uploads app.html + update.json to the "live" release of the download repository.
# Raise $MinShell only when desktop/*.cjs or the Android project changed — then the
# full installers must be rebuilt and installed once, and older apps are told so.
param(
  [string]$Notes = '',
  [string]$Repo = 'aayushbhatta230-ux/trinity-teaching-app',
  [string]$MinShell = '1.1.0'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
Write-Host "Publishing in-app update $version (needs installed app $MinShell or newer)"

npx vite build
if ($LASTEXITCODE -ne 0) { throw 'Web build failed' }

$out = Join-Path $env:TEMP 'trinity-update'
New-Item -ItemType Directory -Force $out | Out-Null
Copy-Item dist\index.html (Join-Path $out 'app.html') -Force
$file = Get-Item (Join-Path $out 'app.html')
$sha = (Get-FileHash $file.FullName -Algorithm SHA256).Hash.ToLower()

$manifest = [ordered]@{
  version     = $version
  file        = 'app.html'
  sha256      = $sha
  size        = $file.Length
  minShell    = $MinShell
  notes       = $Notes
  publishedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
}
# Write without a byte-order mark so every JSON parser accepts it.
[System.IO.File]::WriteAllText((Join-Path $out 'update.json'), ($manifest | ConvertTo-Json), (New-Object System.Text.UTF8Encoding $false))

gh release view live -R $Repo *> $null
if ($LASTEXITCODE -ne 0) {
  gh release create live -R $Repo --prerelease --latest=false --title 'In-app updates' `
    --notes 'Update channel used by the installed apps. To install the app, use the latest release instead.'
  if ($LASTEXITCODE -ne 0) { throw 'Could not create the live release' }
}
gh release upload live -R $Repo (Join-Path $out 'app.html') (Join-Path $out 'update.json') --clobber
if ($LASTEXITCODE -ne 0) { throw 'Upload failed' }

Write-Host "Done: installed apps will update to $version."
