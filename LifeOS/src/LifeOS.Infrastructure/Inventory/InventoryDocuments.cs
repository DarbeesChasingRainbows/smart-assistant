using System;
using System.Collections.Generic;
using LifeOS.Domain.Inventory;
using LifeOS.Domain.Common;
using Microsoft.FSharp.Core;
using SysDateTime = System.DateTime;

namespace LifeOS.Infrastructure.Inventory;

/// <summary>
/// ArangoDB document representation for inventory items.
/// Maps between F# domain types and C# document persistence model.
/// </summary>
public class InventoryItemDocument
{
    public string Key { get; set; } = string.Empty;
    public string AssetTag { get; set; } = string.Empty;
    public string? SerialNumber { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal? UnitCost { get; set; }
    public SysDateTime? PurchaseDate { get; set; }
    public SysDateTime? WarrantyExpiry { get; set; }
    public string? Supplier { get; set; }
    public string? Notes { get; set; }
    public SysDateTime CreatedAt { get; set; }
    public SysDateTime UpdatedAt { get; set; }
}

/// <summary>
/// ArangoDB document representation for stock locations.
/// Supports hierarchical location structure with parent-child relationships.
/// </summary>
public class StockLocationDocument
{
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string LocationType { get; set; } = string.Empty;
    public string? ParentLocationId { get; set; }
    public string Path { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public SysDateTime CreatedAt { get; set; }
    public SysDateTime UpdatedAt { get; set; }
}

/// <summary>
/// ArangoDB document representation for stock transactions.
/// Tracks all inventory movements with complete audit trail.
/// </summary>
public class StockTransactionDocument
{
    public string Key { get; set; } = string.Empty;
    public string InventoryItemId { get; set; } = string.Empty;
    public string TransactionType { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string? FromLocationId { get; set; }
    public string? ToLocationId { get; set; }
    public string? ReferenceNumber { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string PerformedBy { get; set; } = string.Empty;
    public SysDateTime TransactionDate { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// ArangoDB document representation for asset allocations.
/// Tracks items allocated to specific uses like vehicles or projects.
/// </summary>
public class AssetAllocationDocument
{
    public string Key { get; set; } = string.Empty;
    public string InventoryItemId { get; set; } = string.Empty;
    public string AllocatedTo { get; set; } = string.Empty;
    public string AllocatedBy { get; set; } = string.Empty;
    public SysDateTime AllocatedAt { get; set; }
    public SysDateTime? ExpectedReturnDate { get; set; }
    public SysDateTime? ActualReturnDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

