# ArangoDB Database Initialization Script
# This script creates the necessary collections for LifeOS

$ArangoUrl = "http://localhost:8529"
$DatabaseName = "lifeos"
$Username = "root"
$Password = ""

# Collections to create
$collections = @(
    "vehicles", "components", "inventory_skus", "inventory_assets", "inventory_lots",
    "inventory_movements", "inventory_locations", "inventory_bins", "inventory_stock_levels",
    "users", "people_employments", "maintenance_records", "crop_batches", "garden_beds",
    "species", "medicinal_actions", "active_constituents", "tasks", "skills", "identities",
    "habits", "visions", "kras", "kpis", "financial_transactions", "financial_accounts",
    "financial_merchants", "financial_journal_entries", "financial_receipts",
    "financial_reconciliations", "financial_budgets", "financial_categories", "pay_period_config"
)

# Edge collections to create
$edgeCollections = @(
    "installed_on", "asset_installations", "people_relationships", "serviced", "worked_on",
    "consumed", "performed", "contributes_to", "measures", "owned_by", "has_medicinal_action",
    "contains_constituent", "treats_indication"
)

Write-Host "Connecting to ArangoDB at $ArangoUrl..." -ForegroundColor Green

# Create database if it doesn't exist
try {
    $response = Invoke-RestMethod -Uri "$ArangoUrl/_api/database/$DatabaseName" -Method GET -Headers @{ "Authorization" = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$Username`:$Password")))" }
    Write-Host "Database '$DatabaseName' already exists" -ForegroundColor Yellow
}
catch {
    try {
        $body = @{ name = $DatabaseName } | ConvertTo-Json
        Invoke-RestMethod -Uri "$ArangoUrl/_api/database" -Method POST -Body $body -ContentType "application/json" -Headers @{ "Authorization" = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$Username`:$Password")))" }
        Write-Host "Created database '$DatabaseName'" -ForegroundColor Green
    }
    catch {
        Write-Host "Failed to create database: $_" -ForegroundColor Red
        exit 1
    }
}

# Function to create a collection
function Create-Collection {
    param(
        [string]$Name,
        [string]$Type = "2"
    )
    
    try {
        $response = Invoke-RestMethod -Uri "$ArangoUrl/_db/$DatabaseName/_api/collection/$Name" -Method GET -Headers @{ "Authorization" = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$Username`:$Password")))" }
        Write-Host "Collection '$Name' already exists" -ForegroundColor Yellow
    }
    catch {
        try {
            $body = @{ name = $Name; type = $Type } | ConvertTo-Json
            Invoke-RestMethod -Uri "$ArangoUrl/_db/$DatabaseName/_api/collection" -Method POST -Body $body -ContentType "application/json" -Headers @{ "Authorization" = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$Username`:$Password")))" }
            Write-Host "Created collection '$Name'" -ForegroundColor Green
        }
        catch {
            Write-Host "Failed to create collection '$Name': $_" -ForegroundColor Red
        }
    }
}

# Create vertex collections
Write-Host "`nCreating vertex collections..." -ForegroundColor Cyan
foreach ($collection in $collections) {
    Create-Collection -Name $collection -Type "2"
}

# Create edge collections
Write-Host "`nCreating edge collections..." -ForegroundColor Cyan
foreach ($collection in $edgeCollections) {
    Create-Collection -Name $collection -Type "3"
}

Write-Host "`nDatabase initialization complete!" -ForegroundColor Green
