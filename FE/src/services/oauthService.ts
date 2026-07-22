import { config } from '../config';
import type { ConnectedProvider } from '../types/oauth';

async function authFetch<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${config.apiUrl}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...init.headers,
        },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
    }
    return res.status === 204 ? (undefined as T) : res.json();
}

/**
 * Fetches the OAuth authorization URL from the backend and redirects the browser.
 */
export async function initiateOAuth(provider: 'github' | 'linkedin', token: string): Promise<void> {
    const res = await authFetch<{ url: string }>(`/oauth/${provider}/authorize`, token, { method: 'POST' });
    window.location.href = res.url;
}

/** Returns the list of providers the current user has connected. */
export const getConnections = (token: string): Promise<ConnectedProvider[]> =>
    authFetch<ConnectedProvider[]>('/oauth/connections', token);

/** Removes a connected provider. */
export const disconnect = (token: string, provider: string): Promise<void> =>
    authFetch<void>(`/oauth/${provider}/disconnect`, token, { method: 'DELETE' });
