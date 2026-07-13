namespace BE.Services.Abstractions;

public interface ICurrentUserService
{
    string GetClerkUserId();
    string GetEmail();
}