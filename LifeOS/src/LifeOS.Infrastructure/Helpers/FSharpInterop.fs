// Enhanced F# Interop with proper nullability handling
namespace LifeOS.Infrastructure.Helpers

open System
open System.Runtime.CompilerServices
open Microsoft.FSharp.Core
open LifeOS.Domain
open LifeOS.Domain.Common

[<Extension>]
module FSharpInterop =
    /// Convert C# nullable string to F# string option with null safety
    [<Extension>]
    let toFSharpOption (value: string) : string option =
        if String.IsNullOrWhiteSpace(value) then None else Some value

    /// Convert C# nullable value to F# option with generic support
    [<Extension>]
    let toFSharpOptionGeneric<'T when 'T: null> (value: 'T) : 'T option =
        match box value with
        | null -> None
        | _ -> Some value

    /// Convert F# option to C# nullable reference type with null safety
    [<Extension>]
    let toNullable<'T when 'T: null> (option: 'T option) : 'T =
        match option with
        | Some value -> value
        | None -> Unchecked.defaultof<'T>

    /// Safe conversion for string types with null handling
    [<Extension>]
    let toNullableString (option: string option) : string =
        match option with
        | Some value -> value
        | None -> String.Empty

    /// Handle F# discriminated union to C# enum conversion safely
    [<Extension>]
    let kingdomToCSharpString (kingdom: Kingdom) : string =
        match kingdom with
        | Kingdom.Plant -> "Plant"
        | Kingdom.Fungi -> "Fungi"
        | Kingdom.Protista -> "Protista"
        | Kingdom.Bacteria -> "Bacteria"
        | Kingdom.Archaea -> "Archaea"

    /// Safe C# enum to F# discriminated union conversion
    [<Extension>]
    let toFSharpKingdom (kingdomStr: string) : Kingdom option =
        match kingdomStr with
        | "Plant" -> Some Kingdom.Plant
        | "Fungi" -> Some Kingdom.Fungi
        | "Protista" -> Some Kingdom.Protista
        | "Bacteria" -> Some Kingdom.Bacteria
        | "Archaea" -> Some Kingdom.Archaea
        | _ -> None

    /// Handle nullable collections safely
    [<Extension>]
    let toFSharpListSafe<'T> (items: 'T seq) : 'T list =
        if isNull items then [] else List.ofSeq items

    /// Handle nullable collections to C# list safely
    [<Extension>]
    let toCSharpListSafe<'T> (items: 'T list) : 'T seq =
        if isNull items then Seq.empty else List.toSeq items

    /// Safe conversion for F# result type
    [<Extension>]
    let toFSharpResult<'T> (value: 'T) : Result<'T, DomainError> =
        Ok value

    /// Safe error handling for F# result type
    [<Extension>]
    let toFSharpError<'T> (error: DomainError) : Result<'T, DomainError> =
        Error error

    /// Handle nullable DateTime conversion
    [<Extension>]
    let toNullableDateTime (option: DateTime option) : DateTime =
        match option with
        | Some dt -> dt
        | None -> DateTime.MinValue

    /// Safe DateTime conversion from C# to F#
    [<Extension>]
    let toFSharpDateTime (dt: Nullable<DateTime>) : DateTime option =
        if dt.HasValue then Some dt.Value else None

    /// Handle nullable bool conversion safely
    [<Extension>]
    let toNullableBool (option: bool option) : bool =
        match option with
        | Some b -> b
        | None -> false

    /// Safe bool conversion from C# to F#
    [<Extension>]
    let toFSharpBool (b: Nullable<bool>) : bool option =
        if b.HasValue then Some b.Value else None
