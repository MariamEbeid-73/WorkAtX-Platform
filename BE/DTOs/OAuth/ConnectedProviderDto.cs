namespace BE.DTOs.OAuth;

public record ConnectedProviderDto(
    string Provider,          // "github" | "linkedin"
    string? Username,         // provider username/display name
    DateTimeOffset ConnectedAt
);
