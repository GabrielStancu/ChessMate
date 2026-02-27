using Azure;
using Azure.Data.Tables;
using ChessMate.Infrastructure.Configuration;
using Microsoft.Extensions.Logging;

namespace ChessMate.Infrastructure.BatchCoach;

public sealed class TableOperationStateStore : IOperationStateStore
{
    private readonly TableClient _tableClient;
    private readonly ILogger<TableOperationStateStore> _logger;

    private const string OperationPartitionPrefix = "op%23";
    private const string RequestPartitionPrefix = "req%23";
    private const string OperationRowPrefix = "op%23";
    private const int RequestHashPrefixLength = 12;

    public TableOperationStateStore(TableClient tableClient, ILogger<TableOperationStateStore> logger)
    {
        _tableClient = tableClient;
        _logger = logger;
    }

    public async Task<OperationStateSnapshot?> GetByRequestIdentityAsync(
        string idempotencyKey,
        string requestHash,
        CancellationToken cancellationToken)
    {
        var partitionKey = BuildRequestLookupPartitionKey(requestHash);

        await foreach (var lookupEntity in _tableClient.QueryAsync<OperationStateEntity>(
                           entity => entity.PartitionKey == partitionKey,
                           cancellationToken: cancellationToken))
        {
            if (!string.Equals(lookupEntity.IdempotencyKey, idempotencyKey, StringComparison.Ordinal) ||
                !string.Equals(lookupEntity.RequestHash, requestHash, StringComparison.Ordinal))
            {
                continue;
            }

            var operationState = await GetByOperationIdAsync(lookupEntity.OperationId, cancellationToken);
            if (operationState is not null)
            {
                return operationState;
            }
        }

        return null;
    }

    public async Task<OperationStateSnapshot?> GetByOperationIdAsync(string operationId, CancellationToken cancellationToken)
    {
        var partitionKey = BuildOperationPartitionKey(operationId);

        try
        {
            var response = await _tableClient.GetEntityAsync<OperationStateEntity>(
                partitionKey,
                "v1",
                cancellationToken: cancellationToken);

            return Map(response.Value);
        }
        catch (RequestFailedException exception) when (exception.Status == 404)
        {
            return null;
        }
    }

    public async Task<bool> TryCreateRunningAsync(
        string operationId,
        string idempotencyKey,
        string requestHash,
        DateTimeOffset startedAtUtc,
        CancellationToken cancellationToken)
    {
        await _tableClient.CreateIfNotExistsAsync(cancellationToken);

        var operationEntity = new OperationStateEntity
        {
            PartitionKey = BuildOperationPartitionKey(operationId),
            RowKey = "v1",
            OperationId = operationId,
            IdempotencyKey = idempotencyKey,
            RequestHash = requestHash,
            Status = OperationStateStatus.Running,
            StartedAtUtc = startedAtUtc,
            CompletedAtUtc = null,
            ResponsePayloadJson = string.Empty,
            ErrorCode = string.Empty,
            ExpiresAtUtc = PersistencePolicy.CalculateExpiresAtUtc(startedAtUtc),
            SchemaVersion = PersistencePolicy.SchemaVersion
        };

        try
        {
            await _tableClient.AddEntityAsync(operationEntity, cancellationToken);
        }
        catch (RequestFailedException exception) when (exception.Status == 409)
        {
            _logger.LogWarning(
                "Operation state create conflict for operationId {OperationId}. Another instance may have claimed this operation.",
                operationId);

            return false;
        }

        var lookupEntity = new OperationStateEntity
        {
            PartitionKey = BuildRequestLookupPartitionKey(requestHash),
            RowKey = BuildRequestLookupRowKey(operationId),
            OperationId = operationId,
            IdempotencyKey = idempotencyKey,
            RequestHash = requestHash,
            Status = OperationStateStatus.Running,
            StartedAtUtc = startedAtUtc,
            CompletedAtUtc = null,
            ResponsePayloadJson = string.Empty,
            ErrorCode = string.Empty,
            ExpiresAtUtc = PersistencePolicy.CalculateExpiresAtUtc(startedAtUtc),
            SchemaVersion = PersistencePolicy.SchemaVersion
        };

        await _tableClient.UpsertEntityAsync(lookupEntity, TableUpdateMode.Replace, cancellationToken);

        _logger.LogInformation(
            "Operation state created. operationId {OperationId}, status {Status}.",
            operationId,
            OperationStateStatus.Running);

        return true;
    }

    public async Task<bool> TrySetTerminalStatusAsync(
        string operationId,
        string status,
        DateTimeOffset completedAtUtc,
        string? responsePayloadJson,
        string? errorCode,
        CancellationToken cancellationToken)
    {
        var partitionKey = BuildOperationPartitionKey(operationId);

        Response<OperationStateEntity> getResponse;
        try
        {
            getResponse = await _tableClient.GetEntityAsync<OperationStateEntity>(
                partitionKey,
                "v1",
                cancellationToken: cancellationToken);
        }
        catch (RequestFailedException exception) when (exception.Status == 404)
        {
            return false;
        }

        var entity = getResponse.Value;
        if (OperationStateStatus.IsTerminal(entity.Status))
        {
            _logger.LogWarning(
                "Operation state already terminal for operationId {OperationId}. currentStatus {CurrentStatus}, requestedStatus {RequestedStatus}.",
                operationId,
                entity.Status,
                status);

            return false;
        }

        entity.Status = status;
        entity.CompletedAtUtc = completedAtUtc;
        entity.ResponsePayloadJson = responsePayloadJson ?? string.Empty;
        entity.ErrorCode = errorCode ?? string.Empty;

        try
        {
            await _tableClient.UpdateEntityAsync(entity, entity.ETag, TableUpdateMode.Replace, cancellationToken);
        }
        catch (RequestFailedException exception) when (exception.Status == 412)
        {
            return false;
        }

        var lookupEntity = new OperationStateEntity
        {
            PartitionKey = BuildRequestLookupPartitionKey(entity.RequestHash),
            RowKey = BuildRequestLookupRowKey(entity.OperationId),
            OperationId = entity.OperationId,
            IdempotencyKey = entity.IdempotencyKey,
            RequestHash = entity.RequestHash,
            Status = entity.Status,
            StartedAtUtc = entity.StartedAtUtc,
            CompletedAtUtc = entity.CompletedAtUtc,
            ResponsePayloadJson = entity.ResponsePayloadJson,
            ErrorCode = entity.ErrorCode,
            ExpiresAtUtc = entity.ExpiresAtUtc,
            SchemaVersion = entity.SchemaVersion
        };

        await _tableClient.UpsertEntityAsync(lookupEntity, TableUpdateMode.Replace, cancellationToken);

        _logger.LogInformation(
            "Operation state transitioned. operationId {OperationId}, status {Status}.",
            operationId,
            status);

        return true;
    }

    public static string BuildOperationPartitionKey(string operationId)
    {
        return $"{OperationPartitionPrefix}{Escape(operationId)}";
    }

    public static string BuildRequestLookupPartitionKey(string requestHash)
    {
        var prefix = requestHash.Length <= RequestHashPrefixLength
            ? requestHash
            : requestHash[..RequestHashPrefixLength];

        return $"{RequestPartitionPrefix}{Escape(prefix)}";
    }

    public static string BuildRequestLookupRowKey(string operationId)
    {
        return $"{OperationRowPrefix}{Escape(operationId)}";
    }

    private static OperationStateSnapshot Map(OperationStateEntity entity)
    {
        return new OperationStateSnapshot(
            entity.OperationId,
            entity.IdempotencyKey,
            entity.RequestHash,
            entity.Status,
            entity.StartedAtUtc,
            entity.CompletedAtUtc,
            string.IsNullOrWhiteSpace(entity.ResponsePayloadJson) ? null : entity.ResponsePayloadJson,
            string.IsNullOrWhiteSpace(entity.ErrorCode) ? null : entity.ErrorCode);
    }

    private static string Escape(string value)
    {
        return Uri.EscapeDataString(value);
    }
}