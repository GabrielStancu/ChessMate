using ChessMate.Functions.BatchCoach;
using ChessMate.Functions.Contracts;
using ChessMate.Infrastructure.BatchCoach;
using System.Text.Json;

namespace ChessMate.Functions.Tests;

public sealed class CanonicalRequestHashProviderTests
{
    [Fact]
    public void ComputePayloadHash_WithEmptyString_ReturnsConsistentHash()
    {
        var provider = new CanonicalRequestHashProvider();

        var hash1 = provider.ComputePayloadHash("");
        var hash2 = provider.ComputePayloadHash("");

        Assert.Equal(hash1, hash2);
        Assert.NotEmpty(hash1);
    }

    [Fact]
    public void ComputePayloadHash_WithDifferentJsonFieldOrder_ReturnsSameHash()
    {
        var provider = new CanonicalRequestHashProvider();
        var json1 = """{"gameId":"123","moves":[]}""";
        var json2 = """{"moves":[],"gameId":"123"}""";

        var hash1 = provider.ComputePayloadHash(json1);
        var hash2 = provider.ComputePayloadHash(json2);

        Assert.Equal(hash1, hash2);
    }

    [Fact]
    public void ComputePayloadHash_WithDifferentPayloads_ReturnsDifferentHashes()
    {
        var provider = new CanonicalRequestHashProvider();
        var json1 = """{"gameId":"123"}""";
        var json2 = """{"gameId":"456"}""";

        var hash1 = provider.ComputePayloadHash(json1);
        var hash2 = provider.ComputePayloadHash(json2);

        Assert.NotEqual(hash1, hash2);
    }

    [Fact]
    public void ComputeOperationId_WithDifferentInputs_ReturnsDifferentIds()
    {
        var provider = new CanonicalRequestHashProvider();
        var hash = provider.ComputePayloadHash("""{"gameId":"123"}""");

        var id1 = provider.ComputeOperationId("key1", hash);
        var id2 = provider.ComputeOperationId("key2", hash);

        Assert.NotEqual(id1, id2);
    }

    [Fact]
    public void ComputeOperationId_WithSameInputs_ReturnsSameId()
    {
        var provider = new CanonicalRequestHashProvider();
        var hash = provider.ComputePayloadHash("""{"gameId":"123"}""");

        var id1 = provider.ComputeOperationId("key", hash);
        var id2 = provider.ComputeOperationId("key", hash);

        Assert.Equal(id1, id2);
    }
}

public sealed class BatchCoachIdempotencyServiceTests
{
    [Fact]
    public async Task BeginAsync_WithMissingStore_ReturnsStartNew()
    {
        var store = new FakeOperationStateStore();
        var hashProvider = new CanonicalRequestHashProvider();
        var timeProvider = new StubTimeProvider(DateTimeOffset.UnixEpoch);
        var service = new BatchCoachIdempotencyService(store, hashProvider, timeProvider);

        var decision = await service.BeginAsync("key1", """{"gameId":"123"}""", CancellationToken.None);

        Assert.Equal(IdempotencyDecisionKind.StartNew, decision.Kind);
        Assert.NotNull(decision.OperationId);
        Assert.Equal(1, store.CreateRunningCallCount);
    }

    [Fact]
    public async Task BeginAsync_WithExistingCompleted_ReturnsReplayDecision()
    {
        var response = new BatchCoachResponseEnvelope(
            "1.0",
            "op-123",
            new BatchCoachSummaryEnvelope("game-1", 40, 3, "Quick"),
            [],
            new BatchCoachMetadataEnvelope(DateTimeOffset.UtcNow, []));

        var responseJson = JsonSerializer.Serialize(response);
        var existing = new OperationStateSnapshot(
            "op-123",
            "key1",
            "hash-abc",
            OperationStateStatus.Completed,
            DateTimeOffset.UnixEpoch,
            DateTimeOffset.UnixEpoch.AddSeconds(10),
            responseJson,
            null);

        var store = new FakeOperationStateStore { ExistingState = existing };
        var hashProvider = new CanonicalRequestHashProvider();
        var timeProvider = new StubTimeProvider(DateTimeOffset.UnixEpoch);
        var service = new BatchCoachIdempotencyService(store, hashProvider, timeProvider);

        var decision = await service.BeginAsync("key1", """{"gameId":"123"}""", CancellationToken.None);

        Assert.Equal(IdempotencyDecisionKind.Replay, decision.Kind);
        Assert.NotNull(decision.ReplayResponse);
        Assert.Equal("op-123", decision.ReplayResponse.OperationId);
    }

    [Fact]
    public async Task BeginAsync_WithExistingPartialCoaching_ReturnsReplayDecision()
    {
        var response = new BatchCoachResponseEnvelope(
            "1.0",
            "op-123",
            new BatchCoachSummaryEnvelope("game-1", 40, 3, "Quick"),
            Array.Empty<BatchCoachCoachingItemEnvelope>(),
            new BatchCoachMetadataEnvelope(
                DateTimeOffset.UtcNow,
                Array.Empty<string>(),
                new[] { new BatchCoachWarningEnvelope(5, "Mistake", "Nf3", BatchCoachFailureCodes.Timeout, "timeout") },
                BatchCoachFailureCodes.PartialCoaching));

        var responseJson = JsonSerializer.Serialize(response);
        var existing = new OperationStateSnapshot(
            "op-123",
            "key1",
            "hash-abc",
            OperationStateStatus.PartialCoaching,
            DateTimeOffset.UnixEpoch,
            DateTimeOffset.UnixEpoch.AddSeconds(10),
            responseJson,
            null);

        var store = new FakeOperationStateStore { ExistingState = existing };
        var hashProvider = new CanonicalRequestHashProvider();
        var timeProvider = new StubTimeProvider(DateTimeOffset.UnixEpoch);
        var service = new BatchCoachIdempotencyService(store, hashProvider, timeProvider);

        var decision = await service.BeginAsync("key1", """{"gameId":"123"}""", CancellationToken.None);

        Assert.Equal(IdempotencyDecisionKind.Replay, decision.Kind);
        Assert.NotNull(decision.ReplayResponse);
        Assert.Equal("op-123", decision.ReplayResponse.OperationId);
    }

    [Fact]
    public async Task BeginAsync_WithExistingRunning_ReturnsConflict()
    {
        var existing = new OperationStateSnapshot(
            "op-123",
            "key1",
            "hash-abc",
            OperationStateStatus.Running,
            DateTimeOffset.UnixEpoch,
            null,
            null,
            null);

        var store = new FakeOperationStateStore { ExistingState = existing };
        var hashProvider = new CanonicalRequestHashProvider();
        var timeProvider = new StubTimeProvider(DateTimeOffset.UnixEpoch);
        var service = new BatchCoachIdempotencyService(store, hashProvider, timeProvider);

        var decision = await service.BeginAsync("key1", """{"gameId":"123"}""", CancellationToken.None);

        Assert.Equal(IdempotencyDecisionKind.Conflict, decision.Kind);
        Assert.Equal(OperationStateStatus.Running, decision.ExistingStatus);
    }

    [Fact]
    public async Task MarkCompletedAsync_PersistsResponseAndStatus()
    {
        var store = new FakeOperationStateStore();
        var hashProvider = new CanonicalRequestHashProvider();
        var timeProvider = new StubTimeProvider(DateTimeOffset.UnixEpoch);
        var service = new BatchCoachIdempotencyService(store, hashProvider, timeProvider);

        var response = new BatchCoachResponseEnvelope(
            "1.0",
            "op-123",
            new BatchCoachSummaryEnvelope("game-1", 40, 3, "Quick"),
            [],
            new BatchCoachMetadataEnvelope(DateTimeOffset.UtcNow, []));

        await service.MarkCompletedAsync("op-123", response, CancellationToken.None);

        Assert.True(store.TerminalStatusSet);
        Assert.Equal(OperationStateStatus.Completed, store.LastTerminalStatus);
        Assert.NotNull(store.LastResponsePayload);
    }

    [Fact]
    public async Task MarkCompletedAsync_WithPartialFailureCode_PersistsPartialCoachingStatus()
    {
        var store = new FakeOperationStateStore();
        var hashProvider = new CanonicalRequestHashProvider();
        var timeProvider = new StubTimeProvider(DateTimeOffset.UnixEpoch);
        var service = new BatchCoachIdempotencyService(store, hashProvider, timeProvider);

        var response = new BatchCoachResponseEnvelope(
            "1.0",
            "op-123",
            new BatchCoachSummaryEnvelope("game-1", 40, 3, "Quick"),
            Array.Empty<BatchCoachCoachingItemEnvelope>(),
            new BatchCoachMetadataEnvelope(
                DateTimeOffset.UtcNow,
                Array.Empty<string>(),
                new[] { new BatchCoachWarningEnvelope(6, "Blunder", "Qh5", BatchCoachFailureCodes.Timeout, "timeout") },
                BatchCoachFailureCodes.PartialCoaching));

        await service.MarkCompletedAsync("op-123", response, CancellationToken.None);

        Assert.True(store.TerminalStatusSet);
        Assert.Equal(OperationStateStatus.PartialCoaching, store.LastTerminalStatus);
    }

    [Fact]
    public async Task MarkFailedAsync_PersistsErrorCodeAndStatus()
    {
        var store = new FakeOperationStateStore();
        var hashProvider = new CanonicalRequestHashProvider();
        var timeProvider = new StubTimeProvider(DateTimeOffset.UnixEpoch);
        var service = new BatchCoachIdempotencyService(store, hashProvider, timeProvider);

        await service.MarkFailedAsync("op-123", "OrchestrationFailed", CancellationToken.None);

        Assert.True(store.TerminalStatusSet);
        Assert.Equal(OperationStateStatus.Failed, store.LastTerminalStatus);
        Assert.Equal("OrchestrationFailed", store.LastErrorCode);
    }
}

public sealed class OperationStateStatusTests
{
    [Fact]
    public void IsTerminal_WithCompletedStatus_ReturnsTrue()
    {
        Assert.True(OperationStateStatus.IsTerminal(OperationStateStatus.Completed));
    }

    [Fact]
    public void IsTerminal_WithFailedStatus_ReturnsTrue()
    {
        Assert.True(OperationStateStatus.IsTerminal(OperationStateStatus.Failed));
    }

    [Fact]
    public void IsTerminal_WithPartialCoachingStatus_ReturnsTrue()
    {
        Assert.True(OperationStateStatus.IsTerminal(OperationStateStatus.PartialCoaching));
    }

    [Fact]
    public void IsTerminal_WithRunningStatus_ReturnsFalse()
    {
        Assert.False(OperationStateStatus.IsTerminal(OperationStateStatus.Running));
    }
}

public sealed class TableOperationStateStoreKeyTests
{
    [Fact]
    public void BuildOperationPartitionKey_FormatsCorrectly()
    {
        var key = TableOperationStateStore.BuildOperationPartitionKey("op-123");

        Assert.StartsWith("op%23", key);
        Assert.Contains("op-123", key);
    }

    [Fact]
    public void BuildRequestLookupPartitionKey_TruncatesHashToPrefix()
    {
        var longHash = "abcdefghijklmnopqrstuvwxyz";
        var key = TableOperationStateStore.BuildRequestLookupPartitionKey(longHash);

        Assert.StartsWith("req%23", key);
        Assert.Contains("abcdefghijkl", key);
    }

    [Fact]
    public void BuildRequestLookupRowKey_FormatsCorrectly()
    {
        var key = TableOperationStateStore.BuildRequestLookupRowKey("op-123");

        Assert.StartsWith("op%23", key);
        Assert.Contains("op-123", key);
    }
}

internal sealed class FakeOperationStateStore : IOperationStateStore
{
    public OperationStateSnapshot? ExistingState { get; set; }

    public int CreateRunningCallCount { get; set; }

    public bool TerminalStatusSet { get; set; }

    public string? LastTerminalStatus { get; set; }

    public string? LastResponsePayload { get; set; }

    public string? LastErrorCode { get; set; }

    public Task<OperationStateSnapshot?> GetByRequestIdentityAsync(
        string idempotencyKey,
        string requestHash,
        CancellationToken cancellationToken)
    {
        if (ExistingState is not null)
        {
            return Task.FromResult((OperationStateSnapshot?)ExistingState);
        }

        return Task.FromResult((OperationStateSnapshot?)null);
    }

    public Task<OperationStateSnapshot?> GetByOperationIdAsync(
        string operationId,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(
            ExistingState?.OperationId == operationId
                ? ExistingState
                : null);
    }

    public Task<bool> TryCreateRunningAsync(
        string operationId,
        string idempotencyKey,
        string requestHash,
        DateTimeOffset startedAtUtc,
        CancellationToken cancellationToken)
    {
        CreateRunningCallCount++;
        if (ExistingState is not null)
        {
            return Task.FromResult(false);
        }

        ExistingState = new OperationStateSnapshot(
            operationId,
            idempotencyKey,
            requestHash,
            OperationStateStatus.Running,
            startedAtUtc,
            null,
            null,
            null);
        return Task.FromResult(true);
    }

    public Task<bool> TrySetTerminalStatusAsync(
        string operationId,
        string status,
        DateTimeOffset completedAtUtc,
        string? responsePayloadJson,
        string? errorCode,
        CancellationToken cancellationToken)
    {
        TerminalStatusSet = true;
        LastTerminalStatus = status;
        LastResponsePayload = responsePayloadJson;
        LastErrorCode = errorCode;

        if (ExistingState?.OperationId == operationId)
        {
            ExistingState = ExistingState with
            {
                Status = status,
                CompletedAtUtc = completedAtUtc,
                ResponsePayloadJson = responsePayloadJson,
                ErrorCode = errorCode
            };
        }

        return Task.FromResult(true);
    }
}
