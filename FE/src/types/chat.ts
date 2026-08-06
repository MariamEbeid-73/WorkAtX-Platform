// Mirrors BE/DTOs/Chat/ChatSessionDtos.cs and BE/DTOs/Jobs/*.cs exactly.
// Keep these in sync with the backend records if either side changes shape.

export type ChatMessageRole = 'user' | 'assistant';

export type AiResponseType = 'normal_text' | 'gap_analysis' | 'study_plan';

export type JobStatusValue = 'queued' | 'processing' | 'completed' | 'failed';

/** GET /api/chat/sessions, POST /api/chat/sessions, PATCH /api/chat/sessions/{id} */
export interface ChatSessionDto {
  id: string;
  title: string | null;
  status: 'active' | 'archived';
  lastMessageAt: string | null;
  createdAt: string;
}

/** GET /api/chat/sessions/{id}/messages */
export interface ChatMessageDto {
  id: string;
  role: ChatMessageRole;
  content: string;
  responseType: AiResponseType | null;
  jobId: string | null;
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
export interface UiChatMessage extends Omit<ChatMessageDto, 'id'> {
  id: string;
  /** True while the matching job is still queued/processing. */
  pending?: boolean;
  /** True if the job failed — rendered as an inline error bubble. */
  failed?: boolean;
}
