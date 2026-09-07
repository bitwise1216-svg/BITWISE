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

Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue

function Copy-WebOptimizedImage {
    param(
        [string]$SourcePath,
        [string]$DestPath,
        [int]$MaxDimension = 2560,
        [int]$Quality = 85
    )

    $ext = [System.IO.Path]::GetExtension($SourcePath).ToLower()
    $fileSize = (Get-Item $SourcePath).Length

    # For SVGs, GIFs, or small files (< 1.5MB), copy directly
    if ($ext -eq '.svg' -or $ext -eq '.gif' -or ($fileSize -lt 1.5MB)) {
        Copy-Item $SourcePath -Destination $DestPath -Force
        return
    }

    try {
        $img = [System.Drawing.Image]::FromFile($SourcePath)
        $needsResize = ($img.Width -gt $MaxDimension -or $img.Height -gt $MaxDimension)
        $needsCompression = ($fileSize -gt 2MB)

        if (-not $needsResize -and -not $needsCompression) {
            $img.Dispose()
            Copy-Item $SourcePath -Destination $DestPath -Force
            return
        }

        # Calculate new dimensions preserving aspect ratio
        if ($needsResize) {
            if ($img.Width -gt $img.Height) {
                $newW = $MaxDimension
                $newH = [int]($img.Height * ($MaxDimension / $img.Width))
            } else {
                $newH = $MaxDimension
                $newW = [int]($img.Width * ($MaxDimension / $img.Height))
            }
        } else {
            $newW = $img.Width
            $newH = $img.Height
        }

        $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
        $graphics = [System.Drawing.Graphics]::FromImage($bmp)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.DrawImage($img, 0, 0, $newW, $newH)

        $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)

        $bmp.Save($DestPath, $codec, $encoderParams)
        $graphics.Dispose()
        $bmp.Dispose()
        $img.Dispose()
    } catch {
        # Fallback to normal copy if GDI+ fails
        Copy-Item $SourcePath -Destination $DestPath -Force
    }
}

# 1. Sync photography files
if (Test-Path $samplesPhotoDir) {
    Get-ChildItem -Path $samplesPhotoDir -File | Where-Object { $imageExts -contains $_.Extension.ToLower() } | ForEach-Object {
        $dest = Join-Path $assetsPhotoDir $_.Name
        if (-not (Test-Path $dest) -or ($_.LastWriteTimeUtc -gt (Get-Item $dest).LastWriteTimeUtc)) {
            Copy-WebOptimizedImage -SourcePath $_.FullName -DestPath $dest
            Write-Host "Synced photo: $($_.Name)" -ForegroundColor Cyan
        }
    }
}

# 2. Sync design files
if (Test-Path $samplesDesignDir) {
    Get-ChildItem -Path $samplesDesignDir -File | Where-Object { $imageExts -contains $_.Extension.ToLower() } | ForEach-Object {
        $dest = Join-Path $assetsDesignDir $_.Name
        if (-not (Test-Path $dest) -or ($_.LastWriteTimeUtc -gt (Get-Item $dest).LastWriteTimeUtc)) {
            Copy-WebOptimizedImage -SourcePath $_.FullName -DestPath $dest
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

# 5. Update index.html photography gallery (12 Slots Limit)
if ((Test-Path $indexPath)) {
    [System.Reflection.Assembly]::LoadWithPartialName("System.Drawing") | Out-Null

    $maxSlots = 12
    $limitedPhotoFiles = @($photoFiles | Select-Object -First $maxSlots)
    $galleryHtml = ""
    $i = 1

    foreach ($file in $limitedPhotoFiles) {
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

    # Add placeholders for remaining slots up to 12
    for ($s = $i; $s -le $maxSlots; $s++) {
        $slotPad = if ($s -lt 10) { "0$s" } else { "$s" }
        $galleryHtml += "          <div class=`"gallery-item gallery-item-slot reveal-scale`" data-editable-img-id=`"photo-$s`">`n"
        $galleryHtml += "            <div class=`"gallery-item-placeholder slot-placeholder`">`n"
        $galleryHtml += "              <svg viewBox=`"0 0 24 24`" fill=`"none`" stroke=`"currentColor`" stroke-width=`"1.5`"><path d=`"M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z`"/><circle cx=`"12`" cy=`"13`" r=`"4`"/></svg>`n"
        $galleryHtml += "              <span>Photo $slotPad // Available</span>`n"
        $galleryHtml += "            </div>`n"
        $galleryHtml += "          </div>`n"
    }

    # Replace in index.html between <div class="photo-gallery-grid" id="photo-gallery"> and its closing </div>
    $content = Get-Content -Path $indexPath -Raw -Encoding UTF8
    $pattern = '(?s)(<div class="photo-gallery-grid" id="photo-gallery">)(.*?)(</div>\s*</div>\s*</section>)'
    if ($content -match $pattern) {
        $replacement = "`$1`n$galleryHtml        `$3"
        $newContent = [regex]::Replace($content, $pattern, $replacement)
        Set-Content -Path $indexPath -Value $newContent -Encoding UTF8
        Write-Host "Updated index.html photography gallery ($($limitedPhotoFiles.Count) photos, $($maxSlots - $limitedPhotoFiles.Count) available slots)!" -ForegroundColor Green
    }
}

# 6. Auto-stage in git if inside repo
try {
    git add assets/showcase/ index.html samples/ 2>$null
    Write-Host "Auto-staged assets in Git." -ForegroundColor DarkGray
} catch {}

Write-Host "Showcase sync complete!" -ForegroundColor Green
