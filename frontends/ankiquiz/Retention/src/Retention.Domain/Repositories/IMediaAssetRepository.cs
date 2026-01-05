using Retention.Domain.Entities;

namespace Retention.Domain;

public interface IMediaAssetRepository
{
    Task<MediaAsset?> GetByIdAsync(Guid id);
    Task<IEnumerable<MediaAsset>> GetByEntityAsync(Guid entityId);
    Task AddAsync(MediaAsset asset);
    Task DeleteAsync(Guid id);
}
