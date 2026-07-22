using System.Text.Json;
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
        if (request.Handle    is not null) user.Handle             = request.Handle;
        if (request.Bio       is not null) user.Bio                = request.Bio;
        if (request.Location  is not null) user.Location           = request.Location;
        if (request.YearsOfExperience.HasValue) user.YearsOfExperience = request.YearsOfExperience;
        if (request.TechStack is not null) user.TechStackJson      = JsonSerializer.Serialize(request.TechStack);

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

    // ── Private helpers ───────────────────────────────────────────────────────

    /// <summary>
    /// Calculates how complete the user's profile is (0-100%).
    /// Each filled-in field adds a fixed number of points.
    /// This keeps the logic centralised — when you add new profile fields,
    /// you add them here too.
    /// </summary>
    private static int CalculateCompletionPct(BE.Models.User user)
    {
        // 5 checkpoints, each worth 20 points = 100 max
        var points = 0;

        if (!string.IsNullOrWhiteSpace(user.Handle))   points += 20;
        if (!string.IsNullOrWhiteSpace(user.Bio))       points += 20;
        if (!string.IsNullOrWhiteSpace(user.GithubUrl)) points += 20;
        if (!string.IsNullOrWhiteSpace(user.TechStackJson) &&
            user.TechStackJson != "[]")                 points += 20;
        if (user.YearsOfExperience.HasValue)            points += 20;

        return points;
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

        return new UserProfileResponse(
            Id:                   user.Id,
            ClerkUserId:          user.ClerkUserId,
            Handle:               user.Handle ?? $"@{user.Email.Split('@')[0].ToLower()}.dev",
            DisplayName:          user.Email.Split('@')[0],  // placeholder until Clerk name is synced
            Email:                user.Email,
            AvatarUrl:            null,           // comes from Clerk — not stored in our DB
            Bio:                  user.Bio,
            Location:             user.Location,
            YearsOfExperience:    user.YearsOfExperience,
            TechStack:            techStack,
            SocialLinks:          new SocialLinksDto(user.GithubUrl, user.LinkedinUrl, null, null),
            CollegeVerification:  new CollegeVerificationDto(false, null, null), // future checkpoint
            IsOpenToWork:         user.IsOpenToWork,
            ProfileCompletionPct: user.ProfileCompletionPct,
            CreatedAt:            user.CreatedAt,
            UpdatedAt:            user.CreatedAt  // no UpdatedAt column on User yet — same as CreatedAt for now
        );
    }
}
