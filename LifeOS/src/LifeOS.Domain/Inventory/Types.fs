namespace LifeOS.Domain.Inventory

open System

// Core Types
type ItemId = ItemId of Guid
type AssetId = AssetId of Guid
type LocationId = LocationId of Guid
type StockId = StockId of Guid
type MovementId = MovementId of Guid

// Value Objects
type UnitOfMeasure =
    | Each
    | Pair
    | Set
    | Box
    | Bag
    | Foot
    | Meter
    | Kilogram
    | Pound
    | Liter
    | Gallon
    | Ounce
    | Gram
    | Custom of string

type ItemCategory =
    | Hardware
    | Fastener
    | Fluid
    | Tool
    | Electrical
    | Body
    | Interior
    | Performance
    | Maintenance
    | Custom of string

type AssetCondition =
    | New
    | Excellent
    | Good
    | Fair
    | Poor
    | Damaged
    | Unusable

type AssetStatus =
    | Available
    | InUse
    | Reserved
    | InTransit
    | OutForRepair
    | Maintenance
    | Damaged
    | Retired
    | Lost
    | Disposed
    | Unknown

type LocationType =
    | Warehouse
    | Store
    | Garage
    | Shed
    | Shelf
    | Cabinet
    | Bin
    | Room
    | Aisle
    | Vehicle
    | Virtual
    | Custom of string

type MovementType =
    | Purchase
    | Sale
    | Transfer
    | Adjustment
    | Consumption
    | Return
    | Build
    | Disassembly
    | Disposal
    | Custom of string

// Main Entities
type Item = {
    Id: ItemId
    SKU: string
    Name: string
    Description: string option
    Category: ItemCategory
    UnitOfMeasure: UnitOfMeasure
    DefaultCost: decimal
    DefaultPrice: decimal
    Supplier: string option
    PartNumber: string option
    Barcode: string option
    Images: string list
    Specifications: Map<string, string>
    IsActive: bool
    CreatedAt: DateTime
    UpdatedAt: DateTime
}

type Asset = {
    Id: AssetId
    ItemId: ItemId
    SerialNumber: string option
    BatchCode: string option
    Condition: AssetCondition
    Status: AssetStatus
    LocationId: LocationId option
    Cost: decimal
    PurchaseDate: DateTime option
    WarrantyExpiry: DateTime option
    Notes: string option
    Metadata: Map<string, obj>
    CreatedAt: DateTime
    UpdatedAt: DateTime
}

type Location = {
    Id: LocationId
    Name: string
    Description: string option
    Type: LocationType
    ParentId: LocationId option
    Path: string
    Capacity: decimal option
    IsActive: bool
    Tags: string list
    CreatedAt: DateTime
    UpdatedAt: DateTime
}

type StockRecord = {
    Id: StockId
    ItemId: ItemId
    LocationId: LocationId
    Quantity: decimal
    ReservedQuantity: decimal
    MinLevel: decimal
    MaxLevel: decimal
    LastUpdated: DateTime
}

type Movement = {
    Id: MovementId
    Reference: string
    Type: MovementType
    FromLocationId: LocationId option
    ToLocationId: LocationId option
    ItemId: ItemId
    Quantity: decimal
    Cost: decimal option
    Reason: string
    UserId: string
    OccurredAt: DateTime
    CreatedAt: DateTime
}

// Request DTOs
type CreateItemRequest = {
    SKU: string
    Name: string
    Description: string option
    Category: ItemCategory
    UnitOfMeasure: UnitOfMeasure
    DefaultCost: decimal
    DefaultPrice: decimal
    Supplier: string option
    PartNumber: string option
    Barcode: string option
    Specifications: Map<string, string>
}

type UpdateItemRequest = {
    Name: string option
    Description: string option
    Category: ItemCategory option
    UnitOfMeasure: UnitOfMeasure option
    DefaultCost: decimal option
    DefaultPrice: decimal option
    Supplier: string option
    PartNumber: string option
    Barcode: string option
    Specifications: Map<string, string> option
    IsActive: bool option
}

type CreateAssetRequest = {
    ItemId: Guid
    SerialNumber: string option
    BatchCode: string option
    Condition: AssetCondition
    Status: AssetStatus
    LocationId: Guid option
    Cost: decimal
    PurchaseDate: DateTime option
    WarrantyExpiry: DateTime option
    Notes: string option
}

type CreateLocationRequest = {
    Name: string
    Description: string option
    Type: LocationType
    ParentId: Guid option
    Capacity: decimal option
    Tags: string list
}

type StockAdjustmentRequest = {
    ItemId: Guid
    LocationId: Guid
    Quantity: decimal
    Reason: string
}

type MovementRequest = {
    Type: MovementType
    FromLocationId: Guid option
    ToLocationId: Guid option
    ItemId: Guid
    Quantity: decimal
    Cost: decimal option
    Reason: string
}

// Helper modules
[<CompiledName("ItemIdModule")>]
module ItemId =
    let create () = ItemId (Guid.NewGuid())
    let fromGuid (g: Guid) = ItemId g
    let toValue (ItemId g) = g

[<CompiledName("AssetIdModule")>]
module AssetId =
    let create () = AssetId (Guid.NewGuid())
    let fromGuid (g: Guid) = AssetId g
    let toValue (AssetId g) = g

[<CompiledName("LocationIdModule")>]
module LocationId =
    let create () = LocationId (Guid.NewGuid())
    let fromGuid (g: Guid) = LocationId g
    let toValue (LocationId g) = g

[<CompiledName("StockIdModule")>]
module StockId =
    let create () = StockId (Guid.NewGuid())
    let fromGuid (g: Guid) = StockId g
    let toValue (StockId g) = g

[<CompiledName("MovementIdModule")>]
module MovementId =
    let create () = MovementId (Guid.NewGuid())
    let fromGuid (g: Guid) = MovementId g
    let toValue (MovementId g) = g
