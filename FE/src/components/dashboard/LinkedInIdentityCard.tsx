import { Card, Button, Flex, Typography, Tag } from 'antd';
import { LinkedinOutlined, LinkOutlined, CheckCircleFilled } from '@ant-design/icons';
import type { ConnectedProvider } from '../../types/oauth';
import { initiateOAuth } from '../../services/oauthService';
import { useAuth } from '@clerk/react';

const { Text, Title } = Typography;

interface LinkedInIdentityCardProps {
  connection: ConnectedProvider | null;
  isLoading: boolean;
}

export function LinkedInIdentityCard({ connection, isLoading }: LinkedInIdentityCardProps) {
  const { getToken } = useAuth();
  const isLinked = !!connection;

  return (
    <Card
      loading={isLoading}
      bordered
      style={{
        background: 'rgba(14,18,32,0.80)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Subtle top glow strip */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: isLinked
          ? 'linear-gradient(90deg, #0077B5, #00A0DC)'
          : 'linear-gradient(90deg, rgba(0,119,181,0.5), rgba(0,160,220,0.3))',
      }} />

      <Flex align="center" justify="space-between" gap={16} wrap="wrap">
        {/* Left: icon + text */}
        <Flex align="center" gap={16}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: isLinked
              ? 'rgba(0,119,181,0.12)'
              : 'rgba(255,255,255,0.05)',
            border: `1px solid ${isLinked ? 'rgba(0,119,181,0.30)' : 'rgba(255,255,255,0.10)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <LinkedinOutlined style={{ fontSize: 24, color: isLinked ? '#0077B5' : 'var(--text-secondary)' }} />
          </div>

          <Flex vertical gap={4}>
            <Flex align="center" gap={8}>
              <Title level={5} style={{ margin: 0, color: 'var(--text-primary)' }}>
                LinkedIn Profile
              </Title>
              {isLinked && (
                <Tag
                  icon={<CheckCircleFilled />}
                  style={{
                    background: 'rgba(0,119,181,0.12)',
                    border: '1px solid rgba(0,119,181,0.30)',
                    color: '#00A0DC',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                >
                  Connected
                </Tag>
              )}
            </Flex>

            <Text style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {isLinked
                ? connection.username
                  ? `Connected as @${connection.username}`
                  : `Connected · linked ${new Date(connection.connectedAt).toLocaleDateString()}`
                : 'Link your LinkedIn to import work history and skills'}
            </Text>
          </Flex>
        </Flex>

        {/* Right: action button */}
        {!isLinked ? (
          <Button
            type="default"
            icon={<LinkedinOutlined />}
            onClick={async () => {
              const token = await getToken();
              if (token) await initiateOAuth('linkedin', token);
            }}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: 'var(--text-primary)',
              borderRadius: 12,
              fontWeight: 600,
              height: 40,
              paddingInline: 20,
            }}
          >
            Connect LinkedIn
          </Button>
        ) : (
          <Button
            type="text"
            icon={<LinkOutlined />}
            style={{ color: 'var(--text-secondary)', borderRadius: 10 }}
            onClick={async () => {
              const token = await getToken();
              if (token) await initiateOAuth('linkedin', token);
            }}
          >
            Reconnect
          </Button>
        )}
      </Flex>
    </Card>
  );
}
