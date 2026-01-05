using Retention.Domain.Common;

namespace Retention.Domain.Entities;

/// <summary>
/// Tracks version history for flashcard edits, enabling undo/rollback functionality.
/// </summary>
public class FlashcardVersion : Entity<Guid>
{
    public Guid FlashcardId { get; private set; }
    public string Question { get; private set; } = string.Empty;
    public string Answer { get; private set; } = string.Empty;
    public int VersionNumber { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public string? EditReason { get; private set; }

    private FlashcardVersion() { }

    public FlashcardVersion(Guid id, Guid flashcardId, string question, string answer, int versionNumber, string? editReason = null)
        : base(id)
    {
        FlashcardId = flashcardId;
        Question = question ?? throw new ArgumentNullException(nameof(question));
        Answer = answer ?? throw new ArgumentNullException(nameof(answer));
        VersionNumber = versionNumber;
        EditReason = editReason;
        CreatedAt = DateTime.UtcNow;
    }

    public static FlashcardVersion CreateFromFlashcard(Flashcard flashcard, int versionNumber, string? editReason = null)
    {
        return new FlashcardVersion(
            Guid.CreateVersion7(),
            flashcard.Id,
            flashcard.Question,
            flashcard.Answer,
            versionNumber,
            editReason
        );
    }
}
