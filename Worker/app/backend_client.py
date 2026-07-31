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

def update_job_status(job_id: str, status: str, job_type: str = None) -> dict:
    payload = {"status": status}
    if job_type:
        payload["jobType"] = job_type  
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

def get_user_context(user_id: str) -> dict:
    response = requests.get(f"{BACKEND_BASE_URL}/api/internal/ai/context/{user_id}", headers=HEADERS)
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return response.json()

def save_analysis1_profile(user_id: str, profile_json: dict) -> dict:
    response = requests.post(
        f"{BACKEND_BASE_URL}/api/internal/ai/context/{user_id}",
        json={"profile": profile_json},
        headers=HEADERS
    )
    response.raise_for_status()
    return response.json()