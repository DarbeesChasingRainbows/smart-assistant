# Retention Service Migration & Integration Plan
## Domain-Architect Perspective: F# Core + Graph-First Design

### 🎯 **Executive Summary**

As the **domain-architect**, my focus is on migrating the sophisticated AnkiQuiz Retention service into LifeOS using pure F# domain models with zero external dependencies, while leveraging ArangoDB's graph capabilities for enhanced relationship modeling. This migration preserves the advanced spaced repetition algorithms while integrating with our Academy domain's skill development framework.

### 🏗️ **Current State Analysis**

#### **Retention Service Domain Model (C#)**
```csharp
// Core Entities
Flashcard { Id, DeckId, Question, Answer, Metadata, Scheduling }
Deck { Id, Name, Description, Category, DifficultyLevel, ShareToken }
QuizResult { UserId, DeckId, FlashcardId, IsCorrect, Difficulty, AnsweredAt }
GlossaryTerm { Id, Term, Pronunciation, Definition, Etymology, Category }
CrossReference { SourceType, SourceId, TargetType, TargetId, ReferenceType }
SchedulingData { NextReviewDate, Interval, Repetitions, EaseFactor }
```

#### **Key Algorithms & Features**
- **SM-2 Spaced Repetition Algorithm** with customizable parameters
- **Quiz Generation Engine** with difficulty-based selection
- **Cross-Reference System** (Obsidian-like linking)
- **Glossary Integration** with pronunciation and etymology
- **Performance Tracking** with detailed analytics

### 🧠 **Target F# Domain Architecture**

#### **Pure F# Domain Types (Zero Dependencies)**
```fsharp
// Core Domain Types
module Academy.Retention.Domain =

// Single-Case Discriminated Unions for Type Safety
type FlashcardId = FlashcardId of Guid
type DeckId = DeckId of Guid
type QuizResultId = QuizResultId of Guid
type GlossaryTermId = GlossaryTermId of Guid
type UserId = UserId of string

// Value Objects
type DifficultyLevel = Beginner | Intermediate | Advanced | Expert
type QuestionType = Simple | MultipleChoice | ScenarioBased | MultiPart
type ReferenceType = Related | Prerequisite | FollowsFrom | Contradicts | ExampleOf
type AssessmentRating = Again | Hard | Good | Easy

// Core Entity: Flashcard
type Flashcard = {
    Id: FlashcardId
    DeckId: DeckId
    Question: string
    Answer: string
    QuestionType: QuestionType
    Metadata: QuestionMetadata
    Scheduling: SchedulingData
    GlossaryTerms: GlossaryTermId list
    CrossReferences: CrossReference list
    CreatedAt: DateTime
    UpdatedAt: DateTime
}

// Question Metadata for Complex Content
and QuestionMetadata = {
    QuestionType: QuestionType
    Options: string option // For multiple choice
    Scenario: string option // For scenario-based questions
    MediaAssets: MediaAssetId list
    Difficulty: DifficultyLevel
    EstimatedTime: TimeSpan option
}

// Spaced Repetition Scheduling (SM-2 Algorithm)
and SchedulingData = {
    NextReviewDate: DateTime
    IntervalDays: int
    Repetitions: int
    EaseFactor: float
    LastReviewDate: DateTime option
    ReviewHistory: ReviewRecord list
}

and ReviewRecord = {
    Date: DateTime
    Rating: AssessmentRating
    PreviousInterval: int
    NewInterval: int
    PreviousEaseFactor: float
    NewEaseFactor: float
}

// Core Entity: Deck (Skill Collection)
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
}

// Skill Integration Bridge
and SkillMapping = {
    SkillId: SkillId // From Academy domain
    MappingType: MappingType
    RelevanceWeight: float
    PrerequisiteLevel: int option
}

and MappingType = Primary | Supplementary | Assessment | Practice

// Core Entity: Quiz Result (Performance Tracking)
type QuizResult = {
    Id: QuizResultId
    UserId: UserId
    DeckId: DeckId
    FlashcardId: FlashcardId
    SkillId: SkillId option // Academy integration
    IsCorrect: bool
    AssessmentRating: AssessmentRating
    Difficulty: DifficultyLevel
    TimeToAnswer: TimeSpan
    RawAnswer: string option
    AnsweredAt: DateTime
    Context: QuizContext
}

and QuizContext = {
    SessionType: SessionType
    DeviceType: DeviceType option
    Location: string option
    PreviousResults: QuizResultId list
}

and SessionType = Review | Practice | Evaluation | Certification
and DeviceType = Desktop | Mobile | Tablet

// Core Entity: Glossary Term
type GlossaryTerm = {
    Id: GlossaryTermId
    Term: string
    Pronunciation: string option
    Definition: string
    Etymology: string option
    Category: string
    RelatedFlashcards: FlashcardId list
    AudioAsset: MediaAssetId option
    CreatedAt: DateTime
}

// Cross-Reference System (Graph Relationships)
type CrossReference = {
    Id: CrossReferenceId
    SourceType: EntityType
    SourceId: Guid
    TargetType: EntityType
    TargetId: Guid
    ReferenceType: ReferenceType
    Description: string option
    Strength: float // 0.0 to 1.0
    CreatedAt: DateTime
}

and EntityType = Flashcard | Deck | GlossaryTerm | Skill

// Quiz Generation Engine
type QuizGenerationRequest = {
    UserId: UserId
    DeckIds: DeckId list
    SkillIds: SkillId list option
    Difficulty: DifficultyLevel option
    Count: int
    SessionType: SessionType
    TimeLimit: TimeSpan option
}

type QuizSession = {
    Id: QuizSessionId
    UserId: UserId
    Request: QuizGenerationRequest
    FlashcardIds: FlashcardId list
    GeneratedAt: DateTime
    ExpiresAt: DateTime option
    CurrentIndex: int
    Results: QuizResult list
}

// Domain Events (Event Sourcing)
type DomainEvent =
    | FlashcardCreated of Flashcard
    | FlashcardUpdated of Flashcard * Flashcard
    | QuizResultRecorded of QuizResult
    | SkillProgressUpdated of SkillId * ProgressUpdate
    | DeckShared of DeckId * string
    | CrossReferenceCreated of CrossReference

and ProgressUpdate = {
    PreviousLevel: SkillLevel option
    NewLevel: SkillLevel
    PerformanceScore: float
    ConfidenceLevel: float
    NextRecommendation: LearningRecommendation
}

and LearningRecommendation = {
    RecommendedAction: Action
    TargetSkillId: SkillId option
    EstimatedTime: TimeSpan
    Resources: ResourceId list
}

and Action = Review | Practice | LearnNew | TakeBreak | Advance
```

### 🕸️ **ArangoDB Graph Schema Design**

#### **Vertex Collections (Nodes)**
```javascript
// academy_flashcards
{
  _key: "flashcard_123",
  id: "uuid-v7",
  deckId: "uuid-v7", 
  question: "What is photosynthesis?",
  answer: "The process by which plants convert light energy...",
  questionType: "simple",
  metadata: {
    difficulty: "intermediate",
    estimatedTime: "00:02:00",
    mediaAssets: []
  },
  scheduling: {
    nextReviewDate: "2024-01-15T10:00:00Z",
    intervalDays: 7,
    repetitions: 3,
    easeFactor: 2.6
  },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z"
}

// academy_decks  
{
  _key: "deck_456",
  id: "uuid-v7",
  name: "Biology Fundamentals",
  description: "Essential biology concepts",
  category: "Science",
  subcategory: "Biology", 
  difficultyLevel: "intermediate",
  shareToken: "abc123def456",
  flashcardCount: 150,
  createdAt: "2024-01-01T00:00:00Z"
}

// academy_quiz_results
{
  _key: "result_789",
  id: "uuid-v7",
  userId: "user_123",
  deckId: "deck_456",
  flashcardId: "flashcard_123",
  skillId: "skill_biology_101",
  isCorrect: true,
  assessmentRating: "good",
  timeToAnswer: 45000,
  answeredAt: "2024-01-10T14:30:00Z",
  context: {
    sessionType: "review",
    deviceType: "desktop"
  }
}

// academy_glossary_terms
{
  _key: "glossary_101",
  id: "uuid-v7",
  term: "Photosynthesis",
  pronunciation: "/ˌfoʊtoʊˈsɪnθəsɪs/",
  definition: "The process...",
  etymology: "From Greek photo (light) + synthesis (putting together)",
  category: "Biology",
  createdAt: "2024-01-01T00:00:00Z"
}
```

#### **Edge Collections (Relationships)**
```javascript
// academy_flashcard_references (Cross-References)
{
  _key: "ref_001",
  _from: "academy_flashcards/flashcard_123",
  _to: "academy_flashcards/flashcard_124", 
  referenceType: "prerequisite",
  description: "Understanding cellular respiration helps with photosynthesis",
  strength: 0.8,
  createdAt: "2024-01-01T00:00:00Z"
}

// academy_deck_flashcards (Containment)
{
  _key: "contain_001",
  _from: "academy_decks/deck_456",
  _to: "academy_flashcards/flashcard_123",
  addedAt: "2024-01-01T00:00:00Z"
}

// academy_skill_assessments (Skill Integration)
{
  _key: "skill_assess_001",
  _from: "academy_skills/skill_biology_101",
  _to: "academy_quiz_results/result_789",
  assessmentType: "quiz",
  performanceScore: 0.85,
  assessedAt: "2024-01-10T14:30:00Z"
}

// academy_flashcard_glossary (Content Enrichment)
{
  _key: "glossary_link_001", 
  _from: "academy_flashcards/flashcard_123",
  _to: "academy_glossary_terms/glossary_101",
  relevanceScore: 0.95,
  context: "direct_term_usage",
  addedAt: "2024-01-01T00:00:00Z"
}

// academy_skill_decks (Skill Mapping)
{
  _key: "skill_deck_001",
  _from: "academy_skills/skill_biology_101",
  _to: "academy_decks/deck_456",
  mappingType: "primary",
  relevanceWeight: 1.0,
  prerequisiteLevel: 1,
  createdAt: "2024-01-01T00:00:00Z"
}
```

### 🔄 **Domain Services (Pure F# Logic)**

#### **Spaced Repetition Engine**
```fsharp
type ISchedulingEngine =
    abstract member CalculateNextReview: 
        currentData: SchedulingData -> 
        rating: AssessmentRating -> 
        SchedulingData
    
    abstract member GetDueFlashcards: 
        flashcards: Flashcard list -> 
        userId: UserId -> 
        Flashcard list

module SchedulingEngine =
    // SM-2 Algorithm Implementation (Pure F#)
    let calculateNextReview (current: SchedulingData) (rating: AssessmentRating) =
        match rating with
        | Again ->
            { current with 
                IntervalDays = 1
                Repetitions = 0
                EaseFactor = max 1.3 (current.EaseFactor - 0.2)
                NextReviewDate = DateTime.UtcNow.AddDays(1.0) }
        
        | Hard ->
            let newEase = max 1.3 (current.EaseFactor - 0.15)
            let newInterval = if current.Repetitions = 0 then 1 
                             else max 1 (float current.IntervalDays * 1.2)
            { current with
                IntervalDays = int newInterval
                Repetitions = current.Repetitions + 1
                EaseFactor = newEase
                NextReviewDate = DateTime.UtcNow.AddDays(newInterval) }
        
        | Good ->
            let newEase = current.EaseFactor + 0.1
            let newInterval = if current.Repetitions = 0 then 1
                             elif current.Repetitions = 1 then 6
                             else float current.IntervalDays * current.EaseFactor
            { current with
                IntervalDays = int newInterval
                Repetitions = current.Repetitions + 1
                EaseFactor = newEase
                NextReviewDate = DateTime.UtcNow.AddDays(newInterval) }
        
        | Easy ->
            let newEase = current.EaseFactor + 0.15
            let newInterval = if current.Repetitions = 0 then 4
                             elif current.Repetitions = 1 then 7
                             else float current.IntervalDays * current.EaseFactor * 1.3
            { current with
                IntervalDays = int newInterval
                Repetitions = current.Repetitions + 1
                EaseFactor = newEase
                NextReviewDate = DateTime.UtcNow.AddDays(newInterval) }
```

#### **Quiz Generation Service**
```fsharp
type IQuizGenerator =
    abstract member GenerateQuizSession: 
        request: QuizGenerationRequest -> 
        flashcards: Flashcard list -> 
        QuizSession
    
    abstract member GetNextFlashcard: 
        session: QuizSession -> 
        Flashcard option

module QuizGenerator =
    let generateQuizSession (request: QuizGenerationRequest) (availableFlashcards: Flashcard list) =
        // Filter by decks and skills
        let filteredFlashcards = 
            availableFlashcards
            |> List.filter (fun f -> List.contains f.DeckId request.DeckIds)
            |> function
                | [] -> failwith "No flashcards available for selected criteria"
                | cards -> cards
        
        // Apply difficulty filtering
        let difficultyFiltered = 
            match request.Difficulty with
            | Some diff -> filteredFlashcards |> List.filter (fun f -> f.Metadata.Difficulty = diff)
            | None -> filteredFlashcards
        
        // Apply spaced repetition algorithm for due cards
        let dueFlashcards = 
            difficultyFiltered
            |> List.filter (fun f -> f.Scheduling.NextReviewDate <= DateTime.UtcNow)
        
        // Mix with new cards if needed
        let selectedFlashcards = 
            if List.length dueFlashcards >= request.Count then
                dueFlashcards |> List.take request.Count
            else
                let newCards = 
                    difficultyFiltered
                    |> List.filter (fun f -> f.Scheduling.Repetitions = 0)
                    |> List.sortBy (fun _ -> Guid.NewGuid())
                    |> List.take (request.Count - List.length dueFlashcards)
                dueFlashcards @ newCards
            |> List.sortBy (fun _ -> Guid.NewGuid()) // Shuffle
        
        {
            Id = QuizSessionId (Guid.CreateVersion7())
            UserId = request.UserId
            Request = request
            FlashcardIds = selectedFlashcards |> List.map (fun f -> f.Id)
            GeneratedAt = DateTime.UtcNow
            ExpiresAt = Some (DateTime.UtcNow.AddHours(24.0))
            CurrentIndex = 0
            Results = []
        }
```

#### **Academy Integration Service**
```fsharp
type IAcademyIntegrationService =
    abstract member MapDeckToSkills: 
        deck: Deck -> 
        skills: Skill list -> 
        SkillMapping list
    
    abstract member UpdateSkillProgress: 
        quizResult: QuizResult -> 
        currentProgress: SkillProgress -> 
        SkillProgress
    
    abstract member GetRecommendedContent: 
        skillId: SkillId -> 
        userProgress: SkillProgress list -> 
        LearningContent option

module AcademyIntegration =
    let mapDeckToSkills (deck: Deck) (availableSkills: Skill list) =
        // Map deck category to relevant skills
        let relevantSkills = 
            availableSkills
            |> List.filter (fun s -> 
                s.Category = deck.Category || 
                s.Name.ToLower().Contains(deck.Name.ToLower()))
        
        relevantSkills
        |> List.map (fun skill ->
            let mappingType = 
                if deck.Category = skill.Category then Primary
                elif List.contains skill.Name deck.Description.Split(' ') then Supplementary
                else Assessment
            
            {
                SkillId = skill.Id
                MappingType = mappingType
                RelevanceWeight = 
                    match mappingType with
                    | Primary -> 1.0
                    | Supplementary -> 0.7
                    | Assessment -> 0.8
                    | Practice -> 0.6
                PrerequisiteLevel = Some skill.Level
            })
    
    let updateSkillProgress (quizResult: QuizResult) (currentProgress: SkillProgress) =
        let performanceScore = 
            if quizResult.IsCorrect then 0.8 + (float quizResult.TimeToAnswer.TotalSeconds / 120.0) * 0.2
            else 0.3
        
        let newLevel = 
            if performanceScore >= 0.8 && currentProgress.Level < Expert then
                match currentProgress.Level with
                | Beginner -> Intermediate
                | Intermediate -> Advanced  
                | Advanced -> Expert
                | Expert -> Expert
            else currentProgress.Level
        
        {
            currentProgress with
                Level = newLevel
                TotalAssessments = currentProgress.TotalAssessments + 1
                AverageScore = (currentProgress.AverageScore * float currentProgress.TotalAssessments + performanceScore) / float (currentProgress.TotalAssessments + 1)
                LastAssessmentDate = Some quizResult.AnsweredAt
                ConfidenceLevel = min 1.0 (currentProgress.ConfidenceLevel + 0.1)
        }
```

### 📊 **Repository Interfaces (Ports)**

```fsharp
// Repository Abstractions (Hexagonal Architecture)
type IFlashcardRepository =
    abstract member GetById: FlashcardId -> Flashcard option
    abstract member GetByDeckId: DeckId -> Flashcard list
    abstract member GetDueFlashcards: UserId -> Flashcard list
    abstract member Save: Flashcard -> Async<unit>
    abstract member UpdateScheduling: FlashcardId -> SchedulingData -> Async<unit>

type IDeckRepository =
    abstract member GetById: DeckId -> Deck option
    abstract member GetByCategory: string -> Deck list
    abstract member GetBySkillId: SkillId -> Deck list
    abstract member Save: Deck -> Async<unit>

type IQuizResultRepository =
    abstract member Save: QuizResult -> Async<unit>
    abstract member GetByUserId: UserId -> QuizResult list
    abstract member GetBySkillId: SkillId -> QuizResult list

type IGlossaryRepository =
    abstract member GetById: GlossaryTermId -> GlossaryTerm option
    abstract member SearchByTerm: string -> GlossaryTerm list
    abstract member GetByFlashcardId: FlashcardId -> GlossaryTerm list

type ICrossReferenceRepository =
    abstract member GetBySourceId: EntityType -> Guid -> CrossReference list
    abstract member GetByTargetId: EntityType -> Guid -> CrossReference list
    abstract member Save: CrossReference -> Async<unit>

// Graph-specific Repository
type IAcademyGraphRepository =
    abstract member GetSkillPath: SkillId -> Skill list // Graph traversal
    abstract member GetRelatedContent: FlashcardId -> RelatedContent list
    abstract member GetLearningRecommendations: UserId -> SkillId -> Recommendation list
```

### 🚀 **Migration Strategy**

#### **Phase 1: Domain Model Migration**
1. **Create F# Domain Types** in `LifeOS.Domain.Academy.Retention`
2. **Implement Pure Algorithms** (SM-2, Quiz Generation)
3. **Define Repository Interfaces** (Ports)
4. **Create Domain Events** for Event Sourcing

#### **Phase 2: Graph Schema Creation**
1. **Create Vertex Collections** for all entities
2. **Define Edge Collections** for relationships
3. **Create AQL Queries** for graph traversals
4. **Setup Indexes** for performance optimization

#### **Phase 3: Data Migration**
1. **Extract Data** from PostgreSQL Retention database
2. **Transform to Graph Model** with relationships
3. **Import to ArangoDB** using bulk operations
4. **Validate Data Integrity** and relationships

#### **Phase 4: C# Adapter Implementation**
1. **Implement Repository Adapters** using ArangoDB driver
2. **Create Graph Query Services** for complex traversals
3. **Build API Controllers** for Academy integration
4. **Setup Event Handlers** for domain events

#### **Phase 5: Frontend Integration**
1. **Update TypeScript Types** from F# domain models
2. **Create Academy Quiz Components** in Deno Fresh
3. **Implement Skill Progress Visualization**
4. **Add Cross-Reference Navigation**

### 🎯 **Key Benefits of This Approach**

#### **Domain Purity**
- **Zero Dependencies** in F# domain layer
- **Pure Functional Algorithms** for spaced repetition
- **Type Safety** with discriminated unions
- **Immutable Data Structures** for consistency

#### **Graph Power**
- **Rich Relationships** between skills, content, and assessments
- **Flexible Traversals** for learning path recommendations
- **Scalable Architecture** for complex domain relationships
- **Natural Modeling** of cross-references and prerequisites

#### **Academy Integration**
- **Seamless Skill Mapping** from existing content
- **Performance-Based Progression** with quiz results
- **Adaptive Learning** through graph traversals
- **Comprehensive Analytics** across domains

This migration preserves the sophisticated Retention service capabilities while integrating them into LifeOS's Academy domain with proper F# domain modeling and ArangoDB graph relationships. The result is a powerful, type-safe, and scalable learning system that leverages graph thinking for enhanced educational experiences.
