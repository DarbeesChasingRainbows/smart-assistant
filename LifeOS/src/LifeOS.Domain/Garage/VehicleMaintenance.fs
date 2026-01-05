namespace LifeOS.Domain.Garage

open System
open System.Threading.Tasks
open LifeOS.Domain.Common

type MaintenanceItem = {
    ItemType: string
    Name: string
    Url: string option
    Quantity: decimal option
    Unit: string option
}

type VehicleMaintenanceRecord = {
    Id: Guid
    VehicleId: VehicleId
    Date: DateTime
    Mileage: Mileage option
    Description: string
    Cost: decimal option
    PerformedBy: string option
    Items: MaintenanceItem list
}

type IVehicleMaintenanceRepository =
    abstract member GetByIdAsync : Guid -> Task<VehicleMaintenanceRecord option>
    abstract member GetByVehicleIdAsync : VehicleId -> Task<VehicleMaintenanceRecord seq>
    abstract member GetByVehicleIdAndIdempotencyKeyAsync : VehicleId * string -> Task<VehicleMaintenanceRecord option>
    abstract member AddAsync : VehicleMaintenanceRecord * string -> Task<VehicleMaintenanceRecord>
    abstract member DeleteAsync : Guid -> Task<bool>

type VehicleMaintenanceInterop =
    static member CreateMaintenanceItem(
        itemType: string,
        name: string,
        url: string option,
        quantity: Nullable<decimal>,
        unit: string option
    ) : MaintenanceItem =
        {
            ItemType = itemType
            Name = name
            Url = url
            Quantity = if quantity.HasValue then Some quantity.Value else None
            Unit = unit
        }

    static member CreateVehicleMaintenanceRecord(
        id: Guid,
        vehicleId: Guid,
        date: DateTime,
        mileage: Nullable<decimal>,
        description: string,
        cost: Nullable<decimal>,
        performedBy: string option,
        items: MaintenanceItem list
    ) : VehicleMaintenanceRecord =
        {
            Id = id
            VehicleId = Id.createVehicleIdFrom(vehicleId)
            Date = date
            Mileage = if mileage.HasValue then Some (Mileage mileage.Value) else None
            Description = description
            Cost = if cost.HasValue then Some cost.Value else None
            PerformedBy = performedBy
            Items = items
        }
