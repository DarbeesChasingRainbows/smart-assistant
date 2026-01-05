namespace LifeOS.Domain.Academy.Retention

open LifeOS.Domain.Common
open System

// Interop module for C# consumption
// Provides static methods that are easier to call from C#
[<AbstractClass; Sealed>]
type RetentionInterop private () =
    
    // ID Creation
    static member CreateFlashcardId() = RetentionId.createFlashcardId()
    static member CreateDeckId() = RetentionId.createDeckId()
    static member CreateQuizResultId() = RetentionId.createQuizResultId()
    static member CreateGlossaryTermId() = RetentionId.createGlossaryTermId()
    static member CreateCrossReferenceId() = RetentionId.createCrossReferenceId()
    static member CreateQuizSessionId() = RetentionId.createQuizSessionId()
    
    // ID Extraction
    static member GetFlashcardIdValue(id: FlashcardId) = RetentionId.flashcardIdValue id
    static member GetDeckIdValue(id: DeckId) = RetentionId.deckIdValue id
    static member GetQuizResultIdValue(id: QuizResultId) = RetentionId.quizResultIdValue id
    static member GetGlossaryTermIdValue(id: GlossaryTermId) = RetentionId.glossaryTermIdValue id
    static member GetCrossReferenceIdValue(id: CrossReferenceId) = RetentionId.crossReferenceIdValue id
    static member GetQuizSessionIdValue(id: QuizSessionId) = RetentionId.quizSessionIdValue id
    static member GetMediaAssetIdValue(id: MediaAssetId) = RetentionId.mediaAssetIdValue id
    static member GetSkillIdValue(id: LifeOS.Domain.Academy.SkillId) =
        let (LifeOS.Domain.Academy.SkillId g) = id
        g
    
    // ID From Guid
    static member FlashcardIdFrom(guid: Guid) = RetentionId.flashcardIdFrom guid
    static member DeckIdFrom(guid: Guid) = RetentionId.deckIdFrom guid
    static member QuizResultIdFrom(guid: Guid) = RetentionId.quizResultIdFrom guid
    static member GlossaryTermIdFrom(guid: Guid) = RetentionId.glossaryTermIdFrom guid
    static member CrossReferenceIdFrom(guid: Guid) = RetentionId.crossReferenceIdFrom guid
    static member QuizSessionIdFrom(guid: Guid) = RetentionId.quizSessionIdFrom guid
    static member MediaAssetIdFrom(guid: Guid) = RetentionId.mediaAssetIdFrom guid
    static member SkillIdFrom(guid: Guid) = LifeOS.Domain.Academy.SkillId guid
    
    // Flashcard Creation
    static member CreateFlashcard(deckId: DeckId, question: string, answer: string) =
        Flashcard.createSimple deckId question answer
    
    static member CreateFlashcardWithMetadata(deckId: DeckId, question: string, answer: string, metadata: QuestionMetadata) =
        Flashcard.create deckId question answer (Some metadata)
    
    static member CreateFlashcardFromValues(
        id: Guid, deckId: Guid, question: string, answer: string,
        questionType: string, difficulty: string, tags: string[],
        nextReviewDate: DateTime, intervalDays: int, repetitions: int, easeFactor: float,
        createdAt: DateTime, updatedAt: DateTime) =
        
        let qType = QuestionType.fromString questionType |> Result.defaultValue Simple
        let diff = DifficultyLevel.fromString difficulty |> Result.defaultValue Intermediate
        
        let metadata = {
            QuestionType = qType
            Options = None
            Scenario = None
            MediaAssets = []
            Difficulty = diff
            EstimatedTimeSeconds = None
            Tags = tags |> Array.toList
        }
        
        let scheduling = {
            NextReviewDate = nextReviewDate
            IntervalDays = intervalDays
            Repetitions = repetitions
            EaseFactor = easeFactor
            LastReviewDate = None
            ReviewHistory = []
        }
        
        Flashcard.createWithId 
            (FlashcardId id) 
            (DeckId deckId) 
            question 
            answer 
            metadata 
            scheduling 
            [] 
            [] 
            createdAt 
            updatedAt
    
    // Deck Creation
    static member CreateDeck(name: string, description: string, category: string, subcategory: string, difficulty: string) =
        let diff = DifficultyLevel.fromString difficulty |> Result.toOption
        Deck.create name (Some description) (Some category) (Some subcategory) diff
    
    static member CreateDeckFromValues(
        id: Guid, name: string, description: string, category: string, subcategory: string,
        difficulty: string, shareToken: string, flashcardCount: int,
        createdAt: DateTime, updatedAt: DateTime) =
        
        let diff = DifficultyLevel.fromString difficulty |> Result.defaultValue Intermediate
        let token = if String.IsNullOrEmpty(shareToken) then None else Some shareToken
        
        Deck.createWithId 
            (DeckId id) 
            name 
            description 
            category 
            subcategory 
            diff 
            [] 
            token 
            flashcardCount 
            createdAt 
            updatedAt
    
    // GlossaryTerm Creation
    static member CreateGlossaryTerm(term: string, definition: string, category: string, pronunciation: string, etymology: string) =
        let pron = if String.IsNullOrEmpty(pronunciation) then None else Some pronunciation
        let etym = if String.IsNullOrEmpty(etymology) then None else Some etymology
        GlossaryTerm.create term definition (Some category) pron etym
    
    static member CreateGlossaryTermFromValues(
        id: Guid, term: string, pronunciation: string, definition: string,
        etymology: string, category: string, createdAt: DateTime) =
        
        let pron = if String.IsNullOrEmpty(pronunciation) then None else Some pronunciation
        let etym = if String.IsNullOrEmpty(etymology) then None else Some etymology
        
        GlossaryTerm.createWithId 
            (GlossaryTermId id) 
            term 
            pron 
            definition 
            etym 
            category 
            None 
            createdAt
    
    // QuizResult Creation
    static member CreateQuizResult(
        userId: Guid, deckId: Guid, flashcardId: Guid,
        isCorrect: bool, rating: string, difficulty: string,
        timeToAnswerMs: int, rawAnswer: string, sessionType: string, skillId: Nullable<Guid>) =
        
        let assessmentRating = AssessmentRating.fromString rating |> Result.defaultValue Good
        let diff = DifficultyLevel.fromString difficulty |> Result.defaultValue Intermediate
        let sessType = SessionType.fromString sessionType |> Result.defaultValue Review
        let timeSpan = TimeSpan.FromMilliseconds(float timeToAnswerMs)
        let answer = if String.IsNullOrEmpty(rawAnswer) then None else Some rawAnswer
        let context = QuizContext.create sessType
        let skill: LifeOS.Domain.Academy.SkillId option = 
            if skillId.HasValue then Some (LifeOS.Domain.Academy.SkillId skillId.Value) else None
        
        QuizResult.create 
            (UserId userId) 
            (DeckId deckId) 
            (FlashcardId flashcardId) 
            isCorrect 
            assessmentRating 
            diff 
            timeSpan 
            answer 
            context 
            skill
    
    // Scheduling Engine
    static member CalculateNextReview(scheduling: SchedulingData, rating: string) =
        let assessmentRating = AssessmentRating.fromString rating |> Result.defaultValue Good
        SchedulingEngine.calculateNextReview scheduling assessmentRating
    
    static member CalculateNextReviewWithTime(scheduling: SchedulingData, rating: string, timeToAnswerMs: int) =
        let assessmentRating = AssessmentRating.fromString rating |> Result.defaultValue Good
        let timeSpan = TimeSpan.FromMilliseconds(float timeToAnswerMs)
        SchedulingEngine.calculateNextReviewWithTime scheduling assessmentRating timeSpan
    
    static member GetDueFlashcards(flashcards: Flashcard[]) =
        flashcards |> Array.toList |> SchedulingEngine.getDueFlashcards |> List.toArray
    
    static member GetNewFlashcards(flashcards: Flashcard[]) =
        flashcards |> Array.toList |> SchedulingEngine.getNewFlashcards |> List.toArray
    
    static member GetLearningPriority(flashcard: Flashcard) =
        SchedulingEngine.getLearningPriority flashcard
    
    static member CreateDefaultSchedulingData() =
        SchedulingData.create()

    // Safe parsing helpers returning defaults for C# usage
    static member AssessmentRatingFromStringDefault(value: string) =
        AssessmentRating.fromString value |> Result.defaultValue Good

    static member DifficultyLevelFromStringDefault(value: string) =
        DifficultyLevel.fromString value |> Result.defaultValue Intermediate

    static member SessionTypeFromStringDefault(value: string) =
        SessionType.fromString value |> Result.defaultValue Review

    static member MappingTypeFromStringDefault(value: string) =
        MappingType.fromString value |> Result.defaultValue Primary

    static member QuestionTypeFromStringDefault(value: string) =
        QuestionType.fromString value |> Result.defaultValue Simple

    static member EntityTypeFromStringDefault(value: string) =
        EntityType.fromString value |> Result.defaultValue EntityType.FlashcardEntity

    static member ReferenceTypeFromStringDefault(value: string) =
        ReferenceType.fromString value |> Result.defaultValue ReferenceType.Related
    
    // Quiz Generator
    static member GenerateQuizSession(userId: Guid, deckIds: Guid[], count: int, sessionType: string, flashcards: Flashcard[]) =
        let sessType = SessionType.fromString sessionType |> Result.defaultValue Review
        let request = QuizGenerator.QuizGenerationRequest.create (UserId userId) (deckIds |> Array.map DeckId |> Array.toList) count sessType
        QuizGenerator.generateQuizSession request (flashcards |> Array.toList)
    
    static member GenerateQuizByDifficultyPreset(userId: Guid, deckIds: Guid[], preset: string, flashcards: Flashcard[]) =
        QuizGenerator.generateByDifficultyPreset 
            (UserId userId) 
            (deckIds |> Array.map DeckId |> Array.toList) 
            preset 
            (flashcards |> Array.toList)
    
    static member AdvanceQuizSession(session: QuizSession, resultId: QuizResultId) =
        QuizSession.advance session resultId
    
    static member IsQuizSessionComplete(session: QuizSession) =
        QuizSession.isComplete session
    
    static member GetCurrentFlashcardId(session: QuizSession) =
        QuizSession.currentFlashcardId session
    
    static member GetQuizSessionProgress(session: QuizSession) =
        QuizSession.progress session
    
    // Difficulty Level Conversion
    static member DifficultyLevelToString(level: DifficultyLevel) =
        DifficultyLevel.toString level
    
    static member DifficultyLevelFromString(value: string) =
        DifficultyLevel.fromString value
    
    // Question Type Conversion
    static member QuestionTypeToString(qType: QuestionType) =
        QuestionType.toString qType
    
    static member QuestionTypeFromString(value: string) =
        QuestionType.fromString value
    
    // Assessment Rating Conversion
    static member AssessmentRatingToString(rating: AssessmentRating) =
        AssessmentRating.toString rating
    
    static member AssessmentRatingFromString(value: string) =
        AssessmentRating.fromString value
    
    // Session Type Conversion
    static member SessionTypeToString(sessType: SessionType) =
        SessionType.toString sessType
    
    static member SessionTypeFromString(value: string) =
        SessionType.fromString value
    
    // Reference Type Conversion
    static member ReferenceTypeToString(refType: ReferenceType) =
        ReferenceType.toString refType
    
    static member ReferenceTypeFromString(value: string) =
        ReferenceType.fromString value
    
    // Entity Type Conversion
    static member EntityTypeToString(entType: EntityType) =
        EntityType.toString entType
    
    static member EntityTypeFromString(value: string) =
        EntityType.fromString value
    
    // Mapping Type Conversion
    static member MappingTypeToString(mapType: MappingType) =
        MappingType.toString mapType
    
    static member MappingTypeFromString(value: string) =
        MappingType.fromString value
    
    // Cross Reference Creation
    static member CreateCrossReference(
        sourceType: string, sourceId: Guid,
        targetType: string, targetId: Guid,
        referenceType: string, description: string, strength: float) =
        
        let srcType = EntityType.fromString sourceType |> Result.defaultValue FlashcardEntity
        let tgtType = EntityType.fromString targetType |> Result.defaultValue FlashcardEntity
        let refType = ReferenceType.fromString referenceType |> Result.defaultValue Related
        let desc = if String.IsNullOrEmpty(description) then None else Some description
        
        {
            Id = RetentionId.createCrossReferenceId()
            SourceType = srcType
            SourceId = sourceId
            TargetType = tgtType
            TargetId = targetId
            ReferenceType = refType
            Description = desc
            Strength = strength
            CreatedAt = DateTime.UtcNow
        }
    
    // Skill Mapping Creation
    static member CreateSkillMapping(skillId: Guid, mappingType: string, relevanceWeight: float, prerequisiteLevel: Nullable<int>) =
        let mapType = MappingType.fromString mappingType |> Result.defaultValue Primary
        let prereqLevel = if prerequisiteLevel.HasValue then Some prerequisiteLevel.Value else None
        
        {
            SkillId = LifeOS.Domain.Academy.SkillId skillId
            MappingType = mapType
            RelevanceWeight = relevanceWeight
            PrerequisiteLevel = prereqLevel
        }
    
    // Question Metadata Creation
    static member CreateSimpleMetadata() =
        QuestionMetadata.simple()
    
    static member CreateMultipleChoiceMetadata(options: string[]) =
        QuestionMetadata.multipleChoice (options |> Array.toList)
    
    static member CreateMetadata(questionType: string, difficulty: string, tags: string[], estimatedTimeSeconds: Nullable<int>) =
        let qType = QuestionType.fromString questionType |> Result.defaultValue Simple
        let diff = DifficultyLevel.fromString difficulty |> Result.defaultValue Intermediate
        let estTime = if estimatedTimeSeconds.HasValue then Some estimatedTimeSeconds.Value else None
        
        {
            QuestionType = qType
            Options = None
            Scenario = None
            MediaAssets = []
            Difficulty = diff
            EstimatedTimeSeconds = estTime
            Tags = tags |> Array.toList
        }
