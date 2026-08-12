import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react';
import { ConfigProvider } from 'antd';
import { clerkAppearance } from './theme';
import { workXTheme } from './theme/antdTheme';
import './index.css';
import App from './App';
import { config } from './config';

const CLERK_PUBLISHABLE_KEY = config.clerkPublishableKey;

if (!CLERK_PUBLISHABLE_KEY) {
  console.error('[WorkX] Missing VITE_CLERK_PUBLISHABLE_KEY. Add it to .env.development');
}

// ── Stale-cache / bfcache guard ────────────────────────────────────────────
// Bumps to a new WORKX_BUNDLE_VERSION signal a new deploy. If a mobile
// browser restored an older page from back-forward cache (Chrome on Android
// aggressively bfcaches even with Cache-Control: no-store) the compiled-in
// version below will mismatch the meta tag's version → force one fresh load.
// Also fires on `pageshow` for bfcache restores themselves.
const WORKX_BUNDLE_VERSION = 'responsive-2026-08-12';

function readMetaVersion(): string | null {
  const el = document.querySelector('meta[name="workx-bundle-version"]');
  return el?.getAttribute('content') ?? null;
}

function forceReloadOnce(reason: string) {
  const key = 'workx-reloaded-for';
  try {
    if (sessionStorage.getItem(key) === WORKX_BUNDLE_VERSION) return;
    sessionStorage.setItem(key, WORKX_BUNDLE_VERSION);
    console.warn(`[WorkX] Forcing reload: ${reason}`);
    window.location.reload();
  } catch {
    // sessionStorage unavailable (private mode) — fall back to a hard reload
    // only when the meta version actually diverges, avoiding infinite loops.
    if (readMetaVersion() !== WORKX_BUNDLE_VERSION) {
      window.location.reload();
    }
  }
}

// (1) Hard mismatch: stale HTML served an old meta version but the bundle is
//     the new one (or vice versa). Reload exactly once.
if (readMetaVersion() !== WORKX_BUNDLE_VERSION) {
  forceReloadOnce('bundle version mismatch (stale HTML or bundle)');
}

// (2) bfcache restore: mobile Chrome often restores the previous page state
//     on tab switch / back navigation, skipping network entirely. Detect it
//     and reload so users never see a stale desktop layout after a deploy.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    forceReloadOnce('page restored from back-forward cache');
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={workXTheme}>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY || ''} appearance={clerkAppearance}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ClerkProvider>
    </ConfigProvider>
  </StrictMode>,
);
