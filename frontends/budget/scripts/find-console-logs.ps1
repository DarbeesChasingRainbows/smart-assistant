# Find all console.log, console.error, and console.warn in island files
# This script helps identify what needs to be replaced with toast notifications

$islandsPath = Join-Path $PSScriptRoot "..\islands"

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Finding console statements in islands..." -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "console.log statements:" -ForegroundColor Yellow
Write-Host "----------------------" -ForegroundColor Yellow
Get-ChildItem -Path $islandsPath -Filter "*.tsx" | ForEach-Object {
    $file = $_.Name
    $content = Get-Content $_.FullName
    $lineNumber = 0
    foreach ($line in $content) {
        $lineNumber++
        if ($line -match "console\.log") {
            Write-Host "$file`:$lineNumber : $line" -ForegroundColor White
        }
    }
}

Write-Host ""
Write-Host "console.error statements:" -ForegroundColor Red
Write-Host "------------------------" -ForegroundColor Red
Get-ChildItem -Path $islandsPath -Filter "*.tsx" | ForEach-Object {
    $file = $_.Name
    $content = Get-Content $_.FullName
    $lineNumber = 0
    foreach ($line in $content) {
        $lineNumber++
        if ($line -match "console\.error") {
            Write-Host "$file`:$lineNumber : $line" -ForegroundColor White
        }
    }
}

Write-Host ""
Write-Host "console.warn statements:" -ForegroundColor Magenta
Write-Host "-----------------------" -ForegroundColor Magenta
Get-ChildItem -Path $islandsPath -Filter "*.tsx" | ForEach-Object {
    $file = $_.Name
    $content = Get-Content $_.FullName
    $lineNumber = 0
    foreach ($line in $content) {
        $lineNumber++
        if ($line -match "console\.warn") {
            Write-Host "$file`:$lineNumber : $line" -ForegroundColor White
        }
    }
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

$totalLog = (Get-ChildItem -Path $islandsPath -Filter "*.tsx" | Get-Content | Where-Object { $_ -match "console\.log" }).Count
$totalError = (Get-ChildItem -Path $islandsPath -Filter "*.tsx" | Get-Content | Where-Object { $_ -match "console\.error" }).Count
$totalWarn = (Get-ChildItem -Path $islandsPath -Filter "*.tsx" | Get-Content | Where-Object { $_ -match "console\.warn" }).Count

Write-Host "Total console.log: $totalLog" -ForegroundColor Yellow
Write-Host "Total console.error: $totalError" -ForegroundColor Red
Write-Host "Total console.warn: $totalWarn" -ForegroundColor Magenta
Write-Host "Total to replace: $($totalLog + $totalError + $totalWarn)" -ForegroundColor Cyan
