using Retention.Domain.Entities;

namespace Retention.Domain.Repositories;

public interface ITagRepository
{
    Task<Tag?> GetByIdAsync(Guid id);
    Task<Tag?> GetByNameAsync(string name);
    Task<IEnumerable<Tag>> GetAllAsync();
    Task<IEnumerable<Tag>> GetByFlashcardIdAsync(Guid flashcardId);
    Task AddAsync(Tag tag);
    Task DeleteAsync(Guid id);
    
    // Flashcard-Tag associations
    Task AddTagToFlashcardAsync(Guid flashcardId, Guid tagId);
    Task RemoveTagFromFlashcardAsync(Guid flashcardId, Guid tagId);
    Task<IEnumerable<Guid>> GetFlashcardIdsByTagAsync(Guid tagId);
}
