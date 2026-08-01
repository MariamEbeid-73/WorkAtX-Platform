import os
import logging
import redis

logger = logging.getLogger(__name__)

# Read Redis URL from Docker environment variables
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# Initialize Redis client for Redis Stream publishing (XADD)
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)

STREAM_KEY = "job-progress-stream"


def publish_progress(job_id: str, stage: str, percent: int):
    """
    Publishes job progress events to Redis Stream for Task D (WebSocket Consumer).
    """
    try:
        redis_client.xadd(
            STREAM_KEY,
            {
                "job_id": str(job_id),
                "stage": str(stage),
                "percent": str(percent),
            }
        )
        logger.info(f"[Progress Publisher] Published stage '{stage}' ({percent}%) for job_id={job_id}")
    except Exception as e:
        logger.error(f"[Progress Publisher] Failed to publish stream event for job_id={job_id}: {e}")