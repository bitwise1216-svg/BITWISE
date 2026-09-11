# BITWISE Studio & Executive Dashboard Unified Local Server with 1-Click Publishing Backend
# Serves both BITWISE and BITWISE-Dashboard and handles automated publishing and Git sync.

$parentDir = Split-Path -Parent $PSScriptRoot
Set-Location $parentDir

$port = 8080
$bitwiseDir = Join-Path $parentDir "BITWISE"
$dashboardDir = Join-Path $parentDir "BITWISE-Dashboard"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  bitwise. Studio & Executive Admin Dashboard" -ForegroundColor White
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
$lanIp = "localhost"
try {
    $ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and ($_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" -or $_.IPAddress -like "172.*") }
    if ($ips) { $lanIp = $ips[0].IPAddress }
} catch {}

Write-Host "Serving from: $parentDir" -ForegroundColor DarkGray
Write-Host "Website:   http://localhost:$port/BITWISE/" -ForegroundColor Green
Write-Host "Dashboard: http://localhost:$port/BITWISE-Dashboard/" -ForegroundColor Yellow
if ($lanIp -ne "localhost") {
    Write-Host "Mobile LAN (iPhone / Redmi): http://$($lanIp):$port/BITWISE-Dashboard/" -ForegroundColor Cyan
}
Write-Host ""

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")
try {
    if ($lanIp -ne "localhost") {
        $listener.Prefixes.Add("http://$($lanIp):$port/")
    }
} catch {}
$listener.Start()
Write-Host "Server listening at http://localhost:$port/ (Press Ctrl+C to stop)" -ForegroundColor Green

# Automatically open Dashboard in default browser
try {
    Start-Process "http://localhost:$port/BITWISE-Dashboard/"
} catch {}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # CORS Headers for all responses
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

        # Handle Preflight OPTIONS
        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        # -------------------------------------------------------------
        # INQUIRIES API: Store, Synchronize and Stream Client Leads
        # -------------------------------------------------------------
        if ($request.Url.LocalPath -eq "/api/inquiries") {
            $inquiriesDir = Join-Path $dashboardDir "data"
            $inquiriesFile = Join-Path $inquiriesDir "inquiries.json"
            if (-not (Test-Path $inquiriesDir)) {
                New-Item -ItemType Directory -Path $inquiriesDir -Force | Out-Null
            }

            if ($request.HttpMethod -eq "GET") {
                $listJson = "[]"
                if (Test-Path $inquiriesFile) {
                    try {
                        $listJson = [System.IO.File]::ReadAllText($inquiriesFile, [System.Text.Encoding]::UTF8)
                    } catch {}
                }
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($listJson)
                $response.StatusCode = 200
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $respBytes.Length
                $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
                $response.Close()
                continue
            }

            if ($request.HttpMethod -eq "POST") {
                try {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                    $bodyStr = $reader.ReadToEnd()
                    $inquiryData = ConvertFrom-Json $bodyStr

                    $existing = @()
                    if (Test-Path $inquiriesFile) {
                        try {
                            $raw = [System.IO.File]::ReadAllText($inquiriesFile, [System.Text.Encoding]::UTF8)
                            $existing = @(ConvertFrom-Json $raw)
                        } catch {}
                    }

                    if (-not ($existing | Where-Object { $_.id -eq $inquiryData.id })) {
                        $existing = @($inquiryData) + $existing
                        if ($existing.Count -gt 200) { $existing = $existing[0..199] }
                        $savedJson = ConvertTo-Json $existing -Depth 6
                        [System.IO.File]::WriteAllText($inquiriesFile, $savedJson, [System.Text.Encoding]::UTF8)
                    }

                    Write-Host ""
                    Write-Host "=================================================" -ForegroundColor Green
                    Write-Host "  🚨 NEW CLIENT RESPONSE / INQUIRY RECEIVED" -ForegroundColor Green
                    Write-Host "=================================================" -ForegroundColor Green
                    Write-Host "  Client:  $($inquiryData.name) ($($inquiryData.email))" -ForegroundColor White
                    Write-Host "  Focus:   $($inquiryData.service)" -ForegroundColor Cyan
                    Write-Host "  Message: $($inquiryData.message)" -ForegroundColor DarkGray
                    Write-Host "=================================================" -ForegroundColor Green
                    Write-Host ""

                    $respObj = @{ success = $true; inquiry = $inquiryData }
                    $respJson = ConvertTo-Json $respObj
                    $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                    $response.StatusCode = 200
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $respBytes.Length
                    $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
                    $response.Close()
                    continue
                } catch {
                    $errObj = @{ success = $false; error = $_.Exception.Message }
                    $errJson = ConvertTo-Json $errObj
                    $respBytes = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                    $response.StatusCode = 500
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $respBytes.Length
                    $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
                    $response.Close()
                    continue
                }
            }
        }

        # -------------------------------------------------------------
        # TELEMETRY API: Store and Stream Live Visitor Analytics Events
        # -------------------------------------------------------------
        if ($request.Url.LocalPath -eq "/api/analytics/visit" -and $request.HttpMethod -eq "POST") {
            try {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyStr = $reader.ReadToEnd()
                $eventData = ConvertFrom-Json $bodyStr

                $eventsFile = Join-Path $dashboardDir "data\events.json"
                $dataDir = Join-Path $dashboardDir "data"
                if (-not (Test-Path $dataDir)) {
                    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
                }

                $existingEvents = @()
                if (Test-Path $eventsFile) {
                    try {
                        $rawEvents = [System.IO.File]::ReadAllText($eventsFile, [System.Text.Encoding]::UTF8)
                        $existingEvents = @(ConvertFrom-Json $rawEvents)
                    } catch {}
                }

                # Avoid duplicate insertion for identical event ID
                if (-not ($existingEvents | Where-Object { $_.id -eq $eventData.id })) {
                    $updatedEvents = @($eventData) + $existingEvents
                    if ($updatedEvents.Count -gt 500) {
                        $updatedEvents = $updatedEvents[0..499]
                    }
                    $jsonEvents = ConvertTo-Json $updatedEvents -Depth 6
                    [System.IO.File]::WriteAllText($eventsFile, $jsonEvents, [System.Text.Encoding]::UTF8)
                }

                Write-Host "  [Live Visitor] $($eventData.device) on $($eventData.page) ($($eventData.location))" -ForegroundColor DarkCyan

                $respObj = @{ success = $true }
                $respJson = ConvertTo-Json $respObj
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                $response.StatusCode = 200
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $respBytes.Length
                $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
                $response.Close()
                continue
            } catch {
                $errObj = @{ success = $false; error = $_.Exception.Message }
                $errJson = ConvertTo-Json $errObj
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                $response.StatusCode = 500
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                $response.Close()
                continue
            }
        }

        if ($request.Url.LocalPath -eq "/api/analytics/events" -and $request.HttpMethod -eq "GET") {
            try {
                $eventsFile = Join-Path $dashboardDir "data\events.json"
                $eventsJson = "[]"
                if (Test-Path $eventsFile) {
                    $eventsJson = [System.IO.File]::ReadAllText($eventsFile, [System.Text.Encoding]::UTF8)
                }

                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($eventsJson)
                $response.StatusCode = 200
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $respBytes.Length
                $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
                $response.Close()
                continue
            } catch {
                $response.StatusCode = 500
                $response.Close()
                continue
            }
        }

        # Handle 1-Click Automated Publishing API
        if ($request.HttpMethod -eq "POST" -and $request.Url.LocalPath -eq "/api/publish") {
            try {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyStr = $reader.ReadToEnd()
                $data = ConvertFrom-Json $bodyStr

                Write-Host "`n[Auto-Publish] Received publish payload from Dashboard..." -ForegroundColor Cyan

                # 1. Update js/site-data.js in BITWISE
                if ($data.siteDataCode) {
                    $siteDataPath = Join-Path $bitwiseDir "js\site-data.js"
                    [System.IO.File]::WriteAllText($siteDataPath, $data.siteDataCode, [System.Text.Encoding]::UTF8)
                    Write-Host "  - Updated: $siteDataPath" -ForegroundColor DarkGreen

                    # Also sync to BITWISE-Dashboard for consistency
                    $dashSiteData = Join-Path $dashboardDir "js\site-data.js"
                    if (Test-Path $dashboardDir) {
                        [System.IO.File]::WriteAllText($dashSiteData, $data.siteDataCode, [System.Text.Encoding]::UTF8)
                        Write-Host "  - Updated: $dashSiteData" -ForegroundColor DarkGreen
                    }
                }

                # 2. Save any newly uploaded photo files
                if ($data.photos) {
                    $photoDir = Join-Path $bitwiseDir "assets\showcase\photography"
                    if (-not (Test-Path $photoDir)) {
                        New-Item -ItemType Directory -Path $photoDir -Force | Out-Null
                    }

                    foreach ($p in $data.photos) {
                        if ($p.dataUrl -and $p.dataUrl.StartsWith("data:image/")) {
                            $fileName = $p.name
                            if (-not $fileName) { $fileName = "photo-" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + ".jpg" }
                            $destFile = Join-Path $photoDir $fileName

                            $commaIdx = $p.dataUrl.IndexOf(",")
                            if ($commaIdx -ge 0) {
                                $base64 = $p.dataUrl.Substring($commaIdx + 1)
                                $imgBytes = [Convert]::FromBase64String($base64)
                                [System.IO.File]::WriteAllBytes($destFile, $imgBytes)
                                Write-Host "  - Saved new photo: $fileName" -ForegroundColor DarkGreen
                            }
                        }
                    }
                }

                # 3. Update manifest.json
                $manifestPath = Join-Path $bitwiseDir "assets\showcase\manifest.json"
                if ($data.manifest) {
                    $manifestJson = ConvertTo-Json $data.manifest -Depth 5
                    [System.IO.File]::WriteAllText($manifestPath, $manifestJson, [System.Text.Encoding]::UTF8)
                    Write-Host "  - Updated: $manifestPath" -ForegroundColor DarkGreen
                }

                # 4. Run sync-showcase.ps1 to update HTML
                $syncScript = Join-Path $bitwiseDir "sync-showcase.ps1"
                if (Test-Path $syncScript) {
                    & powershell -ExecutionPolicy Bypass -File $syncScript | Out-Null
                    Write-Host "  - Executed sync-showcase.ps1" -ForegroundColor DarkGreen
                }

                # 5. Git Commit & Push automatically
                $gitPushed = $false
                try {
                    & git -C $bitwiseDir add -A
                    & git -C $bitwiseDir commit -m "chore(cms): auto-published updates from executive dashboard"
                    & git -C $bitwiseDir push origin main
                    $gitPushed = $true
                    Write-Host "  - Committed and pushed to GitHub main successfully!" -ForegroundColor Green
                } catch {
                    Write-Host "  - Git push note: $($_.Exception.Message)" -ForegroundColor Yellow
                }

                $respObj = @{
                    success = $true
                    gitPushed = $gitPushed
                    message = "Published successfully! Files updated and synced."
                }
                $respJson = ConvertTo-Json $respObj
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)

                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $respBytes.Length
                $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
                $response.Close()
                continue
            } catch {
                Write-Host "  - Publish error: $($_.Exception.Message)" -ForegroundColor Red
                $errObj = @{
                    success = $false
                    error = $_.Exception.Message
                }
                $errJson = ConvertTo-Json $errObj
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                $response.StatusCode = 500
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                $response.Close()
                continue
            }
        }

        # Static File Serving
        $relPath = $request.Url.LocalPath.TrimStart('/')
        if (-not $relPath) { $relPath = "BITWISE/index.html" }
        $localPath = Join-Path $parentDir $relPath

        if (Test-Path -Path $localPath -PathType Container) {
            $localPath = Join-Path $localPath "index.html"
        }

        if (Test-Path -Path $localPath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
            $mime = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".jpg"  { "image/jpeg" }
                ".jpeg" { "image/jpeg" }
                ".png"  { "image/png" }
                ".webp" { "image/webp" }
                ".svg"  { "image/svg+xml" }
                ".woff2" { "font/woff2" }
                ".woff"  { "font/woff" }
                ".ttf"   { "font/ttf" }
                ".otf"   { "font/otf" }
                default { "application/octet-stream" }
            }
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            if ($request.HttpMethod -ne "HEAD") {
                try {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                } catch {}
            }
        } else {
            $response.StatusCode = 404
            $err = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.ContentLength64 = $err.Length
            if ($request.HttpMethod -ne "HEAD") {
                try {
                    $response.OutputStream.Write($err, 0, $err.Length)
                } catch {}
            }
        }
        try { $response.Close() } catch {}
    }
} finally {
    $listener.Stop()
}
