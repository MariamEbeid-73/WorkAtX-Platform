import json
import logging
from app import backend_client, ai_client
from app.exceptions import MalformedAIResponseError
from progress_publisher import publish_progress

logger = logging.getLogger(__name__)

def handle_chat(task, job_id: str, job_data: dict):
    payload = job_data.get("payload", {})
    user_id = payload.get("userId")
    session_id = payload.get("sessionId")
    message = payload.get("message")
    context_summary = payload.get("contextSummary")
    resume_from_job_id = payload.get("resumeFromJobId")
    selections = payload.get("selections")

    if resume_from_job_id is None and message is None:
        # Every chat job is either a normal message or a tech-choices resume
        # (ChatSessionController.SubmitTechChoices sends resumeFromJobId +
        # selections with no message). Neither present means the payload
        # is malformed — fail loudly here instead of passing message=None
        # down into ai_client, where it used to crash on message.lower().
        raise ValueError(
            f"Chat job {job_id} payload has neither 'message' nor "
            f"'resumeFromJobId': {payload!r}"
        )

    # Add initial progress tick
    publish_progress(job_id=job_id, stage="Thinking", percent=10)

    response = ai_client.call_process_api(
        user_id=user_id,
        job_id=job_id,
        session_id=session_id,
        message=message,
        context_summary=context_summary,
        resume_from_job_id=resume_from_job_id,
        selections=selections,
    )

    # Keep original strict validation
    if not isinstance(response, dict) or "responseType" not in response:
        raise MalformedAIResponseError(f"Process response missing responseType: {response!r}")

    # Add mid-way progress tick
    publish_progress(job_id=job_id, stage="Formatting response", percent=75)

    result_json = json.dumps(response)
    backend_client.submit_job_result(job_id=job_id, status="completed", result_json=result_json)

    # Add final progress tick
    publish_progress(job_id=job_id, stage="completed", percent=100)
    return {"jobId": job_id, "status": "completed"}