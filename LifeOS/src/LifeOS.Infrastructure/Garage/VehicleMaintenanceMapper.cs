using LifeOS.Domain.Common;
using LifeOS.Domain.Garage;
using LifeOS.Infrastructure.Persistence.Documents;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Garage;

/// <summary>
/// Static mapper class for converting between VehicleMaintenanceRecord domain types and ArangoDB documents.
/// Handles the translation layer between the Hexagonal Architecture domain and database persistence.
/// </summary>
/// <remarks>
/// This mapper handles complex object mapping including option types, maintenance items,
/// and idempotency key management. It provides bidirectional mapping capabilities for
/// vehicle maintenance records and their associated items.
/// </remarks>
public static class VehicleMaintenanceMapper
{
    /// <summary>
    /// Maps a VehicleMaintenanceRecord domain entity to an ArangoDB VehicleMaintenanceRecordDocument.
    /// </summary>
    /// <param name="record">The VehicleMaintenanceRecord domain entity to map.</param>
    /// <param name="idempotencyKey">Optional idempotency key for duplicate prevention.</param>
    /// <returns>A VehicleMaintenanceRecordDocument suitable for database storage.</returns>
    /// <remarks>
    /// Handles option types by extracting values or setting null for None.
    /// Maps maintenance items to document items with proper type conversion.
    /// Includes idempotency key for preventing duplicate maintenance records.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when record is null.</exception>
    public static VehicleMaintenanceRecordDocument ToDocument(
        VehicleMaintenanceRecord record,
        string idempotencyKey
    )
    {
        if (record == null)
            throw new ArgumentNullException(nameof(record));
        
        return new VehicleMaintenanceRecordDocument
        {
            Key = record.Id.ToString(),
            VehicleId = Id.vehicleIdValue(record.VehicleId).ToString(),
            Date = record.Date,
            Mileage = FSharpOption<Mileage>.get_IsSome(record.Mileage)
                ? GarageInterop.GetMileageValue(record.Mileage.Value)
                : null,
            Description = record.Description,
            Cost = FSharpOption<decimal>.get_IsSome(record.Cost) ? record.Cost.Value : null,
            PerformedBy = FSharpOption<string>.get_IsSome(record.PerformedBy)
                ? record.PerformedBy.Value
                : null,
            IdempotencyKey = idempotencyKey,
            Items =
            [
                .. record.Items.Select(i => new VehicleMaintenanceItemDocument
                {
                    Type = i.ItemType,
                    Name = i.Name,
                    Url = FSharpOption<string>.get_IsSome(i.Url) ? i.Url.Value : null,
                    Quantity = FSharpOption<decimal>.get_IsSome(i.Quantity)
                        ? i.Quantity.Value
                        : null,
                    Unit = FSharpOption<string>.get_IsSome(i.Unit) ? i.Unit.Value : null,
                }),
            ],
        };
    }

    /// <summary>
    /// Maps a VehicleMaintenanceRecord domain entity to an ArangoDB document without idempotency key.
    /// </summary>
    /// <param name="record">The VehicleMaintenanceRecord domain entity to map.</param>
    /// <returns>A VehicleMaintenanceRecordDocument suitable for database storage.</returns>
    /// <remarks>
    /// Convenience method that calls the main ToDocument method with null idempotency key.
    /// Used when idempotency is not required for the operation.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when record is null.</exception>
    public static VehicleMaintenanceRecordDocument ToDocument(VehicleMaintenanceRecord record) =>
        ToDocument(record, idempotencyKey: null!);

    /// <summary>
    /// Maps an ArangoDB VehicleMaintenanceRecordDocument to a VehicleMaintenanceRecord domain entity.
    /// </summary>
    /// <param name="doc">The VehicleMaintenanceRecordDocument to map.</param>
    /// <returns>A VehicleMaintenanceRecord domain entity, or null if doc is null.</returns>
    /// <remarks>
    /// Handles null documents gracefully by returning null.
    /// Converts string values back to appropriate domain types and option types.
    /// Reconstructs maintenance items with proper type conversion and validation.
    /// </remarks>
    /// <exception cref="FormatException">
    /// Thrown when GUID parsing fails for invalid document keys.
    /// </exception>
    public static VehicleMaintenanceRecord ToDomain(VehicleMaintenanceRecordDocument doc)
    {
        if (doc == null)
            return null;

        var items = doc
            .Items.Select(i =>
                VehicleMaintenanceInterop.CreateMaintenanceItem(
                    i.Type,
                    i.Name,
                    string.IsNullOrWhiteSpace(i.Url)
                        ? FSharpOption<string>.None
                        : FSharpOption<string>.Some(i.Url),
                    i.Quantity.HasValue ? new decimal?(i.Quantity.Value) : default,
                    string.IsNullOrWhiteSpace(i.Unit)
                        ? FSharpOption<string>.None
                        : FSharpOption<string>.Some(i.Unit)
                )
            )
            .ToList();

        return VehicleMaintenanceInterop.CreateVehicleMaintenanceRecord(
            id: Guid.Parse(doc.Key),
            vehicleId: Guid.Parse(doc.VehicleId),
            date: doc.Date,
            mileage: doc.Mileage.HasValue ? new decimal?(doc.Mileage.Value) : default,
            description: doc.Description,
            cost: doc.Cost.HasValue ? new decimal?(doc.Cost.Value) : default,
            performedBy: string.IsNullOrWhiteSpace(doc.PerformedBy)
                ? FSharpOption<string>.None
                : FSharpOption<string>.Some(doc.PerformedBy),
            items: ListModule.OfSeq(items)
        );
    }
}
