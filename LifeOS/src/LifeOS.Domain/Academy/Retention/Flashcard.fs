namespace LifeOS.Domain.Academy.Retention

open LifeOS.Domain.Common
open System

// Flashcard Aggregate - Core learning content unit
type Flashcard = {
    Id: FlashcardId
    DeckId: DeckId
    Question: string
    Answer: string
    Metadata: QuestionMetadata
    Scheduling: SchedulingData
    GlossaryTermIds: GlossaryTermId list
    CrossReferenceIds: CrossReferenceId list
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    member this.IsDue =
        SchedulingData.isDue this.Scheduling
    
    member this.UpdateContent question answer =
        if String.IsNullOrWhiteSpace(question) then
            Error (ValidationError "Question cannot be empty")
        elif String.IsNullOrWhiteSpace(answer) then
            Error (ValidationError "Answer cannot be empty")
        else
            Ok
                { this with
                    Question = question
                    Answer = answer
                    UpdatedAt = DateTime.UtcNow
                }
    
    member this.UpdateScheduling newScheduling =
        Ok
            { this with
                Scheduling = newScheduling
                UpdatedAt = DateTime.UtcNow
            }
    
    member this.AddGlossaryTerm termId =
        if this.GlossaryTermIds |> List.contains termId then
            Error (BusinessRuleViolation "Glossary term already linked")
        else
            Ok
                { this with
                    GlossaryTermIds = termId :: this.GlossaryTermIds
                    UpdatedAt = DateTime.UtcNow
                }
    
    member this.RemoveGlossaryTerm termId =
        if not (this.GlossaryTermIds |> List.contains termId) then
            Error (ValidationError "Glossary term not linked")
        else
            Ok
                { this with
                    GlossaryTermIds =
                        this.GlossaryTermIds |> List.filter ((<>) termId)
                    UpdatedAt = DateTime.UtcNow
                }
    
    member this.AddCrossReference refId =
        if this.CrossReferenceIds |> List.contains refId then
            Error (BusinessRuleViolation "Cross-reference already exists")
        else
            Ok
                { this with
                    CrossReferenceIds = refId :: this.CrossReferenceIds
                    UpdatedAt = DateTime.UtcNow
                }

// Flashcard factory module
module Flashcard =
    let create deckId question answer metadata =
        if String.IsNullOrWhiteSpace(question) then
            Error (ValidationError "Question is required")
        elif String.IsNullOrWhiteSpace(answer) then
            Error (ValidationError "Answer is required")
        else
            Ok
                {
                    Id = RetentionId.createFlashcardId()
                    DeckId = deckId
                    Question = question
                    Answer = answer
                    Metadata = metadata |> Option.defaultValue (QuestionMetadata.simple())
                    Scheduling = SchedulingData.create()
                    GlossaryTermIds = []
                    CrossReferenceIds = []
                    CreatedAt = DateTime.UtcNow
                    UpdatedAt = DateTime.UtcNow
                }
    
    let createSimple deckId question answer =
        create deckId question answer None
    
    let createWithId id deckId question answer metadata scheduling glossaryTermIds crossRefIds createdAt updatedAt =
        {
            Id = id
            DeckId = deckId
            Question = question
            Answer = answer
            Metadata = metadata
            Scheduling = scheduling
            GlossaryTermIds = glossaryTermIds
            CrossReferenceIds = crossRefIds
            CreatedAt = createdAt
            UpdatedAt = updatedAt
        }


// Deck Aggregate - Collection of flashcards for a topic
type Deck = {
    Id: DeckId
    Name: string
    Description: string
    Category: string
    Subcategory: string
    DifficultyLevel: DifficultyLevel
    SkillMappings: SkillMapping list
    ShareToken: string option
    FlashcardCount: int
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    member this.IsShared =
        this.ShareToken.IsSome
    
    member this.Update name description category subcategory difficulty =
        if String.IsNullOrWhiteSpace(name) then
            Error (ValidationError "Deck name cannot be empty")
        else
            Ok
                { this with
                    Name = name
                    Description = description
                    Category = category
                    Subcategory = subcategory
                    DifficultyLevel = difficulty
                    UpdatedAt = DateTime.UtcNow
                }
    
    member this.GenerateShareToken () =
        let token = 
            Guid.CreateVersion7().ToByteArray()
            |> Convert.ToBase64String
            |> fun s -> s.Replace("/", "_").Replace("+", "-").TrimEnd('=')
            |> fun s -> s.Substring(0, min 12 s.Length)
        Ok
            { this with
                ShareToken = Some token
                UpdatedAt = DateTime.UtcNow
            }
    
    member this.RevokeShareToken () =
        Ok
            { this with
                ShareToken = None
                UpdatedAt = DateTime.UtcNow
            }
    
    member this.AddSkillMapping mapping =
        if this.SkillMappings |> List.exists (fun m -> m.SkillId = mapping.SkillId) then
            Error (BusinessRuleViolation "Skill mapping already exists")
        else
            Ok
                { this with
                    SkillMappings = mapping :: this.SkillMappings
                    UpdatedAt = DateTime.UtcNow
                }
    
    member this.RemoveSkillMapping skillId =
        Ok
            { this with
                SkillMappings =
                    this.SkillMappings |> List.filter (fun m -> m.SkillId <> skillId)
                UpdatedAt = DateTime.UtcNow
            }
    
    member this.IncrementFlashcardCount () =
        { this with
            FlashcardCount = this.FlashcardCount + 1
            UpdatedAt = DateTime.UtcNow
        }
    
    member this.DecrementFlashcardCount () =
        { this with
            FlashcardCount = max 0 (this.FlashcardCount - 1)
            UpdatedAt = DateTime.UtcNow
        }

// Deck factory module
module Deck =
    let create name description category subcategory difficulty =
        if String.IsNullOrWhiteSpace(name) then
            Error (ValidationError "Deck name is required")
        else
            Ok
                {
                    Id = RetentionId.createDeckId()
                    Name = name
                    Description = description |> Option.defaultValue ""
                    Category = category |> Option.defaultValue ""
                    Subcategory = subcategory |> Option.defaultValue ""
                    DifficultyLevel = difficulty |> Option.defaultValue Intermediate
                    SkillMappings = []
                    ShareToken = None
                    FlashcardCount = 0
                    CreatedAt = DateTime.UtcNow
                    UpdatedAt = DateTime.UtcNow
                }
    
    let createWithId id name description category subcategory difficulty skillMappings shareToken flashcardCount createdAt updatedAt =
        {
            Id = id
            Name = name
            Description = description
            Category = category
            Subcategory = subcategory
            DifficultyLevel = difficulty
            SkillMappings = skillMappings
            ShareToken = shareToken
            FlashcardCount = flashcardCount
            CreatedAt = createdAt
            UpdatedAt = updatedAt
        }


// GlossaryTerm Entity - Enrichment content
type GlossaryTerm = {
    Id: GlossaryTermId
    Term: string
    Pronunciation: string option
    Definition: string
    Etymology: string option
    Category: string
    AudioAssetId: MediaAssetId option
    CreatedAt: DateTime
}

module GlossaryTerm =
    let create term definition category pronunciation etymology =
        if String.IsNullOrWhiteSpace(term) then
            Error (ValidationError "Term is required")
        elif String.IsNullOrWhiteSpace(definition) then
            Error (ValidationError "Definition is required")
        else
            Ok {
                Id = RetentionId.createGlossaryTermId()
                Term = term
                Pronunciation = pronunciation
                Definition = definition
                Etymology = etymology
                Category = category |> Option.defaultValue ""
                AudioAssetId = None
                CreatedAt = DateTime.UtcNow
            }
    
    let createWithId id term pronunciation definition etymology category audioAssetId createdAt =
        {
            Id = id
            Term = term
            Pronunciation = pronunciation
            Definition = definition
            Etymology = etymology
            Category = category
            AudioAssetId = audioAssetId
            CreatedAt = createdAt
        }


// QuizResult Entity - Performance tracking
type QuizResult = {
    Id: QuizResultId
    UserId: UserId
    DeckId: DeckId
    FlashcardId: FlashcardId
    SkillId: SkillId option
    IsCorrect: bool
    AssessmentRating: AssessmentRating
    Difficulty: DifficultyLevel
    TimeToAnswer: TimeSpan
    RawAnswer: string option
    AnsweredAt: DateTime
    Context: QuizContext
}

module QuizResult =
    let create userId deckId flashcardId isCorrect rating difficulty timeToAnswer rawAnswer context skillId =
        Ok {
            Id = RetentionId.createQuizResultId()
            UserId = userId
            DeckId = deckId
            FlashcardId = flashcardId
            SkillId = skillId
            IsCorrect = isCorrect
            AssessmentRating = rating
            Difficulty = difficulty
            TimeToAnswer = timeToAnswer
            RawAnswer = rawAnswer
            AnsweredAt = DateTime.UtcNow
            Context = context
        }
    
    let createWithId id userId deckId flashcardId skillId isCorrect rating difficulty timeToAnswer rawAnswer answeredAt context =
        {
            Id = id
            UserId = userId
            DeckId = deckId
            FlashcardId = flashcardId
            SkillId = skillId
            IsCorrect = isCorrect
            AssessmentRating = rating
            Difficulty = difficulty
            TimeToAnswer = timeToAnswer
            RawAnswer = rawAnswer
            AnsweredAt = answeredAt
            Context = context
        }


// QuizSession Entity - Active quiz state
type QuizSession = {
    Id: QuizSessionId
    UserId: UserId
    DeckIds: DeckId list
    SkillIds: SkillId list
    Difficulty: DifficultyLevel option
    SessionType: SessionType
    FlashcardIds: FlashcardId list
    CurrentIndex: int
    Results: QuizResultId list
    GeneratedAt: DateTime
    ExpiresAt: DateTime option
    CompletedAt: DateTime option
}

module QuizSession =
    let create userId deckIds skillIds difficulty sessionType flashcardIds expiresAt =
        Ok {
            Id = RetentionId.createQuizSessionId()
            UserId = userId
            DeckIds = deckIds
            SkillIds = skillIds
            Difficulty = difficulty
            SessionType = sessionType
            FlashcardIds = flashcardIds
            CurrentIndex = 0
            Results = []
            GeneratedAt = DateTime.UtcNow
            ExpiresAt = expiresAt
            CompletedAt = None
        }
    
    let advance session resultId =
        let newIndex = session.CurrentIndex + 1
        let isComplete = newIndex >= List.length session.FlashcardIds
        { session with
            CurrentIndex = newIndex
            Results = resultId :: session.Results
            CompletedAt = if isComplete then Some DateTime.UtcNow else None
        }
    
    let isComplete session =
        session.CompletedAt.IsSome || session.CurrentIndex >= List.length session.FlashcardIds
    
    let currentFlashcardId session =
        if session.CurrentIndex < List.length session.FlashcardIds then
            Some (List.item session.CurrentIndex session.FlashcardIds)
        else
            None
    
    let progress session =
        if List.isEmpty session.FlashcardIds then 0.0
        else float session.CurrentIndex / float (List.length session.FlashcardIds) * 100.0
