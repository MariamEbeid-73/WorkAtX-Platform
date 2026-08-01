import time
import json
import logging

from app import backend_client, ai_client
from app.exceptions import MalformedAIResponseError
from progress_publisher import publish_progress

logger = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS = 3       
TIMEOUT_GAP_ANALYSIS = 60

def handle_gap_analysis(task, job_id: str, job_data: dict):
    payload = job_data.get("payload", {})
    user_id = payload.get("userId")

    user_context = backend_client.get_user_context(user_id)

    publish_progress(job_id=job_id, stage="checking", percent=25)

    start_time = time.monotonic()
    response = ai_client.call_gap_analysis_api(
        user_id=user_id,
        user_context=user_context,
        job_payload=job_data,
        timeout=TIMEOUT_GAP_ANALYSIS
    )

    if not isinstance(response, dict):
        raise MalformedAIResponseError(f"Gap analysis response was not a JSON object: {response!r}")

    if "ai_job_id" in response:
      
        logger.info(f"[Gap Analysis Handler] [JobId={job_id}] AI reported async job "
                    f"ai_job_id={response['ai_job_id']} — switching to polling mode")
        analysis_result = _poll_until_done(job_id=job_id, ai_job_id=response["ai_job_id"], start_time=start_time)
    else:
   
        if "summary" not in response:
            raise MalformedAIResponseError(
                f"Sync gap analysis response missing 'summary' and has no 'ai_job_id': {response!r}"
            )
        logger.info(f"[Gap Analysis Handler] [JobId={job_id}] AI returned a synchronous result — "
                    f"no real intermediate stages available to poll")
        analysis_result = response
        publish_progress(job_id=job_id, stage="forming_plan", percent=60)
        publish_progress(job_id=job_id, stage="optimizing", percent=85)

    if not isinstance(analysis_result, dict) or "summary" not in analysis_result:
        raise MalformedAIResponseError(f"Gap analysis result missing expected fields: {analysis_result!r}")

    result_json = json.dumps(analysis_result)
    backend_client.submit_job_result(job_id=job_id, status="completed", result_json=result_json)

    publish_progress(job_id=job_id, stage="completed", percent=100)
    return {"jobId": job_id, "status": "completed"}


def _poll_until_done(job_id: str, ai_job_id: str, start_time: float) -> dict:
    """
    Polls the AI service's own gap-analysis status endpoint and republishes
    each real stage/percent it reports, until it signals completion or failure.

    Raises on timeout, malformed status payloads, or an AI-reported failure so
    process_job's retry/dead-letter logic takes over — this never fabricates
    a result to paper over a bad or slow AI response.
    """
    last_stage = None

    while True:
        elapsed = time.monotonic() - start_time
        if elapsed > TIMEOUT_GAP_ANALYSIS:
            raise TimeoutError(
                f"Gap analysis for job {job_id} (ai_job_id={ai_job_id}) "
                f"exceeded {TIMEOUT_GAP_ANALYSIS}s without completing"
            )

        status = ai_client.poll_gap_analysis_status(ai_job_id)

        if not isinstance(status, dict) or "status" not in status:
            raise MalformedAIResponseError(f"Gap analysis status poll returned unexpected shape: {status!r}")

        stage = status.get("stage")
        percent = status.get("percent")
        if stage and stage != last_stage:
            publish_progress(job_id=job_id, stage=stage, percent=percent if percent is not None else 0)
            last_stage = stage

        if status["status"] == "completed":
            result = status.get("result")
            if not isinstance(result, dict):
                raise MalformedAIResponseError(
                    "Gap analysis status reported 'completed' but included no result payload"
                )
            return result

        if status["status"] == "failed":
            raise RuntimeError(f"AI service reported gap analysis failure: {status.get('error', 'unknown error')}")

        time.sleep(POLL_INTERVAL_SECONDS)