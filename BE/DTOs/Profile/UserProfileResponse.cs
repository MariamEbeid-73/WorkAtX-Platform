namespace BE.DTOs.Profile;

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
    string? Degree,
    int?    GraduationYear,
    int?    MinStipend,
    IEnumerable<string> JobTypes,
    IEnumerable<string> WorkPrefs,
    string? ContactEmail,
    string? ContactPhone,
    bool IsOpenToWork,
    int  ProfileCompletionPct,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

public record SocialLinksDto(
    string? GitHub,
    string? LinkedIn,
    string? Portfolio,
    string? Twitter
);

public record CollegeVerificationDto(
    bool    IsVerified,
    string? CollegeName,
    string? VerifiedAt
);
