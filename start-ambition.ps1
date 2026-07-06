<#
.SYNOPSIS
  One-click local startup for Ambition Unisex Salon Software.
.STEPS
  1. Kill stale node.exe processes on ports 3000 / 4200
  2. Check / start PostgreSQL on 127.0.0.1:2620 using pg_isready / pg_ctl
  3. Start NestJS backend (port 3000) in a new window
  4. Start Angular frontend (port 4200) in a new window
  5. Open http://127.0.0.1:4200/#/login
.NOTES
  Run from project root.  Administrator rights are required for PostgreSQL start.
#>

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $ProjectRoot

Write-Host "=== Ambition Unisex Salon Software - Local Start ==="
Write-Host ""

# ---- 1. Kill stale node.exe processes on ports 3000 / 4200 ----
Write-Host "[1/5] Killing stale dev servers (ports 3000 / 4200)..."

$stalePids = @()
$netstat = netstat -ano | Select-String '\s+(3000|4200)\s+'
foreach ($line in $netstat) {
  if ($line -match 'LISTENING\s+(\d+)$') {
    $pid = [int]$Matches[1]
    if ($pid -notin $stalePids) { $stalePids += $pid }
  }
}
foreach ($pid in $stalePids) {
  $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
  if ($proc -and $proc.ProcessName -eq 'node') {
    Write-Host "  Killing node.exe (PID $pid)"
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
  }
}
if ($stalePids.Count -eq 0) { Write-Host "  No stale dev servers found." }
Write-Host ""

# ---- 2. Check / start PostgreSQL with pg_ctl ----
Write-Host "[2/5] Checking PostgreSQL (127.0.0.1:2620)..."

$pgIsReady = "C:\Program Files\PostgreSQL\18\bin\pg_isready.exe"
$pgCtl    = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
$pgData   = "C:\Program Files\PostgreSQL\18\data"
$pgLog    = "C:\Program Files\PostgreSQL\18\data\logfile.log"

if (-not (Test-Path -LiteralPath $pgIsReady)) {
  Write-Host "  WARNING: pg_isready not found at $pgIsReady" -ForegroundColor Yellow
  Write-Host "  Please ensure PostgreSQL 18 is installed at the default path." -ForegroundColor Yellow
} else {
  $ready = & $pgIsReady -h 127.0.0.1 -p 2620 -q 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "  PostgreSQL is already accepting connections on 127.0.0.1:2620."
  } else {
    Write-Host "  PostgreSQL is not running. Attempting to start..."
    & $pgCtl start -D $pgData -l $pgLog -o "-p 2620" 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Host "  PostgreSQL started successfully."
    } else {
      Write-Host "  WARNING: Could not start PostgreSQL automatically." -ForegroundColor Yellow
      Write-Host "  Start it manually or re-run this script as Administrator." -ForegroundColor Yellow
    }
  }
}
Write-Host ""

# ---- 3. Start backend (new window) ----
Write-Host "[3/5] Starting NestJS backend (port 3000)..."
Start-Process -WindowStyle Normal -FilePath "powershell.exe" -ArgumentList @"
  Set-Location -LiteralPath '$ProjectRoot\Backend_NestJS'
  Write-Host '=== Backend: npm run start:dev ==='
  npm run start:dev
  Read-Host 'Backend exited. Press Enter.'
"@
Write-Host "  Backend starting in new window. Waiting 20 seconds..."
Start-Sleep -Seconds 20
Write-Host ""

# ---- 4. Start frontend (new window) ----
Write-Host "[4/5] Starting Angular frontend (port 4200)..."
Start-Process -WindowStyle Normal -FilePath "powershell.exe" -ArgumentList @"
  Set-Location -LiteralPath '$ProjectRoot\Frontend_Angular'
  Write-Host '=== Frontend: ng serve ==='
  npx ng serve --host 127.0.0.1 --port 4200
  Read-Host 'Frontend exited. Press Enter.'
"@
Write-Host "  Frontend starting in new window. Waiting 20 seconds..."
Start-Sleep -Seconds 20
Write-Host ""

# ---- 5. Open login page ----
Write-Host "[5/5] Opening browser..."
$loginUrl = "http://127.0.0.1:4200/#/login"
Start-Process $loginUrl
Write-Host "  $loginUrl"

Write-Host ""
Write-Host "=== Ambition Unisex Salon Software startup complete ==="
Write-Host ""
Write-Host "  Frontend : http://127.0.0.1:4200"
Write-Host "  Login    : http://127.0.0.1:4200/#/login"
Write-Host "  Backend  : http://127.0.0.1:3000"
Write-Host ""
Write-Host "Close the backend and frontend windows to stop."
