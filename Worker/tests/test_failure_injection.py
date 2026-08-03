"""
Failure-injection tests for the Celery worker.

These deliberately do NOT require a live Redis broker, a live backend, or a
live AI service. Every external boundary (backend_client, ai_client's
`requests` calls, progress_publisher) is mocked, so these run fast and
in CI with no infra.

Run with:  pip install -r requirements-dev.txt && pytest tests/ -v
"""
import requests
import pytest
from unittest.mock import patch, MagicMock

from tasks.process_job import _process_job_impl as process_job_impl


class FakeRequest:
    """Stand-in for celery's task.request context."""
    def __init__(self, retries=0):
        self.retries = retries


class FakeRetry(Exception):
    """Stand-in for celery.exceptions.Retry — raised by FakeTask.retry()."""
    def __init__(self, exc):
        super().__init__(f"retry requested for {exc!r}")
        self.exc = exc


class FakeTask:

    def __init__(self, retries=0, max_retries=3):
        self.request = FakeRequest(retries)
        self.max_retries = max_retries
        self.retry_calls = []

    def retry(self, exc=None, countdown=None):
        self.retry_calls.append({"exc": exc, "countdown": countdown})
        raise FakeRetry(exc)


@pytest.fixture(autouse=True)
def no_real_io(monkeypatch):
    monkeypatch.setenv("MOCK_AI", "false")
    with patch("tasks.process_job.publish_progress"):
        yield


# ---------------------------------------------------------------------------
# Scenario 1: AI service unavailable (connection refused)
# ---------------------------------------------------------------------------

def test_ai_unavailable_retries_before_exhausting():
    job_id = "job-ai-down"
    job_data = {"jobType": "chat", "payload": {"userId": "u1", "message": "hi"}}

    with patch("tasks.process_job.backend_client.get_job_details", return_value=job_data), \
         patch("tasks.process_job.backend_client.update_job_status") as mock_status, \
         patch("app.ai_client.requests.post", side_effect=requests.exceptions.ConnectionError("connection refused")):

        task = FakeTask(retries=0, max_retries=3)
        with pytest.raises(FakeRetry):
            process_job_impl(task, jobId=job_id)

        assert len(task.retry_calls) == 1
        assert isinstance(task.retry_calls[0]["exc"], requests.exceptions.ConnectionError)
        # job must be flipped to "processing" before the AI call is attempted
        mock_status.assert_any_call(job_id=job_id, status="processing")


def test_ai_unavailable_dead_letters_after_retries_exhausted():
    job_id = "job-ai-down-exhausted"
    job_data = {"jobType": "chat", "payload": {"userId": "u1", "message": "hi"}}

    with patch("tasks.process_job.backend_client.get_job_details", return_value=job_data), \
         patch("tasks.process_job.backend_client.update_job_status"), \
         patch("tasks.process_job.backend_client.submit_job_result") as mock_submit_result, \
         patch("app.ai_client.requests.post", side_effect=requests.exceptions.ConnectionError("connection refused")):

        task = FakeTask(retries=3, max_retries=3)  # already at the limit
        with pytest.raises(requests.exceptions.ConnectionError):
            process_job_impl(task, jobId=job_id)

        assert task.retry_calls == []  # no further retry attempted once exhausted
        mock_submit_result.assert_called_once()
        assert mock_submit_result.call_args.kwargs["status"] == "failed"


# ---------------------------------------------------------------------------
# Scenario 2: AI service slow/hanging (timeout)
# ---------------------------------------------------------------------------

def test_ai_hanging_times_out_and_retries():
    job_id = "job-ai-hangs"
    job_data = {"jobType": "chat", "payload": {"userId": "u1", "message": "hi"}}

    with patch("tasks.process_job.backend_client.get_job_details", return_value=job_data), \
         patch("tasks.process_job.backend_client.update_job_status"), \
         patch("app.ai_client.requests.post", side_effect=requests.exceptions.Timeout("AI service did not respond in time")):

        task = FakeTask(retries=0, max_retries=3)
        with pytest.raises(FakeRetry):
            process_job_impl(task, jobId=job_id)

        assert isinstance(task.retry_calls[0]["exc"], requests.exceptions.Timeout)


# ---------------------------------------------------------------------------
# Scenario 3: malformed AI response (garbage / wrong shape)
# ---------------------------------------------------------------------------

def test_malformed_chat_response_is_not_saved_as_success():
    job_id = "job-malformed-chat"
    job_data = {"jobType": "chat", "payload": {"userId": "u1", "message": "hi"}}

    fake_response = MagicMock()
    fake_response.raise_for_status.return_value = None
    fake_response.json.return_value = ["not", "a", "dict"]  # wrong shape entirely

    with patch("tasks.process_job.backend_client.get_job_details", return_value=job_data), \
         patch("tasks.process_job.backend_client.update_job_status"), \
         patch("tasks.process_job.backend_client.submit_job_result") as mock_submit_result, \
         patch("app.ai_client.requests.post", return_value=fake_response):

        task = FakeTask(retries=0, max_retries=3)
        with pytest.raises(FakeRetry):
            process_job_impl(task, jobId=job_id)

        mock_submit_result.assert_not_called()


def test_legacy_gap_analysis_job_type_fails_fast_not_silently():

    job_id = "job-legacy-gap-type"
    job_data = {"jobType": "gap_analysis", "payload": {"userId": "u1"}}

    with patch("tasks.process_job.backend_client.get_job_details", return_value=job_data), \
         patch("tasks.process_job.backend_client.update_job_status"), \
         patch("tasks.process_job.backend_client.submit_job_result") as mock_submit_result:

        task = FakeTask(retries=0, max_retries=3)
        result = process_job_impl(task, jobId=job_id)

        assert result["status"] == "failed"
        assert task.retry_calls == []  # unsupported job type is fatal, not transient
        mock_submit_result.assert_called_once()
        assert mock_submit_result.call_args.kwargs["status"] == "failed"


# ---------------------------------------------------------------------------
# Scenario 4: worker crash mid-job
# ---------------------------------------------------------------------------

def test_job_marked_processing_before_any_ai_call():

    job_id = "job-crash"
    job_data = {"jobType": "chat", "payload": {"userId": "u1", "message": "hi"}}
    call_order = []

    def fake_update_status(job_id, status):
        call_order.append(("update_job_status", status))

    def fake_ai_post(*args, **kwargs):
        call_order.append(("ai_call",))
        raise requests.exceptions.ConnectionError("worker died here in real life")

    with patch("tasks.process_job.backend_client.get_job_details", return_value=job_data), \
         patch("tasks.process_job.backend_client.update_job_status", side_effect=fake_update_status), \
         patch("app.ai_client.requests.post", side_effect=fake_ai_post):

        task = FakeTask(retries=0, max_retries=3)
        with pytest.raises(FakeRetry):
            process_job_impl(task, jobId=job_id)

    assert call_order[0] == ("update_job_status", "processing")
    assert call_order[1] == ("ai_call",)


def test_celery_configured_for_crash_recovery():
   
    from celery_app import app as celery_app_instance

    assert celery_app_instance.conf.task_acks_late is True
    assert celery_app_instance.conf.task_reject_on_worker_lost is True
    assert celery_app_instance.conf.worker_prefetch_multiplier == 1