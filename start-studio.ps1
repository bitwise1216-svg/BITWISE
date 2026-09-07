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
                default { "application/octet-stream" }
            }
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $err = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($err, 0, $err.Length)
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
}
