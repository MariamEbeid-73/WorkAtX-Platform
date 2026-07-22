import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/react';
import { getConnections, initiateOAuth, disconnect } from '../services/oauthService';
import type { ConnectedProvider } from '../types/oauth';

const PROVIDERS = [
    {
        id: 'github' as const,
        label: 'GitHub',
        description: 'Import repositories and verify developer activity',
        icon: '🐙',
    },
    {
        id: 'linkedin' as const,
        label: 'LinkedIn',
        description: 'Import work history, education, and skills',
        icon: '💼',
    },
];

export function ConnectedAccountsPage() {
    const { getToken } = useAuth();
    const [connections, setConnections] = useState<ConnectedProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadConnections = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await getToken();
            const data = await getConnections(token!);
            setConnections(data);
        } catch (e) {
            setError('Failed to load connected accounts. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    useEffect(() => { loadConnections(); }, [loadConnections]);

    const handleDisconnect = async (provider: string) => {
        if (!confirm(`Disconnect ${provider}? This will remove access to your ${provider} data.`)) return;
        try {
            setDisconnecting(provider);
            const token = await getToken();
            await disconnect(token!, provider);
            setConnections(prev => prev.filter(c => c.provider !== provider));
        } catch {
            setError(`Failed to disconnect ${provider}.`);
        } finally {
            setDisconnecting(null);
        }
    };

    const isConnected = (provider: string) => connections.some(c => c.provider === provider);
    const getConnection = (provider: string) => connections.find(c => c.provider === provider);

    return (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Connected Accounts
            </h1>
            <p style={{ color: '#666', marginBottom: '2rem' }}>
                Link your accounts so WorkX can import your data for CV analysis.
            </p>

            {error && (
                <div style={{ background: '#fee', border: '1px solid #f88', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#c00' }}>
                    {error}
                </div>
            )}

            {loading ? (
                <p>Loading...</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {PROVIDERS.map(({ id, label, description, icon }) => {
                        const connected = isConnected(id);
                        const conn = getConnection(id);
                        return (
                            <div
                                key={id}
                                style={{
                                    border: `2px solid ${connected ? '#4ade80' : '#e5e7eb'}`,
                                    borderRadius: 12,
                                    padding: '1.25rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '1rem',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontSize: '1.75rem' }}>{icon}</span>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{label}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#888' }}>
                                            {connected && conn?.username
                                                ? `Connected as @${conn.username}`
                                                : description}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    {connected ? (
                                        <button
                                            onClick={() => handleDisconnect(id)}
                                            disabled={disconnecting === id}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                border: '1px solid #f87171',
                                                borderRadius: 8,
                                                background: 'white',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {disconnecting === id ? 'Disconnecting…' : 'Disconnect'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => initiateOAuth(id)}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                border: 'none',
                                                borderRadius: 8,
                                                background: '#6366f1',
                                                color: 'white',
                                                cursor: 'pointer',
                                                fontWeight: 500,
                                            }}
                                        >
                                            Connect
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
