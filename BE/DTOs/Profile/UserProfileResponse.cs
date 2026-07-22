namespace BE.DTOs.Profile;

/// <summary>
/// The full developer profile returned by GET /api/profile.
/// 
/// This is a "read model" — it's shaped for the frontend's needs,
/// not a direct reflection of the DB row. Notice it has nested objects
/// (SocialLinks, CollegeVerification) even though the DB stores those
/// as flat columns or separate tables.
/// </summary>
public record UserProfileResponse(
    Guid   Id,
    string ClerkUserId,
    string Handle,
    string DisplayName,
    string Email,
    string? AvatarUrl,
    string? Bio,
    string? Location,
    int?   YearsOfExperience,
    IEnumerable<string> TechStack,
    SocialLinksDto SocialLinks,
    CollegeVerificationDto CollegeVerification,
    bool IsOpenToWork,
    int  ProfileCompletionPct,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

/// <summary>Nested object inside UserProfileResponse.</summary>
public record SocialLinksDto(
    string? GitHub,
    string? LinkedIn,
    string? Portfolio,
    string? Twitter
);

/// <summary>Nested object inside UserProfileResponse. College verification is a future checkpoint.</summary>
public record CollegeVerificationDto(
    bool    IsVerified,
    string? CollegeName,
    string? VerifiedAt
);
