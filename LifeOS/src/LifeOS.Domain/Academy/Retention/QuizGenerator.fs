namespace LifeOS.Domain.Academy.Retention

open LifeOS.Domain.Common
open System

// Quiz Generation Service - Pure functional implementation
module QuizGenerator =
    
    // Quiz generation request
    type QuizGenerationRequest = {
        UserId: UserId
        DeckIds: DeckId list
        SkillIds: SkillId list
        Difficulty: DifficultyLevel option
        Count: int
        SessionType: SessionType
        TimeLimit: TimeSpan option
        IncludeNewCards: bool
        NewCardRatio: float
    }
    
    module QuizGenerationRequest =
        let create userId deckIds count sessionType =
            {
                UserId = userId
                DeckIds = deckIds
                SkillIds = []
                Difficulty = None
                Count = count
                SessionType = sessionType
                TimeLimit = None
                IncludeNewCards = true
                NewCardRatio = 0.2
            }
        
        let withSkillIds skillIds request =
            { request with SkillIds = skillIds }
        
        let withDifficulty difficulty request =
            { request with Difficulty = Some difficulty }
        
        let withTimeLimit timeLimit request =
            { request with TimeLimit = Some timeLimit }
        
        let withNewCardRatio ratio request =
            { request with NewCardRatio = max 0.0 (min 1.0 ratio) }
    
    // Random number generator for shuffling
    let private random = Random()
    
    // Fisher-Yates shuffle algorithm
    let private shuffle list =
        let arr = List.toArray list
        for i = arr.Length - 1 downto 1 do
            let j = random.Next(i + 1)
            let temp = arr.[i]
            arr.[i] <- arr.[j]
            arr.[j] <- temp
        Array.toList arr
    
    // Filter flashcards by deck IDs
    let private filterByDecks (deckIds: DeckId list) (flashcards: Flashcard list) =
        if List.isEmpty deckIds then flashcards
        else flashcards |> List.filter (fun f -> List.contains f.DeckId deckIds)
    
    // Filter flashcards by difficulty
    let private filterByDifficulty (difficulty: DifficultyLevel option) (flashcards: Flashcard list) =
        match difficulty with
        | Some d -> flashcards |> List.filter (fun f -> f.Metadata.Difficulty = d)
        | None -> flashcards
    
    // Get due flashcards sorted by priority
    let private getDueCards (flashcards: Flashcard list) =
        flashcards
        |> List.filter (fun f -> f.Scheduling.Repetitions > 0 && SchedulingData.isDue f.Scheduling)
        |> List.sortByDescending (fun f -> SchedulingEngine.getLearningPriority f)
    
    // Get new flashcards (never reviewed)
    let private getNewCards (flashcards: Flashcard list) =
        flashcards
        |> List.filter (fun f -> f.Scheduling.Repetitions = 0)
        |> shuffle
    
    // Interleave cards from different decks to prevent consecutive same-deck cards
    let private interleaveByDeck (flashcards: Flashcard list) =
        let grouped = flashcards |> List.groupBy (fun f -> f.DeckId)
        let rec interleave acc remaining =
            match remaining with
            | [] -> List.rev acc
            | groups ->
                let (nextCards, updatedGroups) =
                    groups
                    |> List.choose (fun (deckId, cards) ->
                        match cards with
                        | [] -> None
                        | h :: t -> Some (h, (deckId, t)))
                    |> List.unzip
                
                let nonEmptyGroups = updatedGroups |> List.filter (fun (_, cards) -> not (List.isEmpty cards))
                interleave (List.rev nextCards @ acc) nonEmptyGroups
        
        interleave [] (grouped |> List.map (fun (id, cards) -> (id, shuffle cards)))
    
    // Generate a quiz session
    let generateQuizSession (request: QuizGenerationRequest) (availableFlashcards: Flashcard list) : Result<QuizSession, DomainError> =
        // Apply filters
        let filtered =
            availableFlashcards
            |> filterByDecks request.DeckIds
            |> filterByDifficulty request.Difficulty
        
        if List.isEmpty filtered then
            Error (ValidationError "No flashcards available for the selected criteria")
        else
            // Get due and new cards
            let dueCards = getDueCards filtered
            let newCards = getNewCards filtered
            
            // Calculate how many of each type to include
            let newCardCount = 
                if request.IncludeNewCards then
                    int (float request.Count * request.NewCardRatio)
                else 0
            let dueCardCount = request.Count - newCardCount
            
            // Select cards
            let selectedDue = dueCards |> List.truncate dueCardCount
            let selectedNew = newCards |> List.truncate newCardCount
            
            // If we don't have enough due cards, fill with new cards
            let remainingSlots = request.Count - List.length selectedDue - List.length selectedNew
            let additionalNew = 
                newCards 
                |> List.skip (List.length selectedNew)
                |> List.truncate remainingSlots
            
            let allSelected = selectedDue @ selectedNew @ additionalNew
            
            // Interleave to prevent consecutive same-deck cards
            let interleaved = 
                if List.length request.DeckIds > 1 then
                    interleaveByDeck allSelected
                else
                    shuffle allSelected
            
            let flashcardIds = interleaved |> List.map (fun f -> f.Id)
            
            let expiresAt = 
                request.TimeLimit 
                |> Option.map (fun t -> DateTime.UtcNow.Add(t))
                |> Option.orElse (Some (DateTime.UtcNow.AddHours(24.0)))
            
            QuizSession.create 
                request.UserId 
                request.DeckIds 
                request.SkillIds 
                request.Difficulty 
                request.SessionType 
                flashcardIds 
                expiresAt
    
    // Generate quiz by difficulty level presets
    let generateByDifficultyPreset (userId: UserId) (deckIds: DeckId list) (preset: string) (flashcards: Flashcard list) =
        let request =
            match preset.ToLowerInvariant() with
            | "easy" ->
                QuizGenerationRequest.create userId deckIds 10 Practice
                |> QuizGenerationRequest.withDifficulty Beginner
                |> QuizGenerationRequest.withNewCardRatio 0.1
            | "medium" ->
                QuizGenerationRequest.create userId deckIds 15 Review
                |> QuizGenerationRequest.withNewCardRatio 0.2
            | "hard" ->
                QuizGenerationRequest.create userId deckIds 20 Review
                |> QuizGenerationRequest.withDifficulty Advanced
                |> QuizGenerationRequest.withNewCardRatio 0.3
            | "expert" ->
                QuizGenerationRequest.create userId deckIds 25 Evaluation
                |> QuizGenerationRequest.withDifficulty Expert
                |> QuizGenerationRequest.withNewCardRatio 0.4
            | _ ->
                QuizGenerationRequest.create userId deckIds 10 Practice
        
        generateQuizSession request flashcards
    
    // Get next flashcard in session
    let getNextFlashcard (session: QuizSession) (flashcards: Flashcard list) : Flashcard option =
        QuizSession.currentFlashcardId session
        |> Option.bind (fun id -> flashcards |> List.tryFind (fun f -> f.Id = id))
    
    // Record answer and advance session
    let recordAnswer (session: QuizSession) (flashcard: Flashcard) (rating: AssessmentRating) (timeToAnswer: TimeSpan) (rawAnswer: string option) : Result<QuizSession * Flashcard * QuizResult, DomainError> =
        if QuizSession.isComplete session then
            Error (BusinessRuleViolation "Quiz session is already complete")
        else
            // Update flashcard scheduling
            let newScheduling = SchedulingEngine.calculateNextReviewWithTime flashcard.Scheduling rating timeToAnswer
            let updatedFlashcard = { flashcard with Scheduling = newScheduling; UpdatedAt = DateTime.UtcNow }
            
            // Create quiz result
            let isCorrect = 
                match rating with
                | Again -> false
                | Hard -> true
                | Good -> true
                | Easy -> true
            
            let context = QuizContext.create session.SessionType
            let skillId = 
                session.SkillIds 
                |> List.tryHead
            
            match QuizResult.create session.UserId flashcard.DeckId flashcard.Id isCorrect rating flashcard.Metadata.Difficulty timeToAnswer rawAnswer context skillId with
            | Ok result ->
                let advancedSession = QuizSession.advance session result.Id
                Ok (advancedSession, updatedFlashcard, result)
            | Error e -> Error e
    
    // Session statistics result type
    type SessionStats = {
        TotalQuestions: int
        CorrectAnswers: int
        IncorrectAnswers: int
        AccuracyRate: float
        AverageTimeSeconds: float
        RatingDistribution: Map<string, int>
    }
    
    // Calculate session statistics
    let calculateSessionStats (results: QuizResult list) : SessionStats =
        let total = List.length results
        if total = 0 then
            { 
                TotalQuestions = 0
                CorrectAnswers = 0
                IncorrectAnswers = 0
                AccuracyRate = 0.0
                AverageTimeSeconds = 0.0
                RatingDistribution = Map.empty
            }
        else
            let correct = results |> List.filter (fun r -> r.IsCorrect) |> List.length
            let avgTime = results |> List.averageBy (fun r -> r.TimeToAnswer.TotalSeconds)
            let ratingDist = 
                results 
                |> List.groupBy (fun r -> r.AssessmentRating)
                |> List.map (fun (rating, items) -> (AssessmentRating.toString rating, List.length items))
                |> Map.ofList
            
            {
                TotalQuestions = total
                CorrectAnswers = correct
                IncorrectAnswers = total - correct
                AccuracyRate = float correct / float total * 100.0
                AverageTimeSeconds = avgTime
                RatingDistribution = ratingDist
            }
