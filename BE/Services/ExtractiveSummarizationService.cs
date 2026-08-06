using System.Text;
using BE.ServiceContracts;

namespace BE.Services;

/// <summary>
/// Zero-dependency, no-network summarizer used when Summarization:Provider
/// is "extractive" (the default, and the only option that works without any
/// external API key configured). Keeps a rolling plain-text summary by
/// appending a trimmed version of each new turn onto the previous summary
/// and truncating to a max character budget. Always succeeds — there's no
/// HTTP call to fail.
/// </summary>
public class ExtractiveSummarizationService : ISummarizationService
{
    // ~150-200 words, matching the target size the external provider's
    // prompt asks for, so downstream consumers see comparable summary sizes
    // regardless of which provider is configured.
    private const int MaxSummaryChars = 1200;

    public Task<string> SummarizeAsync(
        string? previousSummary,
        IReadOnlyList<ChatTurn> newTurns,
        CancellationToken ct = default)
    {
        var sb = new StringBuilder();

        if (!string.IsNullOrWhiteSpace(previousSummary))
            sb.Append(previousSummary.Trim());

        foreach (var turn in newTurns)
        {
            if (string.IsNullOrWhiteSpace(turn.Content))
                continue;

            if (sb.Length > 0)
                sb.Append(" | ");

            sb.Append(turn.Role == ChatMessageRoleNames.User ? "User asked: " : "Assistant: ");
            sb.Append(Truncate(turn.Content.Trim(), 200));
        }

        var result = sb.ToString();

        // Rolling window: keep only the most recent MaxSummaryChars,
        // dropping the oldest content from the front once it grows past
        // the budget, so this never grows unbounded across a long session.
        if (result.Length > MaxSummaryChars)
            result = result[^MaxSummaryChars..];

        return Task.FromResult(result);
    }

    private static string Truncate(string text, int maxChars) =>
        text.Length <= maxChars ? text : text[..maxChars] + "…";

    // Local alias so this file doesn't need a using for BE.Models just for
    // one string constant comparison.
    private static class ChatMessageRoleNames
    {
        public const string User = "user";
    }
}