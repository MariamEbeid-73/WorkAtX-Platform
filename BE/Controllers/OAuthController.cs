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
    /// Returns the provider's OAuth consent screen URL.
    /// Requires [Authorize] because we embed the Clerk user ID into the OAuth state.
    /// </summary>
    [Authorize]
    [HttpPost("{provider}/authorize")]
    public IActionResult Authorize(string provider)
    {
        var url = _oauthService.GetAuthorizationUrl(provider);
        return Ok(new { url });
    }

    /// <summary>
    /// The provider redirects back here with ?code=...&state=...
    /// This endpoint exchanges the code for a token, saves it,
    /// then redirects the browser back to the frontend.
    /// </summary>
    [HttpGet("{provider}/callback")]
    public async Task<IActionResult> Callback(string provider, [FromQuery] string code, [FromQuery] string? state)
    {
        if (string.IsNullOrEmpty(code))
            return BadRequest("Missing code parameter.");
        if (string.IsNullOrEmpty(state))
            return BadRequest("Missing state parameter.");

        await _oauthService.ExchangeCodeAsync(provider, code, state);

        var frontendUrl = _config["OAuth:FrontendCallbackUrl"] ?? "http://localhost:4200/oauth-return";
        return Redirect($"{frontendUrl}?provider={provider}");
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
