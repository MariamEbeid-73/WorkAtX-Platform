import os
import time
import logging
import requests

logger = logging.getLogger(__name__)

AI_SERVICE_BASE_URL = os.getenv("AI_SERVICE_BASE_URL", "http://ai-service:8000")



def _mock_ai_enabled() -> bool:
    return os.getenv("MOCK_AI", "true").lower() == "true"


def _mock_async_gap_enabled() -> bool:
    return os.getenv("MOCK_AI_ASYNC_GAP", "false").lower() == "true"


_mock_gap_progress: dict = {}


def call_chat_api(user_id: str, message: str, timeout: int = 10) -> dict:
    if _mock_ai_enabled():
        logger.info(f"[AI Client - MOCK] Simulating Chat API response for user={user_id}")
        needs_escalation = "senior" in message.lower() or "gap" in message.lower() or "lead" in message.lower()
        return {
            "reply": "Here is a quick chat response about your career progression.",
            "needs_gap_analysis": needs_escalation,
            "extracted_target_role": "Senior .NET Developer" if needs_escalation else None
        }

    url = f"{AI_SERVICE_BASE_URL}/api/v1/ai/chat"
    payload = {"user_id": user_id, "message": message}

    logger.info(f"[AI Client] Calling Chat API at {url}")
    response = requests.post(url, json=payload, timeout=timeout)
    response.raise_for_status()
    return response.json()


def call_gap_analysis_api(user_id: str, user_context: dict, job_payload: dict, timeout: int = 90) -> dict:

    if _mock_ai_enabled():
        if _mock_async_gap_enabled():
            mock_ai_job_id = f"mock-gap-{user_id}"
            _mock_gap_progress[mock_ai_job_id] = 0
            logger.info(f"[AI Client - MOCK] Starting ASYNC Gap Analysis job for user={user_id}")
            return {"ai_job_id": mock_ai_job_id}

        logger.info(f"[AI Client - MOCK] Simulating SYNC Gap Analysis API response for user={user_id}")
        return {
            "summary": "Gap Analysis Complete",
            "missing_skills": [
                {"name": "System Architecture", "importance": "High"},
                {"name": "Docker & Kubernetes", "importance": "Medium"}
            ],
            "recommendations": [
                "Build end-to-end microservices with Docker Compose",
                "Learn Clean Architecture and Repository Patterns"
            ]
        }

    url = f"{AI_SERVICE_BASE_URL}/api/v1/ai/analyze-gap"
    payload = {
        "user_id": user_id,
        "context": user_context,
        "target_role": job_payload.get("target_role") or job_payload.get("payload", {}).get("message")
    }

    logger.info(f"[AI Client] Calling Gap Analysis API at {url}")
    response = requests.post(url, json=payload, timeout=timeout)
    response.raise_for_status()
    return response.json()


def poll_gap_analysis_status(ai_job_id: str, timeout: int = 10) -> dict:
    if _mock_ai_enabled():
        stages = [
            ("checking", 25),
            ("forming_plan", 60),
            ("optimizing", 85),
        ]
        step = _mock_gap_progress.get(ai_job_id, 0)
        time.sleep(0.05)  

        if step >= len(stages):
            return {
                "status": "completed",
                "stage": "completed",
                "percent": 100,
                "result": {
                    "summary": "Gap Analysis Complete (async mock)",
                    "missing_skills": [{"name": "System Architecture", "importance": "High"}],
                    "recommendations": ["Build end-to-end microservices with Docker Compose"],
                },
            }

        stage, percent = stages[step]
        _mock_gap_progress[ai_job_id] = step + 1
        return {"status": "processing", "stage": stage, "percent": percent}

    url = f"{AI_SERVICE_BASE_URL}/api/v1/ai/analyze-gap/{ai_job_id}/status"
    response = requests.get(url, timeout=timeout)
    response.raise_for_status()
    return response.json()


def call_analysis_1_api(cv_bytes: bytes, github_url: str = None, linkedin_url: str = None, timeout: int = 60) -> dict:
    if _mock_ai_enabled():
        logger.info("[AI Client - MOCK] Simulating CV Parse API response")
        return {
            "name": "Parsed Candidate",
            "email": "candidate@workx.local",
            "extracted_skills": ["C#", "ASP.NET Core", "PostgreSQL", "Docker", "Celery"],
            "github_verified": bool(github_url),
            "linkedin_verified": bool(linkedin_url)
        }

    url = f"{AI_SERVICE_BASE_URL}/api/v1/ai/parse-cv"
    valid_linkedin = linkedin_url if (linkedin_url and linkedin_url.startswith("http")) else None
    valid_github = github_url if (github_url and github_url.startswith("http")) else None

    files = {"file": ("cv.pdf", cv_bytes, "application/pdf")}
    data = {}
    if valid_github:
        data["github_url"] = valid_github
    if valid_linkedin:
        data["linkedin_url"] = valid_linkedin

    logger.info(f"[AI Client] Calling Parse CV API at {url}")
    response = requests.post(url, files=files, data=data, timeout=timeout)
    response.raise_for_status()
    return response.json()