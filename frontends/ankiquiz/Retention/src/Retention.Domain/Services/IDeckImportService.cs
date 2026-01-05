namespace Retention.Domain.Services;

public interface IDeckImportService
{
    Task<DeckImportResult> ImportDeckFromFileAsync(string filePath, Guid? deckId = null);
    Task<DeckImportResult> ImportGlossaryFromFileAsync(string filePath);
    Task<DeckImportResult> CreateCrossReferencesAsync(string rootPath);
    Task<DeckImportResult> BackfillSpellingAudioAsync();
}

public record DeckImportResult
{
    public bool Success { get; init; }
    public int ImportedDecks { get; init; }
    public int ImportedFlashcards { get; init; }
    public List<string> Messages { get; init; } = new();
}
