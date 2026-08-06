import { api } from './api';
import type { ConnectedProvider } from '../types/oauth';

export async function initiateOAuth(
  provider: 'github',
  token: string,
  usePopup: boolean = false,
): Promise<void> {
    const res = await api<{ url: string }>(`/oauth/${provider}/authorize`, token, { method: 'POST' });

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

export const getConnections = (token: string): Promise<ConnectedProvider[]> =>
    api<ConnectedProvider[]>('/oauth/connections', token);

export const disconnect = (token: string, provider: string): Promise<void> =>
    api<void>(`/oauth/${provider}/disconnect`, token, { method: 'DELETE' });
