namespace LifeOS.Domain.SharedKernel

open LifeOS.Domain.Common
open System

// C# interop helpers for SharedKernel types
[<AbstractClass; Sealed>]
type SharedKernelInterop() =

    static member CreateEmail(value: string) : Result<Email, DomainError> =
        Email.create value

    static member GetEmailValue(email: Email) : string =
        Email.value email

    static member CreateUsername(value: string) : Result<Username, DomainError> =
        Username.create value

    static member GetUsernameValue(username: Username) : string =
        Username.value username

    static member ParseRole(value: string) : Result<Role, DomainError> =
        match value with
        | null -> Error (ValidationError "Role cannot be empty")
        | _ ->
            match value.Trim().ToLowerInvariant() with
            | "admin" -> Ok Admin
            | "parent" -> Ok Parent
            | "child" -> Ok Child
            | "guest" -> Ok Guest
            | _ -> Error (ValidationError "Invalid role")

    static member RoleToString(role: Role) : string =
        match role with
        | Admin -> "Admin"
        | Parent -> "Parent"
        | Child -> "Child"
        | Guest -> "Guest"

    static member CreateUser(email: string, username: string, role: Role) : Result<User, DomainError> =
        User.create email username role

    static member CreateUserFrom(id: UserId, email: Email, username: Username, role: Role, isActive: bool, createdAt: DateTime, updatedAt: DateTime) : User =
        {
            Id = id
            Email = email
            Username = username
            Role = role
            IsActive = isActive
            CreatedAt = createdAt
            UpdatedAt = updatedAt
        }

    static member ActivateUser(user: User) : Result<User, DomainError> =
        user.Activate()

    static member DeactivateUser(user: User) : Result<User, DomainError> =
        user.Deactivate()

    static member UpdateUserRole(user: User, role: Role) : Result<User, DomainError> =
        user.UpdateRole(role)
