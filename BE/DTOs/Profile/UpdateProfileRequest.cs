public record UpdateProfileRequest(
    string? Handle,
    string? Bio,
    string? Location,
    int?    YearsOfExperience,
    IEnumerable<string>? TechStack,
    string? Degree,
    int?    GraduationYear,
    int?    MinStipend,
    IEnumerable<string>? JobTypes,
    IEnumerable<string>? WorkPrefs,
    string? ContactEmail,
    string? ContactPhone,
    SocialLinksUpdateRequest? SocialLinks
);

/// <summary>
/// Partial update for social links. Only <see cref="LinkedIn"/> is
/// writable here — GitHub stays OAuth-owned (see OAuthTokenService) since
/// the developer-identity card needs a live, verified token, not just a URL.
/// A present-but-empty string clears the field; omitting the property
/// (null) leaves it untouched, matching the rest of this DTO's semantics.
/// </summary>
public record SocialLinksUpdateRequest(
    string? LinkedIn
);
