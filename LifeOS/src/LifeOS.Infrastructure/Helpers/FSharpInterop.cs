#nullable enable
using LifeOS.Domain;
using LifeOS.Domain.Common;
using LifeOS.Domain.Garden;
using Microsoft.FSharp.Core;
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.FSharp.Collections;

namespace LifeOS.Infrastructure.Helpers;

/// Helper class for F#/C# interop operations
public static class FSharpInterop
{
    /// Convert C# value to F# option (nullable)
    public static FSharpOption<T> ToFSharpOption<T>(T? value) where T : class =>
        value == null ? FSharpOption<T>.None : FSharpOption<T>.Some(value);

    /// Convert F# option to C# nullable (handles null option safely)
    public static T? ToNullable<T>(FSharpOption<T>? option) =>
        option is not null && FSharpOption<T>.get_IsSome(option) ? option.Value : default;

    /// Convert F# bool option to C# nullable bool (handles null option safely)
    public static bool ToNullable(FSharpOption<bool>? option) =>
        option is not null && FSharpOption<bool>.get_IsSome(option) && option.Value;

    /// Convert C# IEnumerable to F# list
    public static FSharpList<T> ToFSharpList<T>(IEnumerable<T> items) =>
        ListModule.OfSeq(items);

    /// Convert F# list to C# List
    public static List<T> ToCSharpList<T>(FSharpList<T> list) =>
        ListModule.OfSeq(list).ToList();

    /// Create successful F# result
    public static FSharpResult<T, DomainError> Success<T>(T value) =>
        FSharpResult<T, DomainError>.NewOk(value);

    /// Create error F# result
    public static FSharpResult<T, DomainError> Error<T>(DomainError error) =>
        FSharpResult<T, DomainError>.NewError(error);

    /// Convert C# void to F# unit
    public static Microsoft.FSharp.Core.Unit ToUnit() =>
        default(Microsoft.FSharp.Core.Unit);

    /// Convert C# Kingdom enum to F# Kingdom discriminated union
    /// Note: This method expects the C# Kingdom enum to have the same values as the F# DU
    public static Kingdom ToFSharpKingdom<T>(T kingdom) where T : Enum => kingdom switch
    {
        var v when v.ToString() == "Plant" => Kingdom.Plant,
        var v when v.ToString() == "Fungi" => Kingdom.Fungi,
        var v when v.ToString() == "Protista" => Kingdom.Protista,
        var v when v.ToString() == "Bacteria" => Kingdom.Bacteria,
        var v when v.ToString() == "Archaea" => Kingdom.Archaea,
        _ => throw new ArgumentException($"Unknown kingdom: {kingdom}")
    };

    /// Convert F# Kingdom discriminated union to C# Kingdom enum
    /// Note: This returns the string representation, which should be converted to the appropriate enum
    public static string KingdomToCSharpString(Kingdom kingdom)
    {
        if (kingdom == Kingdom.Plant) return "Plant";
        if (kingdom == Kingdom.Fungi) return "Fungi";
        if (kingdom == Kingdom.Protista) return "Protista";
        if (kingdom == Kingdom.Bacteria) return "Bacteria";
        if (kingdom == Kingdom.Archaea) return "Archaea";
        throw new ArgumentException($"Unknown kingdom: {kingdom}");
    }
}
