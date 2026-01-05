using Retention.Domain.Entities;

namespace Retention.Domain.Services;

public interface IMasterIndexParser
{
    Task<MasterIndexData> ParseIndexFileAsync(string filePath);
}

public record MasterIndexData
{
    public List<DeckMetadata> Decks { get; init; } = new();
    public List<LearningPath> Pathways { get; init; } = new();
}

public record DeckMetadata
{
    public string FileName { get; init; } = string.Empty;
    public string Certification { get; init; } = string.Empty;
    public string Focus { get; init; } = string.Empty;
    public string Tools { get; init; } = string.Empty;
    public string Level { get; init; } = string.Empty; // Foundational, Intermediate, Expert
}

public record LearningPath
{
    public string Name { get; init; } = string.Empty;
    public List<PathStep> Steps { get; init; } = new();
}

public record PathStep
{
    public int Order { get; init; }
    public string PhaseName { get; init; } = string.Empty; // e.g. "Foundation"
    public List<string> DeckFiles { get; init; } = new();
}
