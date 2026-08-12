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

// ── Service worker registration ────────────────────────────────────────────
// The SW defeats stale-page snapshotting in in-app WebViews (notably the
// Google app's in-app browser): its NetworkFirst navigation handler forces
// a network fetch on every page open, so new deploys render immediately
// instead of " desktop until manual refresh". For regular Chrome it's a
// progressive enhancement — pages already work via HTTP cache headers.
//
// Registered only in a browser + on https/localhost (SW requires a secure
// context). `register` with `updateViaCache: 'none'` ensures the SW itself
// (and its importScripts, if any) bypass the HTTP cache, so a new sw.js
// deployed on the server is picked up on the next reload.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((reg) => {
        // If a new SW is already waiting to activate, take it now.
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && reg.waiting) {
              // New SW installed and waiting — ask it to activate
              // immediately so the user doesn't navigate with stale assets.
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch((err) => {
        // SW registration failure must never break the page.
        console.warn('[WorkX] Service worker registration failed:', err);
      });

    // When the controlling SW changes after skipWaiting(), reload once so
    // clients pick up the new controlled scope. Guard with sessionStorage so
    // we never loop.
    let reloadedForNewSW = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadedForNewSW) return;
      reloadedForNewSW = true;
      try {
        if (sessionStorage.getItem('workx-sw-reloaded') === '1') return;
        sessionStorage.setItem('workx-sw-reloaded', '1');
        window.location.reload();
      } catch {
        // sessionStorage unavailable → just reload unconditionally once;
        // reloadedForNewSW guards a second controllerchange within the
        // same page session.
        window.location.reload();
      }
    });
  });
}

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
