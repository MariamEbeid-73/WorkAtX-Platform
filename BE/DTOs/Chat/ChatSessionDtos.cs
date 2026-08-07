namespace BE.DTOs.Chat;

public record CreateSessionRequest(string? Title);

public record ChatSessionResponse(
    Guid Id,
    string? Title,
    string Status,
    DateTimeOffset? LastMessageAt,
    DateTimeOffset CreatedAt);

/// <param name="Result">
/// The full structured gap_analysis/study_plan payload (from
/// UserGapAnalyses/UserStudyPlans), keyed by JobId. Null for normal_text
/// and user messages — Content already carries those. Lets the frontend
/// redraw the rich card on session reload without an extra round trip
/// per message.
/// </param>
public record ChatMessageResponse(
    Guid Id,
    string Role,
    string Content,
    string? ResponseType,
    Guid? JobId,
    object? Result,
    DateTimeOffset CreatedAt);

public record RenameSessionRequest(string Title);

public record SendMessageResponse(Guid JobId, Guid SessionId);