using ArangoDBNetStandard.DocumentApi.Models;
using ArangoDBNetStandard.CursorApi.Models;
using LifeOS.Domain.Garage;
using LifeOS.Domain.Common;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using LifeOS.Infrastructure.Persistence.Documents;

namespace LifeOS.Infrastructure.Garage;

/// <summary>
/// ArangoDB implementation of IVehicleRepository (Secondary Adapter)
/// Implements the F# port interface defined in the Domain layer
/// </summary>
public class VehicleRepository : IVehicleRepository
{
    private readonly ArangoDbContext _context;
    private const string CollectionName = ArangoDbContext.Collections.Vehicles;

    public VehicleRepository(ArangoDbContext context)
    {
        _context = context;
    }

    public async Task<Microsoft.FSharp.Core.FSharpOption<Vehicle>> GetByIdAsync(VehicleId vehicleId)
    {
        var id = Id.vehicleIdValue(vehicleId).ToString();
        var query = $"FOR v IN {CollectionName} FILTER v.Key == @id RETURN v";
        var bindVars = new Dictionary<string, object> { { "id", id } };

        var cursor = await _context.Client.Cursor.PostCursorAsync<VehicleDocument>(query, bindVars);

        if (cursor.Result.Any())
        {
            var vehicle = VehicleMapper.ToDomain(cursor.Result.First());
            return vehicle != null
                ? Microsoft.FSharp.Core.FSharpOption<Vehicle>.Some(vehicle)
                : Microsoft.FSharp.Core.FSharpOption<Vehicle>.None;
        }

        return Microsoft.FSharp.Core.FSharpOption<Vehicle>.None;
    }

    public async Task<IEnumerable<Vehicle>> GetAllAsync()
    {
        var query = $"FOR v IN {CollectionName} RETURN v";
        var cursor = await _context.Client.Cursor.PostCursorAsync<VehicleDocument>(query);

        var vehicles = new List<Vehicle>();
        foreach (var doc in cursor.Result)
        {
            var vehicle = VehicleMapper.ToDomain(doc);
            if (vehicle != null) vehicles.Add(vehicle);
        }
        return vehicles;
    }

    public async Task<Vehicle> AddAsync(Vehicle vehicle)
    {
        var document = VehicleMapper.ToDocument(vehicle);
        await _context.Client.Document.PostDocumentAsync(CollectionName, document);
        return vehicle;
    }

    public async Task<Vehicle> UpdateAsync(Vehicle vehicle)
    {
        var document = VehicleMapper.ToDocument(vehicle);
        var domainId = Id.vehicleIdValue(vehicle.Id).ToString();

        var keyQuery = $"FOR v IN {CollectionName} FILTER v.Key == @id RETURN v._key";
        var keyBindVars = new Dictionary<string, object> { { "id", domainId } };
        var keyCursor = await _context.Client.Cursor.PostCursorAsync<string>(keyQuery, keyBindVars);
        var arangoKey = keyCursor.Result.FirstOrDefault();

        if (string.IsNullOrWhiteSpace(arangoKey))
            throw new InvalidOperationException("Vehicle not found");

        await _context.Client.Document.PutDocumentAsync(CollectionName, arangoKey, document);
        return vehicle;
    }

    public async Task<bool> DeleteAsync(VehicleId vehicleId)
    {
        try
        {
            var domainId = Id.vehicleIdValue(vehicleId).ToString();

            var keyQuery = $"FOR v IN {CollectionName} FILTER v.Key == @id RETURN v._key";
            var keyBindVars = new Dictionary<string, object> { { "id", domainId } };
            var keyCursor = await _context.Client.Cursor.PostCursorAsync<string>(keyQuery, keyBindVars);
            var arangoKey = keyCursor.Result.FirstOrDefault();

            if (string.IsNullOrWhiteSpace(arangoKey))
                return false;

            await _context.Client.Document.DeleteDocumentAsync(CollectionName, arangoKey);
            return true;
        }
        catch
        {
            return false;
        }
    }

    public async Task<Microsoft.FSharp.Core.FSharpOption<Vehicle>> GetByVINAsync(VIN vin)
    {
        var vinValue = GarageInterop.GetVINValue(vin);
        var query = $"FOR v IN {CollectionName} FILTER v.VIN == @vin RETURN v";
        var bindVars = new Dictionary<string, object> { { "vin", vinValue } };

        var cursor = await _context.Client.Cursor.PostCursorAsync<VehicleDocument>(
            query, bindVars);

        var doc = cursor.Result.FirstOrDefault();
        var vehicle = VehicleMapper.ToDomain(doc);
        return vehicle != null
            ? Microsoft.FSharp.Core.FSharpOption<Vehicle>.Some(vehicle)
            : Microsoft.FSharp.Core.FSharpOption<Vehicle>.None;
    }

    public async Task<IEnumerable<Vehicle>> GetActiveVehiclesAsync()
    {
        var query = $"FOR v IN {CollectionName} FILTER v.IsActive == true RETURN v";
        var cursor = await _context.Client.Cursor.PostCursorAsync<VehicleDocument>(query);

        var vehicles = new List<Vehicle>();
        foreach (var doc in cursor.Result)
        {
            var vehicle = VehicleMapper.ToDomain(doc);
            if (vehicle != null) vehicles.Add(vehicle);
        }
        return vehicles;
    }

    public async Task<IEnumerable<Vehicle>> GetByVehicleTypeAsync(VehicleType vehicleType)
    {
        var typeName = vehicleType switch
        {
            VehicleType.Truck _ => "Truck",
            VehicleType.RV _ => "RV",
            VehicleType.Car _ => "Car",
            VehicleType.Motorcycle _ => "Motorcycle",
            _ => "Unknown"
        };

        var query = $"FOR v IN {CollectionName} FILTER v.VehicleType.Type == @type RETURN v";
        var bindVars = new Dictionary<string, object> { { "type", typeName } };

        var cursor = await _context.Client.Cursor.PostCursorAsync<VehicleDocument>(
            query, bindVars);

        var vehicles = new List<Vehicle>();
        foreach (var doc in cursor.Result)
        {
            var vehicle = VehicleMapper.ToDomain(doc);
            if (vehicle != null) vehicles.Add(vehicle);
        }
        return vehicles;
    }

    public async Task<bool> IsVINUniqueAsync(VIN vin, Microsoft.FSharp.Core.FSharpOption<VehicleId> excludeVehicleId)
    {
        var vinValue = GarageInterop.GetVINValue(vin);
        string query;
        Dictionary<string, object> bindVars;

        if (Microsoft.FSharp.Core.FSharpOption<VehicleId>.get_IsSome(excludeVehicleId))
        {
            var excludeKey = Id.vehicleIdValue(excludeVehicleId.Value).ToString();
            query = $"FOR v IN {CollectionName} FILTER v.VIN == @vin AND v.Key != @excludeKey RETURN v";
            bindVars = new Dictionary<string, object>
            {
                { "vin", vinValue },
                { "excludeKey", excludeKey }
            };
        }
        else
        {
            query = $"FOR v IN {CollectionName} FILTER v.VIN == @vin RETURN v";
            bindVars = new Dictionary<string, object> { { "vin", vinValue } };
        }

        var cursor = await _context.Client.Cursor.PostCursorAsync<VehicleDocument>(
            query, bindVars);

        return !cursor.Result.Any();
    }

    public async Task<Tuple<IEnumerable<Vehicle>, int>> GetPagedAsync(int page, int pageSize)
    {
        var offset = (page - 1) * pageSize;

        var countQuery = $"RETURN LENGTH({CollectionName})";
        var countCursor = await _context.Client.Cursor.PostCursorAsync<int>(countQuery);
        var totalCount = countCursor.Result.FirstOrDefault();

        var query = $"FOR v IN {CollectionName} LIMIT @offset, @limit RETURN v";
        var bindVars = new Dictionary<string, object>
        {
            { "offset", offset },
            { "limit", pageSize }
        };

        var cursor = await _context.Client.Cursor.PostCursorAsync<VehicleDocument>(
            query, bindVars);

        var vehicles = new List<Vehicle>();
        foreach (var doc in cursor.Result)
        {
            var vehicle = VehicleMapper.ToDomain(doc);
            if (vehicle != null) vehicles.Add(vehicle);
        }

        return Tuple.Create<IEnumerable<Vehicle>, int>(vehicles, totalCount);
    }

    public async Task<IEnumerable<Vehicle>> SearchAsync(string searchTerm)
    {
        var query = $@"
            FOR v IN {CollectionName}
            FILTER CONTAINS(LOWER(v.Make), LOWER(@term))
                OR CONTAINS(LOWER(v.Model), LOWER(@term))
                OR CONTAINS(LOWER(v.VIN), LOWER(@term))
                OR CONTAINS(LOWER(v.LicensePlate), LOWER(@term))
            RETURN v";

        var bindVars = new Dictionary<string, object> { { "term", searchTerm } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<VehicleDocument>(
            query, bindVars);

        var vehicles = new List<Vehicle>();
        foreach (var doc in cursor.Result)
        {
            var vehicle = VehicleMapper.ToDomain(doc);
            if (vehicle != null) vehicles.Add(vehicle);
        }
        return vehicles;
    }
}
