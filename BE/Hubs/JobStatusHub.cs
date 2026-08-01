using BE.Data;
using BE.ServiceContracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BE.Hubs;

[Authorize]
public class JobStatusHub : Hub
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserService _userService;

    public JobStatusHub(AppDbContext db, ICurrentUserService currentUserService, IUserService userService)
    {
        _db = db;
        _currentUserService = currentUserService;
        _userService = userService;
    }

    /// <summary>Client calls this right after connecting: connection.invoke("SubscribeToJob", jobId)</summary>
    public async Task SubscribeToJob(Guid jobId)
    {
        var user = await _userService.GetOrCreateUserAsync(
            _currentUserService.GetClerkUserId(),
            _currentUserService.GetEmail());

        var job = await _db.Jobs.AsNoTracking().FirstOrDefaultAsync(j => j.Id == jobId);

        if (job is null || job.UserId != user.Id)
            throw new HubException("Job not found."); // don't reveal existence of jobs that aren't theirs

        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(jobId));
    }

    public static string GroupName(Guid jobId) => $"job:{jobId}";
}