namespace LifeOS.RulesEngine.Contracts

open System

/// <summary>
/// Error codes used by the rules engine.
/// These are string constants for C# consumption.
/// </summary>
[<RequireQualifiedAccess>]
module ErrorCodes =
    [<Literal>]
    let ValidationError = "VALIDATION_ERROR"
    
    [<Literal>]
    let BusinessRuleViolation = "BUSINESS_RULE_VIOLATION"
    
    [<Literal>]
    let NotFound = "NOT_FOUND"
    
    [<Literal>]
    let InvalidAge = "INVALID_AGE"
    
    [<Literal>]
    let InvalidMileage = "INVALID_MILEAGE"
    
    [<Literal>]
    let InvalidScore = "INVALID_SCORE"
