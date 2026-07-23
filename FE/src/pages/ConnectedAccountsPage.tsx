import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/react';
import { Card, Button, Flex, Typography, Tag, Spin } from 'antd';
import { GithubOutlined, LinkedinOutlined, CheckCircleFilled } from '@ant-design/icons';
import { getConnections, initiateOAuth, disconnect } from '../services/oauthService';
import type { ConnectedProvider } from '../types/oauth';

const { Title, Text } = Typography;

const PROVIDERS = [
  {
    id: 'github' as const,
    label: 'GitHub',
    description: 'Import repositories and verify developer activity',
    icon: <GithubOutlined style={{ fontSize: 28 }} />,
  },
  {
    id: 'linkedin' as const,
    label: 'LinkedIn',
    description: 'Import work history, education, and skills',
    icon: <LinkedinOutlined style={{ fontSize: 28, color: '#0077B5' }} />,
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
    } catch {
      setError('Failed to load connected accounts.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== 'oauth-connected') return;
      loadConnections();
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loadConnections]);

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
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Flex vertical gap={8} style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: 'var(--text-primary)' }}>
          Connected Accounts
        </Title>
        <Text style={{ color: 'var(--text-secondary)' }}>
          Link your accounts so WorkX can import your data for CV analysis.
        </Text>
      </Flex>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.10)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 20,
          color: '#EF4444',
          fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <Flex justify="center" style={{ padding: 48 }}>
          <Spin size="large" />
        </Flex>
      ) : (
        <Flex vertical gap={12}>
          {PROVIDERS.map(({ id, label, description, icon }) => {
            const connected = isConnected(id);
            const conn = getConnection(id);
            return (
              <Card
                key={id}
                bordered
                style={{
                  background: connected ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${connected ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 16,
                }}
                bodyStyle={{ padding: '16px 20px' }}
              >
                <Flex align="center" justify="space-between" gap={16}>
                  <Flex align="center" gap={14}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: connected ? 'rgba(16,185,129,0.10)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${connected ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.10)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {icon}
                    </div>
                    <Flex vertical gap={2}>
                      <Text style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
                        {label}
                      </Text>
                      <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {connected && conn?.username
                          ? `Connected as @${conn.username}`
                          : description}
                      </Text>
                    </Flex>
                  </Flex>
                  {connected ? (
                    <Flex align="center" gap={10}>
                      <Tag
                        icon={<CheckCircleFilled />}
                        style={{
                          background: 'rgba(16,185,129,0.12)',
                          border: '1px solid rgba(16,185,129,0.30)',
                          color: '#10B981', borderRadius: 8, fontSize: 12,
                        }}
                      >
                        Connected
                      </Tag>
                      <Button
                        danger
                        size="small"
                        loading={disconnecting === id}
                        onClick={() => handleDisconnect(id)}
                        style={{ borderRadius: 8 }}
                      >
                        Disconnect
                      </Button>
                    </Flex>
                  ) : (
                    <Button
                      icon={id === 'github' ? <GithubOutlined /> : <LinkedinOutlined />}
                      onClick={async () => {
                        const token = await getToken();
                        if (token) await initiateOAuth(id, token, true);
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.14)',
                        color: 'var(--text-primary)',
                        borderRadius: 10, fontWeight: 600, height: 36,
                      }}
                    >
                      Connect
                    </Button>
                  )}
                </Flex>
              </Card>
            );
          })}
        </Flex>
      )}
    </div>
  );
}
