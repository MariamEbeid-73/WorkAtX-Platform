using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using BE.ServiceContracts;
using Microsoft.Extensions.Configuration;
using StackExchange.Redis;

namespace BE.Services;

public class JobQueueService : IJobQueueService
{
    private const string DefaultTaskName = "worker.tasks.process_job";
    private const string DefaultQueueName = "celery";

    // Celery's Kombu transport expects exact snake_case key names in the
    // message envelope ("root_id", "delivery_tag", ...) — camelCase would
    // break decoding. .NET 8's SnakeCaseLower policy handles that for the
    // POCO parts; the envelope dictionary keys are written literally.
    private static readonly JsonSerializerOptions KombuJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    // Inner body JSON is plain data (args/kwargs) — camelCase is fine and
    // matches the rest of the API.
    private static readonly JsonSerializerOptions BodyJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly IConnectionMultiplexer _redis;
    private readonly string _taskName;
    private readonly string _queueName;

    public JobQueueService(IConnectionMultiplexer redis, IConfiguration config)
    {
        _redis     = redis;
        _taskName  = config["Redis:CeleryTask"] ?? DefaultTaskName;
        _queueName = config["Redis:CeleryQueue"] ?? DefaultQueueName;
    }

    public async Task PublishAsync(Guid jobId)
    {
        var message = BuildKombuMessage(jobId);
        var db = _redis.GetDatabase();

        // Celery's Redis transport puts messages on the queue's list with
        // LPUSH and consumes them with a blocking BRPOP.
        await db.ListLeftPushAsync(_queueName, message);
    }

    /// <summary>
    /// Produces a message in Kombu's JSON format so Celery's Redis broker
    /// transport can decode it without any custom consumer code.
    ///
    /// body = base64("{ args:[], kwargs:{ jobId }, embed:null }")
    /// headers.task      = the Celery task to run
    /// headers.id        = message/task id (Celery acks on this)
    /// properties.delivery_tag = must equal headers.id
    /// </summary>
    private string BuildKombuMessage(Guid jobId)
    {
        var taskId = Guid.NewGuid().ToString();

        var bodyJson = JsonSerializer.Serialize(new
        {
            args = Array.Empty<object>(),
            kwargs = new { jobId },
            embed = (object?)null,
        }, BodyJsonOptions);

        var bodyBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(bodyJson));

        var headers = JsonSerializer.SerializeToNode(new
        {
            lang = "py",
            task = _taskName,
            id = taskId,
            root_id = taskId,
            parent_id = (string?)null,
            group = (string?)null,
            meth = (string?)null,
            shadow = (string?)null,
            eta = (string?)null,
            expires = (string?)null,
            retries = 0,
            timelimit = new int?[] { null, null },
            argsrepr = "()",
            kwargsrepr = $"{{'jobId': '{jobId}'}}",
            origin = $"gen@{Environment.MachineName}",
        }, KombuJsonOptions);

        var properties = JsonSerializer.SerializeToNode(new
        {
            correlation_id = taskId,
            reply_to = "",
            delivery_mode = 2,
            delivery_info = new { exchange = "", routing_key = _queueName },
            priority = 0,
            body_encoding = "base64",
            delivery_tag = taskId,
        }, KombuJsonOptions);

        // Envelope keys are written literally (some are kebab-case, which no
        // naming policy produces). SerializeToNode keeps headers/properties
        // as real nested JSON objects (not escaped strings).
        var envelope = new JsonObject
        {
            ["body"] = bodyBase64,
            ["headers"] = headers,
            ["properties"] = properties,
            ["content-type"] = "application/json",
            ["content-encoding"] = "utf-8",
        };

        return envelope.ToJsonString();
    }
}
