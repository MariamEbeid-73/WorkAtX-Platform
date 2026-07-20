using System.Security.Claims;
using BE.Common.Exceptions;
using BE.ServiceContracts;
namespace BE.Services;

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
    public string? GetPlan()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        return user?.FindFirstValue("plan");
    }
}