import { Routes, Route, Navigate } from 'react-router-dom';
import { ClerkAuthGuard } from '../components/auth/ClerkAuthGuard';
import { LandingPage } from '../pages/LandingPage';
import { SignInPage } from '../pages/SignInPage';
import { SignUpPage } from '../pages/SignUpPage';
import { Dashboard } from '../pages/Dashboard';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/"          element={<LandingPage />} />
      <Route path="/sign-in/*" element={<SignInPage />}  />
      <Route path="/sign-up/*" element={<SignUpPage />}  />

      <Route
        path="/dashboard"
        element={
          <ClerkAuthGuard>
            <Dashboard />
          </ClerkAuthGuard>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
