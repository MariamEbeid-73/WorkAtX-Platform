from celery_app import app
from app.ai_client import AIClient
from app.db import DatabaseService
from app.mapper import ResultMapper
from app.progress_publisher import ProgressPublisher


@app.task(
    bind=True,
    max_retries=3
)
def process_job(self, job):

    job_id = job["jobId"]

    db = DatabaseService()
    ai_client = AIClient()
    mapper = ResultMapper()
    progress = ProgressPublisher()

    try:
        print(f"Processing job: {job_id}")

        # 1. Update status
        db.update_processing(job_id)
        progress.publish(job_id, "processing")

        # 2. Build AI request
        payload = ai_client.build_request(job)

        # 3. Send to AI
        ai_response = ai_client.submit_analysis(payload)

        # 4. Map AI response
        result = mapper.map_ai_response(ai_response)

        # 5. Save result
        db.save_result(job_id, result)
        progress.publish(job_id, "completed")

        return {
            "jobId": job_id,
            "status": "Completed"
        }

    except NotImplementedError as e:
        # A dependency (AI contract, DB schema, etc.) isn't wired up yet.
        # This will never succeed on retry, so fail fast instead of
        # burning 3 retries with backoff for a guaranteed outcome.
        print(f"Job {job_id} failed - dependency not implemented: {e}")
        db.mark_failed(job_id, str(e))
        progress.publish(job_id, "failed")
        raise

    except Exception as e:
        print(f"Job failed: {job_id}")
        print(e)

        if self.request.retries >= self.max_retries:
            db.mark_failed(job_id, str(e))
            progress.publish(job_id, "failed")

        raise self.retry(
            exc=e,
            countdown=2 ** self.request.retries
        )