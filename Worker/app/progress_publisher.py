# Publishes job progress events to a Redis Stream so the backend can
# push real-time updates to connected WebSocket clients.
#
# This module owns writing to the stream only — it does not know or
# care who reads from it. The .NET backend is responsible for XREAD-ing
# this stream and forwarding events over WebSocket; that consumer does
# not live in this repo.
import os
import time
import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
STREAM_NAME = os.getenv("PROGRESS_STREAM_NAME", "job-progress")

# Cap the stream's length so it doesn't grow unbounded — old events are
# trimmed automatically. Approximate trimming (the "~") is cheaper for
# Redis than exact trimming and is fine for a progress feed.
_MAXLEN = 10_000


class ProgressPublisher:
    def __init__(self):
        self._client = redis.Redis.from_url(REDIS_URL, decode_responses=True)

    def publish(self, job_id: str, stage: str) -> None:
        """
        Publish one progress event for a job.

        stage: a short machine-readable label, e.g. "processing",
        "completed", "failed", "needs_clarification". Keep this list in
        sync with whatever the .NET consumer expects to branch on.
        """
        try:
            self._client.xadd(
                STREAM_NAME,
                {
                    "jobId": job_id,
                    "stage": stage,
                    "timestamp": str(time.time()),
                },
                maxlen=_MAXLEN,
                approximate=True,
            )
        except Exception as exc:
            # Progress reporting is best-effort — never let a Redis Stream
            # hiccup fail the actual job. The Postgres write in db.py is
            # still the source of truth; this is a nice-to-have on top.
            print(f"[progress_publisher] failed to publish for {job_id}: {exc}")