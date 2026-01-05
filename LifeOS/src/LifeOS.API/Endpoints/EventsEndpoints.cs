using System.Text.Json;

namespace LifeOS.API.Endpoints;

public static class EventsEndpoints
{
    public static void MapEventsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/v1/events/stream", async (HttpContext ctx) =>
        {
            ctx.Response.Headers.Append("Content-Type", "text/event-stream");
            ctx.Response.Headers.Append("Cache-Control", "no-cache");
            ctx.Response.Headers.Append("Connection", "keep-alive");

            await using var writer = new StreamWriter(ctx.Response.Body);

            while (!ctx.RequestAborted.IsCancellationRequested)
            {
                var payload = JsonSerializer.Serialize(new { type = "heartbeat", ts = DateTimeOffset.UtcNow });
                await writer.WriteAsync($"event: heartbeat\n");
                await writer.WriteAsync($"data: {payload}\n\n");
                await writer.FlushAsync();

                await Task.Delay(1000, ctx.RequestAborted);
            }
        })
        .WithTags("events");
    }
}
