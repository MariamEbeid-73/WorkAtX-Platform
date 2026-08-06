import os
import requests

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://workx-be:5000")
SERVICE_TOKEN = os.getenv("SERVICE_TOKEN", "dev-service-token")

HEADERS = {
    "X-Service-Token": SERVICE_TOKEN,
    "Content-Type": "application/json"
}


def get_job_details(job_id:str)->dict:
    response = requests.get(f"{BACKEND_BASE_URL}/api/internal/ai/jobs/{job_id}", headers=HEADERS)
    response.raise_for_status()
    return response.json()   

def get_resume_download_url(resume_file_id: str) -> str:
    response = requests.get(f"{BACKEND_BASE_URL}/api/internal/ai/resume/{resume_file_id}/download-url", headers=HEADERS)
    response.raise_for_status()
    return response.json().get("url")

def update_job_status(job_id: str, status: str) -> dict:
    payload = {"status": status}
    response = requests.post(f"{BACKEND_BASE_URL}/api/internal/ai/jobs/{job_id}/status", json=payload, headers=HEADERS)
    response.raise_for_status()
    return response.json()

def submit_job_result(job_id: str, status: str, result_json: str = None, error: str = None) -> dict:
    payload = {"status": status}
    if result_json:
        payload["resultJson"] = result_json
    if error:
        payload["error"] = error
    response = requests.post(f"{BACKEND_BASE_URL}/api/internal/ai/jobs/{job_id}/result", json=payload, headers=HEADERS)
    response.raise_for_status()
    return response.json()


def submit_profile_scores(user_id: str, scores_data: dict):
    url = f"{BACKEND_BASE_URL}/api/internal/ai/profile-scores/{user_id}"
    resp = requests.post(url, json=scores_data, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    return resp.json()