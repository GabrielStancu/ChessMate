using ChessMate.Infrastructure.BatchCoach;
using ChessMate.Infrastructure.Configuration;

namespace ChessMate.Functions.Tests;

public sealed class PersistencePolicyTests
{
    [Fact]
    public void CalculateExpiresAtUtc_AddsThirtyDays()
    {
        var createdAtUtc = new DateTimeOffset(2026, 2, 22, 0, 0, 0, TimeSpan.Zero);

        var expiresAtUtc = PersistencePolicy.CalculateExpiresAtUtc(createdAtUtc);

        Assert.Equal(createdAtUtc.AddDays(30), expiresAtUtc);
    }

    [Fact]
    public void SchemaVersion_UsesLockedValue()
    {
        Assert.Equal("v1", PersistencePolicy.SchemaVersion);
    }
}

public sealed class TableAnalysisBatchStoreKeyTests
{
    [Fact]
    public void BuildPartitionKey_UsesLockedFormat()
    {
        var key = TableAnalysisBatchStore.BuildPartitionKey("game-123");

        Assert.Equal("game%23game-123", key);
    }

    [Fact]
    public void BuildRowKey_UsesLockedFormat()
    {
        var createdAtUtc = new DateTimeOffset(2026, 2, 22, 6, 30, 0, TimeSpan.Zero);

        var key = TableAnalysisBatchStore.BuildRowKey("v1", createdAtUtc);

        Assert.StartsWith("analysis%23v1%23", key);
        Assert.EndsWith(createdAtUtc.UtcTicks.ToString("D19"), key);
    }
}
