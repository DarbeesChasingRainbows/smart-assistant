using LifeOS.API.DTOs;
using LifeOS.Application.Common;
using Microsoft.AspNetCore.Mvc;
using SystemDateTime = System.DateTime;

namespace LifeOS.API.Endpoints;

/// <summary>
/// Example endpoint showing how to publish domain events
/// </summary>
public static class VehicleEventsExample
{
    public static void MapVehicleEventsExample(this IEndpointRouteBuilder routes)
    {
        routes.MapPost("/api/vehicles/example", async (
            [FromServices] SimpleEventPublisher eventPublisher,
            [FromBody] CreateVehicleRequest request) =>
        {
            // Create a new vehicle
            var vehicleCreatedEvent = new VehicleCreatedEvent
            {
                AggregateId = Guid.NewGuid(),
                VIN = request.VIN,
                Make = request.Make,
                Model = request.Model,
                Year = request.Year,
                InitialValue = 50000m // Default value
            };

            // Publish the event
            await eventPublisher.PublishEventAsync(vehicleCreatedEvent, "Garage");

            // Simulate vehicle maintenance
            var maintenanceEvent = new VehicleMaintainedEvent
            {
                AggregateId = vehicleCreatedEvent.AggregateId,
                Description = "Oil change and tire rotation",
                Cost = 150.00m,
                Date = SystemDateTime.Now
            };

            // Publish the maintenance event
            await eventPublisher.PublishEventAsync(maintenanceEvent, "Garage");

            // Simulate component installation
            var componentEvent = new ComponentInstalledEvent
            {
                AggregateId = vehicleCreatedEvent.AggregateId,
                ComponentName = "New Brake Pads",
                PartCost = 250.00m,
                InstallDate = SystemDateTime.Now
            };

            // Publish the component installation event
            await eventPublisher.PublishEventAsync(componentEvent, "Garage");

            return Results.Ok(new
            {
                Message = "Events published successfully",
                VehicleId = vehicleCreatedEvent.AggregateId,
                EventsPublished = 3
            });
        })
        .WithName("PublishVehicleEvents")
        .WithTags("examples");
    }
}
