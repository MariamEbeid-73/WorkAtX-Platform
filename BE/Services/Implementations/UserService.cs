using BE.Data;
using BE.Models;
using BE.Services.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace BE.Services.Implementations;

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
            user = new User { ClerkUserId = clerkUserId, Email = email };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }
        return user;
    }
}