namespace LifeOS.Domain.Inventory

open System
open Microsoft.FSharp.Core
open LifeOS.Domain.Common

// Core Inventory Types - Based on InvenTree and Snipe-IT patterns

type InventoryItemId = InventoryItemId of Guid
type StockLocationId = StockLocationId of Guid  
type AssetTag = AssetTag of string
type SerialNumber = SerialNumber of string
type SKU = SKU of string
type TransactionId = TransactionId of Guid
type AllocationId = AllocationId of Guid

// Inventory Status Types (Inspired by InvenTree stock management)
type InventoryStatus =
    | InStock
    | Allocated
    | Deployed
    | Maintenance
    | Retired
    | Lost
    | Damaged

type StockLocationType =
    | Warehouse
    | Vehicle
    | Workshop
    | Storage
    | External

// Core Inventory Item - Asset that can be used but not consumed
type InventoryItem = {
    Id: InventoryItemId
    AssetTag: AssetTag
    SerialNumber: SerialNumber option
    SKU: SKU
    Name: string
    Description: string
    Status: InventoryStatus
    Quantity: decimal
    UnitCost: decimal option
    PurchaseDate: System.DateTime option
    WarrantyExpiry: System.DateTime option
    Supplier: string option
    Notes: string option
    CreatedAt: System.DateTime
    UpdatedAt: System.DateTime
}

// Stock Location - Where inventory items are stored
type StockLocation = {
    Id: StockLocationId
    Name: string
    Description: string
    LocationType: StockLocationType
    ParentLocationId: StockLocationId option
    Path: string // Hierarchical path like "Warehouse/VehicleBay/Truck001"
    IsActive: bool
    CreatedAt: System.DateTime
    UpdatedAt: System.DateTime
}

// Stock Transaction - Track all inventory movements
type TransactionType =
    | StockIn
    | StockOut
    | Transfer
    | Adjustment
    | Allocation
    | Deallocation

type StockTransaction = {
    Id: TransactionId
    InventoryItemId: InventoryItemId
    TransactionType: TransactionType
    Quantity: decimal
    FromLocationId: StockLocationId option
    ToLocationId: StockLocationId option
    ReferenceNumber: string option
    Reason: string
    PerformedBy: UserId
    TransactionDate: System.DateTime
    Notes: string option
}

// Asset Allocation - Items allocated to specific use (like truck loading)
type AssetAllocation = {
    Id: AllocationId
    InventoryItemId: InventoryItemId
    AllocatedTo: string // Could be VehicleId, ProjectId, etc.
    AllocatedBy: UserId
    AllocatedAt: System.DateTime
    ExpectedReturnDate: System.DateTime option
    ActualReturnDate: System.DateTime option
    Status: AllocationStatus
    Notes: string option
}

and AllocationStatus =
    | Active
    | Returned
    | Overdue
    | Lost

// Inventory Aggregate Root
type Inventory = {
    Items: InventoryItem list
    Locations: StockLocation list
    Transactions: StockTransaction list
    Allocations: AssetAllocation list
}

// Domain Events for Event Sourcing
type InventoryEvent =
    | ItemCreated of InventoryItem
    | ItemUpdated of InventoryItem
    | StockAdjusted of InventoryItemId * decimal * StockLocationId * string
    | ItemTransferred of InventoryItemId * decimal * StockLocationId * StockLocationId
    | ItemAllocated of AssetAllocation
    | ItemDeallocated of AssetAllocation
    | LocationCreated of StockLocation
    | LocationUpdated of StockLocation

// Domain Services - Core business logic algorithms
type InventoryService =
    // Stock management algorithms
    abstract member GetAvailableStock: SKU -> StockLocationId -> decimal
    abstract member AllocateStock: SKU -> decimal -> string -> UserId -> AssetAllocation
    abstract member TransferStock: InventoryItemId -> decimal -> StockLocationId -> StockLocationId -> UserId -> StockTransaction
    abstract member AdjustStock: InventoryItemId -> decimal -> StockLocationId -> string -> UserId -> StockTransaction
    
    // Asset tracking algorithms  
    abstract member GetItemHistory: InventoryItemId -> StockTransaction list
    abstract member GetCurrentLocation: InventoryItemId -> StockLocationId option
    abstract member GetAllocatedItems: string -> AssetAllocation list
    
    // Reporting algorithms
    abstract member GetInventoryValue: StockLocationId option -> decimal
    abstract member GetLowStockItems: decimal -> InventoryItem list
    abstract member GetExpiringWarranties: System.DateTime -> InventoryItem list

// Repository Interfaces (Ports)
type IInventoryRepository =
    abstract member GetById: InventoryItemId -> InventoryItem option
    abstract member GetBySKU: SKU -> InventoryItem list
    abstract member GetByLocation: StockLocationId -> InventoryItem list
    abstract member Save: InventoryItem -> InventoryItem
    abstract member Delete: InventoryItemId -> unit

type IStockLocationRepository =
    abstract member GetById: StockLocationId -> StockLocation option
    abstract member GetByPath: string -> StockLocation option
    abstract member GetChildren: StockLocationId -> StockLocation list
    abstract member Save: StockLocation -> StockLocation

type IStockTransactionRepository =
    abstract member GetByItem: InventoryItemId -> StockTransaction list
    abstract member GetByDateRange: System.DateTime -> System.DateTime -> StockTransaction list
    abstract member Save: StockTransaction -> StockTransaction

type IAssetAllocationRepository =
    abstract member GetByItem: InventoryItemId -> AssetAllocation list
    abstract member GetByAllocatedTo: string -> AssetAllocation list
    abstract member GetActiveAllocations: AssetAllocation list
    abstract member Save: AssetAllocation -> AssetAllocation

// Factory functions for creating domain objects
module InventoryFactory =
    let createInventoryItem assetTag serialNumber sku name description quantity unitCost =
        {
            Id = InventoryItemId (Guid.NewGuid())
            AssetTag = assetTag
            SerialNumber = serialNumber
            SKU = sku
            Name = name
            Description = description
            Status = InStock
            Quantity = quantity
            UnitCost = unitCost
            PurchaseDate = None
            WarrantyExpiry = None
            Supplier = None
            Notes = None
            CreatedAt = System.DateTime.UtcNow
            UpdatedAt = System.DateTime.UtcNow
        }
    
    let createStockLocation name description locationType parentLocationId path =
        {
            Id = StockLocationId (Guid.NewGuid())
            Name = name
            Description = description
            LocationType = locationType
            ParentLocationId = parentLocationId
            Path = path
            IsActive = true
            CreatedAt = System.DateTime.UtcNow
            UpdatedAt = System.DateTime.UtcNow
        }
    
    let createStockTransaction inventoryItemId transactionType quantity fromLocationId toLocationId reason performedBy =
        {
            Id = TransactionId (Guid.NewGuid())
            InventoryItemId = inventoryItemId
            TransactionType = transactionType
            Quantity = quantity
            FromLocationId = fromLocationId
            ToLocationId = toLocationId
            ReferenceNumber = None
            Reason = reason
            PerformedBy = performedBy
            TransactionDate = System.DateTime.UtcNow
            Notes = None
        }
    
    let createAssetAllocation inventoryItemId allocatedTo allocatedBy expectedReturnDate =
        {
            Id = AllocationId (Guid.NewGuid())
            InventoryItemId = inventoryItemId
            AllocatedTo = allocatedTo
            AllocatedBy = allocatedBy
            AllocatedAt = System.DateTime.UtcNow
            ExpectedReturnDate = expectedReturnDate
            ActualReturnDate = None
            Status = Active
            Notes = None
        }

// Helper modules for working with types
module InventoryItemId =
    let value (InventoryItemId id) = id
    let create id = InventoryItemId id

module StockLocationId =
    let value (StockLocationId id) = id
    let create id = StockLocationId id

module AssetTag =
    let value (AssetTag tag) = tag
    let create tag = AssetTag tag

module SerialNumber =
    let value (SerialNumber sn) = sn
    let create sn = SerialNumber sn

module SKU =
    let value (SKU sku) = sku
    let create sku = SKU sku

module AllocationId =
    let value (AllocationId id) = id
    let create id = AllocationId id

module TransactionId =
    let value (TransactionId id) = id
    let create id = TransactionId id

module UserId =
    let value (UserId id) = id
    let create id = UserId id
