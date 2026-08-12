using System.Text.Json;
using BE.Common;
using BE.Common.Exceptions;
using BE.Data;
using BE.DTOs.Plans;
using BE.Models;
using BE.ServiceContracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BE.Controllers;

[Authorize]
[ApiController]
[Route("api/plans")]
public class PlansController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserService _userService;

    public PlansController(
        AppDbContext db,
        ICurrentUserService currentUserService,
        IUserService userService)
    {
        _db = db;
        _currentUserService = currentUserService;
        _userService = userService;
    }

    /// <summary>Returns every generated study plan owned by the current user, newest first.</summary>
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var user = await CurrentUserAsync();
        var plans = await _db.UserStudyPlans
            .AsNoTracking()
            .Where(p => p.UserId == user.Id)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return Ok(ApiResponse<IReadOnlyList<StudyPlanResponse>>.Ok(plans.Select(ToResponse).ToList()));
    }

    /// <summary>Returns one generated study plan after enforcing ownership.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var user = await CurrentUserAsync();
        var plan = await OwnedPlanAsync(id, user.Id, tracking: false);
        return Ok(ApiResponse<StudyPlanResponse>.Ok(ToResponse(plan)));
    }

    /// <summary>
    /// Replaces the user's completion snapshot for a plan. Indexes are used
    /// because individual AI-generated tasks do not currently have stable IDs.
    /// </summary>
    [HttpPut("{id:guid}/progress")]
    public async Task<IActionResult> UpdateProgress(Guid id, [FromBody] UpdateStudyPlanProgressRequest request)
    {
        var user = await CurrentUserAsync();
        var plan = await OwnedPlanAsync(id, user.Id, tracking: true);

        var (weekCount, taskCounts) = ReadPlanShape(plan.ResultJson);
        var progress = NormalizeProgress(request, weekCount, taskCounts);

        plan.ProgressJson = JsonSerializer.Serialize(progress, JsonOptions);
        plan.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<StudyPlanResponse>.Ok(ToResponse(plan)));
    }

    private async Task<UserStudyPlan> OwnedPlanAsync(Guid id, Guid userId, bool tracking)
    {
        var query = tracking ? _db.UserStudyPlans : _db.UserStudyPlans.AsNoTracking();
        var plan = await query.FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new NotFoundException("Study plan not found.");

        if (plan.UserId != userId)
            throw new ForbiddenException("You do not have access to this study plan.");

        return plan;
    }

    private async Task<User> CurrentUserAsync() =>
        (HttpContext.Items["CurrentUser"] as User)
        ?? await _userService.GetOrCreateUserAsync(
            _currentUserService.GetClerkUserId(),
            _currentUserService.GetEmail());

    private static StudyPlanResponse ToResponse(UserStudyPlan plan)
    {
        var planJson = JsonSerializer.Deserialize<JsonElement>(plan.ResultJson);
        var progress = DeserializeProgress(plan.ProgressJson);
        return new StudyPlanResponse(
            plan.Id,
            plan.SessionId,
            plan.JobId,
            planJson,
            progress,
            plan.CreatedAt,
            plan.UpdatedAt);
    }

    private static StudyPlanProgressResponse DeserializeProgress(string? json)
    {
        if (string.IsNullOrWhiteSpace(json) || json == "{}")
            return EmptyProgress();

        try
        {
            var value = JsonSerializer.Deserialize<StudyPlanProgressResponse>(json, JsonOptions);
            return value ?? EmptyProgress();
        }
        catch (JsonException)
        {
            return EmptyProgress();
        }
    }

    private static StudyPlanProgressResponse EmptyProgress() =>
        new([], new Dictionary<int, IReadOnlyList<int>>());

    private static StudyPlanProgressResponse NormalizeProgress(
        UpdateStudyPlanProgressRequest request,
        int weekCount,
        IReadOnlyList<int> taskCounts)
    {
        var weeks = (request.CompletedWeekIndexes ?? [])
            .Distinct()
            .Order()
            .ToList();

        if (weeks.Any(index => index < 0 || index >= weekCount))
            throw new BadRequestException("completedWeekIndexes contains an invalid week index.");

        var tasks = new Dictionary<int, IReadOnlyList<int>>();
        foreach (var (weekIndex, indexes) in request.CompletedTaskIndexes
                     ?? new Dictionary<int, IReadOnlyList<int>>())
        {
            if (weekIndex < 0 || weekIndex >= weekCount)
                throw new BadRequestException("completedTaskIndexes contains an invalid week index.");

            var normalized = indexes.Distinct().Order().ToList();
            if (normalized.Any(index => index < 0 || index >= taskCounts[weekIndex]))
                throw new BadRequestException($"completedTaskIndexes contains an invalid task index for week {weekIndex}.");

            if (normalized.Count > 0)
                tasks[weekIndex] = normalized;
        }

        foreach (var weekIndex in weeks)
        {
            var completedTaskCount = tasks.GetValueOrDefault(weekIndex)?.Count ?? 0;
            if (completedTaskCount != taskCounts[weekIndex])
                throw new BadRequestException($"Week {weekIndex} cannot be completed before all of its tasks are completed.");
        }

        return new StudyPlanProgressResponse(weeks, tasks);
    }

    private static (int WeekCount, IReadOnlyList<int> TaskCounts) ReadPlanShape(string resultJson)
    {
        using var doc = JsonDocument.Parse(resultJson);
        var root = UnwrapPlan(doc.RootElement);

        if (!TryGetProperty(root, "weeks", out var weeks) || weeks.ValueKind != JsonValueKind.Array)
            throw new ConflictException("This study plan has no valid weeks to track.");

        var taskCounts = new List<int>();
        foreach (var week in weeks.EnumerateArray())
        {
            if (week.ValueKind == JsonValueKind.Object
                && TryGetProperty(week, "tasks", out var tasks)
                && tasks.ValueKind == JsonValueKind.Array)
                taskCounts.Add(tasks.GetArrayLength());
            else
                taskCounts.Add(0);
        }

        return (taskCounts.Count, taskCounts);
    }

    private static JsonElement UnwrapPlan(JsonElement root)
    {
        foreach (var name in new[] { "response", "studyPlan", "study_plan", "plan" })
        {
            if (TryGetProperty(root, name, out var inner) && inner.ValueKind == JsonValueKind.Object)
                return inner;
        }

        return root;
    }

    private static bool TryGetProperty(JsonElement element, string name, out JsonElement value)
    {
        if (element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out value))
            return true;

        value = default;
        return false;
    }
}
