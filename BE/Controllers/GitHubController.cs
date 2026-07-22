using BE.Common;
using BE.DTOs.GitHub;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using System.Net.Http.Headers;
using System.Text.Json;
using BE.Common.Encryption;
using BE.Data;
using BE.ServiceContracts;
using Microsoft.EntityFrameworkCore;

namespace BE.Controllers;

[ApiController]
[Route("api/github")]
public class GitHubController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserService _userService;
    private readonly IAesEncryptionService _encryption;
    private readonly IHttpClientFactory _httpClientFactory;

    public GitHubController(
        AppDbContext db,
        ICurrentUserService currentUserService,
        IUserService userService,
        IAesEncryptionService encryption,
        IHttpClientFactory httpClientFactory)
    {
        _db                 = db;
        _currentUserService = currentUserService;
        _userService        = userService;
        _encryption         = encryption;
        _httpClientFactory  = httpClientFactory;
    }

    /// <summary>
    /// GET /api/github/verify
    /// Returns the user's real GitHub connection status and profile stats.
    /// </summary>
    [Authorize]
    [HttpGet("verify")]
    public async Task<IActionResult> GetGitHubIdentity()
    {
        var clerkUserId = _currentUserService.GetClerkUserId();
        var user = await _userService.GetByClerkIdAsync(clerkUserId);

        if (user == null)
            return Ok(ApiResponse<GitHubIdentityResponse>.Ok(CreateUnlinkedResponse()));

        var tokenRecord = await _db.OAuthTokens
            .FirstOrDefaultAsync(t => t.UserId == user.Id && t.Provider == "github");

        if (tokenRecord == null)
            return Ok(ApiResponse<GitHubIdentityResponse>.Ok(CreateUnlinkedResponse()));

        try
        {
            var accessToken = _encryption.Decrypt(tokenRecord.EncryptedAccessToken);

            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            client.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("WorkX", "1.0"));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var profileResponse = await client.GetFromJsonAsync<JsonElement>("https://api.github.com/user");
            
            var response = new GitHubIdentityResponse(
                IsLinked:       true,
                GithubUsername: profileResponse.GetProperty("login").GetString(),
                GithubProfileUrl: profileResponse.GetProperty("html_url").GetString(),
                PublicRepos:    profileResponse.GetProperty("public_repos").GetInt32(),
                Followers:      profileResponse.GetProperty("followers").GetInt32(),
                Contributions:  null, // Would require GraphQL or scraping
                TopLanguages:   null, // Would require fetching user's repos and aggregating languages
                VerifiedAt:     tokenRecord.UpdatedAt
            );

            return Ok(ApiResponse<GitHubIdentityResponse>.Ok(response));
        }
        catch
        {
            // If token is invalid/revoked or API call fails, return as unlinked
            return Ok(ApiResponse<GitHubIdentityResponse>.Ok(CreateUnlinkedResponse()));
        }
    }

    private static GitHubIdentityResponse CreateUnlinkedResponse() => new GitHubIdentityResponse(
        IsLinked:       false,
        GithubUsername: null,
        GithubProfileUrl: null,
        PublicRepos:    null,
        Followers:      null,
        Contributions:  null,
        TopLanguages:   null,
        VerifiedAt:     null
    );
}
