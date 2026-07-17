import { Flex, Typography, Tag, Button } from 'antd';
import { ApartmentOutlined, ExperimentOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export function KnowledgeGraphPage() {
  return (
    <div style={{ animation: 'fadeIn 0.5s ease both' }}>
      {/* Page header */}
      <Flex vertical gap={4} style={{ marginBottom: 40 }}>
        <Text style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.02em' }}>
          Navigation
        </Text>
        <Title level={3} style={{ margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Knowledge Graph
        </Title>
      </Flex>

      {/* Coming soon hero */}
      <Flex
        vertical
        align="center"
        justify="center"
        gap={24}
        style={{
          minHeight: 480,
          borderRadius: 24,
          background: 'rgba(14,18,32,0.60)',
          border: '1px solid rgba(255,255,255,0.08)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated background nodes */}
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 6 + (i % 3) * 4,
              height: 6 + (i % 3) * 4,
              borderRadius: '50%',
              background: `rgba(139,92,246,${0.15 + i * 0.05})`,
              boxShadow: `0 0 ${12 + i * 4}px rgba(139,92,246,0.3)`,
              top:  `${15 + (i * 13) % 70}%`,
              left: `${10 + (i * 17) % 80}%`,
              animation: `pulse-glow ${2 + i * 0.4}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}

        {/* Connector lines (SVG) */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12 }}
          preserveAspectRatio="none"
        >
          <line x1="20%" y1="25%" x2="50%" y2="50%" stroke="#8B5CF6" strokeWidth="1" strokeDasharray="4 6" />
          <line x1="50%" y1="50%" x2="80%" y2="30%" stroke="#06B6D4" strokeWidth="1" strokeDasharray="4 6" />
          <line x1="50%" y1="50%" x2="35%" y2="75%" stroke="#8B5CF6" strokeWidth="1" strokeDasharray="4 6" />
          <line x1="50%" y1="50%" x2="70%" y2="70%" stroke="#06B6D4" strokeWidth="1" strokeDasharray="4 6" />
        </svg>

        {/* Content */}
        <Flex vertical align="center" gap={16} style={{ zIndex: 1, textAlign: 'center', maxWidth: 420, padding: 24 }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.15))',
            border: '1px solid rgba(139,92,246,0.30)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ApartmentOutlined style={{ fontSize: 32, color: 'var(--color-primary-400)' }} />
          </div>

          <Tag
            icon={<ExperimentOutlined />}
            style={{
              background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(139,92,246,0.25)',
              color: 'var(--color-primary-400)',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.10em',
            }}
          >
            COMING SOON
          </Tag>

          <Title level={3} style={{ margin: 0, color: 'var(--text-primary)' }}>
            Skill Knowledge Graph
          </Title>

          <Text style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Visualize your tech skill tree as an interactive graph. See how your skills
            connect, identify gaps, and get AI-powered suggestions to accelerate your growth.
          </Text>

          <Flex gap={12} wrap="wrap" justify="center" style={{ marginTop: 8 }}>
            {['Skill Nodes', 'Gap Detection', 'Learning Paths', 'Company Matching'].map((feat) => (
              <Tag
                key={feat}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'var(--text-secondary)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              >
                {feat}
              </Tag>
            ))}
          </Flex>

          <Button
            type="primary"
            style={{
              marginTop: 8,
              background: 'linear-gradient(135deg, #7C3AED, #0891B2)',
              border: 'none',
              borderRadius: 12,
              fontWeight: 600,
              height: 44,
              paddingInline: 28,
            }}
          >
            Notify Me When Ready
          </Button>
        </Flex>
      </Flex>
    </div>
  );
}
