using System.Text.Json;
using BE.Common.Exceptions;
using BE.Data;
using BE.DTOs.Chat;
using BE.Models;
using BE.ServiceContracts;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class ChatSessionService : IChatSessionService
{
    private readonly AppDbContext _db;

    public ChatSessionService(AppDbContext db) => _db = db;

    public async Task<ChatSessionResponse> CreateAsync(Guid userId, string? title)
    {
        var session = new ChatSession
        {
            UserId = userId,
            Title = title,
            Status = ChatSessionStatus.Active,
        };
        _db.ChatSessions.Add(session);
        await _db.SaveChangesAsync();
        return ToDto(session);
    }

    public async Task<IEnumerable<ChatSessionResponse>> ListAsync(Guid userId)
    {
        return await _db.ChatSessions
            .Where(s => s.UserId == userId && s.Status == ChatSessionStatus.Active)
            .OrderByDescending(s => s.LastMessageAt ?? s.CreatedAt)
            .Select(s => new ChatSessionResponse(s.Id, s.Title, s.Status, s.LastMessageAt, s.CreatedAt))
            .ToListAsync();
    }

    public async Task<IEnumerable<ChatMessageResponse>> GetMessagesAsync(Guid userId, Guid sessionId)
    {
        var session = await GetOwnedAsync(userId, sessionId);

        var messages = await _db.ChatMessages
            .Where(m => m.SessionId == session.Id)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();

        // Batch-fetch the structured payloads for gap_analysis / study_plan
        // assistant messages so the frontend can redraw the rich card on
        // session reload without an extra round trip per message.
        var gapJobIds = messages
            .Where(m => m.ResponseType == AiResponseType.GapAnalysis && m.JobId.HasValue)
            .Select(m => m.JobId!.Value)
            .ToList();

        var planJobIds = messages
            .Where(m => m.ResponseType == AiResponseType.StudyPlan && m.JobId.HasValue)
            .Select(m => m.JobId!.Value)
            .ToList();

        var gapByJobId = gapJobIds.Count == 0
            ? new Dictionary<Guid, string>()
            : (await _db.UserGapAnalyses
                .Where(g => g.JobId.HasValue && gapJobIds.Contains(g.JobId.Value))
                .ToListAsync())
                .GroupBy(g => g.JobId!.Value)
                .ToDictionary(gr => gr.Key, gr => gr.First().ResultJson);

        var planByJobId = planJobIds.Count == 0
            ? new Dictionary<Guid, string>()
            : (await _db.UserStudyPlans
                .Where(p => p.JobId.HasValue && planJobIds.Contains(p.JobId.Value))
                .ToListAsync())
                .GroupBy(p => p.JobId!.Value)
                .ToDictionary(gr => gr.Key, gr => gr.First().ResultJson);

        return messages.Select(m =>
        {
            object? result = null;

            if (m.JobId.HasValue)
            {
                if (m.ResponseType == AiResponseType.GapAnalysis
                    && gapByJobId.TryGetValue(m.JobId.Value, out var gapJson))
                    result = JsonSerializer.Deserialize<JsonElement>(gapJson);
                else if (m.ResponseType == AiResponseType.StudyPlan
                    && planByJobId.TryGetValue(m.JobId.Value, out var planJson))
                    result = JsonSerializer.Deserialize<JsonElement>(planJson);
            }

            return new ChatMessageResponse(m.Id, m.Role, m.Content, m.ResponseType, m.JobId, result, m.CreatedAt);
        }).ToList();
    }

    public async Task<ChatSessionResponse> RenameAsync(Guid userId, Guid sessionId, string title)
    {
        var session = await GetOwnedAsync(userId, sessionId);
        session.Title = title;
        session.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        return ToDto(session);
    }

    public async Task ArchiveAsync(Guid userId, Guid sessionId)
    {
        var session = await GetOwnedAsync(userId, sessionId);
        session.Status = ChatSessionStatus.Archived;
        session.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task<ChatSession> GetOrCreateForMessageAsync(Guid userId, Guid? sessionId, string firstMessage)
    {
        if (sessionId.HasValue)
        {
            var existing = await _db.ChatSessions
                .FirstOrDefaultAsync(s => s.Id == sessionId.Value)
                ?? throw new NotFoundException("Chat session not found.");
            if (existing.UserId != userId)
                throw new ForbiddenException("You do not have access to this session.");
            return existing;
        }

        var session = new ChatSession
        {
            UserId = userId,
            Title = firstMessage.Length > 60 ? firstMessage[..60] + "…" : firstMessage,
            Status = ChatSessionStatus.Active,
        };
        _db.ChatSessions.Add(session);
        await _db.SaveChangesAsync();
        return session;
    }

    private async Task<ChatSession> GetOwnedAsync(Guid userId, Guid sessionId)
    {
        var session = await _db.ChatSessions.FirstOrDefaultAsync(s => s.Id == sessionId)
            ?? throw new NotFoundException("Chat session not found.");
        if (session.UserId != userId)
            throw new ForbiddenException("You do not have access to this session.");
        return session;
    }

    private static ChatSessionResponse ToDto(ChatSession s) =>
        new(s.Id, s.Title, s.Status, s.LastMessageAt, s.CreatedAt);
}