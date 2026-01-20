#!/bin/bash

# Fast build script with optimizations
set -e

echo "🚀 Starting fast build with optimizations..."

# Enable BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export COMPOSE_PARALLEL_LIMIT=4

# Create build cache directory
mkdir -p /tmp/.buildx-cache

# Apply frontend build optimizations if not already applied
echo "🔧 Checking frontend build optimizations..."

# Function to apply optimizations
apply_frontend_optimizations() {
    local frontend_name=$1
    local containerfile="frontends/${frontend_name}/Containerfile"
    local containerfile_opt="frontends/${frontend_name}/Containerfile.optimized"
    local vite_config="frontends/${frontend_name}/vite.config.ts"
    local vite_config_opt="frontends/${frontend_name}/vite.config.ts.optimized"
    
    if [ -f "$containerfile_opt" ] && [ ! -f "$containerfile.optimized-in-use" ]; then
        echo "  Applying optimized Containerfile for $frontend_name..."
        [ -f "$containerfile.backup" ] && rm -f "$containerfile.backup"
        mv "$containerfile" "$containerfile.backup"
        mv "$containerfile_opt" "$containerfile"
        touch "$containerfile.optimized-in-use"
    fi
    
    if [ -f "$vite_config_opt" ] && [ ! -f "$vite_config.optimized-in-use" ]; then
        echo "  Applying optimized vite.config.ts for $frontend_name..."
        [ -f "$vite_config.backup" ] && rm -f "$vite_config.backup"
        mv "$vite_config" "$vite_config.backup"
        mv "$vite_config_opt" "$vite_config"
        touch "$vite_config.optimized-in-use"
    fi
}

# Apply optimizations to all frontends
apply_frontend_optimizations "flashcards"
apply_frontend_optimizations "garage"
apply_frontend_optimizations "budget"

# Pull latest base images to avoid download delays
echo "📦 Pulling latest base images..."
docker pull mcr.microsoft.com/dotnet/sdk:10.0
docker pull mcr.microsoft.com/dotnet/aspnet:10.0
docker pull denoland/deno:latest

# Build with cache and parallelism
echo "🔨 Building with cache and parallelism..."
docker compose --parallel 4 build

echo "✅ Build complete!"

# Optional: Show cache size
echo "💾 Build cache size:"
du -sh /tmp/.buildx-cache 2>/dev/null || echo "Cache not found"
