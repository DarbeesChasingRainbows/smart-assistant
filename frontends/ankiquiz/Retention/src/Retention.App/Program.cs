using DotNetEnv;
using Microsoft.AspNetCore.Mvc;
using System.Text;
using Retention.Domain;
using Retention.Domain.Entities;
using Retention.Domain.ValueObjects;
using Retention.Domain.Services;
using Retention.Domain.Repositories;
using Retention.Infrastructure;
using Retention.Infrastructure.Database;
using Retention.Infrastructure.Services;
using Retention.App.Services;

// Load environment variables from .env file
Env.Load();

var builder = WebApplication.CreateBuilder(args);

// --- Service Registration ---

// 1. Database Connection
// In a real app, use builder.Configuration.GetConnectionString("Postgres")
// Here we maintain the env var logic for compatibility with previous setup
var connectionString = Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING");

// Check for secrets file (used in production with Podman secrets)
var connectionStringFile = Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING_FILE");
if (!string.IsNullOrEmpty(connectionStringFile) && File.Exists(connectionStringFile))
{
    connectionString = await File.ReadAllTextAsync(connectionStringFile);
}

if (string.IsNullOrEmpty(connectionString))
{
    // Fallback to individual vars
    var host = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "localhost";
    var port = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
    var db = Environment.GetEnvironmentVariable("POSTGRES_DATABASE") ?? "ankiquizdb";
    var user = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "postgres";
    
    // Check for password secret file
    var passwordFile = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD_FILE");
    var pass = "";
    if (!string.IsNullOrEmpty(passwordFile) && File.Exists(passwordFile))
    {
        pass = await File.ReadAllTextAsync(passwordFile);
    }
    else
    {
        pass = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "*Tx325z59aq";
    }
    
    connectionString = $"Host={host};Port={port};Database={db};Username={user};Password={pass}";
}

Console.WriteLine($"[DEBUG] Using Connection String: {connectionString}");
Console.WriteLine($"[DEBUG] POSTGRES_PORT env var: {Environment.GetEnvironmentVariable("POSTGRES_PORT")}");

// Run Migrations
var migrationRunner = new DbUpRunner(connectionString);
migrationRunner.RunMigrations();

// 2. Register Repository
builder.Services.AddScoped<IFlashcardRepository>(_ => new FlashcardRepository(connectionString));
builder.Services.AddScoped<IDeckRepository>(_ => new DeckRepository(connectionString));
builder.Services.AddScoped<IGlossaryRepository>(_ => new GlossaryRepository(connectionString));
builder.Services.AddScoped<ICrossReferenceRepository>(_ => new CrossReferenceRepository(connectionString));
builder.Services.AddScoped<IMediaAssetRepository>(_ => new MediaAssetRepository(connectionString));
builder.Services.AddScoped<IQuizResultRepository>(_ => new QuizResultRepository(connectionString));
builder.Services.AddScoped<IUserRepository>(_ => new UserRepository(connectionString));
builder.Services.AddScoped<IFlashcardVersionRepository>(_ => new FlashcardVersionRepository(connectionString));
builder.Services.AddScoped<ITagRepository>(_ => new TagRepository(connectionString));

builder.Services.AddScoped<ISchedulingEngine, SchedulingEngine>();
builder.Services.AddScoped<IInterleavedQuizService, InterleavedQuizService>();
builder.Services.AddScoped<IQuizGenerator, QuizGenerator>();
builder.Services.AddScoped<IFlashcardService, FlashcardService>();

// 3. Register Flashcard Services
builder.Services.AddScoped<IAnkiImporter, AnkiImporter>();
builder.Services.AddScoped<IFlashcardBulkService, FlashcardBulkService>();
builder.Services.AddScoped<IDeckImportService, DeckImportService>();
builder.Services.AddScoped<IMasterIndexParser, MasterIndexParser>();
builder.Services.AddScoped<DirectoryImportService>();

// Add logging
builder.Services.AddLogging(builder => builder.AddConsole());

// Add OpenTelemetry for distributed tracing and metrics
builder.Services.AddTelemetry(builder.Configuration);

// Add HttpClient with resilience (Circuit Breaker, Retry, Timeout)
// Default HttpClient for general use
builder.Services.AddHttpClient();

// Resilient HttpClient for Dictionary API (used for spelling audio)
builder.Services.AddDictionaryApiClient();

// Register file storage path provider
builder.Services.AddSingleton<IFileStoragePathProvider, WebRootFileStoragePathProvider>();

// Add Controllers support
builder.Services.AddControllers();

// Add CORS for Fresh dev server and container environment
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFreshDev", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5137", 
                "http://127.0.0.1:5137",
                "http://localhost:8000",  // Container frontend
                "http://127.0.0.1:8000"   // Container frontend alternative
              )
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// 3. Add API Explorer (Swagger) - useful for Deno dev to see the contract
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowFreshDev");

app.UseRouting();

app.UseStaticFiles();

// Log the actual web root path for debugging
var webRootPath = app.Environment.WebRootPath;
var logger = app.Services.GetRequiredService<ILogger<Program>>();
logger.LogInformation("WebRootPath: {WebRootPath}", webRootPath);
logger.LogInformation("CurrentDirectory: {CurrentDirectory}", Directory.GetCurrentDirectory());

// Apply CORS policy
app.UseCors("AllowFreshDev");

app.MapControllers();

// Add root health check for container compatibility
app.MapGet("/health", async (IFlashcardRepository repo, ILogger<Program> logger) =>
{
    try
    {
        var cards = await repo.GetAllAsync();
        var count = cards.Count();
        logger.LogInformation("Root health check: Database connected, found {Count} cards", count);
        return Results.Ok(new { status = "Healthy", cardCount = count });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Root health check failed: Database connection error");
        return Results.Problem(
            detail: $"Database connection failed: {ex.Message}",
            statusCode: 503
        );
    }
});

// --- API Endpoints (The Contract) ---

#pragma warning disable ASPDEPR002 // Suppress deprecation warning for WithOpenApi

var api = app.MapGroup("/api/v1/flashcards");

// GET /api/v1/flashcards
api.MapGet(
        "/",
        async (IFlashcardRepository repo) =>
        {
            return Results.Ok(await repo.GetAllAsync());
        }
    )
    .WithName("GetAllFlashcards")
    .WithOpenApi();

// GET /api/v1/flashcards/{id}
api.MapGet(
        "/{id:guid}",
        async (Guid id, IFlashcardRepository repo) =>
        {
            var card = await repo.GetByIdAsync(id);
            return card is not null ? Results.Ok(card) : Results.NotFound();
        }
    )
    .WithName("GetFlashcardById")
    .WithOpenApi();

// POST /api/v1/flashcards
api.MapPost(
        "/",
        async ([FromBody] CreateFlashcardRequest request, IFlashcardRepository repo) =>
        {
            var newCard = Flashcard.CreateNew(request.Question, request.Answer, request.DeckId);
            await repo.AddAsync(newCard);
            return Results.Created($"/api/v1/flashcards/{newCard.Id}", newCard);
        }
    )
    .WithName("CreateFlashcard")
    .WithOpenApi();

// GET /api/v1/flashcards/check-duplicates - Check for similar questions in a deck
api.MapGet(
        "/check-duplicates",
        async (Guid deckId, string question, double? threshold, IFlashcardRepository repo) =>
        {
            var similarCards = await repo.FindSimilarQuestionsAsync(
                deckId, 
                question, 
                threshold ?? 0.5);
            
            return Results.Ok(new 
            { 
                hasSimilar = similarCards.Any(),
                similarCards = similarCards.Select(c => new 
                { 
                    c.Id, 
                    c.Question, 
                    c.Answer 
                })
            });
        }
    )
    .WithName("CheckDuplicates")
    .WithOpenApi();

// PUT /api/v1/flashcards/{id}
api.MapPut(
        "/{id:guid}",
        async (Guid id, [FromBody] UpdateFlashcardRequest request, IFlashcardRepository repo) =>
        {
            var existing = await repo.GetByIdAsync(id);
            if (existing is null)
                return Results.NotFound();

            existing.UpdateContent(request.Question, request.Answer);
            var updated = existing;
            // Note: In a real app, we'd handle scheduling updates separately or here too

            await repo.UpdateAsync(updated);
            return Results.Ok(updated);
        }
    )
    .WithName("UpdateFlashcard")
    .WithOpenApi();

// DELETE /api/v1/flashcards/{id}
api.MapDelete(
        "/{id:guid}",
        async (Guid id, IFlashcardRepository repo) =>
        {
            var existing = await repo.GetByIdAsync(id);
            if (existing is null)
                return Results.NotFound();

            await repo.DeleteAsync(id);
            return Results.NoContent();
        }
    )
    .WithName("DeleteFlashcard")
    .WithOpenApi();

// POST /api/v1/flashcards/quiz
api.MapPost(
        "/quiz",
        async (string difficulty, int count, Guid? deckId, IQuizGenerator generator, ILogger<Program> logger) =>
        {
            logger.LogInformation(
                "Quiz generation request: Difficulty={Difficulty}, Count={Count}, DeckId={DeckId}",
                difficulty,
                count,
                deckId
            );

            if (!Enum.TryParse<QuizDifficulty>(difficulty, true, out var diffEnum))
            {
                logger.LogWarning("Invalid difficulty parameter: {Difficulty}", difficulty);
                return Results.BadRequest(
                    $"Invalid difficulty: {difficulty}. Valid values are: {string.Join(", ", Enum.GetNames<QuizDifficulty>())}"
                );
            }

            try
            {
                var session = await generator.GenerateQuizAsync(diffEnum, count, deckId);
                logger.LogInformation(
                    "Quiz generated successfully: {SessionId} with {CardCount} cards",
                    session.Id,
                    session.CardIds.Count
                );
                return Results.Ok(session);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to generate quiz session");
                return Results.Problem(detail: ex.Message, statusCode: 500);
            }
        }
    )
    .WithName("GenerateQuiz")
    .WithOpenApi();

// PUT /api/v1/flashcards/{id}/review
api.MapPut(
        "/{id:guid}/review",
        async (Guid id, [FromBody] ReviewRequest request, IFlashcardService flashcardService, ILogger<Program> logger) =>
        {
            logger.LogInformation(
                "Updating flashcard review: CardId={CardId}, Rating={Rating}",
                id,
                request.Rating
            );

            try
            {
                if (!Enum.TryParse<ReviewRating>(request.Rating, true, out var rating))
                {
                    return Results.BadRequest($"Invalid rating: {request.Rating}. Valid values are: Again, Hard, Good, Easy");
                }

                var updatedCard = await flashcardService.UpdateCardReviewAsync(id, rating);
                return Results.Ok(updatedCard);
            }
            catch (ArgumentException ex)
            {
                return Results.NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to update flashcard review");
                return Results.Problem(detail: ex.Message, statusCode: 500);
            }
        }
    )
    .WithName("UpdateFlashcardReview")
    .WithOpenApi();

// POST /api/v1/flashcards/quiz-results
api.MapPost(
        "/quiz-results",
        async ([FromBody] QuizResultRequest request, IQuizResultRepository repo, ILogger<Program> logger) =>
        {
            logger.LogInformation(
                "Recording quiz result: UserId={UserId}, DeckId={DeckId}, FlashcardId={FlashcardId}, IsCorrect={IsCorrect}",
                request.UserId,
                request.DeckId,
                request.FlashcardId,
                request.IsCorrect
            );

            try
            {
                var result = QuizResult.Create(
                    request.UserId,
                    request.DeckId,
                    request.FlashcardId,
                    request.IsCorrect,
                    request.Difficulty,
                    request.RawAnswer
                );
                await repo.AddAsync(result);
                return Results.Accepted();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to record quiz result");
                return Results.Problem(detail: ex.Message, statusCode: 500);
            }
        }
    )
    .WithName("RecordQuizResult")
    .WithOpenApi();

// GET /api/v1/flashcards/deck/{deckId}
api.MapGet(
        "/deck/{deckId:guid}",
        async (Guid deckId, IFlashcardRepository repo) =>
        {
            var cards = await repo.GetByDeckIdAsync(deckId);
            return Results.Ok(cards);
        }
    )
    .WithName("GetFlashcardsByDeck")
    .WithOpenApi();

// POST /api/v1/flashcards/bulk - Create multiple flashcards
api.MapPost(
        "/bulk",
        async (BulkCreateFlashcardsRequest request, IFlashcardBulkService bulkService, ILogger<Program> logger) =>
        {
            logger.LogInformation("Bulk creating {Count} flashcards", request.Flashcards.Count);
            
            var createdCount = await bulkService.CreateBulkAsync(request.Flashcards);
            logger.LogInformation("Successfully created {CreatedCount} out of {TotalCount} flashcards", createdCount, request.Flashcards.Count);
            
            return Results.Ok(new { TotalRequested = request.Flashcards.Count, Created = createdCount });
        }
    )
    .WithName("CreateBulkFlashcards")
    .WithOpenApi();

// POST /api/v1/flashcards/import-anki - Import Anki deck
api.MapPost(
        "/import-anki",
        async (AnkiImportRequest request, IAnkiImporter importer, ILogger<Program> logger) =>
        {
            logger.LogInformation("Importing Anki deck: {FileName}", request.FileName);
            
            var result = await importer.ImportFromApkgAsync(request.Base64Content);
            
            if (result.Errors.Any())
            {
                logger.LogWarning("Import completed with {ErrorCount} errors", result.Errors.Count);
            }
            
            return Results.Ok(result);
        }
    )
    .WithName("ImportAnkiDeck")
    .WithOpenApi();

// GET /api/v1/health - Simple database connectivity check
api.MapGet(
        "/health",
        async (IFlashcardRepository repo, ILogger<Program> logger) =>
        {
            try
            {
                var cards = await repo.GetAllAsync();
                var count = cards.Count();
                logger.LogInformation(
                    "Health check: Database connected, found {Count} cards",
                    count
                );
                return Results.Ok(new { status = "Healthy", cardCount = count });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Health check failed: Database connection error");
                return Results.Problem(
                    detail: $"Database connection failed: {ex.Message}",
                    statusCode: 503
                );
            }
        }
    )
    .WithName("HealthCheck")
    .WithOpenApi();

var adminApi = app.MapGroup("/api/v1/admin");

adminApi.MapPost("/import-directory", async (DirectoryImportService importService, ILogger<Program> logger, HttpRequest request) =>
{
    var body = await request.ReadFromJsonAsync<Dictionary<string, string>>();
    if (body == null || !body.TryGetValue("directoryPath", out var directoryPath) || string.IsNullOrEmpty(directoryPath))
    {
        return Results.BadRequest("directoryPath is required");
    }

    if (!Directory.Exists(directoryPath))
    {
        return Results.BadRequest($"Directory not found: {directoryPath}");
    }

    logger.LogInformation("Starting bulk import from: {Path}", directoryPath);
    var count = await importService.ImportDecksFromDirectoryAsync(directoryPath);
    return Results.Ok(new { ImportedDecks = count, Source = directoryPath });
})
.WithName("ImportDirectory")
.WithOpenApi();

adminApi.MapPost("/import-all", async (DirectoryImportService importService, ILogger<Program> logger) =>
{
    var decksPath = Path.Combine(Directory.GetCurrentDirectory(), "../../../Decks"); // Navigate up to repo root
    // Or better, use an absolute path or config. But 'Decks' is in the repo root.
    // App runs in Retention/src/Retention.App/bin/Debug/net10.0 or similar.
    // Let's try to find the 'Decks' folder relative to the project.
    
    // Assuming repo root is d:\repos\ankiquiz
    // And app is in d:\repos\ankiquiz\Retention\src\Retention.App
    // So ../../../Decks should be correct if running from project dir.
    // If running from bin, it might be different.
    
    // Safer approach: Expect path in body or config, or try common locations.
    var potentialPath = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "../../../Decks"));
    if (!Directory.Exists(potentialPath))
    {
        // Try up one more level just in case
        potentialPath = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "../../../../Decks"));
    }
    
    if (!Directory.Exists(potentialPath))
    {
        return Results.BadRequest($"Could not locate Decks folder. Tried: {potentialPath}");
    }

    logger.LogInformation("Starting bulk import from: {Path}", potentialPath);
    var count = await importService.ImportDecksFromDirectoryAsync(potentialPath);
    return Results.Ok(new { ImportedDecks = count, Source = potentialPath });
})
.WithName("ImportAllDecks")
.WithOpenApi();

adminApi.MapPost("/backfill-spelling-audio", async (IDeckImportService deckImportService, ILogger<Program> logger) =>
{
    logger.LogInformation("Starting spelling audio backfill");
    var result = await deckImportService.BackfillSpellingAudioAsync();
    return Results.Ok(result);
})
.WithName("BackfillSpellingAudio")
.WithOpenApi();

app.Run();

// --- Contracts (DTOs) ---
// These define the input payload for our API
public record CreateFlashcardRequest(string Question, string Answer, Guid? DeckId = null);

public record UpdateFlashcardRequest(string Question, string Answer);

public record BulkCreateFlashcardsRequest(List<CreateFlashcardRequest> Flashcards);

public record AnkiImportRequest(string FileName, string Base64Content);

public record ImportResult(int TotalCards, int ImportedCards, List<string> Errors, string DeckName);

public record QuizResultRequest(
    string UserId,
    Guid DeckId,
    Guid FlashcardId,
    bool IsCorrect,
    string Difficulty,
    string? RawAnswer
);

public record ReviewRequest(string Rating);
