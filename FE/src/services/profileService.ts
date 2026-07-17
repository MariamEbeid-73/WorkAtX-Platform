import { config } from '../config';
import type {
  ApiResponse,
  UserProfile,
  GitHubIdentity,
  ScoreBreakdown,
  UpdateProfilePayload,
  ToggleOpenToWorkPayload,
  AnalyzeProfileResponse,
  FeedbackPayload,
} from '../types/profile';

// ─── Base helper ────────────────────────────────────────────────────────────
async function apiRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Proposed API Endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/profile
 * Returns the full developer profile for the authenticated user.
 */
export const getProfile = (token: string) =>
  apiRequest<ApiResponse<UserProfile>>('/api/profile', token);

/**
 * PATCH /api/profile
 * Updates mutable profile fields (handle, bio, location, tech stack, social links).
 */
export const updateProfile = (token: string, payload: UpdateProfilePayload) =>
  apiRequest<ApiResponse<UserProfile>>('/api/profile', token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

/**
 * GET /api/profile/scores
 * Returns the full score breakdown: Overall, Dev Score, AI/ML Score tabs.
 * Each tab contains { overallShowoff, resume, github } metrics.
 */
export const getScoreBreakdown = (token: string) =>
  apiRequest<ApiResponse<ScoreBreakdown>>('/api/profile/scores', token);

/**
 * POST /api/profile/analyze
 * Triggers a background re-analysis of the user's CV, GitHub, and scores.
 * Returns a jobId to poll for completion.
 */
export const reanalyzeProfile = (token: string) =>
  apiRequest<ApiResponse<AnalyzeProfileResponse>>('/api/profile/analyze', token, {
    method: 'POST',
  });

/**
 * POST /api/profile/open-to-work
 * Toggles the user's "Open to Work" status for company matching.
 */
export const toggleOpenToWork = (
  token: string,
  payload: ToggleOpenToWorkPayload,
) =>
  apiRequest<ApiResponse<{ isOpenToWork: boolean }>>('/api/profile/open-to-work', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/**
 * GET /api/github/verify
 * Returns GitHub developer identity: linked status, username, repos, etc.
 */
export const getGitHubIdentity = (token: string) =>
  apiRequest<ApiResponse<GitHubIdentity>>('/api/github/verify', token);

/**
 * POST /api/github/verify
 * Initiates the GitHub OAuth verification flow (returns an OAuth redirect URL).
 */
export const initiateGitHubVerify = (token: string) =>
  apiRequest<ApiResponse<{ oauthUrl: string }>>('/api/github/verify', token, {
    method: 'POST',
  });

/**
 * GET /api/profile/resume
 * Returns a presigned URL for the user's uploaded resume.
 */
export const getResumeUrl = (token: string) =>
  apiRequest<ApiResponse<{ url: string; expiresAt: string }>>('/api/profile/resume', token);

/**
 * POST /api/feedback
 * Submits user feedback (bug report, feature request, or general comment).
 */
export const submitFeedback = (token: string, payload: FeedbackPayload) =>
  apiRequest<ApiResponse<{ id: string }>>('/api/feedback', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
