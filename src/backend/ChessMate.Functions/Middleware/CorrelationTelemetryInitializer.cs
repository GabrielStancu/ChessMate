using ChessMate.Application.Abstractions;
using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.DataContracts;
using Microsoft.ApplicationInsights.Extensibility;

namespace ChessMate.Functions.Middleware;

public sealed class CorrelationTelemetryInitializer : ITelemetryInitializer
{
    private readonly ICorrelationContextAccessor _correlationAccessor;

    public CorrelationTelemetryInitializer(ICorrelationContextAccessor correlationAccessor)
    {
        _correlationAccessor = correlationAccessor;
    }

    public void Initialize(ITelemetry telemetry)
    {
        var correlationId = _correlationAccessor.CorrelationId;
        if (string.IsNullOrWhiteSpace(correlationId))
        {
            return;
        }

        if (telemetry is ISupportProperties supportProperties)
        {
            supportProperties.Properties.TryAdd("CorrelationId", correlationId);
        }
    }
}
