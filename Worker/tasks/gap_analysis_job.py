import logging
import json
from app import backend_client, ai_client
from app.exceptions import MalformedAIResponseError
from progress_publisher import publish_progress

logger = logging.getLogger(__name__)
TIMEOUT_GAP_ANALYSIS = 90


def handle_gap_analysis(task, job_id: str, job_data: dict):
    payload = job_data.get("payload", {})
    user_id = payload.get("userId")

    user_context = backend_client.get_user_context(user_id)

    publish_progress(job_id=job_id, stage="checking", percent=25)

    analysis_result = ai_client.call_gap_analysis_api(
        user_id=user_id,
        user_context=user_context,
        job_payload=job_data,
        timeout=TIMEOUT_GAP_ANALYSIS
    )

    if not isinstance(analysis_result, dict) or ("ai_job_id" not in analysis_result and "summary" not in analysis_result):
        raise MalformedAIResponseError(f"Gap Analysis response was malformed or missing key fields: {analysis_result!r}")

    publish_progress(job_id=job_id, stage="forming_plan", percent=60)

    publish_progress(job_id=job_id, stage="optimizing", percent=85)

    result_json = json.dumps(analysis_result)
    backend_client.submit_job_result(job_id=job_id, status="completed", result_json=result_json)

    publish_progress(job_id=job_id, stage="completed", percent=100)
    return {"jobId": job_id, "status": "completed"}