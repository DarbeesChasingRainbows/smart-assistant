namespace LifeOS.Domain.Academy.Retention

open System.Threading.Tasks
open LifeOS.Domain.Common

// Repository Interfaces (Ports) for Retention Domain
// Following Hexagonal Architecture - these are the ports that adapters will implement

// IFlashcardRepository - Port for Flashcard persistence
type IFlashcardRepository =
    abstract member GetByIdAsync : FlashcardId -> Task<Flashcard option>
    abstract member GetByDeckIdAsync : DeckId -> Task<Flashcard list>
    abstract member GetDueFlashcardsAsync : UserId -> Task<Flashcard list>
    abstract member GetNewFlashcardsAsync : DeckId -> Task<Flashcard list>
    abstract member AddAsync : Flashcard -> Task<Flashcard>
    abstract member UpdateAsync : Flashcard -> Task<Flashcard>
    abstract member UpdateSchedulingAsync : FlashcardId -> SchedulingData -> Task<bool>
    abstract member DeleteAsync : FlashcardId -> Task<bool>
    abstract member SearchAsync : string -> Task<Flashcard list>
    abstract member GetByTagAsync : string -> Task<Flashcard list>
    abstract member GetCountByDeckAsync : DeckId -> Task<int>

// IDeckRepository - Port for Deck persistence
type IDeckRepository =
    abstract member GetByIdAsync : DeckId -> Task<Deck option>
    abstract member GetAllAsync : unit -> Task<Deck list>
    abstract member GetByCategoryAsync : string -> Task<Deck list>
    abstract member GetBySkillIdAsync : SkillId -> Task<Deck list>
    abstract member GetSharedDecksAsync : unit -> Task<Deck list>
    abstract member GetByShareTokenAsync : string -> Task<Deck option>
    abstract member AddAsync : Deck -> Task<Deck>
    abstract member UpdateAsync : Deck -> Task<Deck>
    abstract member DeleteAsync : DeckId -> Task<bool>
    abstract member SearchAsync : string -> Task<Deck list>

// IQuizResultRepository - Port for QuizResult persistence
type IQuizResultRepository =
    abstract member GetByIdAsync : QuizResultId -> Task<QuizResult option>
    abstract member GetByUserIdAsync : UserId -> Task<QuizResult list>
    abstract member GetByDeckIdAsync : DeckId -> Task<QuizResult list>
    abstract member GetByFlashcardIdAsync : FlashcardId -> Task<QuizResult list>
    abstract member GetBySkillIdAsync : SkillId -> Task<QuizResult list>
    abstract member GetBySessionIdAsync : QuizSessionId -> Task<QuizResult list>
    abstract member GetRecentByUserAsync : UserId -> int -> Task<QuizResult list>
    abstract member AddAsync : QuizResult -> Task<QuizResult>
    abstract member GetUserStatsAsync : UserId -> Task<{| TotalAnswered: int; CorrectAnswers: int; AverageTimeSeconds: float |}>

// IQuizSessionRepository - Port for QuizSession persistence
type IQuizSessionRepository =
    abstract member GetByIdAsync : QuizSessionId -> Task<QuizSession option>
    abstract member GetActiveByUserAsync : UserId -> Task<QuizSession list>
    abstract member GetCompletedByUserAsync : UserId -> int -> Task<QuizSession list>
    abstract member AddAsync : QuizSession -> Task<QuizSession>
    abstract member UpdateAsync : QuizSession -> Task<QuizSession>
    abstract member DeleteAsync : QuizSessionId -> Task<bool>

// IGlossaryTermRepository - Port for GlossaryTerm persistence
type IGlossaryTermRepository =
    abstract member GetByIdAsync : GlossaryTermId -> Task<GlossaryTerm option>
    abstract member GetByFlashcardIdAsync : FlashcardId -> Task<GlossaryTerm list>
    abstract member SearchByTermAsync : string -> Task<GlossaryTerm list>
    abstract member GetByCategoryAsync : string -> Task<GlossaryTerm list>
    abstract member AddAsync : GlossaryTerm -> Task<GlossaryTerm>
    abstract member UpdateAsync : GlossaryTerm -> Task<GlossaryTerm>
    abstract member DeleteAsync : GlossaryTermId -> Task<bool>

// ICrossReferenceRepository - Port for CrossReference persistence (Graph edges)
type ICrossReferenceRepository =
    abstract member GetByIdAsync : CrossReferenceId -> Task<CrossReference option>
    abstract member GetBySourceAsync : EntityType -> System.Guid -> Task<CrossReference list>
    abstract member GetByTargetAsync : EntityType -> System.Guid -> Task<CrossReference list>
    abstract member GetByTypeAsync : ReferenceType -> Task<CrossReference list>
    abstract member AddAsync : CrossReference -> Task<CrossReference>
    abstract member DeleteAsync : CrossReferenceId -> Task<bool>
    abstract member GetRelatedFlashcardsAsync : FlashcardId -> Task<Flashcard list>
    abstract member GetPrerequisiteChainAsync : FlashcardId -> Task<Flashcard list>

// IRetentionGraphRepository - Port for Graph-specific operations
type IRetentionGraphRepository =
    abstract member GetLearningPathAsync : SkillId -> Task<Flashcard list>
    abstract member GetRelatedContentAsync : FlashcardId -> Task<{| Flashcards: Flashcard list; GlossaryTerms: GlossaryTerm list; Decks: Deck list |}>
    abstract member GetRecommendedFlashcardsAsync : UserId -> int -> Task<Flashcard list>
    abstract member GetSkillCoverageAsync : SkillId -> Task<{| TotalFlashcards: int; MasteredFlashcards: int; CoveragePercentage: float |}>
    abstract member TraversePrerequisitesAsync : FlashcardId -> int -> Task<Flashcard list>
    abstract member FindShortestPathAsync : FlashcardId -> FlashcardId -> Task<Flashcard list option>
