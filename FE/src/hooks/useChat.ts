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
import { getJobStatus, waitForJobCompletion } from "../services/jobService";
import type { ChatSessionDto, JobStatusDto, UiChatMessage, TechChoiceSelections } from "../types/chat";

interface RestoredPendingJob {
    jobId: string;
    sessionId: string;
}

const ACTIVE_CHAT_SESSION_KEY = "workx-active-chat-session";

/**
 * Serializes the few fields that actually affect rendering into a stable
 * signature string. Used by `loadMessages` to reuse the *previous* message
 * object reference for any row whose logical content hasn't changed — so a
 * re-fetched transcript (which rebuilds every message object from scratch
 * with new identities) doesn't blow away referential identity for the rows
 * that didn't change. Combined with `React.memo(ChatMessageBubble)`, that
 * means unchanged rows skip re-rendering on every AI reply.
 */
function chatMessageSignature(m: UiChatMessage): string {
    return JSON.stringify({
        id: m.id,
        role: m.role,
        content: m.content,
        responseType: m.responseType,
        jobId: m.jobId,
        result: m.result,
        createdAt: m.createdAt,
        pending: m.pending,
        pendingStage: m.pendingStage,
        pendingProgress: m.pendingProgress,
        failed: m.failed,
        resultStatus: m.resultStatus,
    });
}

/**
 * Merges a freshly fetched transcript (`next`) into the current `prev`
 * state, reusing the previous object reference for any message that is
 * logically unchanged (same id + same signature). Synthetic optimistic /
 * pending placeholders (`local-…`, `pending-…`, `failed-…`) simply drop
 * out because the server transcript uses real ids for those rows. This
 * keeps referential identity for stable rows so memoized consumers can
 * short-circuit.
 */
function mergeTranscript(prev: UiChatMessage[], next: UiChatMessage[]): UiChatMessage[] {
    if (prev.length === 0) return next;
    const prevById = new Map(prev.map((m) => [m.id, m] as const));
    return next.map((nm) => {
        const pm = prevById.get(nm.id);
        if (pm && chatMessageSignature(pm) === chatMessageSignature(nm)) return pm;
        return nm;
    });
}

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
    const [restoredPendingJobs, setRestoredPendingJobs] = useState<RestoredPendingJob[]>([]);

    // Guards against a stale poll loop overwriting state after the user
    // switches sessions mid-request.
    const activeSessionRef = useRef<string | null>(null);
    activeSessionRef.current = activeSessionId;
    const pollAbortRef = useRef<AbortController | null>(null);
    const sessionRestoreAttemptedRef = useRef(false);

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
        async (sessionId: string, opts?: { background?: boolean }) => {
            // A background refresh (after a job completes) must NOT flash the
            // "Loading conversation…" spinner / hide the existing bubbles —
            // it would wipe the visible chat on every AI reply. Only an
            // initial load (mount restore, session switch) shows the spinner.
            if (!opts?.background) setMessagesLoading(true);
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
                                per_job_match_scores: r.per_job_match_scores ?? [],
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

                const normalized: UiChatMessage[] = backfilled.map((m) => {
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

                // A user turn is persisted before its job is published, while
                // the assistant turn is written only when the worker finishes.
                // That durable JobId relationship lets us reconstruct pending
                // bubbles after a refresh without a new backend endpoint.
                const assistantJobIds = new Set(
                    normalized
                        .filter((m) => m.role === "assistant" && m.jobId)
                        .map((m) => m.jobId as string),
                );
                const orphanedUserTurns = normalized.filter(
                    (m) => m.role === "user" && m.jobId && !assistantJobIds.has(m.jobId),
                );
                const orphanedStatuses = await Promise.all(
                    orphanedUserTurns.map(async (m) => {
                        try {
                            return await getJobStatus(token, m.jobId as string);
                        } catch {
                            return null;
                        }
                    }),
                );
                const statusByJobId = new Map(
                    orphanedStatuses
                        .filter((status) => status !== null)
                        .map((status) => [status.jobId, status]),
                );

                const restoredMessages = normalized.flatMap((m): UiChatMessage[] => {
                    if (m.role !== "user" || !m.jobId) return [m];
                    const status = statusByJobId.get(m.jobId);
                    if (!status) return [m];

                    if (status.status === "failed") {
                        return [m, {
                            id: `failed-${status.jobId}`,
                            role: "assistant",
                            content: "",
                            responseType: null,
                            jobId: status.jobId,
                            result: null,
                            createdAt: status.updatedAt,
                            failed: true,
                        }];
                    }

                    return [m, {
                        id: `pending-${status.jobId}`,
                        role: "assistant",
                        content: "",
                        responseType: null,
                        jobId: status.jobId,
                        result: null,
                        createdAt: status.updatedAt,
                        pending: true,
                        pendingStage: status.status === "completed"
                            ? "Finalizing response…"
                            : status.stage,
                        pendingProgress: status.progress,
                    }];
                });

                const jobsToResume = orphanedStatuses
                    .filter((status): status is JobStatusDto => status !== null && status.status !== "failed")
                    .map((status) => ({ jobId: status.jobId, sessionId }));

                // Only apply if the user hasn't since navigated to a different session.
                if (activeSessionRef.current === sessionId) {
                    setMessages((prev) => mergeTranscript(prev, restoredMessages));
                    setRestoredPendingJobs(jobsToResume);
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

    // Resume active jobs discovered while reconstructing a session. The same
    // waiter handles SignalR plus polling, and loadMessages replaces synthetic
    // bubbles with the authoritative assistant rows when all jobs finish.
    useEffect(() => {
        if (restoredPendingJobs.length === 0) return;

        const sessionId = restoredPendingJobs[0].sessionId;
        const controller = new AbortController();
        pollAbortRef.current?.abort();
        pollAbortRef.current = controller;
        let disposed = false;
        setIsSending(true);

        const resume = async () => {
            try {
                const token = await getToken();
                if (!token) throw new Error("Not authenticated.");

                await Promise.all(restoredPendingJobs.map(async ({ jobId }) => {
                    const final = await waitForJobCompletion(getToken, token, jobId, {
                        signal: controller.signal,
                        onProgress: (update) => {
                            if (disposed || activeSessionRef.current !== sessionId) return;
                            if (update.stage) setPendingStage(update.stage);
                            setMessages((prev) => prev.map((m) => {
                                if (!m.pending || m.jobId !== jobId) return m;
                                const nextStage = update.stage ?? m.pendingStage;
                                if (nextStage === m.pendingStage && update.progress === m.pendingProgress) return m;
                                return {
                                    ...m,
                                    pendingStage: nextStage,
                                    pendingProgress: update.progress,
                                };
                            }));
                        },
                    });

                    if (final.status === "failed") {
                        setMessages((prev) => prev.map((m) =>
                            m.pending && m.jobId === jobId
                                ? { ...m, pending: false, failed: true }
                                : m
                        ));
                    }
                }));

                if (!disposed && activeSessionRef.current === sessionId) {
                    await loadMessages(sessionId, { background: true });
                    void refreshSessions();
                }
            } catch (err) {
                if (err instanceof DOMException && err.name === "AbortError") return;
                if (!disposed && activeSessionRef.current === sessionId) {
                    setSendError(friendlyError(err));
                    setMessages((prev) => prev.map((m) =>
                        m.pending ? { ...m, pendingStage: "Reconnecting…" } : m
                    ));
                }
            } finally {
                if (!disposed && activeSessionRef.current === sessionId) {
                    setIsSending(false);
                    setPendingStage(null);
                }
            }
        };

        void resume();
        return () => {
            disposed = true;
            controller.abort();
        };
    }, [getToken, loadMessages, refreshSessions, restoredPendingJobs]);

    useEffect(() => {
        refreshSessions();
    }, [refreshSessions]);

    useEffect(() => {
        if (sessionsLoading || sessionRestoreAttemptedRef.current) return;
        sessionRestoreAttemptedRef.current = true;

        const savedSessionId = window.sessionStorage.getItem(ACTIVE_CHAT_SESSION_KEY);
        if (!savedSessionId) return;

        if (!sessions.some((session) => session.id === savedSessionId)) {
            window.sessionStorage.removeItem(ACTIVE_CHAT_SESSION_KEY);
            return;
        }

        activeSessionRef.current = savedSessionId;
        setActiveSessionId(savedSessionId);
        void loadMessages(savedSessionId);
    }, [loadMessages, sessions, sessionsLoading]);

    /** Sidebar "New Chat" — clears the window; the session itself is created lazily on first send. */
    const startNewChat = useCallback(() => {
        pollAbortRef.current?.abort();
        window.sessionStorage.removeItem(ACTIVE_CHAT_SESSION_KEY);
        activeSessionRef.current = null;
        setActiveSessionId(null);
        setMessages([]);
        setRestoredPendingJobs([]);
        setIsSending(false);
        setPendingStage(null);
        setSendError(null);
    }, []);

    /** Sidebar item click — loads that session's transcript. */
    const selectSession = useCallback(
        (sessionId: string) => {
            if (sessionId === activeSessionId) return;
            pollAbortRef.current?.abort();
            activeSessionRef.current = sessionId;
            window.sessionStorage.setItem(ACTIVE_CHAT_SESSION_KEY, sessionId);
            setActiveSessionId(sessionId);
            setRestoredPendingJobs([]);
            setIsSending(false);
            setPendingStage(null);
            setSendError(null);
            void loadMessages(sessionId);
        },
        [activeSessionId, loadMessages]
    );

    /** Resume a paused study-plan by submitting tech-choice selections. */
    const resumeStudyPlanWithSelections = useCallback(
        async (jobId: string, selections: TechChoiceSelections) => {
            if (isSending) return;

            setSendError(null);
            setIsSending(true);
            const controller = new AbortController();
            pollAbortRef.current = controller;
            let pendingMessageId: string | null = null;
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

                pendingMessageId = `pending-${newJobId}`;
                setMessages((prev) => [...prev, {
                    id: pendingMessageId as string,
                    role: "assistant",
                    content: "",
                    responseType: null,
                    jobId: newJobId,
                    result: null,
                    createdAt: new Date().toISOString(),
                    pending: true,
                    pendingStage: null,
                    pendingProgress: null,
                }]);

                const final = await waitForJobCompletion(getToken, token, newJobId, {
                    signal: controller.signal,
                    onProgress: (update) => {
                        if (update.stage) setPendingStage(update.stage);
                        setMessages((prev) => prev.map((m) => {
                            if (m.jobId !== newJobId || !m.pending) return m;
                            const nextStage = update.stage ?? m.pendingStage;
                            if (nextStage === m.pendingStage && update.progress === m.pendingProgress) return m;
                            return {
                                ...m,
                                pendingStage: nextStage,
                                pendingProgress: update.progress,
                            };
                        }));
                    },
                });

                if (final.status === "failed") throw new Error(final.error ?? "Resume failed");

                // Refresh UI
                refreshSessions();
                if (activeSessionRef.current) await loadMessages(activeSessionRef.current, { background: true });
            } catch (err) {
                if (err instanceof DOMException && err.name === "AbortError") return;
                setSendError(friendlyError(err));
                if (pendingMessageId) {
                    setMessages((prev) => prev.map((m) =>
                        m.id === pendingMessageId
                            ? { ...m, pending: false, failed: true }
                            : m
                    ));
                }
            } finally {
                setIsSending(false);
                setPendingStage(null);
            }
        },
        [getToken, isSending, loadMessages, refreshSessions]
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
            setPendingStage(null);
            const token = await getToken();
            if (!token) {
                setSendError("Not authenticated.");
                return;
            }

            const sessionIdAtSend = activeSessionRef.current;
            const optimisticId = Date.now();
            const pendingMessageId = `pending-${optimisticId}`;

            // Optimistic user bubble and assistant pending placeholder.
            const optimisticUser: UiChatMessage = {
                id: `local-${optimisticId}`,
                role: "user",
                content: trimmed,
                responseType: null,
                jobId: null,
                result: null,
                createdAt: new Date().toISOString(),
            };
            const pendingAssistant: UiChatMessage = {
                id: pendingMessageId,
                role: "assistant",
                content: "",
                responseType: null,
                jobId: null,
                result: null,
                createdAt: new Date().toISOString(),
                pending: true,
                pendingStage: null,
                pendingProgress: null,
            };
            setMessages((prev) => [...prev, optimisticUser, pendingAssistant]);
            setIsSending(true);

            const controller = new AbortController();
            pollAbortRef.current = controller;
            let submittedJob: { jobId: string; sessionId: string } | null = null;

            try {
                // Dispatches prompt to backend and creates/routes session context.
                const { jobId, sessionId } = await sendChatMessage(
                    token,
                    trimmed,
                    sessionIdAtSend
                );
                submittedJob = { jobId, sessionId };

                setMessages((prev) => prev.map((m) =>
                    m.id === pendingMessageId ? { ...m, jobId } : m
                ));

                // Lazily set new active session ID if started from fresh chat window.
                if (!sessionIdAtSend) {
                    setActiveSessionId(sessionId);
                    activeSessionRef.current = sessionId;
                    window.sessionStorage.setItem(ACTIVE_CHAT_SESSION_KEY, sessionId);
                    refreshSessions();
                }

                // Polls until background Celery job finishes execution.
                const finalStatus = await waitForJobCompletion(getToken, token, jobId, {
                    signal: controller.signal,
                    onProgress: (update) => {
                        if (update.stage) setPendingStage(update.stage);
                        setMessages((prev) => prev.map((m) => {
                            if (m.id !== pendingMessageId) return m;
                            const nextStage = update.stage ?? m.pendingStage;
                            if (m.jobId === jobId && nextStage === m.pendingStage && update.progress === m.pendingProgress) return m;
                            return {
                                ...m,
                                jobId,
                                pendingStage: nextStage,
                                pendingProgress: update.progress,
                            };
                        }));
                    },
                });

                if (finalStatus.status === "failed") {
                    setSendError(finalStatus.error ?? "The assistant failed to respond.");
                    setMessages((prev) => prev.map((m) =>
                        m.id === pendingMessageId
                            ? { ...m, pending: false, failed: true }
                            : m
                    ));
                    return;
                }

                // Re-fetch authoritative database transcript and refresh list.
                if (activeSessionRef.current === sessionId) {
                    await loadMessages(sessionId, { background: true });
                }
                refreshSessions();
            } catch (err) {
                if (err instanceof DOMException && err.name === "AbortError") return;
                setSendError(friendlyError(err));

                // Once the backend has accepted a job, a socket/poll/transcript
                // fetch error says only that this browser lost contact. Keep
                // the bubble pending and let the normal resume path reconcile
                // the authoritative backend status instead of showing a false
                // AI failure.
                if (submittedJob) {
                    const jobToResume = submittedJob;
                    setMessages((prev) => prev.map((m) =>
                        m.id === pendingMessageId
                            ? { ...m, pendingStage: "Reconnecting…" }
                            : m
                    ));
                    setRestoredPendingJobs((prev) =>
                        prev.some(({ jobId }) => jobId === jobToResume.jobId)
                            ? prev
                            : [...prev, jobToResume]
                    );
                    return;
                }

                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === pendingMessageId
                            ? { ...m, pending: false, failed: true }
                            : m
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
