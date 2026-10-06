# One-time setup of the Trinity Teaching AI server on Cloudflare (free plan).
#
#   powershell -ExecutionPolicy Bypass -File server\setup.ps1
#
# It signs in to Cloudflare (a browser window opens: click Allow), creates the database,
# makes a school access code and an admin token, asks for the free Gemini key (optional),
# deploys the server and prints what to type on each board. Safe to run again.
$ErrorActionPreference = 'Continue'
Set-Location $PSScriptRoot

function Step($t) { Write-Host "`n== $t" -ForegroundColor Yellow }
function Fail($t) { Write-Host "`nSetup stopped: $t" -ForegroundColor Red; exit 1 }
function Random-Code($chars, $n) {
  $bytes = New-Object byte[] $n
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

Step 'Installing tools'
if (-not (Test-Path node_modules)) { npm install; if ($LASTEXITCODE) { Fail 'npm install failed' } }

Step 'Signing in to Cloudflare (approve in the browser window)'
npx wrangler whoami *> $null
$who = (npx wrangler whoami 2>&1 | Out-String)
if ($who -match 'not authenticated') {
  npx wrangler login
  if ($LASTEXITCODE) { Fail 'Cloudflare sign-in did not finish' }
}

Step 'Creating the database'
$toml = Get-Content wrangler.toml -Raw
$id = $null
$list = (npx wrangler d1 list --json 2>$null | Out-String)
try { $id = (($list | ConvertFrom-Json) | Where-Object { $_.name -eq 'trinity-ai' } | Select-Object -First 1).uuid } catch {}
if (-not $id) {
  $created = (npx wrangler d1 create trinity-ai 2>&1 | Out-String)
  if ($created -match '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') { $id = $Matches[1] }
}
if (-not $id) { Fail 'could not create the database' }
$toml = $toml -replace 'database_id = "[^"]*"', "database_id = `"$id`""
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'wrangler.toml'), $toml)
Write-Host "Database: $id"
npx wrangler d1 execute trinity-ai --remote --file=schema.sql
if ($LASTEXITCODE) { Fail 'could not create the database tables' }

Step 'Deploying the server'
$deploy = (npx wrangler deploy 2>&1 | Tee-Object -Variable raw | Out-String)
Write-Host $deploy
if ($deploy -notmatch '(https://[a-z0-9.-]+\.workers\.dev)') { Fail 'deploy did not print a workers.dev address' }
$server = $Matches[1]

Step 'Secrets'
$envFile = Join-Path $PSScriptRoot '.admin.env'
$old = @{}
if (Test-Path $envFile) { Get-Content $envFile | ForEach-Object { if ($_ -match '^(\w+)=(.*)$') { $old[$Matches[1]] = $Matches[2] } } }
$access = if ($old.ACCESS_CODE) { $old.ACCESS_CODE } else { (Random-Code 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' 12) -replace '(.{4})(.{4})(.{4})', '$1-$2-$3' }
$admin = if ($old.ADMIN_TOKEN) { $old.ADMIN_TOKEN } else { Random-Code 'abcdefghijklmnopqrstuvwxyz0123456789' 40 }
$access | npx wrangler secret put ACCESS_CODE
$admin | npx wrangler secret put ADMIN_TOKEN

$gemini = $old.GEMINI_API_KEY
Write-Host "`nPaste your free Gemini key from https://aistudio.google.com/apikey"
Write-Host '(or press Enter to skip; the free Cloudflare model will be used alone)'
$sec = Read-Host -AsSecureString 'Gemini key'
$typed = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
if ($typed) { $gemini = $typed.Trim() }
if ($gemini) { $gemini | npx wrangler secret put GEMINI_API_KEY }

# Kept on this PC only (git ignores it) so the past-paper script can find the server.
@("AI_SERVER=$server", "ACCESS_CODE=$access", "ADMIN_TOKEN=$admin", "GEMINI_API_KEY=$gemini") |
  Set-Content -Path $envFile -Encoding ascii

Step 'Checking'
try { $h = Invoke-RestMethod "$server/health"; Write-Host "Server is up. Past questions in the bank: $($h.pastQuestions)" -ForegroundColor Green }
catch { Write-Host 'The server does not answer yet; wait a minute and open the address in a browser.' }

Write-Host "`n================ WRITE THIS DOWN ================" -ForegroundColor Green
Write-Host "AI server address : $server"
Write-Host "School access code : $access"
Write-Host '================================================='
Write-Host 'On each board: hold the Trinity logo 3 seconds, enter both, tap Save and test.'
