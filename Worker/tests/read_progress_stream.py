# Manual check: confirms progress events are actually landing in Redis.
# Run this *after* send_test_job.py to see the events that job produced.
#
# Usage: python -m tests.read_progress_stream
import os
import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
STREAM_NAME = os.getenv("PROGRESS_STREAM_NAME", "job-progress")

client = redis.Redis.from_url(REDIS_URL, decode_responses=True)

# "-" to "+" reads the entire stream from oldest to newest entry.
entries = client.xrange(STREAM_NAME, min="-", max="+")

if not entries:
    print(f"No entries found in stream '{STREAM_NAME}'. "
          f"Did you run send_test_job.py first, and is REDIS_URL correct?")
else:
    for entry_id, fields in entries:
        print(f"{entry_id}  {fields}")