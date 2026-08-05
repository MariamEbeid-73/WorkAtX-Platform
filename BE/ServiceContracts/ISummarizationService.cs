namespace BE.ServiceContracts;

public record ChatTurn(string Role, string Content);

/// <summary>
/// Produces a rolling summary of a chat session's history. This is a
/// completely separate concern from the career-coaching AI
/// </summary>
public interface ISummarizationService
{
    Task<string> SummarizeAsync(
        string? previousSummary,
        IReadOnlyList<ChatTurn> newTurns,
        CancellationToken ct = default);
}