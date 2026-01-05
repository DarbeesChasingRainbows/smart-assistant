using Retention.Domain.Common;

namespace Retention.Domain.Entities;

public class GlossaryTerm : Entity<Guid>
{
    public string Term { get; private set; } = string.Empty;
    public string Pronunciation { get; private set; } = string.Empty;
    public string Definition { get; private set; } = string.Empty;
    public string? Etymology { get; private set; }
    public string? Category { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private GlossaryTerm() { }

    public GlossaryTerm(Guid id, string term, string pronunciation, string definition, string? etymology = null, string? category = null)
        : base(id)
    {
        Term = term ?? throw new ArgumentNullException(nameof(term));
        Pronunciation = pronunciation;
        Definition = definition ?? throw new ArgumentNullException(nameof(definition));
        Etymology = etymology;
        Category = category;
        CreatedAt = DateTime.UtcNow;
    }
}
