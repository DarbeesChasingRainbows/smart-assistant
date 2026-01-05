namespace LifeOS.Domain.Academy.Retention

open System

// SM-2 Spaced Repetition Algorithm Implementation
// Pure functional implementation with no external dependencies
module SchedulingEngine =
    
    // SM-2 Algorithm Constants
    let private defaultEaseFactor = 2.5
    let private minEaseFactor = 1.3
    let private maxEaseFactor = 3.0
    
    // Calculate new ease factor based on quality rating (0-5 scale)
    let private calculateNewEaseFactor (currentEF: float) (quality: int) =
        let newEF = currentEF + (0.1 - float (5 - quality) * (0.08 + float (5 - quality) * 0.02))
        max minEaseFactor (min maxEaseFactor newEF)
    
    // Calculate next interval based on SM-2 algorithm
    let private calculateNextInterval (currentInterval: int) (repetitions: int) (easeFactor: float) (rating: AssessmentRating) =
        match rating with
        | Again ->
            // Reset to 1 day on failure
            1
        | Hard ->
            // Slightly increase interval
            if repetitions = 0 then 1
            elif repetitions = 1 then 1
            else max 1 (int (float currentInterval * 1.2))
        | Good ->
            // Standard SM-2 progression
            if repetitions = 0 then 1
            elif repetitions = 1 then 6
            else max 1 (int (float currentInterval * easeFactor))
        | Easy ->
            // Accelerated progression
            if repetitions = 0 then 4
            elif repetitions = 1 then 7
            else max 1 (int (float currentInterval * easeFactor * 1.3))
    
    // Calculate new repetition count
    let private calculateNewRepetitions (currentReps: int) (rating: AssessmentRating) =
        match rating with
        | Again -> 0  // Reset on failure
        | _ -> currentReps + 1
    
    // Main scheduling function - calculates next review based on rating
    let calculateNextReview (currentData: SchedulingData) (rating: AssessmentRating) : SchedulingData =
        let quality = AssessmentRating.toQuality rating
        let newEaseFactor = calculateNewEaseFactor currentData.EaseFactor quality
        let newRepetitions = calculateNewRepetitions currentData.Repetitions rating
        let newInterval = calculateNextInterval currentData.IntervalDays currentData.Repetitions newEaseFactor rating
        let now = DateTime.UtcNow
        
        let reviewRecord = {
            Date = now
            Rating = rating
            PreviousInterval = currentData.IntervalDays
            NewInterval = newInterval
            PreviousEaseFactor = currentData.EaseFactor
            NewEaseFactor = newEaseFactor
            TimeToAnswer = None
        }
        
        {
            NextReviewDate = now.AddDays(float newInterval)
            IntervalDays = newInterval
            Repetitions = newRepetitions
            EaseFactor = newEaseFactor
            LastReviewDate = Some now
            ReviewHistory = reviewRecord :: currentData.ReviewHistory
        }
    
    // Calculate next review with time tracking
    let calculateNextReviewWithTime (currentData: SchedulingData) (rating: AssessmentRating) (timeToAnswer: TimeSpan) : SchedulingData =
        let result = calculateNextReview currentData rating
        let updatedHistory =
            match result.ReviewHistory with
            | latest :: rest -> { latest with TimeToAnswer = Some timeToAnswer } :: rest
            | [] -> result.ReviewHistory
        { result with ReviewHistory = updatedHistory }
    
    // Get all due flashcards from a list
    let getDueFlashcards (flashcards: Flashcard list) : Flashcard list =
        let now = DateTime.UtcNow
        flashcards
        |> List.filter (fun f -> f.Scheduling.NextReviewDate <= now)
        |> List.sortBy (fun f -> f.Scheduling.NextReviewDate)
    
    // Get new flashcards (never reviewed)
    let getNewFlashcards (flashcards: Flashcard list) : Flashcard list =
        flashcards
        |> List.filter (fun f -> f.Scheduling.Repetitions = 0)
    
    // Get flashcards by difficulty
    let getFlashcardsByDifficulty (flashcards: Flashcard list) (difficulty: DifficultyLevel) : Flashcard list =
        flashcards
        |> List.filter (fun f -> f.Metadata.Difficulty = difficulty)
    
    // Calculate retention statistics
    let calculateRetentionStats (flashcards: Flashcard list) =
        let total = List.length flashcards
        if total = 0 then
            {| TotalCards = 0; DueCards = 0; NewCards = 0; MatureCards = 0; AverageEaseFactor = 0.0; RetentionRate = 0.0 |}
        else
            let now = DateTime.UtcNow
            let dueCards = flashcards |> List.filter (fun f -> f.Scheduling.NextReviewDate <= now) |> List.length
            let newCards = flashcards |> List.filter (fun f -> f.Scheduling.Repetitions = 0) |> List.length
            let matureCards = flashcards |> List.filter (fun f -> f.Scheduling.IntervalDays >= 21) |> List.length
            let avgEF = flashcards |> List.averageBy (fun f -> f.Scheduling.EaseFactor)
            let retentionRate = 
                if total > 0 then 
                    float (total - dueCards) / float total * 100.0 
                else 0.0
            
            {| 
                TotalCards = total
                DueCards = dueCards
                NewCards = newCards
                MatureCards = matureCards
                AverageEaseFactor = avgEF
                RetentionRate = retentionRate
            |}
    
    // Predict optimal review time based on forgetting curve
    let predictOptimalReviewTime (scheduling: SchedulingData) (targetRetention: float) =
        // Using simplified forgetting curve: R = e^(-t/S)
        // Where R is retention, t is time, S is stability (related to interval)
        let stability = float scheduling.IntervalDays * scheduling.EaseFactor
        let optimalDays = -stability * log targetRetention
        DateTime.UtcNow.AddDays(optimalDays)
    
    // Get learning priority score (higher = more urgent to review)
    let getLearningPriority (flashcard: Flashcard) =
        let now = DateTime.UtcNow
        let overdueDays = (now - flashcard.Scheduling.NextReviewDate).TotalDays
        let difficultyMultiplier =
            match flashcard.Metadata.Difficulty with
            | Beginner -> 0.8
            | Intermediate -> 1.0
            | Advanced -> 1.2
            | Expert -> 1.5
        
        // Priority increases with overdue time and difficulty
        let basePriority = 
            if overdueDays > 0.0 then overdueDays * 10.0
            elif flashcard.Scheduling.Repetitions = 0 then 5.0  // New cards have medium priority
            else -overdueDays  // Future cards have low priority
        
        basePriority * difficultyMultiplier / flashcard.Scheduling.EaseFactor
