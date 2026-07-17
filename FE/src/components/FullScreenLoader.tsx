import { Flex, Typography } from 'antd';

const { Title, Text } = Typography;

export function FullScreenLoader() {
  return (
    <Flex vertical align="center" justify="center" style={{ 
      position: 'fixed', inset: 0, zIndex: 9999, 
      background: 'var(--bg-base)', overflow: 'hidden' 
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
        animation: 'pulse-glow 3s ease-in-out infinite',
      }} />

      {/* Main Container */}
      <Flex vertical align="center" gap={32} style={{ zIndex: 1, position: 'relative' }}>
        
        {/* Animated Rings & Logo */}
        <div style={{ position: 'relative', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Outer Ring */}
          <div style={{
            position: 'absolute', inset: 0,
            border: '2px solid rgba(139,92,246,0.2)',
            borderTopColor: '#8B5CF6',
            borderRadius: '50%',
            animation: 'spin 1.5s linear infinite',
          }} />
          {/* Inner Ring */}
          <div style={{
            position: 'absolute', inset: 12,
            border: '2px solid rgba(6,182,212,0.2)',
            borderBottomColor: '#06B6D4',
            borderRadius: '50%',
            animation: 'spin-reverse 2s linear infinite',
          }} />
          
          {/* Center Logo */}
          <Text style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.25rem',
            fontWeight: 900,
            letterSpacing: '-0.05em',
            background: 'var(--gradient-text)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}>
            W@X
          </Text>
        </div>

        {/* Text Sequence */}
        <Flex vertical align="center" gap={8} style={{ textAlign: 'center' }}>
          <Title level={4} style={{ margin: 0, color: 'var(--text-primary)', letterSpacing: 1 }}>
            Initializing Workspace
          </Title>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 14, fontFamily: 'monospace' }}>
            Establishing secure connection...
          </Text>
        </Flex>

      </Flex>

      <style>
        {`
          @keyframes spin { 100% { transform: rotate(360deg); } }
          @keyframes spin-reverse { 100% { transform: rotate(-360deg); } }
        `}
      </style>
    </Flex>
  );
}
