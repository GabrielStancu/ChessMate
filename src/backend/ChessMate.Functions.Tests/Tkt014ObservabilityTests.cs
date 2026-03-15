using ChessMate.Functions.Middleware;
using ChessMate.Infrastructure.Correlation;
using Microsoft.ApplicationInsights.DataContracts;

namespace ChessMate.Functions.Tests;

public sealed class Tkt014ObservabilityTests
{
    // ── CorrelationTelemetryInitializer ──────────────────────────────

    [Fact]
    public void TelemetryInitializer_Stamps_CorrelationId_OnSupportedTelemetry()
    {
        var accessor = new CorrelationContextAccessor { CorrelationId = "test-correlation-123" };
        var initializer = new CorrelationTelemetryInitializer(accessor);
        var telemetry = new TraceTelemetry("test message");

        initializer.Initialize(telemetry);

        Assert.True(telemetry.Properties.ContainsKey("CorrelationId"));
        Assert.Equal("test-correlation-123", telemetry.Properties["CorrelationId"]);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void TelemetryInitializer_Skips_WhenCorrelationIdIsMissing(string? correlationId)
    {
        var accessor = new CorrelationContextAccessor();
        if (correlationId is not null)
        {
            accessor.CorrelationId = correlationId;
        }

        var initializer = new CorrelationTelemetryInitializer(accessor);
        var telemetry = new TraceTelemetry("test message");

        initializer.Initialize(telemetry);

        Assert.False(telemetry.Properties.ContainsKey("CorrelationId"));
    }

    [Fact]
    public void TelemetryInitializer_DoesNotOverwrite_ExistingCorrelationId()
    {
        var accessor = new CorrelationContextAccessor { CorrelationId = "new-id" };
        var initializer = new CorrelationTelemetryInitializer(accessor);
        var telemetry = new TraceTelemetry("test message");
        telemetry.Properties["CorrelationId"] = "existing-id";

        initializer.Initialize(telemetry);

        Assert.Equal("existing-id", telemetry.Properties["CorrelationId"]);
    }

    [Fact]
    public void TelemetryInitializer_Stamps_MultipleTelemetryTypes()
    {
        var accessor = new CorrelationContextAccessor { CorrelationId = "multi-type-test" };
        var initializer = new CorrelationTelemetryInitializer(accessor);

        var trace = new TraceTelemetry("trace");
        var request = new RequestTelemetry();
        var dependency = new DependencyTelemetry();
        var eventTelemetry = new EventTelemetry("custom-event");

        initializer.Initialize(trace);
        initializer.Initialize(request);
        initializer.Initialize(dependency);
        initializer.Initialize(eventTelemetry);

        Assert.Equal("multi-type-test", trace.Properties["CorrelationId"]);
        Assert.Equal("multi-type-test", request.Properties["CorrelationId"]);
        Assert.Equal("multi-type-test", dependency.Properties["CorrelationId"]);
        Assert.Equal("multi-type-test", eventTelemetry.Properties["CorrelationId"]);
    }
}
