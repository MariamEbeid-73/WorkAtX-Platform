using BE.ServiceContracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[ApiController]
[Route("oauth")]
public class OAuthController : ControllerBase
{
    private readonly IOAuthTokenService _oauthService;
    private readonly IConfiguration _config;

    public OAuthController(IOAuthTokenService oauthService, IConfiguration config)
    {
        _oauthService = oauthService;
        _config       = config;
    }

    /// <summary>
    /// Redirects the user's browser to the provider's OAuth consent screen.
    /// Not [Authorize] because the browser navigates here directly.
    /// The Clerk JWT is NOT available on this redirect — we rely on the state
    /// param as a CSRF token. The actual user binding happens in ExchangeCode,
    /// which IS authorized via the Clerk JWT cookie.
    /// </summary>
    [HttpGet("{provider}/authorize")]
    public IActionResult Authorize(string provider)
    {
        // A random state prevents CSRF. In production you'd sign and verify this.
        var state = Guid.NewGuid().ToString("N");
        // TODO: store state in a short-lived cookie or cache for CSRF validation

        var url = _oauthService.GetAuthorizationUrl(provider, state);
        return Redirect(url);
    }

    /// <summary>
    /// The provider redirects back here with ?code=...&state=...
    /// This endpoint exchanges the code for a token, saves it,
    /// then redirects the browser back to the frontend.
    ///
    /// IMPORTANT: This endpoint is NOT [Authorize] because at callback time
    /// the browser is coming back from GitHub — the Clerk session cookie
    /// IS present, so ICurrentUserService works via the cookie.
    /// </summary>
    [HttpGet("{provider}/callback")]
    public async Task<IActionResult> Callback(string provider, [FromQuery] string code, [FromQuery] string? state)
    {
        if (string.IsNullOrEmpty(code))
            return BadRequest("Missing code parameter.");

        // TODO: Validate the state parameter against stored CSRF token here

        await _oauthService.ExchangeCodeAsync(provider, code);

        var frontendUrl = _config["OAuth:FrontendCallbackUrl"] ?? "http://localhost:5173/connected-accounts";
        return Redirect(frontendUrl);
    }

    /// <summary>Returns a list of all providers the current user has connected.</summary>
    [Authorize]
    [HttpGet("connections")]
    public async Task<IActionResult> GetConnections()
    {
        var connections = await _oauthService.GetConnectionsAsync();
        return Ok(connections);
    }

    /// <summary>Removes a connected provider's token from the database.</summary>
    [Authorize]
    [HttpDelete("{provider}/disconnect")]
    public async Task<IActionResult> Disconnect(string provider)
    {
        await _oauthService.DisconnectAsync(provider);
        return NoContent();
    }
}
