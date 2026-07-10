import { useUser, useClerk, useAuth } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Layout, Typography, Card, Button, Descriptions, Tag, Flex } from 'antd';
import { LogoutOutlined, CrownOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { config } from '../config';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface SubscriptionStatus {
  planType: string;
  isActive: boolean;
  trialStartDate: string;
  trialEndDate: string;
  daysRemaining: number;
}

export function Dashboard() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const res = await fetch(`${config.apiUrl}/api/subscription/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setSubscription(await res.json());
      } catch {
        // Backend may not be running yet
      }
    };
    fetchStatus();
  }, [getToken]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        background: 'rgba(14, 18, 32, 0.8)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer', fontSize: 20, fontWeight: 800, background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Work@X
        </div>
        <Flex align="center" gap={16}>
          <Text type="secondary">{user?.primaryEmailAddress?.emailAddress}</Text>
          <Button type="text" icon={<LogoutOutlined />} onClick={handleSignOut} style={{ color: 'var(--text-secondary)' }}>
            Sign Out
          </Button>
        </Flex>
      </Header>

      <Content style={{ position: 'relative', padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(139, 92, 246, 0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />

        <div style={{ zIndex: 1, textAlign: 'center', maxWidth: 560, marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 20, animation: 'float 3s ease-in-out infinite' }}>👋</div>
          <Title level={2}>Welcome back, {user?.firstName || 'there'}!</Title>
          <Text type="secondary" style={{ fontSize: 16 }}>
            Your workspace is ready. Access your personalized career roadmaps and advanced AI tools below.
          </Text>
        </div>

        <Card
          title={<><CrownOutlined style={{ marginRight: 8, color: '#F59E0B' }} /> Subscription Details</>}
          style={{ width: '100%', maxWidth: 600, zIndex: 1 }}
          bordered
        >
          {subscription ? (
            <Descriptions column={1} bordered size="small" labelStyle={{ width: 140 }}>
              <Descriptions.Item label="Current Plan">
                <Text strong>{subscription.planType === 'FREE_TRIAL' ? 'Starter (Trial)' : subscription.planType}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {subscription.isActive
                  ? <Tag icon={<CheckCircleOutlined />} color="success">Active</Tag>
                  : <Tag icon={<ExclamationCircleOutlined />} color="error">Expired</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Started">{formatDate(subscription.trialStartDate)}</Descriptions.Item>
              <Descriptions.Item label="Expires">{formatDate(subscription.trialEndDate)}</Descriptions.Item>
              {subscription.isActive && (
                <Descriptions.Item label="Time Remaining">
                  <Text type="secondary">{subscription.daysRemaining} days</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          ) : (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Current Plan">No active plan</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag icon={<ExclamationCircleOutlined />} color="error">Inactive</Tag>
              </Descriptions.Item>
            </Descriptions>
          )}

          {!subscription?.isActive && (
            <Flex justify="center" style={{ marginTop: 24 }}>
              <Button type="primary" onClick={() => navigate('/')}>View Upgrade Options</Button>
            </Flex>
          )}
        </Card>
      </Content>
    </Layout>
  );
}
