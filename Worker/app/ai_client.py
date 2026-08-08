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
    resume_from_job_id: str = None,
    selections: dict = None,
    timeout: int = 90,
) -> dict:
    if _mock_ai_enabled():
        logger.info(f"[AI Client - MOCK] Simulating process API response for user={user_id}, job={job_id}, session={session_id}")

        if resume_from_job_id is not None:
            # Resuming a paused study-plan job with the user's tech_choices
            # selections — there's no free-text `message` for this job type,
            # so it needs its own branch rather than falling through to the
            # message.lower() checks below (which would crash on None).
            logger.info(
                f"[AI Client - MOCK] Simulating resume of job={resume_from_job_id} "
                f"with selections={selections}"
            )
            return {
                "responseType": "study_plan",
                "summary": "Mock 30-day study plan ready (resumed with your selections)",
                "weeks": [{"week": 1, "focus": "Fundamentals"}],
                "selections_applied": selections,
            }

        if message is None:
            raise ValueError(
                f"call_process_api requires 'message' when resume_from_job_id is not set "
                f"(job_id={job_id})"
            )

        msg_lower = message.lower()

        # Trigger 1: Gap Analysis with Radio Buttons (tech_choices)
        if "gap" in msg_lower or "senior" in msg_lower:
            return {
                "responseType": "gap_analysis",
                "summary": "Strong C# background, missing container orchestration.",
                "per_job_match_scores": [
                    {
                        "role_id": "job-101",
                        "role": "Principal .NET Architect",
                        "company": "Tech Corp",
                        "match_level": "High Match",
                        "match_score": 75,
                    },
                ],
                "skill_coverage_across_all_jobs": 75,
                "jobs_analyzed": 1,
                "matched": ["C#", ".NET", "SQL Server"],
                "missing_skills": [
                    {"name": "System Architecture", "importance": "High"},
                    {"name": "Docker & Kubernetes", "importance": "Medium"}
                ],
                "recommendations": [
                    "Build end-to-end microservices with Docker Compose",
                    "Learn Clean Architecture and Repository Patterns"
                ],
                "awaiting_user_input": True,
                "tech_choices": [
                    {
                        "category": "Containerization",
                        "options": [
                            {"id": "docker", "label": "Docker", "description": "Industry standard, huge ecosystem"},
                            {"id": "podman", "label": "Podman", "description": "Daemonless, rootless alternative"},
                        ],
                    },
                    {
                        "category": "Cloud Platform",
                        "options": [
                            {"id": "aws", "label": "AWS", "description": "Broadest service catalog"},
                            {"id": "azure", "label": "Azure", "description": "Strong .NET/enterprise integration"},
                        ],
                    },
                ],
            }

        # Trigger 2: Gap Analysis Open-Ended Question (tech_choices = [])
        if "confirm" in msg_lower or "ready" in msg_lower:
            return {
                "responseType": "gap_analysis",
                "summary": "Gap analysis complete. Ready to build your customized learning path.",
                "per_job_match_scores": [],
                "skill_coverage_across_all_jobs": 80,
                "jobs_analyzed": 1,
                "matched": ["C#", "ASP.NET Core"],
                "missing_skills": [
                    {"name": "Microservices", "importance": "High"}
                ],
                "recommendations": [
                    "Focus on domain-driven design and asynchronous queues."
                ],
                "awaiting_user_input": True,
                "tech_choices": [],
                "user_report": "Are you ready for Geni to generate your weekly study plan?"
            }

        # Trigger 3: Study Plan
        if "plan" in msg_lower:
            return {
                "responseType": "study_plan",
                "summary": "Mock 30-day study plan ready",
                "weeks": [{"week": 1, "focus": "Fundamentals"}]
            }

        # Default Chat Response
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
    if resume_from_job_id is not None:
        payload["resume_from_job_id"] = resume_from_job_id
        payload["selections"] = selections

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