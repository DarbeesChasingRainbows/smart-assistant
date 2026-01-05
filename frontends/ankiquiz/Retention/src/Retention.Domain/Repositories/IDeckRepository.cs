using Retention.Domain.Entities;

namespace Retention.Domain;

public interface IDeckRepository
{
    Task<Deck?> GetByIdAsync(Guid id);
    Task<Deck?> GetByShareTokenAsync(string shareToken);
    Task<IEnumerable<Deck>> GetByCategoryAsync(string category, string? subcategory = null);
    Task<IEnumerable<Deck>> GetAllAsync();
    Task AddAsync(Deck deck);
    Task UpdateAsync(Deck deck);
    Task DeleteAsync(Guid id);
}
