namespace BE.DTOs.OAuth;

public record ConnectedProviderDto(
    string Provider,          // "github"
    string? Username,         // provider username/display name
    DateTimeOffset ConnectedAt
);
