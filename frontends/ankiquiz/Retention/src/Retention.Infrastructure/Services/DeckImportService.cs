using Retention.Domain;
using Retention.Domain.Entities;
using Retention.Domain.Services;
using Retention.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Text.RegularExpressions;
using System.Net.Http;
using Newtonsoft.Json.Linq;

namespace Retention.Infrastructure.Services;

public class DeckImportService : IDeckImportService
{
    private readonly IDeckRepository _deckRepository;
    private readonly IFlashcardRepository _flashcardRepository;
    private readonly IGlossaryRepository _glossaryRepository;
    private readonly IMasterIndexParser _masterIndexParser;
    private readonly ICrossReferenceRepository _crossReferenceRepository;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMediaAssetRepository _mediaAssetRepository;
    private readonly IFileStoragePathProvider _fileStoragePathProvider;

    public DeckImportService(
        IFlashcardRepository flashcardRepository,
        IDeckRepository deckRepository,
        IMediaAssetRepository mediaAssetRepository,
        IHttpClientFactory httpClientFactory,
        IFileStoragePathProvider fileStoragePathProvider,
        IGlossaryRepository glossaryRepository,
        IMasterIndexParser masterIndexParser,
        ICrossReferenceRepository crossReferenceRepository)
    {
        _deckRepository = deckRepository;
        _flashcardRepository = flashcardRepository;
        _glossaryRepository = glossaryRepository;
        _masterIndexParser = masterIndexParser;
        _crossReferenceRepository = crossReferenceRepository;
        _httpClientFactory = httpClientFactory;
        _mediaAssetRepository = mediaAssetRepository;
        _fileStoragePathProvider = fileStoragePathProvider;
    }

    public async Task<DeckImportResult> ImportDeckFromFileAsync(string filePath, Guid? deckId = null)
    {
        if (!File.Exists(filePath))
        {
            return new DeckImportResult { Success = false, Messages = new List<string> { $"File not found: {filePath}" } };
        }

        var lines = await File.ReadAllLinesAsync(filePath);
        var fileName = Path.GetFileNameWithoutExtension(filePath);
        var directoryName = Path.GetDirectoryName(filePath);

        // Parse deck metadata from filename and path
        var deckInfo = ParseDeckInfo(fileName, directoryName);

        // Check for existing deck to avoid duplicates
        var allDecks = await _deckRepository.GetAllAsync();
        var existingDeck = allDecks.FirstOrDefault(d => d.Name.Equals(deckInfo.Name, StringComparison.OrdinalIgnoreCase));

        Deck deck;
        bool isNewDeck = false;

        if (existingDeck != null)
        {
            deck = existingDeck;
            // Optionally update metadata?
        }
        else
        {
            isNewDeck = true;
            deck = new Deck(
                deckId ?? Guid.CreateVersion7(),
                deckInfo.Name,
                deckInfo.Description,
                deckInfo.Category,
                deckInfo.Subcategory,
                deckInfo.DifficultyLevel
            );
        }

        // Parse flashcards
        var parsedFlashcards = await ParseFlashcardsAsync(lines, deck.Id);
        
        // Filter duplicates if deck exists
        var cardsToAdd = new List<Flashcard>();
        if (!isNewDeck)
        {
            var existingCards = await _flashcardRepository.GetByDeckIdAsync(deck.Id);
            foreach (var card in parsedFlashcards)
            {
                // Simple duplicate check based on Question text
                if (!existingCards.Any(c => c.Question.Trim().Equals(card.Question.Trim(), StringComparison.OrdinalIgnoreCase)))
                {
                    cardsToAdd.Add(card);
                }
            }
        }
        else
        {
            cardsToAdd = parsedFlashcards;
        }

        // Save Deck
        if (isNewDeck)
        {
            await _deckRepository.AddAsync(deck);
        }

        // Save Flashcards
        foreach (var flashcard in cardsToAdd)
        {
            await _flashcardRepository.AddAsync(flashcard);
        }

        return new DeckImportResult
        {
            Success = true,
            ImportedDecks = isNewDeck ? 1 : 0,
            ImportedFlashcards = cardsToAdd.Count,
            Messages = new List<string> { 
                isNewDeck 
                    ? $"Successfully imported deck: {deck.Name} with {cardsToAdd.Count} cards" 
                    : $"Updated deck: {deck.Name}. Added {cardsToAdd.Count} new cards. Skipped {parsedFlashcards.Count - cardsToAdd.Count} duplicates."
            }
        };
    }


    public async Task<DeckImportResult> ImportGlossaryFromFileAsync(string filePath)
    {
        if (!File.Exists(filePath))
            return new DeckImportResult { Success = false, Messages = new List<string> { $"File not found: {filePath}" } };

        var lines = await File.ReadAllLinesAsync(filePath);
        var fileName = Path.GetFileNameWithoutExtension(filePath);
        var category = ParseCategoryFromFileName(fileName);

        var importedCount = 0;
        var messages = new List<string>();

        foreach (var line in lines)
        {
            if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;

            // Pattern: **Term** (Pronunciation) - Definition
            var match = Regex.Match(line, @"\*\*(.*?)\*\*\s*\((.*?)\)\s*-\s*(.*)");
            if (match.Success)
            {
                var term = match.Groups[1].Value.Trim();
                var pronunciation = match.Groups[2].Value.Trim();
                var definition = match.Groups[3].Value.Trim();

                var glossaryTerm = new GlossaryTerm(
                    Guid.CreateVersion7(),
                    term,
                    definition,
                    pronunciation,
                    null, // Etymology not explicitly in this format
                    category
                );

                try
                {
                    // Check if exists to avoid duplicates or update
                    var existing = await _glossaryRepository.GetByTermAsync(term);
                    if (existing != null)
                    {
                        // Update? Or skip? Let's skip or update if needed.
                        // For now, we'll just log it exists
                        // messages.Add($"Term '{term}' already exists.");
                    }
                    else
                    {
                        await _glossaryRepository.AddAsync(glossaryTerm);
                        importedCount++;
                    }
                }
                catch (Exception ex)
                {
                    messages.Add($"Failed to add term '{term}': {ex.Message}");
                }
            }
        }

        return new DeckImportResult
        {
            Success = true,
            ImportedFlashcards = importedCount, // reusing this field for terms count
            Messages = messages
        };
    }

    private string ParseCategoryFromFileName(string fileName)
    {
        // pronunciation_guide_plant_sciences -> Plant Sciences
        var parts = fileName.Replace("pronunciation_guide_", "").Split('_');
        return string.Join(" ", parts.Select(p => char.ToUpper(p[0]) + p.Substring(1)));
    }

    public async Task<DeckImportResult> CreateCrossReferencesAsync(string rootPath)
    {
        if (!Directory.Exists(rootPath)) 
            return new DeckImportResult { Success = false, Messages = new List<string> { "Root path not found" } };

        var indexFiles = Directory.GetFiles(rootPath, "*master_index.txt", SearchOption.AllDirectories)
            .Concat(Directory.GetFiles(rootPath, "*import_guide.md", SearchOption.AllDirectories))
            .ToList();

        var allDecks = (await _deckRepository.GetAllAsync()).ToList();
        var createdRefs = 0;
        var messages = new List<string>();

        foreach (var indexFile in indexFiles)
        {
            try
            {
                var data = await _masterIndexParser.ParseIndexFileAsync(indexFile);
                
                // Process Pathways
                foreach (var path in data.Pathways)
                {
                    var orderedSteps = path.Steps.OrderBy(s => s.Order).ToList();
                    
                    for (int i = 0; i < orderedSteps.Count; i++)
                    {
                        var currentStep = orderedSteps[i];
                        var nextStep = (i + 1 < orderedSteps.Count) ? orderedSteps[i + 1] : null;

                        var currentDecks = FindDecksByFilenames(allDecks, currentStep.DeckFiles);
                        var nextDecks = nextStep != null ? FindDecksByFilenames(allDecks, nextStep.DeckFiles) : new List<Deck>();

                        // Link current step decks as Related
                        foreach (var d1 in currentDecks)
                        {
                            foreach (var d2 in currentDecks.Where(d => d.Id != d1.Id))
                            {
                                await _crossReferenceRepository.AddAsync(new CrossReference(
                                    Guid.CreateVersion7(),
                                    "deck", d1.Id,
                                    "deck", d2.Id,
                                    ReferenceType.Related
                                ));
                                createdRefs++;
                            }

                            // Link to next step as Prerequisite (d1 is prerequisite for dNext)
                            foreach (var dNext in nextDecks)
                            {
                                await _crossReferenceRepository.AddAsync(new CrossReference(
                                    Guid.CreateVersion7(),
                                    "deck", dNext.Id, // Target needs Prereq
                                    "deck", d1.Id,    // Source is the Prereq
                                    ReferenceType.Prerequisite
                                ));
                                createdRefs++;
                            }
                        }
                    }
                }
                
                messages.Add($"Processed {indexFile}: Created references from {data.Pathways.Count} pathways.");
            }
            catch (Exception ex)
            {
                messages.Add($"Error parsing {Path.GetFileName(indexFile)}: {ex.Message}");
            }
        }

        return new DeckImportResult { Success = true, Messages = messages, ImportedDecks = 0, ImportedFlashcards = 0 }; // Reusing DTO
    }

    private List<Deck> FindDecksByFilenames(List<Deck> allDecks, List<string> filenames)
    {
        // Filenames in master index might be "ethical_hacking_beginner_fundamentals.txt"
        // Decks description contains "Imported from ethical_hacking_beginner_fundamentals"
        
        var matches = new List<Deck>();
        foreach (var filename in filenames)
        {
            var nameNoExt = Path.GetFileNameWithoutExtension(filename);
            var deck = allDecks.FirstOrDefault(d => 
                d.Description != null && d.Description.Contains(nameNoExt, StringComparison.OrdinalIgnoreCase));
            
            if (deck != null) matches.Add(deck);
        }
        return matches;
    }

    private (string Name, string Description, string Category, string Subcategory, DifficultyLevel DifficultyLevel) ParseDeckInfo(string fileName, string? directoryPath)
    {
        // Name from filename (formatted)
        var parts = fileName.Split('_');
        var name = string.Join(" ", parts.Select(p => char.ToUpper(p[0]) + p.Substring(1)));
        
        // Default Category/Subcategory from filename heuristic
        var category = "General";
        var subcategory = "General";

        // Enhanced Category/Subcategory from Directory Path
        if (!string.IsNullOrEmpty(directoryPath))
        {
            // Extract from path like: ...\Decks\02-Sciences\Biology
            var dirInfo = new DirectoryInfo(directoryPath);
            var parentDir = dirInfo.Parent;
            
            if (dirInfo.Name != "Decks" && parentDir != null && parentDir.Name != "Decks")
            {
                // e.g. Biology (Sub) inside 02-Sciences (Cat)
                subcategory = dirInfo.Name.Replace("_", " ");
                
                // Remove numbered prefix from Category if present (02-Sciences -> Sciences)
                var catName = parentDir.Name;
                var hyphenIndex = catName.IndexOf('-');
                if (hyphenIndex >= 0 && hyphenIndex < 5) // Simple check for "01-" prefix
                {
                    catName = catName.Substring(hyphenIndex + 1);
                }
                category = catName.Replace("_", " ");
            }
            else if (dirInfo.Name != "Decks")
            {
                // e.g. 02-Sciences (Cat), no sub folder
                var catName = dirInfo.Name;
                var hyphenIndex = catName.IndexOf('-');
                if (hyphenIndex >= 0 && hyphenIndex < 5)
                {
                    catName = catName.Substring(hyphenIndex + 1);
                }
                category = catName.Replace("_", " ");
            }
        }
        
        var difficulty = DifficultyLevel.Beginner;
        if (fileName.Contains("expert")) difficulty = DifficultyLevel.Expert;
        else if (fileName.Contains("advanced")) difficulty = DifficultyLevel.Advanced;
        else if (fileName.Contains("intermediate")) difficulty = DifficultyLevel.Intermediate;

        return (name, $"Imported from {fileName}", category, subcategory, difficulty);
    }

    private async Task<List<Flashcard>> ParseFlashcardsAsync(string[] lines, Guid deckId)
    {
        var flashcards = new List<Flashcard>();
        var httpClient = _httpClientFactory.CreateClient();

        // Get the correct web root path from the hosting environment
        var webRootPath = _fileStoragePathProvider.GetWebRootPath();

        for (int i = 0; i < lines.Length; i++)
        {
            var line = lines[i].Trim();
            if (string.IsNullOrWhiteSpace(line) || line.StartsWith("//")) continue;

            // Assume block of:
            // Question
            // Answer
            // (Empty line)
            
            if (i + 1 < lines.Length)
            {
                var question = line;
                var answer = lines[i + 1].Trim();
                i++; // Skip answer line

                var flashcardId = Guid.CreateVersion7();

                // Detect metadata/question type (Basic detection)
                var metadata = QuestionMetadata.Simple();
                if (question.Contains("Select ALL") || question.Contains("Select one"))
                {
                    metadata = new QuestionMetadata { Type = QuestionType.MultipleChoice }; 
                }

                // Spell the word logic - Automatic Audio Import
                var spellMatch = Regex.Match(question, @"Spell the word:\s*(\w+)", RegexOptions.IgnoreCase);
                if (spellMatch.Success)
                {
                    var word = spellMatch.Groups[1].Value.Trim();
                    try 
                    {
                        // Rate limit protection - simple delay
                        await Task.Delay(100); 

                        var response = await httpClient.GetAsync($"https://api.dictionaryapi.dev/api/v2/entries/en/{word}");
                        if (response.IsSuccessStatusCode)
                        {
                            var json = await response.Content.ReadAsStringAsync();
                            var data = JArray.Parse(json);
                            var audioUrl = data[0]["phonetics"]?
                                .Select(p => p["audio"]?.ToString())
                                .FirstOrDefault(u => !string.IsNullOrEmpty(u));

                            if (!string.IsNullOrEmpty(audioUrl))
                            {
                                // Download audio
                                var audioBytes = await httpClient.GetByteArrayAsync(audioUrl);
                                
                                // Save asset
                                var fileName = $"{word}_{Guid.NewGuid().ToString().Substring(0, 8)}.mp3";
                                var relativeFolder = Path.Combine("uploads", "flashcard", flashcardId.ToString());
                                
                                var savePath = Path.Combine(webRootPath, relativeFolder);
                                Directory.CreateDirectory(savePath);
                                var filePath = Path.Combine(savePath, fileName);
                                await File.WriteAllBytesAsync(filePath, audioBytes);
                                
                                var relativePath = $"/{relativeFolder.Replace("\\", "/")}/{fileName}";

                                // Create MediaAsset
                                var asset = MediaAsset.Create(
                                    fileName, 
                                    relativePath, 
                                    "audio/mpeg", 
                                    audioBytes.Length, 
                                    flashcardId, 
                                    "Flashcard"
                                );
                                await _mediaAssetRepository.AddAsync(asset);

                                // Append audio tag to question
                                question += $"<br><br><audio controls src='{relativePath}'></audio>";
                            }
                        }
                    }
                    catch (Exception ex)
                    { 
                        // Log but continue
                        Console.WriteLine($"Failed to fetch audio for '{word}': {ex.Message}");
                    }
                }

                var flashcard = new Flashcard(
                    flashcardId,
                    deckId,
                    question,
                    answer,
                    metadata,
                    SchedulingData.New()
                );

                flashcards.Add(flashcard);
            }
        }

        return flashcards;
    }

    public async Task<DeckImportResult> BackfillSpellingAudioAsync()
    {
        var result = new DeckImportResult { Success = true };
        // Use the resilient DictionaryApi client with Circuit Breaker, Retry, and Timeout
        var httpClient = _httpClientFactory.CreateClient("DictionaryApi");
        var webRootPath = _fileStoragePathProvider.GetWebRootPath();

        try
        {
            Console.WriteLine("[BACKFILL] Starting GetAllAsync...");
            // Get all flashcards that have "Spell the word:" but no <audio> tag
            var allFlashcards = await _flashcardRepository.GetAllAsync();
            Console.WriteLine($"[BACKFILL] Retrieved {allFlashcards.Count()} total flashcards");
            
            var spellingCardsNeedingAudio = allFlashcards
                .Where(fc => fc.Question.Contains("Spell the word:", StringComparison.OrdinalIgnoreCase) && 
                             !fc.Question.Contains("<audio", StringComparison.OrdinalIgnoreCase))
                .ToList();

            Console.WriteLine($"[BACKFILL] Processing {spellingCardsNeedingAudio.Count} spelling cards (limited to 1 for debugging)");
            result.Messages.Add($"Found {spellingCardsNeedingAudio.Count} spelling cards needing audio backfill.");

            if (spellingCardsNeedingAudio.Count == 0)
            {
                result.Messages.Add("No spelling cards need audio backfill. All existing spelling cards already have audio.");
                return result;
            }

            int updated = 0;
            int skipped = 0;
            int errors = 0;

            foreach (var flashcard in spellingCardsNeedingAudio)
            {
                Console.WriteLine($"[BACKFILL] Processing card {flashcard.Id}: {flashcard.Question.Substring(0, Math.Min(50, flashcard.Question.Length))}...");
                    try
                    {
                        // Improved regex to handle apostrophes and hyphens in words (including full words like "doesn't")
                        var spellMatch = Regex.Match(flashcard.Question, @"Spell the word:\s*([a-zA-Z'\-]+)", RegexOptions.IgnoreCase);
                        if (!spellMatch.Success)
                        {
                            skipped++;
                            result.Messages.Add($"Skipped: Could not extract word from flashcard {flashcard.Id}");
                            continue;
                        }

                        var word = spellMatch.Groups[1].Value.Trim().ToLowerInvariant();
                        Console.WriteLine($"[BACKFILL] Extracted word: {word}");
                        
                        // Rate limiting: increased delay to avoid 429s
                        await Task.Delay(800);

                        Console.WriteLine($"[BACKFILL] Calling dictionary API for {word}...");
                        var response = await httpClient.GetAsync($"https://api.dictionaryapi.dev/api/v2/entries/en/{word}");
                        if (!response.IsSuccessStatusCode)
                        {
                            skipped++;
                            result.Messages.Add($"Skipped: No audio data for '{word}' (status {response.StatusCode})");
                            continue;
                        }

                        Console.WriteLine($"[BACKFILL] Parsing response for {word}...");
                        var json = await response.Content.ReadAsStringAsync();
                        var data = JArray.Parse(json);
                        var audioUrl = data[0]?["phonetics"]?
                            .Select(p => p["audio"]?.ToString())
                            .FirstOrDefault(u => !string.IsNullOrEmpty(u));

                        if (string.IsNullOrEmpty(audioUrl))
                        {
                            skipped++;
                            result.Messages.Add($"Skipped: No phonetic audio URL for '{word}'");
                            continue;
                        }

                        Console.WriteLine($"[BACKFILL] Downloading audio from {audioUrl}...");
                        // Download audio
                        var audioBytes = await httpClient.GetByteArrayAsync(audioUrl);
                        Console.WriteLine($"[BACKFILL] Downloaded {audioBytes.Length} bytes");
                        
                        // Save asset
                        var fileName = $"{word}_{Guid.NewGuid().ToString().Substring(0, 8)}.mp3";
                        var relativeFolder = Path.Combine("uploads", "flashcard", flashcard.Id.ToString());
                        
                        var savePath = Path.Combine(webRootPath, relativeFolder);
                        Console.WriteLine($"[BACKFILL] Creating directory {savePath}...");
                        Directory.CreateDirectory(savePath);
                        var filePath = Path.Combine(savePath, fileName);
                        Console.WriteLine($"[BACKFILL] Writing audio file to {filePath}...");
                        await File.WriteAllBytesAsync(filePath, audioBytes);
                        
                        var relativePath = $"/{relativeFolder.Replace("\\", "/")}/{fileName}";
                        Console.WriteLine($"[BACKFILL] Relative path: {relativePath}");

                        Console.WriteLine($"[BACKFILL] Creating MediaAsset record...");
                        // Create MediaAsset
                        var asset = MediaAsset.Create(
                            fileName, 
                            relativePath, 
                            "audio/mpeg", 
                            audioBytes.Length, 
                            flashcard.Id, 
                            "Flashcard"
                        );
                        Console.WriteLine($"[BACKFILL] Adding MediaAsset to repository...");
                        await _mediaAssetRepository.AddAsync(asset);
                        Console.WriteLine($"[BACKFILL] MediaAsset added successfully");

                        // Update flashcard question with audio tag using domain method
                        var updatedQuestion = flashcard.Question + $"<br><br><audio controls src='{relativePath}'></audio>";
                        Console.WriteLine($"[BACKFILL] Updating flashcard content...");
                        flashcard.UpdateContent(updatedQuestion, flashcard.Answer);
                        Console.WriteLine($"[BACKFILL] Calling flashcard repository UpdateAsync...");
                        await _flashcardRepository.UpdateAsync(flashcard);
                        Console.WriteLine($"[BACKFILL] Flashcard updated successfully");
                        
                        updated++;
                        result.Messages.Add($"Updated: Added audio for '{word}' to flashcard {flashcard.Id}");
                    }
                catch (Exception ex)
                {
                    errors++;
                    result.Messages.Add($"Error processing flashcard {flashcard.Id}: {ex.Message}");
                    Console.WriteLine($"Backfill audio error for flashcard {flashcard.Id}: {ex}");
                }
            }

            result = result with { ImportedFlashcards = updated };
            result = result with { Success = errors == 0 };
            result.Messages.Add($"Backfill complete. Updated: {updated}, Skipped: {skipped}, Errors: {errors}");
            
            if (errors > 0)
            {
                result.Messages.Add("Backfill completed with errors. Check logs for details.");
            }

            return result;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Backfill failed with critical error: {ex}");
            result = result with { Success = false };
            result.Messages.Add($"Backfill failed: {ex.Message}");
            return result;
        }
    }
}
