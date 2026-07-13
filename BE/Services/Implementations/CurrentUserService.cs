using System.Security.Claims;
using BE.Common.Exceptions;
using BE.Services.Abstractions;
namespace BE.Services.Implementations;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string GetClerkUserId()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        var userId = user?.FindFirstValue(ClaimTypes.NameIdentifier) ?? user?.FindFirstValue("sub");

        if (string.IsNullOrEmpty(userId))
            throw new UnauthorizedAppException("User is unauthenticated.");

        return userId;
    }

    public string GetEmail()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        var email = user?.FindFirstValue(ClaimTypes.Email) ?? user?.FindFirstValue("email");

        return email;
    }
}