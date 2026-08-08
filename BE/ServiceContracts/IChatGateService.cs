using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BE.ServiceContracts
{
    /// <summary>
    /// Single place for the "can this user start/continue a chat turn right
    /// now" gate: confirmed-CV check + free-tier daily quota check.
    /// Used by both ChatController.SendMessage and
    /// ChatSessionController.SubmitTechChoices, which must stay in lock-step
    /// — see the callers for why each check exists.
    /// </summary>
    public interface IChatGateService
    {
        /// <summary>
        /// Runs the CV-required check and, for sub-Pro plans, the daily
        /// message-quota check (consuming one unit of quota on success and
        /// setting the X-Messages-Remaining response header). Returns a
        /// result indicating whether the caller may proceed.
        /// </summary>
        Task<ChatGateResult> CheckAsync(Guid userId, HttpResponse response);
    }

    /// <summary>
    /// Outcome of a chat gate check. When <see cref="IsAllowed"/> is false,
    /// <see cref="ErrorResult"/> is the exact response the controller should
    /// return as-is (status code + body already set).
    /// </summary>
    public class ChatGateResult
    {
        public bool IsAllowed { get; private init; }
        public IActionResult? ErrorResult { get; private init; }

        public static ChatGateResult Allow() => new() { IsAllowed = true };

        public static ChatGateResult Deny(IActionResult errorResult) =>
            new() { IsAllowed = false, ErrorResult = errorResult };
    }
}
