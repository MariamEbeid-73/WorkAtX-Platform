import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/react";
import {
    listChatSessions,
    getSessionMessages,
    sendChatMessage,
    renameChatSession,
    archiveChatSession,
    attachMissingResults,
    submitTechChoiceSelections,
} from "../services/chatService";
import { waitForJobCompletion } from "../services/jobService";
import type { ChatSessionDto, UiChatMessage, TechChoiceSelections } from "../types/chat";

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

                // Backfill structured results for legacy rows if BE didn't inline them.
                const backfilled = await attachMissingResults(token, list);

                // Normalize result shape so the UI can safely render gap_analysis even
                // when the worker produced a legacy shape. Returns the canonical
                // GapAnalysisResult-like object or leaves unknowns untouched.
                const normalize = (r: any) => {
                    if (!r) return null;
                    if (r.gap_analysis) return r;
                    // Legacy/mock shape: summary + missing_skills + recommendations
                    if (typeof r === "object" && (r.summary || r.missing_skills || r.recommendations)) {
                        return {
                            gap_analysis: {
                                per_job_match_scores: [],
                                skill_coverage_across_all_jobs: r.skill_coverage_across_all_jobs ?? 0,
                                matched: r.matched ?? [],
                                missing: (r.missing_skills ?? []).map((ms: any) => ({
                                    skill: ms.name ?? ms.skill ?? "",
                                    importance: ms.importance ?? ms.importance_level ?? "required",
                                    required_by: ms.required_by ?? 1,
                                    of: ms.of ?? 1,
                                    jobs: ms.jobs ?? [],
                                    badge_color: ms.badge_color ?? undefined,
                                })),
                                strengths: r.strengths ?? [],
                                weaknesses: r.weaknesses ?? [],
                                summary: r.summary ?? "",
                                company_info: r.company_info ?? "",
                                urgency_note: r.urgency_note ?? "",
                                jobs_analyzed: r.jobs_analyzed ?? 0,
                                jobs_with_errors: r.jobs_with_errors ?? [],
                                is_degraded: r.is_degraded ?? false,
                            },
                            user_report: r.user_report ?? r.report ?? "",
                            tech_choices: r.tech_choices ?? [],
                            awaiting_user_input: r.awaiting_user_input ?? false,
                            error: r.error ?? undefined,
                        };
                    }
                    return r;
                };

                const normalized = backfilled.map((m) => {
                    const ui = toUiMessage(m as any);
                    const res = (m as any).result ?? null;
                    const norm = normalize(res);
                    if (norm) {
                        return { ...ui, result: norm, resultStatus: "ok" as const };
                    }

                    // If there's no jobId and no result, mark unavailable
                    if (!ui.jobId && ui.responseType && (ui.responseType === "gap_analysis" || ui.responseType === "study_plan")) {
                        return { ...ui, result: null, resultStatus: "unavailable" as const };
                    }

                    // If a fetch was attempted but failed, attach error status
                    if ((m as any).resultFetchFailed) {
                        return { ...ui, result: null, resultStatus: "error" as const };
                    }

                    return ui;
                });

                // Only apply if the user hasn't since navigated to a different session.
                if (activeSessionRef.current === sessionId) {
                    setMessages(normalized);
                }
            } catch (err) {
                setSendError(friendlyError(err));
            } finally {
                if (activeSessionRef.current === sessionId) {
                    setMessagesLoading(false);
                }
            }
        },
        [getToken]
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
        [activeSessionId, loadMessages]
    );

    /** Resume a paused study-plan by submitting tech-choice selections. */
    const resumeStudyPlanWithSelections = useCallback(
        async (jobId: string, selections: TechChoiceSelections) => {
            setSendError(null);
            setIsSending(true);
            const controller = new AbortController();
            pollAbortRef.current = controller;
            try {
                const token = await getToken();
                if (!token) throw new Error("Not authenticated.");
                if (!activeSessionRef.current) throw new Error("No active session.");

                const res = await submitTechChoiceSelections(
                    token,
                    activeSessionRef.current,
                    jobId,
                    selections,
                );

                const newJobId = (res as any).jobId;
                if (!newJobId) throw new Error("Backend did not return jobId.");

                const final = await waitForJobCompletion(getToken, token, newJobId, {
                    signal: controller.signal,
                    onProgress: (u) => setPendingStage(u.stage),
                });

                if (final.status === "failed") throw new Error(final.error ?? "Resume failed");

                // Refresh UI
                refreshSessions();
                if (activeSessionRef.current) await loadMessages(activeSessionRef.current);
            } catch (err) {
                setSendError(friendlyError(err));
            } finally {
                setIsSending(false);
                setPendingStage(null);
            }
        },
        [getToken, loadMessages, refreshSessions]
    );

    // Abort on unmount
    useEffect(() => {
        return () => pollAbortRef.current?.abort();
    }, []);

    const renameSession = useCallback(
        async (sessionId: string, title: string) => {
            const token = await getToken();
            if (!token) return;
            const updated = await renameChatSession(token, sessionId, title);
            setSessions((prev) =>
                prev.map((s) => (s.id === sessionId ? updated : s))
            );
        },
        [getToken]
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
        [getToken, activeSessionId, startNewChat]
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

            // Optimistic user bubble and assistant pending placeholder.
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
                // Dispatches prompt to backend and creates/routes session context.
                const { jobId, sessionId } = await sendChatMessage(
                    token,
                    trimmed,
                    sessionIdAtSend
                );

                // Lazily set new active session ID if started from fresh chat window.
                if (!sessionIdAtSend) {
                    setActiveSessionId(sessionId);
                    activeSessionRef.current = sessionId;
                    refreshSessions();
                }

                // Polls until background Celery job finishes execution.
                const finalStatus = await waitForJobCompletion(getToken, token, jobId, {
                    signal: controller.signal,
                    onProgress: (u) => setPendingStage(u.stage),
                });

                if (finalStatus.status === "failed") {
                    throw new Error(
                        finalStatus.error ?? "The assistant failed to respond."
                    );
                }

                // Re-fetch authoritative database transcript and refresh list.
                if (activeSessionRef.current === sessionId) {
                    await loadMessages(sessionId);
                }
                refreshSessions();
            } catch (err) {
                if (err instanceof DOMException && err.name === "AbortError") return;
                setSendError(friendlyError(err));
                setMessages((prev) =>
                    prev.map((m) =>
                        m.pending ? { ...m, pending: false, failed: true } : m
                    )
                );
            } finally {
                setIsSending(false);
                setPendingStage(null);
            }
        },
        [getToken, isSending, loadMessages, refreshSessions]
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
        refreshSessions,
        loadMessages,
        resumeStudyPlanWithSelections,
    };
}