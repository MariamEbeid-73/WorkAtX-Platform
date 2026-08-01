import logging
import json
from app import backend_client, ai_client
from app.exceptions import MalformedAIResponseError
from progress_publisher import publish_progress
from tasks.gap_analysis_job import handle_gap_analysis

logger = logging.getLogger(__name__)
TIMEOUT_CHAT = 10

def handle_chat(task, job_id: str, job_data: dict):
    payload = job_data.get("payload", {})
    user_id = payload.get("userId")
    message = payload.get("message")

    ai_response = ai_client.call_chat_api(user_id=user_id, message=message, timeout=TIMEOUT_CHAT)

    if not isinstance(ai_response, dict):
        raise MalformedAIResponseError(f"Chat response was not a JSON object: {ai_response!r}")

    is_escalated = ai_response.get("needs_gap_analysis", False)

    if not is_escalated:
        reply_json = json.dumps({"reply": ai_response.get("reply", "")})
        backend_client.submit_job_result(job_id=job_id, status="completed", result_json=reply_json)
        return {"jobId": job_id, "status": "completed"}

    else:
        logger.info(f"[Chat Handler] Job jobId={job_id} ESCALATED to Gap Analysis")

        backend_client.update_job_status(job_id=job_id, status="processing", job_type="gap_analysis")

        publish_progress(job_id=job_id, stage="escalated_to_gap_analysis", percent=0)

        job_data["jobType"] = "gap_analysis"
        job_data["target_role"] = ai_response.get("extracted_target_role") or message
        return handle_gap_analysis(task, job_id, job_data)