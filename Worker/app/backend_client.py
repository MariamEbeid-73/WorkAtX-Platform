import os
import logging
import requests

logger = logging.getLogger(__name__)

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://workx-be:5000")
SERVICE_TOKEN = os.getenv("SERVICE_AUTH_TOKEN", "dev-service-token")

HEADERS = {
    "X-Service-Token": SERVICE_TOKEN,
    "Content-Type": "application/json"
}


def get_job_details(job_id:str)->dict:
    url = f"{BACKEND_BASE_URL}/api/internal/ai/jobs/{job_id}"
    logger.info(f"[Backend Client] [JobId={job_id}] GET {url}")
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"[Backend Client] [JobId={job_id}] GET {url} failed: {e}")
        raise
    logger.info(f"[Backend Client] [JobId={job_id}] GET {url} -> {response.status_code}")
    return response.json()

def get_resume_download_url(resume_file_id: str) -> str:
    url = f"{BACKEND_BASE_URL}/api/internal/ai/resume/{resume_file_id}/download-url"
    logger.info(f"[Backend Client] [ResumeFileId={resume_file_id}] GET {url}")
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"[Backend Client] [ResumeFileId={resume_file_id}] GET {url} failed: {e}")
        raise
    logger.info(f"[Backend Client] [ResumeFileId={resume_file_id}] GET {url} -> {response.status_code}")
    return response.json().get("url")

def update_job_status(job_id: str, status: str) -> dict:
    payload = {"status": status}
    url = f"{BACKEND_BASE_URL}/api/internal/ai/jobs/{job_id}/status"
    logger.info(f"[Backend Client] [JobId={job_id}] POST {url} status={status}")
    try:
        response = requests.post(url, json=payload, headers=HEADERS, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"[Backend Client] [JobId={job_id}] POST {url} failed: {e}")
        raise
    logger.info(f"[Backend Client] [JobId={job_id}] POST {url} -> {response.status_code}")
    return response.json()

def submit_job_result(job_id: str, status: str, result_json: str = None, error: str = None) -> dict:
    payload = {"status": status}
    if result_json:
        payload["resultJson"] = result_json
    if error:
        payload["error"] = error
    url = f"{BACKEND_BASE_URL}/api/internal/ai/jobs/{job_id}/result"
    logger.info(f"[Backend Client] [JobId={job_id}] POST {url} status={status}")
    try:
        response = requests.post(url, json=payload, headers=HEADERS, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"[Backend Client] [JobId={job_id}] POST {url} failed: {e}")
        raise
    logger.info(f"[Backend Client] [JobId={job_id}] POST {url} -> {response.status_code}")
    return response.json()


def submit_profile_scores(user_id: str, scores_data: dict):
    url = f"{BACKEND_BASE_URL}/api/internal/ai/profile-scores/{user_id}"
    logger.info(f"[Backend Client] [UserId={user_id}] POST {url}")
    try:
        resp = requests.post(url, json=scores_data, headers=HEADERS, timeout=10)
        resp.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"[Backend Client] [UserId={user_id}] POST {url} failed: {e}")
        raise
    logger.info(f"[Backend Client] [UserId={user_id}] POST {url} -> {resp.status_code}")
    return resp.json()
