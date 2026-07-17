import { AuthenticateWithRedirectCallback } from '@clerk/react';
import { FullScreenLoader } from '../components/FullScreenLoader';

/**
 * SSOCallbackPage
 *
 * Clerk's OAuth providers (Google, GitHub, LinkedIn) redirect back to
 * /sign-in/sso-callback or /sign-up/sso-callback after the user approves.
 * Clerk's <AuthenticateWithRedirectCallback /> exchanges the OAuth token,
 * sets the session cookie, and then redirects to the forceRedirectUrl.
 *
 * We render the FullScreenLoader in front so the user sees the branded
 * animation while Clerk silently finishes auth in the background.
 */
export function SSOCallbackPage() {
  return (
    <>
      {/* Clerk's callback handler — must render to complete OAuth flow */}
      <AuthenticateWithRedirectCallback />

      {/* Branded loading screen shown over the invisible Clerk callback */}
      <FullScreenLoader />
    </>
  );
}
