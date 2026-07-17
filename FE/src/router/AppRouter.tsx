import { Routes, Route, Navigate } from 'react-router-dom';
import { ClerkAuthGuard }     from '../components/auth/ClerkAuthGuard';
import { AppLayout }          from '../layouts/AppLayout';
import { LandingPage }        from '../pages/LandingPage';
import { SignInPage }         from '../pages/SignInPage';
import { SignUpPage }         from '../pages/SignUpPage';
import { Dashboard }          from '../pages/Dashboard';
import { KnowledgeGraphPage } from '../pages/KnowledgeGraphPage';
import { GeniPage }           from '../pages/GeniPage';

/**
 * AppRouter
 *
 * Route tree:
 *  /               → LandingPage       (public)
 *  /sign-in/*      → SignInPage        (public)
 *  /sign-up/*      → SignUpPage        (public)
 *
 *  Protected (ClerkAuthGuard → AppLayout):
 *    /dashboard          → Dashboard
 *    /knowledge-graph    → KnowledgeGraphPage
 *    /geni               → GeniPage
 *
 *  *               → redirect to /
 */
export function AppRouter() {
  return (
    <Routes>
      {/* ── Public routes ───────────────────────────────────────────────── */}
      <Route path="/"          element={<LandingPage />} />
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
        <Route path="/dashboard"       element={<Dashboard />}          />
        <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
        <Route path="/geni"            element={<GeniPage />}           />
      </Route>

      {/* ── Fallback ─────────────────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
