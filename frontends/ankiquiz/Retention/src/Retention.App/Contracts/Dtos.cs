using Retention.Domain.Entities;

namespace Retention.App.Contracts;

public record DeckDto(
    Guid Id, 
    string Name, 
    string Description, 
    string Category, 
    string Subcategory, 
    string DifficultyLevel,
    int CardCount,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    public static DeckDto FromDomain(Deck deck) => new(
        deck.Id,
        deck.Name,
        deck.Description,
        deck.Category,
        deck.Subcategory,
        deck.DifficultyLevel.ToString(),
        deck.Flashcards.Count,
        deck.CreatedAt,
        deck.UpdatedAt
    );
}

public record UpdateDeckRequest(
    string Name,
    string Description,
    string Category,
    string Subcategory,
    string DifficultyLevel
);

public record GlossaryTermDto(
    Guid Id,
    string Term,
    string Pronunciation,
    string Definition,
    string? Category)
{
    public static GlossaryTermDto FromDomain(GlossaryTerm term) => new(
        term.Id,
        term.Term,
        term.Pronunciation,
        term.Definition,
        term.Category
    );
}

public record CrossReferenceDto(
    Guid Id,
    string SourceType,
    Guid SourceId,
    string TargetType,
    Guid TargetId,
    string ReferenceType)
{
    public static CrossReferenceDto FromDomain(CrossReference xref) => new(
        xref.Id,
        xref.SourceType,
        xref.SourceId,
        xref.TargetType,
        xref.TargetId,
        xref.ReferenceType.ToString()
    );
}

public record ShareDeckResponse
{
    public string ShareToken { get; init; } = string.Empty;
    public string ShareUrl { get; init; } = string.Empty;
}

public record TagDto(Guid Id, string Name, string? Color, DateTime CreatedAt)
{
    public static TagDto FromDomain(Tag tag) => new(tag.Id, tag.Name, tag.Color, tag.CreatedAt);
}

public record CreateTagRequest(string Name, string? Color);

public record FlashcardVersionDto(
    Guid Id,
    Guid FlashcardId,
    string Question,
    string Answer,
    int VersionNumber,
    string? EditReason,
    DateTime CreatedAt)
{
    public static FlashcardVersionDto FromDomain(FlashcardVersion v) => new(
        v.Id, v.FlashcardId, v.Question, v.Answer, v.VersionNumber, v.EditReason, v.CreatedAt);
}

public record InterleavedQuizRequest(List<Guid> DeckIds, int CardsPerDeck = 5, string Difficulty = "Medium");

public record InterleavedQuizResponse
{
    public Guid Id { get; init; }
    public List<InterleavedCardDto> Cards { get; init; } = new();
    public Dictionary<Guid, DeckInfoDto> DeckInfos { get; init; } = new();
    public string Difficulty { get; init; } = "Medium";
    public int TotalCards { get; init; }
}

public record InterleavedCardDto(Guid CardId, Guid DeckId, string DeckName, string DeckCategory, int PositionInSession);

public record DeckInfoDto(Guid Id, string Name, string Category, int CardCount);

public record CloneDeckRequest(string? NewName);
