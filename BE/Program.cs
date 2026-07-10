using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using BE.Data;
using BE.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:4200", "http://localhost:5173")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
);

var clerkAuthority = builder.Configuration["Clerk:Authority"]
    ?? throw new InvalidOperationException("Clerk:Authority is not configured.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = clerkAuthority;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = clerkAuthority,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            NameClaimType = ClaimTypes.NameIdentifier,
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.MapGet("/health", async (IConfiguration config) =>
{
    string dbStatus = "Disconnected";
    try
    {
        using var connection = new SqlConnection(config.GetConnectionString("DefaultConnection") ?? "");
        await connection.OpenAsync();
        dbStatus = "Connected OK";
    }
    catch (Exception ex)
    {
        dbStatus = $"Error: {ex.Message}";
    }

    return new { status = "Healthy", dbStatus };
});

app.MapPost("/api/subscription/start-trial", async (HttpContext httpContext, AppDbContext db) =>
{
    var clerkUserId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? httpContext.User.FindFirstValue("sub");

    if (string.IsNullOrEmpty(clerkUserId))
        return Results.Unauthorized();

    var email = httpContext.User.FindFirstValue(ClaimTypes.Email)
        ?? httpContext.User.FindFirstValue("email")
        ?? $"{clerkUserId}@noemail.local";

    var user = await db.Users.FirstOrDefaultAsync(u => u.ClerkUserId == clerkUserId);
    if (user == null)
    {
        user = new User { ClerkUserId = clerkUserId, Email = email };
        db.Users.Add(user);
        await db.SaveChangesAsync();
    }

    var existing = await db.Subscriptions.FirstOrDefaultAsync(s => s.UserId == user.Id && s.IsActive);
    if (existing != null)
        return Results.Conflict(new { message = "An active subscription already exists." });

    var now = DateTimeOffset.UtcNow;
    var subscription = new Subscription
    {
        UserId = user.Id,
        PlanType = "FREE_TRIAL",
        TrialStartDate = now,
        TrialEndDate = now.AddDays(30),
        IsActive = true,
    };
    db.Subscriptions.Add(subscription);
    await db.SaveChangesAsync();

    return Results.Ok(new
    {
        message = "Free trial started!",
        planType = subscription.PlanType,
        trialStartDate = subscription.TrialStartDate,
        trialEndDate = subscription.TrialEndDate,
        isActive = subscription.IsActive,
    });
})
.RequireAuthorization();

app.MapGet("/api/subscription/status", async (HttpContext httpContext, AppDbContext db) =>
{
    var clerkUserId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? httpContext.User.FindFirstValue("sub");

    if (string.IsNullOrEmpty(clerkUserId))
        return Results.Unauthorized();

    var user = await db.Users.FirstOrDefaultAsync(u => u.ClerkUserId == clerkUserId);
    if (user == null)
    {
        var email = httpContext.User.FindFirstValue(ClaimTypes.Email)
            ?? httpContext.User.FindFirstValue("email")
            ?? $"{clerkUserId}@noemail.local";

        user = new User { ClerkUserId = clerkUserId, Email = email };
        db.Users.Add(user);
        await db.SaveChangesAsync();
    }

    var subscription = await db.Subscriptions
        .Where(s => s.UserId == user.Id)
        .OrderByDescending(s => s.CreatedAt)
        .FirstOrDefaultAsync();

    if (subscription == null)
        return Results.NotFound(new { message = "No subscription found." });

    if (subscription.IsActive && subscription.TrialEndDate < DateTimeOffset.UtcNow)
    {
        subscription.IsActive = false;
        subscription.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
    }

    var daysRemaining = Math.Max(0, (int)(subscription.TrialEndDate - DateTimeOffset.UtcNow).TotalDays);

    return Results.Ok(new
    {
        planType = subscription.PlanType,
        isActive = subscription.IsActive,
        trialStartDate = subscription.TrialStartDate,
        trialEndDate = subscription.TrialEndDate,
        daysRemaining,
        stripeCustomerId = subscription.StripeCustomerId,
        stripeSubscriptionId = subscription.StripeSubscriptionId,
    });
})
.RequireAuthorization();

app.Run();
