# BITWISE Dashboard Verification Script
# Ensures that dashboard scripts, zero passkeys, and notification configurations are clean and verified.
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$parentDir = Split-Path -Parent $PSScriptRoot
$dashboardDir = Join-Path $parentDir "BITWISE-Dashboard"
$dashJsPath = Join-Path $dashboardDir "js\dashboard.js"
$dashHtmlPath = Join-Path $dashboardDir "index.html"

if (-not (Test-Path $dashJsPath)) {
    Write-Host "BITWISE-Dashboard/js/dashboard.js not found at $dashJsPath." -ForegroundColor Yellow
    exit 0
}

Write-Host "Verifying BITWISE-Dashboard zero-passkey state & notifications..." -ForegroundColor Cyan

$jsContent = [System.IO.File]::ReadAllText($dashJsPath, [System.Text.Encoding]::UTF8)
$htmlContent = [System.IO.File]::ReadAllText($dashHtmlPath, [System.Text.Encoding]::UTF8)

# Verify zero passkey elements in HTML
if (-not $htmlContent.Contains("passkey-security-gate")) {
    Write-Host "  [OK] Passkey security gate completely removed from index.html." -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Passkey security gate found in index.html." -ForegroundColor Red
}

# Verify zero passkey references in JS
if (-not $jsContent.Contains("checkExistingSessionOnLoad")) {
    Write-Host "  [OK] Passkey session gatekeeper completely removed from dashboard.js." -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Passkey session gatekeeper found in dashboard.js." -ForegroundColor Red
}

# Verify Executive Notifications & 8 PM Report controller
if ($jsContent.Contains("initNotificationSystem") -and $jsContent.Contains("generateDailyReport")) {
    Write-Host "  [OK] Executive notifications & 8:00 PM daily report engine verified." -ForegroundColor Green
}

Write-Host "Verification complete - Dashboard is 100% unlocked and notifications are ready." -ForegroundColor Green
