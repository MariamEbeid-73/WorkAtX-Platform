import os
import time
import logging
import requests
from progress_publisher import publish_progress

logger = logging.getLogger(__name__)

AI_SERVICE_BASE_URL = os.getenv("AI_SERVICE_BASE_URL", "http://host.docker.internal:8000")
# The AI service's /api/v1/ai/* endpoints require this header (constant-time
# compare against the same secret) — same env var backend_client.py already
# reads for calls to our own backend, since both sides agreed on one shared
# service-to-service secret rather than a per-integration one.
AI_SERVICE_TOKEN = os.getenv("SERVICE_AUTH_TOKEN", "dev-service-token")
AI_SERVICE_HEADERS = {"X-Service-Token": AI_SERVICE_TOKEN}

# A cold role research run can legitimately spend more than ten minutes
# scraping, structuring, embedding, and assessing postings. Keep this well
# above that observed runtime so the worker does not abandon a healthy AI
# request and start a duplicate execution for the same job.
AI_PROCESS_TIMEOUT_SECONDS = int(os.getenv("AI_PROCESS_TIMEOUT_SECONDS", "1800"))
if AI_PROCESS_TIMEOUT_SECONDS <= 0:
    raise RuntimeError("AI_PROCESS_TIMEOUT_SECONDS must be a positive integer")


def _mock_ai_enabled() -> bool:
    return os.getenv("MOCK_AI", "true").lower() == "true"


def call_process_api(
    user_id: str,
    job_id: str,
    session_id: str = None,
    message: str = None,
    context_summary: str = None,
    timeout: int = AI_PROCESS_TIMEOUT_SECONDS,
) -> dict:
    if not isinstance(message, str) or not message.strip():
        raise ValueError(f"call_process_api requires 'message' (job_id={job_id})")

    if _mock_ai_enabled():
        logger.info(f"[AI Client - MOCK] Simulating process API response for user={user_id}, job={job_id}, session={session_id}")

        # Every chat job — a normal message or a resumed study-plan request
        # (synthesized into plain language by
        # ChatSessionController.SubmitTechChoices before the job is even
        # created) — always has a `message`. There's a single code path
        # here; the AI is one-shot per job and has no notion of "resuming"
        # a prior job.
        msg_lower = message.lower()

        # Trigger 1: Gap Analysis with Radio Buttons (tech_choices)
        #
        # Shape matches the real AI service's /api/v1/ai/process contract:
        # {responseType, response: {gap_analysis, user_report, tech_choices,
        # awaiting_user_input}} -- NOT flat. gap_analysis carries the full
        # field set Node 8 produces, including the additive fields
        # (blocking, depth_gaps, leverage, unasked_leverage, positioning,
        # role_insight, evidence_confidence) so local MOCK_AI dev exercises
        # the same shape the frontend actually parses.
        if "gap" in msg_lower or "senior" in msg_lower:
            return {
                "responseType": "gap_analysis",
                "response": {
                    "gap_analysis": {
                        "per_job_match_scores": [
                            {
                                "role_id": "job-101",
                                "company": "Tech Corp",
                                "role": "Principal .NET Architect",
                                "match_score": 75,
                                "match_level": "High",
                                "job_id": "job-101",
                                "job_title": "Principal .NET Architect",
                                "job_url": "https://example.com/jobs/job-101",
                            },
                        ],
                        "skill_coverage_across_all_jobs": 75,
                        "matched": ["C#", ".NET", "SQL Server"],
                        "missing": [
                            {
                                "skill": "System Architecture",
                                "importance": "required",
                                "required_by": 1,
                                "of": 1,
                                "jobs": ["job-101"],
                                "badge_color": "red",
                                "kind": "developable",
                            },
                            {
                                "skill": "Docker & Kubernetes",
                                "importance": "preferred",
                                "required_by": 1,
                                "of": 1,
                                "jobs": ["job-101"],
                                "badge_color": "yellow",
                                "kind": "developable",
                            },
                        ],
                        "strengths": [
                            "C# — their #1 requirement (1/1 postings); 4 yrs across 2 roles, 3 shipped services",
                        ],
                        "weaknesses": [
                            "System Architecture — required by 1 of 1 postings",
                            "Docker & Kubernetes — preferred, 1 of 1 postings",
                        ],
                        "summary": "Strong C# background, missing container orchestration.",
                        "company_info": "",
                        "urgency_note": "",
                        "jobs_analyzed": 1,
                        "jobs_with_errors": [],
                        "is_degraded": False,
                        "blocking": [],
                        "depth_gaps": [],
                        "leverage": [
                            {
                                "label": "C#",
                                "demand_rank": 1,
                                "required_by": 1,
                                "of": 1,
                                "depth": "deep",
                                "evidence": ["4 yrs across 2 roles, 3 shipped services"],
                            },
                        ],
                        "unasked_leverage": [
                            {
                                "label": "SQL Server performance tuning",
                                "why_it_matters": "Tech Corp's stack leans heavily on SQL Server; this wasn't asked for but is a differentiator.",
                                "evidence": ["Tuned slow queries on a 200GB production DB"],
                            },
                        ],
                        "positioning": [
                            "Lead with your SQL Server depth — it's not in the posting but it's exactly what a .NET shop like this one values.",
                        ],
                        "role_insight": {
                            "what_this_place_is_like": "Small platform team, ships weekly.",
                            "what_they_value": "Ownership and pragmatic architecture over process.",
                            "interview_shape": "System design + take-home.",
                            "role_reality": "Expect to touch infra as much as application code.",
                        },
                        "evidence_confidence": "high",
                    },
                    "user_report": "## Your fit for Principal .NET Architect at Tech Corp\n\nStrong C# background, missing container orchestration.",
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
                    "awaiting_user_input": True,
                },
            }

        # Trigger 2: Gap Analysis Open-Ended Question (tech_choices = [])
        if "confirm" in msg_lower or "ready" in msg_lower:
            return {
                "responseType": "gap_analysis",
                "response": {
                    "gap_analysis": {
                        "per_job_match_scores": [],
                        "skill_coverage_across_all_jobs": 80,
                        "matched": ["C#", "ASP.NET Core"],
                        "missing": [
                            {
                                "skill": "Microservices",
                                "importance": "required",
                                "required_by": 1,
                                "of": 1,
                                "jobs": [],
                                "badge_color": "red",
                                "kind": "developable",
                            },
                        ],
                        "strengths": [],
                        "weaknesses": ["Microservices — required by 1 of 1 postings"],
                        "summary": "Gap analysis complete. Ready to build your customized learning path.",
                        "company_info": "",
                        "urgency_note": "",
                        "jobs_analyzed": 1,
                        "jobs_with_errors": [],
                        "is_degraded": False,
                        "blocking": [],
                        "depth_gaps": [],
                        "leverage": [],
                        "unasked_leverage": [],
                        "positioning": [],
                        "role_insight": {},
                        "evidence_confidence": "medium",
                    },
                    "user_report": "Are you ready for Geni to generate your weekly study plan?",
                    "tech_choices": [],
                    "awaiting_user_input": True,
                },
            }

        # Trigger 3: Study Plan
        if "plan" in msg_lower:
            return {
                "responseType": "study_plan",
                "response": {
                    "title": "Backend Engineering Growth Plan",
                    "summary": "A focused 30-day plan based on your selected technologies.",
                    "total_weeks": 4,
                    "weeks": [
                        {
                            "week": 1,
                            "focus_skills": ["Docker", "Container fundamentals"],
                            "goals": "Package an ASP.NET Core service into a reproducible container.",
                            "tasks": [
                                "Write a multi-stage Dockerfile",
                                "Add container health checks",
                                "Run the API and PostgreSQL with Docker Compose",
                            ],
                            "project": None,
                            "resources": [
                                {
                                    "title": "Docker Get Started",
                                    "platform": "Docker Docs",
                                    "type": "docs",
                                    "cost": "free",
                                    "reason": "Official practical introduction to images and containers.",
                                    "url": "https://docs.docker.com/get-started/",
                                    "verified": True,
                                }
                            ],
                        },
                        {
                            "week": 2,
                            "focus_skills": ["Clean Architecture", "Testing"],
                            "goals": "Separate application concerns and protect behavior with tests.",
                            "tasks": [
                                "Split domain, application, and infrastructure concerns",
                                "Add unit tests for one use case",
                                "Add an integration test for one API endpoint",
                            ],
                            "project": {
                                "title": "Refactor a service boundary",
                                "description": "Move one vertical feature into clear domain, application, and infrastructure layers.",
                            },
                            "resources": [],
                        },
                        {
                            "week": 3,
                            "focus_skills": ["Messaging", "Reliable background jobs"],
                            "goals": "Build resilient asynchronous processing with observable state.",
                            "tasks": [
                                "Publish work to a message queue",
                                "Implement idempotent message handling",
                                "Add retry and dead-letter behavior",
                            ],
                            "project": None,
                            "resources": [],
                        },
                        {
                            "week": 4,
                            "focus_skills": ["Cloud deployment", "Observability"],
                            "goals": "Deploy and monitor the completed service.",
                            "tasks": [
                                "Create a CI build pipeline",
                                "Deploy the containerized service",
                                "Add structured logs and a latency dashboard",
                            ],
                            "project": {
                                "title": "Production-ready backend",
                                "description": "Ship the service with automated delivery, health checks, logs, and a short architecture note.",
                            },
                            "resources": [],
                        },
                    ],
                },
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

    logger.info(f"[AI Client] Calling Unified Process API at {url} for job_id={job_id}, session_id={session_id}")
    start = time.perf_counter()
    response = requests.post(url, json=payload, headers=AI_SERVICE_HEADERS, timeout=timeout)
    duration_s = time.perf_counter() - start
    if not response.ok:
        logger.error(
            f"[AI Client] Process API for job_id={job_id} returned {response.status_code} "
            f"in {duration_s:.2f}s, body={response.text[:500]!r}"
        )
        response.raise_for_status()
    logger.info(
        f"[AI Client] Process API for job_id={job_id} -> {response.status_code} "
        f"({len(response.content)} bytes) in {duration_s:.2f}s"
    )
    return response.json()


def call_analysis_1_api(cv_bytes: bytes, github_url: str = None, linkedin_url: str = None, timeout: int = 120) -> dict:
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
    start = time.perf_counter()
    response = requests.post(url, files=files, data=data, headers=AI_SERVICE_HEADERS, timeout=timeout)
    duration_s = time.perf_counter() - start
    if not response.ok:
        logger.error(
            f"[AI Client] Parse CV API returned {response.status_code} "
            f"in {duration_s:.2f}s, body={response.text[:500]!r}"
        )
        response.raise_for_status()
    logger.info(
        f"[AI Client] Parse CV API -> {response.status_code} "
        f"({len(response.content)} bytes) in {duration_s:.2f}s"
    )
    return response.json()


def format_linkedin_url(linkedin_input: str | None) -> str | None:
    if not linkedin_input:
        return None
    linkedin_input = linkedin_input.strip()
    if linkedin_input.startswith("http://") or linkedin_input.startswith("https://"):
        return linkedin_input
    return f"https://www.linkedin.com/in/{linkedin_input.strip('/')}"
