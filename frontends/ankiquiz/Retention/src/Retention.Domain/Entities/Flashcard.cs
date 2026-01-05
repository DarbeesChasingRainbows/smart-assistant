using Retention.Domain.Common;
using Retention.Domain.ValueObjects;

namespace Retention.Domain.Entities;

public class Flashcard : Entity<Guid>
{
    public Guid DeckId { get; private set; }
    public string Question { get; private set; } = string.Empty;
    public string Answer { get; private set; } = string.Empty;
    public QuestionMetadata Metadata { get; private set; } = QuestionMetadata.Simple();
    public SchedulingData Scheduling { get; private set; } = SchedulingData.New();
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private readonly List<GlossaryTerm> _glossaryTerms = new();
    public IReadOnlyList<GlossaryTerm> GlossaryTerms => _glossaryTerms.AsReadOnly();

    private readonly List<CrossReference> _crossReferences = new();
    public IReadOnlyList<CrossReference> CrossReferences => _crossReferences.AsReadOnly();

    // Constructor for persistence
    private Flashcard() { }

    public Flashcard(Guid id, Guid deckId, string question, string answer, QuestionMetadata metadata, SchedulingData scheduling)
        : base(id)
    {
        DeckId = deckId;
        Question = question ?? throw new ArgumentNullException(nameof(question));
        Answer = answer ?? throw new ArgumentNullException(nameof(answer));
        Metadata = metadata ?? QuestionMetadata.Simple();
        Scheduling = scheduling ?? SchedulingData.New();
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public static Flashcard CreateNew(string question, string answer, Guid? deckId = null, QuestionMetadata? metadata = null)
    {
        // If no deck ID provided, we might need a default or throw. For now, allow empty GUID or specific "Uncategorized" deck logic.
        // However, database requires DeckId. Let's require it or generate a placeholder.
        // For backward compatibility with simple tests, we can use Guid.Empty, but better to be explicit.
        
        return new Flashcard(
            Guid.CreateVersion7(), // Use native UUIDv7 for time-sortable IDs
            deckId ?? Guid.Empty, 
            question, 
            answer, 
            metadata ?? QuestionMetadata.Simple(), 
            SchedulingData.New()
        );
    }

    public void UpdateAnswer(string newAnswer)
    {
        Answer = newAnswer;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateContent(string question, string answer)
    {
        Question = question ?? throw new ArgumentNullException(nameof(question));
        Answer = answer ?? throw new ArgumentNullException(nameof(answer));
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateScheduling(DateTime nextReviewDate, int interval, int repetitions, double easeFactor)
    {
        Scheduling = new SchedulingData(nextReviewDate, interval, repetitions, easeFactor);
        UpdatedAt = DateTime.UtcNow;
    }

    public void AddGlossaryTerm(GlossaryTerm term)
    {
        if (!_glossaryTerms.Contains(term))
        {
            _glossaryTerms.Add(term);
            UpdatedAt = DateTime.UtcNow;
        }
    }

    public void AddCrossReference(CrossReference reference)
    {
        if (!_crossReferences.Contains(reference))
        {
            _crossReferences.Add(reference);
            UpdatedAt = DateTime.UtcNow;
        }
    }
}
