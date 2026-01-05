# Inventory Redesign Plan - LightSpeed-Style System

## Overview
Restructure inventory as a separate, domain-agnostic service that can serve the garage, garden, home, and future commercial operations. Inspired by LightSpeed POS with commercial-grade features while maintaining simplicity for family use.

## Architecture

### 1. Core Inventory Domain (Separate from Garage)
```
Inventory/
├── Domain/
│   ├── Items/          // Products/SKUs (what you buy)
│   ├── Assets/         // Actual items (what you own)
│   ├── Locations/      // Where things are stored
│   ├── Stock/          // Quantity tracking
│   ├── Movements/      // Transfer history
│   └── Valuation/      // Cost basis, pricing
├── Infrastructure/
│   ├── Repositories/
│   └── Services/
└── API/
    └── Endpoints/
```

### 2. Garage Domain (Consumer of Inventory)
```
Garage/
├── Domain/
│   ├── Vehicles/
│   ├── Components/     // Links to Inventory Assets
│   ├── Maintenance/    // Uses Inventory Items
│   └── Installations/  // Which assets are on which vehicles
```

## Data Model

### Inventory Core Entities

#### Item (SKU)
- Id: ItemId
- SKU: string
- Name: string
- Description: string
- Category: ItemCategory
- UnitOfMeasure: Unit
- DefaultCost: decimal
- DefaultPrice: decimal
- Supplier: string option
- PartNumber: string option
- Barcode: string option
- Images: string list
- Specifications: Map<string, string>
- IsActive: bool
- CreatedAt: DateTime
- UpdatedAt: DateTime

#### Asset (Individual Item)
- Id: AssetId
- ItemId: ItemId
- SerialNumber: string option
- BatchCode: string option
- Condition: AssetCondition
- Status: AssetStatus
- LocationId: LocationId
- Cost: decimal
- PurchaseDate: DateTime option
- WarrantyExpiry: DateTime option
- Notes: string option
- Metadata: Map<string, obj>
- CreatedAt: DateTime
- UpdatedAt: DateTime

#### Location
- Id: LocationId
- Name: string
- Description: string
- Type: LocationType
- ParentId: LocationId option
- Path: string (computed)
- Capacity: decimal option
- IsActive: bool
- Tags: string list

#### StockRecord
- Id: StockId
- ItemId: ItemId
- LocationId: LocationId
- Quantity: decimal
- ReservedQuantity: decimal
- AvailableQuantity: decimal (computed)
- LastUpdated: DateTime
- MinLevel: decimal
- MaxLevel: decimal

#### Movement
- Id: MovementId
- Reference: string
- Type: MovementType
- FromLocationId: LocationId option
- ToLocationId: LocationId option
- ItemId: ItemId
- Quantity: decimal
- Cost: decimal option
- Reason: string
- UserId: UserId
- OccurredAt: DateTime

### Garage-Specific Entities

#### Vehicle
- Id: VehicleId
- VIN: string
- Make: string
- Model: string
- Year: int
- Mileage: int
- Status: VehicleStatus
- LocationId: LocationId (references Inventory.Location)

#### Component
- Id: ComponentId
- VehicleId: VehicleId
- AssetId: AssetId option (references Inventory.Asset)
- ItemId: ItemId (references Inventory.Item)
- Position: string
- InstallDate: DateTime
- RemoveDate: DateTime option
- Notes: string

#### MaintenanceRecord
- Id: MaintenanceId
- VehicleId: VehicleId
- Type: MaintenanceType
- Description: string
- Date: DateTime
- Mileage: int
- ItemsUsed: MaintenanceItem list
- LaborHours: decimal
- LaborRate: decimal
- TotalCost: decimal
- PerformedBy: string

#### MaintenanceItem
- ItemId: ItemId
- Quantity: decimal
- UnitCost: decimal
- FromLocation: LocationId

## API Structure

### Inventory API (`/api/v1/inventory`)
```
GET    /items              - List all items
POST   /items              - Create new item
GET    /items/{id}         - Get item details
PUT    /items/{id}         - Update item
DELETE /items/{id}         - Delete item

GET    /items/{id}/stock   - Get stock levels for item
POST   /items/{id}/stock   - Adjust stock levels

GET    /assets             - List all assets
POST   /assets             - Create new asset
GET    /assets/{id}        - Get asset details
PUT    /assets/{id}        - Update asset
DELETE /assets/{id}        - Delete asset

GET    /locations          - List locations
POST   /locations          - Create location
GET    /locations/{id}     - Get location details
PUT    /locations/{id}     - Update location
DELETE /locations/{id}     - Delete location

GET    /locations/{id}/contents - List items in location
POST   /movements          - Record movement
GET    /movements          - List movements
```

### Garage API (`/api/v1/garage`)
```
GET    /vehicles           - List vehicles
POST   /vehicles           - Add vehicle
GET    /vehicles/{id}      - Get vehicle details
PUT    /vehicles/{id}      - Update vehicle

GET    /vehicles/{id}/components - List installed components
POST   /vehicles/{id}/components - Install component
DELETE /vehicles/{id}/components/{id} - Remove component

GET    /vehicles/{id}/maintenance - Get maintenance history
POST   /vehicles/{id}/maintenance - Record maintenance
PUT    /maintenance/{id}  - Update maintenance record
```

## Implementation Steps

1. **Create Inventory Domain**
   - Define F# domain types
   - Create repository interfaces
   - Implement ArangoDB repositories

2. **Update Garage Domain**
   - Modify Component to reference Inventory Asset
   - Update Maintenance to use Inventory Items
   - Create installation tracking

3. **Implement Services**
   - Inventory service for stock management
   - Garage service for vehicle operations
   - Shared valuation service

4. **Build APIs**
   - Inventory endpoints with full CRUD
   - Garage endpoints using inventory
   - Reporting endpoints

5. **Add Commercial Features**
   - Purchase orders
   - Supplier management
   - Cost tracking
   - Reporting/analytics

## Key Features

### For Family Use
- Simple item tracking
- Location awareness
- Basic maintenance records
- Cost tracking

### For Commercial Extension
- Multi-warehouse support
- Purchase order management
- Supplier integration
- Barcode scanning
- Audit trails
- Reporting dashboard
- API for integrations

## Database Schema Updates

### New Collections
- `inventory_items` (replaces inventory_skus)
- `inventory_assets` (enhanced)
- `inventory_locations` (enhanced)
- `inventory_stock` (new)
- `inventory_movements` (enhanced)
- `inventory_valuations` (new)

### Updated Collections
- `vehicles` (add location_id)
- `components` (add asset_id, item_id)
- `maintenance_records` (add items_used)

## Edge Collections
- `located_in` - Asset -> Location
- `contains` - Location -> Asset
- `installed_on` - Asset -> Vehicle
- `used_in` - Item -> Maintenance
- `moved_from` - Movement -> Location
- `moved_to` - Movement -> Location
