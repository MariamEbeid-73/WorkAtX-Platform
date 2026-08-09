from unittest.mock import MagicMock, call, patch

import pytest

from app import ai_client
from tasks.chat_job import handle_chat


def test_chat_forwards_backend_message_and_stops_at_formatting_progress():
    queued_message = "I'll go with Docker for Containerization."
    job_payload = {
        "payload": {
            "userId": "user-1",
            "sessionId": "session-1",
            "message": queued_message,
            "contextSummary": "summary",
        }
    }
    ai_response = {"responseType": "normal_text", "reply": "Done"}

    with (
        patch("tasks.chat_job.ai_client.call_process_api", return_value=ai_response) as ai_call,
        patch("tasks.chat_job.backend_client.submit_job_result") as submit_result,
        patch("tasks.chat_job.publish_progress") as publish_progress,
    ):
        completed = handle_chat(MagicMock(), "job-1", job_payload)

    assert completed == {"jobId": "job-1", "status": "completed"}
    assert ai_call.call_args.kwargs["message"] == queued_message
    assert publish_progress.call_args_list == [
        call(job_id="job-1", stage="Thinking", percent=10),
        call(job_id="job-1", stage="Formatting response", percent=95),
    ]
    submit_result.assert_called_once()


def test_missing_message_fails_before_http_request(monkeypatch):
    monkeypatch.setenv("MOCK_AI", "false")

    with patch("app.ai_client.requests.post") as post_request:
        with pytest.raises(ValueError, match="requires 'message'"):
            ai_client.call_process_api(user_id="user-1", job_id="job-1", message=None)

    post_request.assert_not_called()
