namespace BE.DTOs.Me;

public record MeResponse(
    Guid Id,
    string ClerkUserId,
    string Email,
    string Plan,
    int? MessagesRemainingToday,
    DateTimeOffset? MessagesResetAt
);