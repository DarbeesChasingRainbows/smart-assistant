using ArangoDBNetStandard.CursorApi.Models;
using LifeOS.Domain.Garage;
using LifeOS.Domain.Common;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using LifeOS.Infrastructure.Persistence.Documents;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Garage;

public class VehicleMaintenanceRepository : IVehicleMaintenanceRepository
{
    private readonly ArangoDbContext _context;
    private const string CollectionName = ArangoDbContext.Collections.MaintenanceRecords;

    public VehicleMaintenanceRepository(ArangoDbContext context)
    {
        _context = context;
    }

    public async Task<FSharpOption<VehicleMaintenanceRecord>> GetByIdAsync(Guid id)
    {
        var key = id.ToString();
        var query = $"FOR r IN {CollectionName} FILTER r.Key == @id RETURN r";
        var bindVars = new Dictionary<string, object> { { "id", key } };

        var cursor = await _context.Client.Cursor.PostCursorAsync<VehicleMaintenanceRecordDocument>(query, bindVars);
        var doc = cursor.Result.FirstOrDefault();
        var record = VehicleMaintenanceMapper.ToDomain(doc);

        return record != null
            ? FSharpOption<VehicleMaintenanceRecord>.Some(record)
            : FSharpOption<VehicleMaintenanceRecord>.None;
    }

    public async Task<IEnumerable<VehicleMaintenanceRecord>> GetByVehicleIdAsync(VehicleId vehicleId)
    {
        var id = Id.vehicleIdValue(vehicleId).ToString();
        var query = $"FOR r IN {CollectionName} FILTER r.VehicleId == @vehicleId SORT r.Date DESC RETURN r";
        var bindVars = new Dictionary<string, object> { { "vehicleId", id } };

        var cursor = await _context.Client.Cursor.PostCursorAsync<VehicleMaintenanceRecordDocument>(query, bindVars);

        var records = new List<VehicleMaintenanceRecord>();
        foreach (var doc in cursor.Result)
        {
            var record = VehicleMaintenanceMapper.ToDomain(doc);
            if (record != null) records.Add(record);
        }

        return records;
    }

    public async Task<FSharpOption<VehicleMaintenanceRecord>> GetByVehicleIdAndIdempotencyKeyAsync(VehicleId vehicleId, string idempotencyKey)
    {
        var id = Id.vehicleIdValue(vehicleId).ToString();
        var query = $"FOR r IN {CollectionName} FILTER r.VehicleId == @vehicleId AND r.IdempotencyKey == @key RETURN r";
        var bindVars = new Dictionary<string, object>
        {
            { "vehicleId", id },
            { "key", idempotencyKey }
        };

        var cursor = await _context.Client.Cursor.PostCursorAsync<VehicleMaintenanceRecordDocument>(query, bindVars);
        var doc = cursor.Result.FirstOrDefault();
        var record = VehicleMaintenanceMapper.ToDomain(doc);

        return record != null
            ? FSharpOption<VehicleMaintenanceRecord>.Some(record)
            : FSharpOption<VehicleMaintenanceRecord>.None;
    }

    public async Task<VehicleMaintenanceRecord> AddAsync(VehicleMaintenanceRecord record, string idempotencyKey)
    {
        var document = VehicleMaintenanceMapper.ToDocument(record, idempotencyKey);
        await _context.Client.Document.PostDocumentAsync(CollectionName, document);
        return record;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var key = id.ToString();
        var query = $"FOR r IN {CollectionName} FILTER r.Key == @id RETURN r._key";
        var bindVars = new Dictionary<string, object> { { "id", key } };

        var cursor = await _context.Client.Cursor.PostCursorAsync<string>(query, bindVars);
        var docKey = cursor.Result.FirstOrDefault();

        if (docKey == null) return false;

        await _context.Client.Document.DeleteDocumentAsync<object>(CollectionName, docKey);
        return true;
    }
}
