namespace LifeOS.Domain.Common

open System

// Common value objects and types used across domains

type VehicleId = VehicleId of Guid
type ComponentId = ComponentId of Guid
type UserId = UserId of Guid

// Module for creating and validating IDs
[<RequireQualifiedAccess>]
module Id =
    let createVehicleId () = VehicleId (Guid.NewGuid())
    let createVehicleIdFrom (guid: Guid) = VehicleId guid
    let createComponentId () = ComponentId (Guid.NewGuid())
    let createComponentIdFrom (guid: Guid) = ComponentId guid
    let createUserId () = UserId (Guid.NewGuid())
    let createUserIdFrom (guid: Guid) = UserId guid
    
    let vehicleIdValue (VehicleId id) = id
    let componentIdValue (ComponentId id) = id
    let userIdValue (UserId id) = id

// Common domain errors
type DomainError =
    | ValidationError of string
    | NotFoundError of string
    | BusinessRuleViolation of string
    | ConcurrencyError of string

// DateTime utilities
module DateTime =
    let utcNow () = DateTime.UtcNow

// Result computation expression builder
type ResultBuilder() =
    member _.Return(x) = Ok x
    member _.ReturnFrom(m) = m
    member _.Bind(m, f) = Result.bind f m
    member _.Zero() = Ok ()
    member _.Delay(f) = f
    member _.Run(f) = f()
    member _.Combine(a, b) = 
        match a with
        | Ok () -> b()
        | Error e -> Error e

[<AutoOpen>]
module ResultBuilderModule =
    let result = ResultBuilder()

// Async helper functions
[<AutoOpen>]
module AsyncHelpers =
    let map f a = async {
        let! x = a
        return f x
    }

// DomainError helpers
module DomainError =
    let message = function
        | ValidationError msg -> msg
        | NotFoundError msg -> msg
        | BusinessRuleViolation msg -> msg
        | ConcurrencyError msg -> msg

// List extensions for Result
module List =
    let sequenceResultM (results: Result<'a, 'e> list) : Result<'a list, 'e> =
        let folder item acc =
            match acc, item with
            | Ok list, Ok value -> Ok (value :: list)
            | Error e, _ -> Error e
            | _, Error e -> Error e
        List.foldBack folder results (Ok [])
