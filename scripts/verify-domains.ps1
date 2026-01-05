# PowerShell script to verify all domain collections are properly initialized
# This script checks each domain's collections in ArangoDB

$ArangoURL = "http://localhost:8529"
$Database = "lifeos"
$Username = "root"
$Password = "lifeos123"

Write-Host "Verifying LifeOS Domain Collections" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Domain mappings
$domains = @{
    "Garage/Vehicle" = @("vehicles", "components", "maintenance_records")
    "Inventory" = @("inventory_skus", "inventory_assets", "inventory_lots", "inventory_movements", "inventory_locations", "inventory_bins", "inventory_stock_levels")
    "Garden" = @("species", "crop_batches", "garden_beds", "plants", "medicinal_actions", "active_constituents")
    "People/HR" = @("users", "people_employments", "identities", "skills")
    "Finance" = @("financial_accounts", "financial_merchants", "financial_transactions", "financial_journal_entries", "financial_receipts", "financial_reconciliations", "financial_budgets", "financial_categories", "pay_period_config")
    "Productivity/Dojo" = @("tasks", "habits", "goals", "visions", "kras", "kpis", "courses", "lessons")
}

# Edge collections
$edgeCollections = @(
    "installed_on", "asset_installations", "serviced", "people_relationships", "belongs_to",
    "planted_in", "supports", "builds", "enrolled_in", "completed", "worked_on", "consumed",
    "performed", "contributes_to", "measures", "owned_by", "has_medicinal_action", "contains_constituent", "treats_indication"
)

# Function to check if collection exists
function Test-Collection {
    param($CollectionName)
    
    try {
        Invoke-RestMethod -Uri "$ArangoURL/_db/$Database/_api/collection/$CollectionName" -Headers @{
            Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$Username`:$Password"))
        } -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Check vertex collections
Write-Host "`nVertex Collections:" -ForegroundColor Yellow
$allVertexExists = $true

foreach ($domain in $domains.Keys) {
    Write-Host "`n  $domain Domain:" -ForegroundColor Green
    $domainExists = $true
    
    foreach ($collection in $domains[$domain]) {
        $exists = Test-Collection $collection
        $status = if ($exists) { "OK" } else { "MISSING" }
        Write-Host "    $status $collection" -ForegroundColor $(if ($exists) { "Green" } else { "Red" })
        if (-not $exists) { 
            $domainExists = $false
            $allVertexExists = $false
        }
    }
    
    if (-not $domainExists) {
        Write-Host "    → Some collections missing!" -ForegroundColor Red
    }
}

# Check edge collections
Write-Host "`nEdge Collections:" -ForegroundColor Yellow
$allEdgeExists = $true

foreach ($collection in $edgeCollections) {
    $exists = Test-Collection $collection
    $status = if ($exists) { "OK" } else { "MISSING" }
    Write-Host "  $status $collection" -ForegroundColor $(if ($exists) { "Green" } else { "Red" })
    if (-not $exists) { $allEdgeExists = $false }
}

# Summary
Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan

if ($allVertexExists -and $allEdgeExists) {
    Write-Host "SUCCESS: All domain collections are properly initialized!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "ERROR: Some collections are missing. Please run the initialization script." -ForegroundColor Red
    exit 1
}
