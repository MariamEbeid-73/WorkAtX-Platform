import os
import time
import logging
import requests
from progress_publisher import publish_progress

logger = logging.getLogger(__name__)

AI_SERVICE_BASE_URL = os.getenv("AI_SERVICE_BASE_URL", "http://host.docker.internal:8000")


def _mock_ai_enabled() -> bool:
    return os.getenv("MOCK_AI", "true").lower() == "true"


def call_process_api(
    user_id: str,
    job_id: str,
    session_id: str = None,
    message: str = None,
    context_summary: str = None,
    timeout: int = 90,
) -> dict:
    if _mock_ai_enabled():
        logger.info(f"[AI Client - MOCK] Simulating process API response for user={user_id}, job={job_id}, session={session_id}")

        if "gap" in message.lower() or "senior" in message.lower():
            return {
                "responseType": "gap_analysis",
                "summary": "Mock Gap Analysis Complete",
                "missing_skills": [
                    {"name": "System Architecture", "importance": "High"},
                    {"name": "Docker & Kubernetes", "importance": "Medium"}
                ],
                "recommendations": [
                    "Build end-to-end microservices with Docker Compose",
                    "Learn Clean Architecture and Repository Patterns"
                ]
            }

        if "plan" in message.lower():
            return {
                "responseType": "study_plan",
                "summary": "Mock 30-day study plan ready",
                "weeks": [{"week": 1, "focus": "Fundamentals"}]
            }

        return {
            "responseType": "normal_text",
            "reply": "Here is a quick chat response about your career progression."
        }

    url = f"{AI_SERVICE_BASE_URL}/api/v1/ai/process"
    payload = {
        "user_id": user_id,
        "job_id": job_id,
        "session_id": session_id,
        "message": message,
        "context_summary": context_summary,
    }

    logger.info(f"[AI Client] Calling Unified Process API at {url} for job_id={job_id}, session_id={session_id}")
    response = requests.post(url, json=payload, timeout=timeout)
    response.raise_for_status()
    return response.json()


def call_analysis_1_api(cv_bytes: bytes, github_url: str = None, linkedin_url: str = None, timeout: int = 60) -> dict:
    if _mock_ai_enabled():
        logger.info("[AI Client - MOCK] Simulating CV Parse API response")
        return {
            "profileAnalysis": {
                "profile": {
                    "fullName": "Parsed Candidate",
                    "headline": "Software Engineer",
                    "location": "Alexandria, Egypt",
                    "seniorityLevel": "Junior",
                    "yearsOfExperience": 2,
                    "about": "Mock-generated profile summary.",
                    "education": [],
                    "skills": {
                        "programmingLanguages": ["Python", "C#"],
                        "frameworks": [],
                        "cloudAndInfra": [],
                        "databases": [],
                        "tools": [],
                        "other": []
                    },
                    "softSkills": [],
                    "openToWork": False,
                    "languages": []
                },
                "experience": [],
                "projects": [],
                "certifications": [],
                "competitiveProgramming": {"platforms": [], "achievements": []},
                "socialMetadata": {
                    "github": {
                        "username": None,
                        "url": github_url,
                        "publicRepos": 0,
                        "followers": 0,
                        "following": 0,
                        "accountCreatedAt": None,
                        "topLanguages": []
                    } if github_url else None,
                    "linkedin": {
                        "url": linkedin_url,
                        "publicIdentifier": None,
                        "connectionsCount": 0,
                        "followerCount": 0
                    } if linkedin_url else None
                }
            },
            "scoreBreakdown": {
                "overall": {
                    "overallShowoff": {"label": "Overall Showoff", "value": 60, "trend": 0, "lastUpdated": "2026-08-01T00:00:00Z"},
                    "resume": {"label": "Resume Score", "value": 55, "trend": 0, "lastUpdated": "2026-08-01T00:00:00Z"},
                    "github": {"label": "GitHub Score", "value": 50, "trend": 0, "lastUpdated": "2026-08-01T00:00:00Z"}
                },
                "dev": {
                    "overallShowoff": {"label": "Overall Showoff", "value": 60, "trend": 0, "lastUpdated": "2026-08-01T00:00:00Z"},
                    "resume": {"label": "Resume Score", "value": 55, "trend": 0, "lastUpdated": "2026-08-01T00:00:00Z"},
                    "github": {"label": "GitHub Score", "value": 50, "trend": 0, "lastUpdated": "2026-08-01T00:00:00Z"}
                },
                "aiml": {
                    "overallShowoff": {"label": "Overall Showoff", "value": 40, "trend": 0, "lastUpdated": "2026-08-01T00:00:00Z"},
                    "resume": {"label": "Resume Score", "value": 35, "trend": 0, "lastUpdated": "2026-08-01T00:00:00Z"},
                    "github": {"label": "GitHub Score", "value": 30, "trend": 0, "lastUpdated": "2026-08-01T00:00:00Z"}
                }
            }
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


def format_linkedin_url(linkedin_input: str | None) -> str | None:
    if not linkedin_input:
        return None
    linkedin_input = linkedin_input.strip()
    if linkedin_input.startswith("http://") or linkedin_input.startswith("https://"):
        return linkedin_input
    return f"https://www.linkedin.com/in/{linkedin_input.strip('/')}"