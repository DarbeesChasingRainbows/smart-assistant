using Retention.Domain.Entities;

namespace Retention.Domain;

public interface IGlossaryRepository
{
    Task<GlossaryTerm?> GetByIdAsync(Guid id);
    Task<GlossaryTerm?> GetByTermAsync(string term);
    Task<IEnumerable<GlossaryTerm>> SearchTermsAsync(string searchText);
    Task<IEnumerable<GlossaryTerm>> GetByCategoryAsync(string category);
    Task<IEnumerable<GlossaryTerm>> GetForFlashcardAsync(Guid flashcardId);
    Task AddAsync(GlossaryTerm term);
    Task UpdateAsync(GlossaryTerm term);
    Task DeleteAsync(Guid id);
}
