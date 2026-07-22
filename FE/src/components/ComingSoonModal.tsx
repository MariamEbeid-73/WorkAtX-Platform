import { Modal, Button, Flex, Typography, Tag } from 'antd';
import { ClockCircleOutlined, ThunderboltOutlined, CrownOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

interface ComingSoonModalProps {
  open: boolean;
  onClose: () => void;
  featureName: string;
  hasAccess: boolean; // true = user is on Elite already
}

export function ComingSoonModal({ open, onClose, featureName, hasAccess }: ComingSoonModalProps) {
  const navigate = useNavigate();

  return (
    <Modal open={open} onCancel={onClose} footer={null} centered width={460} /* ...unchanged styling... */>
      <div style={{ height: 4, background: hasAccess
        ? 'linear-gradient(90deg, #8B5CF6, #06B6D4)'
        : 'linear-gradient(90deg, #F59E0B, #EF4444)' }} />

      <Flex vertical align="center" gap={20} style={{ padding: '36px 32px 32px' }}>
        <div style={{ width: 72, height: 72, borderRadius: 20,
          background: hasAccess ? 'rgba(139,92,246,0.12)' : 'rgba(245,158,11,0.12)',
          border: `1px solid ${hasAccess ? 'rgba(139,92,246,0.30)' : 'rgba(245,158,11,0.30)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {hasAccess
            ? <ThunderboltOutlined style={{ fontSize: 32, color: '#22D3EE' }} />
            : <CrownOutlined style={{ fontSize: 32, color: '#F59E0B' }} />}
        </div>

        <Tag icon={<ClockCircleOutlined />} style={{ /* unchanged */ }}>COMING SOON</Tag>

        <Flex vertical align="center" gap={10} style={{ textAlign: 'center' }}>
          <Title level={3} style={{ margin: 0, color: 'var(--text-primary)' }}>
            {featureName} — In the Works
          </Title>
          <Text style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 340 }}>
            {hasAccess
              ? <>You're on <strong style={{ color: '#8B5CF6' }}>Elite</strong>, so you'll get access to <strong style={{ color: 'var(--text-primary)' }}>{featureName}</strong> the moment it launches — no extra steps needed.</>
              : <>{featureName} is part of our <strong style={{ color: '#F59E0B' }}>Elite</strong> plan, launching soon. Upgrade now to be first in line when it's ready.</>
            }
          </Text>
        </Flex>

        <Flex gap={12} style={{ width: '100%' }}>
          <Button block onClick={onClose} style={{ flex: 1, borderRadius: 12, height: 44,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--text-secondary)' }}>
            Maybe Later
          </Button>
          {!hasAccess && (
            <Button block type="primary" onClick={() => navigate('/pricing')} style={{ flex: 1, borderRadius: 12, height: 44,
              background: 'linear-gradient(135deg, #7C3AED, #0891B2)', border: 'none', fontWeight: 600 }}>
              Upgrade to Elite
            </Button>
          )}
        </Flex>
      </Flex>
    </Modal>
  );
}