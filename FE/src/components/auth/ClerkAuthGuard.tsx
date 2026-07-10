import { useAuth } from '@clerk/react';
import { Navigate, useLocation } from 'react-router-dom';
import { Flex, Spin, Typography } from 'antd';

const { Text } = Typography;

// ─── Loading Spinner ──────────────────────────────────────────────────────────
function AuthLoadingScreen() {
  return (
    <Flex vertical align="center" justify="center" gap="middle" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Spin size="large" />
      <Text type="secondary">Verifying session…</Text>
    </Flex>
  );
}

// ─── ClerkAuthGuard ───────────────────────────────────────────────────────────
/**
 * Wraps any route that requires authentication.
 *
 * Behaviour:
 * 1. While Clerk is resolving the session → show loading screen
 * 2. If the user is signed in             → render children
 * 3. If the user is NOT signed in         → redirect to /sign-in,
 *    preserving the intended destination in `from` state so we can
 *    redirect back after successful login.
 */
interface ClerkAuthGuardProps {
  children: React.ReactNode;
}

export function ClerkAuthGuard({ children }: ClerkAuthGuardProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  // Clerk's initial JWKS fetch is in-flight — hold rendering
  if (!isLoaded) {
    return <AuthLoadingScreen />;
  }

  // Not authenticated → bounce to sign-in with return path
  if (!isSignedIn) {
    return (
      <Navigate
        to="/sign-in"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return <>{children}</>;
}
