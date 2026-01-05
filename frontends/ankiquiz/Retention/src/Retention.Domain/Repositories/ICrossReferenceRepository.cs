using Retention.Domain.Entities;

namespace Retention.Domain;

public interface ICrossReferenceRepository
{
    Task AddAsync(CrossReference crossReference);
    Task<IEnumerable<CrossReference>> GetBySourceAsync(Guid sourceId, string sourceType);
    Task<IEnumerable<CrossReference>> GetByTargetAsync(Guid targetId, string targetType);
}
