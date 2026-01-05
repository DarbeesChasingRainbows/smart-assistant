using Microsoft.AspNetCore.Mvc;
using Retention.Infrastructure.Services;

namespace Retention.App.Controllers;

/// <summary>
/// Provides system status information including circuit breaker states.
/// </summary>
[ApiController]
[Route("api/v1/system")]
public class SystemStatusController : ControllerBase
{
    /// <summary>
    /// Gets the current system status including circuit breaker states.
    /// </summary>
    [HttpGet("status")]
    public ActionResult<SystemStatusResponse> GetStatus()
    {
        var circuitStates = CircuitBreakerStateTracker.GetAllStates();
        
        return Ok(new SystemStatusResponse
        {
            Status = "Healthy",
            CircuitBreakers = circuitStates.ToDictionary(
                kvp => kvp.Key,
                kvp => new CircuitBreakerStatusDto
                {
                    State = kvp.Value.State,
                    LastStateChange = kvp.Value.LastStateChange,
                    RetryAfterSeconds = kvp.Value.RetryAfterSeconds
                })
        });
    }
}

public class SystemStatusResponse
{
    public string Status { get; set; } = "Healthy";
    public Dictionary<string, CircuitBreakerStatusDto> CircuitBreakers { get; set; } = new();
}

public class CircuitBreakerStatusDto
{
    public string State { get; set; } = "Closed";
    public DateTime LastStateChange { get; set; }
    public int? RetryAfterSeconds { get; set; }
}
