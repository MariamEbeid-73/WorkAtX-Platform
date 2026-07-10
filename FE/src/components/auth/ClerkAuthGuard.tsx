import { useAuth } from '@clerk/react';
import { Navigate, useLocation } from 'react-router-dom';
import { Flex, Spin, Typography } from 'antd';

const { Text } = Typography;

function AuthLoadingScreen() {
  return (
    <Flex vertical align="center" justify="center" gap="middle" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Spin size="large" />
      <Text type="secondary">Verifying session…</Text>
    </Flex>
  );
}

interface ClerkAuthGuardProps {
  children: React.ReactNode;
}

export function ClerkAuthGuard({ children }: ClerkAuthGuardProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) return <AuthLoadingScreen />;

  if (!isSignedIn) {
    return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
