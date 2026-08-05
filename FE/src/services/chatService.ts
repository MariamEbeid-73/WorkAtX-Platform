import { api } from './api';
import type {
  ChatSessionDto,
  ChatMessageDto,
  SendMessageResult,
  JobStatusDto,
  JobResultDto,
} from '../types/chat';

// ── Sessions ────────────────────────────────────────────────────────────────

/** GET /api/chat/sessions — sidebar list, newest activity first (BE already orders this). */
export function listChatSessions(token: string): Promise<ChatSessionDto[]> {
  return api<ChatSessionDto[]>('/api/chat/sessions', token);
}

/** POST /api/chat/sessions — explicit "New Chat". Title is optional; BE derives one from the first message if omitted. */
export function createChatSession(token: string, title?: string): Promise<ChatSessionDto> {
  return api<ChatSessionDto>('/api/chat/sessions', token, {
    method: 'POST',
    body: JSON.stringify({ title: title ?? null }),
  });
}

/** GET /api/chat/sessions/{id}/messages — full transcript for the session, oldest first. */
export function getSessionMessages(token: string, sessionId: string): Promise<ChatMessageDto[]> {
  return api<ChatMessageDto[]>(`/api/chat/sessions/${sessionId}/messages`, token);
}

/** PATCH /api/chat/sessions/{id} — rename from the sidebar's "..." menu. */
export function renameChatSession(
  token: string,
  sessionId: string,
  title: string,
): Promise<ChatSessionDto> {
  return api<ChatSessionDto>(`/api/chat/sessions/${sessionId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

/** DELETE /api/chat/sessions/{id} — soft-archive (BE flips Status, doesn't hard-delete). */
export function archiveChatSession(token: string, sessionId: string): Promise<void> {
  return api<void>(`/api/chat/sessions/${sessionId}`, token, { method: 'DELETE' });
}

// ── Messaging ───────────────────────────────────────────────────────────────

/**
 * POST /api/chat/message
 * sessionId omitted (undefined/null) -> BE creates a new session and returns
 * its id. Always pass the CURRENT active sessionId once one exists so every
 * follow-up question lands in the same session (and therefore uses that
 * session's SummaryText as AI context — see ChatController.SendMessage).
 */
export function sendChatMessage(
  token: string,
  content: string,
  sessionId?: string | null,
): Promise<SendMessageResult> {
  return api<SendMessageResult>('/api/chat/message', token, {
    method: 'POST',
    body: JSON.stringify({ content, sessionId: sessionId ?? null }),
  });
}

// ── Job polling ─────────────────────────────────────────────────────────────
// Chat job completion is NOT pushed over SignalR in this backend (only
// gap-analysis stage/progress is). JobController's own doc comment says the
// frontend is expected to poll /status every 1-2s and fetch /result once done.

export function getJobStatus(token: string, jobId: string): Promise<JobStatusDto> {
  return api<JobStatusDto>(`/api/jobs/${jobId}/status`, token);
}

export function getJobResult(token: string, jobId: string): Promise<JobResultDto> {
  return api<JobResultDto>(`/api/jobs/${jobId}/result`, token);
}

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 120_000; // 2 minutes — matches typical AI worker SLA

/**
 * Polls a job until it completes or fails, then resolves with its final
 * status. Callers re-fetch the session's message list afterward rather than
 * trusting the raw job result payload, since the backend is the single
 * source of truth for the persisted transcript (see InternalAiController.SaveChatResultAsync).
 */
export async function pollJobUntilDone(
  token: string,
  jobId: string,
  opts?: { signal?: AbortSignal },
): Promise<JobStatusDto> {
  const start = Date.now();

  while (true) {
    if (opts?.signal?.aborted) {
      throw new DOMException('Polling aborted', 'AbortError');
    }
    const status = await getJobStatus(token, jobId);
    if (status.status === 'completed' || status.status === 'failed') {
      return status;
    }
    if (Date.now() - start > POLL_TIMEOUT_MS) {
      throw new Error('Timed out waiting for the assistant to respond.');
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}
