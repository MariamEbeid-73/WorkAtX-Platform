namespace BE.DTOs.Chat;

public record CreateSessionRequest(string? Title);

public record ChatSessionResponse(
    Guid Id,
    string? Title,
    string Status,
    DateTimeOffset? LastMessageAt,
    DateTimeOffset CreatedAt);

public record ChatMessageResponse(
    Guid Id,
    string Role,
    string Content,
    string? ResponseType,
    Guid? JobId,
    DateTimeOffset CreatedAt);

public record RenameSessionRequest(string Title);

public record SendMessageResponse(Guid JobId, Guid SessionId);