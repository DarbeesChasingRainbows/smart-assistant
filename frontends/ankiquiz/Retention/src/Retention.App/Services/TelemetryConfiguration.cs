using System.Diagnostics;
using System.Diagnostics.Metrics;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace Retention.App.Services;

/// <summary>
/// OpenTelemetry configuration for distributed tracing and metrics.
/// </summary>
public static class TelemetryConfiguration
{
    public const string ServiceName = "AnkiQuiz.Retention";
    public const string ServiceVersion = "1.0.0";

    // Activity source for custom tracing
    public static readonly ActivitySource ActivitySource = new(ServiceName, ServiceVersion);

    // Meter for custom metrics
    public static readonly Meter Meter = new(ServiceName, ServiceVersion);

    // Custom metrics
    public static readonly Counter<long> QuizzesGenerated = Meter.CreateCounter<long>(
        "ankiquiz.quizzes.generated",
        description: "Number of quizzes generated");

    public static readonly Counter<long> CardsReviewed = Meter.CreateCounter<long>(
        "ankiquiz.cards.reviewed",
        description: "Number of flashcards reviewed");

    public static readonly Counter<long> CorrectAnswers = Meter.CreateCounter<long>(
        "ankiquiz.answers.correct",
        description: "Number of correct answers");

    public static readonly Counter<long> IncorrectAnswers = Meter.CreateCounter<long>(
        "ankiquiz.answers.incorrect",
        description: "Number of incorrect answers");

    public static readonly Histogram<double> QuizDuration = Meter.CreateHistogram<double>(
        "ankiquiz.quiz.duration",
        unit: "ms",
        description: "Duration of quiz sessions in milliseconds");

    public static readonly Counter<long> UsersCreated = Meter.CreateCounter<long>(
        "ankiquiz.users.created",
        description: "Number of users created");

    public static readonly Counter<long> DecksImported = Meter.CreateCounter<long>(
        "ankiquiz.decks.imported",
        description: "Number of decks imported");

    public static readonly Counter<long> ApiErrors = Meter.CreateCounter<long>(
        "ankiquiz.api.errors",
        description: "Number of API errors");

    /// <summary>
    /// Configures OpenTelemetry for the application.
    /// </summary>
    public static IServiceCollection AddTelemetry(this IServiceCollection services, IConfiguration configuration)
    {
        var otlpEndpoint = configuration["OpenTelemetry:OtlpEndpoint"];
        var enableConsoleExporter = configuration.GetValue<bool>("OpenTelemetry:EnableConsoleExporter", true);

        services.AddOpenTelemetry()
            .ConfigureResource(resource => resource
                .AddService(
                    serviceName: ServiceName,
                    serviceVersion: ServiceVersion,
                    serviceInstanceId: Environment.MachineName)
                .AddAttributes(new Dictionary<string, object>
                {
                    ["deployment.environment"] = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development",
                    ["service.namespace"] = "AnkiQuiz"
                }))
            .WithTracing(tracing =>
            {
                tracing
                    .AddSource(ServiceName)
                    .AddAspNetCoreInstrumentation(options =>
                    {
                        options.RecordException = true;
                        options.Filter = httpContext =>
                        {
                            // Filter out health check endpoints from tracing
                            var path = httpContext.Request.Path.Value;
                            return path != "/health" && !path?.StartsWith("/swagger") == true;
                        };
                    })
                    .AddHttpClientInstrumentation(options =>
                    {
                        options.RecordException = true;
                    });

                if (enableConsoleExporter)
                {
                    tracing.AddConsoleExporter();
                }

                if (!string.IsNullOrEmpty(otlpEndpoint))
                {
                    tracing.AddOtlpExporter(options =>
                    {
                        options.Endpoint = new Uri(otlpEndpoint);
                    });
                }
            })
            .WithMetrics(metrics =>
            {
                metrics
                    .AddMeter(ServiceName)
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation();

                if (enableConsoleExporter)
                {
                    metrics.AddConsoleExporter((exporterOptions, metricReaderOptions) =>
                    {
                        metricReaderOptions.PeriodicExportingMetricReaderOptions.ExportIntervalMilliseconds = 60000; // Every minute
                    });
                }

                if (!string.IsNullOrEmpty(otlpEndpoint))
                {
                    metrics.AddOtlpExporter(options =>
                    {
                        options.Endpoint = new Uri(otlpEndpoint);
                    });
                }
            });

        return services;
    }

    /// <summary>
    /// Creates a new activity (span) for custom tracing.
    /// </summary>
    public static Activity? StartActivity(string name, ActivityKind kind = ActivityKind.Internal)
    {
        return ActivitySource.StartActivity(name, kind);
    }

    /// <summary>
    /// Records a quiz generation event.
    /// </summary>
    public static void RecordQuizGenerated(string difficulty, int cardCount, Guid? deckId = null)
    {
        QuizzesGenerated.Add(1, 
            new KeyValuePair<string, object?>("difficulty", difficulty),
            new KeyValuePair<string, object?>("card_count", cardCount),
            new KeyValuePair<string, object?>("deck_id", deckId?.ToString() ?? "all"));
    }

    /// <summary>
    /// Records a card review event.
    /// </summary>
    public static void RecordCardReview(bool isCorrect, string difficulty)
    {
        CardsReviewed.Add(1,
            new KeyValuePair<string, object?>("difficulty", difficulty));

        if (isCorrect)
        {
            CorrectAnswers.Add(1,
                new KeyValuePair<string, object?>("difficulty", difficulty));
        }
        else
        {
            IncorrectAnswers.Add(1,
                new KeyValuePair<string, object?>("difficulty", difficulty));
        }
    }

    /// <summary>
    /// Records an API error.
    /// </summary>
    public static void RecordApiError(string endpoint, string errorType)
    {
        ApiErrors.Add(1,
            new KeyValuePair<string, object?>("endpoint", endpoint),
            new KeyValuePair<string, object?>("error_type", errorType));
    }
}
