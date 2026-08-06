# WorkX Redis — Guide

Redis (`redis:7-alpine`, compose service `redis`, container `workx-redis`, port 6379) is the glue between BE and the Celery worker. No persistence is configured — data is ephemeral across container restarts. See root `AGENTS.md` for the pipeline overview.

## Three roles

1. **Celery broker queue** — the job intake.
   - List key: `celery` (this is the queue name; sync it everywhere: BE `Redis__CeleryQueue`, compose `CELERY_QUEUE`).
   - Producer: BE `JobQueueService` (`Services/JobQueueService.cs`) `LPUSH`es a **Kombu-format JSON** envelope. Consumer: Celery worker `BRPOP`s.
   - Envelope gotchas: inner `body` is base64 of `{"args": [], "kwargs": {"jobId": "..."}, "embed": null}`; `headers.id` == `properties.delivery_tag` == `correlation_id`; keys are literal snake_case/kebab-case (`root_id`, `content-type`) — **camelCase breaks Celery decoding**.

2. **Celery result backend** — same `REDIS_URL` (db 0). Workers don't use results explicitly; job state lives in Postgres (BE-owned).

3. **Progress stream** — live job progress.
   - Stream key: `job-progress-stream`; consumer group: `system-service-group`.
   - Producer: worker `progress_publisher.py` `XADD`s `{job_id, stage, percent}`.
   - Consumer: BE `JobProgressStreamConsumer` (`Services/GapAnalysisStreamConsumer.cs`) `XREADGROUP`s, updates `Jobs.Stage`/`Progress` (only while `Status == "processing"`), pushes `job_status_update` over SignalR, ACKs each entry, and reclaims entries idle > 2 min every 30 s.

## Connect & debug

```sh
docker exec -it workx-redis redis-cli            # shell into the container
docker exec -it workx-redis redis-cli monitor   # watch live traffic
redis-cli -p 6379                                # from the host

# Queue
LLEN celery
LRANGE celery 0 -1            # inspect queued Kombu messages
# Stream
XLEN job-progress-stream
XINFO STREAM job-progress-stream
XINFO GROUPS job-progress-stream
# Misc
KEYS '*'                      # see everything (celery task ids, acks, ...)
DEL celery                    # wipe the queue to clear stuck jobs
```

## Config keys (all defaults must stay in sync between BE and worker)

| Side | Key | Default |
|---|---|---|
| BE (docker) | `Redis__Configuration` | `redis:6379,abortConnect=false` |
| BE | `Redis__CeleryTask` | `worker.tasks.process_job` |
| BE | `Redis__CeleryQueue` | `celery` |
| BE | `Redis__ProgressStreamName` | `job-progress-stream` |
| BE | `Redis__ProgressConsumerGroup` | `system-service-group` |
| Worker | `REDIS_URL` | `redis://redis:6379/0` |
| Worker | `CELERY_TASK` / `CELERY_QUEUE` | `worker.tasks.process_job` / `celery` |

- In-container hostname is `redis`; from the host use `localhost:6379` (BE's `appsettings.Development.json` uses `localhost`).
- BE holds a single shared `IConnectionMultiplexer` with `abortConnect=false` — BE starts even if Redis is down, so Redis-related failures show up as logged exceptions, not startup crashes.

## Common failure modes

- **Job stuck `queued`**: task name mismatch — Celery logs `Received unregistered task of type 'worker.tasks.process_job'`. Check `Redis__CeleryTask` == `CELERY_TASK` == `worker.tasks.process_job`, and that the worker is actually up (`docker compose ps` / `celery -A celery_app inspect ping`).
- **Job stuck `processing`**: no progress entries are reaching the consumer (stream name/group mismatch, or the consumer died). `XINFO GROUPS` shows pending entries; the 2-min reclaim should recover them, otherwise `DEL job-progress-stream` after the job is resolved.
- **Messages stuck in the `celery` list but no consumer**: check the worker healthcheck (`celery inspect ping`) and that `REDIS_URL` resolves to the same instance as `Redis__Configuration`.
