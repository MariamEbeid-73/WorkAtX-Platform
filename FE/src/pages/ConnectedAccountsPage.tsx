import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/react';
import { Card, Button, Flex, Typography, Tag, Spin } from 'antd';
import { GithubOutlined, LinkedinOutlined, CheckCircleFilled } from '@ant-design/icons';
import { getConnections, initiateOAuth, disconnect } from '../services/oauthService';
import { getProfile } from '../services/profileService';
import { LinkedInUrlField } from '../components/LinkedInUrlField';
import type { ConnectedProvider } from '../types/oauth';

const { Title, Text } = Typography;

export function ConnectedAccountsPage() {
  const { getToken } = useAuth();
  const [connections, setConnections] = useState<ConnectedProvider[]>([]);
  const [linkedinUrl, setLinkedinUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const [conns, profileRes] = await Promise.all([
        getConnections(token!),
        getProfile(token!),
      ]);
      setConnections(conns);
      setLinkedinUrl(profileRes.data.socialLinks.linkedin ?? null);
    } catch {
      setError('Failed to load connected accounts.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== 'oauth-connected') return;
      loadAll();
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loadAll]);

  const handleDisconnectGithub = async () => {
    if (!confirm('Disconnect GitHub? This will remove access to your GitHub data.')) return;
    try {
      setDisconnecting('github');
      const token = await getToken();
      await disconnect(token!, 'github');
      setConnections(prev => prev.filter(c => c.provider !== 'github'));
    } catch {
      setError('Failed to disconnect GitHub.');
    } finally {
      setDisconnecting(null);
    }
  };

  const githubConn = connections.find(c => c.provider === 'github') ?? null;

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
          {/* GitHub — real OAuth. Used live by /api/github/verify to show
              repo/follower counts, so a genuine token is required. */}
          <Card
            bordered
            style={{
              background: githubConn ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${githubConn ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 16,
            }}
            bodyStyle={{ padding: '16px 20px' }}
          >
            <Flex align="center" justify="space-between" gap={16}>
              <Flex align="center" gap={14}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: githubConn ? 'rgba(16,185,129,0.10)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${githubConn ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.10)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <GithubOutlined style={{ fontSize: 28 }} />
                </div>
                <Flex vertical gap={2}>
                  <Text style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
                    GitHub
                  </Text>
                  <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {githubConn && githubConn.username
                      ? `Connected as @${githubConn.username}`
                      : 'Import repositories and verify developer activity'}
                  </Text>
                </Flex>
              </Flex>
              {githubConn ? (
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
                    loading={disconnecting === 'github'}
                    onClick={handleDisconnectGithub}
                    style={{ borderRadius: 8 }}
                  >
                    Disconnect
                  </Button>
                </Flex>
              ) : (
                <Button
                  icon={<GithubOutlined />}
                  onClick={async () => {
                    const token = await getToken();
                    if (token) await initiateOAuth('github', token, true);
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

          {/* LinkedIn — plain URL field, not OAuth. The AI worker only ever
              needs the profile URL to scrape (see Worker/tasks/analysis1_job.py);
              it never uses an OAuth token, and LinkedIn's basic OAuth scope
              can't return work history/skills anyway. */}
          <Card
            bordered
            style={{
              background: linkedinUrl ? 'rgba(0,119,181,0.04)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${linkedinUrl ? 'rgba(0,119,181,0.25)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 16,
            }}
            bodyStyle={{ padding: '16px 20px' }}
          >
            <Flex align="center" justify="space-between" gap={16} wrap="wrap">
              <Flex align="center" gap={14}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: linkedinUrl ? 'rgba(0,119,181,0.10)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${linkedinUrl ? 'rgba(0,119,181,0.25)' : 'rgba(255,255,255,0.10)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <LinkedinOutlined style={{ fontSize: 28, color: '#0077B5' }} />
                </div>
                <Flex vertical gap={2}>
                  <Text style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
                    LinkedIn
                  </Text>
                  {!linkedinUrl && (
                    <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      Paste your profile link — used for CV analysis
                    </Text>
                  )}
                </Flex>
              </Flex>
              <LinkedInUrlField value={linkedinUrl} onSaved={setLinkedinUrl} compact />
            </Flex>
          </Card>
        </Flex>
      )}
    </div>
  );
}
