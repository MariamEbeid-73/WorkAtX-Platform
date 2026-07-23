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
    string? ContactPhone
);
