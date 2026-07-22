namespace BE.DTOs.GitHub;

public record GitHubIdentityResponse(
    bool    IsLinked,
    string? GithubUsername,
    string? GithubProfileUrl,
    int?    PublicRepos,
    int?    Followers,
    int?    Contributions,
    IEnumerable<string>? TopLanguages,
    DateTimeOffset? VerifiedAt
);
