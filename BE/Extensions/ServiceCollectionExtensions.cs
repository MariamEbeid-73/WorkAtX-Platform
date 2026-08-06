using System.Security.Claims;
using BE.Services;
using BE.ServiceContracts;
using BE.DTOs.Chat;
using BE.Common.Encryption;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using StackExchange.Redis;

namespace BE.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddSwaggerDocumentation(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Paste your Clerk JWT here (no need to type 'Bearer ' first)"
            });

            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    Array.Empty<string>()
                }
            });
        });

        return services;
    }

    public static IServiceCollection AddClerkAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var clerkAuthority = configuration["Clerk:Authority"]
            ?? throw new InvalidOperationException("Clerk:Authority is not configured.");

        services
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

                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                        {
                            context.Token = accessToken;
                        }
                        return Task.CompletedTask;
                    }
                };
            });

        services.AddAuthorization();

        return services;
    }

    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IHealthCheckService, HealthCheckService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IUsageService, UsageService>();
        services.AddSingleton<IAesEncryptionService, AesEncryptionService>();
        services.AddSingleton<IFileStorageService, S3FileStorageService>();
        services.AddHttpClient();
        services.AddScoped<IOAuthTokenService, OAuthTokenService>();
        services.AddScoped<IResumeService, ResumeService>();
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<IJobService, JobService>();
        services.AddScoped<IJobQueueService, JobQueueService>();
        services.AddScoped<IChatSessionService, ChatSessionService>();
        services.AddSingleton<IBackgroundTaskQueue, BackgroundTaskQueue>();


        var summarizationProvider = configuration["Summarization:Provider"] ?? "extractive";
        if (summarizationProvider.Equals("external", StringComparison.OrdinalIgnoreCase))
            services.AddScoped<ISummarizationService, SummarizationService>();
        else
            services.AddScoped<ISummarizationService, ExtractiveSummarizationService>();


        // Redis connection is shared across the process — a singleton.
        var redisConfig = configuration["Redis:Configuration"] ?? "redis:6379,abortConnect=false";
        services.AddSingleton<IConnectionMultiplexer>(
            ConnectionMultiplexer.Connect(redisConfig));

        return services;
    }
}