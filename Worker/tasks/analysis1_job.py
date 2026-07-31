import logging
import json
import requests
from app import backend_client, ai_client
from app.exceptions import MalformedAIResponseError
logger = logging.getLogger(__name__)
TIMEOUT_ANALYSIS_1 = 60

def handle_analysis_1(task, job_id: str, job_data: dict):
    logger.info(f"[Analysis 1 Handler] [JobId={job_id}] Starting CV parsing & profile extraction")
    payload = job_data.get("payload", {})
    resume_file_id = payload.get("resumeFileId")
    github_url = payload.get("githubUrl")
    linkedin_url = payload.get("linkedinUrl")

    download_url = backend_client.get_resume_download_url(resume_file_id)

    cv_res = requests.get(download_url, timeout=30)
    cv_res.raise_for_status()
    cv_bytes = cv_res.content

    parsed_profile = ai_client.call_analysis_1_api(
        cv_bytes=cv_bytes,
        github_url=github_url,
        linkedin_url=linkedin_url,
        timeout=TIMEOUT_ANALYSIS_1
    )

    if not isinstance(parsed_profile, dict) or not parsed_profile:
        raise MalformedAIResponseError(f"CV parse response was not a usable JSON object: {parsed_profile!r}")

    user_id = payload.get("userId")
    if user_id:
        backend_client.save_analysis1_profile(user_id=user_id, profile_json=parsed_profile)
    else:
        logger.warning(f"[Analysis 1 Handler] [JobId={job_id}] No userId in payload — profile not saved to UserAnalyses")

    result_json = json.dumps(parsed_profile)
    backend_client.submit_job_result(job_id=job_id, status="completed", result_json=result_json)

    logger.info(f"[Analysis 1 Handler] [JobId={job_id}] Successfully completed and persisted result")
    return {"jobId": job_id, "status": "completed"}