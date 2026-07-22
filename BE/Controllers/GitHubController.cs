using BE.Common;
using BE.DTOs.GitHub;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[Authorize]
[ApiController]
[Route("api/github")]
public class GitHubController : ControllerBase
{
    /// <summary>
    /// GET /api/github/verify
    /// Returns the user's GitHub connection status.
    /// 
    /// CURRENT STATE (stub): Always returns isLinked: false.
    /// The DeveloperIdentityCard shows the "Verify with GitHub" button.
    /// 
    /// FUTURE STATE (after Checkpoint 3): Query OAuthTokens table,
    /// decrypt access token, call GET https://api.github.com/user,
    /// return real data.
    /// </summary>
    [HttpGet("verify")]
    public IActionResult GetGitHubIdentity()
    {
        var response = new GitHubIdentityResponse(
            IsLinked:       false,
            GitHubUsername: null,
            GitHubProfileUrl: null,
            PublicRepos:    null,
            Followers:      null,
            Contributions:  null,
            TopLanguages:   null,
            VerifiedAt:     null
        );

        return Ok(ApiResponse<GitHubIdentityResponse>.Ok(response));
    }
}
