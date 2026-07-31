import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import {
  Modal, Steps, Button, Upload, Flex, Typography, Tag, Progress, message,
} from 'antd';
import type { UploadFile } from 'antd';
import {
  UploadOutlined, GithubOutlined, LinkedinOutlined, RocketOutlined,
  FileTextOutlined, CheckCircleFilled, LoadingOutlined,
} from '@ant-design/icons';
import { createUploadIntent, uploadToMinIO, confirmUpload, listResumes } from '../services/resumeService';
import { initiateOAuth } from '../services/oauthService';
import { getConnections } from '../services/oauthService';
import type { ConnectedProvider } from '../types/oauth';

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  onClose?: () => void;
  closable?: boolean;
}

type OnboardingStep = 0 | 1 | 2;

// ── Spinning processing screen ───────────────────────────────────────────────
function ProcessingScreen() {
  return (
    <Flex vertical align="center" gap={24} style={{ padding: '48px 32px', textAlign: 'center' }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.15))',
        border: '2px solid rgba(139,92,246,0.30)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'pulse-glow 2s ease-in-out infinite',
      }}>
        <LoadingOutlined style={{ fontSize: 32, color: 'var(--color-primary-400)' }} />
      </div>
      <Flex vertical gap={8}>
        <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>
          Analyzing Your Profile
        </Title>
        <Text style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Our AI is reading your resume and GitHub activity…
        </Text>
      </Flex>
      <div style={{ width: '100%', maxWidth: 320 }}>
        {['Parsing resume structure', 'Fetching GitHub repos', 'Calculating skill scores', 'Building your roadmap'].map((step, i) => (
          <Flex key={step} align="center" gap={12} style={{ marginBottom: 12 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(139,92,246,0.15)',
              border: '1px solid rgba(139,92,246,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LoadingOutlined style={{ fontSize: 10, color: 'var(--color-primary-400)', animationDelay: `${i * 0.3}s` }} />
            </div>
            <Text style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{step}</Text>
          </Flex>
        ))}
      </div>
      <Progress
        percent={75}
        showInfo={false}
        strokeColor={{ '0%': '#8B5CF6', '100%': '#06B6D4' }}
        trailColor="rgba(255,255,255,0.06)"
        style={{ width: '100%', maxWidth: 320 }}
      />
    </Flex>
  );
}

// ── Main Onboarding Modal ────────────────────────────────────────────────────
export function OnboardingModal({ open, onComplete, onClose, closable = false }: OnboardingModalProps) {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(0);
  const [processing, setProcessing]   = useState(false);
  const [resumeFile, setResumeFile]   = useState<UploadFile | null>(null);
  const [alreadyHasResume, setAlreadyHasResume] = useState(false);
  const [checkingResume, setCheckingResume]     = useState(true);
  const [connections, setConnections] = useState<ConnectedProvider[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [msgApi, ctx]                 = message.useMessage();

  const steps = [
    { title: 'Resume',  icon: <FileTextOutlined /> },
    { title: 'Connect', icon: <GithubOutlined /> },
    { title: 'Launch',  icon: <RocketOutlined /> },
  ];

  // ── On open: check if resume already uploaded & load connections ──────────
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const init = async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;

        // Check resume
        setCheckingResume(true);
        const resumes = await listResumes(token);
        if (!cancelled) setAlreadyHasResume(resumes.length > 0);

        // Load connections
        setConnectionsLoading(true);
        const conns = await getConnections(token);
        if (!cancelled) setConnections(conns);
      } catch {
        // silently degrade
      } finally {
        if (!cancelled) {
          setCheckingResume(false);
          setConnectionsLoading(false);
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, [open, getToken]);

  useEffect(() => {
    if (!open) return;

    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== 'oauth-connected') return;

      (async () => {
        const token = await getToken();
        if (!token) return;
        try {
          setConnectionsLoading(true);
          const conns = await getConnections(token);
          setConnections(conns);
        } catch {
          // silently degrade
        } finally {
          setConnectionsLoading(false);
        }
      })();
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [open, getToken]);

  const githubConn   = connections.find(c => c.provider === 'github')   ?? null;
  const linkedinConn = connections.find(c => c.provider === 'linkedin')  ?? null;

  const handleNext = () => {
    if (currentStep === 0 && !alreadyHasResume && !resumeFile) {
      msgApi.warning('Please upload your resume to continue.');
      return;
    }
    if (currentStep < 2) {
      setCurrentStep((s) => (s + 1) as OnboardingStep);
    }
  };

  const handleLaunch = async () => {
    setProcessing(true);
    try {
      // Only upload if user selected a new file
      if (resumeFile && !alreadyHasResume) {
        const file = resumeFile as unknown as File;
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        const { resumeId, uploadUrl } = await createUploadIntent(token, file);
        await uploadToMinIO(uploadUrl, file, () => {});
        await confirmUpload(token, resumeId);
      }
    } catch (err: any) {
      msgApi.error(err?.message ?? 'Upload failed. Please try again.');
      setProcessing(false);
      return;
    }
    setProcessing(false);
    onComplete();
    // Navigate to Knowledge Graph and auto-trigger analysis
    navigate('/knowledge-graph?analyze=true');
  };

  // ── Step 0: Resume ────────────────────────────────────────────────────────
  const ResumeStep = (
    <Flex vertical gap={20}>
      <Flex vertical gap={6}>
        <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>
          Upload Your Resume
        </Title>
        <Text style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Our AI will parse your CV to extract skills, experience, and build your profile automatically.
        </Text>
      </Flex>

      {checkingResume ? (
        <Flex justify="center" style={{ padding: '32px 0' }}>
          <LoadingOutlined style={{ fontSize: 28, color: 'var(--color-primary-400)' }} />
        </Flex>
      ) : alreadyHasResume ? (
        /* Resume already exists — show confirmation, allow replacement */
        <Flex vertical gap={16}>
          <Flex
            align="center"
            gap={14}
            style={{
              padding: '18px 20px',
              borderRadius: 14,
              background: 'rgba(16,185,129,0.06)',
              border: '1px solid rgba(16,185,129,0.25)',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircleFilled style={{ fontSize: 22, color: '#10B981' }} />
            </div>
            <Flex vertical gap={2}>
              <Text style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Resume already uploaded ✓
              </Text>
              <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Your previous resume is on file. You can continue or upload a new one below.
              </Text>
            </Flex>
          </Flex>

          <Dragger
            name="resume"
            accept=".pdf,.doc,.docx"
            maxCount={1}
            beforeUpload={(file) => {
              setResumeFile(file as UploadFile);
              return false;
            }}
            onRemove={() => setResumeFile(null)}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '2px dashed rgba(255,255,255,0.12)',
              borderRadius: 16,
            }}
          >
            <Flex vertical align="center" gap={10} style={{ padding: '16px' }}>
              <UploadOutlined style={{ fontSize: 22, color: 'var(--text-tertiary)' }} />
              <Text style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
                {resumeFile
                  ? `New file selected: ${(resumeFile as unknown as File).name}`
                  : 'Drop here to replace your resume (optional)'}
              </Text>
              <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>PDF, DOC, DOCX · Max 5MB</Text>
            </Flex>
          </Dragger>
        </Flex>
      ) : (
        /* No resume yet — require upload */
        <Dragger
          name="resume"
          accept=".pdf,.doc,.docx"
          maxCount={1}
          beforeUpload={(file) => {
            setResumeFile(file as UploadFile);
            return false;
          }}
          onRemove={() => setResumeFile(null)}
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '2px dashed rgba(139,92,246,0.30)',
            borderRadius: 16,
          }}
        >
          <Flex vertical align="center" gap={12} style={{ padding: '24px 16px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'rgba(139,92,246,0.10)',
              border: '1px solid rgba(139,92,246,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UploadOutlined style={{ fontSize: 24, color: 'var(--color-primary-400)' }} />
            </div>
            <Flex vertical align="center" gap={4}>
              <Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                Drop your resume here or click to browse
              </Text>
              <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Supports PDF, DOC, DOCX · Max 5MB
              </Text>
            </Flex>
            {resumeFile && (
              <Tag
                icon={<CheckCircleFilled />}
                style={{
                  background: 'rgba(16,185,129,0.12)',
                  border: '1px solid rgba(16,185,129,0.30)',
                  color: '#10B981', borderRadius: 8, fontSize: 12,
                }}
              >
                {(resumeFile as unknown as File).name}
              </Tag>
            )}
          </Flex>
        </Dragger>
      )}
    </Flex>
  );

  // ── Step 1: Connect Accounts (OAuth buttons) ──────────────────────────────
  const ConnectStep = (
    <Flex vertical gap={20}>
      <Flex vertical gap={6}>
        <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>
          Connect Your Accounts
        </Title>
        <Text style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Connect GitHub to calculate your developer score. LinkedIn is optional.
        </Text>
      </Flex>

      {connectionsLoading ? (
        <Flex justify="center" style={{ padding: '32px 0' }}>
          <LoadingOutlined style={{ fontSize: 28, color: 'var(--color-primary-400)' }} />
        </Flex>
      ) : (
        <Flex vertical gap={12}>
          {/* GitHub */}
          <Flex
            align="center"
            justify="space-between"
            gap={16}
            style={{
              padding: '16px 18px',
              borderRadius: 14,
              background: githubConn ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${githubConn ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.10)'}`,
            }}
          >
            <Flex align="center" gap={12}>
              <div style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                background: githubConn ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${githubConn ? 'rgba(16,185,129,0.30)' : 'rgba(255,255,255,0.12)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <GithubOutlined style={{ fontSize: 20, color: githubConn ? '#10B981' : 'var(--text-primary)' }} />
              </div>
              <Flex vertical gap={2}>
                <Text style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
                  GitHub <span style={{ color: '#EF4444', fontSize: 12 }}>*</span>
                </Text>
                <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {githubConn
                    ? githubConn.username ? `@${githubConn.username}` : 'Connected'
                    : 'Required for developer score'}
                </Text>
              </Flex>
            </Flex>
            {githubConn ? (
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

          {/* LinkedIn */}
          <Flex
            align="center"
            justify="space-between"
            gap={16}
            style={{
              padding: '16px 18px',
              borderRadius: 14,
              background: linkedinConn ? 'rgba(0,119,181,0.06)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${linkedinConn ? 'rgba(0,119,181,0.25)' : 'rgba(255,255,255,0.10)'}`,
            }}
          >
            <Flex align="center" gap={12}>
              <div style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                background: linkedinConn ? 'rgba(0,119,181,0.12)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${linkedinConn ? 'rgba(0,119,181,0.30)' : 'rgba(255,255,255,0.12)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LinkedinOutlined style={{ fontSize: 20, color: linkedinConn ? '#0077B5' : 'var(--text-secondary)' }} />
              </div>
              <Flex vertical gap={2}>
                <Flex align="center" gap={6}>
                  <Text style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>LinkedIn</Text>
                  <Tag style={{
                    borderRadius: 6, fontSize: 10, lineHeight: '16px', padding: '0 6px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: 'var(--text-tertiary)',
                  }}>Optional</Tag>
                </Flex>
                <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {linkedinConn
                    ? linkedinConn.username ? `@${linkedinConn.username}` : 'Connected'
                    : 'Import work history and skills'}
                </Text>
              </Flex>
            </Flex>
            {linkedinConn ? (
              <Tag
                icon={<CheckCircleFilled />}
                style={{
                  background: 'rgba(0,119,181,0.12)',
                  border: '1px solid rgba(0,119,181,0.30)',
                  color: '#00A0DC', borderRadius: 8, fontSize: 12,
                }}
              >
                Connected
              </Tag>
            ) : (
              <Button
                icon={<LinkedinOutlined />}
                onClick={async () => {
                  const token = await getToken();
                  if (token) await initiateOAuth('linkedin', token, true);
                }}
                style={{
                  background: 'rgba(0,119,181,0.08)',
                  border: '1px solid rgba(0,119,181,0.20)',
                  color: '#00A0DC',
                  borderRadius: 10, fontWeight: 600, height: 36,
                }}
              >
                Connect
              </Button>
            )}
          </Flex>

          <Text style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
            You'll be redirected to the provider and brought back here. You can skip LinkedIn for now.
          </Text>
        </Flex>
      )}
    </Flex>
  );

  // ── Step 2: Launch summary ────────────────────────────────────────────────
  const LaunchStep = (
    <Flex vertical gap={20}>
      <Flex vertical gap={6}>
        <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>
          Ready to Launch 🚀
        </Title>
        <Text style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Here's what we'll analyze. You can update anything later from your dashboard.
        </Text>
      </Flex>

      <Flex vertical gap={10}>
        {[
          {
            icon: <FileTextOutlined />,
            label: 'Resume',
            value: resumeFile
              ? (resumeFile as unknown as File).name
              : alreadyHasResume
                ? 'Existing resume on file ✓'
                : '—',
            color: '#8B5CF6',
          },
          {
            icon: <GithubOutlined />,
            label: 'GitHub',
            value: githubConn
              ? githubConn.username ? `@${githubConn.username}` : 'Connected'
              : 'Not connected',
            color: '#E5E7EB',
          },
          {
            icon: <LinkedinOutlined />,
            label: 'LinkedIn',
            value: linkedinConn
              ? linkedinConn.username ? `@${linkedinConn.username}` : 'Connected'
              : 'Skipped',
            color: '#0077B5',
          },
        ].map((item) => (
          <Flex
            key={item.label}
            align="center"
            gap={14}
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: `${item.color}18`,
              border: `1px solid ${item.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: item.color, fontSize: 17,
            }}>
              {item.icon}
            </div>
            <Flex vertical gap={2}>
              <Text style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {item.label}
              </Text>
              <Text style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {item.value}
              </Text>
            </Flex>
          </Flex>
        ))}
      </Flex>
    </Flex>
  );

  const stepContent: Record<OnboardingStep, React.ReactNode> = {
    0: ResumeStep,
    1: ConnectStep,
    2: LaunchStep,
  };

  return (
    <>
      {ctx}
      <Modal
        open={open}
        closable={closable}
        onCancel={onClose}
        footer={null}
        centered
        width={520}
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24,
          overflow: 'hidden',
        }}
        styles={{
          body: { padding: 0 },
        }}
      >
        {/* Gradient header */}
        <div style={{
          padding: '28px 32px 20px',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(6,182,212,0.06) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <Flex align="center" gap={12} style={{ marginBottom: 20 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #7C3AED, #0891B2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: '#fff',
            }}>W</div>
            <Flex vertical gap={0}>
              <Text style={{ fontSize: 16, fontWeight: 800, background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Work@X
              </Text>
              <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                Let's set up your profile
              </Text>
            </Flex>
          </Flex>

          <Steps
            current={currentStep}
            items={steps}
            size="small"
            style={{ '--ant-steps-item-active-color': '#8B5CF6' } as React.CSSProperties}
          />
        </div>

        {/* Step content */}
        <div style={{ padding: '28px 32px' }}>
          {processing ? <ProcessingScreen /> : stepContent[currentStep]}
        </div>

        {/* Footer */}
        {!processing && (
          <div style={{
            padding: '0 32px 28px',
            display: 'flex',
            gap: 12,
            justifyContent: currentStep === 0 ? 'flex-end' : 'space-between',
          }}>
            {currentStep > 0 && (
              <Button
                onClick={() => setCurrentStep((s) => (s - 1) as OnboardingStep)}
                style={{
                  borderRadius: 12, height: 44,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'var(--text-secondary)',
                }}
              >
                Back
              </Button>
            )}
            {currentStep < 2 ? (
              <Button
                type="primary"
                onClick={handleNext}
                style={{
                  borderRadius: 12, height: 44, fontWeight: 600, paddingInline: 32,
                  background: 'linear-gradient(135deg, #7C3AED, #0891B2)',
                  border: 'none',
                }}
              >
                Continue →
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={handleLaunch}
                icon={<RocketOutlined />}
                style={{
                  borderRadius: 12, height: 44, fontWeight: 600, paddingInline: 32,
                  background: 'linear-gradient(135deg, #7C3AED, #0891B2)',
                  border: 'none',
                  boxShadow: '0 0 20px rgba(139,92,246,0.40)',
                }}
              >
                Analyze & Launch Dashboard
              </Button>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
