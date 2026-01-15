#!/bin/bash

# Build script for budget frontend
echo "Building budget frontend..."

# Clean any previous builds
rm -rf _fresh

# Install dependencies
echo "Installing dependencies..."
deno install --allow-scripts --node-modules-dir=auto

# Cache dependencies
echo "Caching dependencies..."
deno cache --lock=deno.lock --node-modules-dir=auto vite.config.ts main.tsx utils.ts

# Build the application
echo "Building application..."
deno task build

echo "Build completed successfully!"
