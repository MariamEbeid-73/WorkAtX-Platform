import { SignUp } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { Layout, Typography, Flex } from 'antd';
import { clerkAppearance } from '../theme';

const { Content } = Layout;
const { Title, Text } = Typography;

export function SignUpPage() {
  const navigate = useNavigate();

  return (
    <Layout style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div 
        style={{
          position: 'absolute',
          top: -150,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 800,
          height: 500,
          background: 'radial-gradient(ellipse, rgba(6, 182, 212, 0.15) 0%, rgba(139, 92, 246, 0.15) 40%, transparent 65%)',
          pointerEvents: 'none'
        }} 
      />
      
      <Content>
        <Flex vertical align="center" justify="center" style={{ minHeight: '100vh', padding: 24 }}>
          
          <div style={{ textAlign: 'center', marginBottom: 32, zIndex: 1 }}>
            <Title 
              level={2} 
              onClick={() => navigate('/')}
              style={{ cursor: 'pointer', margin: 0, background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              Work@X
            </Title>
            <Text type="secondary" style={{ fontSize: 16 }}>Create your account to unlock advanced models</Text>
          </div>

          <div style={{ zIndex: 1, width: '100%', maxWidth: 440 }}>
            <SignUp
              appearance={clerkAppearance}
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              forceRedirectUrl="/dashboard"
            />
          </div>

          <div style={{ marginTop: 24, zIndex: 1 }}>
            <Text type="secondary">
              Already have an account?{' '}
              <a onClick={() => navigate('/sign-in')} style={{ color: 'var(--text-accent)' }}>
                Sign in
              </a>
            </Text>
          </div>

        </Flex>
      </Content>
    </Layout>
  );
}
