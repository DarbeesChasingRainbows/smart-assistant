namespace LifeOS.Domain.Inventory

open System
open System.Collections.Generic
open System.Threading.Tasks
open Microsoft.FSharp.Core
open Microsoft.FSharp.Collections

// Repository Interfaces
type IItemRepository =
    abstract member GetByIdAsync: ItemId -> Task<Item option>
    abstract member GetBySKUAsync: string -> Task<Item option>
    abstract member GetAllAsync: unit -> Task<Item seq>
    abstract member GetByCategoryAsync: ItemCategory -> Task<Item seq>
    abstract member SearchAsync: string -> Task<Item seq>
    abstract member AddAsync: Item -> Task<Item>
    abstract member UpdateAsync: Item -> Task<Item>
    abstract member DeleteAsync: ItemId -> Task<bool>

type IAssetRepository =
    abstract member GetByIdAsync: AssetId -> Task<Asset option>
    abstract member GetByItemIdAsync: ItemId -> Task<Asset seq>
    abstract member GetByLocationAsync: LocationId -> Task<Asset seq>
    abstract member GetBySerialNumberAsync: string -> Task<Asset option>
    abstract member GetByStatusAsync: AssetStatus -> Task<Asset seq>
    abstract member GetAllAsync: unit -> Task<Asset seq>
    abstract member AddAsync: Asset -> Task<Asset>
    abstract member UpdateAsync: Asset -> Task<Asset>
    abstract member DeleteAsync: AssetId -> Task<bool>

type ILocationRepository =
    abstract member GetByIdAsync: LocationId -> Task<Location option>
    abstract member GetByParentAsync: LocationId -> Task<Location seq>
    abstract member GetByTypeAsync: LocationType -> Task<Location seq>
    abstract member GetRootLocationsAsync: unit -> Task<Location seq>
    abstract member GetPathAsync: LocationId -> Task<Location seq>
    abstract member GetAllAsync: unit -> Task<Location seq>
    abstract member AddAsync: Location -> Task<Location>
    abstract member UpdateAsync: Location -> Task<Location>
    abstract member DeleteAsync: LocationId -> Task<bool>

type IStockRepository =
    abstract member GetByItemAsync: ItemId -> Task<StockRecord seq>
    abstract member GetByLocationAsync: LocationId -> Task<StockRecord seq>
    abstract member GetByItemAndLocationAsync: ItemId -> LocationId -> Task<StockRecord option>
    abstract member GetLowStockAsync: unit -> Task<StockRecord seq>
    abstract member SetStockLevelAsync: ItemId -> LocationId -> decimal -> Task
    abstract member AdjustStockAsync: ItemId -> LocationId -> decimal -> decimal -> Task
    abstract member GetAvailableQuantityAsync: ItemId -> LocationId -> Task<decimal>

type IMovementRepository =
    abstract member GetByIdAsync: MovementId -> Task<Movement option>
    abstract member GetByItemAsync: ItemId -> DateTime option -> DateTime option -> Task<Movement seq>
    abstract member GetByLocationAsync: LocationId -> DateTime option -> DateTime option -> Task<Movement seq>
    abstract member GetByReferenceAsync: string -> Task<Movement seq>
    abstract member AddAsync: Movement -> Task<Movement>
    abstract member GetMovementsAsync: DateTime option -> DateTime option -> int option -> Task<Movement seq>

// Service Interfaces
type IInventoryService =
    abstract member CreateItemAsync: CreateItemRequest -> Task<Item>
    abstract member UpdateItemAsync: ItemId -> UpdateItemRequest -> Task<Item>
    abstract member CreateAssetAsync: CreateAssetRequest -> Task<Asset>
    abstract member MoveAssetAsync: AssetId -> LocationId -> Task
    abstract member AdjustStockAsync: StockAdjustmentRequest -> Task
    abstract member CreateMovementAsync: MovementRequest -> Task<Movement>
    abstract member GetStockLevelsAsync: ItemId -> Task<Dictionary<LocationId, decimal>>
    abstract member GetItemValueAsync: ItemId -> Task<decimal>
    abstract member GetLocationValueAsync: LocationId -> Task<decimal>

type ILocationService =
    abstract member CreateLocationAsync: CreateLocationRequest -> Task<Location>
    abstract member GetLocationTreeAsync: unit -> Task<Location seq>
    abstract member GetLocationContentsAsync: LocationId -> Task<Asset seq>
    abstract member CalculateCapacityUtilizationAsync: LocationId -> Task<decimal>

// Reporting Interfaces
type IInventoryReporting =
    abstract member GetInventoryValuationAsync: unit -> Task<decimal>
    abstract member GetInventoryByCategoryAsync: unit -> Task<Dictionary<ItemCategory, decimal>>
    abstract member GetLowStockReportAsync: unit -> Task<Item seq * decimal>
    abstract member GetMovementReportAsync: DateTime -> DateTime -> Task<Dictionary<MovementType, decimal>>
    abstract member GetAssetTrackingReportAsync: AssetId -> Task<Movement seq>
