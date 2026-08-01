import os
import redis

# Use container name 'redis' by default when inside docker, or 'localhost' locally
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# FIXED: Default stream key aligned with progress_publisher.py
STREAM_NAME = os.getenv("PROGRESS_STREAM_NAME", "job-progress-stream")

def read_stream():
    """
    Diagnostic tool to verify real-time job progress events in Redis Stream.
    Reads from oldest to newest entry.
    """
    try:
        client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
        # "-" to "+" reads the entire stream history
        entries = client.xrange(STREAM_NAME, min="-", max="+")

        if not entries:
            print(f" No entries found in stream '{STREAM_NAME}'.")
            print(f" Ensure job tasks have executed and REDIS_URL ({REDIS_URL}) is correct.")
        else:
            print(f" Found {len(entries)} progress event(s) in '{STREAM_NAME}':")
            print("-" * 60)
            for entry_id, fields in entries:
                job_id = fields.get("job_id", "N/A")
                stage = fields.get("stage", "N/A")
                percent = fields.get("percent", "0")
                print(f"[{entry_id}] JobId: {job_id} | Stage: {stage:<25} | Progress: {percent}%")
            print("-" * 60)

    except Exception as e:
        print(f" Error connecting to Redis at {REDIS_URL}: {e}")

if __name__ == "__main__":
    read_stream()