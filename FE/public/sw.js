/* eslint-disable */
/**
 * WorkX Service Worker
 * ====================
 * Goal: defeat stale-page snapshots served by in-app WebViews (notably the
 * Google app's in-app browser), which bypass the network on the top-level
 * navigation and show a cached HTML+JS snapshot — so new deploys never
 * render until the user manually refreshes.
 *
 * Strategy
 * --------
 *  • Navigation requests (HTML)            → NetworkFirst: always try the
 *    network; only fall back to the cached index.html when offline. This is
 *    what makes the Google app show the new bundle on open.
 *  • Vite content-hashed assets (/assets/*) → StaleWhileRevalidate: serve
 *    instantly, then refresh in background. Safe because filenames change
 *    every build, so a stale asset can never be referenced by a new HTML.
 *  • Same-origin static files (favicon, env-config.js, icons) →
 *    StaleWhileRevalidate. An updated index.html will reference new
 *    filenames; the old files just become dead cache, evicted by TTL.
 *  • Cross-origin (Clerk CDN, Google Fonts, API calls) → passthrough; the
 *    SW never caches these.
 *
 * Cache versioning
 * ----------------
 *  On `install` and on every `activate`, we drop cache entries whose name
 *  does not match the current CACHE_VERSION. Bumping CACHE_VERSION on each
 *  deploy is the hard trigger that flushes stale assets across clients.
 *  We also call `skipWaiting()` + `clients.claim()` so a new SW activates
 *  immediately even on the in-WebView session.
 */
const CACHE_VERSION = 'workx-v-responsive-2026-08-12';
const NAV_CACHE = `${CACHE_VERSION}-nav`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

// Anything outside these patterns (cross-origin, API, Clerk, fonts) goes
// straight to network — never touched by the SW.
const ASSET_RE = /\/assets\//;
const STATIC_RE = /^https?:\/\/[^/]+\/(favicon\.svg|icons\.svg|env-config\.js)$/;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(ASSET_CACHE);
    // Pre-cache the shell so offline first-paint still works. Don't let
    // a fetch failure block installation.
    try { await cache.add('/'); } catch (e) { /* ignore — offline first install */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Drop every cache that isn't from this version.
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => !k.startsWith(CACHE_VERSION))
        .map((k) => caches.delete(k)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  // Allow clients to force the SW to activate as soon as a new one is
  // waiting. main.tsx posts { type: 'SKIP_WAITING' } when it detects a
  // waiting SW on reload.
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET. POST/PUT/etc. (Clerk, API mutations) always pass through.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Don't touch cross-origin (Clerk CDN, Google Fonts, API on
  // api.workx-iti.com). Their cache rules are their own.
  if (url.origin !== self.location.origin) return;

  // Chrome extension / non-http(s) schemes — leave alone.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // 1. Navigations (HTML). NetworkFirst is what defeats the Google app's
  //    cached-snapshot open.
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(req));
    return;
  }

  // 2. Vite content-hashed assets — SWR.
  if (ASSET_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(ASSET_CACHE, req));
    return;
  }

  // 3. Root static files (favicon, icons, env-config.js) — SWR.
  if (STATIC_RE.test(url.pathname) || url.pathname === '/favicon.svg') {
    event.respondWith(staleWhileRevalidate(ASSET_CACHE, req));
    return;
  }

  // Everything else same-origin (rare): just hit the network.
  // Falling through means the browser handles it normally.
});

async function networkFirstNavigation(req) {
  const cache = await caches.open(NAV_CACHE);
  try {
    const fresh = await fetch(req, { cache: 'no-store', credentials: 'same-origin' });
    if (fresh && (fresh.ok || fresh.type === 'opaque')) {
      cache.put('/', fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    // Offline / unreachable — serve the last cached shell if present.
    const cached = await cache.match('/');
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(cacheName, req) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req, { credentials: 'same-origin' })
    .then((fresh) => {
      if (fresh && (fresh.ok || fresh.type === 'opaque')) {
        cache.put(req, fresh.clone()).catch(() => {});
      }
      return fresh;
    })
    .catch(() => cached); // offline → return whatever we have
  return cached || fetchPromise;
}