using BE.ServiceContracts;

namespace BE.Common.Middleware;

/// <summary>
/// Resolves (or creates) the current user exactly once per request and
/// stashes it in HttpContext.Items, so downstream controllers/services can
/// read it instead of each independently calling GetOrCreateUserAsync.
/// </summary>
public class CurrentUserCachingMiddleware
{
    private readonly RequestDelegate _next;
    public CurrentUserCachingMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, ICurrentUserService currentUserService, IUserService userService)
    {
        if (context.User?.Identity?.IsAuthenticated == true)
        {
            var clerkUserId = currentUserService.GetClerkUserId();
            if (!string.IsNullOrEmpty(clerkUserId))
            {
                var user = await userService.GetOrCreateUserAsync(clerkUserId, currentUserService.GetEmail());
                context.Items["CurrentUser"] = user;
            }
        }

        await _next(context);
    }
}