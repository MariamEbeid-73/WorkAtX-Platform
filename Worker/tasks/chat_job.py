import json
import logging
from app import backend_client, ai_client
from app.exceptions import MalformedAIResponseError
from progress_publisher import publish_progress

logger = logging.getLogger(__name__)


def _synthesize_resume_message(selections: dict) -> str:
    """ChatSessionController.SubmitTechChoices (BE) creates a resume job with
    {resumeFromJobId, selections} and NO message — selections is a flat
    {category: chosenOption} dict the frontend already resolved (see
    FE/src/types/chat.ts TechChoiceSelections), so there is nothing to parse,
    only something to say. The AI service's node 1 classifies free text and
    matches option words by token overlap (app/graph/nodes/n1/select.py
    resolve_tech_choices) — echoing the exact chosen strings back as a
    sentence gives it that, and also gives the classifier a legible
    SELECT_TRACK-shaped message instead of an empty one.

    KNOWN GAP: this does not carry which job/track the original analysis
    resolved to (resumeFromJobId is the job id, not a role_id/track_id), so
    if that gap analysis covered more than one job, node 1 may re-ask which
    one instead of assuming — a safe degradation (one extra clarifying turn),
    not a wrong answer, but worth fixing by threading resumeFromJobId's
    stored track selection through if this turns out to happen often.
    """
    if not selections:
        return "Yes, build the study plan."
    picks = ", ".join(f"{value} for {key}" for key, value in selections.items())
    return f"I'll go with: {picks}."


def handle_chat(task, job_id: str, job_data: dict):
    payload = job_data.get("payload", {})
    user_id = payload.get("userId")
    session_id = payload.get("sessionId")
    context_summary = payload.get("contextSummary")

    message = payload.get("message")
    if not message and "selections" in payload:
        # The tech-choices resume path (BE ChatSessionController.SubmitTechChoices)
        # — see _synthesize_resume_message for why this is necessary at all.
        message = _synthesize_resume_message(payload.get("selections") or {})
        logger.info(f"[Chat Handler] [JobId={job_id}] resume job with no message; synthesized: {message!r}")

    # Add initial progress tick
    publish_progress(job_id=job_id, stage="Thinking", percent=10)

    response = ai_client.call_process_api(
        user_id=user_id,
        job_id=job_id,
        session_id=session_id,
        message=message,
        context_summary=context_summary,
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