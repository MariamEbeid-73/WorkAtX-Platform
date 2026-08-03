import json
import logging
from app import backend_client, ai_client
from app.exceptions import MalformedAIResponseError

logger = logging.getLogger(__name__)

def handle_chat(task, job_id: str, job_data: dict):
    payload = job_data.get("payload", {})
    user_id = payload.get("userId")
    message = payload.get("message")

    response = ai_client.call_process_api(user_id=user_id, job_id=job_id, message=message)

    if not isinstance(response, dict) or "response_type" not in response:
        raise MalformedAIResponseError(f"Process response missing response_type: {response!r}")

    result_json = json.dumps(response)
    backend_client.submit_job_result(job_id=job_id, status="completed", result_json=result_json)
    return {"jobId": job_id, "status": "completed"}