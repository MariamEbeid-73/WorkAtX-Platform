using BE.DTOs.OAuth;

namespace BE.ServiceContracts;

public interface IOAuthTokenService
{
    /// <summary>Builds the provider's OAuth authorization URL to redirect the user to.</summary>
    string GetAuthorizationUrl(string provider);

    /// <summary>
    /// Called from the OAuth callback. Exchanges the code for tokens,
    /// fetches basic profile info, encrypts, and upserts into OAuthTokens.
    /// </summary>
    Task ExchangeCodeAsync(string provider, string code, string state);

    /// <summary>Returns all connected providers for the current user.</summary>
    Task<IEnumerable<ConnectedProviderDto>> GetConnectionsAsync();

    /// <summary>Deletes the OAuthToken row for the given provider.</summary>
    Task DisconnectAsync(string provider);
}
