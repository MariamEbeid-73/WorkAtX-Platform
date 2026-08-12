using BE.Common.Exceptions;
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
        var existing = await FindByClerkIdAsync(clerkUserId);
        if (existing != null) return existing;

        var resolvedEmail = string.IsNullOrWhiteSpace(email)
            ? $"{clerkUserId}@noemail.local"
            : email;

        await _db.Database.ExecuteSqlRawAsync(
            @"INSERT INTO ""Users"" (""Id"", ""ClerkUserId"", ""Email"", ""CreatedAt"")
              VALUES (gen_random_uuid(), {0}, {1}, NOW())
              ON CONFLICT DO NOTHING",
            clerkUserId, resolvedEmail);

        existing = await FindByClerkIdAsync(clerkUserId);

        if (existing != null) return existing;

        var emailAlreadyLinked = await _db.Users
            .AsNoTracking()
            .AnyAsync(u => u.Email == resolvedEmail);

        if (emailAlreadyLinked)
            throw new ConflictException("This account cannot be linked automatically. Sign out and contact support.");

        throw new InvalidOperationException("User provisioning did not create or resolve a user.");
    }

    public async Task<User?> GetByClerkIdAsync(string clerkUserId)
    {
        return await _db.Users.FirstOrDefaultAsync(u => u.ClerkUserId == clerkUserId);
    }

    public User? GetCached(HttpContext context) => context.Items["CurrentUser"] as User;

    private Task<User?> FindByClerkIdAsync(string clerkUserId) =>
        _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.ClerkUserId == clerkUserId);
}
