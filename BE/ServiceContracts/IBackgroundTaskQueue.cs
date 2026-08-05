namespace BE.ServiceContracts;

/// <summary>
/// In-process, best-effort work queue for fire-and-forget tasks (e.g.
/// refreshing a chat session's rolling summary) that shouldn't add latency
/// to the HTTP request that triggers them. Not durable — if the process
/// restarts, anything still queued is lost.
/// </summary>
public interface IBackgroundTaskQueue
{
    void QueueBackgroundWorkItem(Func<IServiceProvider, CancellationToken, Task> workItem);

    IAsyncEnumerable<Func<IServiceProvider, CancellationToken, Task>> DequeueAllAsync(CancellationToken cancellationToken);
}