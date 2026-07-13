using BE.Models;

namespace BE.Services.Abstractions;

public interface IUserService
{
    Task<User> GetOrCreateUserAsync(string clerkUserId, string email);
}