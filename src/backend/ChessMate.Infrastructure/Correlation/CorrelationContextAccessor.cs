using System.Threading;
using ChessMate.Application.Abstractions;

namespace ChessMate.Infrastructure.Correlation;

public sealed class CorrelationContextAccessor : ICorrelationContextAccessor
{
    private static readonly AsyncLocal<string?> CurrentCorrelationId = new();

    public string CorrelationId
    {
        get => CurrentCorrelationId.Value ?? string.Empty;
        set => CurrentCorrelationId.Value = value;
    }
}