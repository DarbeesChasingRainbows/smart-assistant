# AnkiQuiz Application Launcher (Docker version - PowerShell)
# This script will start all services using Docker Compose

param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "restart", "clean", "status", "logs", "prod", "help")]
    [string]$Command = "start",
    
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Arguments = @()
)

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

function Write-Header {
    param([string]$Message)
    Write-Host "================================" -ForegroundColor $Colors.Blue
    Write-Host $Message -ForegroundColor $Colors.Blue
    Write-Host "================================" -ForegroundColor $Colors.Blue
}

# Check if Docker is installed
function Test-Docker {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker is not installed or not in PATH"
        Write-Error "Please install Docker first: https://docs.docker.com/get-docker/"
        exit 1
    }
    
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Error "Docker Compose is not installed or not in PATH"
        Write-Error "Please install Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    }
    
    # Check if Docker daemon is running
    try {
        $null = docker info 2>$null
    } catch {
        Write-Error "Docker daemon is not running"
        Write-Error "Please start Docker Desktop or Docker service"
        exit 1
    }
}

# Check for .env file
function Test-EnvFile {
    if (-not (Test-Path ".env")) {
        Write-Warning ".env file not found. Creating with default values..."
        @"
# AnkiQuiz Environment Variables
POSTGRES_PASSWORD=ankiquiz123
"@ | Out-File -FilePath ".env" -Encoding utf8
        Write-Status "Created .env file with default password"
    }
}

# Stop existing services
function Stop-Services {
    Write-Status "Stopping existing services..."
    try { docker-compose -f docker-compose.yml down 2>$null } catch { }
    try { docker-compose -f docker-compose.yml -f docker-compose.prod.yml down 2>$null } catch { }
}

# Clean up old containers and images
function Invoke-Cleanup {
    Write-Status "Cleaning up old containers and images..."
    try { docker system prune -f 2>$null } catch { }
}

# Build and start services
function Start-Services {
    param([switch]$Production)
    
    Write-Status "Building and starting all services..."
    
    # Check if production secrets exist
    $secretsExist = $false
    try {
        $null = docker secret inspect postgres_password 2>$null
        $secretsExist = $true
    } catch { }
    
    if ($Production -and $secretsExist) {
        Write-Status "Using production configuration with secrets..."
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
    } elseif ($Production -and -not $secretsExist) {
        Write-Error "Production secrets not found. Please create them first:"
        Write-Host "  printf 'your_secure_password' | docker secret create postgres_password -"
        Write-Host "  printf 'Host=postgres;Port=5432;Database=ankiquizdb;Username=postgres;Password=your_secure_password' | docker secret create postgres_connection_string -"
        exit 1
    } else {
        if ($secretsExist) {
            Write-Warning "Production secrets found but not in production mode. Use 'prod' command to use them."
        }
        Write-Status "Using development configuration..."
        docker-compose -f docker-compose.yml up --build -d
    }
}

# Wait for services to be healthy
function Wait-ForServices {
    Write-Status "Waiting for services to be healthy..."
    
    # Wait for PostgreSQL
    Write-Status "Waiting for PostgreSQL..."
    $maxAttempts = 30
    for ($i = 1; $i -le $maxAttempts; $i++) {
        try {
            $result = docker exec ankiquiz-postgres pg_isready -U postgres 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Status "PostgreSQL is ready!"
                break
            }
        } catch { }
        
        Write-Host "." -NoNewline
        Start-Sleep 1
        
        if ($i -eq $maxAttempts) {
            Write-Warning "PostgreSQL may not be fully ready, but continuing..."
        }
    }
    
    # Wait for Backend
    Write-Status "Waiting for Backend API..."
    $maxAttempts = 60
    for ($i = 1; $i -le $maxAttempts; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Status "Backend API is ready!"
                break
            }
        } catch { }
        
        Write-Host "." -NoNewline
        Start-Sleep 1
        
        if ($i -eq $maxAttempts) {
            Write-Warning "Backend API may not be fully ready, but continuing..."
        }
    }
    
    # Wait for Frontend
    Write-Status "Waiting for Frontend..."
    $maxAttempts = 60
    for ($i = 1; $i -le $maxAttempts; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8000" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Status "Frontend is ready!"
                break
            }
        } catch { }
        
        Write-Host "." -NoNewline
        Start-Sleep 1
        
        if ($i -eq $maxAttempts) {
            Write-Warning "Frontend may not be fully ready, but continuing..."
        }
    }
}

# Show service status
function Show-Status {
    Write-Header "Service Status"
    docker-compose -f docker-compose.yml ps
    
    Write-Header "Access URLs"
    Write-Host "Frontend:" -ForegroundColor $Colors.Green -NoNewline
    Write-Host "     http://localhost:8000"
    Write-Host "Backend API:" -ForegroundColor $Colors.Green -NoNewline
    Write-Host "  http://localhost:8080"
    Write-Host "Health Check:" -ForegroundColor $Colors.Green -NoNewline
    Write-Host " http://localhost:8080/health"
    Write-Host ""
    Write-Host "Database:" -ForegroundColor $Colors.Blue -NoNewline
    Write-Host "      PostgreSQL on port 5432 (internal only)"
    Write-Host ""
    Write-Host "To view logs:" -ForegroundColor $Colors.Yellow -NoNewline
    Write-Host " docker-compose -f docker-compose.yml logs -f [service-name]"
    Write-Host "To stop:" -ForegroundColor $Colors.Yellow -NoNewline
    Write-Host "     docker-compose -f docker-compose.yml down"
}

# Main execution
function Main {
    Write-Header "AnkiQuiz Application Launcher (Docker)"
    
    Test-Docker
    Test-EnvFile
    
    switch ($Command.ToLower()) {
        "stop" {
            Stop-Services
            exit 0
        }
        "restart" {
            Stop-Services
            Start-Sleep 2
            Start-Services
            Wait-ForServices
            Show-Status
            exit 0
        }
        "clean" {
            Stop-Services
            Invoke-Cleanup
            exit 0
        }
        "status" {
            Show-Status
            exit 0
        }
        "logs" {
            if ($Arguments.Count -gt 0) {
                docker-compose -f docker-compose.yml logs -f $Arguments
            } else {
                docker-compose -f docker-compose.yml logs -f
            }
            exit 0
        }
        "prod" {
            Start-Services -Production
            Wait-ForServices
            Show-Status
            exit 0
        }
        "help" {
            Write-Host "AnkiQuiz Launcher Script (Docker - PowerShell)"
            Write-Host ""
            Write-Host "Usage: .\launch-docker.ps1 [COMMAND]"
            Write-Host ""
            Write-Host "Commands:"
            Write-Host "  start         Start all services in development mode (default)"
            Write-Host "  prod          Start in production mode (requires secrets)"
            Write-Host "  stop          Stop all services"
            Write-Host "  restart       Restart all services"
            Write-Host "  clean         Stop services and clean up containers/images"
            Write-Host "  status        Show service status and access URLs"
            Write-Host "  logs [service] Show logs for all services or specific service"
            Write-Host "  help          Show this help message"
            Write-Host ""
            Write-Host "Examples:"
            Write-Host "  .\launch-docker.ps1              # Start in development mode"
            Write-Host "  .\launch-docker.ps1 prod         # Start in production mode"
            Write-Host "  .\launch-docker.ps1 logs backend # Show backend logs"
            Write-Host "  .\launch-docker.ps1 status       # Show service status"
            exit 0
        }
        "start" {
            # Default action
            Stop-Services
            Start-Services
            Wait-ForServices
            Show-Status
            exit 0
        }
        default {
            Write-Error "Unknown command: $Command"
            Write-Host "Use '.\launch-docker.ps1 help' for usage information"
            exit 1
        }
    }
}

# Handle Ctrl+C gracefully
$originalErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"

try {
    Main
} finally {
    $ErrorActionPreference = $originalErrorActionPreference
}
