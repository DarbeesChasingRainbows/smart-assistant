namespace LifeOS.Domain.Home

open LifeOS.Domain.Common
open System

// Household root aggregate (single-tenant family in Phase 1)

type HouseholdMember = {
    Id: MemberId
    DisplayName: string
    Role: MemberRole
    Birthdate: DateTime option
    IsActive: bool
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    member this.Deactivate () =
        Ok { this with IsActive = false; UpdatedAt = DateTime.utcNow() }

    member this.Activate () =
        Ok { this with IsActive = true; UpdatedAt = DateTime.utcNow() }

module HouseholdMember =
    let create (displayName: string) (role: MemberRole) (birthdate: DateTime option) =
        result {
            if String.IsNullOrWhiteSpace(displayName) then
                return! Error (ValidationError "Display name is required")

            let now = DateTime.utcNow()
            return {
                Id = HomeId.createMemberId()
                DisplayName = displayName
                Role = role
                Birthdate = birthdate
                IsActive = true
                CreatedAt = now
                UpdatedAt = now
            }
        }

type Household = {
    Id: HouseholdId
    Name: string
    Timezone: string
    Members: HouseholdMember list
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    member this.AddMember (memberToAdd: HouseholdMember) =
        if this.Members |> List.exists (fun m -> m.Id = memberToAdd.Id) then
            Error (BusinessRuleViolation "Member already exists in household")
        else
            Ok { this with Members = memberToAdd :: this.Members; UpdatedAt = DateTime.utcNow() }

    member this.RemoveMember (memberId: MemberId) =
        if this.Members |> List.exists (fun m -> m.Id = memberId) |> not then
            Error (NotFoundError "Member not found")
        else
            Ok { this with Members = this.Members |> List.filter (fun m -> m.Id <> memberId); UpdatedAt = DateTime.utcNow() }

module Household =
    let create (name: string) (timezone: string) =
        result {
            if String.IsNullOrWhiteSpace(name) then
                return! Error (ValidationError "Household name is required")

            if String.IsNullOrWhiteSpace(timezone) then
                return! Error (ValidationError "Timezone is required")

            let now = DateTime.utcNow()
            return {
                Id = HomeId.createHouseholdId()
                Name = name
                Timezone = timezone
                Members = []
                CreatedAt = now
                UpdatedAt = now
            }
        }
