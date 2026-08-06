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

        var user = new User { ClerkUserId = clerkUserId, Email = resolvedEmail };
        _db.Users.Add(user);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            var winner = await _db.Users.FirstOrDefaultAsync(u => u.ClerkUserId == clerkUserId);
            if (winner != null) return winner;
            throw;
        }

        return user;
    }

    public async Task<User?> GetByClerkIdAsync(string clerkUserId)
    {
        return await _db.Users.FirstOrDefaultAsync(u => u.ClerkUserId == clerkUserId);
    }

    public User? GetCached(HttpContext context) => context.Items["CurrentUser"] as User;
}