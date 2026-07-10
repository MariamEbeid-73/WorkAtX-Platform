using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Data.SqlClient;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using BE.Data;
using BE.Models;

var builder = WebApplication.CreateBuilder(args);

// ── Services ──────────────────────────────────────────────────────────────────

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS — allow frontend origin
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:4200",
                "http://localhost:5173"
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// EF Core — SQL Server
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// Authentication — Clerk JWT via JWKS
var clerkAuthority = builder.Configuration["Clerk:Authority"]
    ?? throw new InvalidOperationException("Clerk:Authority is not configured. Set it in appsettings.json.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = clerkAuthority;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = clerkAuthority,
            ValidateAudience = false, // Clerk doesn't set a fixed audience by default
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            NameClaimType = ClaimTypes.NameIdentifier,
        };
    });

builder.Services.AddAuthorization();

// ── Build App ─────────────────────────────────────────────────────────────────

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

// ── Auto-migrate (development only) ──────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// ══════════════════════════════════════════════════════════════════════════════
// ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

// ── Health Check (public) ────────────────────────────────────────────────────
app.MapGet("/health", async (IConfiguration config) =>
{
    string dbStatus = "Disconnected";
    try
    {
        string connStr = config.GetConnectionString("DefaultConnection") ?? "";
        using var connection = new SqlConnection(connStr);
        await connection.OpenAsync();
        dbStatus = "Connected OK";
    }
    catch (System.Exception ex)
    {
        dbStatus = $"Error: {ex.Message}";
    }

    return new { status = "Healthy", dbStatus = dbStatus };
});

// ── Start Free Trial (protected) ─────────────────────────────────────────────
app.MapPost("/api/subscription/start-trial", async (
    HttpContext httpContext,
    AppDbContext db
) =>
{
    var clerkUserId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? httpContext.User.FindFirstValue("sub");

    if (string.IsNullOrEmpty(clerkUserId))
        return Results.Unauthorized();

    var email = httpContext.User.FindFirstValue(ClaimTypes.Email)
        ?? httpContext.User.FindFirstValue("email");

    if (string.IsNullOrEmpty(email))
    {
        email = $"{clerkUserId}@noemail.local";
    }

    // Find or create user
    var user = await db.Users.FirstOrDefaultAsync(u => u.ClerkUserId == clerkUserId);
    if (user == null)
    {
        user = new User
        {
            ClerkUserId = clerkUserId,
            Email = email,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
    }

    // Check for existing active subscription
    var existing = await db.Subscriptions
        .FirstOrDefaultAsync(s => s.UserId == user.Id && s.IsActive);

    if (existing != null)
    {
        return Results.Conflict(new { message = "An active subscription already exists." });
    }

    // Create 30-day free trial
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

// ── Subscription Status (protected) ──────────────────────────────────────────
app.MapGet("/api/subscription/status", async (
    HttpContext httpContext,
    AppDbContext db
) =>
{
    var clerkUserId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? httpContext.User.FindFirstValue("sub");

    if (string.IsNullOrEmpty(clerkUserId))
        return Results.Unauthorized();

    var user = await db.Users.FirstOrDefaultAsync(u => u.ClerkUserId == clerkUserId);
    if (user == null)
    {
        var email = httpContext.User.FindFirstValue(ClaimTypes.Email)
            ?? httpContext.User.FindFirstValue("email");

        if (string.IsNullOrEmpty(email))
        {
            email = $"{clerkUserId}@noemail.local";
        }
        
        user = new User
        {
            ClerkUserId = clerkUserId,
            Email = email,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
    }

    var subscription = await db.Subscriptions
        .Where(s => s.UserId == user.Id)
        .OrderByDescending(s => s.CreatedAt)
        .FirstOrDefaultAsync();

    if (subscription == null)
        return Results.NotFound(new { message = "No subscription found." });

    // Auto-expire trial if past end date
    if (subscription.IsActive && subscription.TrialEndDate < DateTimeOffset.UtcNow)
    {
        subscription.IsActive = false;
        subscription.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
    }

    var daysRemaining = Math.Max(0,
        (int)(subscription.TrialEndDate - DateTimeOffset.UtcNow).TotalDays);

    return Results.Ok(new
    {
        planType = subscription.PlanType,
        isActive = subscription.IsActive,
        trialStartDate = subscription.TrialStartDate,
        trialEndDate = subscription.TrialEndDate,
        daysRemaining = daysRemaining,
        stripeCustomerId = subscription.StripeCustomerId,
        stripeSubscriptionId = subscription.StripeSubscriptionId,
    });
})
.RequireAuthorization();

app.Run();
