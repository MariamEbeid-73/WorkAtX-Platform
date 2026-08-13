import { api } from "./api";
import { subscribeToJob, type JobStatusUpdate } from "./jobSocket";
import type { JobStatusDto, JobResultDto } from "../types/chat";

/**
 * Generic helpers for waiting on any async job (chat, analysis1, ...).
 * Shared by every flow so the frontend has ONE way to track a job:
 * live SignalR push first, HTTP polling as a fallback.
 */

export function getJobStatus(
  token: string,
  jobId: string,
): Promise<JobStatusDto> {
  return api<JobStatusDto>(`/api/jobs/${jobId}/status`, token);
}

export function getJobResult(
  token: string,
  jobId: string,
): Promise<JobResultDto> {
  return api<JobResultDto>(`/api/jobs/${jobId}/result`, token);
}

const POLL_INTERVAL_MS = 1500;
// A cold role scrape can run for more than ten minutes, and transient
// connection failures can still consume multiple worker attempts. Keep the
// browser resumable for the full retry envelope instead of timing out shortly
// before a valid result is persisted.
const POLL_TIMEOUT_MS = 90 * 60 * 1000;

function toJobStatusUpdate(status: JobStatusDto): JobStatusUpdate {
  return {
    jobId: status.jobId,
    status: status.status,
    stage: status.stage,
    progress: status.progress,
    error: status.error,
    timestamp: status.updatedAt,
  };
}

/**
 * Polls a job until it completes or fails, then resolves with its final
 * status. Callers re-fetch authoritative data afterward rather than trusting
 * the raw job result payload, since the backend is the single source of
 * truth for persisted results (see InternalAiController.SubmitResult).
 */
export async function pollJobUntilDone(
  token: string,
  jobId: string,
  opts?: {
    signal?: AbortSignal;
    onProgress?: (u: JobStatusUpdate) => void;
  },
): Promise<JobStatusDto> {
  const start = Date.now();

  while (true) {
    if (opts?.signal?.aborted) {
      throw new DOMException("Polling aborted", "AbortError");
    }
    const status = await getJobStatus(token, jobId);
    opts?.onProgress?.(toJobStatusUpdate(status));
    if (status.status === "completed" || status.status === "failed") {
      return status;
    }
    if (Date.now() - start > POLL_TIMEOUT_MS) {
      throw new Error("Timed out waiting for the assistant to respond.");
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * Waits for a job to finish using the live SignalR push, falling back to
 * pollJobUntilDone if the socket doesn't resolve within SOCKET_FALLBACK_MS
 * (covers a dropped connection or a missed event).
 *
 * The backend pushes job_status_update over SignalR for EVERY transition
 * (queued -> processing -> completed/failed) plus in-flight stage/progress
 * ticks, for all job types — polling is only the safety net.
 */
export async function waitForJobCompletion(
  getToken: () => Promise<string | null>,
  token: string,
  jobId: string,
  opts: {
    signal?: AbortSignal;
    onProgress?: (u: JobStatusUpdate) => void;
  } = {},
): Promise<JobStatusDto> {
  const SOCKET_FALLBACK_MS = 8000;

  return new Promise((resolve, reject) => {
    let settled = false;
    let unsubscribe: (() => void) | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let pollController: AbortController | null = null;
    let pollingStarted = false;

    function abortWait() {
      finish(() => reject(new DOMException("Polling aborted", "AbortError")));
    }

    function finish(fn: () => void) {
      if (settled) return;
      settled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      unsubscribe?.();
      pollController?.abort();
      opts.signal?.removeEventListener("abort", abortWait);
      fn();
    }

    const reconcileStatus = (status: JobStatusDto) => {
      opts.onProgress?.(toJobStatusUpdate(status));
      if (status.status === "completed" || status.status === "failed") {
        finish(() => resolve(status));
      }
    };

    // Paint the authoritative persisted stage immediately. SignalR only
    // delivers events emitted after subscription, so without this request a
    // page opened mid-job can remain at 0% until the next progress event.
    getJobStatus(token, jobId)
      .then(reconcileStatus)
      .catch(() => {
        // The socket and polling fallback below still get a chance to recover.
      });

    subscribeToJob(getToken, jobId, (update) => {
      opts.onProgress?.(update);
      if (update.status === "completed" || update.status === "failed") {
        finish(() =>
          resolve({
            jobId: update.jobId,
            jobType: "",
            status: update.status,
            error: update.error,
            stage: update.stage,
            progress: update.progress,
            updatedAt: update.timestamp,
          }),
        );
      }
    })
      .then(async (unsub) => {
        if (settled) {
          unsub();
          return;
        }
        unsubscribe = unsub;
        // The job may have completed before this client joined the SignalR
        // group. Reconcile once over HTTP so a missed terminal event renders
        // immediately instead of waiting for the polling fallback.
        const status = await getJobStatus(token, jobId);
        reconcileStatus(status);
      })
      .catch(() => {
        /* socket failed to connect — fall back to polling below */
      });

    fallbackTimer = setTimeout(() => {
      if (settled || pollingStarted) return;
      pollingStarted = true;
      pollController = new AbortController();
      pollJobUntilDone(token, jobId, {
        signal: pollController.signal,
        onProgress: opts.onProgress,
      }).then(
        (status) => finish(() => resolve(status)),
        (error) => {
          if (settled && error instanceof DOMException && error.name === "AbortError") return;
          finish(() => reject(error));
        },
      );
    }, SOCKET_FALLBACK_MS);

    if (opts.signal?.aborted) {
      abortWait();
      return;
    }
    opts.signal?.addEventListener("abort", abortWait, { once: true });
  });
}
