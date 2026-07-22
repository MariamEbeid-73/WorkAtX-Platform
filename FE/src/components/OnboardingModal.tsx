import { useState } from 'react';
import { useAuth } from '@clerk/react';
import {
  Modal, Steps, Button, Upload, Input, Flex, Typography, Tag, Progress, message,
} from 'antd';
import type { UploadFile } from 'antd';
import {
  UploadOutlined, GithubOutlined, LinkedinOutlined, RocketOutlined,
  FileTextOutlined, CheckCircleFilled, LoadingOutlined,
} from '@ant-design/icons';
import { createUploadIntent, uploadToMinIO, confirmUpload } from '../services/resumeService';

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  onClose?: () => void;
  closable?: boolean;
}

type OnboardingStep = 0 | 1 | 2;

interface OnboardingData {
  resume: UploadFile | null;
  github: string;
  linkedin: string;
}

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
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(0);
  const [processing, setProcessing]   = useState(false);
  const [data, setData]               = useState<OnboardingData>({ resume: null, github: '', linkedin: '' });
  const [msgApi, ctx]                 = message.useMessage();

  const steps = [
    { title: 'Resume',  icon: <FileTextOutlined /> },
    { title: 'GitHub',  icon: <GithubOutlined /> },
    { title: 'Launch',  icon: <RocketOutlined /> },
  ];

  const handleNext = () => {
    if (currentStep === 0 && !data.resume) {
      msgApi.warning('Please upload your resume to continue.');
      return;
    }
    if (currentStep === 1 && !data.github.trim()) {
      msgApi.warning('GitHub username is required.');
      return;
    }
    if (currentStep < 2) {
      setCurrentStep((s) => (s + 1) as OnboardingStep);
    }
  };

  const handleLaunch = async () => {
    setProcessing(true);
    try {
      if (data.resume) {
        const file = data.resume as unknown as File;
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');

        // Step 1 — get pre-signed PUT URL
        const { resumeId, uploadUrl } = await createUploadIntent(token, file);

        // Step 2 — upload directly to MinIO (progress shown via ProcessingScreen)
        await uploadToMinIO(uploadUrl, file, () => {});

        // Step 3 — mark as confirmed in the backend
        await confirmUpload(token, resumeId);
      }
    } catch (err: any) {
      msgApi.error(err?.message ?? 'Upload failed. Please try again.');
      setProcessing(false);
      return;
    }
    setProcessing(false);
    onComplete();
  };

  const stepContent: Record<OnboardingStep, React.ReactNode> = {
    0: (
      <Flex vertical gap={20}>
        <Flex vertical gap={6}>
          <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>
            Upload Your Resume
          </Title>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Our AI will parse your CV to extract skills, experience, and build your profile automatically.
          </Text>
        </Flex>

        <Dragger
          name="resume"
          accept=".pdf,.doc,.docx"
          maxCount={1}
          beforeUpload={(file) => {
            setData((d) => ({ ...d, resume: file as UploadFile }));
            return false; // prevent auto-upload
          }}
          onRemove={() => setData((d) => ({ ...d, resume: null }))}
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
            {data.resume && (
              <Tag
                icon={<CheckCircleFilled />}
                style={{
                  background: 'rgba(16,185,129,0.12)',
                  border: '1px solid rgba(16,185,129,0.30)',
                  color: '#10B981',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              >
                {(data.resume as unknown as File).name}
              </Tag>
            )}
          </Flex>
        </Dragger>
      </Flex>
    ),

    1: (
      <Flex vertical gap={20}>
        <Flex vertical gap={6}>
          <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>
            Connect Your Accounts
          </Title>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            GitHub is required to calculate your developer score. LinkedIn is optional.
          </Text>
        </Flex>

        {/* GitHub */}
        <Flex vertical gap={8}>
          <Flex align="center" gap={8}>
            <GithubOutlined style={{ color: 'var(--text-primary)', fontSize: 16 }} />
            <Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              GitHub Username <span style={{ color: '#EF4444' }}>*</span>
            </Text>
          </Flex>
          <Input
            id="onboarding-github"
            prefix={<span style={{ color: 'var(--text-tertiary)' }}>github.com/</span>}
            placeholder="your-username"
            value={data.github}
            onChange={(e) => setData((d) => ({ ...d, github: e.target.value }))}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              height: 44,
              color: 'var(--text-primary)',
            }}
          />
        </Flex>

        {/* LinkedIn */}
        <Flex vertical gap={8}>
          <Flex align="center" gap={8}>
            <LinkedinOutlined style={{ color: '#0A66C2', fontSize: 16 }} />
            <Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              LinkedIn URL
              <Tag style={{ marginLeft: 8, borderRadius: 6, fontSize: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--text-tertiary)' }}>
                Optional
              </Tag>
            </Text>
          </Flex>
          <Input
            id="onboarding-linkedin"
            prefix={<span style={{ color: 'var(--text-tertiary)' }}>linkedin.com/in/</span>}
            placeholder="your-profile"
            value={data.linkedin}
            onChange={(e) => setData((d) => ({ ...d, linkedin: e.target.value }))}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              height: 44,
              color: 'var(--text-primary)',
            }}
          />
        </Flex>
      </Flex>
    ),

    2: (
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
            { icon: <FileTextOutlined />, label: 'Resume', value: (data.resume as unknown as File)?.name || '—', color: '#8B5CF6' },
            { icon: <GithubOutlined />, label: 'GitHub', value: data.github ? `github.com/${data.github}` : '—', color: '#E5E7EB' },
            { icon: <LinkedinOutlined />, label: 'LinkedIn', value: data.linkedin ? `linkedin.com/in/${data.linkedin}` : 'Skipped', color: '#0A66C2' },
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
    ),
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
