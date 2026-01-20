# Build script for budget frontend
Write-Host "Building budget frontend..."

# Clean any previous builds
Remove-Item -Recurse -Force "_fresh" -ErrorAction SilentlyContinue

# Install dependencies
Write-Host "Installing dependencies..."
deno install --allow-scripts --node-modules-dir=auto

# Cache dependencies
Write-Host "Caching dependencies..."
deno cache --lock=deno.lock --node-modules-dir=auto vite.config.ts main.tsx utils.ts

# Build the application
Write-Host "Building application..."
deno task build

Write-Host "Build completed successfully!"
