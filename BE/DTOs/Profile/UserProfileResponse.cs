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

/// <summary>
/// Property names deliberately use a single leading capital (Github/Linkedin,
/// not GitHub/LinkedIn) so the global CamelCase JSON policy (Program.cs)
/// produces "github"/"linkedin" — matching FE's SocialLinks type exactly.
/// "GitHub"/"LinkedIn" would serialize as "gitHub"/"linkedIn" (capital
/// letter preserved mid-word), silently breaking every FE consumer of
/// profile.socialLinks.
/// </summary>
public record SocialLinksDto(
    string? Github,
    string? Linkedin,
    string? Portfolio,
    string? Twitter
);

public record CollegeVerificationDto(
    bool    IsVerified,
    string? CollegeName,
    string? VerifiedAt
);
