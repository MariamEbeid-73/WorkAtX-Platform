using BE.DTOs.Chat;

namespace BE.ServiceContracts;

public interface IChatSessionService
{
    Task<ChatSessionResponse> CreateAsync(Guid userId, string? title);
    Task<IEnumerable<ChatSessionResponse>> ListAsync(Guid userId);
    Task<IEnumerable<ChatMessageResponse>> GetMessagesAsync(Guid userId, Guid sessionId);
    Task<ChatSessionResponse> RenameAsync(Guid userId, Guid sessionId, string title);
    Task ArchiveAsync(Guid userId, Guid sessionId);

    Task<Models.ChatSession> GetOrCreateForMessageAsync(Guid userId, Guid? sessionId, string firstMessage);
}
