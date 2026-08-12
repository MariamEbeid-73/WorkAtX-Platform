from unittest.mock import MagicMock, call, patch

from tasks.analysis1_job import handle_analysis_1


def test_analysis1_leaves_terminal_progress_to_backend():
    job_payload = {
        "payload": {
            "resumeFileId": "resume-1",
            "userId": "user-1",
            "githubUrl": None,
            "linkedinUrl": None,
        }
    }
    download_response = MagicMock(content=b"pdf")
    parsed_profile = {"profileAnalysis": {"profile": {}}, "scoreBreakdown": {}}

    with (
        patch("tasks.analysis1_job.backend_client.get_resume_download_url", return_value="https://resume"),
        patch("tasks.analysis1_job.requests.get", return_value=download_response),
        patch("tasks.analysis1_job.ai_client.format_linkedin_url", return_value=None),
        patch("tasks.analysis1_job.ai_client.call_analysis_1_api", return_value=parsed_profile),
        patch("tasks.analysis1_job.backend_client.submit_job_result") as submit_result,
        patch("tasks.analysis1_job.publish_progress") as publish_progress,
    ):
        handle_analysis_1(MagicMock(), "job-1", job_payload)

    assert publish_progress.call_args_list == [
        call(job_id="job-1", stage="Downloading resume", percent=10),
        call(job_id="job-1", stage="Scanning GitHub & LinkedIn", percent=25),
        call(job_id="job-1", stage="Analyzing profile with AI", percent=50),
        call(job_id="job-1", stage="Calculating score breakdown", percent=75),
        call(job_id="job-1", stage="Finalizing results", percent=90),
    ]
    submit_result.assert_called_once()
