# WorkX Frontend (FE) — Guide

React 19 + TypeScript SPA, Ant Design, Clerk auth, SignalR live job updates. See root `AGENTS.md` for the pipeline it renders.

## Commands

```sh
npm install
npm run dev      # Vite dev server on http://localhost:5173
npm run build    # tsc -b && vite build  →  dist/
npm run lint     # oxlint  (NOT eslint — don't reach for ESLint config)
npm run preview  # serve the built dist
```

- Linter is **oxlint** (`.oxlintrc.json`, no ESLint). Run `npm run lint` after changes.
- Docker build (`FE/Dockerfile`) runs `npm run build` with node:20-alpine, serves `dist/` via nginx on port 4200 (`nginx.conf` SPA fallback to `index.html`).
- Ports: dev 5173, docker 4200. BE CORS allows both. Point `VITE_API_URL` at `http://localhost:5000`.

## Env — runtime-injected, not build-time

- `docker-compose.yml` passes `VITE_API_URL` / `VITE_CLERK_PUBLISHABLE_KEY` into the FE container.
- At container start `FE/env.sh` writes `window._env_` into `/usr/share/nginx/html/env-config.js` (script must stay LF line endings).
- `src/config.ts` reads `window._env_[key]` first, falls back to `import.meta.env[key]`, then a default.
- `.env.development` holds the dev keys; the publishable key there is the same one used in prod Clerk instance.

## Auth & API

- Clerk via `@clerk/react` (`ClerkProvider` in `src/main.tsx`); `ClerkAuthGuard` wraps authenticated routes.
- `src/services/api.ts` is the single fetch helper — adds `Content-Type: application/json` + `Authorization: Bearer <token>`; pass the Clerk token explicitly.
- SignalR live updates: `src/services/jobSocket.ts` connects to BE `/hubs/job-status`, passes the JWT as `?access_token=` (BE requires the query param on the hub path). Subscribe with `connection.invoke('SubscribeToJob', jobId)`; one `job_status_update` handler covers the whole job lifecycle (queued → processing → completed/failed + stage/progress).

## Layout

- `src/pages/` — routes (`Dashboard`, `AiTutorPage`, `ResumesPage`, `CvOptimizerPage`, `MockInterviewPage`, `GeniPage`, OAuth/SSO return pages, ...)
- `src/components/` — `dashboard/`, `chat/`, `auth/`, `billing/`
- `src/services/` — typed API modules per domain (chat, resume, analysis, profile, oauth, jobSocket). **`jobService.ts` holds the generic job-wait helpers (`waitForJobCompletion`, `getJobStatus`, `getJobResult`, `pollJobUntilDone`) — ALL async flows (chat AND CV analysis) must wait on jobs through these, never hand-rolled socket/poll code.** built on `api.ts`
- `src/types/` — TS mirrors of BE DTO / contract shapes (`profile.ts` has `ScoreBreakdown`, used by dashboard scores card)
- `src/hooks/` — `useProfile`, `useChat`; `src/router/AppRouter.tsx`; `src/theme/antdTheme.ts` (Ant Design tokens)

## Gotchas

- Keep `src/types/*` in sync with `CONTRACTS.md` / BE DTOs — the job result is polymorphic (string for plain chat replies, object for analysis), so result consumers must handle both.
- Chat replies are NOT in the `POST /api/chat/message` response — the API returns only `{ jobId }`; wait via `waitForJobCompletion` (SignalR + poll fallback), then re-fetch authoritative data.
- `POST /resumes/{id}/confirm` returns `{ resume, analysisJobId }` — if `analysisJobId` is non-null, an analysis parse was queued; track it the same way as a chat job. `analysisJobId: null` means the CV was already parsed (no progress to show).
- **Analysis results and active jobs persist.** On mount/refresh, `KnowledgeGraphPage` calls `GET /api/analysis1/state` (via `src/services/analysisService.ts`) to restore the latest completed analysis or resume the user's queued/processing Analysis 1 job. Never queue a job just to restore page state. After job completion, re-fetch `GET /api/analysis1/latest` and render the persisted result. A fresh parse is triggered only by the explicit in-page Run/Re-analyse action.
- `src/services/analysisService.ts` owns `startAnalysis` (`POST /api/analysis1/start` → `{ jobId }`) and `getLatestAnalysis`; `startAnalysis` lives here, NOT in `resumeService.ts`.
- Dashboard scores (`GET /api/profile/scores`) can return `data: null` before the worker computes them — render fallbacks, don't error.
- `FE/src/pages/env.sh` is a duplicate copy of `FE/env.sh` (both tracked); edit `FE/env.sh` — the Dockerfile copies only the root one.
- `package.json` still says `"name": "fe-tmp"` — historical, harmless.

## Service worker (offline + WebView snapshot defeat)

`FE/public/sw.js` is registered by `src/main.tsx` on `https:` / `localhost`. Its job is to make the app render the **current** deployed bundle on the very first open — even in in-app WebViews (notably the Google app's in-app browser) that serve a cached HTML+JS page snapshot and bypass the network entirely on the stale open.

- **Navigations** (HTML): NetworkFirst — always fetch `/` with `cache: 'no-store'`, fall back to the cached shell only when offline. This is what defeats the WebView snapshot.
- **`/assets/*`** (Vite content-hashed JS/CSS) and root statics: StaleWhileRevalidate. Filenames change every build, so a stale asset can never be referenced by a fresh `index.html`.
- **Cross-origin** (Clerk CDN, Google Fonts, the BE on `api.workx-iti.com`): pass through; never cached.
- On `activate`, caches whose name prefix doesn't match the current `CACHE_VERSION` are deleted; `skipWaiting()` + `clients.claim()` make a new SW take over immediately. `main.tsx` detects a waiting SW and posts `SKIP_WAITING`, then reloads once on `controllerchange` (guarded by `sessionStorage` to avoid a loop).

**On every FE deploy, bump `CACHE_VERSION` at the top of `FE/public/sw.js`** (e.g. `workx-v-<brief>-<date>`). That's the hard trigger that flushes stale SW caches across all clients. Without the bump, the previous SW's caches stay live until the user opens the tab again — defeating the point.
