using System.Text.Json.Serialization;

namespace LifeOS.Infrastructure.Persistence.Documents;

public class PeopleEmploymentDocument
{
    [JsonPropertyName("_key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_rev")]
    public string? Rev { get; set; }

    [JsonPropertyName("personId")]
    public string PersonId { get; set; } = string.Empty;

    [JsonPropertyName("employer")]
    public string Employer { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("employmentType")]
    public string? EmploymentType { get; set; }

    [JsonPropertyName("startDate")]
    public DateTime StartDate { get; set; }

    [JsonPropertyName("endDate")]
    public DateTime? EndDate { get; set; }

    [JsonPropertyName("isCurrent")]
    public bool IsCurrent { get; set; }

    [JsonPropertyName("location")]
    public string? Location { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public class PeopleRelationshipEdge
{
    [JsonPropertyName("_key")]
    public string? Key { get; set; }

    [JsonPropertyName("_id")]
    public string? Id { get; set; }

    [JsonPropertyName("_from")]
    public string From { get; set; } = string.Empty;

    [JsonPropertyName("_to")]
    public string To { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("startDate")]
    public DateTime? StartDate { get; set; }

    [JsonPropertyName("endDate")]
    public DateTime? EndDate { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("isValid")]
    public bool IsValid { get; set; } = true;

    [JsonPropertyName("invalidatedAt")]
    public DateTime? InvalidatedAt { get; set; }

    [JsonPropertyName("invalidatedReason")]
    public string? InvalidatedReason { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}
