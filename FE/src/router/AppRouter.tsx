import { Routes, Route, Navigate } from 'react-router-dom';
import { ClerkAuthGuard } from '../components/auth/ClerkAuthGuard';
import { LandingPage }     from '../pages/LandingPage';
import { SignInPage }       from '../pages/SignInPage';
import { SignUpPage }       from '../pages/SignUpPage';
import { Dashboard }        from '../pages/Dashboard';

/**
 * AppRouter — Central routing configuration for WorkX.
 *
 * Route access matrix:
 * ┌────────────────────┬────────┬──────────────────────────────────────┐
 * │ Route              │ Guard  │ Description                          │
 * ├────────────────────┼────────┼──────────────────────────────────────┤
 * │ /                  │ Public │ Landing / Pricing page               │
 * │ /sign-in           │ Public │ Clerk sign-in (redirect after login) │
 * │ /sign-up           │ Public │ Clerk sign-up                        │
 * │ /dashboard         │ 🔒     │ Main app — requires auth             │
 * │ * (catch-all)      │ —      │ Redirects to /                       │
 * └────────────────────┴────────┴──────────────────────────────────────┘
 */
export function AppRouter() {
  return (
    <Routes>
      {/* ── Public Routes ────────────────────────────────── */}
      <Route path="/"          element={<LandingPage />} />
      <Route path="/sign-in/*" element={<SignInPage />}  />
      <Route path="/sign-up/*" element={<SignUpPage />}  />

      {/* ── Protected Routes ─────────────────────────────── */}
      <Route
        path="/dashboard"
        element={
          <ClerkAuthGuard>
            <Dashboard />
          </ClerkAuthGuard>
        }
      />

      {/* ── Catch-All ────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
