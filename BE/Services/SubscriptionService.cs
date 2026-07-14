using BE.Data;
using BE.DTOs.Subscription;
using BE.Models;
using BE.Common.Exceptions;
using BE.ServiceContracts;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class SubscriptionService : ISubscriptionService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserService _userService;

    public SubscriptionService(AppDbContext db, ICurrentUserService currentUserService, IUserService userService)
    {
        _db = db;
        _currentUserService = currentUserService;
        _userService = userService;
    }

    public async Task<StartTrialResponse> StartTrialAsync()
    {
        var clerkUserId = _currentUserService.GetClerkUserId();
        var email = _currentUserService.GetEmail();

        var user = await _userService.GetOrCreateUserAsync(clerkUserId, email);

        var existing = await _db.Subscriptions.FirstOrDefaultAsync(s => s.UserId == user.Id && s.IsActive);
        if (existing != null)
            throw new ConflictException("An active subscription already exists.");

        var now = DateTimeOffset.UtcNow;
        var subscription = new Subscription
        {
            UserId = user.Id,
            PlanType = "FREE_TRIAL",
            TrialStartDate = now,
            TrialEndDate = now.AddDays(30),
            IsActive = true,
        };

        _db.Subscriptions.Add(subscription);
        await _db.SaveChangesAsync();

        return new StartTrialResponse(
            "Free trial started!",
            subscription.PlanType,
            subscription.TrialStartDate,
            subscription.TrialEndDate,
            subscription.IsActive
        );
    }

    public async Task<SubscriptionStatusResponse> GetStatusAsync()
    {
        var clerkUserId = _currentUserService.GetClerkUserId();
        var email = _currentUserService.GetEmail();

        var user = await _userService.GetOrCreateUserAsync(clerkUserId, email);

        var subscription = await _db.Subscriptions
            .Where(s => s.UserId == user.Id)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        if (subscription == null)
            throw new NotFoundException("No subscription found.");

        if (subscription.IsActive && subscription.TrialEndDate < DateTimeOffset.UtcNow)
        {
            subscription.IsActive = false;
            subscription.UpdatedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync();
        }

        var daysRemaining = Math.Max(0, (int)(subscription.TrialEndDate - DateTimeOffset.UtcNow).TotalDays);

        return new SubscriptionStatusResponse(
            subscription.PlanType,
            subscription.IsActive,
            subscription.TrialStartDate,
            subscription.TrialEndDate,
            daysRemaining,
            subscription.StripeCustomerId,
            subscription.StripeSubscriptionId
        );
    }
}