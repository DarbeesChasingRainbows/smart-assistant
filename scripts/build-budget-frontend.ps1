# Fast build script for budget frontend with cache optimizations
Write-Host "Building budget frontend with cache optimizations..." -ForegroundColor Green

# Enable BuildKit with advanced features
$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"
$env:BUILDKIT_PROGRESS = "plain"
$env:BUILDKIT_INLINE_CACHE = "1"

# Create build cache directory
New-Item -ItemType Directory -Force -Path "C:\temp\.budget-cache" | Out-Null

# Check if optimized Containerfile exists and apply it
$containerfile = "frontends\budget\Containerfile"
$containerfileOpt = "frontends\budget\Containerfile.optimized"

if ((Test-Path $containerfileOpt) -and !(Test-Path "$containerfile.optimized-in-use")) {
    Write-Host "Applying optimized Containerfile..." -ForegroundColor Cyan
    if (Test-Path "$containerfile.backup") {
        Remove-Item "$containerfile.backup" -Force
    }
    Move-Item $containerfile "$containerfile.backup" -Force
    Move-Item $containerfileOpt $containerfile -Force
    New-Item "$containerfile.optimized-in-use" -type File | Out-Null
}

# Build with cache
Write-Host "Building with cache..." -ForegroundColor Blue
docker build `
    --file "frontends\budget\Containerfile" `
    --tag "localhost/smart-assistant_budget-frontend:latest" `
    --cache-from type=local,src="C:\temp\.budget-cache" `
    --cache-to type=local,dest="C:\temp\.budget-cache",mode=max `
    "frontends\budget"

Write-Host "Build complete!" -ForegroundColor Green

# Show cache size
$cacheSize = (Get-ChildItem "C:\temp\.budget-cache" -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "Cache size: {0:N2} MB" -f $cacheSize
