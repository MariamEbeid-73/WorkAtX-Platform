using BE.Data;
using BE.Models;
using Microsoft.EntityFrameworkCore;
using BE.ServiceContracts;

namespace BE.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _db;

    public UserService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<User> GetOrCreateUserAsync(string clerkUserId, string email)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.ClerkUserId == clerkUserId);
        if (user == null)
        {
           user = new User { ClerkUserId = clerkUserId, Email = email ?? "unknown@placeholder.local" };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }
        return user;
    }

    public async Task<User?> GetByClerkIdAsync(string clerkUserId)
    {
        return await _db.Users.FirstOrDefaultAsync(u => u.ClerkUserId == clerkUserId);
    }
}
