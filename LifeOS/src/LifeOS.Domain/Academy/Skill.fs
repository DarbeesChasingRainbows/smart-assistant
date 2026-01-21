namespace LifeOS.Domain.Academy

open LifeOS.Domain.Common
open System

// Skill Aggregate - RPG-style skill system
type Skill = {
    Id: SkillId
    Name: string
    Description: string
    Category: SkillCategory
    MaxLevel: Level
    BaseXPReward: XP // XP awarded for using this skill
    Prerequisites: SkillId list
    RelatedSkills: SkillId list
    IconUrl: string option
    IsActive: bool
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
  member this.CanReachLevel (targetLevel: Level) =
      Level.value targetLevel <= Level.value this.MaxLevel
  
  member this.AddPrerequisite (skillId: SkillId) =
      if this.Prerequisites |> List.contains skillId then
          Error (BusinessRuleViolation "This skill is already a prerequisite")
      elif skillId = this.Id then
          Error (BusinessRuleViolation "A skill cannot be a prerequisite of itself")
      else
          Ok
              { this with
                  Prerequisites = skillId :: this.Prerequisites
                  UpdatedAt = DateTime.utcNow()
              }
  
  member this.RemovePrerequisite (skillId: SkillId) =
      if not (this.Prerequisites |> List.contains skillId) then
          Error (ValidationError "Skill is not a prerequisite")
      else
          Ok
              { this with
                  Prerequisites =
                      this.Prerequisites |> List.filter ((<>) skillId)
                  UpdatedAt = DateTime.utcNow()
              }
  
  member this.AddRelatedSkill (skillId: SkillId) =
      if this.RelatedSkills |> List.contains skillId then
          Error (BusinessRuleViolation "This skill is already marked as related")
      elif skillId = this.Id then
          Error (BusinessRuleViolation "A skill cannot be related to itself")
      else
          Ok
              { this with
                  RelatedSkills = skillId :: this.RelatedSkills
                  UpdatedAt = DateTime.utcNow()
              }
  
  member this.UpdateXPReward (newReward: XP) =
      if XP.value newReward < 0 then
          Error (ValidationError "XP reward cannot be negative")
      else
          Ok
              { this with
                  BaseXPReward = newReward
                  UpdatedAt = DateTime.utcNow()
              }
  
  member this.Deactivate () =
      Ok
          { this with
              IsActive = false
              UpdatedAt = DateTime.utcNow()
          }
  
  member this.Activate () =
      Ok
          { this with
              IsActive = true
              UpdatedAt = DateTime.utcNow()
          }

// User Skill Progress - Tracks user's progress in a skill
type UserSkill = {
    UserId: UserId
    SkillId: SkillId
    CurrentLevel: Level
    CurrentXP: XP
    TotalXP: XP
    Streak: Streak
    LastUsed: DateTime option
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
  member this.XPToNextLevel =
      let nextLevelXP = Level.xpRequiredForLevel (Level (Level.value this.CurrentLevel + 1))
      XP.subtract nextLevelXP this.CurrentXP
  
  member this.IsMaxLevel =
      Level.value this.CurrentLevel >= 100 // Assuming 100 is max level
  
  member this.AddXP (xp: XP) (currentDate: DateTime) =
      let newTotalXP = XP.add this.TotalXP xp
      let newLevel = Level.levelFromXP newTotalXP
      let newCurrentXP = XP.subtract newTotalXP (Level.xpRequiredForLevel newLevel)
      
      // Update streak
      let newStreak = 
          match this.LastUsed with
          | Some lastUsed ->
              if (currentDate - lastUsed).Days = 1 then
                  Streak (Streak.value this.Streak + 1)
              elif (currentDate - lastUsed).Days = 0 then
                  this.Streak
              else
                  Streak 1
          | None -> Streak 1
      
      { this with
          CurrentLevel = newLevel
          CurrentXP = newCurrentXP
          TotalXP = newTotalXP
          Streak = newStreak
          LastUsed = Some currentDate
          UpdatedAt = currentDate
      }
  
  member this.ResetStreak () =
      { this with
          Streak = Streak.zero
          UpdatedAt = DateTime.utcNow()
      }

// Skill Module for factory methods
module Skill =
    let create name description category maxLevel baseXPReward iconUrl =
        result {
            if String.IsNullOrEmpty(name) then
                return! Error (ValidationError "Skill name is required")
            
            let! validatedMaxLevel = Level.create maxLevel
            let! validatedBaseXPReward = XP.create baseXPReward
            
            return {
                Id = AcademyId.createSkillId()
                Name = name
                Description = description
                Category = category
                MaxLevel = validatedMaxLevel
                BaseXPReward = validatedBaseXPReward
                Prerequisites = []
                RelatedSkills = []
                IconUrl = iconUrl
                IsActive = true
                CreatedAt = DateTime.utcNow()
                UpdatedAt = DateTime.utcNow()
            }
        }
    
    // Business rules
    let canLearnSkill (skill: Skill) (userSkills: UserSkill seq) =
        // Check if all prerequisites are met
        let prerequisitesMet =
            skill.Prerequisites
            |> List.forall (fun prereqId ->
                userSkills
                |> Seq.exists (fun us -> 
                    us.SkillId = prereqId && 
                    Level.value us.CurrentLevel >= 1))
        
        if not prerequisitesMet then
            Error (BusinessRuleViolation "Prerequisites not met")
        elif not skill.IsActive then
            Error (BusinessRuleViolation "Skill is not active")
        else
            Ok ()
    
    let calculateLevelUpXP (currentLevel: Level) =
        let currentLevelXP = Level.xpRequiredForLevel currentLevel
        let nextLevelXP = Level.xpRequiredForLevel (Level (Level.value currentLevel + 1))
        XP.subtract nextLevelXP currentLevelXP
    
    let getProgressPercentage (userSkill: UserSkill) =
        let currentLevelXP = Level.xpRequiredForLevel userSkill.CurrentLevel
        let nextLevelXP = Level.xpRequiredForLevel (Level (Level.value userSkill.CurrentLevel + 1))
        let levelXP = XP.subtract nextLevelXP currentLevelXP
        
        if XP.value levelXP > 0 then
            decimal (XP.value userSkill.CurrentXP) / decimal (XP.value levelXP) * 100m
        else
            100m

// UserSkill Module for factory methods
module UserSkill =
    let create userId skillId =
        Ok {
            UserId = userId
            SkillId = skillId
            CurrentLevel = Level.one
            CurrentXP = XP.zero
            TotalXP = XP.zero
            Streak = Streak.zero
            LastUsed = None
            CreatedAt = DateTime.utcNow()
            UpdatedAt = DateTime.utcNow()
        }
    
    let awardXP (userSkill: UserSkill) (xp: XP) (currentDate: DateTime) =
        if XP.value xp < 0 then
            Error (ValidationError "Cannot award negative XP")
        else
            Ok (userSkill.AddXP xp currentDate)
    
    let useSkill (userSkill: UserSkill) (skill: Skill) (currentDate: DateTime) =
        let updatedSkill = userSkill.AddXP skill.BaseXPReward currentDate
        Ok updatedSkill
