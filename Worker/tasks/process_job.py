import logging
import requests
from celery_app import app
from app import backend_client
from tasks.chat_job import handle_chat
from tasks.analysis1_job import handle_analysis_1
from progress_publisher import publish_progress

logger = logging.getLogger(__name__)

JOB_TYPE_CHAT = "chat"
JOB_TYPE_ANALYSIS_1 = "analysis1"

STATUS_PROCESSING = "processing"
STATUS_FAILED = "failed"


@app.task(
    name="worker.tasks.process_job",
    bind=True,
    max_retries=3,
    # Must exceed ai_client's own timeout (300s, see app/ai_client.py) or
    # Celery kills the task mid-request before the AI service's own HTTP
    # client even times out — a cold gap-analysis scrape routinely takes
    # several minutes end to end.
    soft_time_limit=330,
    time_limit=360
)
def process_job(self, jobId: str = None, **kwargs):
    return _process_job_impl(self, jobId=jobId, **kwargs)


def _process_job_impl(self, jobId: str = None, **kwargs):
    job_id = jobId or kwargs.get("jobId") or kwargs.get("job_id")
    
    if not job_id:
        logger.error("[Job Dispatcher] Received task without a valid jobId payload!")
        return {"status": STATUS_FAILED, "error": "Missing jobId"}

    logger.info(f"[Job Dispatcher] [JobId={job_id}] Processing attempt {self.request.retries + 1}/{self.max_retries + 1}")

    try:
        job_data = backend_client.get_job_details(job_id)
        job_type = job_data.get("jobType")
        
        backend_client.update_job_status(job_id=job_id, status=STATUS_PROCESSING)

        if job_type == JOB_TYPE_CHAT:
            return handle_chat(self, job_id, job_data)
        elif job_type == JOB_TYPE_ANALYSIS_1:
            return handle_analysis_1(self, job_id, job_data)
        else:
            raise NotImplementedError(f"Unsupported jobType: '{job_type}'")

    except requests.exceptions.HTTPError as http_err:
        status_code = http_err.response.status_code if http_err.response is not None else 500
        
        if 400 <= status_code < 500:
            logger.error(f"[Job Dispatcher] [JobId={job_id}] Fatal HTTP {status_code} state error: {http_err}")
            _safe_submit_failed_status(job_id, str(http_err))
            return {"jobId": job_id, "status": STATUS_FAILED, "error": str(http_err)}

        return _handle_retry(self, http_err, job_id)

    except NotImplementedError as e:
        logger.error(f"[Job Dispatcher] [JobId={job_id}] Fatal unrecoverable error: {e}")
        _safe_submit_failed_status(job_id, str(e))
        return {"jobId": job_id, "status": STATUS_FAILED, "error": str(e)}

    except Exception as exc:
        return _handle_retry(self, exc, job_id)


def _handle_retry(task_obj, exc, job_id: str):
    retry_delay = 5 * (2 ** task_obj.request.retries)
    if task_obj.request.retries >= task_obj.max_retries:
        logger.error(f"[DEAD LETTER] [JobId={job_id}] Retries exhausted. Marking job failed: {exc}")
        _safe_submit_failed_status(job_id, str(exc))
        raise exc
    else:
        logger.warning(f"[Job Dispatcher] [JobId={job_id}] Retrying in {retry_delay}s due to transient error: {exc}")
        raise task_obj.retry(exc=exc, countdown=retry_delay)


def _safe_submit_failed_status(job_id: str, error_msg: str):
    try:
        publish_progress(job_id=job_id, stage="failed", percent=100)
    except Exception as e:
        logger.warning(f"[Process Job] Failed to publish stream failure event for {job_id}: {e}")

    try:
        backend_client.submit_job_result(job_id=job_id, status=STATUS_FAILED, error=error_msg)
    except Exception as e:
        logger.error(f"[Process Job] Failed to submit terminal failure status for {job_id}: {e}")