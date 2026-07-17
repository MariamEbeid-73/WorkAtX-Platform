import { useAuth } from '@clerk/react';
import { Navigate, useLocation } from 'react-router-dom';
import { FullScreenLoader } from '../FullScreenLoader';

interface ClerkAuthGuardProps {
  children: React.ReactNode;
}

export function ClerkAuthGuard({ children }: ClerkAuthGuardProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) return <FullScreenLoader />;

  if (!isSignedIn) {
    return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
