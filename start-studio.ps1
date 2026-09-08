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
Write-Host "Serving from: $parentDir" -ForegroundColor DarkGray
Write-Host "Website:   http://localhost:$port/BITWISE/" -ForegroundColor Green
Write-Host "Dashboard: http://localhost:$port/BITWISE-Dashboard/" -ForegroundColor Yellow
Write-Host ""

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Server listening at http://localhost:$port/ (Press Ctrl+C to stop)" -ForegroundColor Green

# Automatically open Dashboard in default browser
try {
    Start-Process "http://localhost:$port/BITWISE-Dashboard/"
} catch {}

$script:authCodes = @{}
$script:authLinks = @{}

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
        # PASSKEY SECURITY API: Send Magic Verification Link Email
        # -------------------------------------------------------------
        if ($request.HttpMethod -eq "POST" -and $request.Url.LocalPath -eq "/api/auth/send-link") {
            try {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyStr = $reader.ReadToEnd()
                $data = ConvertFrom-Json $bodyStr

                $founderId = $data.founderId
                $founderName = $data.founderName
                if (-not $founderName) {
                    switch ($founderId) {
                        "aaqib" { $founderName = "Aaqib Nazran" }
                        "ruhaim" { $founderName = "Ruhaim Riyaz" }
                        "aneeq" { $founderName = "Aneeq Ahmed" }
                        default { $founderName = "Executive Founder" }
                    }
                }

                $origin = $data.currentOrigin
                if (-not $origin) { $origin = "http://localhost:$port" }
                $token = [System.Guid]::NewGuid().ToString("N")
                $verifyUrl = "$origin/BITWISE-Dashboard/?verify_token=$token&founder=$founderId"
                $expiresAt = [DateTimeOffset]::UtcNow.AddHours(2)

                $script:authLinks[$token] = @{
                    token = $token
                    founderId = $founderId
                    founderName = $founderName
                    expiresAt = $expiresAt
                    email = "bitwise1216@gmail.com"
                }

                Write-Host ""
                Write-Host "=================================================" -ForegroundColor Yellow
                Write-Host "  BITWISE EXECUTIVE SECURITY - MAGIC VERIFY LINK" -ForegroundColor Cyan
                Write-Host "=================================================" -ForegroundColor Yellow
                Write-Host "  Founder:           $founderName ($founderId)" -ForegroundColor White
                Write-Host "  Destination Email: bitwise1216@gmail.com" -ForegroundColor DarkGray
                Write-Host "  Magic Link:        $verifyUrl" -ForegroundColor Green
                Write-Host "  Validity:          2 Hours" -ForegroundColor DarkGray
                Write-Host "=================================================" -ForegroundColor Yellow
                Write-Host ""

                $respObj = @{
                    success = $true
                    message = "Verification link sent to bitwise1216@gmail.com"
                    email = "bitwise1216@gmail.com"
                    verifyUrl = $verifyUrl
                    token = $token
                }
                $respJson = ConvertTo-Json $respObj
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                $response.StatusCode = 200
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $respBytes.Length
                $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
                $response.Close()
                continue
            } catch {
                Write-Host "  [Auth Link Error]: $($_.Exception.Message)" -ForegroundColor Red
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

        # -------------------------------------------------------------
        # PASSKEY SECURITY API: Verify Magic Link Token
        # -------------------------------------------------------------
        if ($request.HttpMethod -eq "POST" -and $request.Url.LocalPath -eq "/api/auth/verify-token") {
            try {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyStr = $reader.ReadToEnd()
                $data = ConvertFrom-Json $bodyStr

                $token = ($data.token -as [string]).Trim()
                $entry = $script:authLinks[$token]
                $now = [DateTimeOffset]::UtcNow

                if (-not $entry) {
                    $respObj = @{ success = $false; error = "Invalid or consumed verification link token." }
                    $respJson = ConvertTo-Json $respObj
                    $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                    $response.StatusCode = 400
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $respBytes.Length
                    $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
                    $response.Close()
                    continue
                }

                if ($now -gt $entry.expiresAt) {
                    $respObj = @{ success = $false; error = "Verification link has expired. Please request a new link." }
                    $respJson = ConvertTo-Json $respObj
                    $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                    $response.StatusCode = 400
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $respBytes.Length
                    $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
                    $response.Close()
                    continue
                }

                # Valid token!
                $founderId = $entry.founderId
                $founderName = $entry.founderName
                Write-Host "  [Passkey Auth] Magic link token verified for founder: $founderName" -ForegroundColor Green

                $respObj = @{
                    success = $true
                    verified = $true
                    founderId = $founderId
                    founderName = $founderName
                }
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

        # -------------------------------------------------------------
        # PASSKEY SECURITY API: Send Email OTP Code
        # -------------------------------------------------------------
        if ($request.HttpMethod -eq "POST" -and $request.Url.LocalPath -eq "/api/auth/send-code") {
            try {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyStr = $reader.ReadToEnd()
                $data = ConvertFrom-Json $bodyStr

                $founderId = $data.founderId
                $founderName = $data.founderName
                if (-not $founderName) {
                    switch ($founderId) {
                        "aaqib" { $founderName = "Aaqib Nazran" }
                        "ruhaim" { $founderName = "Ruhaim Riyaz" }
                        "aneeq" { $founderName = "Aneeq Ahmed" }
                        default { $founderName = "Executive Founder" }
                    }
                }

                # Generate secure 6-digit numeric OTP
                $code = (Get-Random -Minimum 100000 -Maximum 999999).ToString()
                $expiresAt = [DateTimeOffset]::UtcNow.AddMinutes(15)

                $script:authCodes[$founderId] = @{
                    code = $code
                    founderName = $founderName
                    expiresAt = $expiresAt
                    email = "bitwise1216@gmail.com"
                }

                Write-Host ""
                Write-Host "=================================================" -ForegroundColor Yellow
                Write-Host "  BITWISE EXECUTIVE SECURITY GATEWAY - PASSKEY OTP" -ForegroundColor Cyan
                Write-Host "=================================================" -ForegroundColor Yellow
                Write-Host "  Founder:           $founderName ($founderId)" -ForegroundColor White
                Write-Host "  Destination Email: bitwise1216@gmail.com" -ForegroundColor DarkGray
                Write-Host "  Verification Code: $code" -ForegroundColor Green
                Write-Host "  Validity:          15 Minutes" -ForegroundColor DarkGray
                Write-Host "=================================================" -ForegroundColor Yellow
                Write-Host ""

                $respObj = @{
                    success = $true
                    message = "Verification code generated and dispatched to bitwise1216@gmail.com"
                    email = "bitwise1216@gmail.com"
                    code = $code
                    expiresIn = 900
                }
                $respJson = ConvertTo-Json $respObj
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                $response.StatusCode = 200
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $respBytes.Length
                $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
                $response.Close()
                continue
            } catch {
                Write-Host "  [Auth Error]: $($_.Exception.Message)" -ForegroundColor Red
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

        # -------------------------------------------------------------
        # PASSKEY SECURITY API: Verify Email OTP Code
        # -------------------------------------------------------------
        if ($request.HttpMethod -eq "POST" -and $request.Url.LocalPath -eq "/api/auth/verify-code") {
            try {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyStr = $reader.ReadToEnd()
                $data = ConvertFrom-Json $bodyStr

                $founderId = $data.founderId
                $inputCode = ($data.code -as [string]).Trim()

                $entry = $script:authCodes[$founderId]
                $now = [DateTimeOffset]::UtcNow

                if (-not $entry -or -not $entry.code) {
                    $respObj = @{ success = $false; error = "No verification code requested for this founder." }
                    $respJson = ConvertTo-Json $respObj
                    $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                    $response.StatusCode = 400
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $respBytes.Length
                    $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
                    $response.Close()
                    continue
                }

                if ($now -gt $entry.expiresAt) {
                    $respObj = @{ success = $false; error = "Verification code has expired. Please request a new one." }
                    $respJson = ConvertTo-Json $respObj
                    $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                    $response.StatusCode = 400
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $respBytes.Length
                    $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
                    $response.Close()
                    continue
                }

                if ($inputCode -ne $entry.code) {
                    $respObj = @{ success = $false; error = "Invalid code. Please enter the 6-digit code sent to bitwise1216@gmail.com." }
                    $respJson = ConvertTo-Json $respObj
                    $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                    $response.StatusCode = 400
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $respBytes.Length
                    $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
                    $response.Close()
                    continue
                }

                # Successfully verified!
                $enrollmentToken = [System.Guid]::NewGuid().ToString()
                $script:authCodes.Remove($founderId)
                Write-Host "  [Passkey Auth] Code verified successfully for founder: $founderId" -ForegroundColor Green

                $respObj = @{
                    success = $true
                    verified = $true
                    founderId = $founderId
                    enrollmentToken = $enrollmentToken
                }
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

        # -------------------------------------------------------------
        # PASSKEY SECURITY API: Manage Registered Passkeys
        # -------------------------------------------------------------
        if ($request.Url.LocalPath -eq "/api/auth/passkeys") {
            $passkeysDir = Join-Path $dashboardDir "data"
            $passkeysFile = Join-Path $passkeysDir "passkeys.json"
            if (-not (Test-Path $passkeysDir)) {
                New-Item -ItemType Directory -Path $passkeysDir -Force | Out-Null
            }

            if ($request.HttpMethod -eq "GET") {
                $passkeysList = @()
                if (Test-Path $passkeysFile) {
                    try {
                        $raw = [System.IO.File]::ReadAllText($passkeysFile, [System.Text.Encoding]::UTF8)
                        $passkeysList = ConvertFrom-Json $raw
                    } catch {}
                }
                $respJson = ConvertTo-Json $passkeysList
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
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
                    $payload = ConvertFrom-Json $bodyStr

                    $existing = @()
                    if (Test-Path $passkeysFile) {
                        try {
                            $raw = [System.IO.File]::ReadAllText($passkeysFile, [System.Text.Encoding]::UTF8)
                            $existing = @(ConvertFrom-Json $raw)
                        } catch {}
                    }

                    # Filter out older passkey for same founder if updating
                    $filtered = @($existing | Where-Object { $_.founderId -ne $payload.founderId })
                    $filtered += $payload

                    $savedJson = ConvertTo-Json $filtered -Depth 5
                    [System.IO.File]::WriteAllText($passkeysFile, $savedJson, [System.Text.Encoding]::UTF8)
                    Write-Host "  [Passkey Saved] Stored biometric passkey credential for $($payload.founderId)" -ForegroundColor Green

                    $respObj = @{ success = $true; message = "Passkey registered and securely persisted." }
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
