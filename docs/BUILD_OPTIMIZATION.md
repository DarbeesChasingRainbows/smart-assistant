# Build Performance Optimization Guide

## Quick Wins

### 1. Use the Optimized Containerfile
```bash
# Replace the old Containerfile with the optimized version
mv LifeOS/Containerfile LifeOS/Containerfile.backup
mv LifeOS/Containerfile.optimized LifeOS/Containerfile
```

### 2. Enable BuildKit and Parallel Builds
```bash
# Linux/MacOS
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export COMPOSE_PARALLEL_LIMIT=4

# Windows (PowerShell)
$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"
$env:COMPOSE_PARALLEL_LIMIT = "4"
```

### 3. Use the Fast Build Script
```bash
# Linux/MacOS
./scripts/fast-build.sh

# Windows
./scripts/fast-build.ps1
```

## Advanced Optimizations

### 4. Persistent Package Cache
Create a persistent NuGet cache:
```yaml
# In docker-compose.yml
services:
  api:
    volumes:
      - ~/.nuget/packages:/root/.nuget/packages:cached
```

### 5. Use .dockerignore
Create a `.dockerignore` file in the project root:
```
# .dockerignore
**/.git
**/.vs
**/bin
**/obj
**/out
**/.idea
**/*.user
**/*.suo
**/TestResults
**/Coverage
**/node_modules
**/Dockerfile*
**/docker-compose*
**/.dockerignore
```

### 6. Leverage Multi-stage Builds
The optimized Containerfile already uses multi-stage builds effectively:
- SDK stage only for building
- Runtime stage for execution
- Minimal runtime image size

### 7. Build-Time Arguments
Add to your Containerfile:
```dockerfile
ARG BUILD_CONFIGURATION=Release
ARG BUILD_NUMBER
RUN dotnet publish -c $BUILD_CONFIGURATION --no-restore -p:BuildNumber=$BUILD_NUMBER
```

## Performance Monitoring

### Measure Build Times
```bash
# Time your builds
time python -m podman_compose build

# Detailed build info
podman build --progress=plain .
```

### Cache Analysis
```bash
# View build cache
podman buildctl du

# Prune old cache
podman system prune -f
```

## CI/CD Considerations

### GitHub Actions
```yaml
- name: Build with cache
  uses: docker/build-push-action@v4
  with:
    push: false
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### Local Development Workflow
1. Use `docker-compose.override.yml` for dev-specific optimizations
2. Keep base images updated
3. Use volume mounts for hot-reload during development
4. Only rebuild when dependencies change

## Troubleshooting

### If builds are still slow:
1. Check disk space: `df -h`
2. Check Docker/Podman resources: `podman system df`
3. Verify BuildKit is enabled: `podman buildx version`
4. Check for large files: `du -sh * | sort -hr | head -10`

### Common Issues:
- **Out of space**: Clean up with `podman system prune -a`
- **Cache miss**: Ensure `.dockerignore` is properly configured
- **Network timeouts**: Use mirror registries or local cache
