using System.Text.Json;
using System.Text.RegularExpressions;
using BE.Common.Exceptions;
using BE.Data;
using BE.DTOs.Profile;
using BE.ServiceContracts;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class ProfileService : IProfileService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserService _userService;

    public ProfileService(
        AppDbContext db,
        ICurrentUserService currentUserService,
        IUserService userService)
    {
        _db                 = db;
        _currentUserService = currentUserService;
        _userService        = userService;
    }

    public async Task<UserProfileResponse> GetProfileAsync()
    {
        var clerkUserId = _currentUserService.GetClerkUserId();
        var email       = _currentUserService.GetEmail();

        // GetOrCreate ensures a User row exists even on first visit
        var user = await _userService.GetOrCreateUserAsync(clerkUserId, email);

        // Recalculate completion pct fresh every time it's fetched
        // (cheap enough to do on every GET — no need to cache)
        var completion = CalculateCompletionPct(user);
        if (completion != user.ProfileCompletionPct)
        {
            user.ProfileCompletionPct = completion;
            await _db.SaveChangesAsync();
        }

        return MapToResponse(user);
    }

    public async Task<UserProfileResponse> UpdateProfileAsync(UpdateProfileRequest request)
    {
        var clerkUserId = _currentUserService.GetClerkUserId();
        var email       = _currentUserService.GetEmail();
        var user        = await _userService.GetOrCreateUserAsync(clerkUserId, email);

        // Only update fields the caller provided (non-null values)
        // This is the partial update pattern — we don't overwrite fields
        // the caller didn't mention
        if (request.Handle            is not null) user.Handle             = request.Handle;
        if (request.Bio               is not null) user.Bio                = request.Bio;
        if (request.Location          is not null) user.Location           = request.Location;
        if (request.YearsOfExperience.HasValue) user.YearsOfExperience     = request.YearsOfExperience;
        if (request.TechStack         is not null) user.TechStackJson      = JsonSerializer.Serialize(request.TechStack);
        if (request.Degree            is not null) user.Degree             = request.Degree;
        if (request.GraduationYear.HasValue)    user.GraduationYear        = request.GraduationYear;
        if (request.MinStipend.HasValue)       user.MinStipend            = request.MinStipend;
        if (request.JobTypes          is not null) user.JobTypesJson       = JsonSerializer.Serialize(request.JobTypes);
        if (request.WorkPrefs         is not null) user.WorkPrefsJson      = JsonSerializer.Serialize(request.WorkPrefs);
        if (request.ContactEmail      is not null) user.ContactEmail       = request.ContactEmail;
        if (request.ContactPhone      is not null) user.ContactPhone       = request.ContactPhone;

        if (request.SocialLinks?.LinkedIn is not null)
            user.LinkedinUrl = NormalizeLinkedInUrl(request.SocialLinks.LinkedIn);

        user.ProfileCompletionPct = CalculateCompletionPct(user);

        await _db.SaveChangesAsync();
        return MapToResponse(user);
    }

    public async Task<bool> ToggleOpenToWorkAsync(bool isOpenToWork)
    {
        var clerkUserId = _currentUserService.GetClerkUserId();
        var email       = _currentUserService.GetEmail();
        var user        = await _userService.GetOrCreateUserAsync(clerkUserId, email);

        user.IsOpenToWork = isOpenToWork;
        await _db.SaveChangesAsync();
        return user.IsOpenToWork;
    }

    public async Task<object?> GetScoreBreakdownAsync()
    {
        var clerkUserId = _currentUserService.GetClerkUserId();
        var email       = _currentUserService.GetEmail();
        var user        = await _userService.GetOrCreateUserAsync(clerkUserId, email);

        // null until the AI worker writes the score row — the dashboard renders
        // fallback values for null, so we don't 404 here.
        var score = await _db.ProfileScores
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == user.Id);

        if (score is null || string.IsNullOrWhiteSpace(score.BreakdownJson)) return null;

        return JsonSerializer.Deserialize<object>(score.BreakdownJson);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static readonly Regex LinkedInHandlePattern = new(
        @"^[a-zA-Z0-9\-_%]{3,100}$", RegexOptions.Compiled);

    /// <summary>
    /// Accepts a full LinkedIn URL ("https://www.linkedin.com/in/jane-doe"),
    /// a bare "linkedin.com/in/jane-doe", or just a handle ("jane-doe") and
    /// normalizes all three to a canonical "https://www.linkedin.com/in/{handle}"
    /// URL. Mirrors Worker/app/ai_client.py's format_linkedin_url so the value
    /// the worker sends to the AI service and the value we store agree.
    /// An empty string clears the field (returns null). Throws BadRequestException
    /// for anything that doesn't look like a LinkedIn profile.
    /// </summary>
    private static string? NormalizeLinkedInUrl(string raw)
    {
        var trimmed = raw.Trim();
        if (trimmed.Length == 0) return null;

        string handle;
        if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("linkedin.com", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("www.linkedin.com", StringComparison.OrdinalIgnoreCase))
        {
            if (!Uri.TryCreate(
                    trimmed.Contains("://") ? trimmed : $"https://{trimmed}",
                    UriKind.Absolute, out var uri) ||
                !uri.Host.EndsWith("linkedin.com", StringComparison.OrdinalIgnoreCase))
            {
                throw new BadRequestException("That doesn't look like a linkedin.com profile URL.");
            }

            handle = uri.AbsolutePath.Trim('/').Split('/').LastOrDefault() ?? "";
        }
        else
        {
            handle = trimmed.Trim('/');
        }

        if (!LinkedInHandlePattern.IsMatch(handle))
            throw new BadRequestException(
                "Enter your LinkedIn profile URL or username, e.g. linkedin.com/in/jane-doe.");

        return $"https://www.linkedin.com/in/{handle}";
    }

    /// <summary>
    /// Calculates how complete the user's profile is (0-100%).
    /// Each filled-in field adds a fixed number of points.
    /// This keeps the logic centralised — when you add new profile fields,
    /// you add them here too.
    /// </summary>
    private static int CalculateCompletionPct(BE.Models.User user)
    {
        var points = 0;

        if (!string.IsNullOrWhiteSpace(user.Handle))          points += 10;
        if (!string.IsNullOrWhiteSpace(user.Bio))              points += 10;
        if (!string.IsNullOrWhiteSpace(user.GithubUrl))        points += 10;
        if (!string.IsNullOrWhiteSpace(user.TechStackJson) &&
            user.TechStackJson != "[]")                         points += 10;
        if (user.YearsOfExperience.HasValue)                    points += 10;
        if (!string.IsNullOrWhiteSpace(user.Degree))            points += 10;
        if (user.GraduationYear.HasValue)                       points += 10;
        if (user.MinStipend.HasValue)                           points += 10;
        if (!string.IsNullOrWhiteSpace(user.ContactEmail))      points += 10;
        if (!string.IsNullOrWhiteSpace(user.ContactPhone))      points += 10;

        return Math.Min(points, 100);
    }

    /// <summary>
    /// Maps a User DB entity to the API response DTO.
    /// This is where you translate DB column names to API field names
    /// and deserialize the TechStackJson string back to a list.
    /// </summary>
    private static UserProfileResponse MapToResponse(BE.Models.User user)
    {
        var techStack = string.IsNullOrWhiteSpace(user.TechStackJson)
            ? Array.Empty<string>()
            : JsonSerializer.Deserialize<string[]>(user.TechStackJson) ?? Array.Empty<string>();

        var jobTypes = string.IsNullOrWhiteSpace(user.JobTypesJson)
            ? Array.Empty<string>()
            : JsonSerializer.Deserialize<string[]>(user.JobTypesJson) ?? Array.Empty<string>();

        var workPrefs = string.IsNullOrWhiteSpace(user.WorkPrefsJson)
            ? Array.Empty<string>()
            : JsonSerializer.Deserialize<string[]>(user.WorkPrefsJson) ?? Array.Empty<string>();

        return new UserProfileResponse(
            Id:                   user.Id,
            ClerkUserId:          user.ClerkUserId,
            Handle:               user.Handle ?? $"@{user.Email.Split('@')[0].ToLower()}.dev",
            DisplayName:          user.Email.Split('@')[0],
            Email:                user.Email,
            AvatarUrl:            null,
            Bio:                  user.Bio,
            Location:             user.Location,
            YearsOfExperience:    user.YearsOfExperience,
            TechStack:            techStack,
            SocialLinks:          new SocialLinksDto(user.GithubUrl, user.LinkedinUrl, null, null),
            CollegeVerification:  new CollegeVerificationDto(false, null, null),
            Degree:               user.Degree,
            GraduationYear:       user.GraduationYear,
            MinStipend:           user.MinStipend,
            JobTypes:             jobTypes,
            WorkPrefs:            workPrefs,
            ContactEmail:         user.ContactEmail,
            ContactPhone:         user.ContactPhone,
            IsOpenToWork:         user.IsOpenToWork,
            ProfileCompletionPct: user.ProfileCompletionPct,
            CreatedAt:            user.CreatedAt,
            UpdatedAt:            user.CreatedAt
        );
    }
}
