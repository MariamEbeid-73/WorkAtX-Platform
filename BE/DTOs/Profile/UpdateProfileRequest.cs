public record UpdateProfileRequest(
    string? Handle,
    string? Bio,
    string? Location,
    int?    YearsOfExperience,
    IEnumerable<string>? TechStack
    // GithubUrl and LinkedinUrl removed — set only by OAuth
);
