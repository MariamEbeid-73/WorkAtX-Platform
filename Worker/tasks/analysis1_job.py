import logging
import json
import requests
from app import backend_client, ai_client
from app.exceptions import MalformedAIResponseError
from progress_publisher import publish_progress

logger = logging.getLogger(__name__)
# CV parsing runs gemini-2.5-pro (resume + profile fusion) plus live GitHub/
# LinkedIn scraping — 60s was tight enough to time out on a slow profile.
TIMEOUT_ANALYSIS_1 = 120


def handle_analysis_1(task, job_id: str, job_data: dict):
    logger.info(f"[Analysis 1 Handler] [JobId={job_id}] Starting CV parsing & profile extraction")
    payload = job_data.get("payload", {})
    resume_file_id = payload.get("resumeFileId")
    github_url = payload.get("githubUrl")
    linkedin_url = payload.get("linkedinUrl")
    user_id = payload.get("userId")

    publish_progress(job_id=job_id, stage="Downloading resume", percent=10)
    download_url = backend_client.get_resume_download_url(resume_file_id)

    cv_res = requests.get(download_url, timeout=30)
    cv_res.raise_for_status()
    cv_bytes = cv_res.content

    publish_progress(job_id=job_id, stage="Scanning GitHub & LinkedIn", percent=25)
    formatted_linkedin = ai_client.format_linkedin_url(linkedin_url)

    publish_progress(job_id=job_id, stage="Analyzing profile with AI", percent=50)
    parsed_profile = ai_client.call_analysis_1_api(
        cv_bytes=cv_bytes,
        github_url=github_url,
        linkedin_url=formatted_linkedin,
        timeout=TIMEOUT_ANALYSIS_1
    )

    if not isinstance(parsed_profile, dict) or not parsed_profile:
        raise MalformedAIResponseError(f"CV parse response was not a usable JSON object: {parsed_profile!r}")

    publish_progress(job_id=job_id, stage="Calculating score breakdown", percent=75)

    scores = parsed_profile.get("scoreBreakdown")
    if user_id and scores:
        try:
            backend_client.submit_profile_scores(user_id=user_id, scores_data=scores)
        except Exception as e:
            logger.warning(f"[Analysis 1 Handler] [JobId={job_id}] Could not submit profile scores: {e}")

    publish_progress(job_id=job_id, stage="Finalizing results", percent=90)
    if "profileAnalysis" in parsed_profile:
        result_payload = parsed_profile
    else:
        result_payload = {"profileAnalysis": parsed_profile}
    result_json = json.dumps(result_payload)
    backend_client.submit_job_result(job_id=job_id, status="completed", result_json=result_json)

    logger.info(f"[Analysis 1 Handler] [JobId={job_id}] Successfully completed and persisted result")
    return {"jobId": job_id, "status": "completed"}
