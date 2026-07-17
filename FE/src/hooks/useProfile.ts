import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/react';
import {
  getProfile,
  getScoreBreakdown,
  reanalyzeProfile,
  toggleOpenToWork,
  getGitHubIdentity,
  getResumeUrl,
  submitFeedback,
} from '../services/profileService';
import type {
  UserProfile,
  ScoreBreakdown,
  GitHubIdentity,
  FeedbackPayload,
} from '../types/profile';

// ─── Generic async hook state ────────────────────────────────────────────────
interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

interface MutationState<T, V = void> {
  mutate: (variables: V) => Promise<T | null>;
  isPending: boolean;
  error: string | null;
  reset: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// useProfileQuery — GET /api/profile
// ─────────────────────────────────────────────────────────────────────────────
export function useProfileQuery(): QueryState<UserProfile> {
  const { getToken } = useAuth();
  const [data, setData] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        const res = await getProfile(token);
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [getToken, tick]);

  return { data, isLoading, error, refetch };
}

// ─────────────────────────────────────────────────────────────────────────────
// useScoresQuery — GET /api/profile/scores
// ─────────────────────────────────────────────────────────────────────────────
export function useScoresQuery(): QueryState<ScoreBreakdown> {
  const { getToken } = useAuth();
  const [data, setData] = useState<ScoreBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        const res = await getScoreBreakdown(token);
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [getToken, tick]);

  return { data, isLoading, error, refetch };
}

// ─────────────────────────────────────────────────────────────────────────────
// useGitHubIdentityQuery — GET /api/github/verify
// ─────────────────────────────────────────────────────────────────────────────
export function useGitHubIdentityQuery(): QueryState<GitHubIdentity> {
  const { getToken } = useAuth();
  const [data, setData] = useState<GitHubIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        const res = await getGitHubIdentity(token);
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [getToken, tick]);

  return { data, isLoading, error, refetch };
}

// ─────────────────────────────────────────────────────────────────────────────
// useReanalyzeProfile — POST /api/profile/analyze
// ─────────────────────────────────────────────────────────────────────────────
export function useReanalyzeProfile(): MutationState<{ jobId: string }> {
  const { getToken } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => setError(null), []);

  const mutate = useCallback(async (): Promise<{ jobId: string } | null> => {
    setIsPending(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const res = await reanalyzeProfile(token);
      return { jobId: res.data.jobId };
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setIsPending(false);
    }
  }, [getToken]);

  return { mutate, isPending, error, reset };
}

// ─────────────────────────────────────────────────────────────────────────────
// useToggleOpenToWork — POST /api/profile/open-to-work
// ─────────────────────────────────────────────────────────────────────────────
export function useToggleOpenToWork(): MutationState<
  { isOpenToWork: boolean },
  { isOpenToWork: boolean }
> {
  const { getToken } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => setError(null), []);

  const mutate = useCallback(
    async (payload: { isOpenToWork: boolean }): Promise<{ isOpenToWork: boolean } | null> => {
      setIsPending(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        const res = await toggleOpenToWork(token, payload);
        return res.data;
      } catch (err) {
        setError((err as Error).message);
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [getToken],
  );

  return { mutate, isPending, error, reset };
}

// ─────────────────────────────────────────────────────────────────────────────
// useResumeUrl — GET /api/profile/resume
// ─────────────────────────────────────────────────────────────────────────────
export function useResumeUrl(): QueryState<{ url: string; expiresAt: string }> {
  const { getToken } = useAuth();
  const [data, setData] = useState<{ url: string; expiresAt: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (tick === 0) return; // Only fetch when explicitly triggered
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        const res = await getResumeUrl(token);
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [getToken, tick]);

  return { data, isLoading, error, refetch };
}

// ─────────────────────────────────────────────────────────────────────────────
// useSubmitFeedback — POST /api/feedback
// ─────────────────────────────────────────────────────────────────────────────
export function useSubmitFeedback(): MutationState<{ id: string }, FeedbackPayload> {
  const { getToken } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => setError(null), []);

  const mutate = useCallback(
    async (payload: FeedbackPayload): Promise<{ id: string } | null> => {
      setIsPending(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        const res = await submitFeedback(token, payload);
        return res.data;
      } catch (err) {
        setError((err as Error).message);
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [getToken],
  );

  return { mutate, isPending, error, reset };
}
