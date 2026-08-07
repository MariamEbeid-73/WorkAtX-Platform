using BE.Data;
using BE.Models;
using BE.ServiceContracts;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _db;

    public UserService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<User> GetOrCreateUserAsync(string clerkUserId, string? email)
    {
        var existing = await _db.Users.FirstOrDefaultAsync(u => u.ClerkUserId == clerkUserId);
        if (existing != null) return existing;

        var resolvedEmail = string.IsNullOrWhiteSpace(email)
            ? $"{clerkUserId}@noemail.local"
            : email;

        var created = await _db.Users
            .FromSqlRaw(@"
                INSERT INTO ""Users"" (""Id"", ""ClerkUserId"", ""Email"", ""CreatedAt"")
                VALUES (gen_random_uuid(), {0}, {1}, NOW())
                ON CONFLICT (""ClerkUserId"") DO NOTHING
                RETURNING *
            ", clerkUserId, resolvedEmail)
            .AsNoTracking()
            .FirstOrDefaultAsync();

        if (created != null) return created;

        return (await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.ClerkUserId == clerkUserId))!;
    }

    public async Task<User?> GetByClerkIdAsync(string clerkUserId)
    {
        return await _db.Users.FirstOrDefaultAsync(u => u.ClerkUserId == clerkUserId);
    }

    public User? GetCached(HttpContext context) => context.Items["CurrentUser"] as User;
}