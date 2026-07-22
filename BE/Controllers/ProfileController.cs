using BE.Common;
using BE.DTOs.Profile;
using BE.ServiceContracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

/// <summary>
/// Handles the developer profile lifecycle: read, update, and preferences.
/// 
/// Why [Authorize] on the class, not per-method?
/// All profile operations require authentication. Putting [Authorize] on the
/// class means every method inherits it — you can't accidentally add a method
/// and forget the attribute.
/// 
/// Why [Route("api/profile")] and not [Route("[controller]")]?
/// [controller] would produce "profile" (lowercase class name minus "Controller").
/// Explicitly writing "api/profile" matches the frontend's expected URL exactly
/// and makes the intent clear in the code.
/// </summary>
[Authorize]
[ApiController]
[Route("api/profile")]
public class ProfileController : ControllerBase
{
    private readonly IProfileService _profileService;

    public ProfileController(IProfileService profileService)
    {
        _profileService = profileService;
    }

    /// <summary>
    /// GET /api/profile
    /// Returns the full developer profile for the currently authenticated user.
    /// This is the endpoint that eliminates the "Backend not connected" banner.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        var profile = await _profileService.GetProfileAsync();
        return Ok(ApiResponse<UserProfileResponse>.Ok(profile));
    }

    /// <summary>
    /// PATCH /api/profile
    /// Partially updates the profile. Only fields present in the request body
    /// are changed — omitted fields are left as-is.
    /// </summary>
    [HttpPatch]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var updated = await _profileService.UpdateProfileAsync(request);
        return Ok(ApiResponse<UserProfileResponse>.Ok(updated, "Profile updated."));
    }

    /// <summary>
    /// POST /api/profile/open-to-work
    /// Toggles the user's visibility for company job matching.
    /// Separate from PATCH because this is a frequently-toggled boolean
    /// with a distinct business meaning — keeping it as its own endpoint
    /// makes it easier to add future logic (e.g., notifying companies
    /// when a user becomes open to work).
    /// </summary>
    [HttpPost("open-to-work")]
    public async Task<IActionResult> ToggleOpenToWork([FromBody] OpenToWorkRequest request)
    {
        var result = await _profileService.ToggleOpenToWorkAsync(request.IsOpenToWork);
        return Ok(ApiResponse<object>.Ok(new { isOpenToWork = result }));
    }
}
