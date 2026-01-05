namespace LifeOS.Domain.Academy

open LifeOS.Domain.Common
open System

// Value Objects for Academy domain
type SkillId = SkillId of Guid
type TaskId = TaskId of Guid
type AchievementId = AchievementId of Guid

// Module for creating IDs
module AcademyId =
    let createSkillId () = SkillId (Guid.NewGuid())
    let createTaskId () = TaskId (Guid.NewGuid())
    let createAchievementId () = AchievementId (Guid.NewGuid())
    
    let skillIdValue (SkillId id) = id
    let taskIdValue (TaskId id) = id
    let achievementIdValue (AchievementId id) = id

// XP and Level value objects
type XP = XP of int
type Level = Level of int
type Streak = Streak of int

// XP utilities
module XP =
    let create (value: int) =
        if value < 0 then
            Error (ValidationError "XP cannot be negative")
        else
            Ok (XP value)
    
    let value (XP xp) = xp
    let zero = XP 0
    
    let add (XP xp1) (XP xp2) = XP (xp1 + xp2)
    let subtract (XP xp1) (XP xp2) = XP (xp1 - xp2)

// Level utilities
module Level =
    let create (value: int) =
        if value < 1 then
            Error (ValidationError "Level must be at least 1")
        else
            Ok (Level value)
    
    let value (Level lvl) = lvl
    let one = Level 1
    
    // Calculate XP needed for a given level (exponential curve)
    let xpRequiredForLevel (Level level) =
        if level <= 1 then XP 0
        else XP (int (100.0 * (pown 2.0 (level - 1))))
    
    // Calculate level from total XP
    let levelFromXP (XP totalXp) =
        let rec calculateLevel level xpRequired =
            let nextLevelXp = match xpRequiredForLevel (Level (level + 1)) with XP xp -> xp
            if xpRequired > totalXp then Level (level - 1)
            else calculateLevel (level + 1) (xpRequired + nextLevelXp)
        
        if totalXp < 100 then Level 1
        else calculateLevel 1 0

// Streak utilities
module Streak =
    let create (value: int) =
        if value < 0 then
            Error (ValidationError "Streak cannot be negative")
        else
            Ok (Streak value)
    
    let value (Streak streak) = streak
    let zero = Streak 0

// Difficulty levels
type Difficulty =
    | Beginner
    | Easy
    | Medium
    | Hard
    | Expert
    | Master

// Priority levels
type Priority =
    | Low
    | Normal
    | High
    | Urgent

// Task status
type TaskStatus =
    | Draft
    | Pending
    | InProgress
    | Completed
    | Approved
    | Rejected
    | Cancelled

// Skill categories
type SkillCategory =
    | Academic
    | Practical
    | Creative
    | Physical
    | Social
    | Spiritual
    | Technical
    | Other of string

// Achievement types
type AchievementType =
    | FirstTask
    | TaskStreak of int // Streak of N days
    | SkillLevel of SkillId * Level
    | TotalXP of XP
    | TaskCompleted of int // N tasks completed
    | Special of string

// Task completion record
type TaskCompletion = {
    TaskId: TaskId
    UserId: UserId
    CompletedAt: DateTime
    XPEarned: XP
    QualityScore: decimal option // 1.0 to 5.0
    Feedback: string option
}

// Skill progress record
type SkillProgress = {
    SkillId: SkillId
    UserId: UserId
    CurrentLevel: Level
    CurrentXP: XP
    TotalXP: XP
    XPToNextLevel: XP
    LastUpdated: DateTime
}

// Achievement record
type Achievement = {
    Id: AchievementId
    Type: AchievementType
    Name: string
    Description: string
    XPReward: XP
    IconUrl: string option
    IsHidden: bool
    CreatedAt: DateTime
}

// User achievement
type UserAchievement = {
    AchievementId: AchievementId
    UserId: UserId
    UnlockedAt: DateTime
}

// Leaderboard entry for rankings
type LeaderboardEntry = {
    UserId: UserId
    Username: string
    TotalXP: XP
    Level: Level
    SkillsCount: int
    Rank: int
}

// Skill node for path building
type SkillNode = {
    Id: SkillId
    Name: string
    Category: SkillCategory
    IsPrerequisite: bool
    IsCompleted: bool
}

// Skill path for progression
type SkillPath = {
    TargetSkill: SkillNode
    RequiredSkills: SkillNode list
    TotalPrerequisites: int
}

// Skill recommendation
type SkillRecommendation = {
    SkillId: SkillId
    SkillName: string
    Category: SkillCategory
    Difficulty: XP
    PrerequisiteCount: int
    PrerequisitesMet: bool
    RecommendationScore: decimal
}

// User skill summary type
type UserSkillSummary = {
    SkillId: SkillId
    SkillName: string
    Category: SkillCategory
    CurrentLevel: Level
    CurrentXP: XP
    TotalXP: XP
    ProgressPercentage: decimal
    Streak: Streak
}

// User total stats type
type UserTotalStats = {
    TotalXP: XP
    OverallLevel: Level
    SkillsLearned: int
    ActiveStreaks: int
    AverageLevel: decimal
}
