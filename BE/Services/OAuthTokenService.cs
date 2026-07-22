using System.Net.Http.Headers;
using System.Text.Json;
using BE.Common.Encryption;
using BE.Common.Exceptions;
using BE.Data;
using BE.DTOs.OAuth;
using BE.Models;
using BE.ServiceContracts;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class OAuthTokenService : IOAuthTokenService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserService _userService;
    private readonly IAesEncryptionService _encryption;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;

    public OAuthTokenService(
        AppDbContext db,
        ICurrentUserService currentUserService,
        IUserService userService,
        IAesEncryptionService encryption,
        IHttpClientFactory httpClientFactory,
        IConfiguration config)
    {
        _db                 = db;
        _currentUserService = currentUserService;
        _userService        = userService;
        _encryption         = encryption;
        _httpClientFactory  = httpClientFactory;
        _config             = config;
    }

    // ── Authorization URL ────────────────────────────────────────────────────

    public string GetAuthorizationUrl(string provider)
    {
        var clerkUserId = _currentUserService.GetClerkUserId();
        var email       = _currentUserService.GetEmail();
        var stateObj    = new { u = clerkUserId, e = email, csrf = Guid.NewGuid().ToString("N") };
        var stateStr    = JsonSerializer.Serialize(stateObj);
        var state       = _encryption.Encrypt(stateStr);

        return provider.ToLower() switch
        {
            "github"   => BuildGitHubAuthUrl(state),
            "linkedin" => BuildLinkedInAuthUrl(state),
            _ => throw new NotFoundException($"Unknown OAuth provider: {provider}")
        };
    }

    private string BuildGitHubAuthUrl(string state)
    {
        var clientId    = _config["OAuth:GitHub:ClientId"]    ?? throw new InvalidOperationException("OAuth:GitHub:ClientId missing");
        var redirectUri = _config["OAuth:GitHub:RedirectUri"] ?? throw new InvalidOperationException("OAuth:GitHub:RedirectUri missing");

        // Scopes: read:user = basic profile; user:email = email address
        return $"https://github.com/login/oauth/authorize" +
               $"?client_id={Uri.EscapeDataString(clientId)}" +
               $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
               $"&scope={Uri.EscapeDataString("read:user user:email")}" +
               $"&state={Uri.EscapeDataString(state)}";
    }

    private string BuildLinkedInAuthUrl(string state)
    {
        var clientId    = _config["OAuth:LinkedIn:ClientId"]    ?? throw new InvalidOperationException("OAuth:LinkedIn:ClientId missing");
        var redirectUri = _config["OAuth:LinkedIn:RedirectUri"] ?? throw new InvalidOperationException("OAuth:LinkedIn:RedirectUri missing");

        // OpenID Connect scopes — basic profile available to all dev apps
        return $"https://www.linkedin.com/oauth/v2/authorization" +
               $"?response_type=code" +
               $"&client_id={Uri.EscapeDataString(clientId)}" +
               $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
               $"&scope={Uri.EscapeDataString("openid profile email")}" +
               $"&state={Uri.EscapeDataString(state)}";
    }

    // ── Code Exchange ────────────────────────────────────────────────────────

    public async Task ExchangeCodeAsync(string provider, string code, string state)
    {
        string clerkUserId, email;
        try
        {
            var stateStr = _encryption.Decrypt(state);
            var stateObj = JsonSerializer.Deserialize<JsonElement>(stateStr);
            clerkUserId  = stateObj.GetProperty("u").GetString()!;
            email        = stateObj.GetProperty("e").GetString()!;
        }
        catch
        {
            throw new BadRequestException("Invalid or expired OAuth state parameter.");
        }

        var user = await _userService.GetOrCreateUserAsync(clerkUserId, email);

        var (accessToken, refreshToken, expiresIn, username) = provider.ToLower() switch
        {
            "github"   => await ExchangeGitHubCodeAsync(code),
            "linkedin" => await ExchangeLinkedInCodeAsync(code),
            _ => throw new NotFoundException($"Unknown OAuth provider: {provider}")
        };

        var now = DateTimeOffset.UtcNow;

        // Upsert: one row per user per provider
        var existing = await _db.OAuthTokens
            .FirstOrDefaultAsync(t => t.UserId == user.Id && t.Provider == provider.ToLower());

        if (existing == null)
        {
            _db.OAuthTokens.Add(new OAuthToken
            {
                UserId                 = user.Id,
                Provider               = provider.ToLower(),
                EncryptedAccessToken   = _encryption.Encrypt(accessToken),
                EncryptedRefreshToken  = refreshToken != null ? _encryption.Encrypt(refreshToken) : null,
                ExpiresAt              = expiresIn.HasValue ? now.AddSeconds(expiresIn.Value) : null,
                ProviderUsername       = username,
                CreatedAt              = now,
                UpdatedAt              = now,
            });
        }
        else
        {
            existing.EncryptedAccessToken  = _encryption.Encrypt(accessToken);
            existing.EncryptedRefreshToken = refreshToken != null ? _encryption.Encrypt(refreshToken) : null;
            existing.ExpiresAt             = expiresIn.HasValue ? now.AddSeconds(expiresIn.Value) : null;
            existing.ProviderUsername      = username;
            existing.UpdatedAt             = now;
        }

        await _db.SaveChangesAsync();
    }

    private async Task<(string accessToken, string? refreshToken, int? expiresIn, string? username)>
        ExchangeGitHubCodeAsync(string code)
    {
        var clientId     = _config["OAuth:GitHub:ClientId"]!;
        var clientSecret = _config["OAuth:GitHub:ClientSecret"]!;
        var redirectUri  = _config["OAuth:GitHub:RedirectUri"]!;

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        client.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("WorkX", "1.0"));

        // 1. Exchange code for token
        var tokenResponse = await client.PostAsync(
            "https://github.com/login/oauth/access_token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"]     = clientId,
                ["client_secret"] = clientSecret,
                ["code"]          = code,
                ["redirect_uri"]  = redirectUri,
            }));

        tokenResponse.EnsureSuccessStatusCode();
        var tokenJson = await tokenResponse.Content.ReadFromJsonAsync<JsonElement>();
        var accessToken = tokenJson.GetProperty("access_token").GetString()
            ?? throw new Exception("GitHub did not return an access_token");

        // 2. Fetch basic profile to get the username
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        var profileResponse = await client.GetFromJsonAsync<JsonElement>("https://api.github.com/user");
        var username = profileResponse.GetProperty("login").GetString();

        return (accessToken, null, null, username); // GitHub tokens don't expire or have refresh tokens
    }

    private async Task<(string accessToken, string? refreshToken, int? expiresIn, string? username)>
        ExchangeLinkedInCodeAsync(string code)
    {
        var clientId     = _config["OAuth:LinkedIn:ClientId"]!;
        var clientSecret = _config["OAuth:LinkedIn:ClientSecret"]!;
        var redirectUri  = _config["OAuth:LinkedIn:RedirectUri"]!;

        var client = _httpClientFactory.CreateClient();

        // 1. Exchange code for token
        var tokenResponse = await client.PostAsync(
            "https://www.linkedin.com/oauth/v2/accessToken",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"]    = "authorization_code",
                ["code"]          = code,
                ["client_id"]     = clientId,
                ["client_secret"] = clientSecret,
                ["redirect_uri"]  = redirectUri,
            }));

        tokenResponse.EnsureSuccessStatusCode();
        var tokenJson   = await tokenResponse.Content.ReadFromJsonAsync<JsonElement>();
        var accessToken = tokenJson.GetProperty("access_token").GetString()!;
        var expiresIn   = tokenJson.GetProperty("expires_in").GetInt32();

        // 2. Fetch basic profile (OpenID Connect userinfo endpoint)
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        var profileResponse = await client.GetFromJsonAsync<JsonElement>("https://api.linkedin.com/v2/userinfo");
        var username = profileResponse.GetProperty("name").GetString();  // display name

        return (accessToken, null, expiresIn, username);
    }

    // ── Connections & Disconnect ─────────────────────────────────────────────

    public async Task<IEnumerable<ConnectedProviderDto>> GetConnectionsAsync()
    {
        var clerkUserId = _currentUserService.GetClerkUserId();
        var email       = _currentUserService.GetEmail();
        var user        = await _userService.GetOrCreateUserAsync(clerkUserId, email);

        return await _db.OAuthTokens
            .Where(t => t.UserId == user.Id)
            .Select(t => new ConnectedProviderDto(t.Provider, t.ProviderUsername, t.CreatedAt))
            .ToListAsync();
    }

    public async Task DisconnectAsync(string provider)
    {
        var clerkUserId = _currentUserService.GetClerkUserId();
        var email       = _currentUserService.GetEmail();
        var user        = await _userService.GetOrCreateUserAsync(clerkUserId, email);

        var token = await _db.OAuthTokens
            .FirstOrDefaultAsync(t => t.UserId == user.Id && t.Provider == provider.ToLower());

        if (token == null)
            throw new NotFoundException($"No {provider} connection found.");

        _db.OAuthTokens.Remove(token);
        await _db.SaveChangesAsync();
    }
}
