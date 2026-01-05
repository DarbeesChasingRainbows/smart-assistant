namespace LifeOS.Domain.Garage

open System
open LifeOS.Domain.Inventory
open LifeOS.Domain.Common

// Enhanced Component that references Inventory
type Component = {
    Id: ComponentId
    VehicleId: VehicleId option
    AssetId: AssetId option  // Reference to Inventory.Asset
    ItemId: ItemId            // Reference to Inventory.Item
    Position: string option
    InstallDate: DateTime option
    RemoveDate: DateTime option
    Notes: string option
    InstalledBy: string option
}

// Enhanced Maintenance Record with Inventory Items
type MaintenanceRecord = {
    Id: MaintenanceId
    VehicleId: VehicleId
    Type: MaintenanceType
    Description: string
    Date: DateTime
    Mileage: Mileage option
    ItemsUsed: MaintenanceItem list
    LaborHours: decimal
    LaborRate: decimal
    TotalCost: decimal
    PerformedBy: string
    InvoiceNumber: string option
    WarrantyInfo: string option
}

// Maintenance Item using Inventory
type MaintenanceItem = {
    ItemId: ItemId
    AssetId: AssetId option
    Quantity: decimal
    UnitCost: decimal
    FromLocation: LocationId
    BatchCode: string option
}

// Vehicle Installation Record
type InstallationRecord = {
    Id: Guid
    VehicleId: VehicleId
    AssetId: AssetId
    InstallDate: DateTime
    InstallMileage: Mileage
    InstalledBy: string
    Notes: string option
    RemoveDate: DateTime option
    RemoveMileage: Mileage option
    RemoveReason: string option
}

// DTOs for Garage Operations
type InstallComponentRequest = {
    VehicleId: Guid
    AssetId: Guid
    Position: string option
    Notes: string option
    InstalledBy: string
}

type RemoveComponentRequest = {
    VehicleId: Guid
    AssetId: Guid
    RemoveReason: string option
    ToLocationId: Guid option
}

type CreateMaintenanceRequest = {
    VehicleId: Guid
    Type: MaintenanceType
    Description: string
    Date: DateTime
    Mileage: decimal option
    ItemsUsed: MaintenanceItemRequest list
    LaborHours: decimal
    LaborRate: decimal
    PerformedBy: string
    InvoiceNumber: string option
}

type MaintenanceItemRequest = {
    ItemId: Guid
    AssetId: Guid option
    Quantity: decimal
    FromLocation: Guid
}

// Service Interfaces for Garage-Inventory Integration
type IGarageInventoryService =
    abstract member InstallComponentAsync: InstallComponentRequest -> InstallationRecord Async
    abstract member RemoveComponentAsync: RemoveComponentRequest -> unit Async
    abstract member GetInstalledComponentsAsync: VehicleId -> seq<Component> Async
    abstract member GetComponentHistoryAsync: AssetId -> seq<InstallationRecord> Async
    abstract member CreateMaintenanceRecordAsync: CreateMaintenanceRequest -> MaintenanceRecord Async
    abstract member GetMaintenanceHistoryAsync: VehicleId -> seq<MaintenanceRecord> Async
    abstract member GetVehicleInventoryValueAsync: VehicleId -> decimal Async

type IVehicleService =
    abstract member AddVehicleAsync: Vehicle -> Vehicle Async
    abstract member UpdateVehicleAsync: Vehicle -> Vehicle Async
    abstract member GetVehicleAsync: VehicleId -> FSharpOption<Vehicle> Async
    abstract member GetAllVehiclesAsync: unit -> seq<Vehicle> Async
    abstract member GetVehicleComponentsAsync: VehicleId -> seq<Component> Async
    abstract member GetVehicleMaintenanceAsync: VehicleId -> seq<MaintenanceRecord> Async

// Domain Events for Garage
type GarageEvent =
    | ComponentInstalled of InstallationRecord
    | ComponentRemoved of AssetId * VehicleId * DateTime
    | MaintenanceRecorded of MaintenanceRecord
    | VehicleAdded of Vehicle
    | VehicleUpdated of Vehicle

// Helper functions
module Component =
    let create (vehicleId: VehicleId option) (itemId: ItemId) (assetId: AssetId option) =
        {
            Id = ComponentId (Guid.NewGuid())
            VehicleId = vehicleId
            AssetId = assetId
            ItemId = itemId
            Position = None
            InstallDate = None
            RemoveDate = None
            Notes = None
            InstalledBy = None
        }
    
    let install (component: Component) (vehicleId: VehicleId) (position: string option) (installedBy: string) =
        { component with 
            VehicleId = Some vehicleId
            Position = position
            InstallDate = Some DateTime.UtcNow
            InstalledBy = Some installedBy
        }
    
    let remove (component: Component) (reason: string option) =
        { component with 
            VehicleId = None
            RemoveDate = Some DateTime.UtcNow
            Notes = reason
        }

module MaintenanceRecord =
    let create (vehicleId: VehicleId) (maintenanceType: MaintenanceType) (description: string) (date: DateTime) =
        {
            Id = MaintenanceId (Guid.NewGuid())
            VehicleId = vehicleId
            Type = maintenanceType
            Description = description
            Date = date
            Mileage = None
            ItemsUsed = []
            LaborHours = 0m
            LaborRate = 0m
            TotalCost = 0m
            PerformedBy = None
            InvoiceNumber = None
            WarrantyInfo = None
        }
    
    let calculateTotalCost (record: MaintenanceRecord) =
        let itemsCost = record.ItemsUsed |> List.sumBy (fun item -> item.Quantity * item.UnitCost)
        let laborCost = record.LaborHours * record.LaborRate
        itemsCost + laborCost
