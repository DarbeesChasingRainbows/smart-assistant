using ArangoDBNetStandard.CursorApi.Models;
using LifeOS.Domain.Common;
using LifeOS.Domain.Garage;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using LifeOS.Infrastructure.Persistence.Documents;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Garage;

public class InventoryBackedComponentRepository(ArangoDbContext context) : IComponentRepository
{
    private const string Domain = "Garage";
    private const string Kind = "SerializedAsset";

    private readonly ArangoDbContext _context = context;

    private const string SkuCollection = ArangoDbContext.Collections.InventorySkus;
    private const string AssetCollection = ArangoDbContext.Collections.InventoryAssets;
    private const string InstallationsCollection = ArangoDbContext.Collections.AssetInstallations;

    public async Task<FSharpOption<Component>> GetByIdAsync(ComponentId componentId)
    {
        var id = Id.componentIdValue(componentId).ToString();
        var asset = await GetAssetByDomainKey(id);
        return ToComponentOption(asset);
    }

    public async Task<IEnumerable<Component>> GetAllAsync()
    {
        var query = $"FOR a IN {AssetCollection} RETURN a";
        var cursor = await _context.Client.Cursor.PostCursorAsync<InventoryAssetDocument>(query);

        var results = new List<Component>();
        foreach (var doc in cursor.Result)
        {
            var opt = ToComponentOption(doc);
            if (FSharpOption<Component>.get_IsSome(opt))
                results.Add(opt.Value);
        }

        return results;
    }

    public async Task<Component> AddAsync(Component component)
    {
        var skuKey = await ResolveSkuKeyAsync(component);

        var partNumber = TryGetOptionValue(component.PartNumber);
        var purchaseDate = TryGetOptionValue(component.PurchaseDate);
        var purchaseCost = TryGetOptionValue(component.PurchaseCost);
        var warrantyExpiry = TryGetOptionValue(component.WarrantyExpiry);
        var notes = TryGetOptionValue(component.Notes);

        var asset = new InventoryAssetDocument
        {
            Key = Id.componentIdValue(component.Id).ToString(),
            SkuKey = skuKey,
            Name = component.Name,
            PartNumber = partNumber,
            Category = GarageInterop.ComponentCategoryToString(component.Category),
            Location = MapLocation(component.Location),
            PurchaseDate = purchaseDate,
            PurchasePrice = purchaseCost,
            WarrantyExpiration = warrantyExpiry,
            Notes = notes,
            CreatedAt = component.CreatedAt,
            UpdatedAt = component.UpdatedAt,
        };

        await _context.Client.Document.PostDocumentAsync(AssetCollection, asset);
        return component;
    }

    public async Task<Component> UpdateAsync(Component component)
    {
        var domainId = Id.componentIdValue(component.Id).ToString();
        var existing = await GetAssetByDomainKey(domainId);
        if (existing == null)
            throw new InvalidOperationException("Component not found");

        var skuKey = await ResolveSkuKeyAsync(component);

        var partNumber = TryGetOptionValue(component.PartNumber);
        var purchaseDate = TryGetOptionValue(component.PurchaseDate);
        var purchaseCost = TryGetOptionValue(component.PurchaseCost);
        var warrantyExpiry = TryGetOptionValue(component.WarrantyExpiry);
        var notes = TryGetOptionValue(component.Notes);

        var updated = new InventoryAssetDocument
        {
            Key = existing.Key,
            Id = existing.Id,
            Rev = existing.Rev,
            SkuKey = skuKey,
            Name = component.Name,
            PartNumber = partNumber,
            Category = GarageInterop.ComponentCategoryToString(component.Category),
            Location = MapLocation(component.Location),
            PurchaseDate = purchaseDate,
            PurchasePrice = purchaseCost,
            WarrantyExpiration = warrantyExpiry,
            Notes = notes,
            CreatedAt = component.CreatedAt,
            UpdatedAt = global::System.DateTime.UtcNow,
        };

        await _context.Client.Document.PutDocumentAsync(AssetCollection, existing.Key, updated);

        await SyncInstallationsAsync(existing, updated);

        return component;
    }

    public async Task<bool> DeleteAsync(ComponentId componentId)
    {
        try
        {
            var domainId = Id.componentIdValue(componentId).ToString();
            var existing = await GetAssetByDomainKey(domainId);
            if (existing == null)
                return false;

            await _context.Client.Document.DeleteDocumentAsync(AssetCollection, existing.Key);
            return true;
        }
        catch
        {
            return false;
        }
    }

    public async Task<IEnumerable<Component>> GetByVehicleIdAsync(VehicleId vehicleId)
    {
        var id = Id.vehicleIdValue(vehicleId).ToString();
        var query =
            $"FOR a IN {AssetCollection} FILTER a.location.type == 'InstalledOn' AND a.location.vehicleId == @vehicleId RETURN a";
        var bindVars = new Dictionary<string, object> { { "vehicleId", id } };

        var cursor = await _context.Client.Cursor.PostCursorAsync<InventoryAssetDocument>(
            query,
            bindVars
        );

        var results = new List<Component>();
        foreach (var doc in cursor.Result)
        {
            var opt = ToComponentOption(doc);
            if (FSharpOption<Component>.get_IsSome(opt))
            {
                var c = opt.Value;
                results.Add(c);
            }
        }

        return results;
    }

    public async Task<IEnumerable<Component>> GetInStorageAsync()
    {
        var query = $"FOR a IN {AssetCollection} FILTER a.location.type == 'InStorage' RETURN a";
        var cursor = await _context.Client.Cursor.PostCursorAsync<InventoryAssetDocument>(query);
        var results = new List<Component>();
        foreach (var doc in cursor.Result)
        {
            var opt = ToComponentOption(doc);
            if (FSharpOption<Component>.get_IsSome(opt))
                results.Add(opt.Value);
        }
        return results;
    }

    public async Task<IEnumerable<Component>> GetByCategoryAsync(ComponentCategory category)
    {
        var categoryValue = GarageInterop.ComponentCategoryToString(category);
        var query = $"FOR a IN {AssetCollection} FILTER a.category == @category RETURN a";
        var bindVars = new Dictionary<string, object> { { "category", categoryValue } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<InventoryAssetDocument>(
            query,
            bindVars
        );

        var results = new List<Component>();
        foreach (var doc in cursor.Result)
        {
            var opt = ToComponentOption(doc);
            if (FSharpOption<Component>.get_IsSome(opt))
                results.Add(opt.Value);
        }
        return results;
    }

    public async Task<IEnumerable<Component>> GetByPartNumberAsync(string partNumber)
    {
        var query = $"FOR a IN {AssetCollection} FILTER a.partNumber == @partNumber RETURN a";
        var bindVars = new Dictionary<string, object> { { "partNumber", partNumber } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<InventoryAssetDocument>(
            query,
            bindVars
        );

        var results = new List<Component>();
        foreach (var doc in cursor.Result)
        {
            var opt = ToComponentOption(doc);
            if (FSharpOption<Component>.get_IsSome(opt))
                results.Add(opt.Value);
        }
        return results;
    }

    public async Task<IEnumerable<Component>> GetUnderWarrantyAsync(
        global::System.DateTime currentDate
    )
    {
        var query =
            $"FOR a IN {AssetCollection} FILTER a.warrantyExpiration != null AND a.warrantyExpiration > @currentDate RETURN a";
        var bindVars = new Dictionary<string, object> { { "currentDate", currentDate } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<InventoryAssetDocument>(
            query,
            bindVars
        );

        var results = new List<Component>();
        foreach (var doc in cursor.Result)
        {
            var opt = ToComponentOption(doc);
            if (FSharpOption<Component>.get_IsSome(opt))
                results.Add(opt.Value);
        }
        return results;
    }

    public Task<IEnumerable<Component>> GetNeedingMaintenanceAsync(
        global::System.DateTime currentDate
    ) => Task.FromResult<IEnumerable<Component>>([]);

    public async Task<Tuple<IEnumerable<Component>, int>> GetPagedAsync(int page, int pageSize)
    {
        var offset = (page - 1) * pageSize;

        var countQuery = $"RETURN LENGTH({AssetCollection})";
        var countCursor = await _context.Client.Cursor.PostCursorAsync<int>(countQuery);
        var totalCount = countCursor.Result.FirstOrDefault();

        var query = $"FOR a IN {AssetCollection} LIMIT @offset, @limit RETURN a";
        var bindVars = new Dictionary<string, object>
        {
            { "offset", offset },
            { "limit", pageSize },
        };

        var cursor = await _context.Client.Cursor.PostCursorAsync<InventoryAssetDocument>(
            query,
            bindVars
        );
        var results = new List<Component>();
        foreach (var doc in cursor.Result)
        {
            var opt = ToComponentOption(doc);
            if (FSharpOption<Component>.get_IsSome(opt))
                results.Add(opt.Value);
        }

        return Tuple.Create<IEnumerable<Component>, int>(results, totalCount);
    }

    public async Task<IEnumerable<Component>> SearchAsync(string searchTerm)
    {
        var query =
            $@"
FOR a IN {AssetCollection}
    FILTER CONTAINS(LOWER(a.name), LOWER(@term))
        OR CONTAINS(LOWER(a.partNumber), LOWER(@term))
        OR CONTAINS(LOWER(a.category), LOWER(@term))
    RETURN a";

        var bindVars = new Dictionary<string, object> { { "term", searchTerm } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<InventoryAssetDocument>(
            query,
            bindVars
        );

        var results = new List<Component>();
        foreach (var doc in cursor.Result)
        {
            var opt = ToComponentOption(doc);
            if (FSharpOption<Component>.get_IsSome(opt))
                results.Add(opt.Value);
        }
        return results;
    }

    private async Task<InventoryAssetDocument?> GetAssetByDomainKey(string domainKey)
    {
        var query = $"FOR a IN {AssetCollection} FILTER a._key == @id RETURN a";
        var bindVars = new Dictionary<string, object> { { "id", domainKey } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<InventoryAssetDocument>(
            query,
            bindVars
        );
        return cursor.Result.FirstOrDefault();
    }

    private async Task<string> ResolveSkuKeyAsync(Component component)
    {
        var partNumber = TryGetOptionValue(component.PartNumber);

        var category = GarageInterop.ComponentCategoryToString(component.Category);
        var name = component.Name;

        var key = BuildSkuKey(Domain, partNumber, name, category);

        var existing = await GetSkuByKeyAsync(key);
        if (existing != null)
            return existing.Key;

        var sku = new InventorySkuDocument
        {
            Key = key,
            Domain = Domain,
            Kind = Kind,
            Name = name,
            Category = category,
            PartNumber = partNumber,
            CreatedAt = global::System.DateTime.UtcNow,
            UpdatedAt = global::System.DateTime.UtcNow,
        };

        await _context.Client.Document.PostDocumentAsync(SkuCollection, sku);
        return key;
    }

    private async Task<InventorySkuDocument?> GetSkuByKeyAsync(string key)
    {
        var query = $"FOR s IN {SkuCollection} FILTER s._key == @key RETURN s";
        var bindVars = new Dictionary<string, object> { { "key", key } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<InventorySkuDocument>(
            query,
            bindVars
        );
        return cursor.Result.FirstOrDefault();
    }

    private static string BuildSkuKey(
        string domain,
        string? partNumber,
        string name,
        string category
    )
    {
        if (!string.IsNullOrWhiteSpace(partNumber))
        {
            return $"{Normalize(domain)}:{Normalize(partNumber)}";
        }

        return $"{Normalize(domain)}:{Normalize(category)}:{Normalize(name)}";
    }

    private static string Normalize(string value)
    {
        var lower = value.Trim().ToLowerInvariant();
        var chars = lower.Select(c => char.IsLetterOrDigit(c) ? c : '-').ToArray();

        var normalized = new string(chars);
        while (normalized.Contains("--"))
            normalized = normalized.Replace("--", "-");
        return normalized.Trim('-');
    }

    private static ComponentLocationDocument MapLocation(ComponentLocation location)
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

    private async Task SyncInstallationsAsync(
        InventoryAssetDocument before,
        InventoryAssetDocument after
    )
    {
        var beforeInstalled =
            before.Location.Type == "InstalledOn"
            && !string.IsNullOrWhiteSpace(before.Location.VehicleId);
        var afterInstalled =
            after.Location.Type == "InstalledOn"
            && !string.IsNullOrWhiteSpace(after.Location.VehicleId);

        var assetId = $"{AssetCollection}/{after.Key}";

        if (!beforeInstalled && afterInstalled)
        {
            var edge = new AssetInstallationEdge
            {
                From = $"{ArangoDbContext.Collections.Vehicles}/{after.Location.VehicleId}",
                To = assetId,
                InstalledAt = after.Location.InstalledDate ?? global::System.DateTime.UtcNow,
                RemovedAt = null,
                IsValid = true,
            };

            await _context.Client.Document.PostDocumentAsync(InstallationsCollection, edge);
            return;
        }

        if (beforeInstalled && !afterInstalled)
        {
            var query =
                $@"
FOR e IN {InstallationsCollection}
    FILTER e._from == @from AND e._to == @to AND e.removedAt == null AND e.isValid == true
    UPDATE e WITH {{ removedAt: @removedAt }} IN {InstallationsCollection}";

            var bindVars = new Dictionary<string, object>
            {
                { "from", $"{ArangoDbContext.Collections.Vehicles}/{before.Location.VehicleId}" },
                { "to", assetId },
                { "removedAt", global::System.DateTime.UtcNow },
            };

            await _context.Client.Cursor.PostCursorAsync<object>(query, bindVars);
            return;
        }

        if (
            beforeInstalled
            && afterInstalled
            && before.Location.VehicleId != after.Location.VehicleId
        )
        {
            var closeQuery =
                $@"
FOR e IN {InstallationsCollection}
    FILTER e._from == @from AND e._to == @to AND e.removedAt == null AND e.isValid == true
    UPDATE e WITH {{ removedAt: @removedAt }} IN {InstallationsCollection}";

            var closeBindVars = new Dictionary<string, object>
            {
                { "from", $"{ArangoDbContext.Collections.Vehicles}/{before.Location.VehicleId}" },
                { "to", assetId },
                { "removedAt", global::System.DateTime.UtcNow },
            };

            await _context.Client.Cursor.PostCursorAsync<object>(closeQuery, closeBindVars);

            var edge = new AssetInstallationEdge
            {
                From = $"{ArangoDbContext.Collections.Vehicles}/{after.Location.VehicleId}",
                To = assetId,
                InstalledAt = after.Location.InstalledDate ?? global::System.DateTime.UtcNow,
                RemovedAt = null,
                IsValid = true,
            };

            await _context.Client.Document.PostDocumentAsync(InstallationsCollection, edge);
        }
    }

    private static FSharpOption<Component> ToComponentOption(InventoryAssetDocument? doc)
    {
        if (doc == null)
            return FSharpOption<Component>.None;

        var componentDoc = new ComponentDocument
        {
            Key = doc.Key,
            Name = doc.Name,
            PartNumber = doc.PartNumber,
            Category = doc.Category,
            Location = doc.Location,
            PurchaseDate = doc.PurchaseDate,
            PurchasePrice = doc.PurchasePrice,
            WarrantyExpiration = doc.WarrantyExpiration,
            NextMaintenanceDate = null,
            Notes = doc.Notes,
            CreatedAt = doc.CreatedAt,
            UpdatedAt = doc.UpdatedAt,
        };

        var component = ComponentMapper.ToDomain(componentDoc);
        return component != null
            ? FSharpOption<Component>.Some(component)
            : FSharpOption<Component>.None;
    }

    private static T? TryGetOptionValue<T>(FSharpOption<T>? opt)
        where T : class
    {
        return opt != null && FSharpOption<T>.get_IsSome(opt) ? opt.Value : null;
    }

    private static global::System.DateTime? TryGetOptionValue(
        FSharpOption<global::System.DateTime>? opt
    )
    {
        return opt != null && FSharpOption<global::System.DateTime>.get_IsSome(opt)
            ? opt.Value
            : null;
    }

    private static decimal? TryGetOptionValue(FSharpOption<decimal>? opt)
    {
        return opt != null && FSharpOption<decimal>.get_IsSome(opt) ? opt.Value : null;
    }
}
