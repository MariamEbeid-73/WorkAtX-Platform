namespace BE.ServiceContracts;

public interface ICurrentUserService
{
    string GetClerkUserId();
    string GetEmail();
    string GetPlan();
}