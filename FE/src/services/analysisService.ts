import { api } from './api';
import type { ApiResponse } from '../types/profile';
import type { AnalysisResult } from '../types/analysis';

/** Response of POST /api/analysis1/start. */
export interface StartAnalysisResponse {
  jobId: string;
}

/** POST /api/analysis1/start — creates + queues a fresh parse job. */
export const startAnalysis = (token: string): Promise<StartAnalysisResponse> =>
  api<StartAnalysisResponse>('/api/analysis1/start', token, { method: 'POST' });

/**
 * GET /api/analysis1/latest — returns the last completed analysis straight
 * from the DB. data is null when none exists yet (or a re-parse is in flight).
 * This NEVER queues a new job — use it to restore a result on page refresh.
 */
export const getLatestAnalysis = (token: string): Promise<ApiResponse<AnalysisResult | null>> =>
  api<ApiResponse<AnalysisResult | null>>('/api/analysis1/latest', token);
