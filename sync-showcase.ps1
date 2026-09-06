# BITWISE Showcase Auto-Sync Script
# Automatically syncs photos & designs from samples/ to assets/showcase/ and updates index.html

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

$samplesPhotoDir = Join-Path $root "samples\photography"
$samplesDesignDir = Join-Path $root "samples\design"
$assetsPhotoDir = Join-Path $root "assets\showcase\photography"
$assetsDesignDir = Join-Path $root "assets\showcase\design"
$indexPath = Join-Path $root "index.html"
$manifestPath = Join-Path $root "assets\showcase\manifest.json"

# Ensure target directories exist
if (-not (Test-Path $assetsPhotoDir)) { New-Item -ItemType Directory -Path $assetsPhotoDir -Force | Out-Null }
if (-not (Test-Path $assetsDesignDir)) { New-Item -ItemType Directory -Path $assetsDesignDir -Force | Out-Null }

$imageExts = @('.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg')

# 1. Sync photography files
if (Test-Path $samplesPhotoDir) {
    Get-ChildItem -Path $samplesPhotoDir -File | Where-Object { $imageExts -contains $_.Extension.ToLower() } | ForEach-Object {
        $dest = Join-Path $assetsPhotoDir $_.Name
        if (-not (Test-Path $dest) -or ($_.LastWriteTimeUtc -gt (Get-Item $dest).LastWriteTimeUtc)) {
            Copy-Item $_.FullName -Destination $dest -Force
            Write-Host "Synced photo: $($_.Name)" -ForegroundColor Cyan
        }
    }
}

# 2. Sync design files
if (Test-Path $samplesDesignDir) {
    Get-ChildItem -Path $samplesDesignDir -File | Where-Object { $imageExts -contains $_.Extension.ToLower() } | ForEach-Object {
        $dest = Join-Path $assetsDesignDir $_.Name
        if (-not (Test-Path $dest) -or ($_.LastWriteTimeUtc -gt (Get-Item $dest).LastWriteTimeUtc)) {
            Copy-Item $_.FullName -Destination $dest -Force
            Write-Host "Synced design: $($_.Name)" -ForegroundColor Cyan
        }
    }
}

# 3. Inventory current assets
$photoFiles = Get-ChildItem -Path $assetsPhotoDir -File | Where-Object { $imageExts -contains $_.Extension.ToLower() } | Sort-Object Name
$designFiles = Get-ChildItem -Path $assetsDesignDir -File | Where-Object { $imageExts -contains $_.Extension.ToLower() } | Sort-Object Name

# 4. Generate manifest.json
$manifest = @{
    photography = @($photoFiles | ForEach-Object { $_.Name })
    design = @($designFiles | ForEach-Object { $_.Name })
    updatedAt = (Get-Date).ToString("o")
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content -Path $manifestPath -Encoding UTF8
Write-Host "Generated manifest: $manifestPath" -ForegroundColor Green

# 5. Update index.html photography gallery
if ((Test-Path $indexPath) -and $photoFiles.Count -gt 0) {
    [System.Reflection.Assembly]::LoadWithPartialName("System.Drawing") | Out-Null

    $galleryHtml = ""
    $i = 1
    foreach ($file in $photoFiles) {
        $imgId = "photo-$i"
        $relPath = "assets/showcase/photography/$($file.Name)"
        $isTall = $false

        # Check aspect ratio
        try {
            $img = [System.Drawing.Image]::FromFile($file.FullName)
            if ($img.Height -gt ($img.Width * 1.15)) {
                $isTall = $true
            }
            $img.Dispose()
        } catch {}

        $spanClass = ""
        if ($isTall) {
            $spanClass = " gallery-span-tall"
        } elseif ($i -eq 4 -or ($i -gt 1 -and ($i % 5 -eq 0))) {
            $spanClass = " gallery-span-wide"
        }

        $altTitle = [System.IO.Path]::GetFileNameWithoutExtension($file.Name) -replace '[-_]', ' '
        $galleryHtml += "          <div class=`"gallery-item reveal-scale$spanClass`" data-editable-img-id=`"$imgId`">`n"
        $galleryHtml += "            <img src=`"$relPath`" alt=`"bitwise. Photography - $altTitle`" loading=`"lazy`">`n"
        $galleryHtml += "          </div>`n"
        $i++
    }

    # Replace in index.html between <div class="photo-gallery-grid" id="photo-gallery"> and its closing </div>
    $content = Get-Content -Path $indexPath -Raw -Encoding UTF8
    $pattern = '(?s)(<div class="photo-gallery-grid" id="photo-gallery">)(.*?)(</div>\s*</div>\s*</section>)'
    if ($content -match $pattern) {
        $replacement = "`$1`n$galleryHtml        `$3"
        $newContent = [regex]::Replace($content, $pattern, $replacement)
        Set-Content -Path $indexPath -Value $newContent -Encoding UTF8
        Write-Host "Updated index.html photography gallery with $($photoFiles.Count) photos!" -ForegroundColor Green
    }
}

# 6. Auto-stage in git if inside repo
try {
    git add assets/showcase/ index.html samples/ 2>$null
    Write-Host "Auto-staged assets in Git." -ForegroundColor DarkGray
} catch {}

Write-Host "Showcase sync complete!" -ForegroundColor Green
