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

        if (string.IsNullOrEmpty(email))
            throw new UnauthorizedAppException("User email is unauthenticated.");

        return email;
    }
    public string GetPlan()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        var rawPla = user?.FindFirstValue("pla");

        if (string.IsNullOrEmpty(rawPla))
            return "free";

        var slug = rawPla.Contains(':') ? rawPla.Split(':')[1] : rawPla;

        return slug switch
        {
            "free_user" => "free",
            "pro" => "pro",
            "elite" => "elite",
            _ => "free"
        };
    }
}