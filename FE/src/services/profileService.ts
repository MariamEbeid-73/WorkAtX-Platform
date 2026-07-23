import { api } from './api';
import type {
  ApiResponse,
  UserProfile,
  GitHubIdentity,
  ScoreBreakdown,
  UpdateProfilePayload,
  ToggleOpenToWorkPayload,
  FeedbackPayload,
} from '../types/profile';

export const getProfile = (token: string) =>
  api<ApiResponse<UserProfile>>('/api/profile', token);

/**
 * PATCH /api/profile
 * Updates mutable profile fields (handle, bio, location, tech stack, social links).
 */
export const updateProfile = (token: string, payload: UpdateProfilePayload) =>
  api<ApiResponse<UserProfile>>('/api/profile', token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

/**
 * GET /api/profile/scores
 * Returns the full score breakdown: Overall, Dev Score, AI/ML Score tabs.
 * Each tab contains { overallShowoff, resume, github } metrics.
 */
export const getScoreBreakdown = (token: string) =>
  api<ApiResponse<ScoreBreakdown>>('/api/profile/scores', token);

export const toggleOpenToWork = (
  token: string,
  payload: ToggleOpenToWorkPayload,
) =>
  api<ApiResponse<{ isOpenToWork: boolean }>>('/api/profile/open-to-work', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/**
 * GET /api/github/verify
 * Returns GitHub developer identity: linked status, username, repos, etc.
 */
export const getGitHubIdentity = (token: string) =>
  api<ApiResponse<GitHubIdentity>>('/api/github/verify', token);

export const submitFeedback = (token: string, payload: FeedbackPayload) =>
  api<ApiResponse<{ id: string }>>('/api/feedback', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
