# PowerShell script to setup ArangoDB with Docker
# Run this script to start ArangoDB locally for development

param(
    [SecureString]$Password = (ConvertTo-SecureString "lifeos123" -AsPlainText -Force),
    [switch]$Reset
)

# Convert SecureString back to plain text for Docker environment variable
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
$containerName = "lifeos-arangodb"
$volumeName = "lifeos-arangodb-data"

Write-Host "LifeOS ArangoDB Setup" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan

# Check if Docker is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Docker is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Reset if requested
if ($Reset) {
    Write-Host "Resetting ArangoDB container and volume..." -ForegroundColor Yellow
    docker stop $containerName 2>$null
    docker rm $containerName 2>$null
    docker volume rm $volumeName 2>$null
}

# Check if container already exists
$existingContainer = docker ps -a --filter "name=$containerName" --format "{{.Names}}" 2>$null
if ($existingContainer -eq $containerName) {
    Write-Host "Container '$containerName' already exists" -ForegroundColor Yellow
    
    # Check if it's running
    $runningContainer = docker ps --filter "name=$containerName" --format "{{.Names}}" 2>$null
    if ($runningContainer -eq $containerName) {
        Write-Host "Container is already running" -ForegroundColor Green
    } else {
        Write-Host "Starting existing container..." -ForegroundColor Yellow
        docker start $containerName
    }
} else {
    # Create volume if it doesn't exist
    $existingVolume = docker volume ls --filter "name=$volumeName" --format "{{.Name}}" 2>$null
    if ($existingVolume -ne $volumeName) {
        Write-Host "Creating volume '$volumeName'..." -ForegroundColor Yellow
        docker volume create $volumeName
    }

    # Run ArangoDB container
    Write-Host "Starting ArangoDB container..." -ForegroundColor Yellow
    docker run -d `
        --name $containerName `
        -e ARANGO_ROOT_PASSWORD=$plainPassword `
        -p 8529:8529 `
        -v "${volumeName}:/var/lib/arangodb3" `
        arangodb:latest

    if ($LASTEXITCODE -eq 0) {
        Write-Host "ArangoDB container started successfully!" -ForegroundColor Green
    } else {
        Write-Host "Failed to start ArangoDB container" -ForegroundColor Red
        exit 1
    }
}

# Wait for ArangoDB to be ready
Write-Host "Waiting for ArangoDB to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
do {
    Start-Sleep -Seconds 2
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8529/_api/version" -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "ArangoDB is ready!" -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "  Attempt $attempt/$maxAttempts - waiting..." -ForegroundColor Gray
    }
} while ($attempt -lt $maxAttempts)

if ($attempt -ge $maxAttempts) {
    Write-Host "Timeout waiting for ArangoDB to start" -ForegroundColor Red
    exit 1
}

# Display connection info
Write-Host ""
Write-Host "ArangoDB Connection Info:" -ForegroundColor Cyan
Write-Host "  Web UI:    http://localhost:8529" -ForegroundColor White
Write-Host "  Username:  root" -ForegroundColor White
Write-Host "  Password:  $plainPassword" -ForegroundColor White
Write-Host ""
Write-Host "To initialize the database, run the init script in ArangoDB shell:" -ForegroundColor Yellow
Write-Host "  docker exec -it $containerName arangosh --server.password $plainPassword --javascript.execute /scripts/init-arangodb.js" -ForegroundColor Gray
