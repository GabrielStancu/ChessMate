using System.Text.Json;
using ChessMate.Functions.Contracts;
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

    // ── Contract CorrelationId round-trip ────────────────────────────

    [Fact]
    public void OrchestrationInput_DefaultCorrelationId_IsNull()
    {
        var request = new BatchCoachRequestEnvelope(
            "game-1",
            new List<BatchCoachMoveEnvelope>());

        var input = new BatchCoachOrchestrationInput("op-1", request);

        Assert.Null(input.CorrelationId);
    }

    [Fact]
    public void OrchestrationInput_RoundTrips_CorrelationId_ThroughJson()
    {
        var request = new BatchCoachRequestEnvelope(
            "game-1",
            new List<BatchCoachMoveEnvelope>());

        var input = new BatchCoachOrchestrationInput("op-1", request, "corr-abc");

        var json = JsonSerializer.Serialize(input);
        var deserialized = JsonSerializer.Deserialize<BatchCoachOrchestrationInput>(json);

        Assert.NotNull(deserialized);
        Assert.Equal("corr-abc", deserialized.CorrelationId);
        Assert.Equal("op-1", deserialized.OperationId);
    }

    [Fact]
    public void ActivityInput_RoundTrips_CorrelationId_ThroughJson()
    {
        var move = new BatchCoachMoveEnvelope(
            Ply: 18,
            Classification: "Mistake",
            IsUserMove: true,
            Move: "Nf3",
            Piece: "Knight",
            From: "g1",
            To: "f3");

        var input = new CoachMoveActivityInput("op-2", "game-2", "Quick", move, "corr-xyz");

        var json = JsonSerializer.Serialize(input);
        var deserialized = JsonSerializer.Deserialize<CoachMoveActivityInput>(json);

        Assert.NotNull(deserialized);
        Assert.Equal("corr-xyz", deserialized.CorrelationId);
        Assert.Equal("op-2", deserialized.OperationId);
    }

    [Fact]
    public void ActivityInput_DefaultCorrelationId_IsNull()
    {
        var move = new BatchCoachMoveEnvelope(
            Ply: 10,
            Classification: "Blunder",
            IsUserMove: false,
            Move: "Qh5");

        var input = new CoachMoveActivityInput("op-3", "game-3", "Deep", move);

        Assert.Null(input.CorrelationId);
    }

    [Fact]
    public void OrchestrationInput_NullCorrelation_SurvivesJsonRoundTrip()
    {
        var request = new BatchCoachRequestEnvelope(
            "game-4",
            new List<BatchCoachMoveEnvelope>());

        var input = new BatchCoachOrchestrationInput("op-4", request);

        var json = JsonSerializer.Serialize(input);
        var deserialized = JsonSerializer.Deserialize<BatchCoachOrchestrationInput>(json);

        Assert.NotNull(deserialized);
        Assert.Null(deserialized.CorrelationId);
    }
}
