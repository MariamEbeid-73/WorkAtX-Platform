import { useAuth } from '@clerk/react';
import { AppRouter } from './router/AppRouter';
import { FullScreenLoader } from './components/FullScreenLoader';

function App() {
  const { isLoaded } = useAuth();

  // Block the entire app render until Clerk has resolved the session.
  // This prevents the empty-page flash between the sign-in redirect and the
  // dashboard mounting — Clerk fires the redirect BEFORE isLoaded=true, so
  // without this guard the page is momentarily blank.
  if (!isLoaded) return <FullScreenLoader />;

  return <AppRouter />;
}

export default App;
