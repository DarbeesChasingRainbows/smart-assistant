param(
    [switch]$Clean
)

# Fast build script for Windows with optimizations
Write-Host "Starting fast build with optimizations..." -ForegroundColor Green

# Enable BuildKit
$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"
$env:COMPOSE_PARALLEL_LIMIT = "6"

if ($Clean) {
    Write-Host "Clean build enabled (no cache)" -ForegroundColor Yellow
}

# Apply frontend build optimizations if not already applied
Write-Host "Checking frontend build optimizations..." -ForegroundColor Yellow

# Function to apply optimizations
function Apply-FrontendOptimizations($frontendName) {
    $containerfile = "frontends\$frontendName\Containerfile"
    $containerfileOpt = "frontends\$frontendName\Containerfile.optimized"
    $viteConfig = "frontends\$frontendName\vite.config.ts"
    $viteConfigOpt = "frontends\$frontendName\vite.config.ts.optimized"
    
    if ((Test-Path $containerfileOpt) -and !(Test-Path "$containerfile.optimized-in-use")) {
        Write-Host "  Applying optimized Containerfile for $frontendName..." -ForegroundColor Cyan
        if (Test-Path "$containerfile.backup") {
            Remove-Item "$containerfile.backup" -Force
        }
        Move-Item $containerfile "$containerfile.backup" -Force
        Move-Item $containerfileOpt $containerfile -Force
        New-Item "$containerfile.optimized-in-use" -type File | Out-Null
    } elseif (!(Test-Path $containerfileOpt) -and (Test-Path "$containerfile.optimized-in-use")) {
        # Remove optimization marker if optimized file doesn't exist
        Remove-Item "$containerfile.optimized-in-use" -Force
        Write-Host "  Skipping optimizations for $frontendName (no optimized files found)" -ForegroundColor Yellow
    }
    
    if ((Test-Path $viteConfigOpt) -and !(Test-Path "$viteConfig.optimized-in-use")) {
        Write-Host "  Applying optimized vite.config.ts for $frontendName..." -ForegroundColor Cyan
        if (Test-Path "$viteConfig.backup") {
            Remove-Item "$viteConfig.backup" -Force
        }
        Move-Item $viteConfig "$viteConfig.backup" -Force
        Move-Item $viteConfigOpt $viteConfig -Force
        New-Item "$viteConfig.optimized-in-use" -type File | Out-Null
    } elseif (!(Test-Path $viteConfigOpt) -and (Test-Path "$viteConfig.optimized-in-use")) {
        # Remove optimization marker if optimized file doesn't exist
        Remove-Item "$viteConfig.optimized-in-use" -Force
    }
}

# Apply optimizations to all frontends
Apply-FrontendOptimizations "flashcards"
Apply-FrontendOptimizations "garage"
Apply-FrontendOptimizations "budget"

# Pull latest base images to avoid download delays
Write-Host "Pulling latest base images..." -ForegroundColor Blue
podman pull mcr.microsoft.com/dotnet/sdk:10.0
podman pull mcr.microsoft.com/dotnet/aspnet:10.0
podman pull denoland/deno:latest

if ($Clean) {
    Write-Host "Building all services (no cache)..." -ForegroundColor Blue
    python -m podman_compose --parallel 6 build --no-cache
} else {
    Write-Host "Building all services (cached)..." -ForegroundColor Blue
    python -m podman_compose --parallel 6 build
}

Write-Host "Build complete!" -ForegroundColor Green


