#nullable enable
using System.Text.Json.Serialization;

namespace LifeOS.Infrastructure.Academy;

/// <summary>
/// ArangoDB document for Flashcard entity.
/// Stored in 'academy_flashcards' vertex collection.
/// </summary>
public class FlashcardDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("deckId")]
    public string DeckId { get; set; } = string.Empty;

    [JsonPropertyName("question")]
    public string Question { get; set; } = string.Empty;

    [JsonPropertyName("answer")]
    public string Answer { get; set; } = string.Empty;

    [JsonPropertyName("questionType")]
    public string QuestionType { get; set; } = "simple";

    [JsonPropertyName("difficulty")]
    public string Difficulty { get; set; } = "intermediate";

    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = new();

    [JsonPropertyName("options")]
    public List<string>? Options { get; set; }

    [JsonPropertyName("scenario")]
    public string? Scenario { get; set; }

    [JsonPropertyName("mediaAssetIds")]
    public List<string> MediaAssetIds { get; set; } = new();

    [JsonPropertyName("estimatedTimeSeconds")]
    public int? EstimatedTimeSeconds { get; set; }

    [JsonPropertyName("nextReviewDate")]
    public DateTime NextReviewDate { get; set; }

    [JsonPropertyName("intervalDays")]
    public int IntervalDays { get; set; }

    [JsonPropertyName("repetitions")]
    public int Repetitions { get; set; }

    [JsonPropertyName("easeFactor")]
    public double EaseFactor { get; set; } = 2.5;

    [JsonPropertyName("lastReviewDate")]
    public DateTime? LastReviewDate { get; set; }

    [JsonPropertyName("glossaryTermIds")]
    public List<string> GlossaryTermIds { get; set; } = new();

    [JsonPropertyName("crossReferenceIds")]
    public List<string> CrossReferenceIds { get; set; } = new();

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// ArangoDB document for Deck entity.
/// Stored in 'academy_decks' vertex collection.
/// </summary>
public class DeckDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("subcategory")]
    public string Subcategory { get; set; } = string.Empty;

    [JsonPropertyName("difficultyLevel")]
    public string DifficultyLevel { get; set; } = "intermediate";

    [JsonPropertyName("skillMappings")]
    public List<SkillMappingDocument> SkillMappings { get; set; } = new();

    [JsonPropertyName("shareToken")]
    public string? ShareToken { get; set; }

    [JsonPropertyName("flashcardCount")]
    public int FlashcardCount { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Embedded document for skill mapping within a deck.
/// </summary>
public class SkillMappingDocument
{
    [JsonPropertyName("skillId")]
    public string SkillId { get; set; } = string.Empty;

    [JsonPropertyName("mappingType")]
    public string MappingType { get; set; } = "primary";

    [JsonPropertyName("relevanceWeight")]
    public double RelevanceWeight { get; set; } = 1.0;

    [JsonPropertyName("prerequisiteLevel")]
    public int? PrerequisiteLevel { get; set; }
}

/// <summary>
/// ArangoDB document for QuizResult entity.
/// Stored in 'academy_quiz_results' vertex collection.
/// </summary>
public class QuizResultDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("userId")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("deckId")]
    public string DeckId { get; set; } = string.Empty;

    [JsonPropertyName("flashcardId")]
    public string FlashcardId { get; set; } = string.Empty;

    [JsonPropertyName("skillId")]
    public string? SkillId { get; set; }

    [JsonPropertyName("isCorrect")]
    public bool IsCorrect { get; set; }

    [JsonPropertyName("assessmentRating")]
    public string AssessmentRating { get; set; } = "good";

    [JsonPropertyName("difficulty")]
    public string Difficulty { get; set; } = "intermediate";

    [JsonPropertyName("timeToAnswerMs")]
    public long TimeToAnswerMs { get; set; }

    [JsonPropertyName("rawAnswer")]
    public string? RawAnswer { get; set; }

    [JsonPropertyName("answeredAt")]
    public DateTime AnsweredAt { get; set; }

    [JsonPropertyName("sessionType")]
    public string SessionType { get; set; } = "review";

    [JsonPropertyName("deviceType")]
    public string? DeviceType { get; set; }

    [JsonPropertyName("location")]
    public string? Location { get; set; }
}

/// <summary>
/// ArangoDB document for QuizSession entity.
/// Stored in 'academy_quiz_sessions' vertex collection.
/// </summary>
public class QuizSessionDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("userId")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("deckIds")]
    public List<string> DeckIds { get; set; } = new();

    [JsonPropertyName("skillIds")]
    public List<string> SkillIds { get; set; } = new();

    [JsonPropertyName("difficulty")]
    public string? Difficulty { get; set; }

    [JsonPropertyName("sessionType")]
    public string SessionType { get; set; } = "review";

    [JsonPropertyName("flashcardIds")]
    public List<string> FlashcardIds { get; set; } = new();

    [JsonPropertyName("currentIndex")]
    public int CurrentIndex { get; set; }

    [JsonPropertyName("resultIds")]
    public List<string> ResultIds { get; set; } = new();

    [JsonPropertyName("generatedAt")]
    public DateTime GeneratedAt { get; set; }

    [JsonPropertyName("expiresAt")]
    public DateTime? ExpiresAt { get; set; }

    [JsonPropertyName("completedAt")]
    public DateTime? CompletedAt { get; set; }
}

/// <summary>
/// ArangoDB document for GlossaryTerm entity.
/// Stored in 'academy_glossary_terms' vertex collection.
/// </summary>
public class GlossaryTermDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("term")]
    public string Term { get; set; } = string.Empty;

    [JsonPropertyName("pronunciation")]
    public string? Pronunciation { get; set; }

    [JsonPropertyName("definition")]
    public string Definition { get; set; } = string.Empty;

    [JsonPropertyName("etymology")]
    public string? Etymology { get; set; }

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("audioAssetId")]
    public string? AudioAssetId { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// ArangoDB edge document for CrossReference relationships.
/// Stored in 'academy_cross_references' edge collection.
/// </summary>
public class CrossReferenceDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_from")]
    public string From { get; set; } = string.Empty;

    [JsonPropertyName("_to")]
    public string To { get; set; } = string.Empty;

    [JsonPropertyName("sourceType")]
    public string SourceType { get; set; } = "flashcard";

    [JsonPropertyName("targetType")]
    public string TargetType { get; set; } = "flashcard";

    [JsonPropertyName("referenceType")]
    public string ReferenceType { get; set; } = "related";

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("strength")]
    public double Strength { get; set; } = 1.0;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// ArangoDB edge document for Deck-Flashcard containment.
/// Stored in 'academy_deck_flashcards' edge collection.
/// </summary>
public class DeckFlashcardEdgeDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_from")]
    public string From { get; set; } = string.Empty;

    [JsonPropertyName("_to")]
    public string To { get; set; } = string.Empty;

    [JsonPropertyName("addedAt")]
    public DateTime AddedAt { get; set; }
}

/// <summary>
/// ArangoDB edge document for Skill-Deck mapping.
/// Stored in 'academy_skill_decks' edge collection.
/// </summary>
public class SkillDeckEdgeDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_from")]
    public string From { get; set; } = string.Empty;

    [JsonPropertyName("_to")]
    public string To { get; set; } = string.Empty;

    [JsonPropertyName("mappingType")]
    public string MappingType { get; set; } = "primary";

    [JsonPropertyName("relevanceWeight")]
    public double RelevanceWeight { get; set; } = 1.0;

    [JsonPropertyName("prerequisiteLevel")]
    public int? PrerequisiteLevel { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// ArangoDB edge document for Flashcard-GlossaryTerm links.
/// Stored in 'academy_flashcard_glossary' edge collection.
/// </summary>
public class FlashcardGlossaryEdgeDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_from")]
    public string From { get; set; } = string.Empty;

    [JsonPropertyName("_to")]
    public string To { get; set; } = string.Empty;

    [JsonPropertyName("relevanceScore")]
    public double RelevanceScore { get; set; } = 1.0;

    [JsonPropertyName("context")]
    public string? Context { get; set; }

    [JsonPropertyName("addedAt")]
    public DateTime AddedAt { get; set; }
}

/// <summary>
/// ArangoDB edge document for Skill-QuizResult assessment tracking.
/// Stored in 'academy_skill_assessments' edge collection.
/// </summary>
public class SkillAssessmentEdgeDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_from")]
    public string From { get; set; } = string.Empty;

    [JsonPropertyName("_to")]
    public string To { get; set; } = string.Empty;

    [JsonPropertyName("assessmentType")]
    public string AssessmentType { get; set; } = "quiz";

    [JsonPropertyName("performanceScore")]
    public double PerformanceScore { get; set; }

    [JsonPropertyName("assessedAt")]
    public DateTime AssessedAt { get; set; }
}
