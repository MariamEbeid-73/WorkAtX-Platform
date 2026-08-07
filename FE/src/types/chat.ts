// Mirrors BE/DTOs/Chat/ChatSessionDtos.cs and BE/DTOs/Jobs/*.cs exactly.
// Keep these in sync with the backend records if either side changes shape.

export type ChatMessageRole = "user" | "assistant";

export type AiResponseType = "normal_text" | "gap_analysis" | "study_plan";

export type JobStatusValue = "queued" | "processing" | "completed" | "failed";

/** GET /api/chat/sessions, POST /api/chat/sessions, PATCH /api/chat/sessions/{id} */
export interface ChatSessionDto {
  id: string;
  title: string | null;
  status: "active" | "archived";
  lastMessageAt: string | null;
  createdAt: string;
}

/**
 * The structured gap_analysis payload — mirrors the `gap_analysis` nested
 * schema in the Node 8 output contract (per_job_match_scores, matched,
 * missing, summary, etc.), plus the sibling top-level fields returned
 * alongside it.
 */
export interface GapAnalysisResult {
  gap_analysis: {
    per_job_match_scores: Array<{
      role_id: string;
      company: string;
      role: string;
      match_score: number;
      match_level: string;
    }>;
    skill_coverage_across_all_jobs: number;
    matched: string[];
    missing: Array<{
      skill: string;
      importance: string;
      required_by: number;
      of: number;
      jobs: string[];
      badge_color: string;
    }>;
    strengths: string[];
    weaknesses: string[];
    summary: string;
    company_info: string;
    urgency_note: string;
    jobs_analyzed: number;
    jobs_with_errors: string[];
    is_degraded: boolean;
  };
  user_report: string;
  tech_choices: unknown[];
  awaiting_user_input: boolean;
  error?: string;
}

/** GET /api/chat/sessions/{id}/messages */
export interface ChatMessageDto {
  id: string;
  role: ChatMessageRole;
  content: string;
  responseType: AiResponseType | null;
  jobId: string | null;
  /** Populated for gap_analysis/study_plan assistant messages only. */
  result: GapAnalysisResult | unknown | null;
  createdAt: string;
}

/** POST /api/chat/message response body */
export interface SendMessageResult {
  jobId: string;
  sessionId: string;
}

/** GET /api/jobs/{jobId}/status */
export interface JobStatusDto {
  jobId: string;
  jobType: string;
  status: JobStatusValue;
  error: string | null;
  stage: string | null;
  progress: number | null;
  updatedAt: string;
}

/** GET /api/jobs/{jobId}/result */
export interface JobResultDto {
  jobId: string;
  jobType: string;
  status: JobStatusValue;
  result: unknown;
  error: string | null;
}

/**
 * A message as rendered in the UI. Assistant messages that are still being
 * generated exist only on the client (optimistic) until the job resolves and
 * we re-fetch the real persisted transcript from the backend.
 */
export interface UiChatMessage extends Omit<ChatMessageDto, "id"> {
  id: string;
  /** True while the matching job is still queued/processing. */
  pending?: boolean;
  /** True if the job failed — rendered as an inline error bubble. */
  failed?: boolean;
}
