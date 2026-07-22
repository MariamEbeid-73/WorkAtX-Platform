import { useState } from 'react';
import { useUser } from '@clerk/react';
import { useAuth } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Avatar, Button, Switch, Tooltip, Tag, Badge, Flex, Typography, Space,
} from 'antd';
import {
  EditOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  ReloadOutlined,
  CheckCircleFilled,
  MessageOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import type { UserProfile } from '../../types/profile';
import { useToggleOpenToWork } from '../../hooks/useProfile';
import { CompleteProfileModal } from './CompleteProfileModal';
import { ResumeViewerModal } from './ResumeViewerModal';
import { OnboardingModal } from '../OnboardingModal';
import { listResumes, getDownloadUrl } from '../../services/resumeService';

const { Text, Title } = Typography;

interface UserHeaderCardProps {
  profile: UserProfile | null;
  isLoading: boolean;
}

export function UserHeaderCard({ profile, isLoading }: UserHeaderCardProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { mutate: toggleOtW, isPending } = useToggleOpenToWork();

  // Modal states
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [showResumeViewer, setShowResumeViewer] = useState(false);
  const [showReanalyze, setShowReanalyze] = useState(false);

  // Resume URL fetched on demand
  const [resumeUrl, setResumeUrl] = useState<string | undefined>(undefined);
  const [resumeFetching, setResumeFetching] = useState(false);

  // Optimistic local state for the toggle
  const [openToWork, setOpenToWork] = useState(profile?.isOpenToWork ?? false);

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join('') || 'U';

  const handle = profile?.handle || `@${user?.firstName?.toLowerCase() ?? 'user'}.dev`;
  const completion = profile?.profileCompletionPct ?? 0;
  const isVerified = profile?.collegeVerification?.isVerified ?? false;

  const handleToggle = async (checked: boolean) => {
    setOpenToWork(checked);
    await toggleOtW({ isOpenToWork: checked });
  };

  const handleViewResume = async () => {
    setResumeFetching(true);
    try {
      const token = await getToken();
      const resumes = await listResumes(token!);
      if (resumes.length > 0) {
        const { downloadUrl } = await getDownloadUrl(token!, resumes[0].id);
        setResumeUrl(downloadUrl);
      } else {
        setResumeUrl(undefined);
      }
    } catch {
      setResumeUrl(undefined);
    } finally {
      setResumeFetching(false);
      setShowResumeViewer(true);
    }
  };

  return (
    <Card
      loading={isLoading}
      bordered
      style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(6,182,212,0.04) 100%)',
        border: '1px solid rgba(139,92,246,0.20)',
        borderRadius: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <Flex align="flex-start" justify="space-between" gap={24} wrap="wrap">

        {/* ── Left: Avatar + Identity ───────────────────────────────────── */}
        <Flex gap={20} align="flex-start">
          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            <Avatar
              size={80}
              src={user?.imageUrl}
              style={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #0891B2 100%)',
                fontSize: 28,
                fontWeight: 700,
                flexShrink: 0,
                border: '3px solid rgba(139,92,246,0.4)',
                boxShadow: '0 0 24px rgba(139,92,246,0.25)',
              }}
            >
              {initials}
            </Avatar>
            {/* Online indicator */}
            <div style={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#10B981',
              border: '2px solid var(--bg-surface)',
              boxShadow: '0 0 8px rgba(16,185,129,0.6)',
            }} />
          </div>

          {/* Identity info */}
          <Flex vertical gap={6}>
            <Flex align="center" gap={8}>
              <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>
                {user?.fullName || user?.firstName || 'Developer'}
              </Title>
              <Tooltip title="Edit handle">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  style={{ color: 'var(--text-tertiary)', padding: 2 }}
                />
              </Tooltip>
            </Flex>

            {/* Handle */}
            <Text style={{ color: 'var(--text-accent)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
              {handle}
            </Text>

            {/* Connected Accounts tag */}
            <Flex align="center" gap={8} wrap="wrap">
              <Tag
                icon={<LinkOutlined />}
                onClick={() => navigate('/connected-accounts')}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'var(--text-secondary)',
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Connected Accounts
              </Tag>

              {/* College verification badge */}
              <Badge
                count={
                  isVerified ? (
                    <CheckCircleFilled style={{ color: '#10B981', fontSize: 14 }} />
                  ) : null
                }
              >
                <Tag
                  icon={<SafetyCertificateOutlined />}
                  style={{
                    background: isVerified
                      ? 'rgba(16,185,129,0.10)'
                      : 'rgba(245,158,11,0.10)',
                    border: `1px solid ${isVerified ? 'rgba(16,185,129,0.30)' : 'rgba(245,158,11,0.30)'}`,
                    color: isVerified ? '#10B981' : '#F59E0B',
                    borderRadius: 8,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                  onClick={() => {/* open verification modal */ }}
                >
                  {isVerified ? 'College Verified' : 'Verify Your College'}
                </Tag>
              </Badge>
            </Flex>

            {/* Profile completion indicator */}
            <Flex align="center" gap={8}>
              <div style={{
                width: 120,
                height: 4,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 999,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${completion}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #8B5CF6, #06B6D4)',
                  borderRadius: 999,
                  transition: 'width 0.6s ease',
                }} />
              </div>
              <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {completion}% complete
              </Text>
            </Flex>
          </Flex>
        </Flex>

        {/* ── Right: Actions ────────────────────────────────────────────── */}
        <Flex vertical gap={14} align="flex-end">
          {/* Complete Profile CTA */}
          <Button
            type="primary"
            onClick={() => setShowCompleteProfile(true)}
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #0891B2 100%)',
              border: 'none',
              fontWeight: 600,
              boxShadow: '0 0 16px rgba(139,92,246,0.35)',
            }}
          >
            Complete Profile
          </Button>

          {/* Open to Work toggle */}
          <Flex align="center" gap={10}>
            <Flex vertical gap={0} style={{ textAlign: 'right' }}>
              <Text style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Open to Work
              </Text>
              <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                Get matched with companies
              </Text>
            </Flex>
            <Switch
              checked={openToWork}
              loading={isPending}
              onChange={handleToggle}
              style={openToWork ? { background: '#10B981' } : {}}
            />
          </Flex>

          {/* Action row */}
          <Space size={8} wrap>
            <Tooltip title="View your analyzed resume">
              <Button
                size="small"
                icon={<FileTextOutlined />}
                loading={resumeFetching}
                onClick={handleViewResume}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'var(--text-secondary)',
                  borderRadius: 10,
                }}
              >
                View Resume
              </Button>
            </Tooltip>
            <Tooltip title="Re-analyze your CV and GitHub">
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => setShowReanalyze(true)}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'var(--text-secondary)',
                  borderRadius: 10,
                }}
              >
                Re-analyze Profile
              </Button>
            </Tooltip>
            <Tooltip title="Talk with Geni AI Assistant">
              <Button
                size="small"
                icon={<MessageOutlined />}
                onClick={() => navigate('/geni')}
                style={{
                  background: 'rgba(139,92,246,0.08)',
                  border: '1px solid rgba(139,92,246,0.25)',
                  color: 'var(--color-primary-400)',
                  borderRadius: 10,
                }}
              >
                Talk with Geni
              </Button>
            </Tooltip>
          </Space>
        </Flex>
      </Flex>

      {/* Modals */}
      <CompleteProfileModal
        open={showCompleteProfile}
        onClose={() => setShowCompleteProfile(false)}
      />
      <ResumeViewerModal
        open={showResumeViewer}
        onClose={() => setShowResumeViewer(false)}
        resumeUrl={resumeUrl}
      />
      <OnboardingModal
        open={showReanalyze}
        closable={true}
        onClose={() => setShowReanalyze(false)}
        onComplete={() => setShowReanalyze(false)}
      />
    </Card>
  );
}
