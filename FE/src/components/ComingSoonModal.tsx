import { Modal, Button, Flex, Typography, Tag } from 'antd';
import { ClockCircleOutlined, ThunderboltOutlined, CrownOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface ComingSoonModalProps {
  open: boolean;
  onClose: () => void;
  planName: string;
}

export function ComingSoonModal({ open, onClose, planName }: ComingSoonModalProps) {
  const isPro = planName.toLowerCase() === 'pro';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={460}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        overflow: 'hidden',
      }}
      styles={{
        header: { display: 'none' },
        body: { padding: 0 },
      }}
    >
      {/* Gradient top strip */}
      <div style={{
        height: 4,
        background: isPro
          ? 'linear-gradient(90deg, #8B5CF6, #06B6D4)'
          : 'linear-gradient(90deg, #F59E0B, #EF4444)',
      }} />

      <Flex vertical align="center" gap={20} style={{ padding: '36px 32px 32px' }}>
        {/* Icon */}
        <div style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: isPro
            ? 'rgba(139,92,246,0.12)'
            : 'rgba(245,158,11,0.12)',
          border: `1px solid ${isPro ? 'rgba(139,92,246,0.30)' : 'rgba(245,158,11,0.30)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {isPro
            ? <ThunderboltOutlined style={{ fontSize: 32, color: '#22D3EE' }} />
            : <CrownOutlined style={{ fontSize: 32, color: '#F59E0B' }} />
          }
        </div>

        {/* Coming Soon badge */}
        <Tag
          icon={<ClockCircleOutlined />}
          style={{
            background: 'rgba(139,92,246,0.10)',
            border: '1px solid rgba(139,92,246,0.25)',
            color: 'var(--color-primary-400)',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.10em',
            padding: '3px 12px',
          }}
        >
          COMING SOON
        </Tag>

        {/* Text */}
        <Flex vertical align="center" gap={10} style={{ textAlign: 'center' }}>
          <Title level={3} style={{ margin: 0, color: 'var(--text-primary)' }}>
            {planName} Plan — In the Works
          </Title>
          <Text style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 340 }}>
            We're finalizing the <strong style={{ color: 'var(--text-primary)' }}>{planName}</strong> tier
            with premium AI models and exclusive features. For now, everything is <strong style={{ color: '#10B981' }}>completely free</strong> while we build.
          </Text>
        </Flex>

        {/* Perks preview */}
        <div style={{
          width: '100%',
          padding: '16px 20px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <Text style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            What's coming
          </Text>
          <Flex vertical gap={8} style={{ marginTop: 10 }}>
            {(isPro
              ? ['Advanced AI interview prep', 'Company-specific roadmaps', '1-on-1 mock interviews']
              : ['State-of-the-art AI reasoning', 'Unlimited mock interviews', 'Dedicated career coach']
            ).map((f) => (
              <Flex key={f} align="center" gap={8}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isPro ? '#8B5CF6' : '#F59E0B',
                  flexShrink: 0,
                }} />
                <Text style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{f}</Text>
              </Flex>
            ))}
          </Flex>
        </div>

        {/* CTA */}
        <Flex gap={12} style={{ width: '100%' }}>
          <Button
            block
            onClick={onClose}
            style={{
              flex: 1,
              borderRadius: 12,
              height: 44,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'var(--text-secondary)',
            }}
          >
            Maybe Later
          </Button>
          <Button
            block
            type="primary"
            onClick={onClose}
            style={{
              flex: 1,
              borderRadius: 12,
              height: 44,
              background: 'linear-gradient(135deg, #7C3AED, #0891B2)',
              border: 'none',
              fontWeight: 600,
            }}
          >
            Continue with Free
          </Button>
        </Flex>
      </Flex>
    </Modal>
  );
}
