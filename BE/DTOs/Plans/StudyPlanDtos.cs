using System.Text.Json;

namespace BE.DTOs.Plans;

public record StudyPlanProgressResponse(
    IReadOnlyList<int> CompletedWeekIndexes,
    IReadOnlyDictionary<int, IReadOnlyList<int>> CompletedTaskIndexes);

public record StudyPlanResponse(
    Guid Id,
    Guid SessionId,
    Guid? JobId,
    JsonElement Plan,
    StudyPlanProgressResponse Progress,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public record UpdateStudyPlanProgressRequest(
    IReadOnlyList<int>? CompletedWeekIndexes,
    IReadOnlyDictionary<int, IReadOnlyList<int>>? CompletedTaskIndexes);
