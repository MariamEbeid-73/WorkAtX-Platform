import { SignIn } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { Layout, Typography, Flex } from 'antd';
import { clerkAppearance } from '../theme';

const { Content } = Layout;
const { Title, Text } = Typography;

export function SignInPage() {
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
          background: 'radial-gradient(ellipse, rgba(139, 92, 246, 0.2) 0%, transparent 65%)',
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
            <Text type="secondary" style={{ fontSize: 16 }}>Welcome back — sign in to continue</Text>
          </div>

          <div style={{ zIndex: 1, width: '100%', maxWidth: 440 }}>
            <SignIn
              appearance={clerkAppearance}
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              forceRedirectUrl="/dashboard"
            />
          </div>

          <div style={{ marginTop: 24, zIndex: 1 }}>
            <Text type="secondary">
              Don't have an account?{' '}
              <a onClick={() => navigate('/sign-up')} style={{ color: 'var(--text-accent)' }}>
                Sign up for free
              </a>
            </Text>
          </div>

        </Flex>
      </Content>
    </Layout>
  );
}
