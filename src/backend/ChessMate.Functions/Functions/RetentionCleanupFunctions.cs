using Azure;
using Azure.Data.Tables;
using Microsoft.ApplicationInsights;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace ChessMate.Functions.Functions;

public sealed class RetentionCleanupFunctions
{
    private const string CleanupSchedule = "0 0 0 * * *";
    private const string ScannedMetricName = "retention.cleanup.scanned";
    private const string DeletedMetricName = "retention.cleanup.deleted";
    private const string FailedMetricName = "retention.cleanup.failed";
    private static readonly string[] TargetTables = new[] { "GameIndex", "AnalysisBatch", "OperationState" };

    private readonly TableServiceClient _tableServiceClient;
    private readonly TimeProvider _timeProvider;
    private readonly TelemetryClient _telemetryClient;
    private readonly ILogger<RetentionCleanupFunctions> _logger;

    public RetentionCleanupFunctions(
        TableServiceClient tableServiceClient,
        TimeProvider timeProvider,
        TelemetryClient telemetryClient,
        ILogger<RetentionCleanupFunctions> logger)
    {
        _tableServiceClient = tableServiceClient;
        _timeProvider = timeProvider;
        _telemetryClient = telemetryClient;
        _logger = logger;
    }

    [Function("RetentionCleanup")]
    public async Task RunAsync([TimerTrigger(CleanupSchedule)] TimerInfo timerInfo, FunctionContext functionContext)
    {
        var now = _timeProvider.GetUtcNow();

        foreach (var tableName in TargetTables)
        {
            var tableClient = _tableServiceClient.GetTableClient(tableName);
            var result = await CleanupTableAsync(tableClient, now, functionContext.CancellationToken);
            TrackMetrics(tableName, result);

            _logger.LogInformation(
                "Retention cleanup completed for table {TableName}. scanned {Scanned}, deleted {Deleted}, failures {Failures}, runAtUtc {RunAtUtc}.",
                tableName,
                result.Scanned,
                result.Deleted,
                result.Failures,
                now);
        }
    }

    private async Task<CleanupResult> CleanupTableAsync(
        TableClient tableClient,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var result = new CleanupResult();
        var filter = TableClient.CreateQueryFilter($"ExpiresAtUtc lt {now}");

        AsyncPageable<TableEntity> query;
        try
        {
            query = tableClient.QueryAsync<TableEntity>(filter: filter, cancellationToken: cancellationToken);
        }
        catch (RequestFailedException exception) when (exception.Status == 404)
        {
            return result;
        }

        await foreach (var entity in query)
        {
            result.Scanned++;

            var deleted = await TryDeleteWithBackoffAsync(tableClient, entity.PartitionKey, entity.RowKey, cancellationToken);
            if (deleted)
            {
                result.Deleted++;
            }
            else
            {
                result.Failures++;
            }
        }

        return result;
    }

    private static async Task<bool> TryDeleteWithBackoffAsync(
        TableClient tableClient,
        string partitionKey,
        string rowKey,
        CancellationToken cancellationToken)
    {
        var delays = new[]
        {
            TimeSpan.FromMilliseconds(200),
            TimeSpan.FromMilliseconds(500),
            TimeSpan.FromSeconds(1)
        };

        for (var attempt = 0; attempt < delays.Length; attempt++)
        {
            try
            {
                await tableClient.DeleteEntityAsync(partitionKey, rowKey, ETag.All, cancellationToken);
                return true;
            }
            catch (RequestFailedException exception) when (exception.Status == 404)
            {
                return true;
            }
            catch (RequestFailedException exception) when (IsRetriable(exception.Status))
            {
                await Task.Delay(delays[attempt], cancellationToken);
            }
            catch
            {
                return false;
            }
        }

        return false;
    }

    private void TrackMetrics(string tableName, CleanupResult result)
    {
        var dimensions = new Dictionary<string, string>
        {
            ["table"] = tableName
        };

        _telemetryClient.TrackMetric(ScannedMetricName, result.Scanned, dimensions);
        _telemetryClient.TrackMetric(DeletedMetricName, result.Deleted, dimensions);
        _telemetryClient.TrackMetric(FailedMetricName, result.Failures, dimensions);
    }

    private static bool IsRetriable(int statusCode)
    {
        return statusCode == 408 || statusCode == 429 || statusCode >= 500;
    }

    private sealed class CleanupResult
    {
        public int Scanned { get; set; }

        public int Deleted { get; set; }

        public int Failures { get; set; }
    }
}