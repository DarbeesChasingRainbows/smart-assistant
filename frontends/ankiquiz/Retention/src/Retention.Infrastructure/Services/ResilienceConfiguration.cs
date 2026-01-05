using System.Net;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http.Resilience;
using Polly;
using Polly.Retry;
using Polly.Timeout;

namespace Retention.Infrastructure.Services;

/// <summary>
/// Provides resilience configuration for HTTP clients using Polly.
/// Implements Circuit Breaker, Retry, and Timeout patterns.
/// </summary>
public static class ResilienceConfiguration
{
    /// <summary>
    /// Configures a resilient HTTP client with retry, circuit breaker, and timeout policies.
    /// </summary>
    public static IServiceCollection AddResilientHttpClient(
        this IServiceCollection services,
        string clientName,
        Action<ResilientHttpClientOptions>? configureOptions = null)
    {
        var options = new ResilientHttpClientOptions();
        configureOptions?.Invoke(options);

        services.AddHttpClient(clientName)
            .AddResilienceHandler($"{clientName}-resilience", builder =>
            {
                // Outer timeout - total time for all retries
                builder.AddTimeout(new TimeoutStrategyOptions
                {
                    Timeout = options.TotalTimeout,
                    Name = $"{clientName}-total-timeout"
                });

                // Retry strategy with exponential backoff and Retry-After header support
                builder.AddRetry(new HttpRetryStrategyOptions
                {
                    MaxRetryAttempts = options.MaxRetryAttempts,
                    Delay = options.RetryDelay,
                    BackoffType = DelayBackoffType.Exponential,
                    UseJitter = true,
                    ShouldHandle = args => ValueTask.FromResult(ShouldRetry(args.Outcome)),
                    DelayGenerator = args =>
                    {
                        // Respect Retry-After header from rate-limited responses
                        if (args.Outcome.Result is HttpResponseMessage response &&
                            response.Headers.RetryAfter?.Delta is TimeSpan delta)
                        {
                            Console.WriteLine($"[Resilience] Using Retry-After header: {delta.TotalSeconds}s");
                            return new ValueTask<TimeSpan?>(delta);
                        }
                        
                        // Fall back to exponential backoff
                        return new ValueTask<TimeSpan?>((TimeSpan?)null);
                    },
                    OnRetry = args =>
                    {
                        Console.WriteLine($"[Resilience] Retry attempt {args.AttemptNumber} for {clientName} after {args.RetryDelay.TotalMilliseconds}ms");
                        return ValueTask.CompletedTask;
                    }
                });

                // Circuit breaker
                builder.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
                {
                    FailureRatio = options.CircuitBreakerFailureRatio,
                    MinimumThroughput = options.CircuitBreakerMinimumThroughput,
                    SamplingDuration = options.CircuitBreakerSamplingDuration,
                    BreakDuration = options.CircuitBreakerBreakDuration,
                    ShouldHandle = args => ValueTask.FromResult(ShouldBreakCircuit(args.Outcome)),
                    OnOpened = args =>
                    {
                        Console.WriteLine($"[Resilience] Circuit breaker OPENED for {clientName}. Break duration: {args.BreakDuration.TotalSeconds}s");
                        CircuitBreakerStateTracker.UpdateState(clientName, "Open", (int)args.BreakDuration.TotalSeconds);
                        return ValueTask.CompletedTask;
                    },
                    OnClosed = args =>
                    {
                        Console.WriteLine($"[Resilience] Circuit breaker CLOSED for {clientName}");
                        CircuitBreakerStateTracker.UpdateState(clientName, "Closed");
                        return ValueTask.CompletedTask;
                    },
                    OnHalfOpened = args =>
                    {
                        Console.WriteLine($"[Resilience] Circuit breaker HALF-OPENED for {clientName}");
                        CircuitBreakerStateTracker.UpdateState(clientName, "HalfOpen");
                        return ValueTask.CompletedTask;
                    }
                });

                // Inner timeout - per-attempt timeout
                builder.AddTimeout(new TimeoutStrategyOptions
                {
                    Timeout = options.PerAttemptTimeout,
                    Name = $"{clientName}-attempt-timeout"
                });
            });

        return services;
    }

    /// <summary>
    /// Configures a resilient HTTP client specifically for the Dictionary API.
    /// </summary>
    public static IServiceCollection AddDictionaryApiClient(this IServiceCollection services)
    {
        return services.AddResilientHttpClient("DictionaryApi", options =>
        {
            options.MaxRetryAttempts = 3;
            options.RetryDelay = TimeSpan.FromMilliseconds(500);
            options.TotalTimeout = TimeSpan.FromSeconds(30);
            options.PerAttemptTimeout = TimeSpan.FromSeconds(10);
            options.CircuitBreakerBreakDuration = TimeSpan.FromSeconds(30);
            options.CircuitBreakerFailureRatio = 0.5;
            options.CircuitBreakerMinimumThroughput = 5;
        });
    }

    private static bool ShouldRetry(Outcome<HttpResponseMessage> outcome)
    {
        if (outcome.Exception is HttpRequestException or TimeoutRejectedException)
            return true;

        if (outcome.Result is null)
            return false;

        var statusCode = outcome.Result.StatusCode;
        return statusCode switch
        {
            HttpStatusCode.RequestTimeout => true,
            HttpStatusCode.TooManyRequests => true,
            >= HttpStatusCode.InternalServerError => true,
            _ => false
        };
    }

    private static bool ShouldBreakCircuit(Outcome<HttpResponseMessage> outcome)
    {
        if (outcome.Exception is HttpRequestException)
            return true;

        if (outcome.Result is null)
            return false;

        return outcome.Result.StatusCode >= HttpStatusCode.InternalServerError;
    }

    /// <summary>
    /// Extracts retry-after duration from an HTTP response if available.
    /// </summary>
    public static TimeSpan? GetRetryAfter(HttpResponseMessage? response)
    {
        if (response?.Headers.RetryAfter?.Delta is TimeSpan delta)
            return delta;
        
        if (response?.Headers.RetryAfter?.Date is DateTimeOffset date)
            return date - DateTimeOffset.UtcNow;
        
        return null;
    }
}

/// <summary>
/// Tracks circuit breaker states across HTTP clients for status reporting.
/// </summary>
public static class CircuitBreakerStateTracker
{
    private static readonly Dictionary<string, CircuitBreakerState> _states = new();
    private static readonly object _lock = new();

    public static void UpdateState(string clientName, string state, int? retryAfterSeconds = null)
    {
        lock (_lock)
        {
            _states[clientName] = new CircuitBreakerState
            {
                State = state,
                LastStateChange = DateTime.UtcNow,
                RetryAfterSeconds = retryAfterSeconds
            };
        }
    }

    public static CircuitBreakerState? GetState(string clientName)
    {
        lock (_lock)
        {
            return _states.TryGetValue(clientName, out var state) ? state : null;
        }
    }

    public static Dictionary<string, CircuitBreakerState> GetAllStates()
    {
        lock (_lock)
        {
            return new Dictionary<string, CircuitBreakerState>(_states);
        }
    }
}

public class CircuitBreakerState
{
    public string State { get; set; } = "Closed";
    public DateTime LastStateChange { get; set; }
    public int? RetryAfterSeconds { get; set; }
}

/// <summary>
/// Configuration options for resilient HTTP clients.
/// </summary>
public class ResilientHttpClientOptions
{
    public int MaxRetryAttempts { get; set; } = 3;
    public TimeSpan RetryDelay { get; set; } = TimeSpan.FromMilliseconds(200);
    public TimeSpan TotalTimeout { get; set; } = TimeSpan.FromSeconds(30);
    public TimeSpan PerAttemptTimeout { get; set; } = TimeSpan.FromSeconds(10);
    public double CircuitBreakerFailureRatio { get; set; } = 0.5;
    public int CircuitBreakerMinimumThroughput { get; set; } = 10;
    public TimeSpan CircuitBreakerSamplingDuration { get; set; } = TimeSpan.FromSeconds(30);
    public TimeSpan CircuitBreakerBreakDuration { get; set; } = TimeSpan.FromSeconds(30);
}
