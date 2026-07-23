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
 * When `usePopup` is true, opens the OAuth flow in a popup window instead of
 * a full-page redirect. The popup will close itself after OAuth completes and
 * notify the parent window via postMessage.
 */
export async function initiateOAuth(
  provider: 'github' | 'linkedin',
  token: string,
  usePopup: boolean = false,
): Promise<void> {
    const res = await authFetch<{ url: string }>(`/oauth/${provider}/authorize`, token, { method: 'POST' });

    if (usePopup) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
            res.url,
            `oauth-${provider}`,
            `width=${width},height=${height},left=${left},top=${top}`,
        );
        if (!popup) {
            window.location.href = res.url;
        }
    } else {
        window.location.href = res.url;
    }
}

/** Returns the list of providers the current user has connected. */
export const getConnections = (token: string): Promise<ConnectedProvider[]> =>
    authFetch<ConnectedProvider[]>('/oauth/connections', token);

/** Removes a connected provider. */
export const disconnect = (token: string, provider: string): Promise<void> =>
    authFetch<void>(`/oauth/${provider}/disconnect`, token, { method: 'DELETE' });
