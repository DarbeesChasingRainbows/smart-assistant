using System;
using LifeOS.Domain.Common;
using LifeOS.Domain.Garage;
using LifeOS.Infrastructure.Persistence.Documents;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Garage;

/// <summary>
/// Static mapper class for converting between Component domain types and ArangoDB documents.
/// Handles the translation layer between the Hexagonal Architecture domain and database persistence.
/// </summary>
/// <remarks>
/// This mapper handles complex object mapping including option types, location states,
/// and enum conversions. It provides bidirectional mapping capabilities for the
/// Component entity and its nested location information.
/// </remarks>
public static class ComponentMapper
{
    /// <summary>
    /// Maps a Component domain entity to an ArangoDB ComponentDocument.
    /// </summary>
    /// <param name="component">The Component domain entity to map.</param>
    /// <returns>A ComponentDocument suitable for database storage.</returns>
    /// <remarks>
    /// Handles option types by extracting values or setting null for None.
    /// Maps component location to the appropriate document structure.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when component is null.</exception>
    public static ComponentDocument ToDocument(Component component)
    {
        ArgumentNullException.ThrowIfNull(component);

        var location = MapLocationToDocument(component.Location);

        return new ComponentDocument
        {
            Key = Id.componentIdValue(component.Id).ToString(),
            Name = component.Name,
            PartNumber = FSharpOption<string>.get_IsSome(component.PartNumber)
                ? component.PartNumber.Value
                : null,
            Category = GarageInterop.ComponentCategoryToString(component.Category),
            Location = location,
            PurchaseDate = FSharpOption<global::System.DateTime>.get_IsSome(component.PurchaseDate)
                ? component.PurchaseDate.Value
                : null,
            PurchasePrice = FSharpOption<decimal>.get_IsSome(component.PurchaseCost)
                ? component.PurchaseCost.Value
                : null,
            WarrantyExpiration = FSharpOption<global::System.DateTime>.get_IsSome(
                component.WarrantyExpiry
            )
                ? component.WarrantyExpiry.Value
                : null,
            NextMaintenanceDate = null,
            Notes = FSharpOption<string>.get_IsSome(component.Notes) ? component.Notes.Value : null,
            CreatedAt = component.CreatedAt,
            UpdatedAt = component.UpdatedAt,
        };
    }

    /// <summary>
    /// Maps an ArangoDB ComponentDocument to a Component domain entity.
    /// </summary>
    /// <param name="doc">The ComponentDocument to map.</param>
    /// <returns>A Component domain entity, or null if doc is null.</returns>
    /// <remarks>
    /// Handles null documents gracefully by returning null.
    /// Converts string values back to appropriate domain types and enums.
    /// Reconstructs option types from nullable document properties.
    /// </remarks>
    public static Component ToDomain(ComponentDocument doc)
    {
        if (doc == null)
            return null;

        var category = GarageInterop.CreateComponentCategory(doc.Category);
        var location = MapLocationFromDocument(doc.Location);

        return new Component(
            id: Id.createComponentIdFrom(Guid.Parse(doc.Key)),
            name: doc.Name,
            partNumber: string.IsNullOrWhiteSpace(doc.PartNumber)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.PartNumber),
            category: category,
            location: location,
            purchaseDate: doc.PurchaseDate.HasValue
                ? FSharpOption<global::System.DateTime>.Some(doc.PurchaseDate.Value)
                : FSharpOption<global::System.DateTime>.None,
            purchaseCost: doc.PurchasePrice.HasValue
                ? FSharpOption<decimal>.Some(doc.PurchasePrice.Value)
                : FSharpOption<decimal>.None,
            warrantyExpiry: doc.WarrantyExpiration.HasValue
                ? FSharpOption<global::System.DateTime>.Some(doc.WarrantyExpiration.Value)
                : FSharpOption<global::System.DateTime>.None,
            notes: string.IsNullOrWhiteSpace(doc.Notes)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.Notes),
            createdAt: doc.CreatedAt,
            updatedAt: doc.UpdatedAt
        );
    }

    /// <summary>
    /// Maps a ComponentLocation domain type to a ComponentLocationDocument.
    /// </summary>
    /// <param name="location">The ComponentLocation to map.</param>
    /// <returns>A ComponentLocationDocument suitable for database storage.</returns>
    /// <remarks>
    /// Uses pattern matching to handle different location states:
    /// - InStorage: maps storage location and sets vehicle fields to null
    /// - InstalledOn: maps vehicle ID and installation date
    /// - Default: falls back to InStorage for unknown types
    /// </remarks>
    private static ComponentLocationDocument MapLocationToDocument(ComponentLocation location)
    {
        return location switch
        {
            ComponentLocation.InStorage storage => new ComponentLocationDocument
            {
                Type = "InStorage",
                StorageLocation = FSharpOption<string>.get_IsSome(storage.storageLocation)
                    ? storage.storageLocation.Value
                    : null,
                VehicleId = null,
                InstalledDate = null,
            },
            ComponentLocation.InstalledOn installed => new ComponentLocationDocument
            {
                Type = "InstalledOn",
                StorageLocation = null,
                VehicleId = Id.vehicleIdValue(installed.vehicleId).ToString(),
                InstalledDate = installed.installedDate,
            },
            _ => new ComponentLocationDocument { Type = "InStorage" },
        };
    }

    /// <summary>
    /// Maps a ComponentLocationDocument to a ComponentLocation domain type.
    /// </summary>
    /// <param name="doc">The ComponentLocationDocument to map.</param>
    /// <returns>A ComponentLocation domain type.</returns>
    /// <remarks>
    /// Reconstructs the appropriate location type based on document fields:
    /// - InstalledOn: requires vehicle ID and installation date
    /// - InStorage: uses storage location or None if empty
    /// - Default: falls back to InStorage for unknown or invalid types
    /// </remarks>
    /// <exception cref="FormatException">
    /// Thrown when VehicleId GUID cannot be parsed for installed components.
    /// </exception>
    private static ComponentLocation MapLocationFromDocument(ComponentLocationDocument doc)
    {
        if (
            doc.Type == "InstalledOn"
            && !string.IsNullOrWhiteSpace(doc.VehicleId)
            && doc.InstalledDate.HasValue
        )
        {
            return ComponentLocation.NewInstalledOn(
                Id.createVehicleIdFrom(Guid.Parse(doc.VehicleId)),
                doc.InstalledDate.Value
            );
        }

        return ComponentLocation.NewInStorage(
            string.IsNullOrWhiteSpace(doc.StorageLocation)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.StorageLocation)
        );
    }
}
