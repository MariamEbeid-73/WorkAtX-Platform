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
 * Navigates the browser to the backend authorize endpoint.
 * The backend redirects to GitHub/LinkedIn consent screen.
 * No token needed — this is a full page navigation.
 */
export function initiateOAuth(provider: 'github' | 'linkedin'): void {
    window.location.href = `${config.apiUrl}/oauth/${provider}/authorize`;
}

/** Returns the list of providers the current user has connected. */
export const getConnections = (token: string): Promise<ConnectedProvider[]> =>
    authFetch<ConnectedProvider[]>('/oauth/connections', token);

/** Removes a connected provider. */
export const disconnect = (token: string, provider: string): Promise<void> =>
    authFetch<void>(`/oauth/${provider}/disconnect`, token, { method: 'DELETE' });
