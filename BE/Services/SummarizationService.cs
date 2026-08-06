using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using BE.ServiceContracts;

namespace BE.Services;

/// <summary>
/// Calls a dedicated, independent summarization AI endpoint (a small/cheap
/// model unrelated to the main career-coaching AI). Configured via
/// Summarization:ApiUrl / Summarization:ApiKey / Summarization:Model —
/// works with any OpenAI-compatible chat-completions endpoint.
/// </summary>
public class SummarizationService : ISummarizationService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<SummarizationService> _logger;

    public SummarizationService(
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        ILogger<SummarizationService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _config = config;
        _logger = logger;
    }

    public async Task<string> SummarizeAsync(
    string? previousSummary,
    IReadOnlyList<ChatTurn> newTurns,
    CancellationToken ct = default)
{
    try
    {
        var apiUrl = _config["Summarization:ApiUrl"];
        if (string.IsNullOrWhiteSpace(apiUrl))
        {
            _logger.LogWarning(
                "Summarization:ApiUrl is not configured; skipping external summarization and keeping previous summary.");
            return previousSummary ?? string.Empty;
        }

        var apiKey = _config["Summarization:ApiKey"] ?? "";
        var model = _config["Summarization:Model"] ?? "gpt-4o-mini";

        var transcript = string.Join("\n", newTurns.Select(t => $"{t.Role}: {t.Content}"));

        var systemPrompt =
            "You are a summarization utility. Given a running summary of a career-coaching " +
            "conversation and new turns, produce an updated, concise running summary " +
            "(max ~150 words). Preserve concrete facts: target roles, skills discussed, " +
            "decisions made. Do not add commentary, only output the summary text.";

        var userPrompt = string.IsNullOrWhiteSpace(previousSummary)
            ? $"New conversation turns:\n{transcript}"
            : $"Previous summary:\n{previousSummary}\n\nNew conversation turns:\n{transcript}";

        var requestBody = new
        {
            model,
            messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt }
            },
            temperature = 0.2,
            max_tokens = 300
        };

        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(20);

        using var request = new HttpRequestMessage(HttpMethod.Post, apiUrl)
        {
            Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        };
        if (!string.IsNullOrEmpty(apiKey))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        var response = await client.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(json);

        var summary = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();

        return summary?.Trim() ?? previousSummary ?? string.Empty;
    }
    catch (Exception ex)
    {
        _logger.LogWarning(ex, "Summarization call failed; keeping previous summary.");
        return previousSummary ?? string.Empty;
    }
}
}
