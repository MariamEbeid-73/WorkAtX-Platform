# WorkX Backend (BE) — Guide

ASP.NET Core 8 API — the owner of ALL database writes and the orchestrator of the async job pipeline. See the root `AGENTS.md` for the overall architecture.

## Stack & entrypoints

- `.NET 8` (`BE.csproj`, `TargetFramework net8.0`), single-project solution `BE.slnx`.
- EF Core 8 + Npgsql (`AppDbContext`), StackExchange.Redis, AWSSDK.S3 (against MinIO), Swashbuckle, JwtBearer (Clerk authority), SignalR.
- Entry: `BE/Program.cs` — wires DI, CORS, auth, hosted services, auto-migrates in Development.

## Run

- Full stack (recommended): root `./startup.sh` (builds + runs everything via compose; BE on port 5000).
- Native dev: `docker compose up -d db redis minio minio-init` then `dotnet run` from `BE/`. Uses `appsettings.Development.json` which points at `localhost` for Postgres/Redis/MinIO.
- Swagger: http://localhost:5000/swagger — paste a Clerk JWT in the Bearer box (do NOT prefix "Bearer ", it's added for you).
- Migrations auto-apply on startup when `ASPNETCORE_ENVIRONMENT=Development` (`Program.cs:65-70`). New migration: `dotnet ef migrations add <Name>` — `Microsoft.EntityFrameworkCore.Tools` 8.0.11 is already referenced in `BE.csproj`.

## Auth — two flavors, don't mix them

- **User endpoints**: Clerk JWT (`Authorization: Bearer <token>`). Swagger definition in `Extensions/ServiceCollectionExtensions.cs`. `CurrentUserCachingMiddleware` resolves/creates the user once per request and stashes it in `HttpContext.Items["CurrentUser"]`.
- **SignalR hub** (`/hubs/job-status`): JWT comes as `?access_token=` query param (handled in the JwtBearer `OnMessageReceived` hook), not a header.
- **Internal AI endpoints** (`/api/internal/ai/*`, `InternalAiController`): `X-Service-Token: <ServiceAuth:Token>`. Called by the Celery worker, never the browser.

## Redis roles (see `REDIS/AGENTS.md`)

- `JobQueueService` — publishes Kombu-format messages to the Redis list `celery` (LPUSH; Celery BRPOPs).
- `JobProgressStreamConsumer` (`Services/GapAnalysisStreamConsumer.cs`) — BackgroundService consuming the `job-progress-stream` Redis stream, consumer group `system-service-group`. Updates `Stage`/`Progress`, pushes `job_status_update` via SignalR, ACKs entries, reclaims entries stuck > 2 min. Only writes `Stage`/`Progress` when job `Status == "processing"`.
- Shared singleton `IConnectionMultiplexer` with `abortConnect=false`.

## Layout

- `Controllers/` — one per domain (`ChatController`, `ResumeController`, `AnalysisController`, `JobController`, `InternalAiController`, `OAuthController`, ...)
- `Services/` — implementations; `ServiceContracts/` — interfaces
- `Data/AppDbContext.cs`, `Models/`, `Migrations/`
- `Common/` — `ApiResponse.cs`, middleware, `AesEncryptionService` (encrypts OAuth tokens at rest), `PlanTier.cs`
- `DTOs/` — request/response shapes (camelCase out of the box)
- `Hubs/JobStatusHub.cs` — client must call `SubscribeToJob(jobId)`; ownership is checked server-side

## Gotchas

- JSON is globally camelCase (`Program.cs`); don't re-add PascalCase props.
- **Kombu envelope keys are literal snake/kebab-case** in `JobQueueService.BuildKombuMessage` (`content-type`, `root_id`, `delivery_tag`, ...). Celery rejects camelCase — never "prettify" these.
- CORS whitelists `http://localhost:4200` and `http://localhost:5173` only.
- OAuth flows hit `/oauth/github/callback`, `/oauth/linkedin/callback` on BE; frontend callback is `OAuth__FrontendCallbackUrl` (default `http://localhost:4200/oauth-return`). GitHub/LinkedIn secrets live only in local `.env`, not `.env.development`.
- Errors bubble through `ExceptionHandlingMiddleware` as `{ "message": "..." }` with proper status codes (404/403/401/429/409).
