import { api } from "./api";
import { getJobResult } from "./jobService";
import type {
  ChatSessionDto,
  ChatMessageDto,
  SendMessageResult,
  SubmitTechChoicesResult,
  TechChoiceSelections,
} from "../types/chat";

// ── Sessions ────────────────────────────────────────────────────────────────

/** GET /api/chat/sessions — sidebar list, newest activity first (BE already orders this). */
export function listChatSessions(token: string): Promise<ChatSessionDto[]> {
  return api<ChatSessionDto[]>("/api/chat/sessions", token);
}

/** POST /api/chat/sessions — explicit "New Chat". Title is optional; BE derives one from the first message if omitted. */
export function createChatSession(
  token: string,
  title?: string,
): Promise<ChatSessionDto> {
  return api<ChatSessionDto>("/api/chat/sessions", token, {
    method: "POST",
    body: JSON.stringify({ title: title ?? null }),
  });
}

/** GET /api/chat/sessions/{id}/messages — full transcript for the session, oldest first. */
export function getSessionMessages(
  token: string,
  sessionId: string,
): Promise<ChatMessageDto[]> {
  return api<ChatMessageDto[]>(
    `/api/chat/sessions/${sessionId}/messages`,
    token,
  );
}

/** PATCH /api/chat/sessions/{id} — rename from the sidebar's "..." menu. */
export function renameChatSession(
  token: string,
  sessionId: string,
  title: string,
): Promise<ChatSessionDto> {
  return api<ChatSessionDto>(`/api/chat/sessions/${sessionId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

/** DELETE /api/chat/sessions/{id} — soft-archive (BE flips Status, doesn't hard-delete). */
export function archiveChatSession(
  token: string,
  sessionId: string,
): Promise<void> {
  return api<void>(`/api/chat/sessions/${sessionId}`, token, {
    method: "DELETE",
  });
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
  return api<SendMessageResult>("/api/chat/message", token, {
    method: "POST",
    body: JSON.stringify({ content, sessionId: sessionId ?? null }),
  });
}

// ── Result backfill ─────────────────────────────────────────────────────────

const RESULT_BACKED_TYPES = new Set(["gap_analysis", "study_plan"]);

/** A transcript message after attachMissingResults has run. */
export type BackfilledMessage = ChatMessageDto & {
  /**
   * True only when a result fetch was attempted for this message and it
   * failed. Distinguishes "we tried and it broke" from "there was never a
   * jobId to fetch" so the UI can show an accurate, non-alarming message
   * for old transcript rows instead of a blanket error state.
   */
  resultFetchFailed?: boolean;
};

/**
 * Backfills `result` for assistant messages whose responseType requires a
 * structured payload but which the BE didn't inline (e.g. older rows, or a
 * transcript endpoint that only returns summary fields). Best-effort per
 * message — a single failed fetch doesn't block the rest of the transcript.
 */
export async function attachMissingResults(
  token: string,
  messages: ChatMessageDto[],
): Promise<BackfilledMessage[]> {
  const needsResult = messages.filter(
    (m) =>
      m.role === "assistant" &&
      m.responseType &&
      RESULT_BACKED_TYPES.has(m.responseType) &&
      m.result == null &&
      m.jobId,
  );

  if (needsResult.length === 0) return messages;

  const fetched = await Promise.all(
    needsResult.map(async (m) => {
      try {
        const { result } = await getJobResult(token, m.jobId as string);
        return [m.id, result, false] as const;
      } catch {
        // Leave result null but flag the attempt so the UI can tell this
        // apart from a message that never had a jobId to fetch.
        return [m.id, null, true] as const;
      }
    }),
  );

  const byId = new Map(fetched.map(([id, result, failed]) => [id, { result, failed }]));
  return messages.map((m) => {
    const patch = byId.get(m.id);
    if (!patch) return m;
    return {
      ...m,
      result: patch.result,
      resultFetchFailed: patch.failed,
    };
  });
}

// ── Study plan resume (tech_choices) ────────────────────────────────────────

/**
 * PLACEHOLDER — this route/method is NOT confirmed against a real backend
 * endpoint. It's my best guess at the shape given the existing REST
 * conventions in this file (POST /api/chat/sessions/{id}/...), not
 * something read off real BE code. Once BE confirms the real route,
 * update this one function and nothing else needs to change — every
 * caller goes through submitTechChoiceSelections below.
 */
function techChoicesResumeEndpoint(sessionId: string): string {
  return `/api/chat/sessions/${sessionId}/tech-choices`;
}

/**
 * Submits the user's per-category radio selections to resume a study-plan
 * job that's paused with awaiting_user_input: true.
 *
 * ASSUMPTION: see techChoicesResumeEndpoint above, and confirm whether BE
 * expects `jobId` (to identify which paused job to resume) alongside
 * `selections`, before relying on this against a real backend.
 */
export function submitTechChoiceSelections(
  token: string,
  sessionId: string,
  jobId: string,
  selections: TechChoiceSelections,
): Promise<SubmitTechChoicesResult> {
  return api<SubmitTechChoicesResult>(
    techChoicesResumeEndpoint(sessionId),
    token,
    {
      method: "POST",
      body: JSON.stringify({ jobId, selections }),
    },
  );
}
