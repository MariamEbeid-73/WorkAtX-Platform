namespace BE.ServiceContracts;

/// <summary>
/// Publishes a job onto the Celery broker queue (Redis) so the Celery
/// worker (Task C) picks it up. Messages are produced in Kombu's format
/// so the worker needs no custom consumer code.
/// </summary>
public interface IJobQueueService
{
    Task PublishAsync(Guid jobId);
}
