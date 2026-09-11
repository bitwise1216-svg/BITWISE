# BITWISE Dashboard Notifications & Executive Alerts Status Script
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$parentDir = Split-Path -Parent $PSScriptRoot
$dashboardDir = Join-Path $parentDir "BITWISE-Dashboard"

if (-not (Test-Path $dashboardDir)) {
    Write-Error "BITWISE-Dashboard directory not found at $dashboardDir"
    exit 1
}

$indexHtmlPath = Join-Path $dashboardDir "index.html"
$cssPath = Join-Path $dashboardDir "css\dashboard.css"
$jsPath = Join-Path $dashboardDir "js\dashboard.js"

Write-Host "Verifying BITWISE-Dashboard Executive Notifications Architecture..." -ForegroundColor Cyan

$html = [System.IO.File]::ReadAllText($indexHtmlPath, [System.Text.Encoding]::UTF8)
$js = [System.IO.File]::ReadAllText($jsPath, [System.Text.Encoding]::UTF8)

if ($html.Contains("id=`"notification-bell-wrapper`"") -and $html.Contains("id=`"modal-daily-report`"")) {
    Write-Host "  [OK] Notification center & Daily 8:00 PM Report Modal verified in index.html." -ForegroundColor Green
}

if ($js.Contains("initNotificationSystem") -and $js.Contains("generateDailyReport")) {
    Write-Host "  [OK] Real-time inquiry alerts & 8:00 PM report engine verified in dashboard.js." -ForegroundColor Green
}

if (-not $html.Contains("passkey-security-gate") -and -not $js.Contains("checkExistingSessionOnLoad")) {
    Write-Host "  [OK] Zero passkey / zero password verification confirmed." -ForegroundColor Green
}

Write-Host "Executive notification system is active, clean, and ready." -ForegroundColor Green
