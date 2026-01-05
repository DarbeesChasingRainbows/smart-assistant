namespace LifeOS.Domain.SharedKernel

open LifeOS.Domain.Common
open System

// User value objects
type Email = private Email of string
type Username = private Username of string
type Role = Admin | Parent | Child | Guest

// Email validation
module Email =
    let create (value: string) =
        if String.IsNullOrEmpty(value) then
            Error (ValidationError "Email cannot be empty")
        elif not (value.Contains("@") && value.Contains(".")) then
            Error (ValidationError "Invalid email format")
        else
            Ok (Email value)
    
    let value (Email email) = email

// Username validation
module Username =
    let create (value: string) =
        if String.IsNullOrEmpty(value) then
            Error (ValidationError "Username cannot be empty")
        elif value.Length < 3 then
            Error (ValidationError "Username must be at least 3 characters")
        else
            Ok (Username value)
    
    let value (Username username) = username

// User Aggregate Root - Shared across domains
type User = {
    Id: UserId
    Email: Email
    Username: Username
    Role: Role
    IsActive: bool
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    member this.UpdateRole (newRole: Role) =
        Ok { this with 
            Role = newRole
            UpdatedAt = DateTime.utcNow()
        }
    
    member this.Deactivate () =
        Ok { this with 
            IsActive = false
            UpdatedAt = DateTime.utcNow()
        }
    
    member this.Activate () =
        Ok { this with 
            IsActive = true
            UpdatedAt = DateTime.utcNow()
        }
    
    member this.CanApproveTasks =
        match this.Role with
        | Admin | Parent -> true
        | Child | Guest -> false

// User Module for factory methods
module User =
    let create email username role =
        result {
            let! validatedEmail = Email.create email
            let! validatedUsername = Username.create username
            
            return {
                Id = Id.createUserId()
                Email = validatedEmail
                Username = validatedUsername
                Role = role
                IsActive = true
                CreatedAt = DateTime.utcNow()
                UpdatedAt = DateTime.utcNow()
            }
        }
    
    // Business rules
    let canAssignTask (assigner: User) (assignee: User) =
        match assigner.Role with
        | Admin -> true
        | Parent -> assignee.Role = Child || assignee.Role = Guest
        | Child -> false
        | Guest -> false
    
    let canManageKRA (user: User) =
        match user.Role with
        | Admin | Parent -> true
        | Child | Guest -> false
