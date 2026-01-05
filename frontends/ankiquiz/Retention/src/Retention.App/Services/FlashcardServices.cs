using Retention.Domain;
using Retention.Domain.Entities;
using System.Text.Json;
using ICSharpCode.SharpZipLib.Zip;

namespace Retention.App.Services;

/// <summary>
/// Service for importing Anki decks (.apkg files)
/// </summary>
public interface IAnkiImporter
{
    Task<ImportResult> ImportFromApkgAsync(string base64Content);
}

public class AnkiImporter : IAnkiImporter
{
    private readonly IFlashcardRepository _repository;
    private readonly ILogger<AnkiImporter> _logger;

    public AnkiImporter(IFlashcardRepository repository, ILogger<AnkiImporter> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<ImportResult> ImportFromApkgAsync(string base64Content)
    {
        var errors = new List<string>();
        var importedCount = 0;
        var deckName = "Unknown Deck";

        try
        {
            // Convert base64 to byte array
            var fileBytes = Convert.FromBase64String(base64Content);
            
            using var memoryStream = new MemoryStream(fileBytes);
            using var zipFile = new ZipFile(memoryStream);

            // Find and extract the database file
            var dbEntry = zipFile.Cast<ZipEntry>().FirstOrDefault(e => e.Name.EndsWith("collection.anki2"));
            if (dbEntry == null)
            {
                errors.Add("Invalid Anki package: missing database file");
                return new ImportResult(0, 0, errors, deckName);
            }

            using var dbStream = zipFile.GetInputStream(dbEntry);
            using var reader = new StreamReader(dbStream);
            var dbContent = await reader.ReadToEndAsync();

            // Parse the database (simplified approach - in production, you'd use SQLite)
            var cards = ParseAnkiDatabase(dbContent, errors);
            
            // Import cards to our system
            foreach (var card in cards)
            {
                try
                {
                    var flashcard = Flashcard.CreateNew(card.Question, card.Answer);
                    await _repository.AddAsync(flashcard);
                    importedCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to import card: {Question}", card.Question);
                    errors.Add($"Failed to import card '{card.Question}': {ex.Message}");
                }
            }

            return new ImportResult(cards.Count, importedCount, errors, deckName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process Anki package");
            errors.Add($"Failed to process file: {ex.Message}");
            return new ImportResult(0, 0, errors, deckName);
        }
    }

    private List<(string Question, string Answer)> ParseAnkiDatabase(string dbContent, List<string> errors)
    {
        var cards = new List<(string, string)>();

        try
        {
            // This is a simplified parser. In production, you'd use a proper SQLite reader
            // For now, we'll extract cards from the JSON structure that Anki uses
            var lines = dbContent.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            
            foreach (var line in lines)
            {
                if (line.Contains("flds") && line.Contains("sfld"))
                {
                    // Very basic parsing - look for question/answer patterns
                    var questionMatch = System.Text.RegularExpressions.Regex.Match(line, @"sfld"":""([^""]+)""");
                    var answerMatch = System.Text.RegularExpressions.Regex.Match(line, @"""([^""]+)"",""sfld""");
                    
                    if (questionMatch.Success && answerMatch.Success)
                    {
                        var question = questionMatch.Groups[1].Value.Replace("\\n", " ").Replace("\\\"", "\"");
                        var answer = answerMatch.Groups[1].Value.Replace("\\n", " ").Replace("\\\"", "\"");
                        
                        if (!string.IsNullOrWhiteSpace(question) && !string.IsNullOrWhiteSpace(answer))
                        {
                            cards.Add((question, answer));
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            errors.Add($"Failed to parse database: {ex.Message}");
        }

        return cards;
    }
}

/// <summary>
/// Service for bulk flashcard operations
/// </summary>
public interface IFlashcardBulkService
{
    Task<int> CreateBulkAsync(List<CreateFlashcardRequest> requests);
}

public class FlashcardBulkService : IFlashcardBulkService
{
    private readonly IFlashcardRepository _repository;
    private readonly ILogger<FlashcardBulkService> _logger;

    public FlashcardBulkService(IFlashcardRepository repository, ILogger<FlashcardBulkService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<int> CreateBulkAsync(List<CreateFlashcardRequest> requests)
    {
        var createdCount = 0;

        foreach (var request in requests)
        {
            try
            {
                var flashcard = Flashcard.CreateNew(request.Question, request.Answer);
                await _repository.AddAsync(flashcard);
                createdCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create flashcard: {Question}", request.Question);
            }
        }

        return createdCount;
    }
}
