# BITWISE Studio & Executive Dashboard Unified Local Server
# Runs a lightweight local static server serving both BITWISE and BITWISE-Dashboard

$parentDir = Split-Path -Parent $PSScriptRoot
Set-Location $parentDir

$port = 8080

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  bitwise. Studio & Executive Admin Dashboard" -ForegroundColor White
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Serving from: $parentDir" -ForegroundColor DarkGray
Write-Host "Website:   http://localhost:$port/BITWISE/" -ForegroundColor Green
Write-Host "Dashboard: http://localhost:$port/BITWISE-Dashboard/" -ForegroundColor Yellow
Write-Host ""

# Check for Python
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if ($pythonCmd) {
    Write-Host "Starting server with Python on port $port..." -ForegroundColor Cyan
    python -m http.server $port
    exit
}

# Fallback to .NET HttpListener
Write-Host "Starting lightweight .NET server on port $port..." -ForegroundColor Cyan
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Server listening at http://localhost:$port/ (Press Ctrl+C to stop)" -ForegroundColor Green

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

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
