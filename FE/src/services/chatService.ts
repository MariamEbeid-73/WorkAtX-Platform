import { api } from "./api";
import type {
  ChatSessionDto,
  ChatMessageDto,
  SendMessageResult,
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
