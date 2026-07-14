using BE.Models;

namespace BE.ServiceContracts;

public interface IUserService
{
    Task<User> GetOrCreateUserAsync(string clerkUserId, string email);

    Task<User?> GetByClerkIdAsync(string clerkUserId);
}