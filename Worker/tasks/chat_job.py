import json
import logging
import time
from app import backend_client, ai_client
from app.exceptions import MalformedAIResponseError
from progress_publisher import publish_progress

logger = logging.getLogger(__name__)


def handle_chat(task, job_id: str, job_data: dict):
    payload = job_data.get("payload", {})
    user_id = payload.get("userId")
    session_id = payload.get("sessionId")
    context_summary = payload.get("contextSummary")

    message = payload.get("message")

    message_preview = (message[:200] + "...") if message and len(message) > 200 else message
    logger.info(
        f"[Chat Handler] [JobId={job_id}] Starting chat job for user={user_id}, "
        f"session={session_id}, message_preview={message_preview!r}"
    )

    publish_progress(job_id=job_id, stage="Thinking", percent=10)

    start = time.perf_counter()
    response = ai_client.call_process_api(
        user_id=user_id,
        job_id=job_id,
        session_id=session_id,
        message=message,
        context_summary=context_summary,
    )
    duration_s = time.perf_counter() - start

    if not isinstance(response, dict) or "responseType" not in response:
        raise MalformedAIResponseError(f"Process response missing responseType: {response!r}")

    if response.get("responseType") == "study_plan":
        plan = response.get("response")
        if not isinstance(plan, dict) or not isinstance(plan.get("weeks"), list) or not plan["weeks"]:
            raise MalformedAIResponseError(
                f"Study-plan response requires a non-empty response.weeks array: {response!r}"
            )

    publish_progress(job_id=job_id, stage="Formatting response", percent=95)

    result_json = json.dumps(response)
    backend_client.submit_job_result(job_id=job_id, status="completed", result_json=result_json)

    logger.info(
        f"[Chat Handler] [JobId={job_id}] Completed responseType={response.get('responseType')} "
        f"in {duration_s:.2f}s"
    )
    return {"jobId": job_id, "status": "completed"}
