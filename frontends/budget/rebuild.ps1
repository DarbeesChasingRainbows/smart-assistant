# Rebuild budget frontend container
Write-Host "Rebuilding budget frontend container..."

# Set variables
$IMAGE_NAME = "smart-assistant_budget-frontend"
$GIT_REVISION = & git rev-parse HEAD 2>$null
if ($LASTEXITCODE -ne 0) { $GIT_REVISION = "local" }

# Build the image
Write-Host "Building Docker image..."
docker build `
  --build-arg GIT_REVISION=$GIT_REVISION `
  -t ${IMAGE_NAME}:latest `
  -t ${IMAGE_NAME}:$GIT_REVISION `
  .

Write-Host "Build completed successfully!"
Write-Host "Image: ${IMAGE_NAME}:$GIT_REVISION"

# Run the container (optional)
$REPLY = Read-Host "Do you want to run the container now? (y/n)"
if ($REPLY -eq 'y' -or $REPLY -eq 'Y') {
    Write-Host "Running container..."
    docker run -d -p 8040:8000 --name budget-frontend --rm -e VITE_API_URL=http://host.containers.internal:5120 ${IMAGE_NAME}:latest
    Write-Host "Container running on http://localhost:8040"
}
