namespace LifeOS.Domain.Inventory

open Microsoft.FSharp.Core
open LifeOS.Domain.Common

/// Core inventory service implementing asset tracking and stock management algorithms
/// Based on InvenTree and Snipe-IT patterns for professional inventory management
type InventoryDomainService(
    inventoryRepo: IInventoryRepository,
    locationRepo: IStockLocationRepository,
    transactionRepo: IStockTransactionRepository,
    allocationRepo: IAssetAllocationRepository
) =
    
    interface InventoryService with
        
        /// Gets available stock quantity for a specific SKU at a location
        /// Algorithm: Sum all items with SKU at location, subtract allocated quantities
        member _.GetAvailableStock(sku: SKU, locationId: StockLocationId) : decimal =
            let items = inventoryRepo.GetBySKU(sku)
            let locationItems = 
                items 
                |> List.filter (fun item -> 
                    // Get current location of item through transactions
                    let currentLoc = _.GetCurrentLocation(item.Id)
                    match currentLoc with
                    | Some loc -> loc = locationId
                    | None -> false)
                |> List.filter (fun item -> item.Status = InStock)
            
            let totalQuantity = locationItems |> List.sumBy (fun item -> item.Quantity)
            
            // Subtract allocated quantities
            let allocations = allocationRepo.GetByAllocatedTo($"location/{StockLocationId.value locationId}")
            let allocatedQuantity = 
                allocations 
                |> List.filter (fun alloc -> 
                    let item = inventoryRepo.GetById(alloc.InventoryItemId)
                    match item with
                    | Some invItem -> SKU.value invItem.SKU = SKU.value sku
                    | None -> false)
                |> List.filter (fun alloc -> alloc.Status = Active)
                |> List.sumBy (fun alloc -> 
                    let item = inventoryRepo.GetById(alloc.InventoryItemId)
                    match item with
                    | Some invItem -> invItem.Quantity
                    | None -> 0m)
            
            totalQuantity - allocatedQuantity
        
        /// Allocates stock to a specific use (e.g., loading onto truck)
        /// Algorithm: Check availability, create allocation, update status
        member _.AllocateStock(sku: SKU, quantity: decimal, allocatedTo: string, performedBy: UserId) : AssetAllocation =
            // Find available items with requested SKU
            let availableItems = inventoryRepo.GetBySKU(sku)
            
            // Check if we have enough available stock
            let totalAvailable = availableItems |> List.sumBy (fun item -> 
                if item.Status = InStock then item.Quantity else 0m)
            
            if totalAvailable < quantity then
                failwith $"Insufficient stock. Available: {totalAvailable}, Requested: {quantity}"
            
            // Find items to allocate (FIFO algorithm)
            let mutable remainingQuantity = quantity
            let allocatedItems = System.Collections.Generic.List<InventoryItem>()
            
            for item in availableItems do
                if remainingQuantity > 0m && item.Status = InStock then
                    let allocateQty = min remainingQuantity item.Quantity
                    let updatedItem = { item with 
                        Status = Allocated
                        Quantity = item.Quantity - allocateQty }
                    
                    // Update the item
                    inventoryRepo.Save(updatedItem) |> ignore
                    
                    // Create allocation record
                    let allocation = InventoryFactory.createAssetAllocation 
                        updatedItem.Id allocatedTo performedBy None
                    
                    allocationRepo.Save(allocation) |> ignore
                    allocatedItems.Add(updatedItem)
                    
                    remainingQuantity <- remainingQuantity - allocateQty
            
            if remainingQuantity > 0m then
                failwith $"Could not allocate full quantity. Short by: {remainingQuantity}"
            
            // Return the first allocation as representative
            let firstAllocatedItem = allocatedItems |> Seq.head
            allocationRepo.GetByItem(firstAllocatedItem.Id) |> List.head
        
        /// Transfers stock between locations
        /// Algorithm: Validate locations, create transaction, update item location
        member _.TransferStock(itemId: InventoryItemId, quantity: decimal, fromLocationId: StockLocationId, 
                               toLocationId: StockLocationId, performedBy: UserId) : StockTransaction =
            
            let item = inventoryRepo.GetById(itemId)
            match item with
            | None -> failwith $"Inventory item {InventoryItemId.value itemId} not found"
            | Some invItem ->
                // Validate current location
                let currentLocation = _.GetCurrentLocation(itemId)
                match currentLocation with
                | Some loc when loc = fromLocationId -> ()
                | Some _ -> failwith $"Item is not at specified source location"
                | None -> failwith $"Cannot determine current location of item"
                
                // Validate quantity
                if quantity > invItem.Quantity then
                    failwith $"Insufficient quantity. Available: {invItem.Quantity}, Requested: {quantity}"
                
                // Create transfer transaction
                let transaction = InventoryFactory.createStockTransaction 
                    itemId Transfer quantity (Some fromLocationId) (Some toLocationId) 
                    $"Transfer from {StockLocationId.value fromLocationId} to {StockLocationId.value toLocationId}" 
                    performedBy
                
                let savedTransaction = transactionRepo.Save(transaction)
                
                // Update item status if fully transferred
                let updatedItem = 
                    if quantity = invItem.Quantity then
                        { invItem with Status = Deployed; Quantity = 0m }
                    else
                        { invItem with Quantity = invItem.Quantity - quantity }
                
                inventoryRepo.Save(updatedItem) |> ignore
                
                savedTransaction
        
        /// Adjusts stock quantity (for inventory counts, damage, etc.)
        /// Algorithm: Create adjustment transaction, update item quantity
        member _.AdjustStock(itemId: InventoryItemId, adjustment: decimal, locationId: StockLocationId, 
                            reason: string, performedBy: UserId) : StockTransaction =
            
            let item = inventoryRepo.GetById(itemId)
            match item with
            | None -> failwith $"Inventory item {InventoryItemId.value itemId} not found"
            | Some invItem ->
                let newQuantity = invItem.Quantity + adjustment
                
                if newQuantity < 0m then
                    failwith $"Adjustment would result in negative quantity"
                
                // Create adjustment transaction
                let transaction = InventoryFactory.createStockTransaction 
                    itemId Adjustment adjustment None (Some locationId) reason performedBy
                
                let savedTransaction = transactionRepo.Save(transaction)
                
                // Update item
                let updatedItem = { invItem with 
                    Quantity = newQuantity
                    Status = if newQuantity = 0m then Retired else invItem.Status
                    UpdatedAt = System.DateTime.UtcNow }
                
                inventoryRepo.Save(updatedItem) |> ignore
                
                savedTransaction
        
        /// Gets complete transaction history for an item
        /// Algorithm: Query transactions by item, order by date
        member _.GetItemHistory(itemId: InventoryItemId) : FSharpList<StockTransaction> =
            transactionRepo.GetByItem(itemId)
            |> List.sortByDescending (fun t -> t.TransactionDate)
            |> List.ofSeq
        
        /// Gets current location of an item
        /// Algorithm: Find most recent transfer transaction for item
        member _.GetCurrentLocation(itemId: InventoryItemId) : StockLocationId option =
            let transactions = transactionRepo.GetByItem(itemId)
            let transferTransactions = 
                transactions 
                |> List.filter (fun t -> t.TransactionType = Transfer)
                |> List.sortByDescending (fun t -> t.TransactionDate)
            
            match transferTransactions with
            | [] -> None
            | head :: _ -> head.ToLocationId
        
        /// Gets items allocated to a specific entity (vehicle, project, etc.)
        member _.GetAllocatedItems(allocatedTo: string) : FSharpList<AssetAllocation> =
            allocationRepo.GetByAllocatedTo(allocatedTo)
            |> List.filter (fun alloc -> alloc.Status = Active)
            |> List.ofSeq
        
        /// Calculates total inventory value for a location or all locations
        /// Algorithm: Sum of (quantity * unit cost) for all items at location
        member _.GetInventoryValue(locationId: StockLocationId option) : decimal =
            let items = 
                match locationId with
                | Some locId -> inventoryRepo.GetByLocation(locId)
                | None -> 
                    // Get all items - would need GetAll method in repository
                    failwith "GetAll not implemented for inventory repository"
            
            items
            |> List.sumBy (fun item -> 
                let unitCost = defaultArg item.UnitCost 0m
                item.Quantity * unitCost)
        
        /// Gets items with low stock levels
        /// Algorithm: Filter items where available stock < threshold
        member _.GetLowStockItems(threshold: decimal) : FSharpList<InventoryItem> =
            // This would need a more complex query to get available stock by location
            // For now, return items with quantity < threshold
            failwith "Low stock algorithm requires location-based stock calculation"
        
        /// Gets items with expiring warranties
        /// Algorithm: Filter items with warranty expiry within date range
        member _.GetExpiringWarranties(beforeDate: System.DateTime) : FSharpList<InventoryItem> =
            // This would need GetAll method in repository
            failwith "Warranty expiry check requires GetAll method in inventory repository"

/// Truck Inventory Integration Service
/// Handles specific algorithms for truck inventory management
type TruckInventoryService(inventoryService: InventoryService) =
    
    /// Loads inventory items onto a truck
    /// Algorithm: Allocate items to truck location, create truck allocation records
    member _.LoadInventoryToTruck(sku: SKU, quantity: decimal, truckId: string, performedBy: UserId) : AssetAllocation list =
        let truckLocationKey = $"vehicle/{truckId}"
        
        // Check if truck location exists, create if not
        // This would involve locationRepo operations
        
        // Allocate stock to truck
        let allocation = inventoryService.AllocateStock(sku, quantity, truckLocationKey, performedBy)
        
        // Create truck-specific allocation with expected return
        let expectedReturn = System.DateTime.UtcNow.AddDays(7.0) // Default 7 days
        let truckAllocation = { allocation with 
            AllocatedTo = truckLocationKey
            ExpectedReturnDate = Some expectedReturn }
        
        [truckAllocation]
    
    /// Unloads inventory items from a truck
    /// Algorithm: Deallocate items, transfer back to warehouse, update allocation status
    member _.UnloadInventoryFromTruck(allocationId: AllocationId, performedBy: UserId) : StockTransaction =
        // Get allocation details
        // This would need GetAllocationById method
        
        // Deallocate the items
        // Transfer back to warehouse location
        // Update allocation status
        
        failwith "Unload implementation requires allocation repository GetAllocationById"
    
    /// Gets current inventory loaded on a truck
    /// Algorithm: Query allocations by truck ID, return active allocations
    member _.GetTruckInventory(truckId: string) : AssetAllocation list =
        let truckLocationKey = $"vehicle/{truckId}"
        inventoryService.GetAllocatedItems(truckLocationKey)
        |> List.ofSeq
    
    /// Checks for overdue truck inventory
    /// Algorithm: Filter allocations past expected return date
    member _.GetOverdueTruckInventory(truckId: string) : AssetAllocation list =
        let now = System.DateTime.UtcNow
        inventoryService.GetAllocatedItems($"vehicle/{truckId}")
        |> List.filter (fun alloc -> 
            match alloc.ExpectedReturnDate with
            | Some expectedDate -> expectedDate < now && alloc.Status = Active
            | None -> false)
        |> List.ofSeq
