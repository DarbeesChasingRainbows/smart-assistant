# Build and deploy the flashcards frontend using Podman

# Set variables
$ImageName = "flashcards-frontend"
$ContainerName = "flashcards-app"
$Port = 8000
$BackendUrl = "http://host.containers.internal:5120"

# Get Git revision
try {
    $GitRevision = git rev-parse HEAD
} catch {
    $GitRevision = "local"
}

# Build the image
Write-Host "Building the Docker image..." -ForegroundColor Green
podman build --build-arg GIT_REVISION=$GitRevision -t $ImageName .

# Stop and remove existing container if it exists
$ExistingContainer = podman ps -a --format "{{.Names}}" | Select-String -Pattern "^$ContainerName$"
if ($ExistingContainer) {
    Write-Host "Stopping and removing existing container..." -ForegroundColor Yellow
    podman stop $ContainerName
    podman rm $ContainerName
}

# Run the new container
Write-Host "Starting the container..." -ForegroundColor Green
podman run -d `
    --name $ContainerName `
    -p ${Port}:8000 `
    -e VITE_API_URL=$BackendUrl `
    -e VITE_UPLOADS_URL=$BackendUrl `
    --restart unless-stopped `
    $ImageName

# Show container status
Write-Host "`nContainer status:" -ForegroundColor Cyan
podman ps -f name=$ContainerName

Write-Host "`nDeployment complete!" -ForegroundColor Green
Write-Host "Flashcards frontend is running at: http://localhost:$Port"
Write-Host "Make sure the LifeOS backend is running at: $BackendUrl"
