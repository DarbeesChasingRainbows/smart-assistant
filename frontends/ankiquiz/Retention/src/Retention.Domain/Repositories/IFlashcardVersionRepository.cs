using Retention.Domain.Entities;

namespace Retention.Domain.Repositories;

public interface IFlashcardVersionRepository
{
    Task<FlashcardVersion?> GetByIdAsync(Guid id);
    Task<IEnumerable<FlashcardVersion>> GetByFlashcardIdAsync(Guid flashcardId);
    Task<FlashcardVersion?> GetLatestVersionAsync(Guid flashcardId);
    Task<int> GetNextVersionNumberAsync(Guid flashcardId);
    Task AddAsync(FlashcardVersion version);
}
