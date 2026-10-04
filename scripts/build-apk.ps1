# Builds the Trinity Teaching Android app (APK).
#   powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1
# Output: release\TrinityTeaching-<version>.apk
#
# Uses JAVA_HOME / ANDROID_HOME if set; otherwise the portable JDK 21 in
# %LOCALAPPDATA%\TrinityBuild and the SDK in %LOCALAPPDATA%\Android\Sdk.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $env:JAVA_HOME) {
  $jdk = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'TrinityBuild') -Directory -Filter 'jdk-21*' -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $jdk) { throw 'JDK 21 not found. Set JAVA_HOME or install Eclipse Temurin 21.' }
  $env:JAVA_HOME = $jdk.FullName
}
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (-not (Test-Path $env:ANDROID_HOME)) { throw "Android SDK not found at $env:ANDROID_HOME" }
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
"sdk.dir=$($env:ANDROID_HOME -replace '\\', '/')" | Set-Content -Encoding ascii android\local.properties

Write-Host '1/3  Building the app...'
npx vite build
if ($LASTEXITCODE -ne 0) { throw 'Web build failed' }

Write-Host '2/3  Copying into the Android project...'
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed' }

Write-Host '3/3  Compiling the APK...'
Push-Location android
.\gradlew.bat assembleDebug --console=plain
$code = $LASTEXITCODE
Pop-Location
if ($code -ne 0) { throw 'Gradle build failed' }

$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
New-Item -ItemType Directory -Force release | Out-Null
$out = "release\TrinityTeaching-$version.apk"
Copy-Item android\app\build\outputs\apk\debug\app-debug.apk $out -Force
Write-Host "Done: $out"
