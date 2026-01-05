namespace LifeOS.Domain.Academy.Retention

open LifeOS.Domain.Common
open System

// Re-export SkillId from Academy domain for use in Retention
type SkillId = LifeOS.Domain.Academy.SkillId

// Single-Case Discriminated Unions for Type Safety
type FlashcardId = FlashcardId of Guid
type DeckId = DeckId of Guid
type QuizResultId = QuizResultId of Guid
type GlossaryTermId = GlossaryTermId of Guid
type CrossReferenceId = CrossReferenceId of Guid
type QuizSessionId = QuizSessionId of Guid
type MediaAssetId = MediaAssetId of Guid

// Module for creating and extracting IDs
module RetentionId =
    let createFlashcardId () = FlashcardId (Guid.CreateVersion7())
    let createDeckId () = DeckId (Guid.CreateVersion7())
    let createQuizResultId () = QuizResultId (Guid.CreateVersion7())
    let createGlossaryTermId () = GlossaryTermId (Guid.CreateVersion7())
    let createCrossReferenceId () = CrossReferenceId (Guid.CreateVersion7())
    let createQuizSessionId () = QuizSessionId (Guid.CreateVersion7())
    let createMediaAssetId () = MediaAssetId (Guid.CreateVersion7())
    
    let flashcardIdValue (FlashcardId id) = id
    let deckIdValue (DeckId id) = id
    let quizResultIdValue (QuizResultId id) = id
    let glossaryTermIdValue (GlossaryTermId id) = id
    let crossReferenceIdValue (CrossReferenceId id) = id
    let quizSessionIdValue (QuizSessionId id) = id
    let mediaAssetIdValue (MediaAssetId id) = id
    
    let flashcardIdFrom (guid: Guid) = FlashcardId guid
    let deckIdFrom (guid: Guid) = DeckId guid
    let quizResultIdFrom (guid: Guid) = QuizResultId guid
    let glossaryTermIdFrom (guid: Guid) = GlossaryTermId guid
    let crossReferenceIdFrom (guid: Guid) = CrossReferenceId guid
    let quizSessionIdFrom (guid: Guid) = QuizSessionId guid
    let mediaAssetIdFrom (guid: Guid) = MediaAssetId guid

// Difficulty levels for content
type DifficultyLevel =
    | Beginner
    | Intermediate
    | Advanced
    | Expert

module DifficultyLevel =
    let toString = function
        | Beginner -> "beginner"
        | Intermediate -> "intermediate"
        | Advanced -> "advanced"
        | Expert -> "expert"
    
    let fromString = function
        | "beginner" -> Ok Beginner
        | "intermediate" -> Ok Intermediate
        | "advanced" -> Ok Advanced
        | "expert" -> Ok Expert
        | s -> Error (ValidationError $"Invalid difficulty level: {s}")

// Question types for flashcards
type QuestionType =
    | Simple
    | MultipleChoice
    | ScenarioBased
    | MultiPart
    | Audio
    | Image

module QuestionType =
    let toString = function
        | Simple -> "simple"
        | MultipleChoice -> "multiple_choice"
        | ScenarioBased -> "scenario_based"
        | MultiPart -> "multi_part"
        | Audio -> "audio"
        | Image -> "image"
    
    let fromString = function
        | "simple" -> Ok Simple
        | "multiple_choice" -> Ok MultipleChoice
        | "scenario_based" -> Ok ScenarioBased
        | "multi_part" -> Ok MultiPart
        | "audio" -> Ok Audio
        | "image" -> Ok Image
        | s -> Error (ValidationError $"Invalid question type: {s}")

// Cross-reference types (Obsidian-like linking)
type ReferenceType =
    | Related
    | Prerequisite
    | FollowsFrom
    | Contradicts
    | ExampleOf

module ReferenceType =
    let toString = function
        | Related -> "related"
        | Prerequisite -> "prerequisite"
        | FollowsFrom -> "follows_from"
        | Contradicts -> "contradicts"
        | ExampleOf -> "example_of"
    
    let fromString = function
        | "related" -> Ok Related
        | "prerequisite" -> Ok Prerequisite
        | "follows_from" -> Ok FollowsFrom
        | "contradicts" -> Ok Contradicts
        | "example_of" -> Ok ExampleOf
        | s -> Error (ValidationError $"Invalid reference type: {s}")

// Assessment ratings for spaced repetition (SM-2 algorithm)
type AssessmentRating =
    | Again  // Complete failure, reset interval
    | Hard   // Correct but difficult
    | Good   // Correct with moderate effort
    | Easy   // Correct with no effort

module AssessmentRating =
    let toString = function
        | Again -> "again"
        | Hard -> "hard"
        | Good -> "good"
        | Easy -> "easy"
    
    let fromString = function
        | "again" -> Ok Again
        | "hard" -> Ok Hard
        | "good" -> Ok Good
        | "easy" -> Ok Easy
        | s -> Error (ValidationError $"Invalid assessment rating: {s}")
    
    let toQuality = function
        | Again -> 0
        | Hard -> 3
        | Good -> 4
        | Easy -> 5

// Entity types for cross-references
type EntityType =
    | FlashcardEntity
    | DeckEntity
    | GlossaryTermEntity
    | SkillEntity

module EntityType =
    let toString = function
        | FlashcardEntity -> "flashcard"
        | DeckEntity -> "deck"
        | GlossaryTermEntity -> "glossary_term"
        | SkillEntity -> "skill"
    
    let fromString = function
        | "flashcard" -> Ok FlashcardEntity
        | "deck" -> Ok DeckEntity
        | "glossary_term" -> Ok GlossaryTermEntity
        | "skill" -> Ok SkillEntity
        | s -> Error (ValidationError $"Invalid entity type: {s}")

// Session types for quiz context
type SessionType =
    | Review
    | Practice
    | Evaluation
    | Certification

module SessionType =
    let toString = function
        | Review -> "review"
        | Practice -> "practice"
        | Evaluation -> "evaluation"
        | Certification -> "certification"
    
    let fromString = function
        | "review" -> Ok Review
        | "practice" -> Ok Practice
        | "evaluation" -> Ok Evaluation
        | "certification" -> Ok Certification
        | s -> Error (ValidationError $"Invalid session type: {s}")

// Skill mapping types for Academy integration
type MappingType =
    | Primary
    | Supplementary
    | Assessment
    | PracticeMapping

module MappingType =
    let toString = function
        | Primary -> "primary"
        | Supplementary -> "supplementary"
        | Assessment -> "assessment"
        | PracticeMapping -> "practice"
    
    let fromString = function
        | "primary" -> Ok Primary
        | "supplementary" -> Ok Supplementary
        | "assessment" -> Ok Assessment
        | "practice" -> Ok PracticeMapping
        | s -> Error (ValidationError $"Invalid mapping type: {s}")

// Review record for tracking history
type ReviewRecord = {
    Date: DateTime
    Rating: AssessmentRating
    PreviousInterval: int
    NewInterval: int
    PreviousEaseFactor: float
    NewEaseFactor: float
    TimeToAnswer: TimeSpan option
}

// Spaced Repetition Scheduling Data (SM-2 Algorithm)
type SchedulingData = {
    NextReviewDate: DateTime
    IntervalDays: int
    Repetitions: int
    EaseFactor: float
    LastReviewDate: DateTime option
    ReviewHistory: ReviewRecord list
}

module SchedulingData =
    let defaultEaseFactor = 2.5
    let minEaseFactor = 1.3
    
    let create () = {
        NextReviewDate = System.DateTime.UtcNow
        IntervalDays = 0
        Repetitions = 0
        EaseFactor = defaultEaseFactor
        LastReviewDate = None
        ReviewHistory = []
    }
    
    let isDue (data: SchedulingData) =
        data.NextReviewDate <= System.DateTime.UtcNow

// Question metadata for complex content
type QuestionMetadata = {
    QuestionType: QuestionType
    Options: string list option
    Scenario: string option
    MediaAssets: MediaAssetId list
    Difficulty: DifficultyLevel
    EstimatedTimeSeconds: int option
    Tags: string list
}

module QuestionMetadata =
    let simple () = {
        QuestionType = Simple
        Options = None
        Scenario = None
        MediaAssets = []
        Difficulty = Intermediate
        EstimatedTimeSeconds = None
        Tags = []
    }
    
    let multipleChoice options = {
        QuestionType = MultipleChoice
        Options = Some options
        Scenario = None
        MediaAssets = []
        Difficulty = Intermediate
        EstimatedTimeSeconds = None
        Tags = []
    }

// Skill mapping for Academy integration
type SkillMapping = {
    SkillId: SkillId
    MappingType: MappingType
    RelevanceWeight: float
    PrerequisiteLevel: int option
}

// Cross-reference between entities
type CrossReference = {
    Id: CrossReferenceId
    SourceType: EntityType
    SourceId: Guid
    TargetType: EntityType
    TargetId: Guid
    ReferenceType: ReferenceType
    Description: string option
    Strength: float
    CreatedAt: DateTime
}

// Quiz context for result tracking
type QuizContext = {
    SessionType: SessionType
    DeviceType: string option
    Location: string option
    PreviousResultIds: QuizResultId list
}

module QuizContext =
    let create sessionType = {
        SessionType = sessionType
        DeviceType = None
        Location = None
        PreviousResultIds = []
    }
