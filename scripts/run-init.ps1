# PowerShell script to run ArangoDB initialization
# This script will execute the init-arangodb.js script in ArangoDB

# Configuration
$ArangoURL = "http://localhost:8529"
$Database = "_system"
$Username = "root"
$Password = ""

Write-Host "Connecting to ArangoDB at $ArangoURL..." -ForegroundColor Green

# Check if ArangoDB is running
try {
    Invoke-WebRequest -Uri "$ArangoURL/_api/version" -UseBasicParsing | Out-Null
    Write-Host "ArangoDB is running" -ForegroundColor Green
}
catch {
    Write-Host "Error: Cannot connect to ArangoDB. Please ensure it's running at $ArangoURL" -ForegroundColor Red
    exit 1
}

# Run the initialization script
$scriptPath = Join-Path $PSScriptRoot "init-arangodb.js"
Write-Host "Running initialization script: $scriptPath" -ForegroundColor Green

try {
    # Use arangosh to execute the script
    & arangosh --server.endpoint $ArangoURL --server.database $Database --server.username $Username --server.password $Password --javascript.execute $scriptPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database initialization completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Error during database initialization. Exit code: $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}
catch {
    Write-Host "Error running initialization script: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Done!" -ForegroundColor Green
