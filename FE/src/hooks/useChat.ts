import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/react";
import {
  listChatSessions,
  getSessionMessages,
  sendChatMessage,
  renameChatSession,
  archiveChatSession,
} from "../services/chatService";
import { waitForJobCompletion } from "../services/jobService";
import type { ChatSessionDto, UiChatMessage } from "../types/chat";

function toUiMessage(m: {
  id: string;
  role: "user" | "assistant";
  content: string;
  responseType: UiChatMessage["responseType"];
  jobId: string | null;
  result: UiChatMessage["result"];
  createdAt: string;
}): UiChatMessage {
  return { ...m };
}

/** Parses the {message:"..."} shape thrown by services/api.ts into plain text. */
function friendlyError(err: unknown): string {
  if (err instanceof Error) {
    try {
      const parsed = JSON.parse(err.message);
      if (parsed?.message) return parsed.message as string;
    } catch {
      /* not JSON — fall through */
    }
    return err.message;
  }
  return "Something went wrong.";
}

export function useChat() {
  const { getToken } = useAuth();

  const [sessions, setSessions] = useState<ChatSessionDto[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pendingStage, setPendingStage] = useState<string | null>(null);

  // Guards against a stale poll loop overwriting state after the user
  // switches sessions mid-request.
  const activeSessionRef = useRef<string | null>(null);
  activeSessionRef.current = activeSessionId;
  const pollAbortRef = useRef<AbortController | null>(null);

  const refreshSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated.");
      const list = await listChatSessions(token);
      setSessions(list);
    } catch (err) {
      setSessionsError(friendlyError(err));
    } finally {
      setSessionsLoading(false);
    }
  }, [getToken]);

  const loadMessages = useCallback(
    async (sessionId: string) => {
      setMessagesLoading(true);
      try {
        const token = await getToken();
        if (!token) throw new Error("Not authenticated.");
        const list = await getSessionMessages(token, sessionId);
        // Only apply if the user hasn't since navigated to a different session.
        if (activeSessionRef.current === sessionId) {
          setMessages(list.map(toUiMessage));
        }
      } catch (err) {
        setSendError(friendlyError(err));
      } finally {
        if (activeSessionRef.current === sessionId) {
          setMessagesLoading(false);
        }
      }
    },
    [getToken],
  );

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  /** Sidebar "New Chat" — clears the window; the session itself is created lazily on first send. */
  const startNewChat = useCallback(() => {
    pollAbortRef.current?.abort();
    setActiveSessionId(null);
    setMessages([]);
    setSendError(null);
  }, []);

  /** Sidebar item click — loads that session's transcript. */
  const selectSession = useCallback(
    (sessionId: string) => {
      if (sessionId === activeSessionId) return;
      pollAbortRef.current?.abort();
      setActiveSessionId(sessionId);
      setSendError(null);
      loadMessages(sessionId);
    },
    [activeSessionId, loadMessages],
  );

  const renameSession = useCallback(
    async (sessionId: string, title: string) => {
      const token = await getToken();
      if (!token) return;
      const updated = await renameChatSession(token, sessionId, title);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? updated : s)),
      );
    },
    [getToken],
  );

  const archiveSession = useCallback(
    async (sessionId: string) => {
      const token = await getToken();
      if (!token) return;
      await archiveChatSession(token, sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        startNewChat();
      }
    },
    [getToken, activeSessionId, startNewChat],
  );

  /** Sends a prompt in the CURRENT session (or starts a new one if none is active yet). */
  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isSending) return;

      setSendError(null);
      const token = await getToken();
      if (!token) {
        setSendError("Not authenticated.");
        return;
      }

      const sessionIdAtSend = activeSessionRef.current;

      // Optimistic user bubble.
      const optimisticUser: UiChatMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        content: trimmed,
        responseType: null,
        jobId: null,
        result: null,
        createdAt: new Date().toISOString(),
      };
      const pendingAssistant: UiChatMessage = {
        id: `pending-${Date.now()}`,
        role: "assistant",
        content: "",
        responseType: null,
        jobId: null,
        result: null,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimisticUser, pendingAssistant]);
      setIsSending(true);

      const controller = new AbortController();
      pollAbortRef.current = controller;

      try {
        // sessionId is attached here so the backend routes this job's
        // context strictly to this session's SummaryText.
        const { jobId, sessionId } = await sendChatMessage(
          token,
          trimmed,
          sessionIdAtSend,
        );

        // A brand-new session was created server-side on this first message.
        if (!sessionIdAtSend) {
          setActiveSessionId(sessionId);
          activeSessionRef.current = sessionId;
          refreshSessions();
        }

        const finalStatus = await waitForJobCompletion(getToken, token, jobId, {
          signal: controller.signal,
          onProgress: (u) => setPendingStage(u.stage),
        });

        if (finalStatus.status === "failed") {
          throw new Error(
            finalStatus.error ?? "The assistant failed to respond.",
          );
        }

        // Re-fetch the authoritative transcript (this also picks up the
        // assistant's persisted reply and drops our optimistic placeholder).
        if (activeSessionRef.current === sessionId) {
          await loadMessages(sessionId);
        }
        // Sidebar ordering/title can change after the first message.
        refreshSessions();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSendError(friendlyError(err));
        setMessages((prev) =>
          prev.map((m) =>
            m.pending ? { ...m, pending: false, failed: true } : m,
          ),
        );
      } finally {
        setIsSending(false);
        setPendingStage(null);
      }
    },
    [getToken, isSending, loadMessages, refreshSessions],
  );

  return {
    sessions,
    sessionsLoading,
    sessionsError,
    activeSessionId,
    messages,
    messagesLoading,
    isSending,
    sendError,
    pendingStage,
    startNewChat,
    selectSession,
    renameSession,
    archiveSession,
    sendMessage,
  };
}
