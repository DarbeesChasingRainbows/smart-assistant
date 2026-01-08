using System.Net.Http.Json;
using LifeOS.API.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace LifeOS.API.Endpoints;

public static class VinEndpoints
{
    private const string ClientName = "VinProvider";

    public static void MapVinEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/vin").WithTags("VIN");

        group
            .MapGet("/lookup/{vin}", Lookup)
            .WithName("LookupVin")
            .WithDescription(
                "Decode a VIN using the configured VIN provider (default: NHTSA vPIC)"
            );
    }

    private static async Task<IResult> Lookup(
        [FromRoute] string vin,
        [FromServices] IHttpClientFactory httpClientFactory
    )
    {
        if (string.IsNullOrWhiteSpace(vin))
            return Results.BadRequest(new ApiErrorResponse { Error = "VIN is required" });

        vin = vin.Trim().ToUpperInvariant();

        if (vin.Length != 17)
            return Results.BadRequest(
                new ApiErrorResponse { Error = "VIN must be exactly 17 characters" }
            );

        if (!vin.All(c => (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')))
            return Results.BadRequest(
                new ApiErrorResponse { Error = "VIN must contain only letters and digits" }
            );

        if (vin.Contains('I') || vin.Contains('O') || vin.Contains('Q'))
            return Results.BadRequest(
                new ApiErrorResponse { Error = "VIN cannot contain I, O, or Q" }
            );

        var client = httpClientFactory.CreateClient(ClientName);

        VpicDecodeResponse? decoded;
        try
        {
            var path =
                $"/api/vehicles/DecodeVinValuesExtended/{Uri.EscapeDataString(vin)}?format=json";
            decoded = await client.GetFromJsonAsync<VpicDecodeResponse>(path);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                title: "VIN lookup failed",
                detail: ex.Message,
                statusCode: StatusCodes.Status502BadGateway
            );
        }

        var first = decoded?.Results?.FirstOrDefault();
        if (first == null)
        {
            return Results.Ok(
                new VinLookupResponse { Vin = vin, Error = "No results returned from VIN provider" }
            );
        }

        var errorText = first.ErrorCode;
        var response = new VinLookupResponse
        {
            Vin = vin,
            Make = Normalize(first.Make),
            Model = Normalize(first.Model),
            Year = TryParseInt(first.ModelYear),
            Trim = Normalize(first.Trim),
            Engine = Normalize(first.EngineModel),
            Transmission = Normalize(first.TransmissionStyle),
            Manufacturer = Normalize(first.Manufacturer),
            Plant = Normalize(first.PlantCompanyName ?? first.PlantCity),
            Series = Normalize(first.Series),
            Body = Normalize(first.BodyClass),
            Fuel = Normalize(first.FuelTypePrimary),
            VehicleType = InferVehicleType(first),
            Error = NormalizeError(errorText),
        };

        return Results.Ok(response);
    }

    private static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        var v = value.Trim();
        if (v.Equals("N/A", StringComparison.OrdinalIgnoreCase))
            return null;
        if (v.Equals("Not Applicable", StringComparison.OrdinalIgnoreCase))
            return null;
        if (v.Equals("0", StringComparison.OrdinalIgnoreCase))
            return null;
        return v;
    }

    private static string? NormalizeError(string? errorCode)
    {
        if (string.IsNullOrWhiteSpace(errorCode))
            return null;
        var trimmed = errorCode.Trim();
        if (trimmed == "0")
            return null;
        return trimmed;
    }

    private static int? TryParseInt(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        return int.TryParse(value.Trim(), out var x) ? x : null;
    }

    private static string? InferVehicleType(VpicDecodeResult r)
    {
        var vehicleType = Normalize(r.VehicleType);
        var bodyClass = Normalize(r.BodyClass);

        if (vehicleType != null)
        {
            if (vehicleType.Contains("Trailer", StringComparison.OrdinalIgnoreCase))
                return "rv";
            if (vehicleType.Contains("Motorcycle", StringComparison.OrdinalIgnoreCase))
                return "motorcycle";
            if (vehicleType.Contains("Truck", StringComparison.OrdinalIgnoreCase))
                return "truck";
            if (vehicleType.Contains("Multipurpose", StringComparison.OrdinalIgnoreCase))
                return "car";
            if (vehicleType.Contains("Passenger", StringComparison.OrdinalIgnoreCase))
                return "car";
            if (vehicleType.Contains("Incomplete", StringComparison.OrdinalIgnoreCase))
                return "truck";
        }

        if (bodyClass != null)
        {
            if (bodyClass.Contains("Motor Home", StringComparison.OrdinalIgnoreCase))
                return "rv";
            if (bodyClass.Contains("Incomplete", StringComparison.OrdinalIgnoreCase))
                return "truck";
            if (bodyClass.Contains("Truck", StringComparison.OrdinalIgnoreCase))
                return "truck";
            if (bodyClass.Contains("Motorcycle", StringComparison.OrdinalIgnoreCase))
                return "motorcycle";
        }

        return null;
    }

    private sealed record VpicDecodeResponse(List<VpicDecodeResult>? Results);

    private sealed record VpicDecodeResult(
        string? VIN,
        string? Make,
        string? Model,
        string? ModelYear,
        string? Trim,
        string? EngineModel,
        string? TransmissionStyle,
        string? Manufacturer,
        string? Series,
        string? VehicleType,
        string? BodyClass,
        string? FuelTypePrimary,
        string? PlantCompanyName,
        string? PlantCity,
        string? ErrorCode
    );
}
