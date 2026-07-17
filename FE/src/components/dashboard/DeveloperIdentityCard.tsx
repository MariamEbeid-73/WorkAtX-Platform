import { Card, Button, Flex, Typography, Tag } from 'antd';
import { GithubOutlined, LinkOutlined, CheckCircleFilled } from '@ant-design/icons';
import type { GitHubIdentity } from '../../types/profile';

const { Text, Title } = Typography;

interface DeveloperIdentityCardProps {
  identity: GitHubIdentity | null;
  isLoading: boolean;
  onVerify: () => void;
}

export function DeveloperIdentityCard({
  identity,
  isLoading,
  onVerify,
}: DeveloperIdentityCardProps) {
  const isLinked = identity?.isLinked ?? false;

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
          ? 'linear-gradient(90deg, #10B981, #06B6D4)'
          : 'linear-gradient(90deg, rgba(139,92,246,0.6), rgba(6,182,212,0.4))',
      }} />

      <Flex align="center" justify="space-between" gap={16} wrap="wrap">
        {/* Left: icon + text */}
        <Flex align="center" gap={16}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: isLinked
              ? 'rgba(16,185,129,0.12)'
              : 'rgba(255,255,255,0.05)',
            border: `1px solid ${isLinked ? 'rgba(16,185,129,0.30)' : 'rgba(255,255,255,0.10)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <GithubOutlined style={{ fontSize: 24, color: isLinked ? '#10B981' : 'var(--text-secondary)' }} />
          </div>

          <Flex vertical gap={4}>
            <Flex align="center" gap={8}>
              <Title level={5} style={{ margin: 0, color: 'var(--text-primary)' }}>
                Developer Identity
              </Title>
              {isLinked && (
                <Tag
                  icon={<CheckCircleFilled />}
                  style={{
                    background: 'rgba(16,185,129,0.12)',
                    border: '1px solid rgba(16,185,129,0.30)',
                    color: '#10B981',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                >
                  Verified
                </Tag>
              )}
            </Flex>

            <Text style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {isLinked
                ? `Connected as @${identity?.githubUsername} · ${identity?.publicRepos ?? 0} repos · ${identity?.followers ?? 0} followers`
                : 'Link your GitHub account to verify your developer profile'}
            </Text>

            {/* Top languages */}
            {isLinked && identity?.topLanguages && identity.topLanguages.length > 0 && (
              <Flex gap={6} wrap="wrap" style={{ marginTop: 4 }}>
                {identity.topLanguages.slice(0, 5).map((lang) => (
                  <Tag
                    key={lang}
                    style={{
                      background: 'rgba(139,92,246,0.08)',
                      border: '1px solid rgba(139,92,246,0.20)',
                      color: 'var(--color-primary-400)',
                      borderRadius: 6,
                      fontSize: 11,
                      margin: 0,
                    }}
                  >
                    {lang}
                  </Tag>
                ))}
              </Flex>
            )}
          </Flex>
        </Flex>

        {/* Right: action button */}
        {!isLinked ? (
          <Button
            type="default"
            icon={<GithubOutlined />}
            onClick={onVerify}
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
            Verify with GitHub
          </Button>
        ) : (
          <Button
            type="text"
            icon={<LinkOutlined />}
            href={identity?.githubProfileUrl}
            target="_blank"
            style={{ color: 'var(--text-secondary)', borderRadius: 10 }}
          >
            View Profile
          </Button>
        )}
      </Flex>
    </Card>
  );
}
