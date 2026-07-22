namespace BE.DTOs.Feedback;

public record FeedbackRequest(
    string Type,      // "bug" | "feature" | "general"
    string Message,
    int?   Rating     // optional 1–5 star rating
);
