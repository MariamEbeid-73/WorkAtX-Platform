using BE.Common;
using BE.DTOs.Feedback;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[Authorize]
[ApiController]
[Route("api/feedback")]
public class FeedbackController : ControllerBase
{
    private readonly ILogger<FeedbackController> _logger;

    public FeedbackController(ILogger<FeedbackController> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// POST /api/feedback
    /// Receives user feedback (bug reports, feature requests, comments).
    /// 
    /// CURRENT STATE (stub): Logs the feedback and returns a dummy ID.
    /// No database write — we don't have a Feedback table yet.
    /// 
    /// FUTURE STATE (Checkpoint 6): Persist to a Feedback table,
    /// optionally notify via email/Slack webhook.
    /// </summary>
    [HttpPost]
    public IActionResult SubmitFeedback([FromBody] FeedbackRequest request)
    {
        // Log it so you can see feedback in the console during development
        _logger.LogInformation(
            "Feedback received — Type: {Type}, Rating: {Rating}, Message: {Message}",
            request.Type, request.Rating, request.Message);

        // Return a dummy GUID as the "created feedback ID"
        return Ok(ApiResponse<FeedbackResponse>.Ok(new FeedbackResponse(Guid.NewGuid().ToString())));
    }
}
