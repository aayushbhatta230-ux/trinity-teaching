# Builds the Trinity Teaching Windows installer.
#   powershell -ExecutionPolicy Bypass -File scripts\build-windows.ps1
# Output: release\windows\TrinityTeaching-Setup-<version>.exe
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$version = (Get-Content package.json -Raw | ConvertFrom-Json).version

Write-Host '1/3  Building the app...'
npx vite build
if ($LASTEXITCODE -ne 0) { throw 'Web build failed' }

Write-Host '2/3  Copying into the desktop app...'
New-Item -ItemType Directory -Force desktop\app | Out-Null
Copy-Item dist\index.html desktop\app\index.html -Force
# Keep the desktop app version in step with package.json.
node -e "const fs=require('fs');const f='desktop/package.json';const p=JSON.parse(fs.readFileSync(f,'utf8'));p.version='$version';fs.writeFileSync(f,JSON.stringify(p,null,2)+'\n')"

Write-Host '3/3  Packaging the installer...'
# Antivirus scanning of the freshly built installer can make one step fail with
# "spawn UNKNOWN"; a second attempt normally succeeds.
# Packaging happens in a working folder outside the project: when the project lives under a
# redirected AppData folder, renaming the freshly unpacked app there fails with EPERM.
$work = Join-Path $env:LOCALAPPDATA 'TrinityBuild\windows-out'
Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue
foreach ($attempt in 1, 2) {
  npx electron-builder --win --x64 --config electron-builder.yml "-c.directories.output=$work"
  if ($LASTEXITCODE -eq 0) { break }
  if ($attempt -eq 2) { throw 'electron-builder failed' }
  Write-Host 'Packaging failed, retrying once...'
  Start-Sleep -Seconds 3
}
New-Item -ItemType Directory -Force release\windows | Out-Null
Copy-Item (Join-Path $work "TrinityTeaching-Setup-$version.exe") release\windows\ -Force

Write-Host "Done: release\windows\TrinityTeaching-Setup-$version.exe"
