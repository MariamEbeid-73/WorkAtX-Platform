namespace BE.Common;

/// <summary>
/// Standard API response envelope used across all profile endpoints.
/// 
/// Why a generic? Because the "data" payload changes per endpoint:
///   - GET /api/profile  → data is UserProfileResponse
///   - POST /api/feedback → data is { id: string }
///   - etc.
/// 
/// The generic type parameter T lets us reuse this wrapper for any type.
/// </summary>
public class ApiResponse<T>
{
    public T Data { get; init; }
    public bool Success { get; init; }
    public string? Message { get; init; }

    // Private constructor — callers use the static factory methods below
    private ApiResponse(T data, bool success, string? message)
    {
        Data    = data;
        Success = success;
        Message = message;
    }

    /// <summary>Creates a successful response wrapping the given data.</summary>
    public static ApiResponse<T> Ok(T data, string? message = null)
        => new(data, true, message);

    /// <summary>Creates a failed response (used rarely — errors go through the middleware).</summary>
    public static ApiResponse<T> Fail(T data, string message)
        => new(data, false, message);
}
