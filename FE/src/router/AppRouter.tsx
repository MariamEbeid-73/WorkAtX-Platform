import { Routes, Route, Navigate } from 'react-router-dom';
import { ClerkAuthGuard } from '../components/auth/ClerkAuthGuard';
import { AppLayout } from '../layouts/AppLayout';
import { LandingPage } from '../pages/LandingPage';
import { SignInPage } from '../pages/SignInPage';
import { SignUpPage } from '../pages/SignUpPage';
import { SSOCallbackPage } from '../pages/SSOCallbackPage';
import { Dashboard } from '../pages/Dashboard';
import { KnowledgeGraphPage } from '../pages/KnowledgeGraphPage';
import { GeniPage } from '../pages/GeniPage';

// Pages from incoming branch
import { ConnectedAccountsPage } from '../pages/ConnectedAccountsPage';
import { ResumesPage } from '../pages/ResumesPage';

// Pages from current branch
import { PricingPage } from '../pages/PricingPage';
import { SettingsPage } from '../pages/SettingsPage';
import { AiTutorPage } from '../pages/AiTutorPage';
import { MockInterviewPage } from '../pages/MockInterviewPage';
import { CvOptimizerPage } from '../pages/CvOptimizerPage';

/**
 * AppRouter
 *
 * Route tree combined from both branches to support all features.
 */
export function AppRouter() {
    return (
        <Routes>
            {/* ── Public routes ───────────────────────────────────────────────── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />

            {/* SSO callback routes — must be BEFORE sign-in/* and sign-up/* wildcards */}
            <Route path="/sign-in/sso-callback" element={<SSOCallbackPage />} />
            <Route path="/sign-up/sso-callback" element={<SSOCallbackPage />} />

            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />

            {/* ── Protected routes (Clerk guard → shared AppLayout shell) ─────── */}
            <Route
                element={
                    <ClerkAuthGuard>
                        <AppLayout />
                    </ClerkAuthGuard>
                }
            >
                {/* Core Routes */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
                <Route path="/geni" element={<GeniPage />} />

                {/* Incoming Routes */}
                <Route path="/connected-accounts" element={<ConnectedAccountsPage />} />
                <Route path="/resumes" element={<ResumesPage />} />

                {/* Current Routes */}
                <Route path="/ai-tutor" element={<AiTutorPage />} />
                <Route path="/mock-interview" element={<MockInterviewPage />} />
                <Route path="/cv-optimizer" element={<CvOptimizerPage />} />
                <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* ── Fallback ─────────────────────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}