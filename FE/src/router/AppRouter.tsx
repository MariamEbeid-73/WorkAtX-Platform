import { Routes, Route, Navigate } from 'react-router-dom';
import { ClerkAuthGuard }     from '../components/auth/ClerkAuthGuard';
import { AppLayout }          from '../layouts/AppLayout';
import { LandingPage }        from '../pages/LandingPage';
import { SignInPage }         from '../pages/SignInPage';
import { SignUpPage }         from '../pages/SignUpPage';
import { SSOCallbackPage }    from '../pages/SSOCallbackPage';
import { Dashboard }          from '../pages/Dashboard';
import { KnowledgeGraphPage } from '../pages/KnowledgeGraphPage';
import { GeniPage } from '../pages/GeniPage';
import { PricingPage } from '../pages/PricingPage';
import { AiTutorPage } from '../pages/AiTutorPage';
import { MockInterviewPage } from '../pages/MockInterviewPage';
import { CvOptimizerPage } from '../pages/CvOptimizerPage';
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
 *    /dashboard          → Dashboard
 *    /knowledge-graph    → KnowledgeGraphPage
 *    /geni               → GeniPage
 *
 *  *               → redirect to /
 */
export function AppRouter() {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />

            <Route path="/sign-in/sso-callback" element={<SSOCallbackPage />} />
            <Route path="/sign-up/sso-callback" element={<SSOCallbackPage />} />
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />

            <Route
                element={
                    <ClerkAuthGuard>
                        <AppLayout />
                    </ClerkAuthGuard>
                }
            >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
                <Route path="/geni" element={<GeniPage />} />
                <Route path="/ai-tutor" element={<AiTutorPage />} />
                <Route path="/mock-interview" element={<MockInterviewPage />} />
                <Route path="/cv-optimizer" element={<CvOptimizerPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}