import { Routes, Route, Navigate } from 'react-router-dom';
import { ClerkAuthGuard }         from '../components/auth/ClerkAuthGuard';
import { AppLayout }              from '../layouts/AppLayout';
import { LandingPage }            from '../pages/LandingPage';
import { SignInPage }             from '../pages/SignInPage';
import { SignUpPage }             from '../pages/SignUpPage';
import { SSOCallbackPage }        from '../pages/SSOCallbackPage';
import { Dashboard }              from '../pages/Dashboard';
import { KnowledgeGraphPage }     from '../pages/KnowledgeGraphPage';
import { GeniPage }               from '../pages/GeniPage';
import { ConnectedAccountsPage }  from '../pages/ConnectedAccountsPage';
import { ResumesPage }            from '../pages/ResumesPage';

/**
 * AppRouter
 *
 * Route tree:
 *  /                        → LandingPage       (public)
 *  /sign-in/sso-callback    → SSOCallbackPage   (public — must be before sign-in/*)
 *  /sign-up/sso-callback    → SSOCallbackPage   (public — must be before sign-up/*)
 *  /sign-in/*               → SignInPage        (public)
 *  /sign-up/*               → SignUpPage        (public)
 *
 *  Protected (ClerkAuthGuard → AppLayout):
 *    /dashboard             → Dashboard
 *    /knowledge-graph       → KnowledgeGraphPage
 *    /geni                  → GeniPage
 *    /connected-accounts    → ConnectedAccountsPage (OAuth callback lands here)
 *    /resumes               → ResumesPage
 *
 *  *               → redirect to /
 */
export function AppRouter() {
  return (
    <Routes>
      {/* ── Public routes ───────────────────────────────────────────────── */}
      <Route path="/" element={<LandingPage />} />

      {/* SSO callback routes — must be BEFORE sign-in/* and sign-up/* wildcards */}
      <Route path="/sign-in/sso-callback" element={<SSOCallbackPage />} />
      <Route path="/sign-up/sso-callback" element={<SSOCallbackPage />} />

      <Route path="/sign-in/*" element={<SignInPage />}  />
      <Route path="/sign-up/*" element={<SignUpPage />}  />

      {/* ── Protected routes (Clerk guard → shared AppLayout shell) ─────── */}
      <Route
        element={
          <ClerkAuthGuard>
            <AppLayout />
          </ClerkAuthGuard>
        }
      >
        <Route path="/dashboard"            element={<Dashboard />}             />
        <Route path="/knowledge-graph"      element={<KnowledgeGraphPage />}    />
        <Route path="/geni"                 element={<GeniPage />}              />
        <Route path="/connected-accounts"   element={<ConnectedAccountsPage />} />
        <Route path="/resumes"              element={<ResumesPage />}           />
      </Route>

      {/* ── Fallback ─────────────────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
