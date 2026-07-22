namespace BE.DTOs.GitHub;

public record GitHubIdentityResponse(
    bool    IsLinked,
    string? GitHubUsername,
    string? GitHubProfileUrl,
    int?    PublicRepos,
    int?    Followers,
    int?    Contributions,
    IEnumerable<string>? TopLanguages,
    DateTimeOffset? VerifiedAt
);
