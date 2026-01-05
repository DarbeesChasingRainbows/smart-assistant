using System;
using System.Collections.Generic;
using LifeOS.Domain.Inventory;
using LifeOS.Domain.Common;
using Microsoft.FSharp.Core;
using SysDateTime = System.DateTime;

namespace LifeOS.Infrastructure.Inventory;

/// <summary>
/// Static mapper class for converting between domain types and document types.
/// Implements bidirectional mapping with proper null handling and type conversion.
/// </summary>
public static class InventoryMappers
{
    /// <summary>
    /// Converts an InventoryItem domain entity to InventoryItemDocument for persistence.
    /// </summary>
    /// <param name="item">The domain entity to convert.</param>
    /// <returns>The document representation.</returns>
    /// <exception cref="ArgumentNullException">Thrown when item is null.</exception>
    public static InventoryItemDocument ToDocument(InventoryItem item)
    {
        if (item == null)
            throw new ArgumentNullException(nameof(item));

        return new InventoryItemDocument
        {
            Key = InventoryItemIdModule.value(item.Id).ToString(),
            AssetTag = AssetTagModule.value(item.AssetTag),
            SerialNumber = FSharpOption<SerialNumber>.get_IsSome(item.SerialNumber) ? SerialNumberModule.value(item.SerialNumber.Value) : null,
            SKU = SKUModule.value(item.SKU),
            Name = item.Name,
            Description = item.Description,
            Status = item.Status.ToString(),
            Quantity = item.Quantity,
            UnitCost = FSharpOption<decimal>.get_IsSome(item.UnitCost) ? item.UnitCost.Value : null,
            PurchaseDate = FSharpOption<SysDateTime>.get_IsSome(item.PurchaseDate) ? item.PurchaseDate.Value : null,
            WarrantyExpiry = FSharpOption<SysDateTime>.get_IsSome(item.WarrantyExpiry) ? item.WarrantyExpiry.Value : null,
            Supplier = FSharpOption<string>.get_IsSome(item.Supplier) ? item.Supplier.Value : null,
            Notes = FSharpOption<string>.get_IsSome(item.Notes) ? item.Notes.Value : null,
            CreatedAt = item.CreatedAt,
            UpdatedAt = item.UpdatedAt
        };
    }

    /// <summary>
    /// Converts an InventoryItemDocument to InventoryItem domain entity.
    /// </summary>
    /// <param name="doc">The document to convert.</param>
    /// <returns>The domain entity, or null if doc is null.</returns>
    public static InventoryItem? ToDomain(InventoryItemDocument? doc)
    {
        if (doc == null)
            return null;

        // Parse inventory status (F# DU, not an enum)
        var status = doc.Status switch
        {
            nameof(InventoryStatus.Allocated) => InventoryStatus.Allocated,
            nameof(InventoryStatus.Deployed) => InventoryStatus.Deployed,
            nameof(InventoryStatus.Maintenance) => InventoryStatus.Maintenance,
            nameof(InventoryStatus.Retired) => InventoryStatus.Retired,
            nameof(InventoryStatus.Lost) => InventoryStatus.Lost,
            nameof(InventoryStatus.Damaged) => InventoryStatus.Damaged,
            _ => InventoryStatus.InStock
        };

        return new InventoryItem(
            InventoryItemIdModule.create(Guid.Parse(doc.Key)),
            AssetTagModule.create(doc.AssetTag),
            string.IsNullOrWhiteSpace(doc.SerialNumber)
                ? FSharpOption<SerialNumber>.None
                : FSharpOption<SerialNumber>.Some(SerialNumberModule.create(doc.SerialNumber)),
            SKUModule.create(doc.SKU),
            doc.Name,
            doc.Description,
            status,
            doc.Quantity,
            doc.UnitCost.HasValue
                ? FSharpOption<decimal>.Some(doc.UnitCost.Value)
                : FSharpOption<decimal>.None,
            doc.PurchaseDate.HasValue
                ? FSharpOption<SysDateTime>.Some(doc.PurchaseDate.Value)
                : FSharpOption<SysDateTime>.None,
            doc.WarrantyExpiry.HasValue
                ? FSharpOption<SysDateTime>.Some(doc.WarrantyExpiry.Value)
                : FSharpOption<SysDateTime>.None,
            string.IsNullOrWhiteSpace(doc.Supplier)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Supplier),
            string.IsNullOrWhiteSpace(doc.Notes)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Notes),
            doc.CreatedAt,
            doc.UpdatedAt
        );
    }

    /// <summary>
    /// Converts a StockLocation domain entity to StockLocationDocument for persistence.
    /// </summary>
    /// <param name="location">The domain entity to convert.</param>
    /// <returns>The document representation.</returns>
    /// <exception cref="ArgumentNullException">Thrown when location is null.</exception>
    public static StockLocationDocument ToDocument(StockLocation location)
    {
        if (location == null)
            throw new ArgumentNullException(nameof(location));

        return new StockLocationDocument
        {
            Key = location.Id.Item.ToString(),
            Name = location.Name,
            Description = location.Description,
            LocationType = location.LocationType.ToString(),
            ParentLocationId = FSharpOption<StockLocationId>.get_IsSome(location.ParentLocationId)
                ? location.ParentLocationId.Value.Item.ToString()
                : null,
            Path = location.Path,
            IsActive = location.IsActive,
            CreatedAt = location.CreatedAt,
            UpdatedAt = location.UpdatedAt
        };
    }

    /// <summary>
    /// Converts a StockLocationDocument to StockLocation domain entity.
    /// </summary>
    /// <param name="doc">The document to convert.</param>
    /// <returns>The domain entity, or null if doc is null.</returns>
    public static StockLocation? ToDomain(StockLocationDocument? doc)
    {
        if (doc == null)
            return null;

        // Parse location type (F# DU)
        var locationType = doc.LocationType switch
        {
            nameof(StockLocationType.Warehouse) => StockLocationType.Warehouse,
            nameof(StockLocationType.Vehicle) => StockLocationType.Vehicle,
            nameof(StockLocationType.Workshop) => StockLocationType.Workshop,
            nameof(StockLocationType.Storage) => StockLocationType.Storage,
            nameof(StockLocationType.External) => StockLocationType.External,
            _ => StockLocationType.Storage
        };

        return new StockLocation(
            StockLocationIdModule.create(Guid.Parse(doc.Key)),
            doc.Name,
            doc.Description,
            locationType,
            string.IsNullOrWhiteSpace(doc.ParentLocationId)
                ? FSharpOption<StockLocationId>.None
                : FSharpOption<StockLocationId>.Some(StockLocationIdModule.create(Guid.Parse(doc.ParentLocationId))),
            doc.Path,
            doc.IsActive,
            doc.CreatedAt,
            doc.UpdatedAt
        );
    }

    /// <summary>
    /// Converts a StockTransaction domain entity to StockTransactionDocument for persistence.
    /// </summary>
    /// <param name="transaction">The domain entity to convert.</param>
    /// <returns>The document representation.</returns>
    /// <exception cref="ArgumentNullException">Thrown when transaction is null.</exception>
    public static StockTransactionDocument ToDocument(StockTransaction transaction)
    {
        if (transaction == null)
            throw new ArgumentNullException(nameof(transaction));

        return new StockTransactionDocument
        {
            Key = TransactionIdModule.value(transaction.Id).ToString(),
            InventoryItemId = InventoryItemIdModule.value(transaction.InventoryItemId).ToString(),
            TransactionType = transaction.TransactionType.ToString(),
            Quantity = transaction.Quantity,
            FromLocationId = FSharpOption<StockLocationId>.get_IsSome(transaction.FromLocationId)
                ? StockLocationIdModule.value(transaction.FromLocationId.Value).ToString()
                : null,
            ToLocationId = FSharpOption<StockLocationId>.get_IsSome(transaction.ToLocationId)
                ? StockLocationIdModule.value(transaction.ToLocationId.Value).ToString()
                : null,
            ReferenceNumber = FSharpOption<string>.get_IsSome(transaction.ReferenceNumber) ? transaction.ReferenceNumber.Value : null,
            Reason = transaction.Reason,
            PerformedBy = LifeOS.Domain.Common.Id.userIdValue(transaction.PerformedBy).ToString(),
            TransactionDate = transaction.TransactionDate,
            Notes = FSharpOption<string>.get_IsSome(transaction.Notes) ? transaction.Notes.Value : null
        };
    }

    /// <summary>
    /// Converts a StockTransactionDocument to StockTransaction domain entity.
    /// </summary>
    /// <param name="doc">The document to convert.</param>
    /// <returns>The domain entity, or null if doc is null.</returns>
    public static StockTransaction? ToDomain(StockTransactionDocument? doc)
    {
        if (doc == null)
            return null;

        // Parse transaction type (F# DU)
        var transactionType = doc.TransactionType switch
        {
            nameof(TransactionType.StockIn) => TransactionType.StockIn,
            nameof(TransactionType.StockOut) => TransactionType.StockOut,
            nameof(TransactionType.Transfer) => TransactionType.Transfer,
            nameof(TransactionType.Adjustment) => TransactionType.Adjustment,
            nameof(TransactionType.Allocation) => TransactionType.Allocation,
            nameof(TransactionType.Deallocation) => TransactionType.Deallocation,
            _ => TransactionType.Adjustment
        };

        return new StockTransaction(
            TransactionIdModule.create(Guid.Parse(doc.Key)),
            InventoryItemIdModule.create(Guid.Parse(doc.InventoryItemId)),
            transactionType,
            doc.Quantity,
            string.IsNullOrWhiteSpace(doc.FromLocationId)
                ? FSharpOption<StockLocationId>.None
                : FSharpOption<StockLocationId>.Some(StockLocationIdModule.create(Guid.Parse(doc.FromLocationId))),
            string.IsNullOrWhiteSpace(doc.ToLocationId)
                ? FSharpOption<StockLocationId>.None
                : FSharpOption<StockLocationId>.Some(StockLocationIdModule.create(Guid.Parse(doc.ToLocationId))),
            string.IsNullOrWhiteSpace(doc.ReferenceNumber)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.ReferenceNumber),
            doc.Reason,
            LifeOS.Domain.Common.Id.createUserIdFrom(Guid.Parse(doc.PerformedBy)),
            doc.TransactionDate,
            string.IsNullOrWhiteSpace(doc.Notes)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Notes)
        );
    }

    /// <summary>
    /// Converts an AssetAllocation domain entity to AssetAllocationDocument for persistence.
    /// </summary>
    /// <param name="allocation">The domain entity to convert.</param>
    /// <returns>The document representation.</returns>
    /// <exception cref="ArgumentNullException">Thrown when allocation is null.</exception>
    public static AssetAllocationDocument ToDocument(AssetAllocation allocation)
    {
        if (allocation == null)
            throw new ArgumentNullException(nameof(allocation));

        return new AssetAllocationDocument
        {
            Key = AllocationIdModule.value(allocation.Id).ToString(),
            InventoryItemId = InventoryItemIdModule.value(allocation.InventoryItemId).ToString(),
            AllocatedTo = allocation.AllocatedTo,
            AllocatedBy = LifeOS.Domain.Common.Id.userIdValue(allocation.AllocatedBy).ToString(),
            AllocatedAt = allocation.AllocatedAt,
            ExpectedReturnDate = FSharpOption<SysDateTime>.get_IsSome(allocation.ExpectedReturnDate) ? allocation.ExpectedReturnDate.Value : null,
            ActualReturnDate = FSharpOption<SysDateTime>.get_IsSome(allocation.ActualReturnDate) ? allocation.ActualReturnDate.Value : null,
            Status = allocation.Status.ToString(),
            Notes = FSharpOption<string>.get_IsSome(allocation.Notes) ? allocation.Notes.Value : null
        };
    }

    /// <summary>
    /// Converts an AssetAllocationDocument to AssetAllocation domain entity.
    /// </summary>
    /// <param name="doc">The document to convert.</param>
    /// <returns>The domain entity, or null if doc is null.</returns>
    public static AssetAllocation? ToDomain(AssetAllocationDocument? doc)
    {
        if (doc == null)
            return null;

        // Parse allocation status (F# DU)
        var status = doc.Status switch
        {
            nameof(AllocationStatus.Returned) => AllocationStatus.Returned,
            nameof(AllocationStatus.Overdue) => AllocationStatus.Overdue,
            nameof(AllocationStatus.Lost) => AllocationStatus.Lost,
            _ => AllocationStatus.Active
        };

        return new AssetAllocation(
            AllocationIdModule.create(Guid.Parse(doc.Key)),
            InventoryItemIdModule.create(Guid.Parse(doc.InventoryItemId)),
            doc.AllocatedTo,
            LifeOS.Domain.Common.Id.createUserIdFrom(Guid.Parse(doc.AllocatedBy)),
            doc.AllocatedAt,
            doc.ExpectedReturnDate.HasValue
                ? FSharpOption<SysDateTime>.Some(doc.ExpectedReturnDate.Value)
                : FSharpOption<SysDateTime>.None,
            doc.ActualReturnDate.HasValue
                ? FSharpOption<SysDateTime>.Some(doc.ActualReturnDate.Value)
                : FSharpOption<SysDateTime>.None,
            status,
            string.IsNullOrWhiteSpace(doc.Notes)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Notes)
        );
    }
}
