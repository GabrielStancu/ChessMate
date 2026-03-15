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
        Assert.Equal("v3", PersistencePolicy.SchemaVersion);
    }
}
