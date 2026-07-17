import { useState, useEffect } from 'react';
import { Flex, Typography, Alert, Skeleton } from 'antd';
import { useUser } from '@clerk/react';
import { UserHeaderCard }       from '../components/dashboard/UserHeaderCard';
import { DeveloperIdentityCard } from '../components/dashboard/DeveloperIdentityCard';
import { ScoreBreakdownCard }   from '../components/dashboard/ScoreBreakdownCard';
import { FeedbackButton }       from '../components/dashboard/FeedbackButton';
import { OnboardingModal }      from '../components/OnboardingModal';
import { FullScreenLoader }     from '../components/FullScreenLoader';
import { useProfileQuery, useScoresQuery, useGitHubIdentityQuery } from '../hooks/useProfile';

const { Title, Text } = Typography;

export function Dashboard() {
  const { user } = useUser();

  // Data hooks (gracefully degrade when backend is offline)
  const { data: profile,  isLoading: profileLoading,  error: profileError  } = useProfileQuery();
  const { data: scores,   isLoading: scoresLoading                          } = useScoresQuery();
  const { data: identity, isLoading: identityLoading, refetch: refetchIdentity } = useGitHubIdentityQuery();

  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!profileLoading && !profileError) {
      // If we successfully loaded profile but no GitHub is linked, show onboarding wizard
      if (!profile?.socialLinks?.github) {
        setShowOnboarding(true);
      }
    }
  }, [profile, profileLoading, profileError]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (profileLoading) {
    return <FullScreenLoader />;
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease both' }}>
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <Flex align="baseline" justify="space-between" wrap="wrap" gap={8} style={{ marginBottom: 28 }}>
        <Flex vertical gap={4}>
          <Text style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.02em' }}>
            {greeting()}, {user?.firstName || 'Developer'} 👋
          </Text>
          <Title level={3} style={{ margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Developer Profile
          </Title>
        </Flex>
        <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          Last updated · just now
        </Text>
      </Flex>

      {/* ── API offline banner (only shown when backend unreachable) ──────── */}
      {profileError && (
        <Alert
          type="info"
          showIcon
          message="Backend not connected"
          description="The API is unreachable — showing demo data. Connect your backend to see live profile data."
          style={{
            marginBottom: 20,
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.20)',
            borderRadius: 12,
          }}
          closable
        />
      )}

      {/* ── Card Stack ────────────────────────────────────────────────────── */}
      <Flex vertical gap={20}>

        {/* 1. User Header Card */}
        {profileLoading ? (
          <Skeleton active paragraph={{ rows: 4 }} style={{ padding: 24, borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }} />
        ) : (
          <div className="animate-fade-in" style={{ animationDelay: '0ms' }}>
            <UserHeaderCard profile={profile} isLoading={false} />
          </div>
        )}

        {/* 2. Developer Identity Card */}
        <div className="animate-fade-in" style={{ animationDelay: '80ms' }}>
          <DeveloperIdentityCard
            identity={identity}
            isLoading={identityLoading}
            onVerify={refetchIdentity}  // will trigger GitHub OAuth in real impl
          />
        </div>

        {/* 3. Score Breakdown / Performance Hub */}
        <div className="animate-fade-in" style={{ animationDelay: '160ms' }}>
          <ScoreBreakdownCard scores={scores} isLoading={scoresLoading} />
        </div>

      </Flex>

      {/* ── Floating Feedback Button ───────────────────────────────────────── */}
      <FeedbackButton />

      {/* Initial onboarding wizard */}
      <OnboardingModal 
        open={showOnboarding} 
        onComplete={() => setShowOnboarding(false)} 
      />
    </div>
  );
}
