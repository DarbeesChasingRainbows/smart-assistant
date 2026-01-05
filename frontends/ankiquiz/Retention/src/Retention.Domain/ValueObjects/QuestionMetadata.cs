namespace Retention.Domain.ValueObjects;

public enum QuestionType
{
    Simple,
    MultipleChoice,
    ScenarioBased,
    MultiPart
}

public record QuestionMetadata
{
    public QuestionType Type { get; init; }
    public List<string> Options { get; init; } = new();
    public List<string> CorrectAnswers { get; init; } = new();
    public string Scenario { get; init; } = string.Empty;
    public Dictionary<string, object> AdditionalData { get; init; } = new();

    public static QuestionMetadata Simple() => new() { Type = QuestionType.Simple };

    public static QuestionMetadata MultipleChoice(List<string> options, List<string> correctAnswers)
        => new() { Type = QuestionType.MultipleChoice, Options = options, CorrectAnswers = correctAnswers };

    public static QuestionMetadata ScenarioBased(string scenario, List<string> options, List<string> correctAnswers)
        => new() { Type = QuestionType.ScenarioBased, Scenario = scenario, Options = options, CorrectAnswers = correctAnswers };
}
