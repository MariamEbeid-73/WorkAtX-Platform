using BE.DTOs.Profile;

namespace BE.ServiceContracts;

public interface IProfileService
{
    Task<UserProfileResponse> GetProfileAsync();
    Task<UserProfileResponse> UpdateProfileAsync(UpdateProfileRequest request);
    Task<bool> ToggleOpenToWorkAsync(bool isOpenToWork);
    Task<object?> GetScoreBreakdownAsync();
}
