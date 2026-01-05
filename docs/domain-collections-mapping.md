# LifeOS Domain to Collections Mapping

This document maps each domain to its corresponding ArangoDB collections.

## Garage/Vehicle Domain
**Vertex Collections:**
- `vehicles` - Vehicle entities
- `components` - Vehicle parts/components
- `maintenance_records` - Maintenance logs

**Edge Collections:**
- `installed_on` - Component -> Vehicle relationship
- `serviced` - Component -> MaintenanceRecord relationship

## Inventory Domain
**Vertex Collections:**
- `inventory_skus` - Product definitions
- `inventory_assets` - Actual items
- `inventory_lots` - Batch tracking
- `inventory_movements` - Transfer records
- `inventory_locations` - Storage locations
- `inventory_bins` - Bin locations
- `inventory_stock_levels` - Stock counts

**Edge Collections:**
- `asset_installations` - Vehicle -> InventoryAsset relationship

## Garden Domain
**Vertex Collections:**
- `species` - Plant species definitions
- `crop_batches` - Planting batches
- `garden_beds` - Garden bed definitions
- `plants` - Individual plants
- `medicinal_actions` - Medicinal uses
- `active_constituents` - Chemical compounds

**Edge Collections:**
- `planted_in` - Plant -> GardenBed relationship
- `has_medicinal_action` - Species -> MedicinalAction
- `contains_constituent` - Species -> ActiveConstituent
- `treats_indication` - MedicinalAction -> Condition

## People/HR Domain
**Vertex Collections:**
- `users` - User accounts
- `people_employments` - Employment records
- `identities` - Person identities
- `skills` - Skills/competencies

**Edge Collections:**
- `people_relationships` - Person -> Person relationships
- `owned_by` - Resource -> User relationship

## Finance Domain
**Vertex Collections:**
- `financial_accounts` - Bank accounts
- `financial_merchants` - Vendors
- `financial_transactions` - Transactions
- `financial_journal_entries` - Double-entry ledger
- `financial_receipts` - Receipt images/data
- `financial_reconciliations` - Reconciliation records
- `financial_budgets` - Budget definitions
- `financial_categories` - Transaction categories
- `pay_period_config` - Payroll periods

## Productivity/Dojo Domain
**Vertex Collections:**
- `tasks` - Task items
- `habits` - Habit definitions
- `goals` - Goal definitions
- `visions` - Vision statements
- `kras` - Key Result Areas
- `kpis` - Key Performance Indicators
- `courses` - Training courses
- `lessons` - Course lessons

**Edge Collections:**
- `worked_on` - User -> Task
- `performed` - User -> Habit
- `contributes_to` - Task -> Goal
- `measures` - KPI -> KRA
- `builds` - Habit -> Goal
- `supports` - Goal -> Vision
- `enrolled_in` - User -> Course
- `completed` - User -> Lesson

## Cross-Domain Relationships
**Edge Collections:**
- `consumed` - CropBatch -> Expense (Finance)
- `owned_by` - Any asset -> User

## Missing Collections
The following collections are defined in ArangoDbContext but may be missing from the init script:
- `goals` - Present in init script
- `courses` - Present in init script  
- `lessons` - Present in init script
- `plants` - Present in init script

All collections appear to be properly mapped between the C# code and JavaScript initialization script.
