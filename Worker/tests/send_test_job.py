from celery_app import app

def trigger_test_job(job_id: str):
    app.send_task("worker.tasks.process_job", kwargs={"jobId": job_id})
    print(f"Enqueued test job for jobId={job_id}")