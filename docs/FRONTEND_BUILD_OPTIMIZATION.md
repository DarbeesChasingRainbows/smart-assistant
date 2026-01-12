# Frontend Build Optimization Guide

## Why Frontend Builds are Slow

All Fresh frontends (budget, flashcards, garage) are slow due to:

1. **No Layer Caching**: The Containerfile doesn't optimize Docker layer caching
2. **Vite Build Process**: Full TypeScript transformation and bundling every time
3. **No Dependency Caching**: npm/JSR dependencies downloaded on each build
4. **No Build Parallelization**: Single-threaded build process

## Solutions

### 1. Use the Optimized Containerfile

```bash
# Replace the Containerfile for each frontend
for frontend in budget flashcards garage; do
  mv frontends/$frontend/Containerfile frontends/$frontend/Containerfile.backup
  mv frontends/$frontend/Containerfile.optimized frontends/$frontend/Containerfile
done
```

The optimized Containerfile includes:
- **Cache mounts** for Deno dependencies
- **Persistent cache** between builds
- **Better layer ordering** for improved Docker caching

### 2. Optimize Vite Configuration

```bash
# Replace vite.config.ts for each frontend
for frontend in budget flashcards garage; do
  mv frontends/$frontend/vite.config.ts frontends/$frontend/vite.config.ts.backup
  mv frontends/$frontend/vite.config.ts.optimized frontends/$frontend/vite.config.ts
done
```

Optimizations include:
- **Terser minification** with multiple passes
- **Manual chunk splitting** for better caching
- **Disabled sourcemaps** for production builds
- **Parallel processing** enabled

### 3. Use Build Cache

```bash
# Create a persistent build cache
podman volume create deno-cache

# Build with cache
podman build --volume deno-cache:/tmp/deno_cache -t flashcards-frontend ./frontends/flashcards
```

### 4. Parallel Builds

Update your docker-compose.yml for the flashcards service:

```yaml
flashcards-frontend:
  build:
    context: ./frontends/flashcards
    dockerfile: Containerfile
    cache_from:
      - type=local,src=/tmp/.buildx-cache
    cache_to:
      - type=local,dest=/tmp/.buildx-cache,mode=max
```

### 5. Development vs Production

For development builds (faster):
```bash
deno task dev
```

For production builds (optimized):
```bash
deno task build:fast
```

## Expected Performance Improvements

- **First build**: 30-40% faster with cache mounts
- **Subsequent builds**: 60-80% faster with persistent caching
- **Parallel builds**: Up to 2x faster on multi-core systems

## Additional Tips

1. **Use .dockerignore**:
```
node_modules
.git
.github
_deno-cache
coverage
.vscode
*.log
.DS_Store
```

2. **Local Development**:
```bash
# Use local cache
export DENO_DIR=/tmp/deno_cache
deno task build
```

3. **CI/CD Optimization**:
- Use build cache storage in your CI/CD pipeline
- Parallelize builds across multiple services
- Pre-pull base images

## Monitoring Build Performance

```bash
# Time your builds
time podman build -t flashcards-frontend ./frontends/flashcards

# Analyze layer sizes
podman history flashcards-frontend
```

## Troubleshooting

If builds are still slow:
1. Check disk space: `df -h`
2. Clear Deno cache: `rm -rf $DENO_DIR`
3. Check network latency for dependency downloads
4. Verify Docker/Podman is using build cache
